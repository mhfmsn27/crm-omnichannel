'use client';

import React, { useState } from 'react';
import { Message } from '@/app/(dashboard)/playground/page';
import publicApi from '@/lib/publicApi';
import { FileImage, Video, Paperclip, MapPin, Music, Download, Forward, AlertCircle } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  apiKey: string;
  sessionId: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, apiKey, sessionId }) => {
  const isFromMe = message.key.fromMe;
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const formatFileSize = (bytes?: number | { low: number } | null) => {
    if (!bytes) return '';
    const size = typeof bytes === 'number' ? bytes : (typeof bytes === 'object' && bytes && 'low' in bytes ? (bytes as any).low : 0);
    if (size === 0) return '';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return parseFloat((size / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const downloadMedia = async (mimetype: string) => {
    if (mediaUrl || isLoadingMedia) return;
    setIsLoadingMedia(true);
    setMediaError(null);
    try {
        const response = await publicApi.post('/api/v1/message/download-media', 
          { message, sessionId }, 
          { headers: { Authorization: `Bearer ${apiKey}` } }
        );
        setMediaUrl(`data:${mimetype};base64,${response.data.base64}`);
    } catch (error: any) {
        console.error("Failed to download media", error);
        const errorMsg = error.response?.data?.message || "Media expired or unavailable";
        setMediaError(errorMsg);
        alert(errorMsg);
    } finally {
        setIsLoadingMedia(false);
    }
  };

  const handleForward = async () => {
      const destination = prompt("Enter destination number (e.g., 62812...):");
      if (!destination) return;

      setIsForwarding(true);
      try {
          await publicApi.post('/api/v1/message/forward', {
              sessionId,
              to: destination,
              message: message
          }, {
              headers: { Authorization: `Bearer ${apiKey}` }
          });
          alert("Message forwarded successfully!");
      } catch (error: any) {
          console.error("Forward failed", error);
          alert(`Forward failed: ${error.response?.data?.message || error.message}`);
      } finally {
          setIsForwarding(false);
      }
  };

  const renderContent = () => {
    const msg = message.message;
    if (!msg) return <p className="italic text-gray-400 text-xs">[Status Update / Unknown]</p>;

    // Handle Ephemeral Messages (Disappearing messages)
    const contentMsg = msg.ephemeralMessage?.message || msg;

    const textContent = contentMsg.conversation || contentMsg.extendedTextMessage?.text;
    if (textContent) return <p className="whitespace-pre-wrap break-words text-sm text-white/90">{textContent}</p>;
    
    // 1. Image
    if (contentMsg.imageMessage) {
      const img = contentMsg.imageMessage;
      const caption = img.caption;
      const mimetype = img.mimetype || 'image/jpeg';
      const fileSize = formatFileSize(img.fileLength);
      
      return (
          <div className="space-y-1 min-w-[200px]">
              {mediaUrl ? (
                  <img src={mediaUrl} alt="Received media" className="rounded-md max-w-full cursor-pointer hover:opacity-95 border border-white/10" onClick={() => window.open(mediaUrl, '_blank')}/>
              ) : (
                  <div className={`p-4 rounded-md text-center cursor-pointer flex flex-col items-center justify-center border transition-colors ${isFromMe ? 'bg-cyan-700/50 border-cyan-500/30 hover:bg-cyan-700/70' : 'bg-gray-700/50 border-gray-600/30 hover:bg-gray-700/70'}`} onClick={() => downloadMedia(mimetype)}>
                      {isLoadingMedia ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mb-1"></div>
                      ) : mediaError ? (
                          <AlertCircle className="text-red-400 mb-1" /> 
                      ) : (
                          <FileImage size={32} className="mb-1 opacity-80 text-white" />
                      )}
                      <span className="text-xs font-medium text-gray-200">{mediaError ? 'Failed' : `Load Image (${fileSize})`}</span>
                  </div>
              )}
              {caption && <p className="text-sm mt-1 text-white/90">{caption}</p>}
          </div>
      );
    }

    // 2. Video
    if (contentMsg.videoMessage) {
        const vid = contentMsg.videoMessage;
        const caption = vid.caption;
        const mimetype = vid.mimetype || 'video/mp4';
        const fileSize = formatFileSize(vid.fileLength);

        return (
            <div className="space-y-1 min-w-[200px]">
                {mediaUrl ? (
                    <video src={mediaUrl} controls className="rounded-md max-w-full border border-white/10" />
                ) : (
                    <div className={`p-4 rounded-md text-center cursor-pointer flex flex-col items-center justify-center border transition-colors ${isFromMe ? 'bg-cyan-700/50 border-cyan-500/30 hover:bg-cyan-700/70' : 'bg-gray-700/50 border-gray-600/30 hover:bg-gray-700/70'}`} onClick={() => downloadMedia(mimetype)}>
                        {isLoadingMedia ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mb-1"></div>
                        ) : mediaError ? (
                           <AlertCircle className="text-red-400 mb-1" />
                        ) : (
                            <Video size={32} className="mb-1 opacity-80 text-white" />
                        )}
                        <span className="text-xs font-medium text-gray-200">{mediaError ? 'Failed' : `Load Video (${fileSize})`}</span>
                    </div>
                )}
                {caption && <p className="text-sm mt-1 text-white/90">{caption}</p>}
            </div>
        );
    }

    // 3. Audio
    if (contentMsg.audioMessage) {
        const aud = contentMsg.audioMessage;
        const mimetype = aud.mimetype || 'audio/mp4';
        const duration = aud.seconds ? `${aud.seconds}s` : '';
        
        return (
            <div className="min-w-[240px]">
                {mediaUrl ? (
                    <audio src={mediaUrl} controls className="w-full h-8 mt-1" />
                ) : (
                    <div className={`flex items-center gap-3 p-2 cursor-pointer rounded-md transition-colors ${isFromMe ? 'hover:bg-cyan-700/50' : 'hover:bg-gray-700/50'}`} onClick={() => downloadMedia(mimetype)}>
                         {isLoadingMedia ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Music size={24} className="text-white/80" />}
                         <div className="flex flex-col">
                             <span className="text-sm font-medium text-white">{mediaError ? 'Failed to load' : 'Play Audio'}</span>
                             <span className="text-[10px] opacity-70 text-gray-300">{duration} • {formatFileSize(aud.fileLength)}</span>
                         </div>
                    </div>
                )}
            </div>
        );
    }

    // 4. Document
    if (contentMsg.documentMessage) {
        const doc = contentMsg.documentMessage;
        const filename = doc.fileName || 'document';
        const mimetype = doc.mimetype || 'application/octet-stream';
        const fileSize = formatFileSize(doc.fileLength);

        return (
            <div className="min-w-[200px]">
                {mediaUrl ? (
                    <a href={mediaUrl} download={filename} className={`flex items-center gap-3 p-3 rounded-md ${isFromMe ? 'bg-cyan-700/30 hover:bg-cyan-700/50' : 'bg-gray-700/30 hover:bg-gray-700/50'}`}>
                        <Download size={24} className="text-white/80" />
                        <div className="text-left overflow-hidden">
                            <p className="text-sm font-medium truncate max-w-[150px] text-white">{filename}</p>
                            <p className="text-[10px] opacity-80 uppercase text-gray-300">{mimetype.split('/')[1]} • {fileSize}</p>
                        </div>
                    </a>
                ) : (
                    <div className={`flex items-center gap-3 p-3 cursor-pointer rounded-md border ${isFromMe ? 'bg-cyan-700/20 border-cyan-500/20 hover:bg-cyan-700/30' : 'bg-gray-700/20 border-gray-600/20 hover:bg-gray-700/30'}`} onClick={() => downloadMedia(mimetype)}>
                        {isLoadingMedia ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Paperclip size={24} className="text-white/80" />}
                        <div className="text-left overflow-hidden">
                            <p className="text-sm font-medium truncate max-w-[150px] text-white">{filename}</p>
                            <p className="text-[10px] opacity-80 text-gray-300">{mediaError ? 'Download Failed' : `Download (${fileSize})`}</p>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 5. Sticker
    if (contentMsg.stickerMessage) {
         const sticker = contentMsg.stickerMessage;
         const mimetype = sticker.mimetype || 'image/webp';
         return (
            <div>
                {mediaUrl ? (
                    <img src={mediaUrl} alt="Sticker" className="w-24 h-auto object-contain" />
                ) : (
                    <div className={`p-2 rounded-md text-center cursor-pointer text-xs border ${isFromMe ? 'bg-cyan-700/20 border-cyan-500/20 text-cyan-100' : 'bg-gray-700/20 border-gray-600/20 text-gray-300'}`} onClick={() => downloadMedia(mimetype)}>
                        {isLoadingMedia ? 'Loading...' : '[ Sticker - Click to Load ]'}
                    </div>
                )}
            </div>
         )
    }

    // 6. Location
    if (contentMsg.locationMessage) {
        const { degreesLatitude: lat, degreesLongitude: lon } = contentMsg.locationMessage;
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
        return (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={`block p-1 rounded-md transition-colors ${isFromMe ? 'hover:bg-cyan-700/20' : 'hover:bg-gray-700/20'}`}>
                <div className="flex items-center gap-2 mb-1 px-2 pt-1 text-white">
                    <MapPin size={16} />
                    <span className="text-xs font-bold">Location</span>
                </div>
                {/* Placeholder for map */}
                <div className="bg-gray-700 h-24 w-full rounded flex items-center justify-center text-gray-400 text-xs border border-white/5">
                    Map Preview
                </div>
                <p className="text-[10px] opacity-80 px-2 pb-1 mt-1 text-gray-300">{lat?.toFixed(5)}, {lon?.toFixed(5)}</p>
            </a>
        );
    }
    
    // 7. Buttons / Templates
    if (contentMsg.buttonsMessage || contentMsg.templateButtonReplyMessage || contentMsg.viewOnceMessage) {
        const viewOnce = contentMsg.viewOnceMessage?.message;
        if(viewOnce) {
            if(viewOnce.imageMessage) return <p className="italic text-xs text-gray-400">[View Once Image]</p>;
            if(viewOnce.videoMessage) return <p className="italic text-xs text-gray-400">[View Once Video]</p>;
        }

        const text = contentMsg.buttonsMessage?.contentText || contentMsg.templateButtonReplyMessage?.selectedDisplayText || '[Complex Message Type]';
        return <p className="text-sm text-white/90">{text}</p>;
    }

    return <p className="italic text-xs opacity-70 text-gray-400">[Unsupported message type]</p>;
  };
  
  const getTimestamp = () => {
    const ts = message.messageTimestamp;
    if (!ts) return '';
    const numericTs = typeof ts === 'object' && 'low' in ts ? Number(ts.low) : Number(ts);
    if(isNaN(numericTs)) return '';
    return new Date(numericTs * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex items-end gap-2 mb-2 ${isFromMe ? 'justify-end' : 'justify-start'}`}>
      {!isFromMe && ( <div className="w-6 h-6 rounded-full bg-gray-600/50 flex-shrink-0 flex items-center justify-center text-[10px] text-gray-300 font-bold select-none border border-gray-500/30">?</div> )}
      
      {/* Wrapper Bubble */}
      <div className={`relative group max-w-[85%] lg:max-w-[70%]`}>
          
          {/* Action Buttons (Hover) */}
          <div className={`absolute top-0 ${isFromMe ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1`}>
             <button 
                onClick={handleForward} 
                disabled={isForwarding}
                className="p-1.5 bg-gray-700 rounded-full hover:bg-gray-600 text-gray-300 shadow-sm border border-gray-600" 
                title="Forward Message"
             >
                {isForwarding ? <div className="animate-spin h-3 w-3 border-b-2 border-gray-400 rounded-full"></div> : <Forward size={14} />}
             </button>
          </div>

          <div className={`p-2 rounded-lg shadow-md relative border ${
            isFromMe 
                ? 'bg-cyan-600/90 border-cyan-500/50 text-white rounded-tr-none backdrop-blur-sm' 
                : 'bg-gray-800/90 border-gray-700/50 text-white rounded-tl-none backdrop-blur-sm'
          }`}>
            {renderContent()}
            <div className={`text-[9px] text-right mt-1 ${isFromMe ? 'text-cyan-100/70' : 'text-gray-400'}`}>
              {getTimestamp()}
            </div>
          </div>
      </div>
    </div>
  );
};

export default MessageBubble;
