import React from 'react';
import { Outlet } from 'react-router-dom';
import { FloatingWhatsApp } from '../ui/FloatingWhatsApp';

export const CheckoutLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Outlet />
      <FloatingWhatsApp />
    </div>
  );
};
