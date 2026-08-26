import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Pause, Download, Sparkles, Copy, Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { getApiUrl } from '../../config/api';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// Helper: Format Time in MM:SS
export const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const WaveformAudioPlayer = ({ src, messageId, isOutbound, existingTranscription }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    
    // AI Transcription State
    const [transcription, setTranscription] = useState(existingTranscription || '');
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [showTranscription, setShowTranscription] = useState(Boolean(existingTranscription));
    const [copied, setCopied] = useState(false);

    // Deterministic pseudo-random waveform bar heights (32 bars)
    const waveformBars = useMemo(() => {
        const hashStr = String(src || 'audio-default');
        const bars = [];
        let hash = 0;
        for (let i = 0; i < hashStr.length; i++) {
            hash = (hash << 5) - hash + hashStr.charCodeAt(i);
            hash |= 0;
        }
        for (let i = 0; i < 30; i++) {
            const val = Math.abs(Math.sin(hash + i * 0.45) * 75 + Math.cos(i * 0.8) * 20);
            bars.push(Math.max(15, Math.min(95, Math.round(val))));
        }
        return bars;
    }, [src]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleLoadedMetadata = () => setDuration(audio.duration || 0);
        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().catch(() => {});
            setIsPlaying(true);
        }
    };

    const handleSeek = (e) => {
        if (!audioRef.current || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, clickX / rect.width));
        const newTime = percentage * duration;
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const cyclePlaybackRate = (e) => {
        e.stopPropagation();
        const rates = [1, 1.5, 2];
        const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
        const nextRate = rates[nextIdx];
        setPlaybackRate(nextRate);
        if (audioRef.current) {
            audioRef.current.playbackRate = nextRate;
        }
    };

    const handleTranscribe = async (e) => {
        e.stopPropagation();
        if (transcription) {
            setShowTranscription(!showTranscription);
            return;
        }

        setIsTranscribing(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/app/ai/transcribe-audio', {
                audioUrl: src,
                messageId: messageId || null
            }, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            if (res.data?.success && res.data?.text) {
                setTranscription(res.data.text);
                setShowTranscription(true);
                toast.success('Audio berhasil ditranskrip!');
            } else {
                toast.error(res.data?.error || 'Gagal mentranskripsi audio');
            }
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Gagal memproses audio';
            toast.error(msg);
        } finally {
            setIsTranscribing(false);
        }
    };

    const handleCopy = (e) => {
        e.stopPropagation();
        if (transcription) {
            navigator.clipboard.writeText(transcription);
            setCopied(true);
            toast.success('Transkrip disalin ke clipboard');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const progressRatio = duration > 0 ? currentTime / duration : 0;

    return (
        <div className="flex flex-col gap-1.5 w-full max-w-[320px]">
            {/* Audio Element */}
            <audio ref={audioRef} src={getApiUrl(src)} preload="metadata" />

            {/* Main Player Bubble Card */}
            <div className={`flex items-center gap-2.5 p-2 rounded-xl shadow-sm transition-all duration-200 ${
                isOutbound 
                    ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-gray-800 dark:text-gray-100' 
                    : 'bg-white dark:bg-[#202c33] text-gray-800 dark:text-gray-100'
            }`}>
                {/* Play/Pause Button */}
                <button 
                    onClick={togglePlay} 
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 shadow-sm ${
                        isOutbound 
                            ? 'bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700' 
                            : 'bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700'
                    }`}
                    title={isPlaying ? "Pause" : "Play"}
                >
                    {isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                    ) : (
                        <Play className="w-4 h-4 fill-current translate-x-0.5" />
                    )}
                </button>

                {/* Waveform Visualization & Time */}
                <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
                    <div 
                        onClick={handleSeek} 
                        className="h-6 flex items-center gap-[2.5px] cursor-pointer group py-1"
                        title="Klik untuk navigasi waktu"
                    >
                        {waveformBars.map((heightPercent, idx) => {
                            const barRatio = idx / waveformBars.length;
                            const isPlayed = barRatio <= progressRatio;
                            return (
                                <div
                                    key={idx}
                                    className={`w-[3px] rounded-full transition-all duration-100 ${
                                        isPlayed 
                                            ? (isOutbound ? 'bg-emerald-700 dark:bg-emerald-300' : 'bg-indigo-600 dark:bg-indigo-400')
                                            : (isOutbound ? 'bg-emerald-300/60 dark:bg-emerald-800/80' : 'bg-gray-300 dark:bg-gray-600')
                                    }`}
                                    style={{ height: `${heightPercent}%` }}
                                />
                            );
                        })}
                    </div>

                    {/* Bottom Metadata: Time & Playback Speed */}
                    <div className="flex items-center justify-between text-[11px] font-mono opacity-80 select-none">
                        <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                        
                        <div className="flex items-center gap-1.5">
                            {/* Speed Selector */}
                            <button
                                onClick={cyclePlaybackRate}
                                className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[10px] font-bold hover:bg-black/10 transition-colors"
                                title="Ubah kecepatan pemutaran"
                            >
                                {playbackRate}x
                            </button>

                            {/* Download Button */}
                            <a
                                href={getApiUrl(src)}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                title="Download rekaman suara"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Download className="w-3 h-3" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Voice Note Transcription Header / Button */}
            <div className="flex items-center justify-between px-1">
                <button
                    onClick={handleTranscribe}
                    disabled={isTranscribing}
                    className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors disabled:opacity-50"
                    title="Ubah pesan suara ini ke teks secara instan menggunakan AI"
                >
                    {isTranscribing ? (
                        <>
                            <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                            <span>Mentranskrip suara...</span>
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400/30" />
                            <span>{transcription ? (showTranscription ? 'Tutup Transkrip' : 'Lihat Transkrip AI') : 'Transkrip VN (AI)'}</span>
                            {transcription && (showTranscription ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </>
                    )}
                </button>
            </div>

            {/* Transcribed Text Card */}
            {showTranscription && transcription && (
                <div className="mt-0.5 p-2.5 rounded-lg bg-amber-50/90 dark:bg-slate-800/90 border border-amber-200/70 dark:border-slate-700 text-xs text-gray-800 dark:text-gray-200 shadow-sm relative group animate-fadeIn">
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> Hasil Transkripsi AI
                        </span>
                        <button
                            onClick={handleCopy}
                            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
                            title="Salin teks transkrip"
                        >
                            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap select-text font-sans">{transcription}</p>
                </div>
            )}
        </div>
    );
};

export default WaveformAudioPlayer;
