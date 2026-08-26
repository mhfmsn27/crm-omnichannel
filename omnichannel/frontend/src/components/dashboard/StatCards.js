import React from 'react';
import { MessageCircle, Users, CheckCircle2, Clock } from 'lucide-react';

const Card = ({ title, value, subValue, icon: Icon, colorClass, trend }) => (
  <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex items-center justify-between group cursor-default">
    <div className="min-w-0 flex-1">
      <p className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wide mb-1">{title}</p>
      <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight group-hover:scale-105 transform origin-left transition-transform duration-300">{value ?? '—'}</h3>
      {subValue && (
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1.5 font-medium">
          {subValue}
        </p>
      )}
    </div>
    <div className={`p-4 rounded-2xl ${colorClass} bg-opacity-10 dark:bg-opacity-20 group-hover:bg-opacity-20 group-hover:scale-110 transition-all duration-300 ml-3 shrink-0`}>
      <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
    </div>
  </div>
);

export default function StatCards({ stats }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card
        title="Pesan Masuk Hari Ini"
        value={stats.incoming_today}
        subValue={`${stats.outgoing_today} pesan terkirim`}
        icon={MessageCircle}
        colorClass="bg-blue-500"
      />
      <Card
        title="Perlu Dibalas"
        value={stats.unreplied}
        subValue={`dari ${stats.open_conversations} chat aktif`}
        icon={Clock}
        colorClass="bg-orange-500"
      />
      <Card
        title="Diselesaikan Hari Ini"
        value={stats.resolved_today}
        subValue="Percakapan selesai"
        icon={CheckCircle2}
        colorClass="bg-green-500"
      />
      <Card
        title="Total Kontak"
        value={stats.total_contacts?.toLocaleString('id-ID')}
        subValue={`${stats.agents_online} agen online`}
        icon={Users}
        colorClass="bg-purple-500"
      />
    </div>
  );
}
