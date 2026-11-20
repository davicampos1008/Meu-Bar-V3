import React, { useState } from 'react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ variant?: 'pill' | 'row' | 'button' }> = ({
  variant = 'pill',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleClick = () => {
    if (isInstallable) {
      void install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      {variant === 'row' ? (
        <button type="button" className="menu-row-item" onClick={handleClick}>
          <div className="menu-row-text">
            <div className="menu-row-title">📲 Instalar Meu Bar</div>
            <div className="menu-row-sub">
              {isIOS
                ? 'Adicionar à tela inicial do iPhone / iPad'
                : 'Instale como app na tela inicial (Android / Desktop)'}
            </div>
          </div>
          <span className="menu-row-chev">›</span>
        </button>
      ) : variant === 'button' ? (
        <button type="button" className="b sm" onClick={handleClick}>
          📲 Instalar app
        </button>
      ) : (
        <button type="button" className="bar-switcher-pill" onClick={handleClick}>
          📲 Instalar
        </button>
      )}

      {showIOSGuide && (
        <div className="ov">
          <div className="w narrow">
            <button type="button" className="b g sm" onClick={() => setShowIOSGuide(false)}>
              ← Voltar
            </button>
            <h1 className="mt-4">Instalar no iPhone / iPad</h1>
            <div className="panel">
              <p className="mu">
                1. Toque no botão <b>Compartilhar</b> na barra do Safari.
                <br />
                2. Role para baixo e toque em <b>Adicionar à Tela de Início</b>.
                <br />
                3. Toque em <b>Adicionar</b> para abrir em tela cheia como aplicativo.
              </p>
              <button
                type="button"
                className="b full mt-4"
                onClick={() => setShowIOSGuide(false)}
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="offline-pill" role="status" aria-live="polite">
      <span className="offline-dot" />
      <span>Modo offline — usando cache</span>
    </div>
  );
};
