import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { CreditCard, Wallet, ArrowRight, ShieldCheck, Plus, X, AlertCircle, Loader2, Tag } from 'lucide-react';
import Modal, { ModalFooter } from '../../components/common/Modal';


export default function CheckoutPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const searchParams = new URLSearchParams(location.search);
    const planId = searchParams.get('plan_id');
    const addonId = searchParams.get('addon_id');
    const urlCycle = searchParams.get('cycle'); // Get cycle param from URL

    const [item, setItem] = useState(null); // Can be plan or addon
    const [channels, setChannels] = useState([]);
    // Initialize cycle based on URL param, default to monthly
    const [cycle, setCycle] = useState(urlCycle === 'yearly' ? 'yearly' : 'monthly');
    const [selectedChannel, setSelectedChannel] = useState(null);
    const [loading, setLoading] = useState(false);

    // Tax & Promo State
    const [taxRate, setTaxRate] = useState(0);
    const [promoCode, setPromoCode] = useState('');
    const [promoData, setPromoData] = useState(null); // { code, amount, type }
    const [applyingPromo, setApplyingPromo] = useState(false);
    const [promoError, setPromoError] = useState('');

    // Error Modal State
    const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

    // Addon Quantity
    const [quantity, setQuantity] = useState(1);

    // Derived state for item capabilities
    const [hasMonthly, setHasMonthly] = useState(true);

    const isAddon = !!addonId;

    useEffect(() => {
        if (!planId && !addonId) {
            navigate('/settings');
            return;
        }
        fetchData();
    }, [planId, addonId]);

    const fetchData = async () => {
        try {
            const reqs = [
                axios.get('/api/public/payment-channels'),
                axios.get('/api/app/billing/tax-rate') // Helper to get tax rate
            ];

            if (isAddon) {
                reqs.push(axios.get('/api/app/billing/addons'));
            } else {
                reqs.push(axios.get(`/api/public/plans/${planId}`));
            }

            const [channelRes, taxRes, itemRes] = await Promise.all(reqs);
            setChannels(channelRes.data);
            setTaxRate(taxRes.data.tax_rate || 0);

            if (isAddon) {
                // Use the data from the API response (itemRes)
                // Fix: The API returns an object { addons: [...] }, not an array directly.
                const fetchedAddons = itemRes.data?.addons || [];
                const found = fetchedAddons.find(a => parseInt(a.id) === parseInt(addonId));
                if (found) {
                    setItem(found);
                } else {
                    console.error("Addon not found in API response");
                    // Optionally navigate back or show error
                }
            } else {
                const planData = itemRes.data;
                setItem(planData);

                // Check monthly validity
                const canMonthly = planData.price_monthly && parseFloat(planData.price_monthly) > 0;
                setHasMonthly(canMonthly);

                if (!canMonthly && cycle === 'monthly') {
                    setCycle('yearly');
                }
            }

        } catch (err) {
            console.error(err);
        }
    };

    const handleApplyPromo = async () => {
        if (!promoCode.trim()) return;
        setApplyingPromo(true);
        setPromoError('');
        setPromoData(null);

        // Calculate current base amount
        let currentBase = 0;
        if (isAddon) {
            currentBase = parseFloat(item.price_monthly) * quantity;
        } else {
            // Recalculate base price based on cycle
            if (cycle === 'yearly') {
                const original = parseFloat(item.price_yearly);
                currentBase = (item.price_yearly_promo && parseFloat(item.price_yearly_promo) > 0) ? parseFloat(item.price_yearly_promo) : original;
            } else {
                const original = parseFloat(item.price_monthly);
                currentBase = (item.price_monthly_promo && parseFloat(item.price_monthly_promo) > 0) ? parseFloat(item.price_monthly_promo) : original;
            }
        }

        try {
            const res = await axios.post('/api/app/billing/validate-promo', {
                code: promoCode,
                amount: currentBase,
                plan_id: planId,
                addon_id: addonId,
                cycle
            });

            if (res.data.valid) {
                setPromoData(res.data);
            } else {
                setPromoError(res.data.message || 'Invalid code');
            }
        } catch (err) {
            setPromoError(err.response?.data?.message || 'Failed to apply promo');
        } finally {
            setApplyingPromo(false);
        }
    };

    const handleRemovePromo = () => {
        setPromoData(null);
        setPromoCode('');
        setPromoError('');
    };

    const handlePay = async () => {
        if (!selectedChannel) {
            setErrorModal({ isOpen: true, message: "Mohon pilih metode pembayaran untuk melanjutkan." });
            return;
        }
        setLoading(true);

        try {
            const payload = {
                payment_channel_id: selectedChannel,
                cycle: isAddon ? 'monthly' : cycle,
                promo_code: promoData ? promoData.code : null
            };

            if (isAddon) {
                payload.addon_id = addonId;
                payload.quantity = quantity;
            } else {
                payload.plan_id = planId;
            }

            const res = await axios.post('/api/app/billing/checkout', payload);

            const { transaction_id, payment_type, payment_url, bank_details, amount, breakdown } = res.data;

            if (payment_type === 'doku' || payment_type === 'xendit') {
                window.location.href = payment_url;
            } else {
                navigate('/billing/confirm', {
                    state: { transaction_id, bank_details, amount, breakdown }
                });
            }

        } catch (err) {
            const msg = err.response?.data?.error || err.message || "Terjadi kesalahan yang tidak terduga.";
            setErrorModal({ isOpen: true, message: msg });
        } finally {
            setLoading(false);
        }
    };

    if (!item) return <div className="p-10 text-center"><Loader2 className="animate-spin w-8 h-8 mx-auto text-indigo-600" /></div>;

    // Pricing Logic with PROMO Support
    let basePrice = 0;
    let originalPrice = 0; // Price before plan specific discount (e.g. promo price set in plan admin)
    let isPlanPromo = false;

    if (isAddon) {
        basePrice = parseFloat(item.price_monthly) * quantity;
    } else {
        if (cycle === 'yearly') {
            originalPrice = parseFloat(item.price_yearly);
            if (item.price_yearly_promo && parseFloat(item.price_yearly_promo) > 0) {
                basePrice = parseFloat(item.price_yearly_promo);
                isPlanPromo = true;
            } else {
                basePrice = originalPrice;
            }
        } else {
            originalPrice = parseFloat(item.price_monthly);
            if (item.price_monthly_promo && parseFloat(item.price_monthly_promo) > 0) {
                basePrice = parseFloat(item.price_monthly_promo);
                isPlanPromo = true;
            } else {
                basePrice = originalPrice;
            }
        }
    }

    // 1. Apply Promo Code Discount
    const discountAmount = promoData ? promoData.discount_amount : 0;
    const taxableAmount = Math.max(0, basePrice - discountAmount);

    // 2. Calculate Tax
    const taxAmount = Math.floor(taxableAmount * (taxRate / 100));

    // 3. Admin Fee (Hardcoded for now as 0, or could be fetched)
    const adminFee = 0;

    // 4. Final Total
    const estimatedTotal = taxableAmount + taxAmount + adminFee;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-extrabold text-gray-900">Secure Checkout</h1>
                    <p className="mt-2 text-gray-600">
                        {isAddon ? `Purchase Add-on: ${item.name}` : 'Complete your subscription'}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    {/* LEFT: Payment Selection */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Cycle Selector (Only for Plans) */}
                        {!isAddon && (
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <h3 className="font-bold text-gray-800 mb-4">Billing Cycle</h3>

                                {/* Dynamic Savings Calculation */}
                                {(() => {
                                    const mParams = parseFloat(item.price_monthly);
                                    const yParams = parseFloat(item.price_yearly);
                                    let savingsText = "";

                                    if (mParams > 0 && yParams > 0) {
                                        // Savings = 1 - (Yearly / (Monthly * 12))
                                        const yearlyCostIfMonthly = mParams * 12;
                                        const savings = yearlyCostIfMonthly - yParams;
                                        const savingsPercent = Math.round((savings / yearlyCostIfMonthly) * 100);
                                        if (savingsPercent > 0) {
                                            savingsText = `Save ${savingsPercent}%`;
                                        }
                                    }

                                    return (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Monthly Option */}
                                            {hasMonthly && (
                                                <div
                                                    onClick={() => setCycle('monthly')}
                                                    className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all ${cycle === 'monthly' ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-200 hover:border-gray-300'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${cycle === 'monthly' ? 'border-indigo-600' : 'border-gray-300'}`}>
                                                            {cycle === 'monthly' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-900">Monthly</div>
                                                            <div className="text-xs text-gray-500">Pay as you go</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Yearly Option */}
                                            <div
                                                onClick={() => setCycle('yearly')}
                                                className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all ${cycle === 'yearly' ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-200 hover:border-gray-300'}`}
                                            >
                                                {savingsText && (
                                                    <span className="absolute -top-2.5 right-4 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-200">
                                                        {savingsText}
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${cycle === 'yearly' ? 'border-indigo-600' : 'border-gray-300'}`}>
                                                        {cycle === 'yearly' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900">Yearly</div>
                                                        <div className="text-xs text-gray-500">Best Value</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Quantity Selector (Only for Limit Add-ons) */}
                        {isAddon && item.type === 'limit' && (
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <h3 className="font-bold text-gray-800 mb-4">Quantity</h3>
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-2 bg-gray-100 rounded hover:bg-gray-200">-</button>
                                    <span className="font-bold text-xl w-8 text-center">{quantity}</span>
                                    <button onClick={() => setQuantity(q => q + 1)} className="p-2 bg-gray-100 rounded hover:bg-gray-200">+</button>
                                    <span className="text-sm text-gray-500 ml-2">x {item.value} unit(s) per purchase</span>
                                </div>
                            </div>
                        )}

                        {/* Methods */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="font-bold text-gray-800 mb-4">Payment Method</h3>
                            <div className="space-y-2">
                                {channels.map(c => {
                                    const isAuto = c.type === 'doku' || c.type === 'tripay' || c.type === 'xendit';
                                    return (
                                        <label key={c.id} className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${selectedChannel === c.id ? 'bg-indigo-50 border-indigo-500' : 'hover:bg-gray-50 border-gray-200'}`}>
                                            <input
                                                type="radio"
                                                name="payment"
                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                                checked={selectedChannel === c.id}
                                                onChange={() => setSelectedChannel(c.id)}
                                            />
                                            <div className="ml-3 flex items-center w-full">
                                                {isAuto ? <CreditCard className="w-5 h-5 text-gray-600 mr-3" /> : <Wallet className="w-5 h-5 text-gray-600 mr-3" />}
                                                <div>
                                                    <p className="font-medium text-gray-900">{c.provider_name}</p>
                                                    <p className="text-xs text-gray-500">{isAuto ? 'Instant Verification' : 'Manual Transfer'}</p>
                                                </div>
                                                <span className={`ml-auto text-xs px-2 py-1 rounded ${isAuto ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                                    {isAuto ? 'Auto' : 'Manual'}
                                                </span>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Summary */}
                    <div className="md:col-span-1">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 sticky top-6">
                            <h3 className="font-bold text-lg text-gray-800 mb-4">Order Summary</h3>

                            <div className="space-y-2 mb-4 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Subtotal</span>
                                    <div className="text-right">
                                        {isPlanPromo && (
                                            <span className="text-gray-400 line-through block text-xs">
                                                Rp {parseInt(originalPrice).toLocaleString()}
                                            </span>
                                        )}
                                        <span className="font-medium">Rp {parseInt(basePrice).toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Promo Code Display */}
                                {promoData ? (
                                    <div className="flex justify-between items-center text-green-600">
                                        <div className="flex items-center gap-1">
                                            <Tag className="w-3 h-3" />
                                            <span className="font-medium">{promoData.code}</span>
                                            <button onClick={handleRemovePromo} className="text-gray-400 hover:text-red-500 ml-1"><X className="w-3 h-3" /></button>
                                        </div>
                                        <span className="font-bold">-Rp {discountAmount.toLocaleString()}</span>
                                    </div>
                                ) : (
                                    <div className="pt-2 pb-2">
                                        <div className="relative">
                                            <input
                                                className={`w-full border rounded-lg py-2.5 pl-3 pr-20 text-sm focus:ring-indigo-500 focus:border-indigo-500 ${promoError ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                                placeholder="Enter Promo Code"
                                                value={promoCode}
                                                onChange={e => setPromoCode(e.target.value.toUpperCase())}
                                            />
                                            <button
                                                onClick={handleApplyPromo}
                                                disabled={applyingPromo || !promoCode}
                                                className="absolute right-1 top-1 bottom-1 bg-gray-900 text-white px-3 rounded-md text-xs font-bold hover:bg-black disabled:opacity-50 transition-colors flex items-center justify-center"
                                            >
                                                {applyingPromo ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Apply'}
                                            </button>
                                        </div>
                                        {promoError && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {promoError}</p>}
                                    </div>
                                )}

                                <div className="flex justify-between items-center border-t border-dashed border-gray-200 pt-2">
                                    <span className="text-gray-600">Tax ({taxRate}%)</span>
                                    <span className="font-medium">Rp {taxAmount.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="border-t border-gray-200 pt-4 flex justify-between items-end mb-6">
                                <span className="font-bold text-gray-900">Total</span>
                                <div className="text-right">
                                    <span className="text-2xl font-extrabold text-indigo-600">
                                        Rp {parseInt(estimatedTotal).toLocaleString('id-ID')}
                                    </span>
                                    <p className="text-[10px] text-gray-400">+ Unique Code (Manual only)</p>
                                </div>
                            </div>

                            <button
                                onClick={handlePay}
                                disabled={loading}
                                className="w-full py-3 px-4 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : (
                                    <>Pay Now <ArrowRight className="w-4 h-4" /></>
                                )}
                            </button>

                            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
                                <ShieldCheck className="w-4 h-4" />
                                Secure Encrypted Payment
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Error Modal */}
            <Modal
                isOpen={errorModal.isOpen}
                onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
                title="Gagal Checkout"
                size="sm"
                footer={
                    <ModalFooter>
                        <div className="w-full">
                            <button
                                onClick={() => setErrorModal({ ...errorModal, isOpen: false })}
                                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
                            >
                                Saya Mengerti
                            </button>
                        </div>
                    </ModalFooter>
                }
            >
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 border border-red-100">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <p className="text-gray-500 mb-2 leading-relaxed text-sm">
                        {errorModal.message}
                    </p>
                </div>
            </Modal>
        </div >
    );
}