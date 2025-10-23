import React from 'react';

interface LogoutConfirmationOverlayProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const LogoutConfirmationOverlay: React.FC<LogoutConfirmationOverlayProps> = ({
  isOpen,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="logout-confirmation-backdrop" onClick={onCancel}>
      <div className="logout-confirmation-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Conferma uscita</h2>
        <p>Sei sicuro di voler uscire?</p>
        <div className="logout-confirmation-actions">
          <button className="logout-confirmation-cancel" onClick={onCancel}>
            Annulla
          </button>
          <button className="logout-confirmation-confirm" onClick={onConfirm}>
            Esci
          </button>
        </div>
      </div>
    </div>
  );
};
