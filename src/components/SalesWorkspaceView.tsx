import React, { useMemo, useState } from 'react';
import { buildWhatsAppLink, hasPlatformPermission, sanitizeHttpUrl } from '../lib/saas';
import { money } from '../lib/utils';
import type { PlatformSaaSConfig } from '../types/meubar';
import { AdminSimulatorView } from './AdminSimulatorView';

type SalesTab = 'pitch' | 'simulator' | 'roi';

export const SalesWorkspaceView: React.FC<{
  userEmail?: string | null;
  actorName?: string;
  config: PlatformSaaSConfig;
  canOpenAdminArea?: boolean;
  onOpenAdminArea?: () => void;
  onOpenSalesSite?: () => void;
  onToast: (msg: string) => void;
}> = ({
  userEmail,
  actorName = 'Consultor Comercial',
  config,
  canOpenAdminArea = false,
  onOpenAdminArea,
  onOpenSalesSite,
  onToast,
}) => {
  const canUseSimulator = hasPlatformPermission(userEmail, 'use_simulator', config);
  const canManageVip = hasPlatformPermission(userEmail, 'manage_vip_plans', config);

  const [tab, setTab] = useState<SalesTab>(canUseSimulator ? 'pitch' : 'pitch');

  // Calculadora rápida de retorno (ROI) para mostrar ao dono do bar na hora da venda
  const [monthlyOrders, setMonthlyOrders] = useState('450');
  const [avgTicket, setAvgTicket] = useState('48');
  const [deliverySharePct, setDeliverySharePct] = useState('30');

  const roiStats = useMemo(() => {
    const orders = Math.max(0, Number(monthlyOrders) || 0);
    const ticket = Math.max(0, Number(avgTicket) || 0);
    const delPct = Math.min(100, Math.max(0, Number(deliverySharePct) || 0)) / 100;

    const grossRevenue = orders * ticket;
    const deliveryRevenue = grossRevenue * delPct;
    // Economia típica evitando comissão ~18% de marketplace no delivery próprio + redução ~3% erros/perdas de comanda
    const savedMarketplace = deliveryRevenue * 0.18;
    const savedOperations = grossRevenue * 0.03;
    const totalMonthlyGain = savedMarketplace + savedOperations;
    const netGain = totalMonthlyGain - (config.pro_price_monthly || 59.9);
    const paybackDays =
      totalMonthlyGain > 0
        ? Math.max(1, Math.round(((config.pro_price_monthly || 59.9) / totalMonthlyGain) * 30))
        : 30;

    return {
      grossRevenue,
      savedMarketplace,
      savedOperations,
      totalMonthlyGain,
      netGain,
      paybackDays,
    };
  }, [monthlyOrders, avgTicket, deliverySharePct, config.pro_price_monthly]);

  const siteUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    try {
      const u = new URL(window.location.origin + window.location.pathname);
      u.searchParams.set('site', '1');
      return u.toString();
    } catch {
      return '';
    }
  }, []);

  const monthlyCheckout = sanitizeHttpUrl(config.checkout_monthly_url);
  const yearlyCheckout = sanitizeHttpUrl(config.checkout_yearly_url);
  const commercialWa = buildWhatsAppLink(
    config.support_whatsapp,
    `Olá! Vi a demonstração do Meu Bar com ${actorName} e quero ativar o Plano Pro (${config.trial_days} dias grátis).`
  );

  const copyText = async (text: string, okMsg: string) => {
    try {
      await navigator.clipboard?.writeText(text);
      onToast(okMsg);
    } catch {
      onToast('Não foi possível copiar automaticamente.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="panel !border-[var(--ac)]/45 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--ac)]">
              💼 Perfil Comercial & Demonstração
            </div>
            <h1 className="!mt-0.5 !mb-0.5 text-xl font-extrabold">
              Painel de Vendas · Meu Bar
            </h1>
            <p className="mu text-xs !mb-0">
              Olá, <b>{actorName}</b>. Use o simulador ao vivo, a apresentação visual e a calculadora de economia para fechar novos bares com clareza.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onOpenSalesSite && (
              <button type="button" className="b sm" onClick={onOpenSalesSite}>
                🌟 Abrir Site de Apresentação
              </button>
            )}
            {canOpenAdminArea && onOpenAdminArea && (
              <button type="button" className="b g sm" onClick={onOpenAdminArea}>
                👑 Ir para Área ADM
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className={`chip ${tab === 'pitch' ? 'on' : ''}`}
            onClick={() => setTab('pitch')}
          >
            🎯 Roteiro & Fechamento
          </button>
          {canUseSimulator && (
            <button
              type="button"
              className={`chip ${tab === 'simulator' ? 'on' : ''}`}
              onClick={() => setTab('simulator')}
            >
              🧪 Simulador Interativo ao Vivo
            </button>
          )}
          <button
            type="button"
            className={`chip ${tab === 'roi' ? 'on' : ''}`}
            onClick={() => setTab('roi')}
          >
            📈 Calculadora de Economia (ROI)
          </button>
        </div>
      </div>

      {tab === 'simulator' && canUseSimulator && (
        <div className="space-y-2">
          <div className="panel !p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span>
              🧪 <b>Modo Demonstração Seguro:</b> alterne entre Cliente (QR), Garçom, Barman, Cozinha, Caixa e Dono sem alterar dados reais.
            </span>
            <button type="button" className="b g sm" onClick={() => setTab('pitch')}>
              ← Voltar ao Roteiro
            </button>
          </div>
          <AdminSimulatorView onToast={onToast} />
        </div>
      )}

      {tab === 'pitch' && (
        <div className="space-y-4">
          {/* Resumo da oferta comercial configurada pelo ADM */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="panel !m-0 !p-4">
              <div className="text-xs font-semibold text-[var(--mut)]">Plano Pro Mensal</div>
              <div className="text-2xl font-extrabold text-[var(--ac)] tabular-nums mt-1">
                {money(config.pro_price_monthly)}
                <span className="text-xs font-normal text-[var(--mut)]">/mês</span>
              </div>
              <div className="text-[11px] text-[var(--mut)] mt-1">
                Sem comissão por pedido ou delivery
              </div>
            </div>
            <div className="panel !m-0 !p-4">
              <div className="text-xs font-semibold text-[var(--mut)]">Plano Pro Anual</div>
              <div className="text-2xl font-extrabold text-[var(--ok)] tabular-nums mt-1">
                {money(config.pro_price_yearly)}
                <span className="text-xs font-normal text-[var(--mut)]">/ano</span>
              </div>
              <div className="text-[11px] text-[var(--ok)] mt-1">
                Economia de {Math.max(0, Math.round((1 - (config.pro_price_yearly || 599) / ((config.pro_price_monthly || 59.9) * 12)) * 100))}% no plano anual
              </div>
            </div>
            <div className="panel !m-0 !p-4">
              <div className="text-xs font-semibold text-[var(--mut)]">Teste Grátis (Trial)</div>
              <div className="text-2xl font-extrabold tabular-nums mt-1">
                {config.trial_days} dias
              </div>
              <div className="text-[11px] text-[var(--mut)] mt-1">
                Plano Grátis até {config.free_max_tables} mesas para começar hoje
              </div>
            </div>
          </div>

          {/* Roteiro de demonstração em 5 passos */}
          <div className="panel space-y-3">
            <div className="row sp flex-wrap gap-2">
              <div>
                <h2 className="!m-0">Roteiro de Demonstração para o Cliente</h2>
                <p className="mu text-xs !mt-0.5 !mb-0">
                  Mostre na prática como o bar ganha agilidade do balcão à mesa.
                </p>
              </div>
              {canUseSimulator && (
                <button
                  type="button"
                  className="b ok sm"
                  onClick={() => setTab('simulator')}
                >
                  ▶ Abrir Simulador Agora
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
              {[
                {
                  step: '1. Cardápio QR Inteligente',
                  desc: 'O cliente escaneia na mesa, vê drinks com fotos, abre comanda com código de 4 dígitos, chama o garçom e pede a conta sem baixar app.',
                },
                {
                  step: '2. Estoque Automático no Cardápio',
                  desc: 'Faltou limão ou gin no estoque? O Meu Bar oculta automaticamente os drinks afetados no cardápio QR para evitar pedido frustrado.',
                },
                {
                  step: '3. KDS Barman & Cozinha Separados',
                  desc: 'Drinks vão para a tela do Barman com receita/medidas exatas; porções vão para a Cozinha; quando fica pronto, o Garçom recebe alerta sonoro.',
                },
                {
                  step: '4. Caixa Pro, 10%, Pix & Impressão',
                  desc: 'Turno com sangria/suprimento, QR Code Pix instantâneo, divisão de conta, pagamento misto e cupom em impressora térmica 58mm/80mm.',
                },
                {
                  step: '5. Delivery Próprio 0% Taxa & Fidelidade',
                  desc: 'Link próprio de delivery com despacho para motoboys + cartão fidelidade e Happy Hour automático por dia e horário.',
                },
                {
                  step: '6. Modo Canva & Gestão de Equipe',
                  desc: 'Personalize cores, brasão e QR da loja, controle permissões por cargo (RBAC) e calcule CMV e lucro real.',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl p-3 bg-[var(--s2)] border border-[var(--bd)] space-y-1"
                >
                  <div className="font-extrabold text-[var(--ac)]">{item.step}</div>
                  <div className="text-[var(--mut)] leading-relaxed">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Ferramentas de fechamento e envio de links */}
          <div className="panel space-y-3">
            <h2 className="!m-0">Links para Enviar ao Cliente & Fechar Venda</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {siteUrl && (
                <button
                  type="button"
                  className="b g sm !justify-between"
                  onClick={() => void copyText(siteUrl, 'Link da apresentação comercial copiado!')}
                >
                  <span>📋 Copiar link da Apresentação</span>
                  <span className="text-[var(--ac)]">Copiar</span>
                </button>
              )}
              {monthlyCheckout && (
                <button
                  type="button"
                  className="b ok sm !justify-between"
                  onClick={() => void copyText(monthlyCheckout, 'Link de checkout Mensal copiado!')}
                >
                  <span>💳 Copiar Checkout Pro Mensal</span>
                  <span>Copiar</span>
                </button>
              )}
              {yearlyCheckout && (
                <button
                  type="button"
                  className="b ok sm !justify-between"
                  onClick={() => void copyText(yearlyCheckout, 'Link de checkout Anual copiado!')}
                >
                  <span>💎 Copiar Checkout Pro Anual</span>
                  <span>Copiar</span>
                </button>
              )}
              {commercialWa && (
                <a
                  href={commercialWa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="b g sm !justify-between no-underline"
                >
                  <span>💬 WhatsApp Comercial da Plataforma</span>
                  <span className="text-[var(--ok)]">Abrir</span>
                </a>
              )}
            </div>

            {canManageVip && canOpenAdminArea && onOpenAdminArea && (
              <div className="rounded-xl p-3 bg-emerald-500/10 border border-emerald-400/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span>
                  👑 Sua conta também tem permissão para <b>liberar planos / VIP</b> para clientes cadastrados após o fechamento.
                </span>
                <button type="button" className="b ok sm" onClick={onOpenAdminArea}>
                  Abrir Gestão de Planos →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'roi' && (
        <div className="panel space-y-4">
          <div>
            <h2 className="!m-0">📈 Simulador de Economia para o Cliente</h2>
            <p className="mu text-xs !mt-0.5 !mb-0">
              Preencha com o dono do bar quanto ele vende hoje e mostre quanto o Meu Bar economiza por mês.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="!mt-0">Pedidos por mês no bar</label>
              <input
                type="number"
                min="10"
                value={monthlyOrders}
                onChange={(e) => setMonthlyOrders(e.target.value)}
              />
            </div>
            <div>
              <label className="!mt-0">Ticket médio (R$)</label>
              <input
                type="number"
                min="5"
                value={avgTicket}
                onChange={(e) => setAvgTicket(e.target.value)}
              />
            </div>
            <div>
              <label className="!mt-0">% de pedidos via Delivery</label>
              <input
                type="number"
                min="0"
                max="100"
                value={deliverySharePct}
                onChange={(e) => setDeliverySharePct(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl p-4 bg-[var(--s2)] border border-[var(--bd)]">
              <div className="text-xs text-[var(--mut)]">Economia estimada / mês</div>
              <div className="text-2xl font-extrabold text-[var(--ok)] tabular-nums mt-1">
                {money(roiStats.totalMonthlyGain)}
              </div>
              <div className="text-[11px] text-[var(--mut)] mt-1">
                {money(roiStats.savedMarketplace)} sem taxas de delivery + {money(roiStats.savedOperations)} evitando perdas/erros
              </div>
            </div>
            <div className="rounded-2xl p-4 bg-[var(--s2)] border border-[var(--bd)]">
              <div className="text-xs text-[var(--mut)]">Investimento Meu Bar Pro</div>
              <div className="text-2xl font-extrabold text-[var(--ac)] tabular-nums mt-1">
                {money(config.pro_price_monthly)}
              </div>
              <div className="text-[11px] text-[var(--mut)] mt-1">
                Se paga em cerca de <b>{roiStats.paybackDays} dia(s)</b> de operação
              </div>
            </div>
            <div className="rounded-2xl p-4 bg-emerald-500/10 border border-emerald-400/40">
              <div className="text-xs text-emerald-200">Ganho líquido estimado / mês</div>
              <div className="text-2xl font-extrabold text-emerald-300 tabular-nums mt-1">
                {money(Math.max(0, roiStats.netGain))}
              </div>
              <div className="text-[11px] text-emerald-200/80 mt-1">
                Após pagar a assinatura mensal do sistema
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
