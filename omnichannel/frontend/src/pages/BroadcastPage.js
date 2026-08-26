
import React from 'react';
import { Navigate } from 'react-router-dom';

// This file is deprecated and replaced by the new module structure in src/pages/Broadcast/
// Redirecting to new route just in case
export default function BroadcastPage() {
  return <Navigate to="/broadcast" replace />;
}
