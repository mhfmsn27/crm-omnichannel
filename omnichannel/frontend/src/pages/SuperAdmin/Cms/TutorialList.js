import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, PlayCircle, ExternalLink } from 'lucide-react';

export default function TutorialList() {
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPages();
    }, []);

    const fetchPages = async () => {
        setLoading(true);
        try {
            // Filter pages where page_type = 'tutorial'
            const res = await axios.get('/api/sa/cms/pages');
            const tutorials = res.data.filter(p => p.page_type === 'tutorial');
            setPages(tutorials);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if(!confirm("Delete this tutorial?")) return;
        try {
            await axios.delete(`/api/sa/cms/pages/${id}`);
            fetchPages();
        } catch (err) {
            alert("Failed to delete");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <PlayCircle className="w-8 h-8 text-indigo-600" /> Tutorials
                    </h1>
                    <p className="text-gray-500 text-sm">Manage help content displayed in the member dashboard.</p>
                </div>
                <Link to="/admin/cms/tutorials/create" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-bold shadow-sm">
                    <Plus className="w-4 h-4" /> Add Tutorial
                </Link>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">Title</th>
                            <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">Target Menu</th>
                            <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">Slug</th>
                            <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs text-center">Status</th>
                            <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {pages.map(page => (
                            <tr key={page.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-bold text-gray-900">{page.title}</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-mono uppercase border border-indigo-100">
                                        {page.target_menu || 'General'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-500 font-mono text-xs">{page.slug}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${page.is_published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {page.is_published ? 'Live' : 'Draft'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    <a href={`/p/${page.slug}`} target="_blank" rel="noreferrer" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                    <Link to={`/admin/cms/tutorials/${page.id}`} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                                        <Edit className="w-4 h-4" />
                                    </Link>
                                    <button onClick={() => handleDelete(page.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {pages.length === 0 && (
                            <tr><td colSpan="5" className="p-12 text-center text-gray-400">No tutorials found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}