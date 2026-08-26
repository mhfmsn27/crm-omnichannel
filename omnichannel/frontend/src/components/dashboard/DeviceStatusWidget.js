
import React, { useState } from 'react';
import { 
    AlertCircle, CheckCircle, RefreshCw, PlusCircle 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getApiUrl } from '../../config/api';

const ChannelTab = ({ iconPath, active, onClick, colorClass }) => (
    <button 
        onClick={onClick}
        className={`flex items-center justify-center p-2.5 rounded-lg transition-all ${
            active 
            ? `${colorClass} text-white shadow-md` 
            : 'bg-gray-50 dark:bg-[#0f172a] hover:bg-gray-100 dark:hover:bg-[#334155]'
        }`}
    >
        <img src={getApiUrl(iconPath)} alt="tab" className="w-5 h-5" />
    </button>
);

const StatusBadge = ({ status }) => {
    const s = status?.toLowerCase();
    if (s === 'connected') return <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full flex items-center gap-1 border border-green-100 dark:border-green-800"><CheckCircle className="w-3 h-3"/> Online</span>;
    if (s === 'disconnected') return <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full flex items-center gap-1 border border-red-100 dark:border-red-800"><AlertCircle className="w-3 h-3"/> Offline</span>;
    return <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-full flex items-center gap-1 border border-orange-100 dark:border-orange-800"><RefreshCw className="w-3 h-3 animate-spin"/> {status}</span>;
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
    <div className="bg-white dark:bg-[#1e293b] p-6 rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm h-full flex flex-col transition-colors duration-200">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h3 className="font-bold text-gray-800 dark:text-white text-lg">Connected Channels</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">Monitor connection status</p>
        </div>
        <Link to="/integrations" className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
            <PlusCircle className="w-5 h-5" />
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
          {tabs.map(tab => (
              <ChannelTab 
                key={tab.id} 
                iconPath={tab.icon} 
                active={activeTab === tab.id} 
                color={tab.color}
                onClick={() => setActiveTab(tab.id)} 
                colorClass={tab.color}
              />
          ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar min-h-[200px]">
        {filteredDevices && filteredDevices.length > 0 ? (
            filteredDevices.map((device, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-[#0f172a] border border-gray-100 dark:border-[#334155] rounded-xl hover:border-indigo-100 dark:hover:border-indigo-900 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-gray-50 dark:bg-gray-800`}>
                             <img src={getApiUrl(getIconPath(device.type))} alt={device.type} className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-800 dark:text-slate-200 truncate">{device.name}</p>
                            <p className="text-[10px] text-gray-500 dark:text-slate-500 font-mono truncate max-w-[120px]">{device.info}</p>
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
                <p className="text-sm text-gray-500 dark:text-slate-400">No devices found.</p>
                <Link to="/integrations" className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold">Add Connection</Link>
            </div>
        )}
      </div>
    </div>
  );
}

