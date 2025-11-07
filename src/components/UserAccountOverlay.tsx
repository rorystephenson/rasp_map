import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useI18n } from '../i18n/I18nContext';
import { Overlay } from './Overlay';

export const UserAccountOverlay: React.FC = () => {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountHtml, setAccountHtml] = useState<string | null>(null);

  const loadAccountInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAccountHtml(null);

    const response = await apiClient.getUserAccount();

    if (response.success && response.rawHtml) {
      setAccountHtml(response.rawHtml);
    } else {
      setError(response.error || t('account.error'));
    }

    setIsLoading(false);
  }, [t]);

  useEffect(() => {
    loadAccountInfo();
  }, [loadAccountInfo]);

  return (
    <Overlay
      title={t('account.title')}
      className="user-account-overlay"
      zIndex={2000}
      alignItems="center"
    >
      <div className="user-account-content">
        {isLoading && (
          <div className="account-loading">
            <p>{t('account.loading')}</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="account-error">
            <p>{error}</p>
            <button onClick={loadAccountInfo} className="retry-button">
              {t('account.retry')}
            </button>
          </div>
        )}

        {accountHtml && !isLoading && (
          <div className="account-html" dangerouslySetInnerHTML={{ __html: accountHtml }} />
        )}
      </div>
    </Overlay>
  );
};
