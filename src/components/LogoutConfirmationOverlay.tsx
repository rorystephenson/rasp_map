import React from 'react';
import { useRouter } from '../router/RouterContext';
import { useI18n } from '../i18n/I18nContext';
import { Overlay } from './Overlay';

interface LogoutConfirmationOverlayProps {
  onLogout: () => void;
}

export const LogoutConfirmationOverlay: React.FC<LogoutConfirmationOverlayProps> = ({
  onLogout
}) => {
  const { t } = useI18n();
  const router = useRouter();

  const handleCancel = () => {
    router.back();
  };

  return (
    <Overlay
      title={t('logout.title')}
      className="logout-confirmation-dialog"
      zIndex={3000}
      alignItems="center"
    >
      <div className="logout-confirmation-content">
        <p>{t('logout.message')}</p>
        <div className="logout-confirmation-actions">
          <button className="logout-confirmation-cancel" onClick={handleCancel}>
            {t('logout.cancel')}
          </button>
          <button className="logout-confirmation-confirm" onClick={onLogout}>
            {t('logout.confirm')}
          </button>
        </div>
      </div>
    </Overlay>
  );
};
