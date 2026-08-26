import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { Activity, Wifi, WifiOff, MessageSquare, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';

export default function RealtimeDiagnostics() {
    const { socket, isConnected } = useSocket();
    const { user } = useAuth();
    const [testResults, setTestResults] = useState({});
    const [isTesting, setIsTesting] = useState(false);
    const [eventLog, setEventLog] = useState([]);

    // Log events for debugging
    useEffect(() => {
        if (!socket || !isConnected) return;

        const handlers = {
            'new_message': (data) => {
                addLog('new_message', data);
            },
            'device_status_update': (data) => {
                addLog('device_status_update', data);
            },
            'conversation_assigned': (data) => {
                addLog('conversation_assigned', data);
            }
        };

        Object.entries(handlers).forEach(([event, handler]) => {
            socket.on(event, handler);
        });

        return () => {
            Object.entries(handlers).forEach(([event, handler]) => {
                socket.off(event, handler);
            });
        };
    }, [socket, isConnected]);

    const addLog = (event, data) => {
        setEventLog(prev => [
            { event, data: data ? JSON.stringify(data).substring(0, 100) : null, time: new Date().toLocaleTimeString() },
            ...prev.slice(0, 9)
        ]);
    };

    const runDiagnostics = async () => {
        setIsTesting(true);
        const results = {};

        // Test 1: Socket Connection
        results.socketConnection = {
            status: isConnected ? 'pass' : 'fail',
            message: isConnected ? 'Connected to server' : 'Not connected to server'
        };

        // Test 2: User Auth
        results.auth = {
            status: user ? 'pass' : 'fail',
            message: user ? `Logged in as ${user.email}` : 'Not logged in'
        };

        // Test 3: Organization Room
        results.orgRoom = {
            status: user?.organization_id ? 'pass' : 'fail',
            message: user?.organization_id ? `Organization ID: ${user.organization_id}` : 'No organization ID'
        };

        // Test 4: API Health
        try {
            const res = await axios.get('/api/health');
            results.apiHealth = {
                status: 'pass',
                message: 'API is responding'
            };
        } catch (e) {
            results.apiHealth = {
                status: 'fail',
                message: 'API not responding: ' + e.message
            };
        }

        // Test 5: Send Test Message Event
        if (socket && isConnected) {
            try {
                socket.emit('test_event', { timestamp: Date.now() });
                results.testEvent = {
                    status: 'pass',
                    message: 'Test event emitted'
                };
            } catch (e) {
                results.testEvent = {
                    status: 'fail',
                    message: 'Failed to emit: ' + e.message
                };
            }
        } else {
            results.testEvent = {
                status: 'skip',
                message: 'Socket not connected'
            };
        }

        // Test 6: Backend Webhook URL
        try {
            const deviceRes = await axios.get('/api/app/devices?exclude_status=terblokir');
            const hasConnectedDevice = deviceRes.data?.some(d => d.status === 'connected');
            results.waDevice = {
                status: hasConnectedDevice ? 'pass' : 'warn',
                message: hasConnectedDevice ? 'Connected device found' : 'No connected WhatsApp device'
            };
        } catch (e) {
            results.waDevice = {
                status: 'fail',
                message: 'Cannot fetch devices: ' + e.message
            };
        }

        setTestResults(results);
        setIsTesting(false);
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pass':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'fail':
                return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'warn':
                return <AlertCircle className="w-5 h-5 text-yellow-500" />;
            default:
                return <Activity className="w-5 h-5 text-gray-400" />;
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-indigo-500" />
                        Real-Time Diagnostics
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Debug socket connection and message delivery issues
                    </p>
                </div>
                <button
                    onClick={runDiagnostics}
                    disabled={isTesting}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                    {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                    Run Diagnostics
                </button>
            </div>

            {/* Connection Status Banner */}
            <div className={`flex items-center gap-3 p-4 rounded-lg mb-6 ${
                isConnected ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
                {isConnected ? (
                    <Wifi className="w-6 h-6 text-green-500" />
                ) : (
                    <WifiOff className="w-6 h-6 text-red-500" />
                )}
                <div>
                    <p className={`font-medium ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
                        {isConnected ? 'Socket Connected' : 'Socket Disconnected'}
                    </p>
                    <p className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                        {isConnected
                            ? 'Real-time events should be working'
                            : 'Real-time events will NOT work. Please refresh the page.'
                        }
                    </p>
                </div>
            </div>

            {/* Test Results */}
            {Object.keys(testResults).length > 0 && (
                <div className="space-y-3">
                    <h4 className="font-medium text-gray-700">Test Results</h4>
                    {Object.entries(testResults).map(([key, result]) => (
                        <div
                            key={key}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                                result.status === 'pass' ? 'bg-green-50 border-green-200' :
                                result.status === 'fail' ? 'bg-red-50 border-red-200' :
                                'bg-yellow-50 border-yellow-200'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                {getStatusIcon(result.status)}
                                <span className="font-medium text-gray-700 capitalize">
                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                            </div>
                            <span className="text-sm text-gray-600">{result.message}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Event Log */}
            {eventLog.length > 0 && (
                <div className="mt-6">
                    <h4 className="font-medium text-gray-700 mb-3">Recent Events Received</h4>
                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 max-h-48 overflow-y-auto">
                        {eventLog.map((log, idx) => (
                            <div key={idx} className="flex items-start gap-3 py-2 border-b border-gray-200 last:border-0">
                                <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm text-indigo-600">{log.event}</span>
                                        <span className="text-xs text-gray-400">{log.time}</span>
                                    </div>
                                    {log.data && (
                                        <p className="text-xs text-gray-500 font-mono truncate mt-1">
                                            {log.data}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Troubleshooting Tips */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Troubleshooting Tips</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Refresh the page if socket shows disconnected</li>
                    <li>• Make sure you have at least one connected WhatsApp device</li>
                    <li>• Check browser console for socket errors (F12 → Console)</li>
                    <li>• Try in incognito mode to rule out extensions</li>
                    <li>• If using VPN, try disabling it</li>
                </ul>
            </div>
        </div>
    );
}
