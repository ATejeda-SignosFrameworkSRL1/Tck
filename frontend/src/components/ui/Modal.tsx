import React, { useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Contenido extra en el header (p. ej. botón Ampliar), a la izquierda del botón cerrar */
  headerRight?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  headerRight,
  size = 'md',
  closeOnOverlay = true,
  closeOnEscape = true,
  showCloseButton = true,
}) => {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    full: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={closeOnOverlay ? onClose : undefined}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
        <div
          className={clsx(
            'relative bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl shadow-2xl w-full max-h-[90vh] overflow-hidden animate-fade-in',
            sizes[size]
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton || headerRight) && (
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-light-border dark:border-dark-border">
              <div className="min-w-0 flex-1">
                {title && (
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-white truncate">{title}</h2>
                )}
                {description && (
                  <p className="text-sm text-zinc-500 mt-0.5">{description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {headerRight}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-red-500 dark:hover:bg-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Body */}
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-160px)]">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-light-border dark:border-dark-border bg-light-surface/50 dark:bg-dark-surface/50">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Confirm Dialog
export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  helperText?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  loadingText?: string;
  confirmIcon?: React.ReactNode;
  /** Evita cerrar por overlay/escape/x mientras está cargando */
  blockCloseWhileLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  helperText,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false,
  loadingText,
  confirmIcon,
  blockCloseWhileLoading = true,
}) => {
  const safeClose = () => {
    if (blockCloseWhileLoading && isLoading) return;
    onClose();
  };

  const confirmButtonClassName =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : variant === 'warning'
        ? 'bg-amber-600 hover:bg-amber-700 text-white'
        : 'bg-blue-600 hover:bg-blue-700 text-white';

  const effectiveLoadingText =
    loadingText ?? (variant === 'danger' ? 'Eliminando...' : 'Procesando...');

  return (
    <Modal
      isOpen={isOpen}
      onClose={safeClose}
      title={title}
      size="sm"
      showCloseButton
      closeOnOverlay={!(blockCloseWhileLoading && isLoading)}
      closeOnEscape={!(blockCloseWhileLoading && isLoading)}
    >
      <div className="space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
        {helperText && (
          <p className="text-xs text-zinc-500">
            {helperText}
          </p>
        )}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={safeClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className={confirmButtonClassName}
            leftIcon={confirmIcon}
          >
            {isLoading ? effectiveLoadingText : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default Modal;
