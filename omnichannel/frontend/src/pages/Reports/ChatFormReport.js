import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    FileText, Users, Download, Search, ChevronRight, ArrowLeft, 
    Calendar, CheckCircle, XCircle, Eye, FileSpreadsheet, Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { getApiUrl } from '../../config/api';

// --- COMPONENTS ---

const StatCard = ({ title, value, icon: Icon, color, subValue }) => (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
            <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
            <h3 className="text-2xl font-extrabold text-gray-900">{value}</h3>
            {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="w-6 h-6 text-white" />
        </div>
    </div>
);

const SubmissionDetailView = ({ form, onBack }) => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchSubmissions();
    }, [form]);

    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/app/forms/${form.id}/submissions`);
            setSubmissions(res.data);
        } catch (err) {
            toast.error("Gagal memuat data submissions");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        const toastId = toast.loading("Downloading Excel...");
        try {
             const res = await axios.get(`/api/app/forms/${form.id}/export`, { responseType: 'blob' });
             const url = window.URL.createObjectURL(new Blob([res.data]));
             const link = document.createElement('a');
             link.href = url;
             link.setAttribute('download', `${form.name}-submissions.xlsx`);
             document.body.appendChild(link);
             link.click();
             toast.success("Download complete!", { id: toastId });
        } catch (e) { 
            toast.error("Export failed", { id: toastId }); 
        }
    };

    // Helper to get dynamic headers from first submission (if available)
    // Logic: Merge keys from top 5 submissions to guess columns
    const getDynamicHeaders = () => {
        const keys = new Set();
        submissions.slice(0, 5).forEach(s => {
            if (s.data) Object.keys(s.data).forEach(k => !k.startsWith('_') && keys.add(k));
        });
        return Array.from(keys);
    };

    const dynamicHeaders = getDynamicHeaders();

    const filteredSubmissions = submissions.filter(s => 
        s.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.phone_number?.includes(search)
    );

    return (
        <div className="animate-in slide-in-from-right-4 duration-300">
            {/* Header Detail */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-600" /> {form.name}
                        </h2>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                            <span className="bg-gray-100 px-2 py-0.5 rounded font-mono text-xs">Keyword: {form.trigger_keyword}</span>
                            <span>•</span>
                            <span>{submissions.length} Total Entries</span>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={handleExport}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 transition-colors shadow-sm"
                >
                    <FileSpreadsheet className="w-4 h-4" /> Export Excel
                </button>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-t-xl border border-gray-200 border-b-0 flex justify-between items-center">
                <div className="relative w-72">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input 
                        className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Search contact or phone..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white border border-gray-200 rounded-b-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-4 font-bold text-gray-600">Date</th>
                                <th className="px-6 py-4 font-bold text-gray-600">Contact</th>
                                {/* Dynamic Columns from Form Data */}
                                {dynamicHeaders.map(header => (
                                    <th key={header} className="px-6 py-4 font-bold text-gray-600">{header}</th>
                                ))}
                                <th className="px-6 py-4 font-bold text-gray-600 text-right">PDF</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={dynamicHeaders.length + 3} className="p-8 text-center text-gray-500">Loading data...</td></tr>
                            ) : filteredSubmissions.map((sub) => (
                                <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-gray-500">
                                        {format(new Date(sub.created_at), 'dd MMM yyyy HH:mm')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-gray-900">{sub.contact_name}</p>
                                        <p className="text-xs text-gray-500 font-mono">{sub.phone_number}</p>
                                    </td>
                                    {/* Dynamic Data Cells */}
                                    {dynamicHeaders.map(header => (
                                        <td key={header} className="px-6 py-4 text-gray-700 max-w-xs truncate">
                                            {sub.data ? sub.data[header] || '-' : '-'}
                                        </td>
                                    ))}
                                    <td className="px-6 py-4 text-right">
                                        {sub.generated_pdf_url ? (
                                            <a 
                                                href={getApiUrl(sub.generated_pdf_url)} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="text-red-600 hover:text-red-800 font-bold text-xs inline-flex items-center gap-1"
                                            >
                                                <Download className="w-3 h-3" /> PDF
                                            </a>
                                        ) : <span className="text-gray-300">-</span>}
                                    </td>
                                </tr>
                            ))}
                            {!loading && filteredSubmissions.length === 0 && (
                                <tr><td colSpan={dynamicHeaders.length + 3} className="p-8 text-center text-gray-400">No submissions found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default function ChatFormReport() {
    const [forms, setForms] = useState([]);
    const [selectedForm, setSelectedForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        fetchForms();
    }, []);

    const fetchForms = async () => {
        try {
            const res = await axios.get('/api/app/forms');
            setForms(res.data);
        } catch (err) {
            toast.error("Failed to load forms");
        } finally {
            setLoading(false);
        }
    };

    // Stats Calculation
    const totalForms = forms.length;
    const activeForms = forms.filter(f => f.is_active).length;
    const totalSubmissions = forms.reduce((acc, curr) => acc + parseInt(curr.submission_count || 0), 0);

    const filteredForms = forms.filter(f => 
        (filterStatus === 'all' || (filterStatus === 'active' ? f.is_active : !f.is_active)) &&
        (f.name.toLowerCase().includes(search.toLowerCase()) || f.trigger_keyword.toLowerCase().includes(search.toLowerCase()))
    );

    // If a form is selected, show Detail View
    if (selectedForm) {
        return <SubmissionDetailView form={selectedForm} onBack={() => setSelectedForm(null)} />;
    }

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto custom-scrollbar">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Laporan Chat Form</h2>

            {/* 1. Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard 
                    title="Total Submissions" 
                    value={totalSubmissions.toLocaleString()} 
                    subValue="All time data collected"
                    icon={Users} 
                    color="bg-blue-500" 
                />
                <StatCard 
                    title="Active Forms" 
                    value={activeForms} 
                    subValue={`${totalForms} Total Forms Created`}
                    icon={CheckCircle} 
                    color="bg-green-500" 
                />
                <StatCard 
                    title="Avg Conversion" 
                    value={totalForms > 0 ? Math.round(totalSubmissions / totalForms) : 0} 
                    subValue="Submissions per form"
                    icon={Filter} 
                    color="bg-purple-500" 
                />
            </div>

            {/* 2. Main List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                {/* Toolbar */}
                <div className="p-5 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input 
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Search form name or keyword..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <select 
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none"
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white border-b border-gray-100 text-gray-500 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4 font-bold">Form Name</th>
                                <th className="px-6 py-4 font-bold">Trigger Keyword</th>
                                <th className="px-6 py-4 font-bold text-center">Status</th>
                                <th className="px-6 py-4 font-bold text-center">Submissions</th>
                                <th className="px-6 py-4 font-bold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan="5" className="p-8 text-center text-gray-400">Loading forms...</td></tr>
                            ) : filteredForms.map(form => (
                                <tr key={form.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{form.name}</p>
                                                <p className="text-xs text-gray-500">Created: {new Date(form.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200">
                                            {form.trigger_keyword}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {form.is_active ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                <CheckCircle className="w-3 h-3" /> Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                                                <XCircle className="w-3 h-3" /> Inactive
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="font-bold text-gray-900 text-base">{form.submission_count}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => setSelectedForm(form)}
                                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors inline-flex items-center gap-2 shadow-sm"
                                        >
                                            <Eye className="w-3 h-3" /> View Data
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {!loading && filteredForms.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                            <FileText className="w-12 h-12 mb-2 opacity-20" />
                                            <p>No forms found matching your filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}