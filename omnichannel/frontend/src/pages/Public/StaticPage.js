import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Loader2, ArrowLeft, PlayCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useConfig } from '../../context/ConfigContext';
import { getApiUrl } from '../../config/api';

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

export default function StaticPage() {
    const { slug } = useParams();
    const { config } = useConfig();
    const [pageData, setPageData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    
    // Tutorial State
    const [openIndex, setOpenIndex] = useState(0);

    useEffect(() => {
        const fetchPage = async () => {
            try {
                const res = await axios.get(`/api/public/pages/${slug}`);
                setPageData(res.data);
            } catch (err) {
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        fetchPage();
    }, [slug]);

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>;

    if (error || !pageData) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                <p className="text-gray-500 mb-8">Halaman tidak ditemukan.</p>
                <Link to="/login" className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold">Kembali ke Home</Link>
            </div>
        );
    }

    const toggleAccordion = (idx) => {
        setOpenIndex(openIndex === idx ? -1 : idx);
    };

    // RENDER TUTORIAL LAYOUT
    if (pageData.page_type === 'tutorial') {
        let tutorialData = { video_url: '', items: [] };
        try {
            tutorialData = JSON.parse(pageData.content);
        } catch(e) {
            // Fallback if content isn't valid JSON
            tutorialData = { isLegacy: true, body: pageData.content };
        }

        const embedUrl = getEmbedUrl(tutorialData.video_url);

        return (
            <div className="min-h-screen flex flex-col bg-gray-50">
                {/* Navbar */}
                <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {config.app_logo ? (
                                <img src={getApiUrl(config.app_logo)} alt="Logo" className="h-8 w-auto" />
                            ) : (
                                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">R</div>
                            )}
                            <span className="font-bold text-xl text-gray-900">{config.app_name}</span>
                        </div>
                        <div>
                            <Link to="/login" className="text-sm font-bold text-indigo-600 hover:underline">Login</Link>
                        </div>
                    </div>
                </nav>

                <main className="flex-grow">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                        {/* Header */}
                        <div className="text-center mb-10">
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
                                {pageData.title}
                            </h1>
                            <p className="text-gray-500">{pageData.meta_description}</p>
                        </div>

                        {/* Video Section */}
                        {embedUrl && (
                            <div className="mb-12 rounded-2xl overflow-hidden shadow-xl border-4 border-white bg-black aspect-video relative group">
                                <iframe 
                                    src={embedUrl} 
                                    title="Tutorial Video"
                                    className="w-full h-full"
                                    frameBorder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                    allowFullScreen
                                ></iframe>
                            </div>
                        )}

                        {/* Steps Section */}
                        {tutorialData.isLegacy ? (
                             <article className="prose prose-indigo prose-lg max-w-none bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-gray-100">
                                <div dangerouslySetInnerHTML={{ __html: tutorialData.body }} />
                             </article>
                        ) : (
                            <div className="space-y-4">
                                {tutorialData.items && tutorialData.items.map((item, idx) => (
                                    <div key={idx} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                                        <button 
                                            onClick={() => toggleAccordion(idx)}
                                            className="w-full flex justify-between items-center p-5 text-left bg-white hover:bg-gray-50 transition-colors"
                                        >
                                            <span className="font-bold text-gray-800 text-lg flex items-center gap-3">
                                                <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0">{idx + 1}</span>
                                                {item.title}
                                            </span>
                                            {openIndex === idx ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                                        </button>
                                        
                                        {openIndex === idx && (
                                            <div className="p-6 pt-0 text-gray-600 text-base leading-relaxed border-t border-gray-100 animate-in slide-in-from-top-2">
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
                </main>

                {/* Footer */}
                <footer className="bg-white border-t border-gray-200 py-8 mt-12">
                    <div className="max-w-5xl mx-auto px-4 text-center text-gray-500 text-sm">
                        &copy; {new Date().getFullYear()} {config.app_name}. All rights reserved.
                    </div>
                </footer>
            </div>
        );
    }

    // RENDER STATIC LAYOUT (Default)
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                         {config.app_logo ? (
                            <img src={getApiUrl(config.app_logo)} alt="Logo" className="h-8 w-auto" />
                         ) : (
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">R</div>
                         )}
                         <span className="font-bold text-xl text-gray-900">{config.app_name}</span>
                    </div>
                    <div>
                        <Link to="/login" className="text-sm font-bold text-indigo-600 hover:underline">Login</Link>
                    </div>
                </div>
            </nav>

            <main className="flex-grow">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
                            {pageData.title}
                        </h1>
                        <p className="text-sm text-gray-500">
                            Terakhir diperbarui: {new Date(pageData.updated_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>

                    {/* Content */}
                    <article className="prose prose-indigo prose-lg max-w-none bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-gray-100">
                        <div dangerouslySetInnerHTML={{ __html: pageData.content }} />
                    </article>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 py-8 mt-12">
                <div className="max-w-5xl mx-auto px-4 text-center text-gray-500 text-sm">
                    &copy; {new Date().getFullYear()} {config.app_name}. All rights reserved.
                </div>
            </footer>
        </div>
    );
}