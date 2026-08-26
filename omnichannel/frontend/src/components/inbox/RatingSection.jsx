import React, { useState, useEffect, memo } from 'react';
import { ChevronDown, ChevronUp, Star } from 'lucide-react';

/**
 * AccordionSection - Reusable accordion component
 */
const AccordionSection = memo(({ title, isOpen, onToggle, icon: Icon, children }) => (
    <div className="border-b border-gray-100 dark:border-dark-border">
        <button
            onClick={onToggle}
            className="w-full py-4 px-5 flex items-center justify-between bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors text-left"
        >
            <div className="flex items-center gap-3">
                {Icon && <Icon className="w-4 h-4 text-gray-400" />}
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</span>
            </div>
            {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {isOpen && (
            <div className="px-5 pb-5 bg-white dark:bg-dark-surface">
                {children}
            </div>
        )}
    </div>
));

/**
 * RatingSection - Rating history section
 *
 * @param {Object} props
 * @param {Object} props.conversation - Conversation data
 */
export default function RatingSection({ conversation }) {
    const [ratingHistory, setRatingHistory] = useState([]);

    useEffect(() => {
        if (conversation?.status === 'resolved' || conversation?.rating_score) {
            axios.get(`/api/app/inbox/conversations/${conversation.id}/ratings`)
                .then(res => setRatingHistory(res.data))
                .catch(() => setRatingHistory([]));
        } else {
            setRatingHistory([]);
        }
    }, [conversation?.id, conversation?.status, conversation?.rating_score]);

    const hasRatings = conversation?.rating_score || ratingHistory.length > 0;

    return (
        <AccordionSection title="Rating / Rating History" isOpen={false} onToggle={() => {}} icon={Star}>
            {hasRatings ? (
                <div>
                    {/* Latest Rating */}
                    {conversation.rating_score && (
                        <div className="bg-white dark:bg-dark-bg border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Latest Rating</p>
                            <div className="flex items-center gap-1 mb-1">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <Star
                                        key={star}
                                        className={`w-4 h-4 ${star <= conversation.rating_score ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                                    />
                                ))}
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300 italic">
                                "{conversation.rating_feedback || "No feedback"}"
                            </p>
                        </div>
                    )}

                    {/* Rating History */}
                    <div className="space-y-2">
                        {ratingHistory.map((r) => (
                            <div key={r.id} className="bg-gray-50 dark:bg-dark-bg/50 border border-gray-100 dark:border-dark-border rounded p-2 text-xs">
                                <div className="flex justify-between items-center mb-1">
                                    <div className="flex items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <Star
                                                key={star}
                                                className={`w-3 h-3 ${star <= r.score ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-[10px] text-gray-400">
                                        {new Date(r.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                {r.feedback && (
                                    <p className="text-gray-600 dark:text-gray-400 line-clamp-2">"{r.feedback}"</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <p className="text-xs text-gray-400 italic">No ratings yet.</p>
            )}
        </AccordionSection>
    );
}
