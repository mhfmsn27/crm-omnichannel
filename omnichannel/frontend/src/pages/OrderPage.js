
import React from 'react';
import { Navigate } from 'react-router-dom';

// Deprecated: Logic moved to pages/Order/ directory
export default function OrderPage() {
  return <Navigate to="/order/plans" replace />;
}
