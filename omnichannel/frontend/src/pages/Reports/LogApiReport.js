import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, CheckCircle, XCircle, Search, Eye, X, Code, Clock, Server } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import Modal, { ModalFooter } from '../../components/common/Modal';

// --- DETAIL MODAL ---
const LogDetailModal = ({ log, onClose }) => {
    if (!log) return null;
    
    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Code className="w-5 h-5 text-indigo-600" /> API Log Details
                </div>
            }
            size="3xl"
            footer={
                <ModalFooter>
                    <div className="flex items-center justify-between w-full">
                        <span className="text-xs text-gray-400">
                            Timestamp: {new Date(log.created_at).toLocaleString()}
                        </span>
                        <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200">
                            Close
                        </button>
                    </div>
                </ModalFooter>
            }
        >
            <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                        <p className="text-xs text-gray-500 uppercase font-bold">Status</p>
                        <div className={`mt-1 font-mono text-lg font-bold ${log.status_code < 300 ? 'text-green-600' : 'text-red-600'}`}>
                            {log.status_code} {log.status_code < 300 ? 'OK' : 'Error'}
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                        <p className="text-xs text-gray-500 uppercase font-bold">Method</p>
                        <p className="mt-1 font-mono text-lg font-bold text-gray-800">{log.method}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                        <p className="text-xs text-gray-500 uppercase font-bold">App Name</p>
                        <p className="mt-1 font-bold text-indigo-600 truncate">{log.app_name}</p>
                    </div>
                </div>

                {/* Endpoint */}
                <div className="bg-white p-4 rounded-lg border shadow-sm flex items-center gap-3">
                    <Server className="w-5 h-5 text-gray-400" />
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono flex-1 break-all">
                        {log.endpoint}
                    </code>
                </div>

                {/* Payload */}
                <div>
                    <h4 className="font-bold text-gray-700 mb-2 text-sm uppercase">Request Body</h4>
                    <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto border border-gray-700 shadow-inner">
                        <pre className="text-xs font-mono text-green-400 leading-relaxed">
                            {JSON.stringify(log.payload, null, 2)}
                        </pre>
                    </div>
                </div>

                {/* Response */}
                <div>
                    <h4 className="font-bold text-gray-700 mb-2 text-sm uppercase">Response Body</h4>
                    <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto border border-gray-700 shadow-inner">
                        <pre className="text-xs font-mono text-blue-400 leading-relaxed">
                            {JSON.stringify(log.response, null, 2)}
                        </pre>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default function LogApiReport() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState(null);
    
    // Filters
    const [statusFilter, setStatusFilter] = useState('all');
    const [methodFilter, setMethodFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 20;

    useEffect(() => {
        fetchLogs();
    }, [page, statusFilter, methodFilter]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/app/developer/logs', {
                params: { 
                    page, 
                    limit, 
                    status: statusFilter === 'all' ? undefined : statusFilter,
                    method: methodFilter 
                }
            });
            setLogs(res.data.data);
            setTotal(res.data.total);
        } catch (err) {
            // Fallback mock data if backend not ready or error
            if(err.response?.status === 404 || err.response?.status === 500) {
                setLogs([
                    { id: 1, created_at: new Date().toISOString(), method: 'POST', endpoint: '/api/public/v1/messages', status_code: 200, app_name: 'Store Bot', payload: { to: '628123', content: 'Hello' }, response: { success: true } },
                    { id: 2, created_at: new Date().toISOString(), method: 'POST', endpoint: '/api/public/v1/messages', status_code: 401, app_name: 'Test App', payload: { to: '628123' }, response: { error: 'Unauthorized' } }
                ]);
                setTotal(2);
            } else {
                toast.error("Failed to load logs");
            }
        } finally {
            setLoading(false);
        }
    };

    const getMethodColor = (m) => {
        switch(m) {
            case 'GET': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'POST': return 'bg-green-100 text-green-700 border-green-200';
            case 'PUT': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'DELETE': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto bg-gray-50/50">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Activity className="w-6 h-6 text-indigo-600" /> API Access Logs
                    </h2>
                    <p className="text-sm text-gray-500">Real-time monitoring of your Developer API usage.</p>
                </div>

                <div className="flex gap-3">
                    <select 
                        className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={methodFilter}
                        onChange={e => setMethodFilter(e.target.value)}
                    >
                        <option value="all">All Methods</option>
                        <option value="POST">POST</option>
                        <option value="GET">GET</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                    </select>

                    <select 
                        className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="success">Success (2xx)</option>
                        <option value="error">Errors (4xx/5xx)</option>
                    </select>

                    <button onClick={fetchLogs} className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
                        <Search className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase">
                            <tr>
                                <th className="px-6 py-3 font-bold">Time</th>
                                <th className="px-6 py-3 font-bold">App Name</th>
                                <th className="px-6 py-3 font-bold text-center">Method</th>
                                <th className="px-6 py-3 font-bold">Endpoint</th>
                                <th className="px-6 py-3 font-bold text-center">Status</th>
                                <th className="px-6 py-3 font-bold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan="6" className="px-6 py-4">
                                            <div className="h-4 bg-gray-100 rounded w-full animate-pulse"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : logs.map((log) => (
                                <tr key={log.id} className="hover:bg-indigo-50/30 transition-colors group">
                                    <td className="px-6 py-4 text-gray-500 text-xs font-mono">
                                        {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {log.app_name}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getMethodColor(log.method)}`}>
                                            {log.method}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 font-mono text-xs truncate max-w-[200px]">
                                        {log.endpoint}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${log.status_code < 300 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {log.status_code < 300 ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                            {log.status_code}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => setSelectedLog(log)}
                                            className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 p-1.5 rounded-lg transition-colors"
                                            title="View Details"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {!loading && logs.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <Server className="w-10 h-10 mb-2 opacity-20" />
                                            <p>No API logs found matching your filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {total > 0 && (
                    <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
                        <span className="text-xs text-gray-500">Showing {((page-1)*limit)+1} - {Math.min(page*limit, total)} of {total}</span>
                        <div className="flex gap-2">
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 bg-white border rounded text-xs disabled:opacity-50 hover:bg-gray-100">Prev</button>
                            <button disabled={page * limit >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 bg-white border rounded text-xs disabled:opacity-50 hover:bg-gray-100">Next</button>
                        </div>
                    </div>
                )}
            </div>

            <LogDetailModal 
                log={selectedLog} 
                onClose={() => setSelectedLog(null)} 
            />
        </div>
    );
}