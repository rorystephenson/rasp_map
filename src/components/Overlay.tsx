import React, { ReactNode } from 'react';
import { useRouter } from '../router/RouterContext';

interface OverlayProps {
  title: string;
  children: ReactNode;
  actionButtons?: ReactNode; // Optional buttons to show next to close button
  className?: string; // Optional additional class for the overlay container
  zIndex?: number; // Optional z-index for the backdrop
  alignItems?: 'center' | 'flex-start'; // Vertical alignment of overlay
  onClose?: () => void; // Optional custom close handler
}

export const Overlay: React.FC<OverlayProps> = ({
  title,
  children,
  actionButtons,
  className = '',
  zIndex = 2000,
  alignItems = 'center',
  onClose
}) => {
  const router = useRouter();

  // Use custom close handler if provided, otherwise use router's smart back
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  return (
    <div
      className="overlay-backdrop"
      onClick={handleClose}
      style={{
        zIndex,
        alignItems
      }}
    >
      <div
        className={`overlay ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overlay-header">
          <h2>{title}</h2>
          <div className="overlay-actions">
            {actionButtons}
            <button
              onClick={handleClose}
              className="overlay-close"
              title="Chiudi"
            >
              <img src="/close_icon.svg" alt="Close" width="24" height="24" className="close-icon-desktop" />
              <img src="/back_icon.svg" alt="Back" width="24" height="24" className="close-icon-mobile" />
            </button>
          </div>
        </div>

        <div className="overlay-content">
          {children}
        </div>
      </div>
    </div>
  );
};
