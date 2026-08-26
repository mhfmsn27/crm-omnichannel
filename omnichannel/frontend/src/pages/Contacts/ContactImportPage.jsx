import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function ContactImport() {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const fileRef = useRef();

    const handleFile = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        setFile(f);
        setResult(null);
    };

    const handleUpload = async () => {
        if (!file) return toast.error('Pilih file dulu');
        setUploading(true);
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const res = await axios.post('/api/app/contacts/import', {
                    filename: file.name,
                    content: ev.target.result,
                    duplicate_action: 'skip'
                });
                setResult(res.data);
                toast.success(`${res.data.imported} kontak diimport`);
                fileRef.current.value = '';
                setFile(null);
            } catch (e) {
                toast.error(e.response?.data?.error || 'Import gagal');
            } finally {
                setUploading(false);
            }
        };
        reader.readAsText(file);
    };

    const downloadTemplate = () => {
        const csv = 'Name,Phone,Email,Address\nJohn Doe,081234567890,john@example.com,Jakarta';
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template_import.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <Upload className="w-6 h-6" /> Import Kontak
                </h1>
                <p className="text-sm text-gray-500">Import dari file CSV/Excel</p>
            </div>

            <div className="bg-white border-2 border-dashed rounded-xl p-8 text-center">
                <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-400" />
                <p className="mt-2 font-medium">Drag file di sini atau klik untuk pilih</p>
                <p className="text-sm text-gray-500 mt-1">Format: CSV, XLSX</p>
                <input ref={fileRef} type="file" accept=".csv,.xlsx" onChange={handleFile} className="hidden" />
                <button onClick={() => fileRef.current?.click()}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg">
                    Pilih File
                </button>
                <button onClick={downloadTemplate}
                    className="block mx-auto mt-2 text-sm text-indigo-600 hover:underline">
                    Download Template CSV
                </button>
            </div>

            {file && (
                <div className="bg-white border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FileSpreadsheet className="w-8 h-8 text-green-500" />
                            <div>
                                <p className="font-medium">{file.name}</p>
                                <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => fileRef.current.click()} className="px-3 py-1 border rounded-lg text-sm">
                                Ganti
                            </button>
                            <button onClick={handleUpload} disabled={uploading}
                                className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">
                                {uploading ? 'Mengimport...' : 'Import Sekarang'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {result && (
                <div className={`rounded-lg p-4 ${result.errors > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                    <div className="flex items-center gap-2">
                    {result.errors > 0 ? <XCircle className="w-5 h-5 text-red-500" /> : <CheckCircle className="w-5 h-5 text-green-500" />}
                    <div>
                        <p className="font-medium">
                            {result.imported} dik impor, {result.skipped} dilewati
                        </p>
                        {result.errors > 0 && (
                            <p className="text-sm text-red-600">{result.errors} error</p>
                        )}
                    </div>
                </div>
            )}

            <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Petunjuk Import
                </h3>
                <ul className="mt-2 text-sm text-blue-700 space-y-1">
                    <li>Format file: CSV dengan header: Name, Phone, Email, Address</li>
                    <li>Kolom Name & Phone wajib ada</li>
                    <li>Phone dalam format Indonesia: 08xx, +62, atau 62xx</li>
                    <li>Duplikat akan dilewati</li>
                </ul>
            </div>
        </div>
    );
}