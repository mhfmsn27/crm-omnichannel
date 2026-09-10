import React from 'react';
import { MessageCircle, Users, CheckCircle2, Clock } from 'lucide-react';

const Card = ({ title, value, subValue, icon: Icon, colorClass }) => (
  <div className="bg-white dark:bg-[#1e293b] p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group cursor-default">
    {/* Top Row: Title + Icon Badge */}
    <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
      <p className="text-[11px] sm:text-xs text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider truncate">
        {title}
      </p>
      <div className={`p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl ${colorClass} bg-opacity-10 dark:bg-opacity-20 group-hover:bg-opacity-25 transition-all shrink-0`}>
        <Icon className={`w-3.5 h-3.5 sm:w-5 sm:h-5 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
    </div>

    {/* Metric Value */}
    <div>
      <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
        {value ?? '—'}
      </h3>
      {subValue && (
        <p className="text-[10px] sm:text-xs text-gray-400 dark:text-slate-500 mt-1 sm:mt-1.5 font-medium truncate">
          {subValue}
        </p>
      )}
    </div>
  </div>
);

export default function StatCards({ stats }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-6 md:mb-8">
      <Card
        title="Pesan Masuk"
        value={stats.incoming_today}
        subValue={`${stats.outgoing_today} pesan keluar`}
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
        title="Diselesaikan"
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
