'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Session, Message } from '@/app/(dashboard)/playground/page';
import Input from '../ui/Input';
import Button from '../ui/Button';
import MessageBubble from './MessageBubble';
import RefreshContactModal from './RefreshContactModal';
import publicApi from '@/lib/publicApi';
import { Send, Paperclip, MapPin, User, Image as ImageIcon, FileText, Film, Mic, RefreshCw } from 'lucide-react';

interface ChatWindowProps {
  session: Session | null;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  apiKey: string;
}

type Tab = 'Text' | 'Media' | 'Location' | 'Contact';

const ChatWindow: React.FC<ChatWindowProps> = ({ session, messages, setMessages, apiKey }) => {
  const [recipient, setRecipient] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('Text');
  const [isSending, setIsSending] = useState(false);
  const [isRefreshModalOpen, setRefreshModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Form States
  const [textMessage, setTextMessage] = useState('');
  
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | 'document'>('image');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaFilename, setMediaFilename] = useState('');

  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleApiCall = async (endpoint: string, payload: any) => {
    if (!session || !recipient) {
        alert('Please select a device and enter a recipient number.');
        return;
    }
    setIsSending(true);
    try {
      const response = await publicApi.post(endpoint, { sessionId: session.id, to: recipient, ...payload }, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      // Optimistic update for text messages
      if (endpoint.includes('send-text')) {
        const sentMessage: Message = {
          key: { remoteJid: `${recipient}@s.whatsapp.net`, fromMe: true, id: response.data.details?.key?.id || 'temp-id' },
          message: { conversation: payload.text },
          messageTimestamp: Math.floor(Date.now() / 1000),
        };
        setMessages(prev => [sentMessage, ...prev]);
        setTextMessage('');
      } else {
          alert('Message sent successfully!');
          // Reset forms
          setMediaUrl(''); setMediaCaption('');
          setLatitude(''); setLongitude('');
          setContactName(''); setContactPhone('');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsSending(false);
    }
  };

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 min-h-[600px] glass-panel rounded-2xl">
        <h3 className="text-xl font-semibold text-white">No Device Selected</h3>
        <p className="mt-2 text-sm">Please select or add a device from the list on the left.</p>
      </div>
    );
  }

  if (session.status !== 'CONNECTED') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 min-h-[600px] glass-panel rounded-2xl">
        <h3 className="text-xl font-semibold text-white">{`Device "${session.name}" Offline`}</h3>
        <p className="mt-2 text-sm">Please connect the device to start testing the API.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[80vh] glass-panel rounded-2xl overflow-hidden border border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-black/20 flex items-center justify-between backdrop-blur-md">
        <div>
            <h2 className="text-lg font-bold text-white">{session.name}</h2>
            <p className="text-xs text-emerald-400 font-medium flex items-center">
                <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></span>
                Connected
            </p>
        </div>
        <div className="flex items-center gap-3 w-2/5">
             <Input
                placeholder="Recipient (e.g. 62812...)"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="flex-grow !bg-black/40 !border-white/10 focus:!border-cyan-500 text-white"
            />
            {/* Refresh Contact Button */}
            <button
                onClick={() => setRefreshModalOpen(true)}
                className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors border border-cyan-500/20"
                title="Refresh contact session to fix 'waiting for this message'"
            >
                <RefreshCw size={16} />
            </button>
        </div>
      </div>
      
      {/* Messages Area */}
      <div className="flex-grow p-4 overflow-y-auto bg-[#0b141a]/50 flex flex-col-reverse" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundBlendMode: 'overlay' }}>
        <div ref={messagesEndRef} />
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <MessageBubble 
                key={`${msg.key.id}-${index}`} 
                message={msg} 
                apiKey={apiKey} 
                sessionId={session.id} 
            />
          ))}
          {messages.length === 0 && (
              <div className="text-center py-10 text-gray-500 italic text-sm">
                  No messages yet. Send one to start testing!
              </div>
          )}
        </div>
      </div>
      
      {/* Input Area */}
      <div className="bg-[#1e293b]/90 backdrop-blur-lg border-t border-white/5">
        {/* Tabs */}
        <div className="flex border-b border-white/5">
           {['Text', 'Media', 'Location', 'Contact'].map((tab) => (
               <button 
                key={tab}
                onClick={() => setActiveTab(tab as Tab)} 
                className={`flex-1 py-3 text-xs font-medium flex items-center justify-center transition-colors
                    ${activeTab === tab 
                        ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/5' 
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
               >
                   {tab === 'Text' && <FileText size={14} className="mr-2" />}
                   {tab === 'Media' && <Paperclip size={14} className="mr-2" />}
                   {tab === 'Location' && <MapPin size={14} className="mr-2" />}
                   {tab === 'Contact' && <User size={14} className="mr-2" />}
                   {tab}
               </button>
           ))}
        </div>

        {/* Forms */}
        <div className="p-4">
            {activeTab === 'Text' && (
                <div className="flex items-center gap-3">
                    <Input 
                        className="flex-grow !bg-black/40 !border-white/10 text-white" 
                        placeholder="Type a message..." 
                        value={textMessage} 
                        onChange={(e) => setTextMessage(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleApiCall('/api/v1/message/send-text', { text: textMessage })}
                    />
                    <Button 
                        onClick={() => handleApiCall('/api/v1/message/send-text', { text: textMessage })} 
                        isLoading={isSending}
                        disabled={!textMessage}
                        className="bg-cyan-600 hover:bg-cyan-500"
                    >
                        <Send size={18} />
                    </Button>
                </div>
            )}

            {activeTab === 'Media' && (
                <div className="space-y-4">
                    <div className="flex gap-4 text-gray-300 text-sm">
                        <label className="flex items-center cursor-pointer hover:text-white">
                            <input type="radio" name="mediaType" className="mr-2 accent-cyan-500" checked={mediaType === 'image'} onChange={() => setMediaType('image')} />
                            <ImageIcon size={16} className="mr-1"/> Image
                        </label>
                        <label className="flex items-center cursor-pointer hover:text-white">
                            <input type="radio" name="mediaType" className="mr-2 accent-cyan-500" checked={mediaType === 'video'} onChange={() => setMediaType('video')} />
                            <Film size={16} className="mr-1"/> Video
                        </label>
                        <label className="flex items-center cursor-pointer hover:text-white">
                            <input type="radio" name="mediaType" className="mr-2 accent-cyan-500" checked={mediaType === 'audio'} onChange={() => setMediaType('audio')} />
                            <Mic size={16} className="mr-1"/> Audio
                        </label>
                        <label className="flex items-center cursor-pointer hover:text-white">
                            <input type="radio" name="mediaType" className="mr-2 accent-cyan-500" checked={mediaType === 'document'} onChange={() => setMediaType('document')} />
                            <FileText size={16} className="mr-1"/> Document
                        </label>
                    </div>
                    <Input label="Media URL" className="!bg-black/40 !border-white/10 text-white" placeholder="https://example.com/image.jpg" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} />
                    {mediaType !== 'audio' && (
                         <Input label="Caption" className="!bg-black/40 !border-white/10 text-white" placeholder="Enter caption..." value={mediaCaption} onChange={(e) => setMediaCaption(e.target.value)} />
                    )}
                    {mediaType === 'document' && (
                         <Input label="Filename" className="!bg-black/40 !border-white/10 text-white" placeholder="document.pdf" value={mediaFilename} onChange={(e) => setMediaFilename(e.target.value)} />
                    )}
                    <Button 
                        className="w-full bg-cyan-600 hover:bg-cyan-500" 
                        onClick={() => handleApiCall('/api/v1/message/send-media', { mediaType, url: mediaUrl, caption: mediaCaption, filename: mediaFilename })}
                        isLoading={isSending}
                        disabled={!mediaUrl}
                    >
                        Send Media
                    </Button>
                </div>
            )}

            {activeTab === 'Location' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Latitude" className="!bg-black/40 !border-white/10 text-white" placeholder="-6.200000" type="number" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
                        <Input label="Longitude" className="!bg-black/40 !border-white/10 text-white" placeholder="106.816666" type="number" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
                    </div>
                    <Button 
                        className="w-full bg-cyan-600 hover:bg-cyan-500" 
                        onClick={() => handleApiCall('/api/v1/message/send-location', { latitude: parseFloat(latitude), longitude: parseFloat(longitude) })}
                        isLoading={isSending}
                        disabled={!latitude || !longitude}
                    >
                        Send Location
                    </Button>
                </div>
            )}

            {activeTab === 'Contact' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Name" className="!bg-black/40 !border-white/10 text-white" placeholder="John Doe" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                        <Input label="Phone Number" className="!bg-black/40 !border-white/10 text-white" placeholder="628..." type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                    </div>
                    <Button 
                        className="w-full bg-cyan-600 hover:bg-cyan-500" 
                        onClick={() => handleApiCall('/api/v1/message/send-contact', { name: contactName, phone: contactPhone })}
                        isLoading={isSending}
                        disabled={!contactName || !contactPhone}
                    >
                        Send Contact
                    </Button>
                </div>
            )}
        </div>
      </div>

      {/* Refresh Contact Modal */}
      <RefreshContactModal
        isOpen={isRefreshModalOpen}
        onClose={() => setRefreshModalOpen(false)}
        sessionId={session.id}
        apiKey={apiKey}
        currentRecipient={recipient}
      />
    </div>
  );
};

export default ChatWindow;
