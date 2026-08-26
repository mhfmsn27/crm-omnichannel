'use client';

import React from 'react';
import { Session } from '@/app/(dashboard)/playground/page'; 
import Button from '../ui/Button';
import { Trash2, MonitorSmartphone, Plus } from 'lucide-react';

interface DeviceListProps {
  sessions: Session[];
  selectedSession: Session | null;
  onSelect: (session: Session) => void;
  onAdd: () => void;
  onConnect: (session: Session) => void;
  onDelete: (session: Session) => void;
}

const DeviceList: React.FC<DeviceListProps> = ({ sessions, selectedSession, onSelect, onAdd, onConnect, onDelete }) => {
  const getStatusChip = (status: Session['status']) => {
    switch (status) {
      case 'CONNECTED':
        return <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">CONNECTED</span>;
      case 'NEED_QR':
        return <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full animate-pulse">NEED SCAN</span>;
      case 'INITIALIZING':
        return <span className="text-[10px] font-semibold text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded-full">CONNECTING</span>;
      default:
        return <span className="text-[10px] font-semibold text-gray-400 bg-gray-700/50 border border-gray-600 px-2 py-0.5 rounded-full">OFFLINE</span>;
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-white flex items-center">
            <MonitorSmartphone className="w-5 h-5 mr-2 text-cyan-400" />
            Devices
        </h2>
        <button onClick={onAdd} className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors">
            <Plus size={18} />
        </button>
      </div>
      
      <div className="space-y-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => onSelect(session)}
            className={`p-4 rounded-xl cursor-pointer transition-all border ${
              selectedSession?.id === session.id 
                ? 'bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`font-medium ${selectedSession?.id === session.id ? 'text-cyan-100' : 'text-gray-300'}`}>
                {session.name}
              </span>
              {getStatusChip(session.status)}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <button
                    onClick={(e) => { e.stopPropagation(); onConnect(session); }}
                    className={`text-xs font-medium transition-colors ${
                        session.status === 'CONNECTED' 
                        ? 'text-emerald-400 hover:text-emerald-300' 
                        : 'text-cyan-400 hover:text-cyan-300'
                    }`}
                >
                    {session.status === 'CONNECTED' ? 'Reconnect' : 'Connect / Get QR'}
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(session); }}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                >
                    <Trash2 size={14} />
                </button>
            </div>
          </div>
        ))}
        {sessions.length === 0 && (
            <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-700 rounded-xl">
                <p className="text-sm">No devices found.</p>
                <p className="text-xs mt-1">Add one to start messaging.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default DeviceList;
