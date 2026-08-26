import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
    Sparkles, ShoppingBag, Stethoscope, Building2,
    GraduationCap, Briefcase, UtensilsCrossed, CheckCircle,
    Zap, ArrowRight, X, Layers, Bot, Wrench, Info, HelpCircle
} from 'lucide-react';

const ICON_MAP = {
    ShoppingBag,
    Stethoscope,
    Building2,
    GraduationCap,
    Briefcase,
    UtensilsCrossed,
    Bot
};

export default function AISkillLibraryModal({ isOpen, onClose, botId, onSkillApplied }) {
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [activeSkill, setActiveSkill] = useState(null);
    const [seedSampleQa, setSeedSampleQa] = useState(true);
    const [applying, setApplying] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchSkills();
        }
    }, [isOpen]);

    const fetchSkills = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/app/chatbot/skills');
            if (res.data?.data) {
                setSkills(res.data.data);
            }
        } catch (err) {
            console.error('Failed to load AI skills', err);
            toast.error('Gagal memuat katalog skill AI');
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async () => {
        if (!activeSkill || !botId) return;
        setApplying(true);
        try {
            const res = await axios.post(`/api/app/chatbot/skills/apply/${botId}`, {
                skillId: activeSkill.id,
                seedSampleQa
            });
            if (res.data.success) {
                toast.success(`✨ Skill "${activeSkill.name}" berhasil dipasang!`);
                if (onSkillApplied) {
                    onSkillApplied(res.data);
                }
                setActiveSkill(null);
                onClose();
            }
        } catch (err) {
            console.error('Failed to apply skill', err);
            toast.error(err.response?.data?.error || 'Gagal menerapkan skill AI');
        } finally {
            setApplying(false);
        }
    };

    if (!isOpen) return null;

    const categories = [
        { id: 'all', label: 'Semua Skill' },
        { id: 'ecommerce', label: '🛍️ Toko Online' },
        { id: 'healthcare', label: '🏥 Klinik & Kecantikan' },
        { id: 'property', label: '🏢 Properti' },
        { id: 'education', label: '🎓 Edukasi & Kursus' },
        { id: 'b2b', label: '💼 Jasa & B2B' },
        { id: 'culinary', label: '🍽️ Kuliner' }
    ];

    const filteredSkills = selectedCategory === 'all'
        ? skills
        : skills.filter(s => s.category === selectedCategory);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white flex items-center justify-between relative overflow-hidden">
                    <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-amber-300 shadow-inner">
                            <Sparkles className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-black tracking-tight">AI CS Skill Library</h2>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                    Instant 1-Click Setup
                                </span>
                            </div>
                            <p className="text-indigo-200 text-sm mt-0.5">
                                Pasang preset kecerdasan CS siap pakai yang dirancang khusus untuk berbagai industri di Indonesia.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="relative z-10 p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Category Pills */}
                <div className="px-6 py-3 bg-gray-50 border-b flex items-center gap-2 overflow-x-auto custom-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                selectedCategory === cat.id
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    {loading ? (
                        <div className="py-20 text-center">
                            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-sm font-semibold text-gray-500">Memuat katalog preset AI Skills...</p>
                        </div>
                    ) : filteredSkills.length === 0 ? (
                        <div className="py-16 text-center text-gray-500">
                            <Bot className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p className="font-bold">Belum ada skill pada kategori ini</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredSkills.map(skill => {
                                const IconComponent = ICON_MAP[skill.icon] || Bot;
                                return (
                                    <div
                                        key={skill.id}
                                        className="bg-white rounded-2xl border border-gray-200 hover:border-indigo-500/50 p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                                    <IconComponent className="w-6 h-6" />
                                                </div>
                                                <span className="text-[11px] font-extrabold px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200/80 rounded-lg">
                                                    {skill.badge}
                                                </span>
                                            </div>

                                            <h3 className="font-black text-gray-900 text-lg group-hover:text-indigo-600 transition-colors">
                                                {skill.name}
                                            </h3>
                                            <p className="text-xs text-gray-600 mt-2 line-clamp-3 leading-relaxed">
                                                {skill.description}
                                            </p>

                                            {/* Native Tools Included */}
                                            {skill.recommended_tools && skill.recommended_tools.length > 0 && (
                                                <div className="mt-4 pt-3 border-t border-gray-100">
                                                    <div className="flex items-center gap-1 text-[11px] font-bold text-gray-500 mb-1.5">
                                                        <Wrench className="w-3.5 h-3.5 text-indigo-500" />
                                                        <span>Integrated CRM Tools:</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {skill.recommended_tools.map(tool => (
                                                            <span
                                                                key={tool}
                                                                className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md border border-gray-200"
                                                            >
                                                                {tool}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => setActiveSkill(skill)}
                                            className="mt-5 w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 group-hover:shadow-md group-hover:shadow-indigo-600/20"
                                        >
                                            <span>Lihat Detail & Pasang</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Skill Detail / Preview Drawer / Modal */}
                {activeSkill && (
                    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                            <div className="p-5 border-b bg-gradient-to-r from-gray-900 to-indigo-950 text-white flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black">{activeSkill.name}</h3>
                                        <p className="text-xs text-indigo-200">{activeSkill.badge}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setActiveSkill(null)}
                                    className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
                                <div>
                                    <label className="text-xs font-black text-gray-500 uppercase tracking-wider block mb-1.5">
                                        System Prompt & Persona
                                    </label>
                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs font-mono text-gray-800 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                        {activeSkill.system_prompt}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-black text-gray-500 uppercase tracking-wider block mb-1.5">
                                        Pesan Sambutan Otomatis (Welcome Message)
                                    </label>
                                    <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs text-indigo-900 font-medium">
                                        "{activeSkill.welcome_message}"
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-black text-gray-500 uppercase tracking-wider block mb-1.5">
                                        Kata Kunci Transfer ke Manusia (Escalation)
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {activeSkill.escalation_keywords.split(',').map((kw, i) => (
                                            <span key={i} className="text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-md border border-red-100 font-medium">
                                                {kw.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {activeSkill.sample_qa && activeSkill.sample_qa.length > 0 && (
                                    <div>
                                        <label className="text-xs font-black text-gray-500 uppercase tracking-wider block mb-1.5">
                                            Contoh Pertanyaan & Jawaban Bawaan
                                        </label>
                                        <div className="space-y-2">
                                            {activeSkill.sample_qa.map((qa, i) => (
                                                <div key={i} className="p-3 bg-gray-50 rounded-lg border text-xs">
                                                    <div className="font-bold text-gray-800">Q: {qa.question}</div>
                                                    <div className="text-gray-600 mt-1">A: {qa.answer}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        id="seedQaCheckbox"
                                        checked={seedSampleQa}
                                        onChange={e => setSeedSampleQa(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                    />
                                    <label htmlFor="seedQaCheckbox" className="text-xs text-amber-900 font-medium cursor-pointer">
                                        <span className="font-bold block text-amber-950">Sertakan Contoh Q&A ke Knowledge Base</span>
                                        AI akan otomatis menyerap pertanyaan dan jawaban contoh ini ke database embeddings bot Anda.
                                    </label>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 border-t flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setActiveSkill(null)}
                                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleApply}
                                    disabled={applying}
                                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {applying ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>Menerapkan Skill...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            <span>Pasang Skill Ini Sekarang</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
