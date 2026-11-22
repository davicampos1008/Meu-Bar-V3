import React, { useEffect, useRef, useState } from 'react';

interface FloatingBackButtonProps {
  visible: boolean;
  label?: string;
  onBack: () => void;
  /** Offset superior em px (padrão logo abaixo do topo fixo) */
  topOffset?: number;
  /** Variante escura fixa para telas como Apresentação de Vendas */
  darkSurface?: boolean;
}

/**
 * Botão Voltar fixo e retrátil:
 * - Quando o usuário rola para baixo (> 36px), recolhe suavemente para liberar a tela.
 * - Assim que o usuário rola um pouco para cima (ou volta ao topo), reaparece na hora.
 * - Escuta tanto o scroll da janela quanto qualquer container .ov (modais roláveis).
 */
export const FloatingBackButton: React.FC<FloatingBackButtonProps> = ({
  visible,
  label = 'Voltar',
  onBack,
  topOffset = 66,
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
        // Ignora rolagens horizontais ou elementos muito curtos
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

      // Rolou para baixo -> retrai
      if (delta > 12) {
        setShown(false);
        lastYRef.current = currentY;
      } else if (delta < -8) {
        // Rolou um pouco para cima -> volta imediatamente
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
      className="fixed left-0 right-0 z-[48] pointer-events-none px-3 sm:px-5"
      style={{
        top: `${topOffset}px`,
        transform: shown ? 'translate3d(0, 0, 0)' : 'translate3d(0, -140%, 0)',
        opacity: shown ? 1 : 0,
        transition: 'transform 190ms cubic-bezier(0.16, 1, 0.3, 1), opacity 160ms ease',
      }}
    >
      <div className="max-w-[1160px] mx-auto flex items-center justify-start">
        <button
          type="button"
          onClick={onBack}
          aria-label={label}
          className="pointer-events-auto inline-flex items-center gap-2 min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold tracking-tight cursor-pointer backdrop-blur-md shadow-lg active:scale-[0.97] transition-transform whitespace-nowrap shrink-0"
          style={
            darkSurface
              ? {
                  backgroundColor: 'rgba(22, 20, 18, 0.92)',
                  color: '#F5F0E8',
                  border: '1px solid rgba(229, 169, 60, 0.48)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
                }
              : {
                  backgroundColor: 'color-mix(in srgb, var(--s1) 92%, transparent)',
                  color: 'var(--tx)',
                  border: '1px solid var(--bd)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.24)',
                }
          }
        >
          <span
            aria-hidden="true"
            className="text-sm leading-none"
            style={{ color: darkSurface ? '#E5A93C' : 'var(--ac)' }}
          >
            ←
          </span>
          <span className="max-w-[220px] truncate">{label}</span>
        </button>
      </div>
    </div>
  );
};
