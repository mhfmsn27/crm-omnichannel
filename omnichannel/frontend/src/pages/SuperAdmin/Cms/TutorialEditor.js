import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Plus, Trash2, Youtube, List, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

// --- COMPONENT: Steps Builder ---
const TutorialStepsBuilder = ({ value, onChange }) => {
    const [data, setData] = useState({
        video_urls: [],
        items: []
    });

    useEffect(() => {
        try {
            let parsed = { video_urls: [], items: [] };
            if (value && typeof value === 'string') {
                parsed = JSON.parse(value);
            } else if (value && typeof value === 'object') {
                parsed = value;
            }

            // Migration: If legacy video_url exists, move to video_urls
            if (parsed.video_url && (!parsed.video_urls || parsed.video_urls.length === 0)) {
                parsed.video_urls = [parsed.video_url];
            }
            // Ensure video_urls is array
            if (!parsed.video_urls) parsed.video_urls = [];
            // Ensure items is array
            if (!parsed.items) parsed.items = [];

            setData(parsed);
        } catch (e) {
            setData({ video_urls: [], items: [] });
        }
    }, [value]);

    const updateData = (newData) => {
        setData(newData);
        onChange(JSON.stringify(newData));
    };

    const addVideo = () => updateData({ ...data, video_urls: [...data.video_urls, ''] });
    const removeVideo = (i) => updateData({ ...data, video_urls: data.video_urls.filter((_, idx) => idx !== i) });
    const changeVideo = (i, val) => {
        const newUrls = [...data.video_urls];
        newUrls[i] = val;
        updateData({ ...data, video_urls: newUrls });
    };

    const addItem = () => updateData({ ...data, items: [...data.items, { title: '', body: '' }] });
    const removeItem = (i) => updateData({ ...data, items: data.items.filter((_, idx) => idx !== i) });
    const changeItem = (i, field, val) => {
        const newItems = [...data.items];
        newItems[i][field] = val;
        updateData({ ...data, items: newItems });
    };

    return (
        <div className="space-y-6 bg-gray-50 p-6 rounded-xl border border-gray-200">
            <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase">YouTube Videos (Embed URL)</label>
                    <button type="button" onClick={addVideo} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-red-100 transition-colors">
                        <Plus className="w-3 h-3" /> Add Video
                    </button>
                </div>

                <div className="space-y-2">
                    {data.video_urls.map((url, idx) => (
                        <div key={idx} className="flex gap-2">
                            <div className="p-2 bg-white border rounded-l-lg text-red-500"><Youtube className="w-5 h-5" /></div>
                            <input
                                className="flex-1 p-2 border-t border-b border-gray-200 text-sm outline-none focus:ring-2 focus:ring-red-500"
                                placeholder="https://www.youtube.com/embed/VIDEO_ID"
                                value={url}
                                onChange={e => changeVideo(idx, e.target.value)}
                            />
                            <button type="button" onClick={() => removeVideo(idx)} className="p-2 bg-white border rounded-r-lg text-gray-400 hover:text-red-500">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {data.video_urls.length === 0 && <div className="text-xs text-gray-400 italic">No videos added.</div>}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Right click video on YouTube &gt; Copy Embed Code &gt; Extract src URL.</p>
            </div>

            <div>
                <div className="flex justify-between items-center mb-3">
                    <label className="block text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><List className="w-4 h-4" /> Steps (Accordion)</label>
                    <button type="button" onClick={addItem} className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-indigo-200 transition-colors">
                        <Plus className="w-3 h-3" /> Add Step
                    </button>
                </div>

                <div className="space-y-4">
                    {data.items.map((item, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm relative group">
                            <button type="button" onClick={() => removeItem(idx)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 p-1 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                            <div className="flex items-center gap-3 mb-3">
                                <span className="bg-indigo-100 text-indigo-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</span>
                                <input
                                    className="w-full p-2 border-b border-transparent hover:border-gray-300 focus:border-indigo-500 outline-none font-bold text-sm transition-colors"
                                    placeholder="Step Title (e.g. Create Account)"
                                    value={item.title}
                                    onChange={e => changeItem(idx, 'title', e.target.value)}
                                />
                            </div>
                            <textarea
                                className="w-full p-3 border rounded-lg text-sm h-24 resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Step Description..."
                                value={item.body}
                                onChange={e => changeItem(idx, 'body', e.target.value)}
                            />
                        </div>
                    ))}
                    {data.items.length === 0 && <div className="text-center py-6 text-gray-400 text-sm bg-white border border-dashed rounded-lg">No steps added yet.</div>}
                </div>
            </div>
        </div>
    );
};

export default function TutorialEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        title: '',
        slug: '',
        content: '',
        meta_description: '',
        is_published: true,
        page_type: 'tutorial',
        target_menu: ''
    });

    useEffect(() => {
        if (id) fetchPage();
    }, [id]);

    // Auto-generate slug based on target menu
    useEffect(() => {
        if (form.target_menu) {
            setForm(prev => ({ ...prev, slug: `tutorial-${prev.target_menu}` }));
        }
    }, [form.target_menu]);

    const fetchPage = async () => {
        try {
            const res = await axios.get(`/api/sa/cms/pages/${id}`);
            setForm({ ...res.data, page_type: 'tutorial' });
        } catch (err) {
            toast.error("Failed to load page");
            navigate('/admin/cms/tutorials');
        }
    };

    const handleSubmit = async () => {
        if (!form.title || !form.target_menu) return toast.error("Title and Target Menu are required");

        setLoading(true);
        try {
            if (id) {
                await axios.put(`/api/sa/cms/pages/${id}`, form);
                toast.success("Tutorial Updated");
            } else {
                await axios.post('/api/sa/cms/pages', form);
                toast.success("Tutorial Created");
            }
            navigate('/admin/cms/tutorials');
        } catch (err) {
            toast.error("Save Failed: " + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <button onClick={() => navigate('/admin/cms/tutorials')} className="flex items-center text-gray-500 hover:text-gray-800 mb-6 font-medium">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
            </button>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h1 className="text-xl font-bold text-gray-900">{id ? 'Edit Tutorial' : 'New Tutorial'}</h1>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="w-4 h-4 text-indigo-600 rounded mr-2"
                                checked={form.is_published}
                                onChange={e => setForm({ ...form, is_published: e.target.checked })}
                            />
                            <span className="text-sm font-medium text-gray-700">Publish</span>
                        </label>
                        <button onClick={handleSubmit} disabled={loading} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-70">
                            <Save className="w-4 h-4" /> Save
                        </button>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Tutorial Title</label>
                            <input
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g. How to use Broadcast"
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Target Menu (Context)</label>
                            <select
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                value={form.target_menu}
                                onChange={e => setForm({ ...form, target_menu: e.target.value })}
                            >
                                <option value="">-- Select Menu --</option>
                                <option value="broadcast">Broadcast</option>
                                <option value="chatbot">Chatbot AI</option>
                                <option value="inbox">Inbox</option>
                                <option value="contacts">Contacts</option>
                                <option value="tools">Tools</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Description (Subtitle)</label>
                        <input
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={form.meta_description}
                            onChange={e => setForm({ ...form, meta_description: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Content Builder</label>
                        <TutorialStepsBuilder value={form.content} onChange={val => setForm({ ...form, content: val })} />
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-sm text-yellow-800 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        <p>The slug will be automatically set to <code>tutorial-{form.target_menu || '...'}</code> to match the app's routing convention.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}