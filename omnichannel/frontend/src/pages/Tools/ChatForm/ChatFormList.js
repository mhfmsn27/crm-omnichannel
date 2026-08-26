import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Plus, Edit, Trash2, FileCheck, Eye, ToggleLeft, ToggleRight, Info, X, MessageSquare, FileCheck2, FileOutput } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import ChatFormEditor from './ChatFormEditor';
import ChatFormReports from './ChatFormReports';
import PaywallGuard from '../../../components/common/PaywallGuard';
import { useConfig } from '../../../context/ConfigContext';
import Modal, { ModalFooter } from '../../../components/common/Modal';
import Button from '../../../components/common/Button';

const InfoModal = ({ isOpen, onClose }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Info className="w-5 h-5 text-indigo-600" /> About Chat Form
                </div>
            }
            size="lg"
            footer={
                <ModalFooter>
                    <Button onClick={onClose} fullWidth>Got it</Button>
                </ModalFooter>
            }
        >
            <div className="space-y-4 text-sm text-gray-600">
                    <p className="leading-relaxed">
                        <strong>Chat Form</strong> allows you to collect structured data from customers directly inside a WhatsApp conversation.
                        It replaces traditional web forms with an interactive chat experience.
                    </p>

                    <div className="grid grid-cols-1 gap-4 mt-4">
                        <div className="flex gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 h-fit"><MessageSquare className="w-5 h-5" /></div>
                            <div>
                                <h4 className="font-bold text-gray-900">Interactive Q&A</h4>
                                <p className="text-xs mt-1">Define a sequence of questions. The bot will ask them one by one and validate the user's answers (Text, Number, Email).</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <div className="p-2 bg-green-50 rounded-lg text-green-600 h-fit"><FileCheck2 className="w-5 h-5" /></div>
                            <div>
                                <h4 className="font-bold text-gray-900">Auto PDF Generation</h4>
                                <p className="text-xs mt-1">Automatically generate a PDF document (e.g., Registration Form, Ticket, Receipt) populated with the user's data upon completion.</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <div className="p-2 bg-purple-50 rounded-lg text-purple-600 h-fit"><FileOutput className="w-5 h-5" /></div>
                            <div>
                                <h4 className="font-bold text-gray-900">Data Export</h4>
                                <p className="text-xs mt-1">All submissions are saved to the database and can be exported to Excel for further processing.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-yellow-800 text-xs mt-4">
                        <strong>Tip:</strong> Set a unique <em>Trigger Keyword</em> (e.g. "daftar", "register") so users can start the form by just typing that word.
                    </div>
            </div>
        </Modal>
    );
};

export default function ChatFormList() {
    const [forms, setForms] = useState([]);
    const [view, setView] = useState('list'); // list, editor, reports
    const [selectedForm, setSelectedForm] = useState(null);
    const [isInfoOpen, setIsInfoOpen] = useState(false);

    const { hasFeature } = useConfig();

    useEffect(() => {
        if (view === 'list') {
            if (hasFeature('feat_chatform')) {
                fetchForms();
            }
        }
    }, [view, hasFeature]);

    const fetchForms = async () => {
        try {
            const res = await axios.get('/api/app/forms');
            setForms(res.data);
        } catch (err) {
            if (err.response && err.response.status !== 403) {
                console.error(err);
            }
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this form?")) return;
        try {
            await axios.delete(`/api/app/forms/${id}`);
            fetchForms();
        } catch (e) { toast.error("Failed delete"); }
    };

    const handleToggle = async (form) => {
        try {
            const updatedForm = { ...form, is_active: !form.is_active };
            // Optimistic update
            setForms(prev => prev.map(f => f.id === form.id ? updatedForm : f));

            await axios.put(`/api/app/forms/${form.id}`, updatedForm);
            toast.success(`Form ${updatedForm.is_active ? 'Activated' : 'Deactivated'}`);
        } catch (e) {
            toast.error("Failed to update status");
            fetchForms(); // Revert on error
        }
    };

    if (view === 'editor') {
        return <ChatFormEditor form={selectedForm} onBack={() => { setView('list'); setSelectedForm(null); }} />;
    }

    if (view === 'reports') {
        return <ChatFormReports form={selectedForm} onBack={() => { setView('list'); setSelectedForm(null); }} />;
    }

    return (
        <PaywallGuard feature="feat_chatform" title="Conversational Form Locked" description="Upgrade to collect structured data from your customers directly in WhatsApp using interactive forms.">
            <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
                <div className="flex flex-wrap justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <FileText className="w-8 h-8 text-indigo-600" /> Conversational Form
                        </h2>
                        <p className="text-sm text-gray-500">Collect data automatically inside WhatsApp chat.</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsInfoOpen(true)}
                            className="px-3 py-2 bg-white border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 flex items-center gap-2 font-medium shadow-sm transition-colors"
                            title="What is Chat Form?"
                        >
                            <Info className="w-5 h-5" />
                        </button>
                        <button onClick={() => { setSelectedForm(null); setView('editor'); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-colors">
                            <Plus className="w-4 h-4" /> Create Form
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {forms.map(f => (
                        <div key={f.id} className={`bg-white p-6 rounded-xl border shadow-sm hover:shadow-md transition-all flex flex-col ${f.is_active ? 'border-green-200 ring-1 ring-green-50' : 'border-gray-200'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleToggle(f); }}
                                    className={`flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded transition-colors cursor-pointer border ${f.is_active ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                                >
                                    {f.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                    {f.is_active ? 'ON' : 'OFF'}
                                </button>
                            </div>
                            <h3 className="font-bold text-lg text-gray-900 mb-1">{f.name}</h3>
                            <p className="text-sm text-gray-500 mb-4">Trigger: <span className="font-mono bg-gray-100 px-1 rounded">{f.trigger_keyword}</span></p>

                            <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                    <FileCheck className="w-3 h-3" /> {f.submission_count} Submissions
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setSelectedForm(f); setView('reports'); }} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded" title="View Reports">
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => { setSelectedForm(f); setView('editor'); }} className="p-2 text-gray-400 hover:text-indigo-600 bg-gray-50 rounded" title="Edit">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(f.id)} className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 rounded" title="Delete">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {forms.length === 0 && (
                        <div className="col-span-full text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400">
                            No forms created yet.
                        </div>
                    )}
                </div>

                <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
            </div>
        </PaywallGuard>
    );
}
