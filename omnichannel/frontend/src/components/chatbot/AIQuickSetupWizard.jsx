import React from 'react';
import { Sparkles, QrCode, BookOpen, Play, CheckCircle2, ArrowRight } from 'lucide-react';

export default function AIQuickSetupWizard({ bot, onOpenSkillModal, onSwitchTab }) {
    const hasPrompt = Boolean(bot?.system_prompt && bot.system_prompt.length > 50);
    const hasDevice = Boolean(bot?.device_id);
    const hasWelcome = Boolean(bot?.auto_reply_config?.welcome?.enabled);

    // Calculate progress
    let stepsCompleted = 0;
    if (hasPrompt) stepsCompleted += 1;
    if (hasDevice) stepsCompleted += 1;
    if (hasWelcome) stepsCompleted += 1;

    const progressPercentage = Math.round((stepsCompleted / 3) * 100);

    return (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-950 rounded-2xl p-6 text-white shadow-xl mb-6 relative overflow-hidden">
            {/* Background Decorative Blur */}
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-amber-300 text-xs font-bold mb-2">
                            <Sparkles className="w-3.5 h-3.5 animate-spin" />
                            <span>Panduan Cepat 10 Menit Setup AI</span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-black tracking-tight">
                            Siapkan AI Customer Service Anda dalam 3 Langkah Mudah
                        </h2>
                        <p className="text-indigo-200 text-xs md:text-sm mt-1 max-w-2xl">
                            Ikuti langkah di bawah ini untuk mengaktifkan AI CS yang cerdas, natural, dan siap melayani penjualan WhatsApp 24/7.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur px-4 py-2.5 rounded-xl border border-white/15 shrink-0">
                        <div className="text-right">
                            <div className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider">Kesiapan Bot</div>
                            <div className="text-lg font-black text-amber-300">{progressPercentage}% Selesai</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-black text-xs text-white border-2 border-amber-400">
                            {stepsCompleted}/3
                        </div>
                    </div>
                </div>

                {/* Steps Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* STEP 1: Pasang Skill */}
                    <div className={`p-4 rounded-xl border transition-all ${
                        hasPrompt
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
                            : 'bg-white/10 border-white/15 hover:bg-white/15 text-white'
                    }`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-white/20">Langkah 1</span>
                            {hasPrompt ? (
                                <span className="flex items-center gap-1 text-xs font-bold text-emerald-300">
                                    <CheckCircle2 className="w-4 h-4" /> Terpasang
                                </span>
                            ) : (
                                <span className="text-xs text-amber-300 font-bold">Wajib</span>
                            )}
                        </div>
                        <h4 className="font-black text-sm">Pasang AI Skill Preset</h4>
                        <p className="text-[11px] opacity-80 mt-1 leading-relaxed">
                            Pilih industri bisnis (Toko Online, Klinik, Properti, dll) untuk mengisi persona & aturan respon instan.
                        </p>
                        <button
                            onClick={onOpenSkillModal}
                            className="mt-3 w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-gray-950 font-black text-xs rounded-lg shadow-md flex items-center justify-center gap-1.5 transition-all"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{hasPrompt ? 'Ganti / Pasang Skill Lain' : 'Pilih AI Skill (1-Klik)'}</span>
                        </button>
                    </div>

                    {/* STEP 2: Hubungkan Channel */}
                    <div className={`p-4 rounded-xl border transition-all ${
                        hasDevice
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
                            : 'bg-white/10 border-white/15 hover:bg-white/15 text-white'
                    }`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-white/20">Langkah 2</span>
                            {hasDevice ? (
                                <span className="flex items-center gap-1 text-xs font-bold text-emerald-300">
                                    <CheckCircle2 className="w-4 h-4" /> Terhubung
                                </span>
                            ) : (
                                <span className="text-xs text-amber-300 font-bold">Wajib</span>
                            )}
                        </div>
                        <h4 className="font-black text-sm">Hubungkan Nomor WhatsApp</h4>
                        <p className="text-[11px] opacity-80 mt-1 leading-relaxed">
                            Tautkan bot ini ke nomor WhatsApp atau channel Instagram/Telegram yang ingin dilayani otomatis.
                        </p>
                        <button
                            onClick={() => onSwitchTab('general')}
                            className="mt-3 w-full py-2 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-lg border border-white/20 flex items-center justify-center gap-1.5 transition-all"
                        >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>{hasDevice ? 'Kelola Device' : 'Pilih Device Saluran'}</span>
                        </button>
                    </div>

                    {/* STEP 3: Isi Knowledge Base & Test */}
                    <div className="p-4 rounded-xl border bg-white/10 border-white/15 hover:bg-white/15 text-white transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-white/20">Langkah 3</span>
                            <span className="text-xs text-indigo-300 font-bold">Rekomendasi</span>
                        </div>
                        <h4 className="font-black text-sm">Knowledge Base & Uji Coba</h4>
                        <p className="text-[11px] opacity-80 mt-1 leading-relaxed">
                            Upload file pricelist/FAQ bisnis, lalu tes balasan AI secara live di Simulator sebelah kanan.
                        </p>
                        <button
                            onClick={() => onSwitchTab('knowledge')}
                            className="mt-3 w-full py-2 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-lg border border-white/20 flex items-center justify-center gap-1.5 transition-all"
                        >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Buka Knowledge Base</span>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
