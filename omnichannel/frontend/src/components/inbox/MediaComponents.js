

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, FileText } from 'lucide-react';
import { getApiUrl } from '../../config/api';
import WaveformAudioPlayer, { formatTime } from './WaveformAudioPlayer.jsx';

export { formatTime };
export const AudioPlayer = WaveformAudioPlayer;

// --- COMPONENT: VIDEO PLAYER ---
export const VideoPlayer = ({ src }) => {
    return (
        <div className="rounded-lg overflow-hidden max-w-[280px] bg-black relative group">
            <video 
                src={getApiUrl(src)} 
                controls 
                className="w-full h-auto max-h-[250px]"
            />
            <a 
                href={getApiUrl(src)} 
                download
                target="_blank" 
                rel="noopener noreferrer"
                className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
                title="Download Video"
            >
                <Download className="w-4 h-4" />
            </a>
        </div>
    );
};

// --- COMPONENT: DOCUMENT CARD ---
export const DocumentCard = ({ src, filename, isOutbound }) => {
    const name = filename || src.split('/').pop();
    const ext = name.split('.').pop().toUpperCase();

    return (
        <div className={`flex items-center gap-3 p-3 border rounded-lg max-w-[280px] transition-colors ${isOutbound ? 'bg-indigo-700 border-indigo-500' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs shadow-sm flex-shrink-0">
                {ext.length > 4 ? 'DOC' : ext}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
                <p className={`text-sm font-medium truncate ${isOutbound ? 'text-white' : 'text-gray-800'}`} title={name}>{name}</p>
                <p className={`text-xs ${isOutbound ? 'text-indigo-200' : 'text-gray-500'}`}>Document • {ext}</p>
            </div>
            <a 
                href={getApiUrl(src)} 
                download={name}
                target="_blank" 
                rel="noopener noreferrer"
                className={`p-2 rounded-full shadow-sm transition-colors flex-shrink-0 ${isOutbound ? 'bg-indigo-500 text-white hover:bg-indigo-400' : 'bg-white text-gray-500 hover:text-gray-700 border border-gray-200'}`}
                title="Download"
                onClick={(e) => e.stopPropagation()}
            >
                <Download className="w-4 h-4" />
            </a>
        </div>
    );
};

