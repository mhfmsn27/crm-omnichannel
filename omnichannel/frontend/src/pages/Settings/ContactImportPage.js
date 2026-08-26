import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, Download } from 'lucide-react';
import toast from 'react-hot-toast';

function ImportRow({ result }) {
    return (
        <tr className="border-b">
            <td className="p-3">{result.filename}</td>
            <td className="p-3 text-center">{result.total_rows || 0}</td>
            <td className="p-3 text-center">
                <span className="text-green-600 font-medium">{result.imported_count}</span>
            </td>
            <td className="p-3 text-center">
                <span className="text-orange-500">{result.skipped_count}</span>
            </td>
            <td className="p-3 text-center">
                <span className={result.errors > 0 ? 'text-red-500' : 'text-gray-400'}>
                    {result.errors}
                </span>
            </td>
            <td className="p-3 text-center">
                {result.status === 'completed' ? (
                    <span className="text-green-600">Completed</span>
                ) : result.status === 'failed' ? (
                    <span className="text-red-500">Failed</span>
                ) : (
                    <span className="text-gray-400">Processing</span>
                )}
            </td>
            <td className="p-3">
                {new Date(result.created_at).toLocaleDateString('id-ID')}
            </td>
        </tr>
    );
}

export default function ContactImportPage() {
    const [showModal, setShowModal] = useState(false);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dragActive, setDragActive] = useState(false);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState(null);

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/app/contacts/import/history');
            setHistory(res.data);
        } catch {
            toast.error('Gagal memuat history');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const handleFile = async (file) => {
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);

        setImporting(true);
        setResult(null);

        try {
            const text = await file.text();
            const res = await axios.post('/api/app/contacts/import', {
                filename: file.name,
                content: text,
                duplicate_action: 'skip'
            });

            setResult(res.data);
            toast.success(`Import selesai: ${res.data.imported} kontak diimport`);

            if (res.data.errors?.length > 0) {
                toast.warning(`${res.data.errors.length} baris memiliki error`);
            }

            fetchHistory();
            setShowModal(false);
        } catch (e) {
            toast.error(e.response?.data?.error || 'Import gagal');
        } finally {
            setImporting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const file = e.target.file.files[0];
        handleFile(file);
    };

    const downloadTemplate = () => {
        const template = 'Name,Phone,Email,Address,Company,Notes\nJohn Doe,081234567890,john@example.com,Jakarta,Toko ABC,VIP Customer';
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template_import_kontak.csv';
        a.click();
    };

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold">Import Kontak</h1>
                    <p className="text-sm text-gray-500">Import dari file CSV</p>
                </div>
                <button onClick={downloadTemplate} className="text-sm text-indigo-600 hover:underline">
                    Download Template CSV
                </button>
            </div>

            {/* Drop Zone */}
            <div
                onDragEnter={handleDrop}
                onDragEnd={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
            >
                <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={e => handleFile(e.target.files[0])}
                />
                <div className="flex flex-col items-center">
                    <Upload className="w-12 h-12 text-gray-300 mb-4" />
                    <p className="text-lg font-medium mb-2">Drop file CSV di sini</p>
                    <p className="text-sm text-gray-400">atau</p>
                    <label className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer">
                        Pilih File CSV
                        <input type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
                    Browse files
                    </label>
                </div>
                <p className="text-xs text-gray-400 mt-4">Format: CSV dengan header Name, Phone, Email</p>
            </div>

            {/* Import History */}
            {result && (
                <div className={`rounded-xl border ${result.errors > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                    <div className="p-4 flex items-center gap-3">
                        {result.errors > 0 ? <AlertCircle className="w-5 h-5 text-red-500" /> : <CheckCircle className="w-5 h-5 text-green-600" />}
                        <div className="flex-1">
                            <p className="font-medium">{result.imported} kontak diimport</p>
                            <p className="text-sm text-gray-500">{result.skipped} duplikat di skip</p>
                        </div>
                        {result.errors > 0 && (
                            <span className="text-sm text-red-500">{result.errors} error</span>
                        )}
                    </div>
                </div>
            )}

            {/* History */}
            <div className="bg-white rounded-xl border shadow-sm">
                <div className="p-4 border-b">
                    <h3 className="font-medium">History Import</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left p-3">File</th>
                                <th className="text-center">Total</th>
                                <th className="text-center">Import</th>
                                <th className="text-center">Skip</th>
                                <th className="text-center">Error</th>
                                <th className="text-center">Status</th>
                                <th className="text-left">Tanggal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map(h => <ImportRow key={h.id} result={h} />)}
                            {history.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-400">
                                        Belum ada import history
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}