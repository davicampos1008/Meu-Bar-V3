import React from 'react';

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'Erro inesperado na interface.',
    };
  }

  componentDidCatch(error: Error) {
    // Log discreto apenas no console para diagnóstico sem expor stack sensível na UI
    console.error('[Meu Bar] Erro capturado pela proteção de estabilidade:', error?.message);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleSafeReset = () => {
    try {
      // Limpa apenas chaves temporárias de UI mantendo sessão de login
      const keysToKeep = new Set<string>();
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('sb-')) keysToKeep.add(k);
      }
      const backup: Record<string, string> = {};
      keysToKeep.forEach((k) => {
        const v = localStorage.getItem(k);
        if (v !== null) backup[k] = v;
      });
      localStorage.clear();
      Object.entries(backup).forEach(([k, v]) => localStorage.setItem(k, v));
    } catch {
      // ignore
    }
    window.location.href = window.location.origin + window.location.pathname;
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: '#0c0b0a', color: '#f5f0e8' }}
      >
        <div
          className="max-w-md w-full rounded-2xl p-6 space-y-4 border"
          style={{ background: '#161412', borderColor: 'rgba(255,255,255,0.12)' }}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Proteção contra queda ativada
          </div>
          <h1 className="text-xl font-bold !m-0">
            Ops! Recuperamos a tela com segurança
          </h1>
          <p className="text-sm text-white/70 !m-0 leading-relaxed">
            Ocorreu uma instabilidade pontual de leitura nesta tela. Seus dados no servidor estão
            preservados e protegidos.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" className="b grow" onClick={this.handleReload}>
              Recarregar agora
            </button>
            <button type="button" className="b g grow" onClick={this.handleSafeReset}>
              Limpar cache local e voltar
            </button>
          </div>
        </div>
      </div>
    );
  }
}
