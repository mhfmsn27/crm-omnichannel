import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Database, Upload, Plus, Trash2, FileText, Lock, Crown, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function GlobalKBPage() {
    const [qaList, setQaList] = useState([]);
    const [assets, setAssets] = useState([]);
    const [newQa, setNewQa] = useState({ question: '', answer: '' });
    const [loading, setLoading] = useState(true);
    const [locked, setLocked] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/app/chatbot/kb'); // Default fetches Global (session_id=null)
            setQaList(res.data.qa);
            setAssets(res.data.assets);
        } catch (err) {
            if (err.response && err.response.data && err.response.data.locked) {
                setLocked(true);
            } else {
                console.error(err);
            }
        } finally { setLoading(false); }
    };

    const handleAddQa = async () => {
        try {
            const res = await axios.post('/api/app/chatbot/kb/qa', newQa);
            setQaList([res.data, ...qaList]);
            setNewQa({ question: '', answer: '' });
            toast.success("Q&A Added");
        } catch (err) {
            if (err.response?.data?.upsell) return toast.error(err.response.data.error);
            toast.error("Failed");
        }
    };

    const handleDeleteQa = async (id) => {
        try {
            await axios.delete(`/api/app/chatbot/kb/qa/${id}`);
            setQaList(qaList.filter(q => q.id !== id));
        } catch (err) { toast.error("Failed"); }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('description', file.name);
        try {
            const res = await axios.post('/api/app/chatbot/kb/upload', fd);
            setAssets([res.data, ...assets]);
            toast.success("File Uploaded");
        } catch (err) {
            if (err.response?.data?.upsell) return toast.error(err.response.data.error);
            toast.error("Upload Failed");
        }
    };

    const handleDeleteAsset = async (id) => {
        try {
            await axios.delete(`/api/app/chatbot/kb/assets/${id}`);
            setAssets(assets.filter(a => a.id !== id));
        } catch (err) { toast.error("Failed"); }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    if (false && locked) { // PERSONAL VERSION: Bypass
        return null;
    }

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
            <div className="mb-8">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Database className="w-8 h-8 text-indigo-600" /> Global Knowledge Base
                </h2>
                <p className="text-sm text-gray-500">Data here is accessible by ALL bots set to use "Global Mode".</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Q&A Section */}
                <div className="bg-white p-6 rounded-xl border shadow-sm h-full flex flex-col">
                    <h3 className="font-bold text-lg mb-4">Q&A Pairs</h3>
                    <div className="space-y-3 mb-6">
                        <input className="w-full border p-2 rounded" placeholder="Question (e.g. Price list?)" value={newQa.question} onChange={e => setNewQa({ ...newQa, question: e.target.value })} />
                        <textarea className="w-full border p-2 rounded h-20" placeholder="Answer..." value={newQa.answer} onChange={e => setNewQa({ ...newQa, answer: e.target.value })} />
                        <button onClick={handleAddQa} className="w-full bg-indigo-600 text-white py-2 rounded font-bold hover:bg-indigo-700">Add Q&A</button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {qaList.map(q => (
                            <div key={q.id} className="p-4 border rounded-lg bg-gray-50 relative group">
                                <p className="font-bold text-gray-800 pr-6">{q.question}</p>
                                <p className="text-sm text-gray-600 mt-1">{q.answer}</p>
                                <button onClick={() => handleDeleteQa(q.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Assets Section */}
                <div className="bg-white p-6 rounded-xl border shadow-sm h-full flex flex-col">
                    <h3 className="font-bold text-lg mb-4">Documents (PDF/Images)</h3>
                    <div className="border-2 border-dashed border-indigo-200 bg-indigo-50 rounded-xl p-8 text-center mb-6 relative hover:bg-indigo-100 transition-colors">
                        <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleUpload} />
                        <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                        <span className="text-indigo-600 font-bold text-sm">Click to Upload Document</span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {assets.map(a => (
                            <div key={a.id} className="p-4 border rounded-lg flex items-center justify-between hover:bg-gray-50">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="bg-gray-100 p-2 rounded"><FileText className="w-5 h-5 text-gray-500" /></div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm truncate">{a.description}</p>
                                        <p className="text-xs text-gray-400 uppercase">{a.mime_type}</p>
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteAsset(a.id)} className="text-red-400 hover:text-red-600">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
