import React, { useState } from 'react';
import axios from 'axios';
import { X, Save, Database } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal, { ModalFooter } from '../common/Modal';
import Button from '../common/Button';

export default function SaveToKbModal({ isOpen, onClose, message }) {
    // Determine initial values based on who sent the message
    // If received (from user), it's likely the QUESTION.
    // If sent (from agent), it's likely the ANSWER.
    const isFromMe = message?.from_me;
    
    const [question, setQuestion] = useState(isFromMe ? '' : message?.content || '');
    const [answer, setAnswer] = useState(isFromMe ? message?.content || '' : '');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!question || !answer) return toast.error("Both question and answer are required");
        setLoading(true);
        try {
            // Default to Global KB (session_id: null) for general utility
            await axios.post('/api/app/chatbot/kb/qa', {
                question,
                answer,
                session_id: null 
            });
            toast.success("Saved to Knowledge Base");
            onClose();
        } catch (err) {
            toast.error("Failed to save: " + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-600" /> Save to Knowledge Base
                </div>
            }
            size="md"
            footer={
                <ModalFooter>
                    <Button onClick={onClose} variant="ghost">Cancel</Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={loading}
                        leftIcon={<Save className="w-4 h-4" />}
                    >
                        Save to KB
                    </Button>
                </ModalFooter>
            }
        >
            <div className="space-y-4">
                    <p className="text-sm text-gray-500">Train your AI by saving this interaction. It will be used to answer similar questions in the future.</p>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">User Question</label>
                        <textarea 
                            className="w-full border p-2 rounded-lg text-sm h-20 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            placeholder="What did the customer ask?"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Agent Answer</label>
                        <textarea 
                            className="w-full border p-2 rounded-lg text-sm h-24 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={answer}
                            onChange={e => setAnswer(e.target.value)}
                            placeholder="How should the AI answer?"
                        />
                    </div>

            </div>
        </Modal>
    );
}