import React, { useState } from 'react';
import axios from 'axios';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

/**
 * AISummarySection - AI conversation summary section
 *
 * @param {Object} props
 * @param {Object} props.conversation - Conversation data
 */
export default function AISummarySection({ conversation }) {
    const [summary, setSummary] = useState('');
    const [isSummarizing, setIsSummarizing] = useState(false);

    const handleSummarize = async () => {
        if (isSummarizing || !conversation?.id) return;
        setIsSummarizing(true);
        setSummary('');
        try {
            const res = await axios.post(`/api/app/inbox/conversations/${conversation.id}/summarize`);
            setSummary(res.data.summary || 'Tidak ada ringkasan tersedia.');
        } catch {
            toast.error('Gagal merangkum percakapan');
        } finally {
            setIsSummarizing(false);
        }
    };

    return (
        <div className="px-5 py-3 border-b border-gray-100 dark:border-dark-border">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Ringkasan AI</span>
                </div>
                <button
                    onClick={handleSummarize}
                    disabled={isSummarizing}
                    className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                    {isSummarizing ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Merangkum...</>
                    ) : (
                        summary ? 'Perbarui' : 'Rangkum'
                    )}
                </button>
            </div>
            {summary ? (
                <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg p-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line border border-purple-100 dark:border-purple-800/30">
                    {summary}
                </div>
            ) : !isSummarizing ? (
                <p className="text-[11px] text-gray-400 dark:text-gray-500 italic">
                    Klik "Rangkum" untuk membuat ringkasan percakapan dengan AI.
                </p>
            ) : null}
        </div>
    );
}
