import React from 'react';
import { Outlet } from 'react-router-dom';

export const CheckoutLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Outlet />
    </div>
  );
};
