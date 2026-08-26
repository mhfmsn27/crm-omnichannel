'use client';

import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}

const AddDeviceModal: React.FC<AddDeviceModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tambah Device Baru">
      <div className="space-y-4">
        <Input
          label="Nama Device"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Playground Device"
        />
        <div className="flex justify-end space-x-2">
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave}>Simpan & Dapatkan QR</Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddDeviceModal;
