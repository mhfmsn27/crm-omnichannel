import React from 'react';
import { Navigate } from 'react-router-dom';

// DEPRECATED: Redirects to new Integrations/WhatsApp page
export default function DevicePage() {
  return <Navigate to="/integrations/whatsapp" replace />;
}