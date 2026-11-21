import React, { useState } from 'react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{
  variant?: 'pill' | 'row' | 'button' | 'card';
}> = ({ variant = 'pill' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    if (variant === 'card') {
      return (
        <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-[var(--ok)] font-semibold">
          ✓ Aplicativo já instalado neste dispositivo
        </div>
      );
    }
    return null;
  }

  // Em variantes compactas da barra superior, só aparece se houver prompt nativo ou iOS
  if ((variant === 'pill' || variant === 'button') && !isInstallable && !isIOS) {
    return null;
  }

  const handleClick = () => {
    if (isInstallable) {
      void install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      {variant === 'card' ? (
        <div className="rounded-xl border border-white/10 bg-black/20 p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-[var(--fg)]">
              Baixar Meu Bar Grátis (App)
            </div>
            <div className="text-xs text-[var(--mut)] mt-0.5">
              {isInstallable
                ? 'Instalação direta em 1 toque (Android / PC / Mac)'
                : isIOS
                  ? 'Adicionar à tela inicial do iPhone / iPad pelo Safari'
                  : 'Instale grátis na tela inicial sem ocupar memória'}
            </div>
          </div>
          <button
            type="button"
            className="b sm shrink-0 whitespace-nowrap"
            onClick={handleClick}
          >
            {isInstallable ? 'Instalar agora' : 'Como instalar'}
          </button>
        </div>
      ) : variant === 'row' ? (
        <button type="button" className="menu-row-item" onClick={handleClick}>
          <div className="menu-row-text">
            <div className="menu-row-title">📲 Baixar / Instalar Meu Bar Grátis</div>
            <div className="menu-row-sub">
              {isIOS
                ? 'Adicionar à tela inicial do iPhone / iPad'
                : 'Instale como aplicativo na tela inicial (Android / Desktop)'}
            </div>
          </div>
          <span className="menu-row-chev">›</span>
        </button>
      ) : variant === 'button' ? (
        <button type="button" className="b sm" onClick={handleClick}>
          📲 Baixar app grátis
        </button>
      ) : (
        <button type="button" className="bar-switcher-pill" onClick={handleClick}>
          📲 Instalar
        </button>
      )}

      {showGuide && (
        <div className="ov" onClick={() => setShowGuide(false)}>
          <div className="w narrow" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="b g sm" onClick={() => setShowGuide(false)}>
              ← Voltar
            </button>
            <h1 className="mt-4">Instalar Meu Bar Grátis</h1>
            <div className="panel space-y-3 text-sm">
              {isIOS ? (
                <p className="mu">
                  <b>No iPhone / iPad (Safari):</b>
                  <br />
                  1. Toque no botão <b>Compartilhar</b> na barra inferior do Safari.
                  <br />
                  2. Role para baixo e toque em <b>Adicionar à Tela de Início</b>.
                  <br />
                  3. Toque em <b>Adicionar</b> para abrir em tela cheia como aplicativo.
                </p>
              ) : (
                <>
                  <p className="mu">
                    <b>No Android (Chrome / Edge):</b>
                    <br />
                    1. Toque no menu <b>⋮</b> no canto superior direito do navegador.
                    <br />
                    2. Toque em <b>Instalar aplicativo</b> ou <b>Adicionar à tela inicial</b>.
                  </p>
                  <p className="mu">
                    <b>No Computador (Chrome / Edge):</b>
                    <br />
                    Clique no ícone de <b>Instalar (tela com seta)</b> no canto direito da barra de endereços.
                  </p>
                </>
              )}
              <button
                type="button"
                className="b full mt-2"
                onClick={() => setShowGuide(false)}
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
