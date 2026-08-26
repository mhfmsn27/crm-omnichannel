'use client';

import React from 'react';
import Modal from '../ui/Modal';
import { QRCodeCanvas } from 'qrcode.react';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrString: string | null;
  isLoading: boolean;
}

const QrModal: React.FC<QrModalProps> = ({ isOpen, onClose, qrString, isLoading }) => {
  // Don't show modal if no QR and not loading (prevent flash)
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pindai Kode QR">
      <div className="flex flex-col items-center justify-center text-center p-4 min-h-[300px]">
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-400">Generating QR code...</p>
          </>
        ) : !qrString ? (
          <>
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-400">Waiting for QR code...</p>
            <p className="mt-2 text-xs text-gray-500">This may take a few seconds</p>
          </>
        ) : (
          <>
            <QRCodeCanvas value={qrString} size={256} />
            <p className="mt-4 text-gray-600">
              Please scan the QR code with your WhatsApp application.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              The QR code will expire in about 60 seconds
            </p>
          </>
        )}
      </div>
    </Modal>
  );
};

export default QrModal;
