import React, { useState } from 'react';
import { getInitialsAvatar } from '../../utils/avatar';
import { AudioPlayer, VideoPlayer, DocumentCard } from './MediaComponents';
import { getApiUrl } from '../../config/api';
import axios from 'axios';
import { format } from 'date-fns';
import { RotateCw, Languages, ChevronDown, ChevronUp, Star, X, ArrowRightLeft, Smartphone, Lock, Pin } from 'lucide-react';

// Extracted Components
import FormatText from './FormatText.jsx';
import MessageLightbox from './MessageLightbox.jsx';
import MessageStatusTick from './MessageStatusTick.jsx';
import MessageMenu from './MessageMenu.jsx';
import { ContactCard } from './ContactCard.jsx';
import { PollMessage } from './PollMessage.jsx';
import { EventMessage } from './EventMessage.jsx';

// ============================================================================
// DATE SEPARATOR
// ============================================================================
export { default as DateSeparator } from './MessageDateSeparator.jsx';

// ============================================================================
// SYSTEM MESSAGE
// ============================================================================
function SystemMessage({ content }) {
    // Hide rating link from agent
    if (content && content.includes('/rating/')) {
        return null;
    }

    return (
        <div className="flex justify-center my-3 w-full px-4">
            <div className="bg-[#fff5c4] dark:bg-[#1e293b] text-gray-500 dark:text-gray-300 text-[11px] px-3 py-1 rounded-lg shadow-sm border border-transparent dark:border-slate-700 flex items-center gap-2 text-center">
                <X className="w-3 h-3" />
                <span className="font-medium">{content}</span>
            </div>
        </div>
    );
}

// ============================================================================
// REVOKED MESSAGE
// ============================================================================
function RevokedMessage({ message, isOutbound, contactProfilePic, contactName }) {
    return (
        <div className={`flex w-full mb-1 gap-2 group relative ${isOutbound ? 'justify-end' : 'justify-start'}`}>
            {/* Avatar */}
            {!isOutbound && (
                <div className="flex flex-col justify-start pt-1 flex-shrink-0">
                    <img
                        src={contactProfilePic || getInitialsAvatar(contactName)}
                        onError={(e) => { e.target.onerror = null; e.target.src = getInitialsAvatar(contactName); }}
                        className="w-6 h-6 rounded-full object-cover shadow-sm"
                        alt=""
                    />
                </div>
            )}

            {/* Bubble */}
            <div className={`flex gap-0.5 items-start max-w-[85%] md:max-w-[65%]`}>
                <div className={`relative flex flex-col shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] px-2 py-1.5
                    ${isOutbound ? 'bg-[#d9fdd3] dark:bg-[#005c4b] rounded-l-lg rounded-br-lg rounded-tr-none' : 'bg-white dark:bg-[#202c33] rounded-r-lg rounded-bl-lg rounded-tl-none'}
                `}>
                    <div className="text-[14.2px] leading-[19px] text-gray-500 dark:text-gray-400 italic flex items-center gap-1.5">
                        <X className="w-3.5 h-3.5" />
                        {message.content || '[Pesan ini telah ditarik]'}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// EMOJI REACTIONS
// ============================================================================
function EmojiReactions({ reactions, isOutbound }) {
    if (!reactions || reactions.length === 0) return null;

    return (
        <div className={`absolute -bottom-2 ${isOutbound ? 'right-2' : 'left-2'} bg-white dark:bg-[#182229] shadow-sm border border-gray-100 dark:border-[#202c33] rounded-full px-1.5 py-0.5 text-[11px] z-10 flex items-center gap-0.5`}>
            {reactions.map((r, i) => (
                <span key={i}>{r.emoji}</span>
            ))}
        </div>
    );
}

// ============================================================================
// TRANSLATION UI
// ============================================================================
function TranslationUI({ message, isOutbound, translating, showOriginal, setShowOriginal, onTranslate }) {
    const hasTranslation = message.original_content && message.translated_content;
    const isTranslated = message.original_language && message.original_language !== 'id';

    if (isOutbound) return null;

    // Show translation if available
    if (hasTranslation) {
        return (
            <div className="mb-1">
                <button
                    onClick={() => setShowOriginal(!showOriginal)}
                    className="flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 hover:underline mb-0.5"
                >
                    <Languages className="w-3 h-3" />
                    {showOriginal ? (
                        <>Lihat Terjemahan <ChevronUp className="w-3 h-3" /></>
                    ) : (
                        <>Terjemahan <ChevronDown className="w-3 h-3" /></>
                    )}
                </button>
                {!showOriginal && <FormatText text={message.translated_content} />}
                {showOriginal && (
                    <div className="opacity-70">
                        <FormatText text={message.original_content} />
                    </div>
                )}
            </div>
        );
    }

    // Show translate button
    if (message.type === 'text') {
        return (
            <button
                onClick={onTranslate}
                disabled={translating}
                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 mb-0.5"
            >
                <Languages className="w-3 h-3" />
                {translating ? 'Menerjemahkan...' : 'Terjemahkan'}
            </button>
        );
    }

    return null;
}

// ============================================================================
// MESSAGE CONTENT RENDERER
// ============================================================================
function MessageContent({ message, isOutbound, onLightbox }) {
    // Image
    if (message.type === 'image' && message.media_url) {
        return (
            <div
                className="mb-1 relative group cursor-pointer -mx-1 -mt-1"
                onClick={() => onLightbox(getApiUrl(message.media_url))}
            >
                <img
                    src={getApiUrl(message.media_url)}
                    alt="Attachment"
                    className="rounded-lg w-full h-auto object-cover max-h-[300px] min-w-[150px]"
                />
            </div>
        );
    }

    // Video
    if (message.type === 'video' && message.media_url) {
        return (
            <div
                className="mb-1 cursor-pointer -mx-1 -mt-1"
                onClick={() => onLightbox(getApiUrl(message.media_url))}
            >
                <VideoPlayer src={getApiUrl(message.media_url)} />
            </div>
        );
    }

    // Audio
    if (message.type === 'audio' && message.media_url) {
        const existingTrans = message.translated_content?.startsWith('[Transkripsi Suara]:')
            ? message.translated_content.replace('[Transkripsi Suara]:', '').trim()
            : '';
        return (
            <div className="min-w-[260px]">
                <AudioPlayer 
                    src={getApiUrl(message.media_url)} 
                    messageId={message.id}
                    isOutbound={isOutbound} 
                    existingTranscription={existingTrans}
                />
            </div>
        );
    }

    // Document
    if (message.type === 'document' && message.media_url) {
        return (
            <div className="min-w-[240px]">
                <DocumentCard src={getApiUrl(message.media_url)} filename={message.content} isOutbound={isOutbound} />
            </div>
        );
    }

    // Contact Card
    if (message.type === 'contact') {
        return (
            <div className="mb-1">
                <ContactCard data={message.media_url} isOutbound={isOutbound} />
            </div>
        );
    }

    // Poll Message
    if (message.type === 'poll') {
        return (
            <div className="mb-1">
                <PollMessage data={message.media_url} isOutbound={isOutbound} />
            </div>
        );
    }

    // Event Message
    if (message.type === 'event') {
        return (
            <div className="mb-1">
                <EventMessage data={message.media_url} isOutbound={isOutbound} />
            </div>
        );
    }

    // Location Message - Show as clickable card with map link
    if (message.type === 'location' && message.media_url) {
        let locationData;
        try {
            locationData = typeof message.media_url === 'string' ? JSON.parse(message.media_url) : message.media_url;
        } catch {
            locationData = {};
        }

        const mapsUrl = locationData.latitude && locationData.longitude
            ? `https://www.google.com/maps?q=${locationData.latitude},${locationData.longitude}`
            : null;

        return (
            <div className="min-w-[200px] max-w-[260px] bg-gray-50 dark:bg-slate-800 rounded-lg overflow-hidden">
                {mapsUrl && (
                    <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                    >
                        {/* Map Preview Placeholder */}
                        <div className="h-32 bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 flex items-center justify-center">
                            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>

                        {/* Location Info */}
                        {(locationData.name || locationData.address) && (
                            <div className="p-2">
                                {locationData.name && (
                                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                        {locationData.name}
                                    </p>
                                )}
                                {locationData.address && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {locationData.address}
                                    </p>
                                )}
                            </div>
                        )}
                    </a>
                )}
                {!mapsUrl && (
                    <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                        Shared a location
                    </div>
                )}
            </div>
        );
    }

    return null;
}

// ============================================================================
// MESSAGE META FOOTER
// ============================================================================
function MessageMeta({ message, isOutbound, isStarred, isPinned, showTime }) {
    if (!showTime) return null;

    return (
        <div className="flex items-center justify-end gap-1 select-none float-right ml-2 mt-0.5">
            {/* Pinned indicator */}
            {isPinned && (
                <Pin className="w-3 h-3 text-gray-500 dark:text-gray-400 fill-current" />
            )}

            {/* Forwarded indicator - show for both inbound and outbound */}
            {message.is_forwarded && (
                <span className="flex items-center gap-0.5 text-[10px] text-gray-400 dark:text-gray-500" title="Pesan diteruskan">
                    <ArrowRightLeft className="w-3 h-3" />
                    {!isOutbound && <span>Diteruskan</span>}
                </span>
            )}

            {/* WA Echo indicator */}
            {isOutbound && message.is_wa_echo && (
                <span className="flex items-center gap-0.5 text-[10px] text-emerald-500 dark:text-emerald-400 mr-1" title="Dibalas via WA Mobile/Web">
                    <Smartphone className="w-3 h-3" />
                </span>
            )}

            {/* Starred indicator */}
            {isStarred && (
                <Star className="w-3 h-3 text-[#8696a0] dark:text-[#667781] fill-[#8696a0] dark:fill-[#667781]" />
            )}

            {/* Sender name (for group chats) */}
            {isOutbound && message.sender_name && (
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mr-1 truncate max-w-[80px]">
                    {message.sender_name}
                </span>
            )}

            {/* Edited indicator */}
            {message.is_edited && (
                <span className="text-[11px] text-[#667781] dark:text-[#8696a0] italic">Edited</span>
            )}

            {/* Time */}
            <span className="text-[11px] text-[#667781] dark:text-[#8696a0]">
                {format(new Date(message.created_at), 'HH:mm')}
            </span>

            {/* Status tick (outbound only) */}
            {isOutbound && <MessageStatusTick status={message.status} retryCount={message.retry_count} />}
        </div>
    );
}

// ============================================================================
// QUOTED MESSAGE
// ============================================================================
function QuotedMessage({ message }) {
    if (!message.quoted_message) return null;

    return (
        <div className="mb-1 p-2 bg-black/5 dark:bg-white/5 border-l-4 border-indigo-500 rounded text-xs opacity-80 max-h-[80px] overflow-hidden">
            <div className="line-clamp-3">
                <FormatText text={message.quoted_message} />
            </div>
        </div>
    );
}

// ============================================================================
// RETRY INDICATOR
// ============================================================================
function RetryIndicator({ isOutbound, status, onRetry, message }) {
    if (!isOutbound || status !== 'pending' || !onRetry) return null;

    return (
        <div className="flex items-center">
            <button
                onClick={(e) => { e.stopPropagation(); onRetry(message); }}
                className="w-6 h-6 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-md animate-pulse"
                title="Pesan stuck - klik untuk retry"
            >
                <RotateCw className="w-3 h-3" />
            </button>
        </div>
    );
}

// ============================================================================
// MAIN MESSAGE BUBBLE
// ============================================================================
const MessageBubble = ({
    message,
    contactProfilePic,
    contactName,
    onReply,
    onForward,
    onSaveToKb,
    onDelete,
    onRevoke,
    onEdit,
    onStar,
    onPin,
    onInfo,
    onCopy,
    onReact,
    onRetry,
    isLast,
    isFirstInGroup,
    isLastInGroup,
    showSender,
    showTime,
    isGroupChat = false
}) => {
    const isOutbound = message.from_me;
    const isStarred = message.is_starred;
    const isPinned = message.is_pinned;
    const [isHovered, setIsHovered] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [lightboxSrc, setLightboxSrc] = useState(null);
    const [showOriginal, setShowOriginal] = useState(false);
    const [translating, setTranslating] = useState(false);

    // Can edit: outbound text only, within 15 minutes
    const canEdit = isOutbound && message.type === 'text' &&
        (Date.now() - new Date(message.created_at).getTime()) < 15 * 60 * 1000;

    // Can retry: outbound pending or failed
    const canRetry = isOutbound && onRetry && (message.status === 'pending' || message.status === 'failed');

    // Handle translation
    const handleTranslate = async () => {
        if (translating) return;
        setTranslating(true);
        try {
            await axios.post(`/api/app/translate/messages/${message.id}/id`);
            window.dispatchEvent(new CustomEvent('message-translated', { detail: { messageId: message.id } }));
        } catch (err) {
            console.error('Translation error:', err);
        } finally {
            setTranslating(false);
        }
    };

    // System message
    if (message.type === 'system') {
        return <SystemMessage content={message.content} />;
    }

    // Revoked message
    if (message.type === 'revoked') {
        return (
            <RevokedMessage
                message={message}
                isOutbound={isOutbound}
                contactProfilePic={contactProfilePic}
                contactName={contactName}
            />
        );
    }

    // Get bubble classes based on position in group
    const getBubbleClasses = () => {
        if (message.is_internal) {
            return 'bg-[#fff9c4] dark:bg-[#ffe082]/20 border border-[#f57f17]/30 rounded-2xl shadow-sm mb-1';
        }
        if (isOutbound) {
            const base = 'bg-[#d9fdd3] dark:bg-[#005c4b]';
            let classes = `${base} rounded-l-2xl`;
            classes += isFirstInGroup ? ' rounded-tr-sm' : ' rounded-tr-2xl';
            classes += isLastInGroup ? ' rounded-br-2xl mb-1' : ' rounded-br-sm mb-0.5';
            return classes;
        } else {
            const base = 'bg-white dark:bg-[#202c33]';
            let classes = `${base} rounded-r-2xl`;
            classes += isFirstInGroup ? ' rounded-tl-sm' : ' rounded-tl-2xl';
            classes += isLastInGroup ? ' rounded-bl-2xl mb-1' : ' rounded-bl-sm mb-0.5';
            return classes;
        }
    };

    return (
        <>
            <div
                className={`flex w-full gap-2 group relative ${isOutbound ? 'justify-end' : 'justify-start'}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Avatar (Incoming Only - Show only on first message of group) */}
                {!isOutbound && isFirstInGroup && (
                    <div className="flex flex-col justify-start pt-1 flex-shrink-0">
                        <img
                            src={contactProfilePic || getInitialsAvatar(contactName)}
                            onError={(e) => { e.target.onerror = null; e.target.src = getInitialsAvatar(contactName); }}
                            className="w-6 h-6 rounded-full object-cover shadow-sm"
                            alt=""
                        />
                    </div>
                )}

                {/* Spacer for non-first messages in group */}
                {!isOutbound && !isFirstInGroup && <div className="w-6 flex-shrink-0" />}

                {/* Content Container + Menu Button Wrapper */}
                <div className={`flex gap-0.5 items-start max-w-[85%] md:max-w-[65%] ${isOutbound ? 'flex-row-reverse' : 'flex-row'}`}>

                    {/* Retry Indicator */}
                    <RetryIndicator
                        isOutbound={isOutbound}
                        status={message.status}
                        onRetry={onRetry}
                        message={message}
                    />

                    {/* The Message Bubble */}
                    <div className={`relative flex flex-col shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] ${getBubbleClasses()}`}>
                        {message.is_internal && (
                            <div className="flex items-center gap-1.5 px-2.5 pt-2 pb-0.5 text-[#f57f17] dark:text-[#ffd54f]">
                                <Lock className="w-3.5 h-3.5" />
                                <span className="text-[11px] font-bold uppercase tracking-wider">Internal Note</span>
                            </div>
                        )}
                        <div className="px-2 py-1.5 text-[14.2px] leading-[19px] text-[#111b21] dark:text-[#e9edef]">
                            {/* Group Sender Name */}
                            {!isOutbound && isGroupChat && isFirstInGroup && message.sender && message.sender !== 'agent' && message.sender !== 'system' && (
                                <div className="text-[11.5px] font-bold text-indigo-500 dark:text-indigo-400 mb-0.5 flex items-center gap-1">
                                    <span className="truncate max-w-[200px]">{String(message.sender).split('@')[0]}</span>
                                </div>
                            )}

                            {/* Quoted Message */}
                            <QuotedMessage message={message} />

                            {/* Media Content */}
                            <MessageContent
                                message={message}
                                isOutbound={isOutbound}
                                onLightbox={setLightboxSrc}
                            />

                            {/* Text Content - Hide for structured message types (contact, poll, event, location) */}
                            {message.content && (message.type === 'text' || message.type === 'image' || message.type === 'video') && (
                                <div className="break-words whitespace-pre-wrap min-w-[60px]">
                                    {/* Translation UI */}
                                    <TranslationUI
                                        message={message}
                                        isOutbound={isOutbound}
                                        translating={translating}
                                        showOriginal={showOriginal}
                                        setShowOriginal={setShowOriginal}
                                        onTranslate={handleTranslate}
                                    />

                                    {/* Main Text */}
                                    {(!message.original_content || isOutbound) && (
                                        <FormatText text={message.content} />
                                    )}
                                </div>
                            )}

                            {/* Meta Footer */}
                            <MessageMeta 
                                message={message} 
                                isOutbound={isOutbound}
                                isStarred={isStarred}
                                isPinned={isPinned}
                                showTime={showTime}
                            />
                        </div>

                        {/* Emoji Reactions */}
                        <EmojiReactions reactions={message.reactions} isOutbound={isOutbound} />
                    </div>

                    {/* Menu Button */}
                    {isLastInGroup && (
                        <MessageMenu
                            isOpen={menuOpen}
                            isStarred={isStarred}
                            isPinned={isPinned}
                            isOutbound={isOutbound}
                            canEdit={canEdit}
                            canRetry={canRetry}
                            status={message.status}
                            onClose={() => setMenuOpen(false)}
                            onEdit={onEdit ? () => onEdit(message) : undefined}
                            onStar={onStar ? () => onStar(message) : undefined}
                            onPin={onPin ? () => onPin(message) : undefined}
                            onInfo={onInfo ? () => onInfo(message) : undefined}
                            onCopy={onCopy ? () => onCopy(message) : undefined}
                            onReact={onReact ? () => onReact(message) : undefined}
                            onReply={onReply ? () => onReply(message) : undefined}
                            onForward={onForward ? () => onForward(message) : undefined}
                            onSaveToKb={onSaveToKb ? () => onSaveToKb(message) : undefined}
                            onDelete={onDelete ? () => onDelete(message.id) : undefined}
                            onRevoke={onRevoke ? () => onRevoke(message.id) : undefined}
                            onRetry={onRetry ? () => onRetry(message.id) : undefined}
                            onToggle={() => setMenuOpen(!menuOpen)}
                            isHovered={isHovered}
                            position={isLast ? 'top' : 'bottom'}
                        />
                    )}
                </div>
            </div>

            {/* Lightbox */}
            {lightboxSrc && (
                <MessageLightbox
                    src={lightboxSrc}
                    type={message.type}
                    onClose={() => setLightboxSrc(null)}
                    onForward={() => {
                        setLightboxSrc(null);
                        if (onForward) onForward(message);
                    }}
                />
            )}
        </>
    );
};

export default MessageBubble;
