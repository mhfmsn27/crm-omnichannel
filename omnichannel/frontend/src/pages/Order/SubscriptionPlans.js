import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Check, Star, Clock, Zap, X, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FEATURE_CONFIG } from '../../config/featureConfig';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import Modal, { ModalFooter } from '../../components/common/Modal';

const FeatureModal = ({ plan, onClose }) => {
    if (!plan) return null;

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={
                <div>
                    <h3 className="font-bold text-lg text-gray-900">{plan.name} Features</h3>
                    <p className="text-xs text-gray-500 font-normal mt-1">Full list of included features</p>
                </div>
            }
            size="md"
            footer={
                <ModalFooter>
                    <div className="w-full flex justify-center">
                        <button onClick={onClose} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 text-sm">
                            Close
                        </button>
                    </div>
                </ModalFooter>
            }
        >
            <div className="space-y-3">
                {plan.features && plan.features
                    .filter(f => f.is_enabled)
                    .map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-3 text-sm text-gray-700 border-b border-gray-50 pb-2 last:border-0">
                            <div className="mt-0.5 bg-green-100 rounded-full p-0.5 flex-shrink-0">
                                <Check className="w-3 h-3 text-green-600" />
                            </div>
                            <div>
                                <span className="font-medium">
                                    {FEATURE_CONFIG[feat.code]?.label || feat.code}
                                </span>
                                {feat.limit_value ? (
                                    <span className="ml-1 font-bold text-indigo-600">
                                        : {feat.limit_value}
                                    </span>
                                ) : null}
                                {FEATURE_CONFIG[feat.code]?.desc && (
                                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                                        {FEATURE_CONFIG[feat.code].desc}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
            </div>
        </Modal>
    );
};

export default function SubscriptionPlans() {
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState([]);
    const [currentPlanId, setCurrentPlanId] = useState(null);
    const [org, setOrg] = useState(null);
    const [hasUsedTrial, setHasUsedTrial] = useState(false);
    const [billingCycle, setBillingCycle] = useState('monthly');
    const [hasMonthly, setHasMonthly] = useState(true);

    // State for Modal
    const [selectedPlanDetails, setSelectedPlanDetails] = useState(null);

    const navigate = useNavigate();

    const fetchData = async () => {
        try {
            const [billingRes, orgRes] = await Promise.all([
                axios.get('/api/app/billing/addons'),
                axios.get('/api/app/organization')
            ]);
            setPlans(billingRes.data.plans || []);

            // Check if any plan has monthly price
            const plansList = billingRes.data.plans || [];
            const anyMonthly = plansList.some(p => p.price_monthly && parseFloat(p.price_monthly) > 0);
            setHasMonthly(anyMonthly);

            // Default to Yearly if no monthly plans
            if (!anyMonthly) {
                setBillingCycle('yearly');
            }

            setCurrentPlanId(billingRes.data.current_plan_id);
            setHasUsedTrial(billingRes.data.has_used_trial);
            setOrg(orgRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleStartTrial = async (planId, days) => {
        if (!confirm(`Start your ${days}-day free trial? You can use all features immediately.`)) return;
        const toastId = toast.loading("Activating trial...");
        try {
            await axios.post('/api/app/billing/start-trial', { plan_id: planId });
            toast.success("Trial Activated!", { id: toastId });
            fetchData(); // Refresh state
        } catch (err) {
            toast.error("Trial Failed: " + (err.response?.data?.error || err.message), { id: toastId });
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Plans...</div>;

    return (
        <div className="p-8">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                Pilih Paket Langganan
            </h2>

            {/* Current Status Banner */}
            {org?.subscription_status === 'expired' ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 mb-8 text-center animate-in fade-in">
                    <div className="flex flex-col items-center gap-2">
                        <X className="w-12 h-12 text-red-500 bg-red-100 dark:bg-red-900/50 rounded-full p-2" />
                        <h3 className="text-xl font-bold text-red-700 dark:text-red-400">Subscription Expired</h3>
                        <p className="text-red-600 dark:text-red-300 max-w-lg mx-auto mb-4">
                            Your subscription plan has expired. Your WhatsApp devices have been disconnected. Please renew your plan to restore services.
                        </p>
                        <p className="text-sm font-bold text-gray-500">
                            Expired on: {org?.expires_at ? format(new Date(org.expires_at), 'dd MMM yyyy, HH:mm') : '-'}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-4 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <p className="text-sm text-indigo-800 dark:text-indigo-300 font-medium">Paket Anda saat ini:</p>
                        <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-200 uppercase flex items-center gap-2">
                            {org?.plan_name || 'Free Trial'}
                            {org?.subscription_status === 'trialing' && (
                                <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-1 rounded-full border border-orange-200 dark:border-orange-800 font-bold">TRIAL MODE</span>
                            )}
                        </p>
                    </div>
                    <div className="text-right md:text-right text-left w-full md:w-auto">
                        <p className="text-sm text-indigo-800 dark:text-indigo-300 font-medium">Berlaku sampai:</p>
                        <p className="font-mono text-indigo-900 dark:text-indigo-200 font-bold">
                            {org?.expires_at ? format(new Date(org.expires_at), 'dd MMM yyyy') : 'No Expiry'}
                        </p>
                    </div>
                </div>
            )}

            {/* Cycle Switcher */}
            <div className="flex justify-center mb-8">
                <div className="bg-gray-100 dark:bg-slate-700 p-1 rounded-lg border border-gray-200 dark:border-slate-600 flex shadow-inner">
                    <button
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-6 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all ${billingCycle === 'monthly' ? 'bg-white dark:bg-dark-surface text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'} ${!hasMonthly ? 'hidden' : ''}`}
                    >
                        Bulanan
                    </button>
                    <button
                        onClick={() => setBillingCycle('yearly')}
                        className={`px-6 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all ${billingCycle === 'yearly' ? 'bg-white dark:bg-dark-surface text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'}`}
                    >
                        Tahunan <span className="text-[9px] sm:text-[10px] font-bold text-green-600 dark:text-green-400 ml-1 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full uppercase">PROMO</span>
                    </button>
                </div>
            </div>

            {/* Plans Container */}
            <div className="flex flex-wrap justify-center gap-6 mb-12">
                {plans
                    .filter(plan => {
                        const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
                        return price !== null && price !== undefined && price !== '';
                    })
                    .map((plan, index) => {
                        const isActive = plan.id === currentPlanId;
                        const priceNormal = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
                        const pricePromo = billingCycle === 'yearly' ? plan.price_yearly_promo : plan.price_monthly_promo;
                        const canTrial = plan.is_trial_allowed && plan.trial_days > 0 && !hasUsedTrial && !isActive;

                        // Theme Logic (Fallbacks to Blue/Orange/Yellow based on index)
                        const themes = [
                            { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-500', light: 'bg-blue-50' },     // Index 0: Basic
                            { bg: 'bg-[#F97316]', border: 'border-[#F97316]', text: 'text-[#F97316]', light: 'bg-orange-50' }, // Index 1: Standard
                            { bg: 'bg-[#F59E0B]', border: 'border-[#F59E0B]', text: 'text-[#F59E0B]', light: 'bg-yellow-50' }  // Index 2: Enterprise
                        ];
                        const theme = themes[index % themes.length];

                        // Filter features
                        const enabledFeatures = plan.features ? plan.features.filter(f => f.is_enabled) : [];
                        const visibleFeatures = enabledFeatures.slice(0, 7);
                        const remainingFeaturesCount = enabledFeatures.length - 7;

                        return (
                            <div
                                key={plan.id}
                                className={`relative flex flex-col rounded-2xl transition-all duration-300 w-full sm:w-[320px] bg-white dark:bg-slate-800 shadow-xl overflow-hidden
                                ${isActive ? 'ring-4 ring-indigo-500/30 transform scale-105 z-10' : 'hover:-translate-y-2 hover:shadow-2xl'}`}
                            >
                                {/* HEADER SECTION */}
                                <div className={`${theme.bg} p-6 pb-12 text-white relative`}>
                                    {/* Trial Badge */}
                                    {canTrial && (
                                        <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-bold border border-white/30 flex items-center gap-1">
                                            <Zap className="w-3 h-3 text-white" /> {plan.trial_days} Days Free
                                        </div>
                                    )}

                                    {isActive && (
                                        <div className="absolute top-4 right-4 bg-white text-indigo-600 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm uppercase tracking-wider">
                                            Paket Saat Ini
                                        </div>
                                    )}

                                    <div className="mb-1">
                                        <h3 className="text-2xl font-bold tracking-tight">{plan.name}</h3>
                                    </div>
                                    <p className="text-white/90 text-sm font-medium h-10 line-clamp-2 leading-snug opacity-90">
                                        {plan.description}
                                    </p>
                                </div>

                                {/* BODY SECTION (Overlapping Header) */}
                                <div className="px-6 pb-6 -mt-6">
                                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mb-6 text-center">
                                        {pricePromo ? (
                                            <div>
                                                <span className="text-xs text-gray-400 line-through">Rp {parseInt(priceNormal).toLocaleString('id-ID')}</span>
                                                <div className="flex items-baseline justify-center gap-1">
                                                    <span className="text-3xl font-extrabold text-gray-900 dark:text-white">Rp {parseInt(pricePromo / 1000).toLocaleString('id-ID')}k</span>
                                                    <span className="text-sm text-gray-500 dark:text-slate-400">/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-baseline justify-center gap-1">
                                                <span className="text-3xl font-extrabold text-gray-900 dark:text-white">Rp {parseInt(priceNormal / 1000).toLocaleString('id-ID')}k</span>
                                                <span className="text-sm text-gray-500 dark:text-slate-400">/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
                                            </div>
                                        )}
                                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide font-bold">Billing {billingCycle}</p>
                                    </div>

                                    {/* Features */}
                                    <div className="space-y-3 mb-8 min-h-[220px]">
                                        {visibleFeatures.map((feat, idx) => (
                                            <div key={idx} className="flex items-start gap-3">
                                                <div className="mt-0.5">
                                                    <Check className={`w-4 h-4 ${theme.text}`} />
                                                </div>
                                                <span className="text-sm text-gray-600 dark:text-slate-300 leading-snug">
                                                    {FEATURE_CONFIG[feat.code]?.label || feat.code}
                                                    {feat.limit_value ? <span className="font-bold ml-1 text-gray-900 dark:text-white">{feat.limit_value}</span> : ''}
                                                </span>
                                            </div>
                                        ))}
                                        {remainingFeaturesCount > 0 && (
                                            <button
                                                onClick={() => setSelectedPlanDetails(plan)}
                                                className={`flex items-center gap-1 text-xs font-bold ${theme.text} hover:opacity-80 transition-opacity mt-2`}
                                            >
                                                <List className="w-3 h-3" /> View {remainingFeaturesCount} more features
                                            </button>
                                        )}
                                    </div>

                                    {/* Action Button */}
                                    <div className="mt-auto space-y-3">
                                        {canTrial && (
                                            <button
                                                onClick={() => handleStartTrial(plan.id, plan.trial_days)}
                                                className={`w-full py-2.5 rounded-xl font-bold text-sm border-2 ${theme.border} ${theme.text} hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2`}
                                            >
                                                <Clock className="w-4 h-4" /> Start {plan.trial_days}-Day Trial
                                            </button>
                                        )}

                                        <button
                                            onClick={() => navigate(`/billing/checkout?plan_id=${plan.id}&cycle=${billingCycle}`)}
                                            className={`w-full py-3 rounded-xl font-bold text-sm text-white shadow-lg transition-transform active:scale-95
                                            ${isActive
                                                    ? `${theme.bg} hover:brightness-110` // Keep active theme but clickable
                                                    : `${theme.bg} hover:brightness-110 hover:-translate-y-0.5`
                                                }`}
                                        >
                                            {isActive ? 'Perpanjang Paket' : 'Subscribe Now'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
            </div>

            {/* Feature Modal */}
            <FeatureModal
                plan={selectedPlanDetails}
                onClose={() => setSelectedPlanDetails(null)}
            />
        </div>
    );
}