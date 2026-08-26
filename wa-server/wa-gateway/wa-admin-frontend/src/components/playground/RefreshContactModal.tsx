'use client';

import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import publicApi from '@/lib/publicApi';
import { RefreshCw, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface RefreshContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  apiKey: string;
  currentRecipient?: string;
}

interface RefreshResult {
  success: boolean;
  message: string;
  contact?: {
    jid: string;
    displayId: string;
  };
}

const RefreshContactModal: React.FC<RefreshContactModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  apiKey,
  currentRecipient
}) => {
  const [phone, setPhone] = useState(currentRecipient || '');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [result, setResult] = useState<RefreshResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = async () => {
    if (!phone || phone.length < 7) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsRefreshing(true);
    setError(null);
    setResult(null);

    try {
      const response = await publicApi.post(
        `/api/v1/sessions/${sessionId}/refresh-contact`,
        { phone: phone.replace(/[^\d]/g, '') }, // Clean phone number
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        }
      );

      setResult(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to refresh contact';
      setError(errorMessage);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    setPhone('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Refresh Contact Session">
      <div className="space-y-5">
        {/* Info Box */}
        <div className="flex items-start p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <Info className="w-4 h-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-300">
            <p className="font-medium mb-1">When to use this?</p>
            <p>Use this when a recipient (especially iOS users) sees "waiting for this message" instead of your actual message.</p>
          </div>
        </div>

        {/* Phone Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">
            Recipient Phone Number
          </label>
          <Input
            placeholder="628123456789"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setError(null);
              setResult(null);
            }}
            className="!bg-black/40 !border-white/10 focus:!border-cyan-500 text-white"
          />
          <p className="text-xs text-gray-500">
            Enter the phone number without the + sign (e.g., 628123456789)
          </p>
        </div>

        {/* Result Display */}
        {result && (
          <div className={`flex items-start p-3 rounded-lg ${
            result.success
              ? 'bg-emerald-500/10 border border-emerald-500/20'
              : 'bg-amber-500/10 border border-amber-500/20'
          }`}>
            {result.success ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 mr-2 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 mr-2 mt-0.5 flex-shrink-0" />
            )}
            <div className="text-sm">
              <p className={result.success ? 'text-emerald-300' : 'text-amber-300'}>
                {result.message}
              </p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-start p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-3 pt-2">
          <Button
            onClick={handleClose}
            className="flex-1 !bg-gray-700 hover:!bg-gray-600 !text-gray-200"
          >
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button
              onClick={handleRefresh}
              isLoading={isRefreshing}
              disabled={!phone || phone.length < 7}
              className="flex-1 !bg-cyan-600 hover:!bg-cyan-500"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Session
            </Button>
          )}
        </div>

        {/* Success Next Step */}
        {result?.success && (
          <div className="text-center pt-2 border-t border-white/5">
            <p className="text-xs text-gray-400">
              Try sending a message to the recipient now
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default RefreshContactModal;
