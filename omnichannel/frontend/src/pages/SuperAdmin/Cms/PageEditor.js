import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Eye, Plus, Trash2, Youtube, FileText, List } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// --- TUTORIAL BUILDER COMPONENT ---
const TutorialBuilder = ({ value, onChange }) => {
    const [data, setData] = useState({
        video_url: '',
        items: []
    });

    useEffect(() => {
        try {
            // If value is an object (already parsed), use it directly.
            // If it's a string, try to parse it.
            // If null/undefined/empty string, use default.
            if (value && typeof value === 'object') {
                setData({
                    video_url: value.video_url || '',
                    items: value.items || []
                });
            } else if (typeof value === 'string' && value.trim() !== '') {
                const parsed = JSON.parse(value);
                if (parsed && typeof parsed === 'object') {
                    setData({
                        video_url: parsed.video_url || '',
                        items: parsed.items || []
                    });
                }
            } else {
                // Initialize empty for new page
                setData({ video_url: '', items: [] });
            }
        } catch (e) {
            console.warn("Failed to parse tutorial content:", e);
             // Fallback for empty or malformed JSON
             setData({ video_url: '', items: [] });
        }
    }, [value]);

    const updateData = (newData) => {
        setData(newData);
        // Pass STRINGIFIED JSON back to parent form state
        onChange(JSON.stringify(newData));
    };

    const handleAddItem = () => {
        const newItems = [...data.items, { title: '', body: '' }];
        updateData({ ...data, items: newItems });
    };

    const handleRemoveItem = (idx) => {
        const newItems = data.items.filter((_, i) => i !== idx);
        updateData({ ...data, items: newItems });
    };

    const handleChangeItem = (idx, field, val) => {
        const newItems = [...data.items];
        newItems[idx][field] = val;
        updateData({ ...data, items: newItems });
    };

    return (
        <div className="space-y-6 bg-gray-50 p-6 rounded-xl border border-gray-200">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">YouTube Video URL (Embed)</label>
                <div className="flex gap-2">
                    <div className="p-2 bg-white border rounded-l-lg text-gray-400"><Youtube className="w-5 h-5" /></div>
                    <input 
                        className="flex-1 p-2 border rounded-r-lg text-sm"
                        placeholder="https://www.youtube.com/embed/..."
                        value={data.video_url}
                        onChange={e => updateData({...data, video_url: e.target.value})}
                    />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Use the embed URL (e.g. https://www.youtube.com/embed/VIDEO_ID)</p>
            </div>

            <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase">Tutorial Steps (Accordion)</label>
                    <button type="button" onClick={handleAddItem} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold flex items-center gap-1 hover:bg-indigo-200">
                        <Plus className="w-3 h-3" /> Add Step
                    </button>
                </div>
                
                <div className="space-y-3">
                    {data.items.map((item, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex justify-between mb-2">
                                <span className="text-xs font-bold text-gray-400">Step {idx + 1}</span>
                                <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                            </div>
                            <input 
                                className="w-full p-2 border rounded mb-2 text-sm font-medium"
                                placeholder="Step Title (e.g. Create Account)"
                                value={item.title}
                                onChange={e => handleChangeItem(idx, 'title', e.target.value)}
                            />
                            <textarea 
                                className="w-full p-2 border rounded text-sm h-20"
                                placeholder="Description..."
                                value={item.body}
                                onChange={e => handleChangeItem(idx, 'body', e.target.value)}
                            />
                        </div>
                    ))}
                    {data.items.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No steps added.</p>}
                </div>
            </div>
        </div>
    );
};

export default function PageEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        content: '',
        meta_description: '',
        is_published: false,
        page_type: 'static', // static, tutorial
        target_menu: ''      // broadcast, inbox, etc.
    });

    useEffect(() => {
        if (id) fetchPage();
    }, [id]);

    const fetchPage = async () => {
        try {
            const res = await axios.get(`/api/sa/cms/pages/${id}`);
            // IMPORTANT: If type is 'tutorial', 'content' from DB is a JSON string.
            // We don't need to parse it here if TutorialBuilder handles parsing, 
            // but TutorialBuilder expects 'value' prop to be string or object. 
            // Passing raw string from DB is fine for TutorialBuilder's useEffect.
            
            setFormData({
                ...res.data,
                page_type: res.data.page_type || 'static',
                target_menu: res.data.target_menu || ''
            });
        } catch (err) {
            alert("Failed to load page");
            navigate('/admin/cms/pages');
        }
    };

    const handleSlugGen = () => {
        if (formData.page_type === 'tutorial' && formData.target_menu) {
            setFormData(prev => ({ ...prev, slug: `tutorial-${prev.target_menu}` }));
            return;
        }

        if (!formData.slug && formData.title) {
            const slug = formData.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
            setFormData(prev => ({ ...prev, slug }));
        }
    };

    useEffect(() => {
        if (formData.page_type === 'tutorial' && formData.target_menu) {
            setFormData(prev => ({ ...prev, slug: `tutorial-${prev.target_menu}` }));
        }
    }, [formData.page_type, formData.target_menu]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // If tutorial, ensure content is valid JSON string (it is set by TutorialBuilder onChange)
            // If static, it's HTML string from Quill.
            
            if (id) {
                await axios.put(`/api/sa/cms/pages/${id}`, formData);
            } else {
                await axios.post('/api/sa/cms/pages', formData);
            }
            navigate('/admin/cms/pages');
        } catch (err) {
            alert("Error saving page: " + err.response?.data?.error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <button onClick={() => navigate('/admin/cms/pages')} className="flex items-center text-gray-500 hover:text-gray-800 mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
            </button>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h1 className="text-xl font-bold text-gray-900">{id ? 'Edit Page' : 'New Page'}</h1>
                    <div className="flex items-center gap-2">
                        {id && (
                            <a href={`/p/${formData.slug}`} target="_blank" rel="noreferrer" className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium flex items-center gap-2">
                                <Eye className="w-4 h-4" /> Preview
                            </a>
                        )}
                        <button onClick={handleSubmit} disabled={loading} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2">
                            <Save className="w-4 h-4" /> {loading ? 'Saving...' : 'Save Page'}
                        </button>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    
                    {/* PAGE TYPE SELECTOR */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Page Type</label>
                            <div className="flex gap-4">
                                <label className={`flex-1 p-4 border rounded-lg cursor-pointer flex items-center gap-3 transition-all ${formData.page_type === 'static' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'hover:bg-gray-50'}`}>
                                    <input type="radio" className="hidden" checked={formData.page_type === 'static'} onChange={() => setFormData({...formData, page_type: 'static'})} />
                                    <FileText className="w-5 h-5" />
                                    <span className="font-bold">Static Page</span>
                                </label>
                                <label className={`flex-1 p-4 border rounded-lg cursor-pointer flex items-center gap-3 transition-all ${formData.page_type === 'tutorial' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'hover:bg-gray-50'}`}>
                                    <input type="radio" className="hidden" checked={formData.page_type === 'tutorial'} onChange={() => setFormData({...formData, page_type: 'tutorial'})} />
                                    <List className="w-5 h-5" />
                                    <span className="font-bold">Tutorial Page</span>
                                </label>
                            </div>
                        </div>

                        {formData.page_type === 'tutorial' && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Target Menu</label>
                                <select 
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                                    value={formData.target_menu}
                                    onChange={e => setFormData({...formData, target_menu: e.target.value})}
                                >
                                    <option value="">-- Select Menu --</option>
                                    <option value="broadcast">Broadcast</option>
                                    <option value="inbox">Inbox</option>
                                    <option value="chatbot">Chatbot AI</option>
                                    <option value="contacts">Contacts</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Slug will be auto-set to <code>tutorial-{formData.target_menu || 'menu'}</code></p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Page Title</label>
                            <input 
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                onBlur={handleSlugGen}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">URL Slug</label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-xs">
                                    /p/
                                </span>
                                <input 
                                    className="flex-1 p-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-indigo-500 bg-gray-100"
                                    value={formData.slug}
                                    readOnly={formData.page_type === 'tutorial'}
                                    onChange={e => setFormData({...formData, slug: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Content</label>
                        
                        {formData.page_type === 'static' ? (
                            <div className="h-80 mb-12">
                                <ReactQuill 
                                    theme="snow" 
                                    value={formData.content} 
                                    onChange={val => setFormData({...formData, content: val})} 
                                    className="h-full"
                                />
                            </div>
                        ) : (
                            <TutorialBuilder 
                                // IMPORTANT: Ensure content is passed correctly
                                value={formData.content} 
                                onChange={val => setFormData({...formData, content: val})} 
                            />
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                         <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Meta Description (SEO)</label>
                            <textarea 
                                className="w-full p-2 border border-gray-300 rounded-lg h-24 text-sm"
                                value={formData.meta_description}
                                onChange={e => setFormData({...formData, meta_description: e.target.value})}
                            />
                         </div>
                         <div className="flex flex-col justify-center">
                            <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                    checked={formData.is_published}
                                    onChange={e => setFormData({...formData, is_published: e.target.checked})}
                                />
                                <span className="ml-3 font-medium text-gray-900">Publish this page</span>
                            </label>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
}