'use client';

import React, { useState, FormEvent } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import api from '@/lib/api';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientAdded: (newClient: any) => void;
}

const AddClientModal: React.FC<AddClientModalProps> = ({ isOpen, onClose, onClientAdded }) => {
  const [name, setName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!name) {
      setError('Client name is required.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.post('/admin/clients', {
        name,
        webhook_url: webhookUrl,
      });
      onClientAdded(response.data);
      setName('');
      setWebhookUrl('');
      onClose();
    } catch (err: any) {
   
      const backendMessage = err.response?.data?.message || 'An unknown error occurred.';
      setError(`Failed to add client: ${backendMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form state on close
    setName('');
    setWebhookUrl('');
    setError(null);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Client">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Client Name"
          id="client-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Toko ABC"
          required
        />
        <Input
          label="Webhook URL (Optional)"
          id="webhook-url"
          type="url"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://example.com/webhook"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end pt-4 space-x-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading} disabled={isLoading}>
            Add Client
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddClientModal;
