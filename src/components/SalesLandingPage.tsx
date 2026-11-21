import React, { useMemo, useState } from 'react';
import deliveryImg from '../assets/images/feature_delivery_pack_1795268901927.jpg';
import qrMenuImg from '../assets/images/feature_qr_menu_1795268902334.jpg';
import heroImg from '../assets/images/hero_bar_atmosphere_1795268902811.jpg';
import { buildWhatsAppLink, DEFAULT_SAAS_CONFIG } from '../lib/saas';
import { checkActionCooldown, safeExternalUrl } from '../lib/security';
import { money } from '../lib/utils';
import type { PlatformSaaSConfig } from '../types/meubar';

interface SalesLandingPageProps {
  saasConfig?: PlatformSaaSConfig;
  isLoggedIn?: boolean;
  onEnterApp: () => void;
  onOpenLegal?: (tab: 'terms' | 'privacy') => void;
}

export const SalesLandingPage: React.FC<SalesLandingPageProps> = ({
  saasConfig = DEFAULT_SAAS_CONFIG,
  isLoggedIn = false,
  onEnterApp,
  onOpenLegal,
}) => {
  const [monthlyDeliverySales, setMonthlyDeliverySales] = useState(12000);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  // Lead / Demonstração form
  const [leadName, setLeadName] = useState('');
  const [leadBar, setLeadBar] = useState('');
  const [leadWhatsApp, setLeadWhatsApp] = useState('');
  const [leadTables, setLeadTables] = useState('10 a 25 mesas');
  const [leadErr, setLeadErr] = useState('');
  const [leadSent, setLeadSent] = useState(false);

  const monthlyPrice = Number(saasConfig.pro_monthly_price ?? DEFAULT_SAAS_CONFIG.pro_monthly_price);
  const yearlyPrice = Number(saasConfig.pro_yearly_price ?? DEFAULT_SAAS_CONFIG.pro_yearly_price);
  const trialDays = Number(saasConfig.trial_days ?? DEFAULT_SAAS_CONFIG.trial_days);
  const yearlyPerMonth = Math.round((yearlyPrice / 12) * 100) / 100;
  const yearlyDiscountPct =
    monthlyPrice > 0 ? Math.max(0, Math.round((1 - yearlyPerMonth / monthlyPrice) * 100)) : 0;

  const marketplaceFeeMonthly = Math.round(monthlyDeliverySales * 0.23);
  const annualSavings = marketplaceFeeMonthly * 12;

  const demoWhatsAppHref = useMemo(() => {
    const cleanPhone = (saasConfig.support_whatsapp || '').replace(/\D+/g, '');
    if (!cleanPhone) return '';
    const text = [
      'Olá! Vim pelo site oficial do Meu Bar e quero conhecer o sistema.',
      leadName.trim() ? `Nome: ${leadName.trim()}` : '',
      leadBar.trim() ? `Bar/Restaurante: ${leadBar.trim()}` : '',
      leadWhatsApp.trim() ? `WhatsApp: ${leadWhatsApp.trim()}` : '',
      `Porte: ${leadTables}`,
    ]
      .filter(Boolean)
      .join('\n');
    return safeExternalUrl(buildWhatsAppLink(cleanPhone, text));
  }, [saasConfig.support_whatsapp, leadName, leadBar, leadWhatsApp, leadTables]);

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLeadErr('');
    const cd = checkActionCooldown('sales_lead_submit', 3500);
    if (!cd.ok) {
      setLeadErr('Aguarde alguns segundos antes de enviar novamente.');
      return;
    }
    if (leadName.trim().length < 2) {
      setLeadErr('Informe seu nome.');
      return;
    }
    if (leadBar.trim().length < 2) {
      setLeadErr('Informe o nome do seu bar ou restaurante.');
      return;
    }
    if (leadWhatsApp.replace(/\D+/g, '').length < 10) {
      setLeadErr('Informe um WhatsApp válido com DDD.');
      return;
    }
    setLeadSent(true);
  };

  return (
    <div
      className="min-h-screen w-full selection:bg-[#E5A93C] selection:text-[#0C0B0A]"
      style={{
        backgroundColor: '#0C0B0A',
        color: '#F5F0E8',
        fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* TOP BAR — ESTRITAMENTE 3 ZONAS, ZERO PILLS */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-md"
        style={{
          backgroundColor: 'rgba(12, 11, 10, 0.9)',
          borderColor: 'rgba(255, 255, 255, 0.08)',
        }}
      >
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <a
            href="#topo"
            className="flex items-center gap-2.5 no-underline shrink-0 whitespace-nowrap"
            style={{ color: '#F5F0E8' }}
          >
            <span
              className="text-xl font-bold tracking-tight"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Meu Bar
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-8 text-sm" style={{ color: '#A89F94' }}>
            <a
              href="#recursos"
              className="no-underline hover:text-[#F5F0E8] transition-colors whitespace-nowrap shrink-0"
              style={{ color: 'inherit' }}
            >
              Recursos
            </a>
            <a
              href="#multi-garcom"
              className="no-underline hover:text-[#F5F0E8] transition-colors whitespace-nowrap shrink-0"
              style={{ color: 'inherit' }}
            >
              Multi-Garçom
            </a>
            <a
              href="#delivery"
              className="no-underline hover:text-[#F5F0E8] transition-colors whitespace-nowrap shrink-0"
              style={{ color: 'inherit' }}
            >
              Delivery 0%
            </a>
            <a
              href="#planos"
              className="no-underline hover:text-[#F5F0E8] transition-colors whitespace-nowrap shrink-0"
              style={{ color: 'inherit' }}
            >
              Planos
            </a>
          </nav>

          <button
            type="button"
            onClick={onEnterApp}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 cursor-pointer border-0 whitespace-nowrap shrink-0"
            style={{ backgroundColor: '#E5A93C', color: '#0C0B0A' }}
          >
            {isLoggedIn ? 'Voltar ao painel' : 'Testar grátis'}
          </button>
        </div>
      </header>

      {/* HERO EDITORIAL SPLIT */}
      <section id="topo" className="max-w-[1200px] mx-auto px-6 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div
              className="text-xs uppercase tracking-[0.18em] font-semibold"
              style={{ color: '#E5A93C' }}
            >
              Operação completa para bares, pubs e gastrobares
            </div>
            <h1
              className="text-4xl sm:text-5xl lg:text-[3.35rem] leading-[1.06] font-semibold tracking-tight !m-0"
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                textWrap: 'balance',
                color: '#F5F0E8',
              }}
            >
              Controle o salão, o bar, a cozinha e o delivery em um único sistema.
            </h1>
            <p className="text-base sm:text-lg leading-relaxed max-w-[54ch] !m-0" style={{ color: '#A89F94' }}>
              Cardápio QR personalizável, fila ao vivo para bartenders e cozinha, escala
              multi-garçom por praças, estoque com baixa automática por receita e delivery próprio
              com 0% de comissão.
            </p>

            <div className="flex flex-wrap items-center gap-5 pt-2">
              <button
                type="button"
                onClick={onEnterApp}
                className="px-6 py-3.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 cursor-pointer border-0"
                style={{ backgroundColor: '#E5A93C', color: '#0C0B0A' }}
              >
                {isLoggedIn
                  ? 'Abrir meu painel agora'
                  : trialDays > 0
                    ? `Começar grátis (${trialDays} dias Pro)`
                    : 'Criar conta grátis'}
              </button>
              <a
                href="#calculadora"
                className="text-sm font-medium underline underline-offset-4 hover:opacity-80"
                style={{ color: '#F5F0E8' }}
              >
                Calcular economia no delivery
              </a>
            </div>

            <div
              className="grid grid-cols-3 gap-6 pt-8 border-t"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              <div>
                <div
                  className="text-2xl font-bold tabular-nums"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: '#F5F0E8' }}
                >
                  0%
                </div>
                <div className="text-xs mt-1" style={{ color: '#A89F94' }}>
                  comissão por pedido no delivery próprio
                </div>
              </div>
              <div>
                <div
                  className="text-2xl font-bold tabular-nums"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: '#F5F0E8' }}
                >
                  3 modos
                </div>
                <div className="text-xs mt-1" style={{ color: '#A89F94' }}>
                  Híbrido, Praças Fixas ou Fila Livre
                </div>
              </div>
              <div>
                <div
                  className="text-2xl font-bold tabular-nums"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: '#F5F0E8' }}
                >
                  58/80mm
                </div>
                <div className="text-xs mt-1" style={{ color: '#A89F94' }}>
                  impressão térmica Bluetooth e USB
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div
              className="rounded-2xl overflow-hidden border aspect-[16/10] relative"
              style={{
                backgroundColor: '#161412',
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <img
                src={heroImg}
                alt="Balcão de coquetelaria artesanal iluminado em ambiente noturno"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover block"
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(12,11,10,0.05) 0%, rgba(12,11,10,0.68) 100%)',
                }}
              />
              <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em]" style={{ color: '#E5A93C' }}>
                    Tempo real no salão
                  </div>
                  <div className="text-sm font-medium mt-0.5" style={{ color: '#F5F0E8' }}>
                    Pedido da Mesa 4 → Bar / Cozinha → Garçom → Caixa Pix
                  </div>
                </div>
                <div
                  className="text-xs tabular-nums shrink-0"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: '#A89F94' }}
                >
                  PWA · Android · Web
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BENTO DE RECURSOS (01 A 05) */}
      <section
        id="recursos"
        className="border-t py-20 lg:py-24"
        style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
      >
        <div className="max-w-[1200px] mx-auto px-6 space-y-12">
          <div className="max-w-2xl space-y-3">
            <div
              className="text-xs uppercase tracking-[0.18em] font-semibold"
              style={{ color: '#E5A93C' }}
            >
              Tudo o que o aplicativo executa no dia a dia
            </div>
            <h2
              className="text-3xl sm:text-4xl font-semibold leading-tight !m-0"
              style={{ fontFamily: "'Fraunces', Georgia, serif", textWrap: 'balance' }}
            >
              Cada estação do bar sincronizada sem papel perdido nem pedido esquecido.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 01 — Cardápio QR & Modo Canva (col-span-2) */}
            <article
              className="lg:col-span-2 rounded-2xl border overflow-hidden grid grid-cols-1 md:grid-cols-12"
              style={{ backgroundColor: '#161412', borderColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              <div className="md:col-span-7 p-7 flex flex-col justify-between space-y-5">
                <div className="space-y-3">
                  <div
                    className="text-xs tabular-nums font-semibold"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: '#E5A93C' }}
                  >
                    01. CARDÁPIO QR & IDENTIDADE VISUAL
                  </div>
                  <h3
                    className="text-2xl font-semibold !m-0"
                    style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                  >
                    Cardápio inteligente que some sozinho quando o insumo acaba.
                  </h3>
                  <p className="text-sm leading-relaxed !m-0" style={{ color: '#A89F94' }}>
                    O cliente aponta a câmera na mesa, entra na comanda com código de 4 dígitos,
                    escolhe drinks, petiscos ou bebidas avulsas e acompanha o preparo ao vivo. No
                    Modo Canva você personaliza cores, fontes, moldura do logo, perfil da casa e
                    gera placas QR prontas para impressão.
                  </p>
                </div>
                <div className="text-xs" style={{ color: '#F5F0E8' }}>
                  Happy Hour automático por horário · Chamar Garçom e Pedir Conta na mesa
                </div>
              </div>
              <div className="md:col-span-5 min-h-[220px] bg-black/40">
                <img
                  src={qrMenuImg}
                  alt="Cliente consultando cardápio digital por QR Code na mesa do bar"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover block"
                />
              </div>
            </article>

            {/* 02 — Multi-Garçom & Praças */}
            <article
              id="multi-garcom"
              className="rounded-2xl border p-7 flex flex-col justify-between space-y-5"
              style={{ backgroundColor: '#161412', borderColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              <div className="space-y-3">
                <div
                  className="text-xs tabular-nums font-semibold"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: '#E5A93C' }}
                >
                  02. EQUIPE MULTI-GARÇOM
                </div>
                <h3
                  className="text-2xl font-semibold !m-0"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  Sem dois garçons indo na mesma mesa.
                </h3>
                <p className="text-sm leading-relaxed !m-0" style={{ color: '#A89F94' }}>
                  Escolha entre <strong className="text-[#F5F0E8]">Modo Híbrido</strong> (1º garçom
                  assume a mesa), <strong className="text-[#F5F0E8]">Praças Fixas</strong> (ex:
                  Varanda Mesas 1–5) ou <strong className="text-[#F5F0E8]">Fila Livre</strong>. A
                  trava “Vou levar” avisa a equipe na hora e o ranking calcula a comissão de cada
                  atendente automaticamente.
                </p>
              </div>
              <div className="text-xs" style={{ color: '#E5A93C' }}>
                Funciona mesmo com queda de Wi-Fi (fila offline automática)
              </div>
            </article>

            {/* 03 — Estoque, CMV & Receitas */}
            <article
              className="rounded-2xl border p-7 flex flex-col justify-between space-y-5"
              style={{ backgroundColor: '#161412', borderColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              <div className="space-y-3">
                <div
                  className="text-xs tabular-nums font-semibold"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: '#E5A93C' }}
                >
                  03. ESTOQUE & LUCRO REAL (CMV)
                </div>
                <h3
                  className="text-2xl font-semibold !m-0"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  Saiba exatamente quanto sobra no caixa depois dos custos.
                </h3>
                <p className="text-sm leading-relaxed !m-0" style={{ color: '#A89F94' }}>
                  Mais de 100 receitas de drinks cadastradas com ficha técnica em ml. Cada drink
                  preparado dá baixa automática nas garrafas, gera lista de compras quando o estoque
                  atinge o mínimo e calcula o lucro líquido descontando CMV, 10% e quebras.
                </p>
              </div>
              <div className="text-xs" style={{ color: '#F5F0E8' }}>
                Exportação CSV · Controle de perdas, cortesias e fornecedores
              </div>
            </article>

            {/* 04 — Delivery Próprio 0% (col-span-2) */}
            <article
              id="delivery"
              className="lg:col-span-2 rounded-2xl border overflow-hidden grid grid-cols-1 md:grid-cols-12"
              style={{ backgroundColor: '#161412', borderColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              <div className="md:col-span-5 min-h-[220px] bg-black/40 order-2 md:order-1">
                <img
                  src={deliveryImg}
                  alt="Embalagem artesanal de delivery de bar pronta para despacho"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover block"
                />
              </div>
              <div className="md:col-span-7 p-7 flex flex-col justify-between space-y-5 order-1 md:order-2">
                <div className="space-y-3">
                  <div
                    className="text-xs tabular-nums font-semibold"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: '#E5A93C' }}
                  >
                    04. DELIVERY PRÓPRIO & MOTOBOYS
                  </div>
                  <h3
                    className="text-2xl font-semibold !m-0"
                    style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                  >
                    Seu aplicativo externo de delivery sem pagar 23% por pedido.
                  </h3>
                  <p className="text-sm leading-relaxed !m-0" style={{ color: '#A89F94' }}>
                    Gere o link e o QR Code exclusivo do seu delivery para Instagram, WhatsApp e
                    embalagens. Configure taxas por bairro, frete grátis acima de um valor e
                    retirada no balcão. O pedido cai direto na cozinha/bar e despacha a rota com
                    link do Google Maps no WhatsApp do motoboy em 1 clique.
                  </p>
                </div>
                <div className="text-xs" style={{ color: '#F5F0E8' }}>
                  Rastreio ao vivo para o cliente · Etiqueta térmica · Ligar/Pausar em 1 clique
                </div>
              </div>
            </article>

            {/* 05 — Caixa, Impressora, Segurança (col-span-3) */}
            <article
              className="lg:col-span-3 rounded-2xl border p-7 grid grid-cols-1 md:grid-cols-3 gap-6"
              style={{ backgroundColor: '#161412', borderColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              <div className="space-y-2">
                <div
                  className="text-xs tabular-nums font-semibold"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: '#E5A93C' }}
                >
                  05. CAIXA & PIX DIRETO
                </div>
                <h3
                  className="text-xl font-semibold !m-0"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  Fechamento de turno e divisão de conta.
                </h3>
                <p className="text-sm leading-relaxed !m-0" style={{ color: '#A89F94' }}>
                  Divida por pessoa ou por pagamento misto (Pix + cartão + dinheiro), gere QR Code
                  Pix na tela, imprima conferência em impressora térmica Bluetooth 58mm/80mm e
                  registre cada turno com clareza.
                </p>
              </div>
              <div className="space-y-2">
                <div
                  className="text-xs uppercase tracking-[0.14em] font-semibold"
                  style={{ color: '#E5A93C' }}
                >
                  Fidelidade & Reservas
                </div>
                <h3
                  className="text-xl font-semibold !m-0"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  Faça o cliente voltar toda semana.
                </h3>
                <p className="text-sm leading-relaxed !m-0" style={{ color: '#A89F94' }}>
                  Cartão fidelidade digital por selos ou cashback automático direto no Caixa, além
                  de agenda de reservas e histórico de clientes frequentes.
                </p>
              </div>
              <div className="space-y-2">
                <div
                  className="text-xs uppercase tracking-[0.14em] font-semibold"
                  style={{ color: '#E5A93C' }}
                >
                  Segurança & Auditoria
                </div>
                <h3
                  className="text-xl font-semibold !m-0"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  Proteção de dados e zero vazamentos.
                </h3>
                <p className="text-sm leading-relaxed !m-0" style={{ color: '#A89F94' }}>
                  Isolamento de dados por estabelecimento no banco (RLS), matriz de permissões por
                  cargo (RBAC), trilha de auditoria para cancelamentos e descontos, e blindagem
                  anti-flood contra spam.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* CALCULADORA INTERATIVA DE ECONOMIA NO DELIVERY */}
      <section
        id="calculadora"
        className="border-t py-20 lg:py-24"
        style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
      >
        <div className="max-w-[1200px] mx-auto px-6">
          <div
            className="rounded-2xl border p-7 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
            style={{ backgroundColor: '#161412', borderColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <div className="lg:col-span-7 space-y-5">
              <div
                className="text-xs uppercase tracking-[0.18em] font-semibold"
                style={{ color: '#E5A93C' }}
              >
                Calculadora de margem no delivery
              </div>
              <h2
                className="text-3xl sm:text-4xl font-semibold leading-tight !m-0"
                style={{ fontFamily: "'Fraunces', Georgia, serif", textWrap: 'balance' }}
              >
                Quanto você deixa em taxas de aplicativos todo ano?
              </h2>
              <p className="text-sm sm:text-base leading-relaxed !m-0" style={{ color: '#A89F94' }}>
                Arraste o faturamento mensal estimado do seu delivery e compare a comissão média de
                23% dos marketplaces com o canal próprio do Meu Bar (0% por pedido).
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-baseline justify-between gap-2">
                  <label className="!m-0 text-xs uppercase tracking-wider" style={{ color: '#A89F94' }}>
                    Faturamento mensal no delivery
                  </label>
                  <span
                    className="text-2xl font-bold tabular-nums"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: '#F5F0E8' }}
                  >
                    {money(monthlyDeliverySales)}
                  </span>
                </div>
                <input
                  type="range"
                  min={2000}
                  max={80000}
                  step={1000}
                  value={monthlyDeliverySales}
                  onChange={(e) => setMonthlyDeliverySales(Number(e.target.value))}
                  className="w-full accent-[#E5A93C] cursor-pointer"
                />
                <div
                  className="flex justify-between text-[11px] tabular-nums"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: '#A89F94' }}
                >
                  <span>R$ 2.000</span>
                  <span>R$ 40.000</span>
                  <span>R$ 80.000</span>
                </div>
              </div>
            </div>

            <div
              className="lg:col-span-5 rounded-xl border p-6 space-y-5"
              style={{ backgroundColor: '#0C0B0A', borderColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: '#A89F94' }}>Comissão em marketplaces (23%)</span>
                <span
                  className="font-semibold tabular-nums text-red-400"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  − {money(marketplaceFeeMonthly)}/mês
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: '#A89F94' }}>Comissão no Meu Bar</span>
                <span
                  className="font-semibold tabular-nums text-emerald-400"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  R$ 0,00/mês
                </span>
              </div>
              <div
                className="pt-4 border-t space-y-1"
                style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
              >
                <div className="text-xs uppercase tracking-wider" style={{ color: '#E5A93C' }}>
                  Economia estimada em 12 meses
                </div>
                <div
                  className="text-3xl sm:text-4xl font-bold tabular-nums"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: '#F5F0E8' }}
                >
                  {money(annualSavings)}
                </div>
                <p className="text-xs !m-0 pt-1" style={{ color: '#A89F94' }}>
                  O sistema se paga já nas primeiras entregas da semana.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PLANOS TRANSPARENTES */}
      <section
        id="planos"
        className="border-t py-20 lg:py-24"
        style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
      >
        <div className="max-w-[1200px] mx-auto px-6 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <div
                className="text-xs uppercase tracking-[0.18em] font-semibold"
                style={{ color: '#E5A93C' }}
              >
                Planos sem taxa por pedido
              </div>
              <h2
                className="text-3xl sm:text-4xl font-semibold leading-tight !m-0"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Comece grátis e evolua quando o movimento crescer.
              </h2>
            </div>

            <div
              className="inline-flex rounded-lg border p-1 self-start"
              style={{ backgroundColor: '#161412', borderColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              <button
                type="button"
                onClick={() => setBilling('monthly')}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer border-0 transition-colors"
                style={{
                  backgroundColor: billing === 'monthly' ? '#E5A93C' : 'transparent',
                  color: billing === 'monthly' ? '#0C0B0A' : '#A89F94',
                }}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setBilling('yearly')}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer border-0 transition-colors"
                style={{
                  backgroundColor: billing === 'yearly' ? '#E5A93C' : 'transparent',
                  color: billing === 'yearly' ? '#0C0B0A' : '#A89F94',
                }}
              >
                Anual {yearlyDiscountPct > 0 ? `(−${yearlyDiscountPct}%)` : ''}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Plano Grátis */}
            <div
              className="rounded-2xl border p-8 flex flex-col justify-between space-y-8"
              style={{ backgroundColor: '#161412', borderColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              <div className="space-y-4">
                <div className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#A89F94' }}>
                  Plano Grátis
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-4xl font-bold tabular-nums"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    R$ 0
                  </span>
                  <span className="text-sm" style={{ color: '#A89F94' }}>
                    / mês para sempre
                  </span>
                </div>
                <p className="text-sm leading-relaxed !m-0" style={{ color: '#A89F94' }}>
                  Ideal para começar a organizar seu estoque, receitas e cardápio QR sem custo fixo.
                </p>
                <ul className="space-y-2.5 text-sm pt-2 list-none p-0 m-0" style={{ color: '#F5F0E8' }}>
                  <li>✓ Cardápio digital por QR Code ilimitado</li>
                  <li>✓ Controle de estoque e receitas automáticas</li>
                  <li>✓ Fila de pedidos ao vivo no Bar e Cozinha</li>
                  <li>✓ Personalização básica de cores e logo</li>
                  {trialDays > 0 && (
                    <li style={{ color: '#E5A93C' }}>
                      ✓ Inclui {trialDays} dias grátis de teste do Plano Pro
                    </li>
                  )}
                </ul>
              </div>
              <button
                type="button"
                onClick={onEnterApp}
                className="w-full py-3 rounded-lg text-sm font-semibold cursor-pointer border transition-colors hover:bg-white/5"
                style={{
                  backgroundColor: 'transparent',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#F5F0E8',
                }}
              >
                Começar no plano grátis
              </button>
            </div>

            {/* Plano Pro */}
            <div
              className="rounded-2xl border p-8 flex flex-col justify-between space-y-8"
              style={{
                backgroundColor: '#161412',
                borderColor: 'rgba(229, 169, 60, 0.55)',
              }}
            >
              <div className="space-y-4">
                <div className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#E5A93C' }}>
                  Plano Pro · Operação Completa
                </div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span
                    className="text-4xl font-bold tabular-nums"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {billing === 'monthly' ? money(monthlyPrice) : money(yearlyPerMonth)}
                  </span>
                  <span className="text-sm" style={{ color: '#A89F94' }}>
                    / mês{billing === 'yearly' ? ` (${money(yearlyPrice)}/ano)` : ''}
                  </span>
                </div>
                <p className="text-sm leading-relaxed !m-0" style={{ color: '#A89F94' }}>
                  Para bares, pubs e restaurantes que querem faturar mais no salão e no delivery
                  próprio com zero anúncios.
                </p>
                <ul className="space-y-2.5 text-sm pt-2 list-none p-0 m-0" style={{ color: '#F5F0E8' }}>
                  <li>✓ Tudo do Grátis + zero anúncios no painel e cardápio</li>
                  <li>✓ Delivery próprio 0% comissão + taxas por bairro + motoboys</li>
                  <li>✓ Equipe Multi-Garçom (Híbrido, Praças Fixas e comissões)</li>
                  <li>✓ Caixa Pro com Pix direto, divisão de conta e Bluetooth 58/80mm</li>
                  <li>✓ Financeiro com CMV, lucro líquido, Happy Hour e Fidelidade</li>
                  <li>✓ Permissões por cargo (RBAC) e Log de Auditoria completo</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={onEnterApp}
                className="w-full py-3 rounded-lg text-sm font-semibold cursor-pointer border-0 transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#E5A93C', color: '#0C0B0A' }}
              >
                {trialDays > 0
                  ? `Ativar ${trialDays} dias Pro grátis`
                  : 'Começar com o Plano Pro'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FORMULÁRIO DE CONTATO / DEMONSTRAÇÃO */}
      <section
        id="contato"
        className="border-t py-20 lg:py-24"
        style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
      >
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5 space-y-4">
            <div
              className="text-xs uppercase tracking-[0.18em] font-semibold"
              style={{ color: '#E5A93C' }}
            >
              Atendimento comercial
            </div>
            <h2
              className="text-3xl font-semibold leading-tight !m-0"
              style={{ fontFamily: "'Fraunces', Georgia, serif", textWrap: 'balance' }}
            >
              Quer ajuda para implantar no seu bar?
            </h2>
            <p className="text-sm leading-relaxed !m-0" style={{ color: '#A89F94' }}>
              Preencha os dados ao lado para falar direto com a nossa equipe, tirar dúvidas sobre
              impressoras Bluetooth, configuração de mesas e ativação do Plano Pro.
            </p>
          </div>

          <form
            onSubmit={handleLeadSubmit}
            className="lg:col-span-7 rounded-2xl border p-6 sm:p-8 space-y-4"
            style={{ backgroundColor: '#161412', borderColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="!mt-0 text-xs" style={{ color: '#A89F94' }}>
                  Seu nome
                </label>
                <input
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="Ex: Rafael Mendes"
                  maxLength={60}
                />
              </div>
              <div>
                <label className="!mt-0 text-xs" style={{ color: '#A89F94' }}>
                  Nome do bar / restaurante
                </label>
                <input
                  value={leadBar}
                  onChange={(e) => setLeadBar(e.target.value)}
                  placeholder="Ex: Bar do Centro"
                  maxLength={60}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="!mt-0 text-xs" style={{ color: '#A89F94' }}>
                  WhatsApp (com DDD)
                </label>
                <input
                  value={leadWhatsApp}
                  onChange={(e) => setLeadWhatsApp(e.target.value)}
                  placeholder="Ex: 11999998888"
                  inputMode="tel"
                  maxLength={20}
                />
              </div>
              <div>
                <label className="!mt-0 text-xs" style={{ color: '#A89F94' }}>
                  Tamanho da operação
                </label>
                <select value={leadTables} onChange={(e) => setLeadTables(e.target.value)}>
                  <option value="Até 10 mesas / Balcão">Até 10 mesas / Balcão</option>
                  <option value="10 a 25 mesas">10 a 25 mesas</option>
                  <option value="25 a 60 mesas">25 a 60 mesas</option>
                  <option value="Mais de 60 mesas / Rede">Mais de 60 mesas / Rede</option>
                </select>
              </div>
            </div>

            {leadErr && <p className="err !m-0 text-xs">{leadErr}</p>}

            {leadSent ? (
              <div
                className="rounded-xl p-4 border space-y-3"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  borderColor: 'rgba(16, 185, 129, 0.35)',
                }}
              >
                <div className="text-sm font-semibold text-emerald-300">
                  Dados validados com sucesso!
                </div>
                <p className="text-xs !m-0" style={{ color: '#F5F0E8' }}>
                  Você já pode criar sua conta grátis agora mesmo ou iniciar o atendimento no
                  WhatsApp com a mensagem preenchida.
                </p>
                <div className="flex flex-wrap gap-3">
                  {demoWhatsAppHref && (
                    <a
                      href={demoWhatsAppHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-lg text-xs font-semibold no-underline"
                      style={{ backgroundColor: '#E5A93C', color: '#0C0B0A' }}
                    >
                      Continuar no WhatsApp
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={onEnterApp}
                    className="px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer border"
                    style={{
                      backgroundColor: 'transparent',
                      borderColor: 'rgba(255,255,255,0.2)',
                      color: '#F5F0E8',
                    }}
                  >
                    Entrar e testar agora
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="submit"
                className="px-6 py-3 rounded-lg text-sm font-semibold cursor-pointer border-0 transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#E5A93C', color: '#0C0B0A' }}
              >
                Solicitar demonstração
              </button>
            )}
          </form>
        </div>
      </section>

      {/* RODAPÉ DISCRETO */}
      <footer
        className="border-t py-10"
        style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
      >
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style={{ color: '#A89F94' }}>
          <div style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#F5F0E8' }} className="text-base font-semibold">
            Meu Bar
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <a href="#recursos" className="no-underline hover:text-[#F5F0E8]" style={{ color: 'inherit' }}>
              Recursos
            </a>
            <a href="#calculadora" className="no-underline hover:text-[#F5F0E8]" style={{ color: 'inherit' }}>
              Calculadora
            </a>
            <a href="#planos" className="no-underline hover:text-[#F5F0E8]" style={{ color: 'inherit' }}>
              Planos
            </a>
            {onOpenLegal && (
              <>
                <button
                  type="button"
                  onClick={() => onOpenLegal('terms')}
                  className="bg-transparent border-0 p-0 cursor-pointer hover:text-[#F5F0E8] text-xs"
                  style={{ color: 'inherit' }}
                >
                  Termos de Uso
                </button>
                <button
                  type="button"
                  onClick={() => onOpenLegal('privacy')}
                  className="bg-transparent border-0 p-0 cursor-pointer hover:text-[#F5F0E8] text-xs"
                  style={{ color: 'inherit' }}
                >
                  Privacidade
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
