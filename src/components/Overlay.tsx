import React, { ReactNode } from 'react';

interface OverlayProps {
  title: string;
  children: ReactNode;
  actionButtons?: ReactNode; // Optional buttons to show next to close button
  className?: string; // Optional additional class for the overlay container
  zIndex?: number; // Optional z-index for the backdrop
  alignItems?: 'center' | 'flex-start'; // Vertical alignment of overlay
}

export const Overlay: React.FC<OverlayProps> = ({
  title,
  children,
  actionButtons,
  className = '',
  zIndex = 2000,
  alignItems = 'center'
}) => {
  // Default close handler: go back in browser history
  const handleClose = () => {
    window.history.back();
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
