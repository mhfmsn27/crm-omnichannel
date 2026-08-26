import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Save, CheckCircle, AlertTriangle, Package, ExternalLink } from 'lucide-react';

export default function OngkirSettingsPage() {
    const [settings, setSettings] = useState({
        rajaongkir_api_key: '',
        rajaongkir_account_type: 'starter',
        default_origin_province: '',
        default_origin_city_id: '',
        default_origin_city_name: '',
        enabled_couriers: [],
        is_active: false
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Data Lists
    const [provinces, setProvinces] = useState([]);
    const [cities, setCities] = useState([]);

    useEffect(() => {
        fetchSettings();
    }, []);

    useEffect(() => {
        // Load provinces if we have a key (from saved settings or just typed if we want to test)
        // Ideally we only load if we have a valid key saved or verifying. 
        // For simplicity, load if settings.rajaongkir_api_key exists.
        if (settings.rajaongkir_api_key) {
            fetchProvinces();
        }
    }, [settings.rajaongkir_api_key]);

    useEffect(() => {
        if (settings.default_origin_province && settings.rajaongkir_api_key) {
            fetchCities(settings.default_origin_province);
        }
    }, [settings.default_origin_province]);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/app/settings/ongkir');
            if (res.data) setSettings(prev => ({ ...prev, ...res.data }));
        } catch (err) {
            // Ignore 404/empty
        } finally {
            setLoading(false);
        }
    };

    const fetchProvinces = async () => {
        try {
            // Pass key explicitly if needed or rely on backend saved key
            const res = await axios.get(`/api/app/ongkir/provinces?key=${settings.rajaongkir_api_key}&type=${settings.rajaongkir_account_type}`);
            setProvinces(res.data.rajaongkir.results || []);
        } catch (err) {
            console.error("Failed to load provinces", err);
        }
    };

    const fetchCities = async (provinceId) => {
        try {
            const res = await axios.get(`/api/app/ongkir/cities/${provinceId}?key=${settings.rajaongkir_api_key}&type=${settings.rajaongkir_account_type}`);
            setCities(res.data.rajaongkir.results || []);
        } catch (err) {
            console.error("Failed to load cities", err);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put('/api/app/settings/ongkir', settings);
            toast.success("Settings saved successfully");
        } catch (err) {
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const toggleCourier = (courierCode) => {
        const current = settings.enabled_couriers || [];
        if (current.includes(courierCode)) {
            setSettings({ ...settings, enabled_couriers: current.filter(c => c !== courierCode) });
        } else {
            setSettings({ ...settings, enabled_couriers: [...current, courierCode] });
        }
    };

    const courierOptions = [
        { code: 'jne', name: 'JNE' },
        { code: 'pos', name: 'POS Indonesia' },
        { code: 'tiki', name: 'TIKI' },
        { code: 'jnt', name: 'J&T' }, // Basic/Pro only usually?
        { code: 'sicepat', name: 'SiCepat' },
        { code: 'wahana', name: 'Wahana' }
    ];

    // --- SANDBOX TEST STATES ---
    const [testProv, setTestProv] = useState('');
    const [testCity, setTestCity] = useState('');
    const [testWeight, setTestWeight] = useState(1000);
    const [testCourier, setTestCourier] = useState('jne');
    const [testResults, setTestResults] = useState(null);
    const [testLoading, setTestLoading] = useState(false);
    const [testCities, setTestCities] = useState([]);

    const handleTestProvChange = async (e) => {
        const provId = e.target.value;
        setTestProv(provId);
        setTestCity('');
        setTestResults(null);
        if (provId) {
            try {
                // Determine which key to use (saved or current input)
                const apiKey = settings.rajaongkir_api_key;
                const accType = settings.rajaongkir_account_type;
                const res = await axios.get(`/api/app/ongkir/cities/${provId}?key=${apiKey}&type=${accType}`);
                setTestCities(res.data.rajaongkir.results || []);
            } catch (err) {
                console.error(err);
                toast.error("Failed to load test cities");
            }
        } else {
            setTestCities([]);
        }
    };

    const handleTestCheck = async () => {
        if (!settings.default_origin_city_id) {
            toast.error("Please save Default Origin first");
            return;
        }
        if (!testCity) {
            toast.error("Select destination city");
            return;
        }

        setTestLoading(true);
        setTestResults(null);
        try {
            const res = await axios.post('/api/app/ongkir/check', {
                origin: settings.default_origin_city_id, // Use the one from state (which mirrors saved if not changed)
                destination: testCity,
                weight: testWeight,
                courier: testCourier,
                // Pass key/type explicitly to test unsaved changes? 
                // Currently backend uses DB settings. 
                // If user just typed a key and hasn't saved, backend won't know it unless we pass it.
                // The current /check endpoint MIGHT NOT accept key override.
                // Let's assume user MUST SAVE first.
            });

            const ra = res.data.rajaongkir;
            setTestResults(ra.results?.[0]?.costs || []);
        } catch (err) {
            toast.error(err.response?.data?.error || "Test Check Failed. Ensure API Key is saved.");
        } finally {
            setTestLoading(false);
        }
    };

    // ... existing render ...

    if (loading) return <div className="p-8 text-center text-gray-500">Loading settings...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Package className="w-6 h-6 text-indigo-500" /> Ongkir Integration (RajaOngkir)
                    </h1>
                    <p className="text-gray-500 mt-1">Configure your own RajaOngkir API Key to enable shipping cost calculations.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 font-medium transition-all flex items-center gap-2"
                >
                    {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Configuration</>}
                </button>
            </div>

            {/* Guide Section */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8">
                <h3 className="text-blue-900 dark:text-blue-100 font-bold mb-2 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" /> How to get API Key?
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
                    <li>Register at <a href="https://rajaongkir.com" target="_blank" rel="noreferrer" className="underline font-bold">RajaOngkir.com</a>.</li>
                    <li>Choose your account type (Starter is Free).</li>
                    <li>Go to API Key menu and copy your key.</li>
                    <li>Paste the key below.</li>
                </ol>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: API Config */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                        <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">API Configuration</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">RajaOngkir API Key</label>
                                <input
                                    type="text"
                                    className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Paste your API Key here"
                                    value={settings.rajaongkir_api_key || ''}
                                    onChange={e => setSettings({ ...settings, rajaongkir_api_key: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Type</label>
                                <select
                                    className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    value={settings.rajaongkir_account_type || 'starter'}
                                    onChange={e => setSettings({ ...settings, rajaongkir_account_type: e.target.value })}
                                >
                                    <option value="starter">Starter (Free)</option>
                                    <option value="basic">Basic</option>
                                    <option value="pro">Pro</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={settings.is_active} onChange={e => setSettings({ ...settings, is_active: e.target.checked })} />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">Enable Integration</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                        <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Enabled Couriers</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {courierOptions.map(courier => (
                                <label key={courier.code} className="flex items-center space-x-2 cursor-pointer p-2 border border-gray-100 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={(settings.enabled_couriers || []).includes(courier.code)}
                                        onChange={() => toggleCourier(courier.code)}
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{courier.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Origin Config & Sandbox */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                        <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Default Origin (Pengirim)</h3>
                        <p className="text-sm text-gray-500 mb-4">Set where your packages are shipped from.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Province</label>
                                <select
                                    className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    value={settings.default_origin_province || ''}
                                    onChange={e => {
                                        setSettings({ ...settings, default_origin_province: e.target.value });
                                    }}
                                    disabled={provinces.length === 0}
                                >
                                    <option value="">Select Province</option>
                                    {provinces.map(p => (
                                        <option key={p.province_id} value={p.province_id}>{p.province}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City/District</label>
                                <select
                                    className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    value={settings.default_origin_city_id || ''}
                                    onChange={e => {
                                        const val = e.target.value;
                                        const city = cities.find(c => String(c.city_id) === String(val));
                                        const cName = city?.city_name || '';
                                        const cType = city?.type || 'Kota/Kab';
                                        setSettings({ ...settings, default_origin_city_id: val, default_origin_city_name: `${cType} ${cName}`.trim() });
                                    }}
                                    disabled={!settings.default_origin_province || cities.length === 0}
                                >
                                    <option value="">Select City</option>
                                    {cities.map(c => (
                                        <option key={c.city_id} value={c.city_id}>{c.type} {c.city_name}</option>
                                    ))}
                                </select>
                            </div>

                            {settings.default_origin_city_id && (
                                <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" /> Selected: {settings.default_origin_city_name}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SANDBOX / TEST */}
                    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-inner">
                        <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-500" /> Test Connection (Sandbox)
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">You can test the API connection before using it in chat. Make sure to <b>Save Configuration</b> first.</p>

                        <div className="space-y-3">
                            {/* Test Prov */}
                            <div className="grid grid-cols-2 gap-3">
                                <select
                                    className="w-full p-2.5 rounded-lg border text-sm"
                                    value={testProv}
                                    onChange={handleTestProvChange}
                                >
                                    <option value="">Test Destination Province</option>
                                    {provinces.map(p => (
                                        <option key={p.province_id} value={p.province_id}>{p.province}</option>
                                    ))}
                                </select>
                                <select
                                    className="w-full p-2.5 rounded-lg border text-sm"
                                    value={testCity}
                                    onChange={e => setTestCity(e.target.value)}
                                    disabled={!testProv || testCities.length === 0}
                                >
                                    <option value="">Test Destination City</option>
                                    {testCities.map(c => (
                                        <option key={c.city_id} value={c.city_id}>{c.type} {c.city_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="number"
                                    className="p-2.5 rounded-lg border text-sm w-full"
                                    placeholder="Weight (g)"
                                    value={testWeight}
                                    onChange={e => setTestWeight(e.target.value)}
                                />
                                <select
                                    className="w-full p-2.5 rounded-lg border text-sm"
                                    value={testCourier}
                                    onChange={e => setTestCourier(e.target.value)}
                                >
                                    {courierOptions.map(c => (
                                        <option key={c.code} value={c.code}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={handleTestCheck}
                                disabled={testLoading || !testCity}
                                className="w-full py-2 bg-gray-800 text-white rounded-lg text-sm font-bold hover:bg-black disabled:opacity-50"
                            >
                                {testLoading ? 'Checking...' : 'Check Cost'}
                            </button>

                            {testResults && (
                                <div className="mt-4 bg-white p-3 rounded-lg border border-gray-200">
                                    <h4 className="font-bold text-xs uppercase text-gray-500 mb-2">Results (From: {settings.default_origin_city_name})</h4>
                                    {testResults.length === 0 ? <p className="text-sm text-red-500">No results available or API Error.</p> : (
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {testResults.map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-sm border-b pb-1 last:border-0 last:pb-0">
                                                    <div>
                                                        <span className="font-bold">{item.service}</span> <span className="text-gray-500 text-xs">({item.cost[0].etd} Days)</span>
                                                    </div>
                                                    <div className="font-bold text-indigo-600">
                                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.cost[0].value)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
