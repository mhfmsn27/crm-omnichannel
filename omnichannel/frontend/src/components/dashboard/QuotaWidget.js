import React from 'react';
import { Zap } from 'lucide-react';

export default function QuotaWidget({ quota }) {
  if (!quota) return null;
  
  const percentage = Math.min(100, Math.round((quota.broadcast_used / quota.broadcast_limit) * 100));
  const isLow = percentage > 80;

  return (
    <div className="bg-indigo-800 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg text-white h-full flex flex-col justify-between relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
         <Zap className="w-20 h-20 sm:w-24 sm:h-24" />
      </div>

      <div>
        <h3 className="font-bold text-base sm:text-lg mb-1">Kuota Siaran</h3>
        <p className="text-indigo-200 text-xs sm:text-sm">Batas Pemakaian Bulanan</p>
      </div>

      <div className="mt-4 sm:mt-6">
         <div className="flex justify-between text-xs sm:text-sm font-medium mb-2">
            <span>{quota.broadcast_used.toLocaleString('id-ID')} Terkirim</span>
            <span className="opacity-70">Batas: {quota.broadcast_limit.toLocaleString('id-ID')}</span>
         </div>
         <div className="w-full bg-white/10 rounded-full h-2.5 sm:h-3 overflow-hidden">
            <div 
                className={`h-2.5 sm:h-3 rounded-full transition-all duration-1000 ${isLow ? 'bg-red-500' : 'bg-indigo-400'}`} 
                style={{ width: `${percentage}%` }}
            ></div>
         </div>
         {isLow && (
             <p className="text-[11px] sm:text-xs text-red-300 mt-2 font-bold flex items-center gap-1">
                 ⚠️ Kuota hampir habis! Tingkatkan paket Anda.
             </p>
         )}
      </div>

      <button className="mt-5 sm:mt-6 w-full py-2.5 bg-white text-indigo-900 font-bold rounded-xl text-xs sm:text-sm hover:bg-indigo-50 active:scale-95 transition-all shadow-sm">
          Upgrade Paket
      </button>
    </div>
  );
}
