import React, { useState } from 'react';
import { X, Download, Printer, FileText, CheckCircle2, MessageSquare, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

export default function ChatExportModal({
    isOpen,
    onClose,
    conversation,
    messages = []
}) {
    const [exporting, setExporting] = useState(false);

    if (!isOpen || !conversation) return null;

    const contactName = conversation.contact_name || conversation.name || 'Pelanggan';
    const contactPhone = conversation.phone_number || '-';
    const channel = conversation.channel || 'WhatsApp';

    // Filter valid chat messages (exclude raw separators)
    const validMessages = messages.filter(m => m && (m.content || m.message_text || m.type === 'image' || m.type === 'document' || m.type === 'audio' || m.type === 'video'));

    // 1. Export as .txt file
    const handleDownloadTxt = () => {
        setExporting(true);
        try {
            let output = `=====================================================\n`;
            output += `RIWAYAT PERCAKAPAN CRMHUB OMNICHANNEL\n`;
            output += `=====================================================\n`;
            output += `Pelanggan   : ${contactName}\n`;
            output += `Nomor/Akun  : ${contactPhone}\n`;
            output += `Saluran     : ${channel.toUpperCase()}\n`;
            output += `Total Pesan : ${validMessages.length}\n`;
            output += `Diekspor    : ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')} WIB\n`;
            output += `=====================================================\n\n`;

            validMessages.forEach(m => {
                const timeStr = m.created_at ? format(new Date(m.created_at), 'dd/MM/yyyy HH:mm') : '-';
                const senderName = m.from_me ? (m.sender_name || 'Agen') : contactName;
                let text = m.content || m.message_text || '';
                if (m.type === 'image') text = `[Foto/Gambar: ${m.media_url || text}]`;
                else if (m.type === 'document') text = `[Dokumen: ${m.media_url || text}]`;
                else if (m.type === 'audio') text = `[Audio/Voice Note: ${m.media_url || text}]`;
                else if (m.type === 'video') text = `[Video: ${m.media_url || text}]`;

                output += `[${timeStr}] ${senderName}:\n${text}\n\n`;
            });

            const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const cleanName = contactName.replace(/[^a-zA-Z0-9_-]/g, '_');
            link.href = url;
            link.download = `Chat_${cleanName}_${format(new Date(), 'yyyyMMdd_HHmm')}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success('Berkas transkrip .txt berhasil diunduh!');
            onClose();
        } catch (err) {
            console.error('Export TXT error:', err);
            toast.error('Gagal mengekspor berkas teks');
        } finally {
            setExporting(false);
        }
    };

    // 2. Open printable view for Print to PDF
    const handlePrintPdf = () => {
        try {
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                toast.error('Popup diblokir oleh browser. Izinkan popup untuk mencetak.');
                return;
            }

            const cleanRows = validMessages.map(m => {
                const timeStr = m.created_at ? format(new Date(m.created_at), 'dd/MM/yyyy HH:mm') : '-';
                const isAgent = Boolean(m.from_me);
                const sender = isAgent ? (m.sender_name || 'Customer Support') : contactName;
                let text = (m.content || m.message_text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                if (m.type === 'image') text = `<em>📷 [Lampiran Gambar: ${m.media_url || ''}]</em><br/>` + text;
                if (m.type === 'document') text = `<em>📄 [Lampiran Dokumen: ${m.media_url || ''}]</em><br/>` + text;
                if (m.type === 'audio') text = `<em>🎵 [Lampiran Audio]</em><br/>` + text;

                return `
                    <div style="margin-bottom: 12px; display: flex; flex-direction: column; align-items: ${isAgent ? 'flex-end' : 'flex-start'};">
                        <div style="font-size: 11px; color: #666; margin-bottom: 2px;">
                            <strong>${sender}</strong> &bull; ${timeStr}
                        </div>
                        <div style="max-width: 75%; padding: 8px 12px; border-radius: 8px; font-size: 13px; line-height: 1.4; background-color: ${isAgent ? '#e0f2fe' : '#f3f4f6'}; color: #111; border: 1px solid ${isAgent ? '#bae6fd' : '#e5e7eb'}; word-break: break-word;">
                            ${text.replace(/\n/g, '<br/>')}
                        </div>
                    </div>
                `;
            }).join('');

            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Transkrip Chat - ${contactName}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #333; }
                        .header { border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; }
                        .header h1 { font-size: 18px; margin: 0 0 6px 0; color: #0284c7; }
                        .meta { font-size: 12px; color: #555; display: flex; gap: 16px; flex-wrap: wrap; }
                        @media print {
                            body { padding: 0; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>CRMHUB Omnichannel - Riwayat Percakapan</h1>
                        <div class="meta">
                            <span><strong>Pelanggan:</strong> ${contactName}</span>
                            <span><strong>Nomor:</strong> ${contactPhone}</span>
                            <span><strong>Saluran:</strong> ${channel.toUpperCase()}</span>
                            <span><strong>Tanggal Ekspor:</strong> ${format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
                        </div>
                    </div>
                    <div class="chat-container">
                        ${cleanRows}
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                        };
                    </script>
                </body>
                </html>
            `;

            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
            onClose();
        } catch (err) {
            console.error('Print PDF error:', err);
            toast.error('Gagal memproses pratinjau cetak');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div 
                className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">Ekspor Transkrip Chat</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[240px]">
                                {contactName} ({contactPhone})
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                    <div className="bg-gray-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-gray-100 dark:border-slate-700 space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Total Pesan Tersedia:</span>
                            <span className="font-bold text-gray-800 dark:text-gray-100">{validMessages.length} pesan</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Saluran:</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-100 capitalize">{channel}</span>
                        </div>
                    </div>

                    <div className="space-y-2.5 pt-1">
                        {/* Option 1: Print / PDF */}
                        <button
                            type="button"
                            onClick={handlePrintPdf}
                            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-all text-left group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                                    <Printer className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-800 dark:text-gray-100">Pratinjau & Cetak / PDF</p>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Buka dokumen siap cetak atau simpan sebagai PDF resmi</p>
                                </div>
                            </div>
                        </button>

                        {/* Option 2: TXT Download */}
                        <button
                            type="button"
                            onClick={handleDownloadTxt}
                            disabled={exporting}
                            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-all text-left group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                                    <Download className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-800 dark:text-gray-100">Unduh Berkas Teks (.txt)</p>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Arsip teks berstempel waktu untuk dokumentasi ringan</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 bg-gray-50/80 dark:bg-slate-800/40 border-t border-gray-100 dark:border-slate-700 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}
