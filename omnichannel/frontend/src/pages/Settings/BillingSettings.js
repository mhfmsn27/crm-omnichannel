import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CreditCard, CheckCircle, PlusCircle, Lock, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { FEATURE_CONFIG } from '../../config/featureConfig';

export default function BillingSettings() {
    const [org, setOrg] = useState(null);
    const [addons, setAddons] = useState([]);
    const [activeFeatures, setActiveFeatures] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const orgRes = await axios.get('/api/app/organization');
            setOrg(orgRes.data);
        } catch (err) {
            console.warn('[BillingSettings] org fetch failed:', err.message);
        }
        try {
            const addonsRes = await axios.get('/api/app/billing/addons');
            setAddons(addonsRes.data.addons || []);
            setActiveFeatures(addonsRes.data.active_features || []);
        } catch {
            // SaaS billing addon endpoint may not exist in personal version
        } finally {
            setLoading(false);
        }
    };

    const isLocked = (addon) => {
        if (!addon.prerequisite_feature_code) return false;
        return !activeFeatures.includes(addon.prerequisite_feature_code);
    };

    if (loading) return <div className="p-8 text-center text-gray-500 dark:text-slate-400">Loading billing data...</div>;

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto bg-gray-50 dark:bg-dark-bg">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Billing & Integrations</h2>
                <p className="text-gray-500 dark:text-slate-400 text-sm">Manage your subscription plan and API configuration.</p>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Subscription Plan */}
                <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Subscription Plan
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                            <div>
                                <p className="text-xs text-indigo-600 dark:text-indigo-300 font-bold uppercase mb-1">Current Plan</p>
                                <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{org.plan_name || 'Free Trial'}</p>
                            </div>
                            <div className="bg-indigo-200 dark:bg-indigo-700/50 p-2 rounded-full text-indigo-700 dark:text-indigo-200">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 dark:text-slate-400 border-b border-gray-100 dark:border-dark-border pb-2">
                            <span>Status</span>
                            <span className={`font-bold uppercase ${org.subscription_status === 'active' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {org.subscription_status}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 dark:text-slate-400">
                            <span>Expires At</span>
                            <span className="font-mono font-medium dark:text-slate-200">{org.expires_at ? format(new Date(org.expires_at), 'dd MMM yyyy') : 'No Expiry'}</span>
                        </div>
                        <button 
                            onClick={() => navigate('/order')}
                            className="w-full py-2 mt-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-sm"
                        >
                            Upgrade / Change Plan
                        </button>
                    </div>
                </div>

                {/* Available Add-ons */}
                <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <PlusCircle className="w-5 h-5 text-green-600 dark:text-green-500" /> Quick Add-ons
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {addons.slice(0, 4).map(addon => {
                            const locked = isLocked(addon);
                            const prerequisiteName = locked ? (FEATURE_CONFIG[addon.prerequisite_feature_code]?.label || 'Required Feature') : '';

                            return (
                                <div key={addon.id} className={`border rounded-lg p-4 transition-shadow flex flex-col ${locked ? 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800 opacity-80' : 'border-gray-200 dark:border-dark-border hover:shadow-md bg-white dark:bg-dark-surface'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">{addon.name}</h4>
                                        <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${addon.type === 'boolean' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                            {addon.type === 'boolean' ? 'Unlock' : 'Limit'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-4 h-8 line-clamp-2">{addon.description}</p>
                                    
                                    <div className="mt-auto pt-2 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
                                        <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">Rp {parseInt(addon.price_monthly).toLocaleString()}</span>
                                        {locked ? (
                                            <div className="relative group">
                                                <button disabled className="p-1.5 bg-gray-300 dark:bg-slate-700 text-white rounded cursor-not-allowed flex items-center gap-1 text-[10px] font-bold">
                                                    <Lock className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => navigate(`/billing/checkout?addon_id=${addon.id}`)}
                                                className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1 text-[10px] font-bold shadow-sm"
                                            >
                                                <ShoppingCart className="w-3 h-3" /> Buy
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {addons.length === 0 && <p className="text-gray-400 dark:text-slate-500 text-sm col-span-2">No add-ons available.</p>}
                    </div>
                    <button onClick={() => navigate('/order')} className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium w-full text-center">
                        View All Add-ons
                    </button>
                </div>
            </div>
        </div>
    );
}
