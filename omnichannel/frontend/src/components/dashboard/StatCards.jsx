import React from 'react';
import { MessageCircle, Users, CheckCircle2, Clock } from 'lucide-react';

/**
 * StatCard - Individual stat card component
 */
const StatCard = ({ title, value, subValue, icon: Icon, colorClass, className = '' }) => (
  <div className={`bg-white dark:bg-[#1e293b] p-4 md:p-5 rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm hover:shadow-md transition-all flex items-center justify-between group ${className}`}>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] md:text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wide mb-1">
        {title}
      </p>
      <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
        {value ?? '—'}
      </h3>
      {subValue && (
        <p className="text-[10px] md:text-xs text-gray-400 dark:text-slate-500 mt-1 font-medium">
          {subValue}
        </p>
      )}
    </div>
    <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl ${colorClass} bg-opacity-10 dark:bg-opacity-20 group-hover:bg-opacity-20 transition-all ml-2 md:ml-3 shrink-0`}>
      <Icon className={`w-5 h-5 md:w-6 md:h-6 ${colorClass.replace('bg-', 'text-')}`} />
    </div>
  </div>
);

/**
 * StatCards - Statistics cards grid
 *
 * Responsive layout:
 * - Mobile: 2 columns
 * - Tablet (md): 2 columns
 * - Desktop (lg): 4 columns
 */
export default function StatCards({ stats }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
      <StatCard
        title="Pesan Masuk Hari Ini"
        value={stats.incoming_today}
        subValue={`${stats.outgoing_today} pesan terkirim`}
        icon={MessageCircle}
        colorClass="bg-blue-500"
      />
      <StatCard
        title="Perlu Dibalas"
        value={stats.unreplied}
        subValue={`dari ${stats.open_conversations} chat aktif`}
        icon={Clock}
        colorClass="bg-orange-500"
      />
      <StatCard
        title="Diselesaikan Hari Ini"
        value={stats.resolved_today}
        subValue="Percakapan selesai"
        icon={CheckCircle2}
        colorClass="bg-green-500"
      />
      <StatCard
        title="Total Kontak"
        value={stats.total_contacts?.toLocaleString('id-ID')}
        subValue={`${stats.agents_online} agen online`}
        icon={Users}
        colorClass="bg-purple-500"
      />
    </div>
  );
}
