import React, { useState } from 'react';
import {
  buildWhatsAppLink,
  DEFAULT_SAAS_CONFIG,
  sanitizeHttpUrl,
  type BarPlanStatus,
} from '../lib/saas';
import { safeExternalUrl } from '../lib/security';
import { money } from '../lib/utils';
import type { Bar, PlatformSaaSConfig } from '../types/meubar';
import { PWAInstallButton } from './PWAControls';

export const ProGateCard: React.FC<{
  featureTitle: string;
  description: string;
  onOpenPlans: () => void;
  onBack?: () => void;
}> = ({ featureTitle, description, onOpenPlans, onBack }) => {
  return (
    <div>
      {onBack && (
        <button type="button" className="b g sm mb-3" onClick={onBack}>
          ← Voltar
        </button>
      )}
      <div className="panel mt-2 !border-[var(--ac)]/45">
        <div className="text-xs text-[var(--ac)] font-semibold">Recurso do Plano Pro</div>
        <h2 className="!mt-1 !mb-1.5">{featureTitle}</h2>
        <p className="mu text-sm">{description}</p>
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
          <button type="button" className="b" onClick={onOpenPlans}>
            Ver Planos e Liberar Pro
          </button>
          {onBack && (
            <button type="button" className="b g" onClick={onBack}>
              Continuar no Grátis
            </button>
          )}
        </div>
        <p className="mu text-xs mt-3 !mb-0">
          Seus dados, estoque e receitas continuam 100% salvos mesmo no Plano Grátis.
        </p>
      </div>
    </div>
  );
};

export const PlansView: React.FC<{
  bar: Bar | null;
  userEmail?: string | null;
  planStatus: BarPlanStatus;
  config?: PlatformSaaSConfig;
  onOpenLegal: (tab: 'terms' | 'privacy') => void;
  onBack: () => void;
  onToast: (msg: string) => void;
}> = ({
  bar,
  userEmail,
  planStatus,
  config = DEFAULT_SAAS_CONFIG,
  onOpenLegal,
  onBack,
  onToast,
}) => {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  const monthlyPrice = Number(config.pro_price_monthly || 59.9);
  const yearlyPrice = Number(config.pro_price_yearly || 599.0);
  const yearlyPerMonth = yearlyPrice / 12;
  const yearlySavingPct = Math.max(
    0,
    Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100)
  );

  const checkoutUrl = sanitizeHttpUrl(
    billing === 'yearly' ? config.checkout_yearly_url : config.checkout_monthly_url
  );
  const waMsg = `Olá! Quero ativar o Plano Pro (${
    billing === 'yearly' ? 'Anual' : 'Mensal'
  }) no Meu Bar.${bar ? ` Loja: ${bar.name}${bar.handle ? ` (@${bar.handle})` : ''}.` : ''}${
    userEmail ? ` E-mail: ${userEmail}.` : ''
  }`;
  const waLink = buildWhatsAppLink(config.support_whatsapp, waMsg);
  const primaryUpgradeHref = checkoutUrl || waLink;

  const featuresRows: { label: string; free: string; pro: string }[] = [
    {
      label: 'Estoque + Receitas Automáticas + Precificação',
      free: 'Incluso',
      pro: 'Ilimitado',
    },
    {
      label: 'Cardápio Digital com QR Code',
      free: 'Padrão (com selo Meu Bar)',
      pro: 'Personalização total, sem marca d’água',
    },
    {
      label: 'Mesas e Comandas simultâneas',
      free: `Até ${config.free_max_tables} mesas`,
      pro: 'Mesas ilimitadas + Chamar Garçom',
    },
    {
      label: 'Telas separadas (Barman, Cozinha, Garçom)',
      free: 'Fila geral',
      pro: 'Estações dedicadas + equipe ilimitada',
    },
    {
      label: 'Caixa Completo, Turnos, CMV & Relatórios CSV',
      free: 'Resumo básico',
      pro: 'Completo (sangria, divisão, lucro real)',
    },
    {
      label: 'Happy Hour Automático + Fidelidade/Cashback',
      free: '—',
      pro: 'Liberado',
    },
    {
      label: 'Impressão Térmica & Bluetooth ESC/POS',
      free: '—',
      pro: 'Liberado (58mm / 80mm)',
    },
    {
      label: 'Propagandas no painel',
      free: 'Discretas no painel',
      pro: '100% sem anúncios',
    },
  ];

  const handleCopyRequest = () => {
    void navigator.clipboard?.writeText(waMsg);
    onToast('Dados da sua loja copiados para enviar no atendimento!');
  };

  return (
    <div>
      <button type="button" className="b g sm" onClick={onBack}>
        ← Voltar
      </button>

      <div className="mt-3">
        <div className="text-xs text-[var(--mut)]">
          Meu Bar · Assinatura & Download
        </div>
        <h1 className="!mt-1 !mb-1">Planos & Versão Pro</h1>
        <p className="mu text-sm">
          Use grátis para sempre com o essencial ou ative o Plano Pro para liberar toda a operação profissional do bar.
        </p>
      </div>

      {/* Status atual */}
      <div className="panel mt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs text-[var(--mut)]">
              {bar ? `Loja atual: ${bar.name}` : 'Sua conta'}
            </div>
            <div className="text-lg font-bold mt-0.5 text-[var(--fg)]">
              {planStatus.label}
            </div>
            <div className="text-xs text-[var(--mut)] mt-0.5">
              {planStatus.effectiveTier === 'vip' &&
                (planStatus.note || 'Acesso completo liberado sem custo.')}
              {planStatus.effectiveTier === 'pro' &&
                (planStatus.expiresAt
                  ? `Ativo até ${new Date(planStatus.expiresAt).toLocaleDateString('pt-BR')} (${planStatus.daysLeft} dias restantes).`
                  : 'Plano Pro ativo sem data de expiração.')}
              {planStatus.effectiveTier === 'trial' &&
                `Você está no período de teste grátis com todas as funções Pro liberadas por mais ${planStatus.daysLeft} dia(s).`}
              {planStatus.effectiveTier === 'free' &&
                'Você está usando a versão gratuita. Assine o Pro quando quiser remover anúncios e liberar todos os módulos.'}
            </div>
          </div>
          <div className="text-xs font-semibold tabular-nums text-[var(--ok)]">
            {planStatus.isPro ? 'Todos os recursos liberados' : 'Versão gratuita ativa'}
          </div>
        </div>
      </div>

      {/* Seletor Mensal / Anual */}
      <div className="panel mt-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="!m-0">Plano Pro Completo</h2>
            <p className="mu text-xs !mt-0.5 !mb-0">
              Sem taxa por pedido e 100% presencial na sua maquininha ou Pix.
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/25 border border-white/10">
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-0 cursor-pointer transition-colors ${
                billing === 'monthly'
                  ? 'bg-[var(--ac)] text-[#120d0c]'
                  : 'bg-transparent text-[var(--mut)]'
              }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setBilling('yearly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-0 cursor-pointer transition-colors ${
                billing === 'yearly'
                  ? 'bg-[var(--ac)] text-[#120d0c]'
                  : 'bg-transparent text-[var(--mut)]'
              }`}
            >
              Anual {yearlySavingPct > 0 ? `(-${yearlySavingPct}%)` : ''}
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-baseline gap-2 flex-wrap">
          <span className="text-3xl font-extrabold tabular-nums text-[var(--fg)]">
            {billing === 'monthly' ? money(monthlyPrice) : money(yearlyPerMonth)}
          </span>
          <span className="text-xs text-[var(--mut)]">
            / mês{billing === 'yearly' ? ` (${money(yearlyPrice)} cobrado anualmente)` : ''}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {safeExternalUrl(primaryUpgradeHref) ? (
            <a
              href={safeExternalUrl(primaryUpgradeHref)}
              target="_blank"
              rel="noopener noreferrer"
              className="b full text-center no-underline"
            >
              {planStatus.effectiveTier === 'pro'
                ? 'Renovar / Gerenciar Plano Pro'
                : 'Assinar Plano Pro agora'}
            </a>
          ) : (
            <button type="button" className="b full" onClick={handleCopyRequest}>
              Copiar pedido de ativação do Plano Pro
            </button>
          )}
          {safeExternalUrl(waLink) && checkoutUrl && (
            <a
              href={safeExternalUrl(waLink)}
              target="_blank"
              rel="noopener noreferrer"
              className="b g full text-center no-underline"
            >
              Falar com consultor no WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Comparativo Grátis vs Pro */}
      <div className="panel mt-3">
        <h2 className="!mt-0">Comparativo Grátis vs Pro</h2>
        <div className="divide-y divide-white/10 mt-2">
          {featuresRows.map((row) => (
            <div key={row.label} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="text-sm font-medium text-[var(--fg)]">{row.label}</div>
              <div className="flex items-center gap-3 text-xs tabular-nums shrink-0">
                <span className="text-[var(--mut)]">Grátis: {row.free}</span>
                <span aria-hidden="true" className="text-white/20">·</span>
                <span className="text-[var(--ok)] font-semibold">Pro: {row.pro}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Download Grátis (PWA / Celular / Computador) */}
      <div className="panel mt-3">
        <h2 className="!mt-0">Download Grátis do Aplicativo</h2>
        <p className="mu text-xs">
          Instale o Meu Bar direto na tela inicial do Android, iPhone ou computador — abre em tela cheia, funciona offline e ocupa quase zero memória.
        </p>
        <div className="mt-3">
          <PWAInstallButton variant="card" />
        </div>
      </div>

      {/* Rodapé Legal */}
      <div className="mt-4 pb-6 flex items-center justify-center gap-3 text-xs text-[var(--mut)]">
        <button
          type="button"
          className="bg-transparent border-0 text-[var(--mut)] hover:text-[var(--fg)] underline cursor-pointer p-0"
          onClick={() => onOpenLegal('terms')}
        >
          Termos de Uso
        </button>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          className="bg-transparent border-0 text-[var(--mut)] hover:text-[var(--fg)] underline cursor-pointer p-0"
          onClick={() => onOpenLegal('privacy')}
        >
          Política de Privacidade
        </button>
      </div>
    </div>
  );
};

export const LegalDocsModal: React.FC<{
  initialTab?: 'terms' | 'privacy';
  onClose: () => void;
}> = ({ initialTab = 'terms', onClose }) => {
  const [docTab, setDocTab] = useState<'terms' | 'privacy'>(initialTab);

  return (
    <div className="ov" onClick={onClose}>
      <div className="w narrow" onClick={(e) => e.stopPropagation()}>
        <div className="row sp mb-3">
          <button type="button" className="b g sm" onClick={onClose}>
            ← Voltar
          </button>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/25 border border-white/10">
            <button
              type="button"
              onClick={() => setDocTab('terms')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-0 cursor-pointer ${
                docTab === 'terms'
                  ? 'bg-[var(--ac)] text-[#120d0c]'
                  : 'bg-transparent text-[var(--mut)]'
              }`}
            >
              Termos de Uso
            </button>
            <button
              type="button"
              onClick={() => setDocTab('privacy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-0 cursor-pointer ${
                docTab === 'privacy'
                  ? 'bg-[var(--ac)] text-[#120d0c]'
                  : 'bg-transparent text-[var(--mut)]'
              }`}
            >
              Privacidade (LGPD)
            </button>
          </div>
        </div>

        <div className="panel space-y-3 text-sm leading-relaxed text-[var(--fg)]/90">
          {docTab === 'terms' ? (
            <>
              <h2 className="!mt-0">Termos de Uso — Meu Bar</h2>
              <p className="mu text-xs">Última atualização: Novembro de 2026</p>
              <p>
                <b>1. Objeto do serviço:</b> O aplicativo Meu Bar oferece ferramentas digitais para gestão de estoque, fichas técnicas, cardápio QR, controle de pedidos, mesas, equipe e fechamento presencial de caixa para bares e restaurantes.
              </p>
              <p>
                <b>2. Pagamentos presenciais:</b> O Meu Bar não intermedia pagamentos de clientes finais do estabelecimento. Todo recebimento em cartão, dinheiro ou Pix ocorre diretamente entre o estabelecimento e seus clientes.
              </p>
              <p>
                <b>3. Plano Grátis e Plano Pro:</b> O uso básico é gratuito e pode exibir banners discretos de parceiros ou anúncios Google AdSense nas áreas administrativas e no rodapé do cardápio gratuito. A assinatura do Plano Pro remove anúncios e libera recursos avançados, podendo ser cancelada a qualquer momento sem perda dos dados já cadastrados.
              </p>
              <p>
                <b>4. Responsabilidade pelos dados:</b> Cada estabelecimento é responsável pela veracidade dos preços, ingredientes, informações de alérgenos, vagas publicadas e acessos concedidos à sua equipe.
              </p>
            </>
          ) : (
            <>
              <h2 className="!mt-0">Política de Privacidade (LGPD)</h2>
              <p className="mu text-xs">Última atualização: Novembro de 2026</p>
              <p>
                <b>1. Dados coletados:</b> Coletamos apenas os dados necessários para o funcionamento do aplicativo: e-mail de autenticação, dados operacionais do estabelecimento (estoque, receitas, preços, pedidos, caixa) e dados informados voluntariamente em currículos ou cadastros de fidelidade.
              </p>
              <p>
                <b>2. Anúncios e Cookies (Google AdSense):</b> Na versão gratuita, podemos exibir anúncios de parceiros locais ou do Google AdSense. O Google e seus parceiros podem utilizar cookies para exibir anúncios relevantes conforme sua política de privacidade. Assinantes do Plano Pro ou contas VIP utilizam o aplicativo sem anúncios.
              </p>
              <p>
                <b>3. Armazenamento e Segurança:</b> Os dados são armazenados com criptografia em trânsito (HTTPS) e controle de acesso por autenticação e permissões por estabelecimento.
              </p>
              <p>
                <b>4. Seus direitos (LGPD):</b> Você pode solicitar acesso, correção ou exclusão da sua conta e dos dados do seu bar a qualquer momento entrando em contato pelo canal de suporte no aplicativo.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
