import React, { useEffect, useRef } from 'react';
import { Button } from './Button';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  entityName?: string;
  warningMessage?: string;
  confirmText?: string;
  cancelText?: string;
  dangerMode?: boolean;
  isLoading?: boolean;
  actionType?: 'DELETE' | 'DISABLE' | 'RESTORE' | 'ARCHIVE' | 'CANCEL' | 'OTHER';
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  entityName,
  warningMessage,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  dangerMode = true,
  isLoading = false,
  actionType = 'DELETE',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  const iconClass = dangerMode ? 'text-error bg-error/10' : 'text-primary bg-primary/10';
  const getIcon = () => {
    switch (actionType) {
      case 'DELETE': return 'delete';
      case 'DISABLE': return 'block';
      case 'ARCHIVE': return 'archive';
      case 'RESTORE': return 'restore_from_trash';
      case 'CANCEL': return 'cancel';
      default: return 'warning';
    }
  };

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="modal-panel w-full max-w-md overflow-hidden border border-outline-variant/40"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full flex-shrink-0 ${iconClass}`}>
              <span className="material-symbols-outlined text-[24px]" aria-hidden="true">
                {getIcon()}
              </span>
            </div>
            <div className="flex-1 space-y-1 mt-1">
              <h2 id="dialog-title" className="font-headline-md text-lg text-on-surface">
                {title}
              </h2>
              {entityName && (
                <div className="font-label-md text-on-surface-variant bg-surface-container-lowest border border-outline-variant/50 p-2 rounded truncate">
                  {entityName}
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-3 pl-[3.25rem]">
            <p className="font-body-md text-on-surface-variant">
              {description}
            </p>
            
            {warningMessage && (
              <div className="bg-error/5 border border-error/20 p-3 rounded-lg flex gap-2">
                <span className="material-symbols-outlined text-error text-[18px]">warning</span>
                <p className="font-body-sm text-error/90 leading-tight">
                  {warningMessage}
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-surface-container-lowest p-4 border-t border-outline-variant/30 flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isLoading}
            className="min-w-[100px]"
          >
            {cancelText}
          </Button>
          <Button 
            variant={dangerMode ? 'primary' : 'primary'} 
            onClick={onConfirm} 
            disabled={isLoading}
            className={`min-w-[120px] ${dangerMode ? 'bg-error hover:bg-error/90 text-on-error border-error' : ''}`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
