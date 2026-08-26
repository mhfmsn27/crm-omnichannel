import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, Plus, Trash2, Edit, Save, X, PlayCircle, CheckCircle, ArrowRight, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import FollowUpReportModal from '../../components/tools/FollowUpReportModal';
import Modal, { ModalFooter } from '../../components/common/Modal';
import Button from '../../components/common/Button';

export default function FollowUpTool() {
    const [sequences, setSequences] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    
    // Report Modal
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [selectedSequence, setSelectedSequence] = useState(null);

    // Form
    const [form, setForm] = useState({ id: null, name: '', steps: [] });

    useEffect(() => {
        fetchSequences();
    }, []);

    const fetchSequences = async () => {
        try {
            const res = await axios.get('/api/app/followups/sequences');
            setSequences(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        if (!form.name || form.steps.length === 0) return toast.error("Name and at least 1 step required");
        
        try {
            if (form.id) {
                await axios.put(`/api/app/followups/sequences/${form.id}`, form);
                toast.success("Updated");
            } else {
                await axios.post('/api/app/followups/sequences', form);
                toast.success("Created");
            }
            setIsModalOpen(false);
            fetchSequences();
        } catch (err) {
            toast.error("Failed to save");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete sequence?")) return;
        try {
            await axios.delete(`/api/app/followups/sequences/${id}`);
            fetchSequences();
        } catch(e) { toast.error("Failed"); }
    };

    const openEdit = (seq) => {
        setForm(seq);
        setIsModalOpen(true);
    };

    const openReport = (seq) => {
        setSelectedSequence(seq);
        setIsReportOpen(true);
    };

    const openCreate = () => {
        setForm({ id: null, name: '', steps: [{ delay_hours: 24, message: '' }] });
        setIsModalOpen(true);
    };

    const addStep = () => {
        setForm(prev => ({
            ...prev,
            steps: [...prev.steps, { delay_hours: 24, message: '' }]
        }));
    };

    const removeStep = (idx) => {
        setForm(prev => ({
            ...prev,
            steps: prev.steps.filter((_, i) => i !== idx)
        }));
    };

    const updateStep = (idx, field, val) => {
        const newSteps = [...form.steps];
        newSteps[idx][field] = val;
        setForm({ ...form, steps: newSteps });
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
            <div className="flex flex-wrap justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Clock className="w-8 h-8 text-indigo-600" /> Auto Follow-up
                    </h2>
                    <p className="text-sm text-gray-500">Manage automated reminder sequences for your leads.</p>
                </div>
                <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> New Sequence
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sequences.map(seq => (
                    <div key={seq.id} className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col">
                        <div className="flex justify-between items-start mb-3">
                            <h3 className="font-bold text-gray-800">{seq.name}</h3>
                            <div className="flex gap-1">
                                <button onClick={() => openReport(seq)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="View Active Report">
                                    <FileText className="w-4 h-4"/>
                                </button>
                                <button onClick={() => openEdit(seq)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded" title="Edit">
                                    <Edit className="w-4 h-4"/>
                                </button>
                                <button onClick={() => handleDelete(seq.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded" title="Delete">
                                    <Trash2 className="w-4 h-4"/>
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex-1 space-y-3 relative mb-4">
                            {/* Vertical Line */}
                            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-100"></div>
                            
                            {seq.steps.map((step, idx) => (
                                <div key={idx} className="relative pl-8 text-sm">
                                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-xs text-indigo-600 font-bold z-10">
                                        {idx + 1}
                                    </div>
                                    <p className="text-xs font-bold text-gray-500">Wait {step.delay_hours} hours</p>
                                    <p className="text-gray-700 line-clamp-1 italic">"{step.message}"</p>
                                </div>
                            ))}
                        </div>
                        
                        <div className="pt-3 border-t flex items-center gap-2 text-xs text-gray-400">
                            <PlayCircle className="w-4 h-4" />
                            <span>{seq.steps.length} Steps sequence</span>
                        </div>
                    </div>
                ))}
                 {sequences.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl border border-dashed text-gray-400">
                        No sequences found. Create one to start automating!
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={form.id ? 'Edit Sequence' : 'New Sequence'}
                size="2xl"
                footer={
                    <ModalFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save Sequence</Button>
                    </ModalFooter>
                }
            >
                <div className="space-y-6">
                    <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Sequence Name</label>
                                <input className="w-full border p-2 rounded" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Promo Follow Up" />
                            </div>

                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-gray-700">Timeline Steps</label>
                                {form.steps.map((step, idx) => (
                                    <div key={idx} className="flex gap-4 items-start bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <div className="w-8 h-8 bg-white rounded-full border flex items-center justify-center font-bold text-gray-500 shrink-0 shadow-sm">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase">Delay (Hours after previous step)</label>
                                                <input type="number" className="w-full border p-2 rounded mt-1" value={step.delay_hours} onChange={e => updateStep(idx, 'delay_hours', e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase">Message</label>
                                                <textarea className="w-full border p-2 rounded mt-1 h-20 text-sm" value={step.message} onChange={e => updateStep(idx, 'message', e.target.value)} placeholder="Hi {name}..." />
                                            </div>
                                        </div>
                                        <button onClick={() => removeStep(idx)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                ))}
                                <button onClick={addStep} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-bold hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-center gap-2">
                                    <Plus className="w-4 h-4" /> Add Step
                                </button>
                            </div>
                </div>
            </Modal>

            <FollowUpReportModal 
                isOpen={isReportOpen}
                onClose={() => setIsReportOpen(false)}
                sequence={selectedSequence}
            />
        </div>
    );
}
