import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, PlayCircle, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

// Helper to convert YouTube watch URL to embed URL
const getEmbedUrl = (url) => {
    if (!url) return null;
    try {
        let videoId = null;
        // Handle youtube.com/watch?v=ID
        if (url.includes('youtube.com/watch')) {
            const urlParams = new URLSearchParams(new URL(url).search);
            videoId = urlParams.get('v');
        }
        // Handle youtu.be/ID
        else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1];
        }
        // Handle youtube.com/embed/ID
        else if (url.includes('youtube.com/embed/')) {
            return url;
        }

        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}`;
        }
        return url; // Fallback
    } catch (e) {
        return url;
    }
};

export default function BroadcastTutorial() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [openIndex, setOpenIndex] = useState(0);

    useEffect(() => {
        fetchTutorial();
    }, []);

    const fetchTutorial = async () => {
        try {
            // Convention: Tutorial for broadcast module has slug 'tutorial-broadcast'
            const res = await axios.get('/api/public/pages/tutorial-broadcast');

            // Parse content if it's a tutorial page
            if (res.data) {
                let parsedContent = {};
                try {
                    parsedContent = JSON.parse(res.data.content);
                } catch (e) {
                    // Fallback if content is plain HTML (legacy)
                    parsedContent = { body: res.data.content, isLegacy: true };
                }
                setData({ ...res.data, parsedContent });
            }
        } catch (err) {
            console.error("Tutorial not found");
        } finally {
            setLoading(false);
        }
    };

    const toggleAccordion = (idx) => {
        setOpenIndex(openIndex === idx ? -1 : idx);
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>;

    if (!data) {
        return (
            <div className="p-8 h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl m-4">
                <HelpCircle className="w-16 h-16 mb-4 opacity-20" />
                <h2 className="text-xl font-bold text-gray-600">Tutorial Belum Tersedia</h2>
                <p>Admin belum membuat konten tutorial untuk modul ini.</p>
            </div>
        );
    }

    const { video_urls, video_url, items, isLegacy, body } = data.parsedContent || {};

    // Compatibility: Use video_urls if available, otherwise fallback to video_url
    const videos = video_urls || (video_url ? [video_url] : []);

    // Filter and process URLs
    const embedUrls = videos.map(v => getEmbedUrl(v)).filter(Boolean);

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto custom-scrollbar">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{data.title}</h1>
            <p className="text-gray-500 mb-8">{data.meta_description}</p>

            <div className="max-w-4xl mx-auto">

                {/* VIDEO SECTION */}
                {embedUrls.length > 0 && (
                    <div className="grid grid-cols-1 gap-8 mb-10">
                        {embedUrls.map((url, i) => (
                            <div key={i} className="rounded-2xl overflow-hidden shadow-xl border-4 border-white bg-black aspect-video relative group">
                                <iframe
                                    src={url}
                                    title={`Tutorial Video ${i + 1}`}
                                    className="w-full h-full"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            </div>
                        ))}
                    </div>
                )}

                {/* CONTENT SECTION */}
                {isLegacy ? (
                    <div className="prose prose-indigo max-w-none bg-white p-8 rounded-xl shadow-sm border border-gray-100" dangerouslySetInnerHTML={{ __html: body }} />
                ) : (
                    <div className="space-y-4">
                        {items && items.map((item, idx) => (
                            <div key={idx} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                                <button
                                    onClick={() => toggleAccordion(idx)}
                                    className="w-full flex justify-between items-center p-5 text-left bg-white hover:bg-gray-50 transition-colors"
                                >
                                    <span className="font-bold text-gray-800 text-lg flex items-center gap-3">
                                        <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">{idx + 1}</span>
                                        {item.title}
                                    </span>
                                    {openIndex === idx ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                                </button>

                                {openIndex === idx && (
                                    <div className="p-6 pt-0 text-gray-600 text-sm leading-relaxed border-t border-gray-100 animate-in slide-in-from-top-2">
                                        <div className="prose prose-sm max-w-none">
                                            {item.body.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}