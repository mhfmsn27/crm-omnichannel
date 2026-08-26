
import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, CreditCard, ShieldCheck, AlertTriangle, ArrowRight, Crown } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';

export default function SubscriptionBanner({ subscription }) {
    if (!subscription) return null;

    const { status, trial_ends_at, expires_at, plan_name } = subscription;
    const today = new Date();

    // --- TRIAL STATE ---
    if (status === 'trialing') {
        const daysLeft = differenceInDays(new Date(trial_ends_at), today);
        const isUrgent = daysLeft <= 3;

        return (
            <div className={`mb-6 p-1 rounded-2xl ${isUrgent ? 'bg-orange-400' : 'bg-indigo-400'}`}>
                <div className="bg-white dark:bg-[#1e293b] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${isUrgent ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                                Free Trial Active <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full uppercase tracking-wide border border-gray-200 dark:border-slate-600">{plan_name}</span>
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-slate-400">
                                You have <span className={`font-bold ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'}`}>{Math.max(0, daysLeft)} days remaining</span> to explore premium features.
                            </p>
                        </div>
                    </div>
                    <Link 
                        to="/order" 
                        className={`group px-6 py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] flex items-center gap-2 ${isUrgent ? 'bg-orange-500' : 'bg-gray-900 hover:bg-black dark:bg-indigo-600 dark:hover:bg-indigo-700'}`}
                    >
                        <CreditCard className="w-4 h-4" /> Upgrade Now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
        );
    }

    // --- ACTIVE STATE ---
    if (status === 'active') {
        const daysLeft = expires_at ? differenceInDays(new Date(expires_at), today) : 999;
        const isExpiringSoon = daysLeft <= 7;

        return (
            <div className={`mb-6 p-5 rounded-xl border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 ${isExpiringSoon ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700/50' : 'bg-white border-gray-100 dark:bg-[#1e293b] dark:border-[#334155]'}`}>
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${isExpiringSoon ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
                        {isExpiringSoon ? <AlertTriangle className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            Subscription Active 
                            <span className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800 px-2 py-0.5 rounded-full font-bold uppercase">
                                <Crown className="w-3 h-3" /> {plan_name}
                            </span>
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                            {isExpiringSoon 
                                ? <span className="text-red-600 dark:text-red-400 font-bold">Expires in {daysLeft} days. Please renew soon!</span>
                                : `Valid until ${format(new Date(expires_at), 'dd MMMM yyyy')}`
                            }
                        </p>
                    </div>
                </div>
                {isExpiringSoon && (
                    <Link to="/order" className="px-5 py-2.5 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600 shadow-sm text-sm flex items-center gap-2">
                        Renew Now <ArrowRight className="w-4 h-4" />
                    </Link>
                )}
            </div>
        );
    }

    // --- EXPIRED STATE ---
    if (status === 'expired' || status === 'cancelled') {
        return (
            <div className="mb-6 p-5 rounded-xl bg-red-50 border border-red-200 dark:bg-red-900/10 dark:border-red-800/50 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-red-800 dark:text-red-200 text-lg">Subscription Expired</h4>
                        <p className="text-sm text-red-600 dark:text-red-300">
                            Your <strong>{plan_name}</strong> plan has expired. Services are paused.
                        </p>
                    </div>
                </div>
                <Link to="/order" className="px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-md flex items-center gap-2 animate-pulse">
                    Reactivate Now <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        );
    }

    return null;
}

