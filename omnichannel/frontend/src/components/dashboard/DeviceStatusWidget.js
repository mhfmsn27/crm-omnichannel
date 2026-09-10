import React, { useState } from 'react';
import { 
    AlertCircle, CheckCircle, RefreshCw, PlusCircle 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getApiUrl } from '../../config/api';

const ChannelTab = ({ iconPath, active, onClick, colorClass }) => (
    <button 
        type="button"
        onClick={onClick}
        className={`shrink-0 w-10 h-10 min-w-[40px] flex items-center justify-center rounded-xl active:scale-95 transition-all ${
            active 
            ? `${colorClass} text-white shadow-md ring-2 ring-offset-2 ring-emerald-500 dark:ring-offset-[#1e293b]` 
            : 'bg-gray-50 dark:bg-[#0f172a] hover:bg-gray-100 dark:hover:bg-[#334155] border border-gray-100 dark:border-slate-800'
        }`}
    >
        <img src={getApiUrl(iconPath)} alt="tab" className="w-5 h-5 object-contain" />
    </button>
);

const StatusBadge = ({ status }) => {
    const s = status?.toLowerCase();
    if (s === 'connected') return (
        <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full flex items-center gap-1 border border-green-200 dark:border-green-800 shrink-0 whitespace-nowrap">
            <CheckCircle className="w-3 h-3 shrink-0" /> Online
        </span>
    );
    if (s === 'disconnected') return (
        <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full flex items-center gap-1 border border-red-200 dark:border-red-800 shrink-0 whitespace-nowrap">
            <AlertCircle className="w-3 h-3 shrink-0" /> Offline
        </span>
    );
    return (
        <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-full flex items-center gap-1 border border-orange-200 dark:border-orange-800 shrink-0 whitespace-nowrap">
            <RefreshCw className="w-3 h-3 animate-spin shrink-0" /> {status}
        </span>
    );
};

// Helper to get icon based on type
const getIconPath = (type) => {
    switch(type) {
        case 'whatsapp': return '/icons/whatsapp-unofficial.svg';
        case 'whatsapp_official': return '/icons/whatsapp-official.svg';
        case 'messenger': return '/icons/messenger.svg';
        case 'instagram': return '/icons/instagram.svg';
        case 'telegram': return '/icons/telegram.svg';
        case 'webchat': return '/icons/webchat.svg';
        default: return '/icons/device.svg';
    }
};

export default function DeviceStatusWidget({ devices }) {
  const [activeTab, setActiveTab] = useState('all');

  const tabs = [
      { id: 'all', icon: '/icons/device.svg', color: 'bg-gray-800' },
      { id: 'whatsapp', icon: '/icons/whatsapp-official.svg', color: 'bg-green-500' },
      { id: 'messenger', icon: '/icons/messenger.svg', color: 'bg-blue-600' },
      { id: 'instagram', icon: '/icons/instagram.svg', color: 'bg-pink-500' },
      { id: 'telegram', icon: '/icons/telegram.svg', color: 'bg-sky-500' },
      { id: 'webchat', icon: '/icons/webchat.svg', color: 'bg-orange-500' },
  ];

  const filteredDevices = activeTab === 'all' 
    ? devices 
    : devices?.filter(d => {
        if (activeTab === 'whatsapp') return d.type === 'whatsapp' || d.type === 'whatsapp_official';
        return d.type === activeTab;
    });

  return (
    <div className="bg-white dark:bg-[#1e293b] p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm h-full flex flex-col transition-colors duration-200">
      <div className="flex justify-between items-center mb-4">
        <div>
            <h3 className="font-bold text-gray-800 dark:text-white text-base sm:text-lg">Status Saluran</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">Monitor koneksi perangkat</p>
        </div>
        <Link 
            to="/integrations" 
            className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 active:scale-95 transition-all"
            title="Kelola Integrasi"
        >
            <PlusCircle className="w-5 h-5" />
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
          {tabs.map(tab => (
              <ChannelTab 
                key={tab.id} 
                iconPath={tab.icon} 
                active={activeTab === tab.id} 
                onClick={() => setActiveTab(tab.id)} 
                colorClass={tab.color}
              />
          ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar min-h-[200px]">
        {filteredDevices && filteredDevices.length > 0 ? (
            filteredDevices.map((device, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 sm:p-3 bg-white dark:bg-[#0f172a] border border-gray-100 dark:border-[#334155] rounded-xl hover:border-indigo-100 dark:hover:border-indigo-900 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 mr-2">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-slate-700">
                             <img src={getApiUrl(getIconPath(device.type))} alt={device.type} className="w-5 h-5 object-contain" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-slate-200 truncate">{device.name}</p>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-500 font-mono truncate">{device.info || '—'}</p>
                        </div>
                    </div>
                    <StatusBadge status={device.status} />
                </div>
            ))
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-8">
                <div className="w-12 h-12 bg-gray-50 dark:bg-[#0f172a] rounded-full flex items-center justify-center mb-2">
                    <AlertCircle className="w-6 h-6 text-gray-300 dark:text-slate-600" />
                </div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">Tidak ada perangkat ditemukan.</p>
                <Link to="/integrations" className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold">
                    Tambah Saluran Baru
                </Link>
            </div>
        )}
      </div>
    </div>
  );
}
