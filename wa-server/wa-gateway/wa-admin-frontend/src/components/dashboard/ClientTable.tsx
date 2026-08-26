'use client';

import React from 'react';
import { Edit, Trash2, Copy } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  webhook_url: string | null;
  api_key?: string; 
  created_at: string;
}

interface ClientTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}

const ClientTable: React.FC<ClientTableProps> = ({ clients, onEdit, onDelete }) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
        alert('API Key copied to clipboard!');
    }, (err) => {
        alert('Failed to copy API Key.');
    });
  };
    
  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 glass-panel rounded-xl text-gray-400">
        <p className="text-lg">No clients found.</p>
        <p className="text-sm">Add a new client to get started!</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden glass-panel rounded-xl border border-white/5">
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="bg-black/30">
          <tr>
            <th scope="col" className="px-6 py-4 text-xs font-medium tracking-wider text-left text-gray-300 uppercase">Name</th>
            <th scope="col" className="px-6 py-4 text-xs font-medium tracking-wider text-left text-gray-300 uppercase">Webhook URL</th>
            <th scope="col" className="px-6 py-4 text-xs font-medium tracking-wider text-left text-gray-300 uppercase">Created At</th>
            <th scope="col" className="px-6 py-4 text-xs font-medium tracking-wider text-right text-gray-300 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/50">
          {clients.map((client) => (
            <tr key={client.id} className="hover:bg-white/5 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-bold text-white">{client.name}</div>
                {client.api_key && (
                    <div className="flex items-center mt-1 text-xs text-gray-400 group">
                       <span className="truncate max-w-[150px] font-mono bg-black/30 px-1.5 py-0.5 rounded">
                         {client.api_key.substring(0, 12)}...
                       </span>
                       <button 
                         onClick={() => copyToClipboard(client.api_key!)} 
                         className="ml-2 text-gray-500 hover:text-cyan-400 transition-colors" 
                         title="Copy API Key"
                       >
                            <Copy size={14} />
                       </button>
                    </div>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-gray-300 whitespace-nowrap max-w-xs truncate" title={client.webhook_url || ''}>
                {client.webhook_url ? (
                  <span className="font-mono text-xs bg-blue-900/20 text-blue-200 px-2 py-1 rounded">{client.webhook_url}</span>
                ) : (
                  <span className="text-gray-600 italic">Not set</span>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-gray-400 whitespace-nowrap">{new Date(client.created_at).toLocaleDateString()}</td>
              <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                <div className="flex items-center justify-end space-x-2">
                  <button onClick={() => onEdit(client)} className="text-indigo-400 hover:text-white hover:bg-indigo-500 transition-all p-2 rounded-lg">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => onDelete(client)} className="text-red-400 hover:text-white hover:bg-red-500 transition-all p-2 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ClientTable;
