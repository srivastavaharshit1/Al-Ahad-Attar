import React, { type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  className = '', 
  id, 
  ...props 
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <label htmlFor={inputId} className="font-label-sm text-label-sm text-on-surface mb-2">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full bg-surface-container-lowest border ${error ? 'border-error' : 'border-outline-variant'} text-on-surface font-body-md py-3 px-4 focus:ring-1 focus:ring-primary focus:border-primary transition-colors placeholder:text-on-surface-variant/50`}
        {...props}
      />
      {error && <span className="text-error text-xs mt-1">{error}</span>}
    </div>
  );
};
