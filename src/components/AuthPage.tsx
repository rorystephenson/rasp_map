import React, { useState } from 'react';
import { apiClient } from '../api/client';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [userKey, setUserKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userKey.trim()) {
      setError('Inserisci la tua chiave di autenticazione');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await apiClient.authenticate(userKey.trim());
      
      if (result.success) {
        onAuthSuccess();
      } else {
        setError(result.error || 'Autenticazione fallita');
      }
    } catch (err) {
      setError('Errore di rete. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>RASP Map</h1>
        <p>Inserisci la tua chiave di autenticazione per accedere alle previsioni parapendio</p>

        <div className="instructions-section">
          <button
            type="button"
            className="instructions-toggle"
            onClick={() => setIsInstructionsOpen(!isInstructionsOpen)}
          >
            {isInstructionsOpen ? '▼' : '▶'} Come ottenere la chiave di accesso
          </button>

          {isInstructionsOpen && (
            <div className="instructions-content">
              <ol className="instructions-list">
                <li>
                  Accedi al sito <a href="https://www.fivl.it/index.php/user-login" target="_blank" rel="noopener noreferrer">fivl.it</a>
                </li>
                <li>
                  Nel menu vai a "Meteo → Consulta il servizio meteo" (<a href="https://www.fivl.it/index.php/blipmaps" target="_blank" rel="noopener noreferrer">link diretto</a>)
                </li>
                <li>
                  Seleziona l'icona del telefono e nel popup che si apre scegli "Richiedi istruzioni e chiavi di attivazione"
                  <div className="instruction-screenshot">
                    <img src="/tutorial/tutorial_icon.png" alt="Icona telefono" />
                    <img src="/tutorial/tutorial_button.png" alt="Popup richiesta chiave" />
                  </div>
                </li>
                <li>
                  Copia il codice in grassetto e incollalo nel campo qui sotto
                  <div className="instruction-screenshot">
                    <img src="/tutorial/tutorial_key.png" alt="Codice di accesso" />
                  </div>
                </li>
              </ol>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="userKey">Chiave di autenticazione:</label>
            <input
              id="userKey"
              type="text"
              value={userKey}
              onChange={(e) => setUserKey(e.target.value)}
              placeholder="XXXX-XXXX-XXXX-XXXX"
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
            {isLoading ? 'Autenticazione...' : 'Accedi'}
          </button>
        </form>
      </div>
    </div>
  );
};