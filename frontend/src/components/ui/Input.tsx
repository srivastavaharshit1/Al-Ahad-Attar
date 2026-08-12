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
        <label htmlFor={inputId} className="field-label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`field-input ${error ? 'is-error' : ''}`}
        {...props}
      />
      {error && <span className="text-error text-xs mt-1.5">{error}</span>}
    </div>
  );
};
