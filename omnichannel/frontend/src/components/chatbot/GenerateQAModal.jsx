import React, { useState } from 'react';
import axios from 'axios';
import { X, Sparkles, Save, Loader2, Globe, Smartphone } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal, { ModalFooter } from '../common/Modal';

export default function GenerateQAModal({ isOpen, onClose, conversationId, deviceId, deviceName }) {
    const [step, setStep] = useState('loading'); // loading, review
    const [data, setData] = useState({ question: '', answer: '' });
    const [scope, setScope] = useState('global'); // global, device
    const [isSaving, setIsSaving] = useState(false);

    // Trigger generation when modal opens
    React.useEffect(() => {
        if (isOpen && conversationId) {
            setStep('loading');
            generateContent();
        }
    }, [isOpen, conversationId]);

    const generateContent = async () => {
        try {
            // Corrected endpoint path to match server.js router structure (/api/app/chatbot/...)
            const res = await axios.post('/api/app/chatbot/knowledge/generate-from-chat', {
                conversation_id: conversationId,
                limit: 20
            });
            setData(res.data.data);
            setStep('review');
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to generate Q&A");
            onClose();
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Corrected endpoint path
            await axios.post('/api/app/chatbot/knowledge/save-generated', {
                question: data.question,
                answer: data.answer,
                scope: scope,
                session_id: deviceId // Only used if scope is 'device'
            });
            toast.success("Knowledge Saved Successfully!");
            onClose();
        } catch (err) {
            toast.error("Failed to save");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2 text-indigo-700">
                    <Sparkles className="w-4 h-4" />
                    <span className="font-bold text-base">AI Knowledge Learning</span>
                </div>
            }
            size="md"
            footer={
                step === 'review' ? (
                    <ModalFooter>
                        <div className="w-full flex justify-end gap-2">
                            <button onClick={onClose} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors">
                                Discard
                            </button>
                            <button 
                                onClick={handleSave} 
                                disabled={isSaving}
                                className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-1.5 disabled:opacity-70 transition-colors shadow-sm"
                            >
                                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                Save Knowledge
                            </button>
                        </div>
                    </ModalFooter>
                ) : null
            }
        >
            <div className="space-y-4">
                {step === 'loading' ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                        <p className="text-gray-800 font-bold">Analyzing Conversation...</p>
                        <p className="text-sm text-gray-500 mt-2 max-w-xs">Extracting insights and summarizing into a reusable Q&A pair using Gemini AI.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-800 mb-2">
                            <strong>AI Suggestion:</strong> Please review and edit the text below before saving to ensure accuracy.
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Question (User Intent)</label>
                            <textarea 
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-16 resize-none"
                                value={data.question}
                                onChange={e => setData({...data, question: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Answer (Solution)</label>
                            <textarea 
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-28 resize-none"
                                value={data.answer}
                                onChange={e => setData({...data, answer: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Save To</label>
                            <div className="grid grid-cols-2 gap-3">
                                <label className={`flex items-center p-2.5 border rounded-lg cursor-pointer transition-all ${scope === 'global' ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'hover:bg-gray-50 border-gray-200'}`}>
                                    <div className="flex items-start gap-2.5 w-full">
                                        <input type="radio" name="scope" checked={scope === 'global'} onChange={() => setScope('global')} className="text-indigo-600 mt-0.5" />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <Globe className="w-3.5 h-3.5 text-gray-600" />
                                                <span className="text-xs font-bold text-gray-800">Global KB</span>
                                            </div>
                                            <span className="text-[10px] text-gray-500 block leading-tight">Available to ALL bots</span>
                                        </div>
                                    </div>
                                </label>

                                <label className={`flex items-center p-2.5 border rounded-lg cursor-pointer transition-all ${scope === 'device' ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'hover:bg-gray-50 border-gray-200'}`}>
                                    <div className="flex items-start gap-2.5 w-full">
                                        <input type="radio" name="scope" checked={scope === 'device'} onChange={() => setScope('device')} className="text-indigo-600 mt-0.5" />
                                        <div className="flex-1 overflow-hidden">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <Smartphone className="w-3.5 h-3.5 text-gray-600" />
                                                <span className="text-xs font-bold text-gray-800">Device KB</span>
                                            </div>
                                            <span className="text-[10px] text-gray-500 block leading-tight truncate">For: {deviceName || 'Current Device'}</span>
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
