'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import publicApi from '@/lib/publicApi';
import DeviceList from '@/components/playground/DeviceList';
import ChatWindow from '@/components/playground/ChatWindow';
import AddDeviceModal from '@/components/playground/AddDeviceModal';
import QrModal from '@/components/playground/QrModal';

export interface Session {
  id: string;
  name: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'NEED_QR' | 'INITIALIZING';
}


export interface Message {
  [key: string]: any;
}

const PLAYGROUND_API_KEY = process.env.NEXT_PUBLIC_PLAYGROUND_API_KEY;

const PlaygroundPage = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [sessionForQr, setSessionForQr] = useState<Session | null>(null);

  const fetchSessionsAndStatus = async () => {
    if (!PLAYGROUND_API_KEY) return;
    try {
      const response = await publicApi.get('/api/v1/sessions', {
        headers: { Authorization: `Bearer ${PLAYGROUND_API_KEY}` },
      });

      const sessionPromises = response.data.map(async (sess: any) => {
        try {
          const statusRes = await publicApi.get(`/api/v1/sessions/${sess.id}/status`, {
            headers: { Authorization: `Bearer ${PLAYGROUND_API_KEY}` },
          });
          return { ...sess, status: statusRes.data.status };
        } catch {
          return { ...sess, status: 'DISCONNECTED' };
        }
      });

      const sessionsWithStatus = await Promise.all(sessionPromises);
      setSessions(sessionsWithStatus);

      if (sessionsWithStatus.length > 0 && !selectedSession) {
        setSelectedSession(sessionsWithStatus[0]);
      } else if (selectedSession) {

        const updatedSelected = sessionsWithStatus.find(s => s.id === selectedSession.id);
        if (updatedSelected) {
          setSelectedSession(updatedSelected);
        }
      }
    } catch (error) { console.error("Failed to fetch sessions:", error); }
  };

  useEffect(() => {
    fetchSessionsAndStatus();

    const refreshInterval = setInterval(fetchSessionsAndStatus, 10000);
    return () => clearInterval(refreshInterval);
  }, []);


  useEffect(() => {
    if (!PLAYGROUND_API_KEY || !selectedSession || selectedSession.status !== 'CONNECTED') return;

    const messageInterval = setInterval(async () => {
      try {
        const msgRes = await publicApi.get('/api/v1/playground/messages', {
          headers: { Authorization: `Bearer ${PLAYGROUND_API_KEY}` },
          params: { sessionId: selectedSession.id }
        });
        if (msgRes.data && msgRes.data.length > 0) {
          setMessages(prev => [...msgRes.data.reverse(), ...prev]);
        }
      } catch (error) { console.error("Message Polling Error:", error); }
    }, 4000);

    return () => clearInterval(messageInterval);
  }, [selectedSession]);


  const handleAddSession = async (name: string) => {
    if (!PLAYGROUND_API_KEY) return;
    try {
      await publicApi.post('/api/v1/sessions', { name }, {
        headers: { Authorization: `Bearer ${PLAYGROUND_API_KEY}` },
      });
      fetchSessionsAndStatus();
      setAddModalOpen(false);
    } catch (error) { alert("Failed to add session."); }
  };

  const handleConnectSession = async (session: Session) => {
    if (!PLAYGROUND_API_KEY) return;
    setSessionForQr(session);
    setLoadingQr(true);
    setQrCode(null); // Use null instead of empty string to hide modal initially
    try {
      const response = await publicApi.post(`/api/v1/sessions/${session.id}/start`, {}, {
        headers: { Authorization: `Bearer ${PLAYGROUND_API_KEY}` }
      });

      // If we have a QR code, show the modal
      if (response.data.qr) {
        setQrCode(response.data.qr);
        // Poll for connection status
        const qrPollInterval = setInterval(async () => {
          try {
            const statusRes = await publicApi.get(`/api/v1/sessions/${session.id}/status`, {
              headers: { Authorization: `Bearer ${PLAYGROUND_API_KEY}` }
            });
            if (statusRes.data.status === 'CONNECTED') {
              setQrCode(null);
              setLoadingQr(false);
              fetchSessionsAndStatus();
              clearInterval(qrPollInterval);
            }
          } catch (error) {
            console.error("QR poll error:", error);
          }
        }, 2000);
      } else if (response.data.status === 'CONNECTED') {
        // Already connected
        setQrCode(null);
        setLoadingQr(false);
        fetchSessionsAndStatus();
      } else if (response.data.status === 'DISCONNECTED') {
        // Failed to connect
        setQrCode(null);
        setLoadingQr(false);
        alert("Failed to connect. Please try again.");
      } else {
        // Other status (INITIALIZING, etc) - wait and check again
        setLoadingQr(false);
        fetchSessionsAndStatus();
      }
    } catch (error: any) {
      console.error("Failed to start session:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to start session.";
      alert(errorMessage);
      setQrCode(null);
      setLoadingQr(false);
    }
  };

  const handleDeleteSession = async (session: Session) => {
      if (!PLAYGROUND_API_KEY) return;
      if (confirm(`Are you sure you want to delete session "${session.name}"?`)) {
          try {
              await publicApi.delete(`/api/v1/sessions/${session.id}`, {
                  headers: { Authorization: `Bearer ${PLAYGROUND_API_KEY}` }
              });
              fetchSessionsAndStatus();
          } catch (error) { alert('Failed to delete session.'); }
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">API Playground</h1>
        <div className="text-xs text-gray-400">Testing Environment</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1">
          <DeviceList
            sessions={sessions}
            selectedSession={selectedSession}
            onSelect={(session) => {
              setSelectedSession(session);
              setMessages([]);  
            }}
            onAdd={() => setAddModalOpen(true)}
            onConnect={handleConnectSession}
            onDelete={handleDeleteSession}
          />
        </div>
        <div className="lg:col-span-2">
          <ChatWindow session={selectedSession} messages={messages} setMessages={setMessages} apiKey={PLAYGROUND_API_KEY!} />
        </div>
      </div>
      <AddDeviceModal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} onSave={handleAddSession}/>
      <QrModal isOpen={qrCode !== null} onClose={() => setQrCode(null)} qrString={qrCode} isLoading={loadingQr}/>
    </div>
  );
};

export default PlaygroundPage;
