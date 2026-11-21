import React from 'react';
import {
  getAlertPrefsSummary,
  useAlertPrefs,
  type AlertPreferences,
} from '../lib/alertPrefs';
import { playStationAlert } from '../lib/opsUtils';

interface SwitchRowProps {
  title: string;
  subtitle: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  action?: React.ReactNode;
}

const SwitchRow: React.FC<SwitchRowProps> = ({
  title,
  subtitle,
  checked,
  disabled = false,
  onChange,
  action,
}) => (
  <div
    className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition ${
      disabled
        ? 'border-white/5 bg-black/15 opacity-55'
        : checked
          ? 'border-emerald-400/25 bg-black/20'
          : 'border-white/10 bg-black/20'
    }`}
  >
    <div className="min-w-0 flex-1">
      <div className="text-sm font-semibold text-[var(--fg)] leading-tight">{title}</div>
      <div className="text-xs text-[var(--mut)] mt-0.5 leading-snug">{subtitle}</div>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      {action}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${
          checked
            ? 'bg-emerald-500 border-emerald-400'
            : 'bg-white/10 border-white/15'
        } ${disabled ? 'cursor-not-allowed' : ''}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  </div>
);

interface AlertSettingsViewProps {
  isPlatformAdmin: boolean;
  onBack: () => void;
}

export const AlertSettingsView: React.FC<AlertSettingsViewProps> = ({
  isPlatformAdmin,
  onBack,
}) => {
  const { prefs, setPref, patchPrefs, enableAll, disableAll } = useAlertPrefs();
  const summary = getAlertPrefsSummary(prefs, isPlatformAdmin);
  const masterOff = !prefs.allEnabled;

  const toggleMaster = (next: boolean) => {
    if (next) {
      const hasAnyChannel = prefs.soundEnabled || prefs.vibrationEnabled || prefs.toastEnabled;
      const hasAnyCategory =
        prefs.newOrders ||
        prefs.orderReady ||
        prefs.tableCalls ||
        prefs.lowStock ||
        prefs.offlineSync ||
        prefs.clientOrderReady ||
        prefs.adminNewAccount;
      if (!hasAnyChannel && !hasAnyCategory) {
        enableAll();
        return;
      }
    }
    setPref('allEnabled', next);
  };

  const toggleField = (key: keyof AlertPreferences, next: boolean) => {
    if (next && !prefs.allEnabled) {
      patchPrefs({ allEnabled: true, [key]: true });
    } else {
      setPref(key, next);
    }
  };

  return (
    <div>
      <button type="button" className="b g sm" onClick={onBack}>
        ← Voltar
      </button>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-xs text-[var(--ac)] font-semibold">Preferências do aparelho</div>
          <h1 className="!mt-1 !mb-1">Alertas & Notificações</h1>
          <p className="mu text-xs">
            Ative ou desative qualquer alerta, som, vibração ou aviso pop-up do app neste dispositivo.
          </p>
        </div>
        <span
          className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
            summary.isMuted
              ? 'bg-red-500/15 text-red-200 border-red-400/30'
              : 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30'
          }`}
        >
          {summary.isMuted ? '🔕' : '🔔'} {summary.label}
        </span>
      </div>

      {/* CONTROLE GERAL */}
      <div className="panel mt-3 space-y-2.5">
        <div className="row sp flex-wrap gap-2">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--ac)]">
            Controle geral
          </div>
          <div className="flex gap-1.5">
            <button type="button" className="b ok sm" onClick={enableAll}>
              Ativar todos
            </button>
            <button type="button" className="b g sm" onClick={disableAll}>
              Silenciar tudo
            </button>
          </div>
        </div>

        <SwitchRow
          title="Todos os alertas do app"
          subtitle={
            prefs.allEnabled
              ? 'Ligado · Você controla individualmente cada alerta abaixo'
              : 'Modo silencioso total · Nenhum alerta, som ou aviso será disparado'
          }
          checked={prefs.allEnabled}
          onChange={toggleMaster}
        />

        <SwitchRow
          title="Sons e bipes"
          subtitle="Toca o sininho e bipes sonoros quando chegam pedidos, chamados ou avisos"
          checked={prefs.allEnabled && prefs.soundEnabled}
          disabled={masterOff}
          onChange={(v) => toggleField('soundEnabled', v)}
          action={
            <button
              type="button"
              className="b g sm !px-2.5"
              disabled={masterOff || !prefs.soundEnabled}
              onClick={() => playStationAlert('garcom')}
            >
              Testar
            </button>
          }
        />

        <SwitchRow
          title="Vibração no celular"
          subtitle="Faz o aparelho vibrar junto com os alertas sonoros"
          checked={prefs.allEnabled && prefs.vibrationEnabled}
          disabled={masterOff}
          onChange={(v) => toggleField('vibrationEnabled', v)}
        />

        <SwitchRow
          title="Avisos rápidos na tela (pop-ups)"
          subtitle="Exibe as mensagens flutuantes (toast) de confirmação e eventos ao vivo"
          checked={prefs.allEnabled && prefs.toastEnabled}
          disabled={masterOff}
          onChange={(v) => toggleField('toastEnabled', v)}
        />
      </div>

      {/* ALERTAS DO BAR & EQUIPE */}
      <div className="panel mt-3 space-y-2.5">
        <div className="text-xs font-bold uppercase tracking-wider text-[var(--ac)]">
          Alertas do bar e da equipe
        </div>

        <SwitchRow
          title="Novos pedidos (Barman e Cozinha)"
          subtitle="Alerta sonoro e vibração quando chega um novo pedido na fila"
          checked={prefs.allEnabled && prefs.newOrders}
          disabled={masterOff}
          onChange={(v) => toggleField('newOrders', v)}
        />

        <SwitchRow
          title="Pedido pronto para entrega (Garçom)"
          subtitle="Sininho avisando que um drink ou prato está pronto para levar à mesa"
          checked={prefs.allEnabled && prefs.orderReady}
          disabled={masterOff}
          onChange={(v) => toggleField('orderReady', v)}
        />

        <SwitchRow
          title="Chamados de mesa (Garçom e Pedir a Conta)"
          subtitle="Som, aviso na tela e barra de chamados quando uma mesa chama pelo QR Code"
          checked={prefs.allEnabled && prefs.tableCalls}
          disabled={masterOff}
          onChange={(v) => toggleField('tableCalls', v)}
        />

        <SwitchRow
          title="Estoque baixo e itens sem preço"
          subtitle="Avisos automáticos de reposição e drinks liberados aguardando preço"
          checked={prefs.allEnabled && prefs.lowStock}
          disabled={masterOff}
          onChange={(v) => toggleField('lowStock', v)}
        />

        <SwitchRow
          title="Sincronização de pedidos offline"
          subtitle="Avisa quando pedidos salvos sem internet forem enviados ao reconectar"
          checked={prefs.allEnabled && prefs.offlineSync}
          disabled={masterOff}
          onChange={(v) => toggleField('offlineSync', v)}
        />
      </div>

      {/* ALERTAS DO CARDÁPIO DO CLIENTE */}
      <div className="panel mt-3 space-y-2.5">
        <div className="text-xs font-bold uppercase tracking-wider text-[var(--ac)]">
          Cardápio público (Cliente)
        </div>

        <SwitchRow
          title="Aviso de pedido pronto no cardápio"
          subtitle='Mostra a tela "Seu drink está pronto!", som e vibração ao testar ou usar o cardápio'
          checked={prefs.allEnabled && prefs.clientOrderReady}
          disabled={masterOff}
          onChange={(v) => toggleField('clientOrderReady', v)}
        />
      </div>

      {/* ALERTAS DO SUPER ADMIN */}
      {isPlatformAdmin && (
        <div className="panel mt-3 space-y-2.5 !border-[var(--ac)]/40">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--ac)]">
            Painel Admin SaaS
          </div>

          <SwitchRow
            title="Alerta de nova conta criada"
            subtitle="Som, aviso ao vivo, contador no botão Admin e banner de novos cadastros no painel"
            checked={prefs.allEnabled && prefs.adminNewAccount}
            disabled={masterOff}
            onChange={(v) => toggleField('adminNewAccount', v)}
          />
        </div>
      )}

      <p className="mu text-[11px] text-center mt-3">
        As preferências são salvas automaticamente neste aparelho e aplicadas na hora.
      </p>
    </div>
  );
};
