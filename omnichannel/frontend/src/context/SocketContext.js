
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../config/api';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const userIdRef = useRef(null);
  const orgIdRef = useRef(null);

  // Track user data in refs so the socket callbacks always see the latest values
  // without causing effect re-runs
  useEffect(() => {
    userIdRef.current = user?.id || null;
    orgIdRef.current = user?.organization_id || null;
  }, [user]);

  // Only connect/disconnect when the user identity actually changes (login/logout),
  // NOT when the user object reference changes due to token refresh.
  const userId = user?.id || null;
  const orgId = user?.organization_id || null;

  useEffect(() => {
    // User logged out or not logged in — tear down any existing socket
    if (!userId) {
      if (socketRef.current) {
        console.log('Socket Cleanup: User logged out, disconnecting...');
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // If we already have a live socket for this same user, skip reconnect
    if (socketRef.current && socketRef.current.connected) {
      return;
    }

    // Clean up any stale socket before creating a new one
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }

    const socketUrl = API_BASE_URL || window.location.origin;

    const newSocket = io(socketUrl, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      const currentOrgId = orgIdRef.current;
      if (currentOrgId) {
        newSocket.emit('join_organization', currentOrgId);
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket Disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket Connection Error:', error.message);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Socket Reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      const currentOrgId = orgIdRef.current;
      if (currentOrgId) {
        newSocket.emit('join_organization', currentOrgId);
      }
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Socket Reconnect Attempt:', attemptNumber);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed after all attempts');
    });

    newSocket.on('error', (error) => {
      console.error('Socket Error:', error);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      if (newSocket) {
        console.log('Socket Cleanup: Disconnecting...');
        newSocket.removeAllListeners();
        newSocket.disconnect();
        socketRef.current = null;
      }
    };
  }, [userId]); // Only re-run when userId changes (login/logout), not on every user object change

  const value = {
    socket,
    isConnected,
    reconnect: useCallback(() => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.connect();
      }
    }, []),
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// Helper to safely call socket methods with type checking
const isValidSocket = (sock) => sock && typeof sock === 'object' && typeof sock.on === 'function';

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return {
    ...context,
    socket: context.socket && isValidSocket(context.socket) ? context.socket : null,
  };
};
