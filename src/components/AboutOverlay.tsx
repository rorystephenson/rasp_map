import React from 'react';
import { useI18n } from '../i18n/I18nContext';
import { Overlay } from './Overlay';

export const AboutOverlay: React.FC = () => {
  const { t } = useI18n();

  return (
    <Overlay
      title={t('about.title')}
      className="about-overlay"
      zIndex={2000}
      alignItems="center"
    >
      <div className="about-content">
        <div className="about-section">
          <h3>{t('about.forecastSystem')}</h3>
          <p>{t('about.forecastCredit')}</p>
        </div>

        <div className="about-section">
          <h3>{t('about.mapViewer')}</h3>
          <p>{t('about.mapCredit')}</p>
        </div>
      </div>
    </Overlay>
  );
};
