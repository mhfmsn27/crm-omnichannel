'use client';

import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-lg p-6 bg-gray-900 rounded-xl shadow-2xl border border-gray-700 transform transition-all"
           onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex items-start justify-between pb-4 border-b border-gray-700 rounded-t">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button
            type="button"
            className="text-gray-400 bg-transparent hover:bg-gray-800 hover:text-white rounded-lg text-sm p-1.5 ml-auto inline-flex items-center transition-colors"
            onClick={onClose}
          >
            <X size={20} />
            <span className="sr-only">Close modal</span>
          </button>
        </div>
        <div className="pt-4 text-gray-200">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
