import React from 'react';
import { useRouter } from '../router/RouterContext';
import { Overlay } from './Overlay';

interface LogoutConfirmationOverlayProps {
  onLogout: () => void;
}

export const LogoutConfirmationOverlay: React.FC<LogoutConfirmationOverlayProps> = ({
  onLogout
}) => {
  const router = useRouter();

  const handleCancel = () => {
    router.back();
  };

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
          <button className="logout-confirmation-cancel" onClick={handleCancel}>
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
