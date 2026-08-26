import React, { useEffect, useState } from 'react';
import { Users, Megaphone, Loader2 } from 'lucide-react';
import axios from 'axios';
import Modal, { ModalFooter } from './Modal';

export default function MemberReportModal({ member, onClose }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        if (member?.id) {
            fetchReports();
        }
    }, [member]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/sa/members/${member.id}/reports`);
            setData(res.data);
        } catch (err) {
            console.error("Failed to fetch reports", err);
        } finally {
            setLoading(false);
        }
    };

    if (!member) return null;

    return (
        <Modal
            isOpen={!!member}
            onClose={onClose}
            title={
                <div>
                    <h3 className="font-bold text-gray-800 text-lg">Member Reports</h3>
                    <p className="text-xs text-gray-500 font-normal">{member.name} ({member.owner_email})</p>
                </div>
            }
            size="lg"
            className="max-h-[90vh] flex flex-col p-0"
            footer={
                <ModalFooter>
                    <div className="w-full flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </ModalFooter>
            }
        >
            <div className="p-6 overflow-y-auto flex-1">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-2 text-indigo-500" />
                        <p className="text-sm">Loading reports...</p>
                    </div>
                ) : data ? (
                    <div className="space-y-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-center gap-4">
                                <div className="bg-indigo-100 p-3 rounded-lg text-indigo-600">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Total Contacts</p>
                                    <p className="text-2xl font-bold text-gray-900">{data.stats.total_contacts}</p>
                                </div>
                            </div>
                            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex items-center gap-4">
                                <div className="bg-orange-100 p-3 rounded-lg text-orange-600">
                                    <Megaphone className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Total Broadcasts</p>
                                    <p className="text-2xl font-bold text-gray-900">{data.stats.total_broadcasts}</p>
                                </div>
                            </div>
                        </div>

                        {/* Recent Campaigns Table */}
                        <div>
                            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <Megaphone className="w-4 h-4 text-gray-500" /> Recent Broadcasts
                            </h4>
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 font-medium text-gray-500">Campaign Name</th>
                                            <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                                            <th className="px-4 py-3 font-medium text-gray-500 text-right">Created At</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {data.recent_broadcasts.length > 0 ? (
                                            data.recent_broadcasts.map((b) => (
                                                <tr key={b.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-medium text-gray-900">{b.name}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${b.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                                b.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                                                    b.status === 'failed' ? 'bg-red-100 text-red-700' :
                                                                        'bg-gray-100 text-gray-600'
                                                            }`}>
                                                            {b.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500 text-right">
                                                        {new Date(b.created_at).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="3" className="px-4 py-8 text-center text-gray-400 italic">
                                                    No recent broadcasts found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-red-500 py-10">
                        Failed to load data.
                    </div>
                )}
            </div>
        </Modal>
    );
}
