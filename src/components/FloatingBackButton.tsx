import React, { useEffect, useRef, useState } from 'react';

interface FloatingBackButtonProps {
  visible: boolean;
  label?: string;
  onBack: () => void;
  /** Offset superior em px (padrão 58px logo abaixo do cabeçalho .top; use 0 quando não houver .top) */
  topOffset?: number;
  /** Variante escura fixa para telas como Apresentação de Vendas */
  darkSurface?: boolean;
}

/**
 * Barra Voltar fixa e retrátil em fluxo normal do documento (ZERO sobreposição):
 * - No topo da tela, ocupa sua própria faixa limpa abaixo do cabeçalho, empurrando o conteúdo sem cobrir nada.
 * - Quando o usuário rola para baixo (> 32px), recolhe suavemente para liberar a leitura.
 * - Assim que o usuário rola um pouco para cima, desliza imediatamente de volta como barra fixa abaixo do topo.
 */
export const FloatingBackButton: React.FC<FloatingBackButtonProps> = ({
  visible,
  label = 'Voltar',
  onBack,
  topOffset = 58,
  darkSurface = false,
}) => {
  const [shown, setShown] = useState(true);
  const lastYRef = useRef(0);
  const lastTargetRef = useRef<EventTarget | null>(null);

  useEffect(() => {
    if (!visible) return;
    setShown(true);
    lastYRef.current = typeof window !== 'undefined' ? window.scrollY || 0 : 0;
    lastTargetRef.current = window;

    const handleScroll = (ev: Event) => {
      const target = ev.target;
      let currentY = 0;

      if (target === document || target === window) {
        currentY = window.scrollY || document.documentElement.scrollTop || 0;
      } else if (target instanceof HTMLElement) {
        if (target.scrollHeight <= target.clientHeight + 24) return;
        currentY = target.scrollTop;
      } else {
        return;
      }

      if (lastTargetRef.current !== target) {
        lastTargetRef.current = target;
        lastYRef.current = currentY;
        return;
      }

      const delta = currentY - lastYRef.current;

      if (currentY <= 32) {
        setShown(true);
        lastYRef.current = currentY;
        return;
      }

      if (delta > 12) {
        setShown(false);
        lastYRef.current = currentY;
      } else if (delta < -8) {
        setShown(true);
        lastYRef.current = currentY;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [visible, label]);

  if (!visible) return null;

  return (
    <div
      className={`back-bar-shell ${darkSurface ? 'dark-surface' : ''} ${shown ? '' : 'is-hidden'}`}
      style={topOffset === 0 ? { top: 0 } : undefined}
    >
      <div className="back-bar-inner">
        <button
          type="button"
          onClick={onBack}
          aria-label={label}
          className="back-bar-btn"
        >
          <span aria-hidden="true" className="back-bar-arrow">
            ←
          </span>
          <span className="back-bar-label">{label}</span>
        </button>
      </div>
    </div>
  );
};
