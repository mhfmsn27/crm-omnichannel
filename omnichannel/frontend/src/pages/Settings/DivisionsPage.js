import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Building2, Plus, Edit, Trash2, Save, X, Users, Shield, ChevronDown, ChevronRight } from 'lucide-react';
import Modal, { ModalFooter } from '../../components/common/Modal';
import Button from '../../components/common/Button';

const DivisionsPage = () => {
    const [divisions, setDivisions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDivision, setEditingDivision] = useState(null);
    const [form, setForm] = useState({ name: '', description: '', supervisor_id: '' });
    const [saving, setSaving] = useState(false);
    const [teamMembers, setTeamMembers] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [divRes, teamRes] = await Promise.all([
                axios.get('/api/app/divisions'),
                axios.get('/api/app/team')
            ]);
            setDivisions(divRes.data);
            setTeamMembers(teamRes.data);
        } catch (err) {
            toast.error('Failed to load divisions');
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setForm({ name: '', description: '', supervisor_id: '' });
        setEditingDivision(null);
        setIsModalOpen(true);
    };

    const openEdit = (division) => {
        setForm({
            name: division.name,
            description: division.description || '',
            supervisor_id: division.supervisor_id || ''
        });
        setEditingDivision(division);
        setIsModalOpen(true);
    };

    const handleDelete = async (division) => {
        if (!window.confirm(`Delete division "${division.name}"? Staff in this division will need reassignment.`)) return;
        try {
            await axios.delete(`/api/app/divisions/${division.id}`);
            toast.success('Division deleted');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete division');
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim().toUpperCase(),
                description: form.description || null,
                supervisor_id: form.supervisor_id || null
            };

            if (editingDivision) {
                await axios.put(`/api/app/divisions/${editingDivision.id}`, payload);
                toast.success('Division updated');
            } else {
                await axios.post('/api/app/divisions', payload);
                toast.success('Division created');
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save division');
        } finally {
            setSaving(false);
        }
    };

    // Get available supervisors (users with role_level >= 10)
    const availableSupervisors = teamMembers.filter(m => m.role_level >= 10);

    if (loading) {
        return <div className="p-8 text-center text-gray-400">Loading divisions...</div>;
    }

    return (
        <div className="p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-indigo-600" /> Division Management
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Organize your team into divisions. Each division needs a supervisor to manage staff members.
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-sm text-sm"
                >
                    <Plus className="w-4 h-4" /> Add Division
                </button>
            </div>

            {/* Info Box */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                <strong>How it works:</strong> Divisions help organize agents by team or function (e.g., Sales, Support, Billing).
                Each division must have a supervisor who can manage staff members assigned to that division.
            </div>

            {/* Divisions List */}
            {divisions.length === 0 ? (
                <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
                    <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No divisions yet</p>
                    <p className="text-sm mt-1">Create your first division to organize your team.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {divisions.map(division => (
                        <div key={division.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-200 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-bold text-lg text-gray-900">{division.name}</h3>
                                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                                            {division.staff_count || 0} Staff
                                        </span>
                                    </div>
                                    {division.description && (
                                        <p className="text-sm text-gray-500 mb-2">{division.description}</p>
                                    )}
                                    {division.supervisor_name && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Shield className="w-4 h-4 text-purple-500" />
                                            <span>Supervisor: <strong>{division.supervisor_name}</strong></span>
                                        </div>
                                    )}
                                    {!division.supervisor_name && (
                                        <div className="flex items-center gap-2 text-sm text-red-500">
                                            <Shield className="w-4 h-4" />
                                            <span>No supervisor assigned</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                    <button
                                        onClick={() => openEdit(division)}
                                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                        title="Edit"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(division)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingDivision ? 'Edit Division' : 'Create Division'}
                size="md"
                footer={
                    <ModalFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving} icon={<Save className="w-4 h-4"/>}>
                            {saving ? 'Saving...' : (editingDivision ? 'Save Changes' : 'Create')}
                        </Button>
                    </ModalFooter>
                }
            >
                <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                    Division Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value.toUpperCase() })}
                                    placeholder="e.g. SALES, SUPPORT, BILLING"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                    Description
                                </label>
                                <textarea
                                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    placeholder="Optional description"
                                    rows={2}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                    Supervisor
                                </label>
                                <select
                                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                    value={form.supervisor_id}
                                    onChange={e => setForm({ ...form, supervisor_id: e.target.value })}
                                >
                                    <option value="">-- Select Supervisor --</option>
                                    {availableSupervisors.map(sup => (
                                        <option key={sup.id} value={sup.id}>
                                            {sup.name} (Level {sup.role_level})
                                        </option>
                                    ))}
                                </select>
                                {availableSupervisors.length === 0 && (
                                    <p className="text-xs text-orange-500 mt-1">
                                        No supervisors available. Create a supervisor first in Team Settings.
                                    </p>
                                )}
                            </div>

                        </form>
            </Modal>
        </div>
    );
};

export default DivisionsPage;
