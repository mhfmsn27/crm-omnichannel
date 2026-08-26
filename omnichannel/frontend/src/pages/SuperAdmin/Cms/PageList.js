
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Globe, ExternalLink } from 'lucide-react';

export default function PageList() {
    const [pages, setPages] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchPages();
    }, []);

    const fetchPages = async () => {
        try {
            const res = await axios.get('/api/sa/cms/pages');
            setPages(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if(!confirm("Delete this page?")) return;
        try {
            await axios.delete(`/api/sa/cms/pages/${id}`);
            fetchPages();
        } catch (err) {
            alert("Failed to delete");
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Globe className="w-8 h-8 text-indigo-600" /> Static Pages
                    </h1>
                    <p className="text-gray-500">Manage content for Privacy Policy, Terms, etc.</p>
                </div>
                <Link to="/admin/cms/pages/create" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-bold">
                    <Plus className="w-4 h-4" /> Create Page
                </Link>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Title</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Slug</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {pages.map(page => (
                            <tr key={page.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">{page.title}</td>
                                <td className="px-6 py-4 text-gray-500 text-sm">{page.slug}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${page.is_published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {page.is_published ? 'Published' : 'Draft'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    <a href={`/p/${page.slug}`} target="_blank" rel="noreferrer" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="View Live">
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                    <Link to={`/admin/cms/pages/${page.id}`} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Edit">
                                        <Edit className="w-4 h-4" />
                                    </Link>
                                    <button onClick={() => handleDelete(page.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {pages.length === 0 && (
                            <tr><td colSpan="4" className="p-8 text-center text-gray-400">No pages found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
