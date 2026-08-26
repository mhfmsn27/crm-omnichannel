

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Upload, Layout, FileText, Plus, Trash2, HelpCircle, Star, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../../../config/api';
import { toast } from 'react-hot-toast';

// --- SECTIONS MANAGER ---
const SectionsManager = ({ sections, activeTab, onUpdate, onSave }) => {
    
    // Render Hero Editor
    if (activeTab === 'hero') {
        const hero = sections.hero || {};
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Headline</label>
                            <input className="w-full p-2 border rounded" value={hero.title || ''} onChange={e => onUpdate('hero', 'title', e.target.value)} placeholder="Main Title" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Sub-headline</label>
                            <textarea className="w-full p-2 border rounded h-24" value={hero.subtitle || ''} onChange={e => onUpdate('hero', 'subtitle', e.target.value)} placeholder="Subtitle..." />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">CTA Button Text</label>
                            <input className="w-full p-2 border rounded" value={hero.cta_text || ''} onChange={e => onUpdate('hero', 'cta_text', e.target.value)} placeholder="Start Free Trial" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">CTA Link</label>
                            <input className="w-full p-2 border rounded" value={hero.cta_link || '/register'} onChange={e => onUpdate('hero', 'cta_link', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Hero Image</label>
                        <ImageUploader 
                            currentUrl={hero.image_url} 
                            onUpload={(url) => onUpdate('hero', 'image_url', url)} 
                        />
                    </div>
                </div>
                <SaveButton onSave={() => onSave('hero')} />
            </div>
        );
    }

    // Render Features Editor
    if (activeTab === 'features') {
        const list = sections.features || [];
        const updateItem = (idx, field, val) => {
            const newList = [...list];
            newList[idx][field] = val;
            onUpdate('features', null, newList); // Special case: replace whole list
        };
        const addItem = () => {
            const newList = [...list, { title: "New Feature", desc: "", icon: "Zap" }];
            onUpdate('features', null, newList);
        };
        const removeItem = (idx) => {
            const newList = list.filter((_, i) => i !== idx);
            onUpdate('features', null, newList);
        };

        return (
            <div>
                <div className="space-y-4 mb-6">
                    {list.map((feat, idx) => (
                        <div key={idx} className="flex gap-4 items-start border p-4 rounded-lg bg-gray-50 relative group">
                            <div className="flex-1 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <input className="w-full p-2 border rounded text-sm font-bold" value={feat.title} onChange={e => updateItem(idx, 'title', e.target.value)} placeholder="Feature Title" />
                                    <input className="w-full p-2 border rounded text-sm font-mono" value={feat.icon} onChange={e => updateItem(idx, 'icon', e.target.value)} placeholder="Icon name (lucide)" />
                                </div>
                                <textarea className="w-full p-2 border rounded text-sm" value={feat.desc} onChange={e => updateItem(idx, 'desc', e.target.value)} placeholder="Description" />
                            </div>
                            <button onClick={() => removeItem(idx)} className="text-red-500 hover:bg-red-100 p-2 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>
                <div className="flex gap-4">
                    <button onClick={addItem} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-200"><Plus className="w-4 h-4" /> Add Feature</button>
                    <SaveButton onSave={() => onSave('features')} />
                </div>
            </div>
        );
    }

    // Render How It Works
    if (activeTab === 'how_it_works') {
        const list = sections.how_it_works || [];
        const updateItem = (idx, field, val) => {
            const newList = [...list];
            newList[idx][field] = val;
            onUpdate('how_it_works', null, newList);
        };
        const addItem = () => {
             const newList = [...list, { title: "New Step", desc: "", image_url: "" }];
             onUpdate('how_it_works', null, newList);
        };
        const removeItem = (idx) => {
            const newList = list.filter((_, i) => i !== idx);
            onUpdate('how_it_works', null, newList);
        };

        return (
            <div>
                 <div className="space-y-6 mb-6">
                    {list.map((item, idx) => (
                        <div key={idx} className="border p-4 rounded-lg bg-gray-50">
                            <div className="flex justify-between mb-2">
                                <span className="font-bold text-gray-500">Step {idx + 1}</span>
                                <button onClick={() => removeItem(idx)} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2 space-y-2">
                                     <input className="w-full p-2 border rounded text-sm font-bold" value={item.title} onChange={e => updateItem(idx, 'title', e.target.value)} placeholder="Step Title" />
                                     <textarea className="w-full p-2 border rounded text-sm" value={item.desc} onChange={e => updateItem(idx, 'desc', e.target.value)} placeholder="Description" />
                                </div>
                                <div>
                                     <label className="block text-xs font-bold text-gray-500 mb-1">Step Image</label>
                                     <ImageUploader 
                                        currentUrl={item.image_url} 
                                        onUpload={(url) => updateItem(idx, 'image_url', url)}
                                        height="h-32"
                                     />
                                </div>
                            </div>
                        </div>
                    ))}
                 </div>
                 <div className="flex gap-4">
                    <button onClick={addItem} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-200"><Plus className="w-4 h-4" /> Add Step</button>
                    <SaveButton onSave={() => onSave('how_it_works')} />
                </div>
            </div>
        );
    }

    // Pricing Text (Cards come from Plan DB, this edits the header/text)
    if (activeTab === 'pricing') {
        const pricing = sections.pricing || {};
        return (
             <div className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Section Title</label>
                    <input className="w-full p-2 border rounded" value={pricing.title || ''} onChange={e => onUpdate('pricing', 'title', e.target.value)} placeholder="Affordable Pricing" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Subtitle / Description</label>
                    <textarea className="w-full p-2 border rounded h-24" value={pricing.subtitle || ''} onChange={e => onUpdate('pricing', 'subtitle', e.target.value)} placeholder="Choose the plan that fits your needs." />
                </div>
                <div className="bg-yellow-50 p-4 rounded border border-yellow-200 text-sm text-yellow-800">
                    Note: The pricing cards and amounts are automatically fetched from your "Subscription Plans" configuration.
                </div>
                <SaveButton onSave={() => onSave('pricing')} />
             </div>
        );
    }

    // Testimonials
    if (activeTab === 'testimonials') {
        const list = sections.testimonials || [];
        const updateItem = (idx, field, val) => {
            const newList = [...list];
            newList[idx][field] = val;
            onUpdate('testimonials', null, newList);
        };
        const addItem = () => {
            const newList = [...list, { name: "User Name", role: "CEO", quote: "Great app!", avatar_url: "" }];
            onUpdate('testimonials', null, newList);
        };
        const removeItem = (idx) => {
            const newList = list.filter((_, i) => i !== idx);
            onUpdate('testimonials', null, newList);
        };

        return (
            <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {list.map((item, idx) => (
                        <div key={idx} className="border p-4 rounded-lg bg-gray-50 relative">
                            <button onClick={() => removeItem(idx)} className="absolute top-2 right-2 text-red-500"><Trash2 className="w-4 h-4" /></button>
                            <div className="flex gap-4">
                                <div className="w-16">
                                     <ImageUploader 
                                        currentUrl={item.avatar_url} 
                                        onUpload={(url) => updateItem(idx, 'avatar_url', url)}
                                        height="h-16"
                                        isAvatar
                                     />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <input className="w-full p-1 border rounded text-sm font-bold" value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)} placeholder="Name" />
                                    <input className="w-full p-1 border rounded text-xs" value={item.role} onChange={e => updateItem(idx, 'role', e.target.value)} placeholder="Role/Company" />
                                    <textarea className="w-full p-1 border rounded text-sm" value={item.quote} onChange={e => updateItem(idx, 'quote', e.target.value)} placeholder="Quote..." />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex gap-4">
                    <button onClick={addItem} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-200"><Plus className="w-4 h-4" /> Add Testimonial</button>
                    <SaveButton onSave={() => onSave('testimonials')} />
                </div>
            </div>
        );
    }

    // FAQ
    if (activeTab === 'faq') {
        const list = sections.faq || [];
        const updateItem = (idx, field, val) => {
            const newList = [...list];
            newList[idx][field] = val;
            onUpdate('faq', null, newList);
        };
        const addItem = () => {
            const newList = [...list, { q: "Question?", a: "Answer." }];
            onUpdate('faq', null, newList);
        };
        const removeItem = (idx) => {
            const newList = list.filter((_, i) => i !== idx);
            onUpdate('faq', null, newList);
        };

        return (
            <div>
                <div className="space-y-4 mb-6">
                    {list.map((item, idx) => (
                        <div key={idx} className="flex gap-4 items-start border p-4 rounded-lg bg-gray-50">
                            <div className="flex-1 space-y-2">
                                <input className="w-full p-2 border rounded text-sm font-bold" value={item.q} onChange={e => updateItem(idx, 'q', e.target.value)} placeholder="Question" />
                                <textarea className="w-full p-2 border rounded text-sm" value={item.a} onChange={e => updateItem(idx, 'a', e.target.value)} placeholder="Answer" />
                            </div>
                            <button onClick={() => removeItem(idx)} className="text-red-500 hover:bg-red-100 p-2 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>
                <div className="flex gap-4">
                    <button onClick={addItem} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-200"><Plus className="w-4 h-4" /> Add FAQ</button>
                    <SaveButton onSave={() => onSave('faq')} />
                </div>
            </div>
        );
    }

    return null;
};

// --- REUSABLE COMPONENTS ---

const SaveButton = ({ onSave }) => (
    <button onClick={onSave} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-sm transition-all">
        <Save className="w-4 h-4" /> Save Changes
    </button>
);

const ImageUploader = ({ currentUrl, onUpload, height = "h-40", isAvatar = false }) => {
    const handleFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await axios.post('/api/sa/cms/landing/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onUpload(res.data.url);
        } catch (err) {
            alert("Upload failed");
        }
    };

    return (
        <div className={`border-2 border-dashed border-gray-300 rounded-lg p-2 text-center hover:bg-gray-50 relative flex items-center justify-center ${height} ${isAvatar ? 'w-16 rounded-full' : 'w-full'}`}>
            {currentUrl ? (
                <img src={getApiUrl(currentUrl)} className={`w-full h-full object-cover ${isAvatar ? 'rounded-full' : 'rounded'}`} alt="Preview" />
            ) : (
                <div className="text-gray-400 text-xs">Upload</div>
            )}
            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFile} accept="image/*" />
        </div>
    );
};

// --- MAIN COMPONENT ---

export default function LandingPageEditor() {
    const [sections, setSections] = useState({});
    const [activeTab, setActiveTab] = useState('hero');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchSections();
    }, []);

    const fetchSections = async () => {
        try {
            const res = await axios.get('/api/sa/cms/landing');
            const data = {};
            res.data.forEach(s => {
                data[s.section_key] = s.content;
            });
            // Initialize empty arrays if missing to avoid crashes
            if (!data.features) data.features = [];
            if (!data.how_it_works) data.how_it_works = [];
            if (!data.testimonials) data.testimonials = [];
            if (!data.faq) data.faq = [];
            
            setSections(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Generic update handler. If val is provided, it replaces the whole section content (for arrays).
    // If field is provided, it updates a key within the object.
    const handleUpdate = (sectionKey, field, val) => {
        setSections(prev => {
            if (field === null) {
                // Replace entire content (e.g. array of features)
                return { ...prev, [sectionKey]: val };
            }
            return {
                ...prev,
                [sectionKey]: {
                    ...prev[sectionKey],
                    [field]: val
                }
            };
        });
    };

    const handleSave = async (sectionKey) => {
        try {
            await axios.put(`/api/sa/cms/landing/${sectionKey}`, {
                content: sections[sectionKey]
            });
            toast.success(`${sectionKey.toUpperCase()} section updated!`);
        } catch (err) {
            toast.error("Failed to save");
        }
    };

    if (loading) return <div className="p-8">Loading CMS...</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Layout className="w-8 h-8 text-indigo-600" /> Landing Page CMS
                </h1>
                <button 
                    onClick={() => navigate('/admin/cms/pages')}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                >
                    <FileText className="w-4 h-4" /> Manage Static Pages
                </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* TABS */}
                <div className="flex border-b border-gray-200 overflow-x-auto">
                    {['hero', 'features', 'how_it_works', 'pricing', 'testimonials', 'faq'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-4 text-sm font-bold uppercase border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? 'border-indigo-600 text-indigo-600 bg-indigo-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                        >
                            {tab.replace(/_/g, ' ')}
                        </button>
                    ))}
                </div>

                {/* EDITOR CONTENT */}
                <div className="p-6">
                    <SectionsManager 
                        sections={sections} 
                        activeTab={activeTab} 
                        onUpdate={handleUpdate} 
                        onSave={handleSave} 
                    />
                </div>
            </div>
        </div>
    );
}
