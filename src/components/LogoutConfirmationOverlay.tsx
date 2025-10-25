import React from 'react';
import { Overlay } from './Overlay';

interface LogoutConfirmationOverlayProps {
  onLogout: () => void;
}

export const LogoutConfirmationOverlay: React.FC<LogoutConfirmationOverlayProps> = ({
  onLogout
}) => {
  return (
    <Overlay
      title="Conferma uscita"
      className="logout-confirmation-dialog"
      zIndex={3000}
      alignItems="center"
    >
      <div className="logout-confirmation-content">
        <p>Sei sicuro di voler uscire?</p>
        <div className="logout-confirmation-actions">
          <button className="logout-confirmation-cancel" onClick={() => window.history.back()}>
            Annulla
          </button>
          <button className="logout-confirmation-confirm" onClick={onLogout}>
            Esci
          </button>
        </div>
      </div>
    </Overlay>
  );
};
