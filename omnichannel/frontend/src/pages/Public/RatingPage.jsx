import React, { useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { Star, CheckCircle } from 'lucide-react';

export default function RatingPage() {
    const { token } = useParams();
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (score === 0) return alert("Please select a star rating.");
        setLoading(true);
        try {
            await axios.post(`/api/public/rating/${token}`, { score, feedback });
            setSubmitted(true);
        } catch (err) {
            setError(err.response?.data?.error || "Link kadaluarsa atau sudah diisi.");
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-300">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Terima Kasih!</h1>
                <p className="text-gray-600">Masukan Anda sangat berarti bagi kami untuk meningkatkan layanan.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-xl font-bold text-red-600 mb-2">Oops!</h1>
                <p className="text-gray-600">{error}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Bagaimana layanan kami?</h2>
                <p className="text-gray-500 mb-8">Silakan beri penilaian untuk percakapan terakhir Anda.</p>

                <div className="flex justify-center gap-2 mb-8">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button 
                            key={star}
                            onClick={() => setScore(star)}
                            className={`transition-transform hover:scale-110 focus:outline-none ${star <= score ? 'text-yellow-400' : 'text-gray-300'}`}
                        >
                            <Star className="w-10 h-10 fill-current" />
                        </button>
                    ))}
                </div>

                <div className="text-left mb-6">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Masukan Tambahan (Opsional)</label>
                    <textarea 
                        className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                        placeholder="Ceritakan pengalaman Anda..."
                        value={feedback}
                        onChange={e => setFeedback(e.target.value)}
                    />
                </div>

                <button 
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors disabled:opacity-70 shadow-lg shadow-indigo-200"
                >
                    {loading ? 'Mengirim...' : 'Kirim Penilaian'}
                </button>
            </div>
        </div>
    );
}