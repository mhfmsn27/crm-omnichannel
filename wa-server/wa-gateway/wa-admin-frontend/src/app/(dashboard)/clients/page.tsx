'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import ClientTable from '@/components/dashboard/ClientTable';
import Button from '@/components/ui/Button';
import AddClientModal from '@/components/dashboard/AddClientModal';
// import EditClientModal from '@/components/dashboard/EditClientModal';

interface Client {
  id: string;
  name: string;
  webhook_url: string | null;
  api_key?: string; 
  created_at: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setAddModalOpen] = useState(false);

  const fetchClients = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await api.get('/admin/clients');
      setClients(response.data);
    } catch (err) {
      setError('Failed to fetch clients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleClientAdded = (newClient: Client) => {

    setClients(prevClients => [newClient, ...prevClients.filter(c => c.id !== newClient.id)]);

    // fetchClients();
  };

  const handleEditClient = (client: Client) => {
    const newWebhook = prompt("Enter new webhook URL:", client.webhook_url || "");
    if (newWebhook !== null) {
      api.put(`/admin/clients/${client.id}`, { webhook_url: newWebhook })
        .then(() => fetchClients())
        .catch(() => alert("Failed to update client."));
    }
  };

  const handleDeleteClient = async (client: Client) => {
    if (confirm(`Are you sure you want to delete "${client.name}"?`)) {
        try {
            await api.delete(`/admin/clients/${client.id}`);
            setClients(clients.filter(c => c.id !== client.id));
        } catch (error) {
            alert('Failed to delete client.');
        }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">Client Management</h1>
        <Button onClick={() => setAddModalOpen(true)}>Add New Client</Button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && (
        <ClientTable clients={clients} onEdit={handleEditClient} onDelete={handleDeleteClient} />
      )}

      {/* */}
      {isAddModalOpen && (
        <AddClientModal
          isOpen={isAddModalOpen}
          onClose={() => setAddModalOpen(false)}
          onClientAdded={handleClientAdded}
        />
      )}
    </div>
  );
}
