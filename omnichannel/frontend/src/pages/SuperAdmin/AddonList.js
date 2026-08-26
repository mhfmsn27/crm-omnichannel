// frontend/src/pages/SuperAdmin/AddonList.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Plus, Trash2, Edit, Check, AlertCircle, Link } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal, { ModalFooter } from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { FEATURE_CONFIG } from '../../config/featureConfig';

export default function AddonList() {
    const [addons, setAddons] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState({});
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => { fetchAddons(); }, []);

    const fetchAddons = async () => {
        try {
            const res = await axios.get('/api/sa/addons');
            setAddons(res.data);
        } catch (err) { console.error(err); }
    };

    const handleSave = async () => {
        try {
            // Auto-detect type based on config
            const featureType = FEATURE_CONFIG[form.feature_code]?.type || 'limit';
            
            const payload = {
                ...form,
                type: featureType,
                // If boolean, value is always 1. If limit, user input.
                value: featureType === 'boolean' ? 1 : parseInt(form.value),
                price_monthly: parseInt(form.price_monthly),
                duration_days: parseInt(form.duration_days)
            };

            if (isEditing) await axios.put(`/api/sa/addons/${form.id}`, payload);
            else await axios.post('/api/sa/addons', payload);
            
            setIsModalOpen(false);
            fetchAddons();
        } catch (err) { alert("Error: " + (err.response?.data?.error || err.message)); }
    };

    const openCreate = () => {
        setIsEditing(false);
        setForm({ 
            code: '', name: '', description: '', 
            price_monthly: 50000, duration_days: 30,
            feature_code: 'feat_broadcast_limit', // Default to a limit
            value: 1000,
            prerequisite_feature_code: ''
        });
        setIsModalOpen(true);
    };

    // Helpers
    const selectedFeatureType = FEATURE_CONFIG[form.feature_code]?.type || 'limit';

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-800">Product List</h2>
                <button onClick={openCreate} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Create Product
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {addons.map(addon => (
                    <div key={addon.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${addon.type === 'boolean' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                {addon.type === 'boolean' ? 'Unlock' : `+${addon.value} Quota`}
                            </span>
                            <div className="flex gap-2">
                                <button onClick={() => { setIsEditing(true); setForm(addon); setIsModalOpen(true); }}><Edit className="w-4 h-4 text-gray-400 hover:text-indigo-600"/></button>
                                <button onClick={async () => { if(confirm("Del?")) { await axios.delete(`/api/sa/addons/${addon.id}`); fetchAddons(); } }}><Trash2 className="w-4 h-4 text-gray-400 hover:text-red-600"/></button>
                            </div>
                        </div>
                        <h3 className="font-bold text-gray-800">{addon.name}</h3>
                        <p className="text-xs text-gray-500 mb-2">{addon.code}</p>
                        <div className="text-sm font-bold text-indigo-600 mb-2">Rp {parseInt(addon.price_monthly).toLocaleString()}</div>
                        
                        {addon.prerequisite_feature_code && (
                            <div className="bg-orange-50 px-2 py-1 rounded border border-orange-100 flex items-center gap-1 text-[10px] text-orange-700 mt-2">
                                <Link className="w-3 h-3" /> Requires: {FEATURE_CONFIG[addon.prerequisite_feature_code]?.label}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isEditing ? 'Edit Add-on' : 'Create Add-on'}
                size="md"
                footer={
                    <ModalFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save</Button>
                    </ModalFooter>
                }
            >
                <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Product Name</label>
                                    <input className="w-full border p-2 rounded text-sm" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unique Code</label>
                                    <input className="w-full border p-2 rounded text-sm font-mono" value={form.code} onChange={e=>setForm({...form, code: e.target.value})} disabled={isEditing} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Target Feature</label>
                                <select className="w-full border p-2 rounded text-sm" value={form.feature_code} onChange={e=>setForm({...form, feature_code: e.target.value})}>
                                    {Object.keys(FEATURE_CONFIG).map(k => (
                                        <option key={k} value={k}>[{FEATURE_CONFIG[k].type.toUpperCase()}] {FEATURE_CONFIG[k].label}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedFeatureType === 'limit' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Quota Value (+)</label>
                                    <input type="number" className="w-full border p-2 rounded text-sm" value={form.value} onChange={e=>setForm({...form, value: e.target.value})} />
                                    <p className="text-[10px] text-gray-400">How much quota to add?</p>
                                </div>
                            )}
                            
                            {selectedFeatureType === 'boolean' && (
                                <div className="bg-blue-50 p-2 rounded text-xs text-blue-700">
                                    <Info className="w-3 h-3 inline mr-1" /> This add-on will unlock the feature module.
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prerequisite (Required Feature)</label>
                                <select 
                                    className="w-full border p-2 rounded text-sm" 
                                    value={form.prerequisite_feature_code || ''} 
                                    onChange={e=>setForm({...form, prerequisite_feature_code: e.target.value || null})}
                                >
                                    <option value="">-- None --</option>
                                    {Object.keys(FEATURE_CONFIG)
                                        .filter(k => k !== form.feature_code && FEATURE_CONFIG[k].type === 'boolean')
                                        .map(k => (
                                        <option key={k} value={k}>{FEATURE_CONFIG[k].label}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-gray-400">Example: User must have "Unlock Broadcast" before buying "Broadcast Quota".</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price (IDR)</label>
                                    <input type="number" className="w-full border p-2 rounded text-sm" value={form.price_monthly} onChange={e=>setForm({...form, price_monthly: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Duration (Days)</label>
                                    <input type="number" className="w-full border p-2 rounded text-sm" value={form.duration_days} onChange={e=>setForm({...form, duration_days: e.target.value})} />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                                <textarea className="w-full border p-2 rounded text-sm" value={form.description} onChange={e=>setForm({...form, description: e.target.value})} />
                            </div>
                            
                        </div>
            </Modal>
        </div>
    );
}

function Info(props) { return <AlertCircle {...props} />; }