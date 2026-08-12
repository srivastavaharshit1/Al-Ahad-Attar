import React from 'react';

export const Loader: React.FC = () => {
  return (
    <div className="flex justify-center items-center p-8">
      <div className="w-10 h-10 border-2 border-outline-variant border-t-primary rounded-full animate-spin"></div>
    </div>
  );
};
