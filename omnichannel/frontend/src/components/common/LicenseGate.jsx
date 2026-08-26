import React from 'react';

export default function LicenseGate({ children }) {
    const [licenseStatus, setLicenseStatus] = React.useState('loading'); // 'loading' | 'valid' | 'invalid'

    React.useEffect(() => {
        checkLicense();
    }, []);

    const checkLicense = async () => {
        try {
            const res = await fetch('/api/license/check');
            const data = await res.json();
            setLicenseStatus(data.status === 'valid' ? 'valid' : 'invalid');
        } catch {
            setLicenseStatus('invalid');
        }
    };

    if (licenseStatus === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
                    <p className="mt-4 text-gray-500">Checking license...</p>
                </div>
            </div>
        );
    }

    if (licenseStatus === 'invalid') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full mx-4">
                    <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-200">
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
                            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 0h.01M21 12a9 9 0 11-18 0 9 9 0 1001.1M3.6 5.6A9 9 0 012 12" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">License Tidak Valid</h1>
                        <p className="text-gray-500 mb-6">Hubungi administrator untuk mengaktifkan lisensi aplikasi ini.</p>
                        <div className="bg-gray-50 rounded-lg p-4 text-left">
                            <p className="text-sm text-gray-600">
                                <strong>Domain:</strong> {window.location.hostname}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return children;
}
