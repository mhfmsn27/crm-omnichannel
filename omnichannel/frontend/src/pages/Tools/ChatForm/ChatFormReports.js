import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, FileText, Calendar, Download } from 'lucide-react';
import { getApiUrl } from '../../../config/api';
import { toast } from 'react-hot-toast';

export default function ChatFormReports({ form, onBack }) {
    const [submissions, setSubmissions] = useState([]);

    useEffect(() => {
        axios.get(`/api/app/forms/${form.id}/submissions`).then(res => setSubmissions(res.data));
    }, [form]);

    const handleExport = async () => {
        try {
             const res = await axios.get(`/api/app/forms/${form.id}/export`, { responseType: 'blob' });
             const url = window.URL.createObjectURL(new Blob([res.data]));
             const link = document.createElement('a');
             link.href = url;
             link.setAttribute('download', `${form.name}-submissions.xlsx`);
             document.body.appendChild(link);
             link.click();
        } catch (e) { toast.error("Export failed"); }
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-900 font-bold">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Forms
                </button>
                <button onClick={handleExport} className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-green-700">
                    <Download className="w-4 h-4" /> Export Excel
                </button>
            </div>

            <h2 className="text-xl font-bold mb-6">Submissions: {form.name}</h2>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 font-bold text-gray-600">Date</th>
                            <th className="p-4 font-bold text-gray-600">Contact</th>
                            <th className="p-4 font-bold text-gray-600">Data</th>
                            <th className="p-4 font-bold text-gray-600">PDF</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {submissions.map(sub => (
                            <tr key={sub.id} className="hover:bg-gray-50">
                                <td className="p-4 text-gray-500">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(sub.created_at).toLocaleDateString()}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="font-bold text-gray-900">{sub.contact_name || 'Unknown'}</div>
                                    <div className="text-xs text-gray-500">{sub.phone_number}</div>
                                </td>
                                <td className="p-4">
                                    <div className="max-h-20 overflow-y-auto text-xs text-gray-600">
                                        <pre>{JSON.stringify(sub.data, null, 2)}</pre>
                                    </div>
                                </td>
                                <td className="p-4">
                                    {sub.generated_pdf_url ? (
                                        <a href={getApiUrl(sub.generated_pdf_url)} target="_blank" rel="noreferrer" className="text-red-600 flex items-center gap-1 hover:underline font-bold">
                                            <FileText className="w-4 h-4" /> View PDF
                                        </a>
                                    ) : <span className="text-gray-400">-</span>}
                                </td>
                            </tr>
                        ))}
                        {submissions.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-gray-400">No data yet</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}