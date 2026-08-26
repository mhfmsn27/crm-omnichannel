import React, { useState } from 'react';
import axios from 'axios';
import { Upload, FileSpreadsheet, CheckCircle, Loader2, Download, AlertTriangle, Globe } from 'lucide-react';
import * as XLSX from 'xlsx'; 
import Modal, { ModalFooter } from '../common/Modal';

export default function ImportContactModal({ isOpen, onClose, onSuccess }) {
    const [step, setStep] = useState(1);
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    if (!isOpen) return null;

    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            { Name: "John Doe", Phone: "628123456789", Email: "john@example.com", Labels: "VIP, Jakarta", "Internal Note": "Client from FB Ads", "Company": "Tech Corp" },
            { Name: "Jane Smith", Phone: "081987654321", Email: "jane@test.com", Labels: "Lead", "Internal Note": "Follow up next week", "Company": "Acme Inc" }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "contact_template.xlsx");
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleProcess = async () => {
        if (!file) return;
        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post('/api/app/contacts/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(res.data);
            setStep(2);
        } catch (err) {
            alert("Import Failed: " + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleImport = () => {
        alert("Google Contacts Integration Coming Soon!");
    };

    const handleFinish = () => {
        onSuccess();
        onClose();
        setStep(1);
        setFile(null);
        setResult(null);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={null}
            size="md"
            className="p-0 overflow-hidden"
            footer={
                step === 1 ? (
                    <ModalFooter>
                        <div className="w-full flex justify-end gap-3 pt-2">
                            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button 
                                onClick={handleProcess} 
                                disabled={!file || loading}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Process Import'}
                            </button>
                        </div>
                    </ModalFooter>
                ) : null
            }
        >
            <div className="bg-indigo-600 p-6 text-white relative">
                <h3 className="text-xl font-bold">Import Contacts</h3>
                <p className="text-indigo-100 text-sm">Bulk upload contacts from Excel/CSV or Google</p>
                <button onClick={onClose} className="absolute top-4 right-4 text-indigo-200 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>

            <div className="p-6">
                {step === 1 && (
                    <div className="space-y-6">
                        {/* NEW: Google Import */}
                        <button 
                            onClick={handleGoogleImport}
                            className="w-full p-4 border border-gray-200 rounded-xl flex items-center gap-4 hover:bg-gray-50 transition-colors group"
                        >
                            <div className="p-2 bg-blue-50 rounded-full text-blue-600 group-hover:bg-blue-100">
                                <Globe className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                                <h4 className="font-bold text-gray-800 text-sm">Import from Google Contacts</h4>
                                <p className="text-xs text-gray-500">Connect your Google account to sync contacts.</p>
                            </div>
                        </button>

                        <div className="relative flex items-center py-2">
                            <div className="flex-grow border-t border-gray-200"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold uppercase">Or via File</span>
                            <div className="flex-grow border-t border-gray-200"></div>
                        </div>

                        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-indigo-900 text-sm">1. Download Template</h4>
                                <p className="text-xs text-indigo-700">Use this file format for correct import.</p>
                                <p className="text-[10px] text-indigo-600 mt-1 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> Anda dapat menambahkan kolom baru (misal: "Internal Note", "Company") secara bebas.
                                </p>
                            </div>
                            <button 
                                onClick={downloadTemplate}
                                className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 text-xs font-bold rounded hover:bg-indigo-50 flex items-center gap-2"
                            >
                                <Download className="w-3 h-3" /> Download
                            </button>
                        </div>

                        <div>
                            <h4 className="font-bold text-gray-800 text-sm mb-2">2. Upload File</h4>
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors">
                                <input type="file" accept=".xlsx, .csv" className="hidden" id="import-file" onChange={handleFileChange} />
                                <label htmlFor="import-file" className="cursor-pointer flex flex-col items-center">
                                    {file ? (
                                        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-full">
                                            <FileSpreadsheet className="w-5 h-5" />
                                            <span className="font-medium text-sm">{file.name}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-10 h-10 text-gray-400 mb-2" />
                                            <span className="text-sm text-gray-600 font-medium">Click to upload .xlsx or .csv</span>
                                            <span className="text-xs text-gray-400 mt-1">Max 2000 rows recommended</span>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && result && (
                    <div className="text-center">
                        <div className="mb-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <h4 className="text-xl font-bold text-gray-900">Import Completed</h4>
                            <p className="text-gray-500 text-sm">Your contacts have been processed.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                <span className="block text-2xl font-bold text-green-700">{result.success_count}</span>
                                <span className="text-xs text-green-600 uppercase font-bold">Success</span>
                            </div>
                            <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                                <span className="block text-2xl font-bold text-red-700">{result.failed_count}</span>
                                <span className="text-xs text-red-600 uppercase font-bold">Failed</span>
                            </div>
                        </div>

                        {result.errors.length > 0 && (
                            <div className="text-left bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-40 overflow-y-auto mb-6">
                                <h5 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Error Log
                                </h5>
                                <ul className="text-xs text-red-600 space-y-1 list-disc pl-4">
                                    {result.errors.map((err, idx) => (
                                        <li key={idx}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <button 
                            onClick={handleFinish}
                            className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700"
                        >
                            Close & Refresh
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
}