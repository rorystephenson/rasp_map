import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useI18n } from '../i18n/I18nContext';
import { trackEvent } from '../analytics/umami';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const { t } = useI18n();
  const [userKey, setUserKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);

  // Track auth page view
  useEffect(() => {
    trackEvent({ name: 'auth_page_view' });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userKey.trim()) {
      setError(t('auth.errorEmpty'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await apiClient.authenticate(userKey.trim());

      if (result.success) {
        trackEvent({
          name: 'login_attempt',
          data: { success: true },
        });
        onAuthSuccess();
      } else {
        trackEvent({
          name: 'login_attempt',
          data: { success: false },
        });
        setError(result.error || t('auth.errorFailed'));
      }
    } catch (err) {
      trackEvent({
        name: 'login_attempt',
        data: { success: false },
      });
      setError(t('auth.errorNetwork'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>{t('auth.title')}</h1>
        <p>{t('auth.description')}</p>

        <div className="instructions-section">
          <button
            type="button"
            className="instructions-toggle"
            onClick={() => setIsInstructionsOpen(!isInstructionsOpen)}
          >
            {isInstructionsOpen ? '▼' : '▶'} {t('auth.howToGetKey')}
          </button>

          {isInstructionsOpen && (
            <div className="instructions-content">
              <ol className="instructions-list">
                <li>
                  {t('auth.instructions.step1')} <a href="https://www.fivl.it/index.php/user-login" target="_blank" rel="noopener noreferrer">fivl.it</a>
                </li>
                <li>
                  {t('auth.instructions.step2')} (<a href="https://www.fivl.it/index.php/blipmaps" target="_blank" rel="noopener noreferrer">link diretto</a>)
                </li>
                <li>
                  {t('auth.instructions.step3')}
                  <div className="instruction-screenshot">
                    <img src="/tutorial/tutorial_icon.png" alt={t('ui.tutorialPhoneIcon')} />
                    <img src="/tutorial/tutorial_button.png" alt={t('ui.tutorialPopup')} />
                  </div>
                </li>
                <li>
                  {t('auth.instructions.step4')}
                  <div className="instruction-screenshot">
                    <img src="/tutorial/tutorial_key.png" alt={t('ui.tutorialKey')} />
                  </div>
                </li>
              </ol>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="userKey">{t('auth.keyLabel')}</label>
            <input
              id="userKey"
              type="text"
              value={userKey}
              onChange={(e) => setUserKey(e.target.value)}
              placeholder={t('auth.keyPlaceholder')}
              disabled={isLoading}
              className="auth-input"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            disabled={isLoading}
            className="auth-button"
          >
            {isLoading ? t('auth.submitting') : t('auth.submit')}
          </button>
        </form>
      </div>
    </div>
  );
};