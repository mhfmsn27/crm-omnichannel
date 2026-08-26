// frontend/src/pages/Order/AddonMarketplace.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ShoppingCart, CheckCircle2, Lock, AlertCircle, Zap, Shield, ArrowRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { FEATURE_CONFIG } from '../../config/featureConfig';

export default function AddonMarketplace() {
    const [loading, setLoading] = useState(true);
    const [addons, setAddons] = useState([]);
    const [activeFeatures, setActiveFeatures] = useState([]); 
    const [category, setCategory] = useState('all'); 
    const [subscriptionStatus, setSubscriptionStatus] = useState(null); // 'active', 'trialing', 'expired', 'trial'
    const navigate = useNavigate();

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const res = await axios.get('/api/app/billing/addons');
            setAddons(res.data.addons || []);
            setActiveFeatures(res.data.active_features || []); 
            setSubscriptionStatus(res.data.subscription_status);
        } catch (err) { console.error(err); } 
        finally { setLoading(false); }
    };

    const filteredAddons = category === 'all' ? addons : addons.filter(a => a.type === category);
    
    // Check if user has active plan
    const hasActivePlan = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Marketplace Add-on</h2>
            
            {/* Warning Banner if No Plan */}
            {!hasActivePlan && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-6 h-6 text-red-600" />
                        <div>
                            <h4 className="font-bold text-red-800">Active Subscription Required</h4>
                            <p className="text-sm text-red-600">You must subscribe to a base plan first before purchasing add-ons.</p>
                        </div>
                    </div>
                    <Link to="/order/plans" className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 flex items-center gap-1">
                        View Plans <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            )}

            {/* Categories */}
            <div className="flex gap-2 mb-6">
                {['all', 'boolean', 'limit'].map(cat => (
                    <button 
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold capitalize border transition-colors ${category === cat ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                        {cat === 'boolean' ? 'Features' : cat === 'limit' ? 'Quotas' : 'All'}
                    </button>
                ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAddons.map(addon => {
                    // Check Prerequisite
                    const reqCode = addon.prerequisite_feature_code;
                    const isLocked = reqCode && !activeFeatures.includes(reqCode);
                    const reqName = reqCode ? (FEATURE_CONFIG[reqCode]?.label || reqCode) : 'Base Feature';

                    // Check if already owned (only relevant for Boolean types, you can buy Limits multiple times)
                    const isOwned = addon.type === 'boolean' && activeFeatures.includes(addon.feature_code);
                    
                    // Final Disable Check: If No Active Plan OR Locked by dependency
                    const isDisabled = !hasActivePlan || isLocked;

                    return (
                        <div key={addon.id} className={`p-5 rounded-xl border flex flex-col justify-between transition-all bg-white ${isDisabled ? 'opacity-70 grayscale-[0.5]' : 'hover:shadow-lg hover:border-indigo-300'}`}>
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <div className={`p-2 rounded-lg ${addon.type === 'boolean' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {addon.type === 'boolean' ? <Zap className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                                    </div>
                                    <span className="font-bold text-indigo-600">Rp {parseInt(addon.price_monthly).toLocaleString()}</span>
                                </div>
                                <h4 className="font-bold text-gray-800 text-lg mb-1">{addon.name}</h4>
                                <p className="text-xs text-gray-500 mb-4 h-8 line-clamp-2">{addon.description}</p>
                                
                                <div className="flex gap-2 text-[10px] font-bold uppercase text-gray-400 mb-4">
                                    <span className="bg-gray-100 px-2 py-1 rounded">{addon.duration_days} Days</span>
                                    <span className="bg-gray-100 px-2 py-1 rounded">{addon.type === 'limit' ? `+${addon.value} Limit` : 'Unlock'}</span>
                                </div>
                            </div>

                            <div>
                                {isOwned ? (
                                    <button disabled className="w-full py-2 bg-green-100 text-green-700 rounded-lg font-bold text-sm flex items-center justify-center gap-2 cursor-default">
                                        <CheckCircle2 className="w-4 h-4" /> Active
                                    </button>
                                ) : (
                                    <div className="text-center">
                                        {isDisabled ? (
                                            <button disabled className="w-full py-2 bg-gray-200 text-gray-500 rounded-lg font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed">
                                                <Lock className="w-4 h-4" /> Locked
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => navigate(`/billing/checkout?addon_id=${addon.id}`)}
                                                className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-200"
                                            >
                                                <ShoppingCart className="w-4 h-4" /> Buy Now
                                            </button>
                                        )}

                                        {isLocked && (
                                            <p className="text-[10px] text-red-500 mt-2 font-medium flex items-center justify-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> Requires: {reqName}
                                            </p>
                                        )}
                                        {!hasActivePlan && !isLocked && (
                                             <p className="text-[10px] text-red-500 mt-2 font-medium">
                                                Requires Active Subscription
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
