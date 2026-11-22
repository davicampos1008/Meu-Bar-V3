import React, { useMemo, useState } from 'react';
import deliveryImg from '../assets/images/feature_delivery_pack_1795268901927.jpg';
import qrMenuImg from '../assets/images/feature_qr_menu_1795268902334.jpg';
import heroImg from '../assets/images/hero_bar_atmosphere_1795268902811.jpg';
import screenCaixaImg from '../assets/images/screen_caixa_pix_1795350231830.jpg';
import screenEstoqueImg from '../assets/images/screen_estoque_receitas_1795350232517.jpg';
import screenGestaoImg from '../assets/images/screen_gestao_cmv_1795352472509.jpg';
import screenGarcomImg from '../assets/images/screen_multi_garcom_1795350232560.jpg';
import screenResumoImg from '../assets/images/screen_resumo_dashboard_1795350233723.jpg';
import screenSegundaTelaImg from '../assets/images/screen_segunda_tela_tv_1795352472514.jpg';
import { buildWhatsAppLink, DEFAULT_SAAS_CONFIG } from '../lib/saas';
import { checkActionCooldown, safeExternalUrl } from '../lib/security';
import { money } from '../lib/utils';
import type { PlatformSaaSConfig } from '../types/meubar';

interface ClientProblemShowcaseItem {
  id: string;
  tourScreenId: string;
  shortLabel: string;
  painQuestion: string;
  moduleTag: string;
  screenTitle: string;
  beforeScenario: string;
  afterScenario: string;
  problemSummary: string;
  solutionSteps: string[];
  exampleTitle: string;
  exampleMetrics: { label: string; value: string }[];
  image: string;
  imageAlt: string;
  screenCaption: string;
}

interface AppScreenTourItem {
  id: string;
  number: string;
  category: 'operacao' | 'caixa_tv' | 'gestao';
  categoryLabel: string;
  tabName: string;
  title: string;
  subtitle: string;
  whoUses: string;
  replaces: string;
  overview: string;
  image: string;
  imageAlt: string;
  imageCaption: string;
  breakdown: {
    area: string;
    detail: string;
  }[];
  workflowSteps: string[];
  highlights: { label: string; value: string }[];
}

const CLIENT_PROBLEM_SHOWCASE: ClientProblemShowcaseItem[] = [
  {
    id: 'faturamento',
    tourScreenId: 'resumo',
    shortLabel: 'Faturamento & Mais Vendidos',
    painQuestion: '“Não sei quanto faturei hoje nem qual drink dá mais lucro”',
    moduleTag: 'Tela Principal · Resumo em Tempo Real',
    screenTitle: 'Painel do Dono com faturamento ao vivo, ticket médio e ranking de vendas',
    beforeScenario:
      'Fechar o caixa de madrugada somando papel, máquina de cartão e Pix no caderno — sem saber qual item realmente deu lucro.',
    afterScenario:
      'Abrir o celular a qualquer hora e ver faturamento do dia, da semana e do mês atualizados segundo a segundo.',
    problemSummary:
      'Muitos donos só descobrem quanto venderam na segunda-feira — e sem saber qual drink ou porção realmente traz margem após o custo dos insumos.',
    solutionSteps: [
      'Acompanhe faturamento do dia, da semana ou do mês atualizado automaticamente a cada conta fechada.',
      'Veja o ranking dos itens mais vendidos com quantidade exata, participação e receita gerada.',
      'Compare entradas por meio de pagamento (Pix, crédito, débito e dinheiro) e lucro líquido com CMV.',
      'Receba alertas imediatos de mesas chamando garçom, pedidos pendentes e itens em estoque mínimo.',
    ],
    exampleTitle: 'Exemplo real em uma sexta-feira movimentada',
    exampleMetrics: [
      { label: 'Faturado hoje', value: 'R$ 4.820,00' },
      { label: 'Ticket médio', value: 'R$ 86,07' },
      { label: 'Campeão de vendas', value: 'Gin Tônica · 42x' },
    ],
    image: screenResumoImg,
    imageAlt: 'Tela de Resumo em Tempo Real do Meu Bar mostrando faturamento e ranking de vendas',
    screenCaption: 'Tela Resumo · Controle executivo em tempo real para o dono do bar',
  },
  {
    id: 'delivery',
    tourScreenId: 'delivery',
    shortLabel: 'Taxas do iFood / 99',
    painQuestion: '“Pago até 23% de taxa por pedido nos aplicativos de delivery”',
    moduleTag: 'Módulo Delivery Próprio · 0% Comissão',
    screenTitle: 'Aplicativo próprio do seu bar com despacho direto no WhatsApp do motoboy',
    beforeScenario:
      'Pagar de 18% a 27% de comissão em cada pedido de delivery e ainda ficar sem o telefone dos próprios clientes.',
    afterScenario:
      'Vender pelo link exclusivo do seu bar com 0% de comissão, taxa automática por bairro e motoboy recebendo a rota em 1 clique.',
    problemSummary:
      'Vender bem no marketplace mas deixar quase um quarto do faturamento em comissão corrói a margem do bar e esconde o contato do cliente.',
    solutionSteps: [
      'Link e QR Code exclusivos do seu bar prontos para Instagram, WhatsApp, flyers e sacolas.',
      'Taxas configuráveis por bairro, frete grátis acima de um valor e opção de retirada no balcão.',
      'O pedido cai direto na cozinha/bar e gera etiqueta térmica 58/80mm para colar na embalagem.',
      'Envie endereço + rota do Google Maps + resumo de cobrança pro WhatsApp do motoboy em 1 toque.',
    ],
    exampleTitle: 'Exemplo vendendo R$ 15.000/mês no canal próprio',
    exampleMetrics: [
      { label: 'Taxa paga no Meu Bar', value: 'R$ 0,00' },
      { label: 'Economia mensal', value: 'R$ 3.450,00' },
      { label: 'Economia em 1 ano', value: 'R$ 41.400,00' },
    ],
    image: deliveryImg,
    imageAlt: 'Pedido de delivery próprio embalado e pronto para despacho ao motoboy',
    screenCaption: 'Tela Delivery & Motoboys · Fila de preparo, rastreio ao vivo e despacho',
  },
  {
    id: 'garcons',
    tourScreenId: 'pedidos',
    shortLabel: 'Equipe Multi-Garçom',
    painQuestion: '“Meus garçons se batem nas mesas ou demoram para entregar”',
    moduleTag: 'Estação Garçom, Barman & Cozinha (KDS)',
    screenTitle: 'Escala por praças, trava “Vou levar” e fila separada por estação',
    beforeScenario:
      'Dois garçons indo na mesma mesa, pedido de porção misturado com drink no balcão e bartender perguntando receita no meio do pico.',
    afterScenario:
      'Cada estação vê só o que precisa produzir, o bartender abre a ficha técnica no próprio pedido e o garçom trava a entrega em 1 toque.',
    problemSummary:
      'Em salões cheios com vários garçons, pedidos se perdem entre cozinha e balcão e ninguém sabe qual atendente produziu mais.',
    solutionSteps: [
      'Escolha entre Modo Híbrido (1º garçom assume a mesa), Praças Fixas (ex: Mesas 1–6) ou Fila Livre.',
      'Drinks vão direto para o Barman (com receita completa clicável) e petiscos para a Cozinha.',
      'Assim que fica pronto, toca alerta sonoro na tela do Garçom e a trava “Vou levar” impede duplicidade.',
      'Continua lançando pedidos mesmo se o Wi-Fi cair, sincronizando automaticamente quando volta.',
    ],
    exampleTitle: 'Exemplo de operação com 4 garçons no sábado',
    exampleMetrics: [
      { label: 'Praça Varanda (1–6)', value: 'Garçom Lucas' },
      { label: 'Praça Salão (7–14)', value: 'Garçom Carla' },
      { label: 'Pedidos perdidos', value: '0 no turno' },
    ],
    image: screenGarcomImg,
    imageAlt: 'Celular do garçom sincronizado com tela da cozinha e fila de pedidos do bar',
    screenCaption: 'Tela Pedidos & Estações · Barman, Cozinha e Garçom em tempo real',
  },
  {
    id: 'estoque',
    tourScreenId: 'estoque',
    shortLabel: 'Estoque & Receitas',
    painQuestion: '“O cliente pede um drink no cardápio mas o ingrediente acabou”',
    moduleTag: 'Estoque Inteligente & Ficha Técnica',
    screenTitle: 'Baixa automática por receita em ml e ocultação imediata no cardápio',
    beforeScenario:
      'Cliente pede um Negroni ou Moscow Mule pelo cardápio, o garçom vai ao bar e descobre que acabou o Campari ou a espuma de gengibre.',
    afterScenario:
      'Cada drink entregue baixa automaticamente os ml do estoque; se o insumo zera, os drinks dependentes somem do cardápio na hora.',
    problemSummary:
      'Vender sem ter o destilado ou fruta gera frustração na mesa, atraso no balcão e prejuízo invisível por falta de controle de garrafas.',
    solutionSteps: [
      'Mais de 100 receitas de drinks já cadastradas com medidas exatas, copo, técnica e modo de preparo.',
      'Cada pedido concluído abate automaticamente os ml/unidades das garrafas e insumos vinculados.',
      'Quando um ingrediente atinge o nível mínimo, entra direto na Lista de Compras para envio no WhatsApp.',
      'Precificação inteligente mostra o custo real da receita e sugere o preço ideal de venda.',
    ],
    exampleTitle: 'Exemplo de controle de insumos no balcão',
    exampleMetrics: [
      { label: 'Receitas com ficha', value: '100+ drinks' },
      { label: 'Baixa por dose', value: 'Automática (ml)' },
      { label: 'Lista de compras', value: '1 clique WhatsApp' },
    ],
    image: screenEstoqueImg,
    imageAlt: 'Tablet no balcão exibindo ficha técnica de drink e controle de garrafas no estoque',
    screenCaption: 'Tela Estoque & Cardápio · Ficha técnica no pedido e alerta de reposição',
  },
  {
    id: 'cardapio',
    tourScreenId: 'cardapio_qr',
    shortLabel: 'Cardápio QR & Visual',
    painQuestion: '“Meu cardápio é em PDF feio, difícil de atualizar e sem a cara do bar”',
    moduleTag: 'Cardápio QR · Modo Canva & Placas de Mesa',
    screenTitle: 'Editor visual estilo Canva com contraste automático e QR Code por mesa',
    beforeScenario:
      'Mandar PDF pesado no WhatsApp onde o cliente precisa dar zoom e ainda refazer toda a arte cada vez que muda um preço.',
    afterScenario:
      'Cardápio interativo com a identidade exata do bar, fotos, comanda por código de 4 dígitos e placas QR prontas para imprimir.',
    problemSummary:
      'Cardápio em PDF não permite pedir direto da mesa, não acompanha o preparo e obriga o dono a depender de designer para qualquer ajuste.',
    solutionSteps: [
      'Personalize cores, fontes, banner, brasão do logo e modo diurno/noturno com contraste automático.',
      'Mudou preço ou ligou Happy Hour? Todos os QR Codes das mesas atualizam no mesmo segundo.',
      'Gere artes prontas de placas QR por mesa (Mesa 01, Mesa 02...) para imprimir e colocar no salão.',
      'Cliente chama o garçom ou pede a conta direto pelo celular, com alerta instantâneo no painel.',
    ],
    exampleTitle: 'Exemplo de experiência do cliente na Mesa 08',
    exampleMetrics: [
      { label: 'Tempo p/ abrir menu', value: '< 2 segundos' },
      { label: 'Acesso na comanda', value: 'Código 4 dígitos' },
      { label: 'Botões na mesa', value: 'Garçom · Conta' },
    ],
    image: qrMenuImg,
    imageAlt: 'Cliente escaneando QR Code na mesa do bar para visualizar o cardápio digital',
    screenCaption: 'Tela Editor Visual & QR Code · Cardápio, Perfil da Loja e Placas QR',
  },
  {
    id: 'caixa',
    tourScreenId: 'caixa',
    shortLabel: 'Caixa, Dose Extra & 2ª Tela',
    painQuestion: '“Na hora de fechar a conta dá fila, confusão e o cliente não vê o valor”',
    moduleTag: 'Caixa Detalhado · Dose Extra · 2ª Tela Pix',
    screenTitle: 'Pedidos expansíveis por cliente, adicional na hora e segunda tela com QR Pix',
    beforeScenario:
      'Fila no caixa conferindo comanda de papel, esquecendo de cobrar doses extras e virando o monitor pro cliente escanear o Pix.',
    afterScenario:
      'Clique no nome do cliente para ver cada pedido detalhado, lance dose extra em 1 clique e projete resumo + QR Pix na 2ª tela exclusiva.',
    problemSummary:
      'Dividir mesa na calculadora, esquecer adicionais de balcão e expor o caixa para o cliente gera lentidão, erro de troco e perda de receita.',
    solutionSteps: [
      'Clique em qualquer cliente ou mesa para expandir cada item, quantidade, horário e valor individual.',
      'Adicione Dose Extra, energético, água ou adicional personalizado direto no card da conta.',
      'Projete somente o resumo da compra + QR Code Pix em uma 2ª tela pro cliente (quando ociosa, exibe a logo do bar).',
      'Feche turnos com sangria, suprimento, divisão de conta, pagamento misto e impressão Bluetooth 58/80mm.',
    ],
    exampleTitle: 'Exemplo fechando Mesa 12 com 4 amigos',
    exampleMetrics: [
      { label: 'Total + 10% serviço', value: 'R$ 352,00' },
      { label: 'Por pessoa (4x)', value: 'R$ 88,00' },
      { label: '2ª Tela & TV Fila', value: 'Monitor salvo' },
    ],
    image: screenCaixaImg,
    imageAlt: 'Tela do Caixa Pro com divisão de conta, QR Code Pix e impressora térmica 80mm',
    screenCaption: 'Tela Caixa & 2ª Tela · Conta detalhada, dose extra, Pix e impressão térmica',
  },
];

const APP_SCREEN_TOUR: AppScreenTourItem[] = [
  {
    id: 'resumo',
    number: '01',
    category: 'operacao',
    categoryLabel: 'Operação',
    tabName: 'Resumo (Início)',
    title: 'Resumo em Tempo Real — A tela principal do dono',
    subtitle: 'Controle instantâneo de faturamento, itens campeões de venda, mesas abertas e saúde do turno.',
    whoUses: 'Dono e Gerente',
    replaces: 'Planilhas manuais e fechamento no caderno',
    overview:
      'É a primeira tela que abre ao entrar no bar. Foi desenhada para responder em 5 segundos quanto o bar já faturou, o que mais está saindo, quais mesas estão abertas e se há algum chamado de garçom ou gargalo na fila.',
    image: screenResumoImg,
    imageAlt: 'Tela Resumo em Tempo Real do Meu Bar',
    imageCaption: 'Resumo do Dono · Faturamento por período, ranking dos mais vendidos e atalhos rápidos',
    breakdown: [
      {
        area: 'Filtro de Período (Hoje · 7 dias · 30 dias · Tudo)',
        detail:
          'Recalcula todos os indicadores, ticket médio, quantidade de pedidos e faturamento bruto/líquido na hora.',
      },
      {
        area: 'Ranking dos Itens Mais Vendidos',
        detail:
          'Mostra automaticamente os drinks, cervejas e porções líderes com barras proporcionais, unidades vendidas e receita de cada item.',
      },
      {
        area: 'Distribuição por Forma de Pagamento',
        detail:
          'Separa quanto entrou em Pix, Cartão de Crédito, Débito e Dinheiro para bater o caixa sem surpresas.',
      },
      {
        area: 'Radar de Operação ao Vivo',
        detail:
          'Exibe contagem de mesas abertas, pedidos em preparo, chamados ativos de garçom/conta e alertas de estoque baixo com atalho em 1 toque.',
      },
    ],
    workflowSteps: [
      'O dono abre o app no celular ou computador e já cai direto no Resumo.',
      'A cada pedido entregue e pago no Caixa, o faturamento e o ranking sobem em tempo real.',
      'Se algum produto está sem preço ou acabando no estoque, aparece um aviso clicável no topo.',
      'Um toque no botão de alternância muda entre Modo Noturno e Modo Diurno com contraste automático.',
    ],
    highlights: [
      { label: 'Atualização', value: 'Tempo real' },
      { label: 'Visão de períodos', value: '4 recortes' },
      { label: 'Memória de tela', value: 'Mantém ao atualizar' },
    ],
  },
  {
    id: 'pedidos',
    number: '02',
    category: 'operacao',
    categoryLabel: 'Operação',
    tabName: 'Pedidos & Estações',
    title: 'Fila de Pedidos, Barman, Cozinha (KDS) & Multi-Garçom',
    subtitle: 'Cada função enxerga sua fila limpa, com receita clicável no pedido e trava contra duplicidade.',
    whoUses: 'Barman, Cozinha e Garçons',
    replaces: 'Comandas de papel perdidas e gritaria no balcão',
    overview:
      'Separa automaticamente drinks para o Bar e comidas/porções para a Cozinha. Quando o pedido fica pronto, o Garçom recebe aviso sonoro imediato e usa o botão “Vou levar” para travar a entrega.',
    image: screenGarcomImg,
    imageAlt: 'Tela de fila de pedidos multi-estação para garçom, barman e cozinha',
    imageCaption: 'Estações Sincronizadas · Barman vê a receita do drink no pedido; Garçom recebe alerta de pronto',
    breakdown: [
      {
        area: 'Receita Completa Dentro do Pedido',
        detail:
          'Ao tocar em qualquer drink na fila, o bartender vê os ingredientes em ml, copo, gelo, guarnição e modo de preparo sem sair da tela.',
      },
      {
        area: '3 Modos de Escala Multi-Garçom',
        detail:
          'Modo Híbrido (1º garçom que atende assume a mesa), Praças Fixas (ex: Varanda Mesas 1–6) ou Fila Livre para equipes enxutas.',
      },
      {
        area: 'Trava “Vou levar” + Chamados de Mesa',
        detail:
          'Garçons veem quem já assumiu cada entrega e respondem chamados de “Chamar Garçom” ou “Pedir a Conta” vindos do QR da mesa.',
      },
      {
        area: 'Modo Offline Automático',
        detail:
          'Se o Wi-Fi oscilar no salão cheio, o garçom continua lançando pedidos normalmente e o app envia tudo sozinho assim que o sinal retorna.',
      },
    ],
    workflowSteps: [
      'Pedido entra pela mesa (QR Code), pelo garçom ou pelo Delivery.',
      'Barman ou Cozinha toca em “Preparar” (pode abrir a receita do drink em 1 clique).',
      'Ao marcar “Pronto”, o celular do garçom responsável apita e a TV de fila atualiza.',
      'Garçom toca em “Vou levar” e depois “Entregue” — a venda entra na comanda da mesa e baixa o estoque.',
    ],
    highlights: [
      { label: 'Estações dedicadas', value: 'Bar · Cozinha · Garçom' },
      { label: 'Ficha no pedido', value: '1 toque p/ abrir' },
      { label: 'Queda de internet', value: 'Fila offline segura' },
    ],
  },
  {
    id: 'cardapio_qr',
    number: '03',
    category: 'operacao',
    categoryLabel: 'Operação',
    tabName: 'Cardápio QR & Canva',
    title: 'Cardápio Digital QR, Perfil da Loja & Modo Canva',
    subtitle: 'Identidade visual própria, comanda compartilhada por código de 4 dígitos e placas QR para mesa.',
    whoUses: 'Clientes na mesa e Dono/Gerente',
    replaces: 'Cardápios em PDF estático e gastos recorrentes com gráfica',
    overview:
      'O cliente escaneia o QR Code da mesa sem baixar nada, vê fotos, descrições e preços sempre atualizados (incluindo Happy Hour) e acompanha o status do seu pedido ao vivo.',
    image: qrMenuImg,
    imageAlt: 'Cliente usando o cardápio digital QR Code do Meu Bar na mesa',
    imageCaption: 'Cardápio QR & Estúdio Visual · Personalização livre estilo Canva + gerador de placas de mesa',
    breakdown: [
      {
        area: 'Editor Visual Estilo Canva',
        detail:
          'Altere cor de fundo, superfície, destaque, fonte do nome, banner, brasão do logo e pré-visualize em tempo real antes de publicar.',
      },
      {
        area: 'Contraste Automático Inteligente',
        detail:
          'Mesmo se o dono escolher um tema claro (branco, creme ou dourado), o sistema ajusta as letras para escuro automaticamente para nunca sumir texto.',
      },
      {
        area: 'Comanda de Mesa com Código de 4 Dígitos',
        detail:
          'Os amigos da mesa entram na mesma comanda com código único, fazem pedidos individuais e cada um sabe exatamente quanto consumiu.',
      },
      {
        area: 'Gerador de Placas QR por Mesa',
        detail:
          'Gera placas personalizadas com a logo e número de cada mesa prontas para baixar/imprimir em acrílico ou adesivo.',
      },
    ],
    workflowSteps: [
      'Dono personaliza visual do cardápio e imprime as placas QR das mesas.',
      'Cliente aponta a câmera na Mesa 05 e o cardápio abre em menos de 2 segundos.',
      'Se um ingrediente acaba no estoque, os drinks que dependem dele somem automaticamente.',
      'Cliente pode pedir direto, chamar o garçom ou solicitar a conta sem levantar da mesa.',
    ],
    highlights: [
      { label: 'Instalação p/ cliente', value: 'Nenhuma (100% web)' },
      { label: 'Contraste de texto', value: 'Automático' },
      { label: 'Sincronia de preço', value: 'Instantânea' },
    ],
  },
  {
    id: 'estoque',
    number: '04',
    category: 'operacao',
    categoryLabel: 'Operação',
    tabName: 'Estoque & Receitas',
    title: 'Estoque Inteligente, 100+ Receitas & Precificação por CMV',
    subtitle: 'Controle exato de garrafas, baixa automática por dose e sugestão de preço com margem real.',
    whoUses: 'Dono, Gerente e Chefe de Bar',
    replaces: 'Contagem manual imprecisa e preço chutado sem saber o custo',
    overview:
      'Cada bar começa com seu estoque 100% limpo e isolado (sem dados misturados). Você cadastra apenas o que compra, usa kits iniciais se quiser, e o sistema calcula quais das 100+ receitas estão prontas para vender.',
    image: screenEstoqueImg,
    imageAlt: 'Tela de estoque de garrafas e ficha técnica de drinks do Meu Bar',
    imageCaption: 'Estoque & Ficha Técnica · Baixa em ml, alerta de reposição e precificação sugerida',
    breakdown: [
      {
        area: 'Cadastro Limpo + Kits Iniciais Opcionais',
        detail:
          'Controle insumos em ml, garrafas, latas, kg ou unidades com preço de compra e estoque mínimo configurável.',
      },
      {
        area: 'Biblioteca com 100+ Receitas + Drinks Autorais',
        detail:
          'Inclui coquetéis clássicos, sem álcool, cervejas e porções, além de criador completo para cadastrar drinks exclusivos da casa com foto.',
      },
      {
        area: 'Baixa Automática por Dose (ml)',
        detail:
          'Ao concluir um drink na fila, o sistema desconta exatamente os ml configurados na receita de cada garrafa do estoque.',
      },
      {
        area: 'Precificação com Margem & CMV',
        detail:
          'Calcula o custo exato de cada drink (CMV), mostra quantos itens estão sem preço e permite aplicar o preço sugerido em 1 clique.',
      },
    ],
    workflowSteps: [
      'Cadastre as garrafas e insumos comprados com custo e estoque mínimo.',
      'O sistema libera automaticamente os drinks que têm todos os ingredientes disponíveis.',
      'Defina os preços na tela de Precificação usando a margem sugerida.',
      'Quando algum insumo chega ao mínimo, gere a Lista de Compras pronta para enviar ao fornecedor.',
    ],
    highlights: [
      { label: 'Receitas prontas', value: '100+ com medidas' },
      { label: 'Isolamento', value: '100% por loja' },
      { label: 'Cálculo de custo', value: 'Automático (CMV)' },
    ],
  },
  {
    id: 'caixa',
    number: '05',
    category: 'caixa_tv',
    categoryLabel: 'Caixa & TVs',
    tabName: 'Caixa Detalhado',
    title: 'Caixa Detalhado, Dose Extra na Hora, Pix & Impressora Térmica',
    subtitle: 'Expanda cada cliente/mesa para ver todos os pedidos, lance adicionais na hora e feche sem fila.',
    whoUses: 'Operador de Caixa, Gerente e Dono',
    replaces: 'PDV caro de mensalidade alta + calculadora na hora de dividir conta',
    overview:
      'Reúne todas as comandas abertas de mesas e clientes individuais em uma tela rápida. Ao tocar no nome do cliente, o card abre expandido mostrando cada item consumido, quem pediu, horário e botão imediato para cobrar dose extra ou adicional.',
    image: screenCaixaImg,
    imageAlt: 'Tela do Caixa Pro com detalhamento de pedidos, Pix e impressão térmica',
    imageCaption: 'Caixa Detalhado · Expansão por cliente, botão Dose Extra, divisão de conta e Pix',
    breakdown: [
      {
        area: 'Card Expansível por Cliente ou Mesa',
        detail:
          'Toque no nome para expandir todos os pedidos individuais (quantidade, valor unitário, status, observações e subtotal por pessoa na mesa).',
      },
      {
        area: 'Botão “+ Dose Extra / Adicional” Direto na Conta',
        detail:
          'Atalhos rápidos (Dose extra, Energético, Água, Gelo+Limão, Porção) ou valor personalizado já somam direto na comanda para cobrar ali mesmo.',
      },
      {
        area: 'Divisão de Conta, 10% Opcional & Pagamento Misto',
        detail:
          'Divida igualmente entre amigos, combine Pix + Cartão + Dinheiro no mesmo fechamento, aplique resgate de fidelidade e gere QR Code Pix oficial.',
      },
      {
        area: 'Controle de Turno + Impressora Bluetooth 58/80mm',
        detail:
          'Abertura e fechamento de caixa com fundo de troco, sangrias, suprimentos, diferença de conferência e impressão de pré-conta/recibo sem fio.',
      },
    ],
    workflowSteps: [
      'Clique no nome do cliente ou da mesa para conferir todos os itens expandidos.',
      'Se o cliente pediu uma dose extra no balcão, adicione ali mesmo em 2 segundos.',
      'Toque em “2ª Tela” para exibir o resumo da conta + QR Pix no monitor do cliente.',
      'Confirme o recebimento (Pix/Cartão/Dinheiro), imprima o comprovante e o turno atualiza o Resumo.',
    ],
    highlights: [
      { label: 'Adicional no caixa', value: 'Cobrança imediata' },
      { label: 'Impressoras', value: '58mm e 80mm BT/USB' },
      { label: 'Divisão de mesa', value: 'Por pessoa ou misto' },
    ],
  },
  {
    id: 'segunda_tela',
    number: '06',
    category: 'caixa_tv',
    categoryLabel: 'Caixa & TVs',
    tabName: '2ª Tela & TVs Fila',
    title: 'Segunda Tela do Cliente, TVs de Fila & Monitores Salvos',
    subtitle: 'Telas dedicadas somente para visualização (zero acesso ao app), com logo da empresa em descanso.',
    whoUses: 'Clientes no balcão/salão e Equipe de Bar/Cozinha',
    replaces: 'Sistemas de painel de senha e displays de caixa dedicados caríssimos',
    overview:
      'Transforme qualquer tablet antigo, monitor secundário HDMI ou Smart TV em telas profissionais sincronizadas em tempo real — sem nunca expor o financeiro ou botões do app.',
    image: screenSegundaTelaImg,
    imageAlt: 'Segunda tela de balcão com resumo da compra e QR Pix ao lado de TV de fila de pedidos',
    imageCaption: 'Segunda Tela & Painel TV · Resumo + Pix para o cliente e TVs de acompanhamento de fila',
    breakdown: [
      {
        area: '2ª Tela do Cliente (Resumo da Compra + QR Pix)',
        detail:
          'Mostra apenas os itens da conta, descontos/10%, total e QR Code Pix em tamanho grande. Ao pagar, exibe “Pagamento Confirmado!” e volta sozinha para a Logo do bar.',
      },
      {
        area: 'TV Fila de Pedidos — Visão Clientes',
        detail:
          'Tela de salão separada em “Em Preparo” e “Pronto para Retirar!” com aviso sonoro opcional. Quando não há pedidos ativos, exibe a Logo do bar em tela cheia.',
      },
      {
        area: 'TV Fila de Pedidos — Visão Equipe (KDS Somente Leitura)',
        detail:
          'Monitor para cozinha e balcão acompanharem tempos de espera, itens e observações com filtro por estação (Todos / Bar / Cozinha).',
      },
      {
        area: 'Memória Permanente de Monitor Escolhido',
        detail:
          'Escolha qual monitor/TV reproduz cada tela (Monitor 2, TV Salão, TV Cozinha, Chromecast/Cast ou link QR) e o app salva sua escolha para sempre reproduzir ali.',
      },
    ],
    workflowSteps: [
      'No Caixa, abra “2ª Tela & TVs de Fila” e selecione o monitor desejado para cada função.',
      'A escolha do monitor fica salva automaticamente para os próximos turnos.',
      'Abra no 2º monitor, envie por Cast ou escaneie o QR Code na Smart TV / tablet.',
      'Enquanto nenhuma conta ou pedido está ativo, a tela valoriza sua marca exibindo a Logo do bar.',
    ],
    highlights: [
      { label: 'Telas somente leitura', value: '3 modos dedicados' },
      { label: 'Tela ociosa', value: 'Logo da empresa' },
      { label: 'Monitor escolhido', value: 'Salvo automaticamente' },
    ],
  },
  {
    id: 'delivery',
    number: '07',
    category: 'operacao',
    categoryLabel: 'Operação',
    tabName: 'Delivery 0%',
    title: 'Delivery Próprio (0% Comissão) & Painel de Motoboys',
    subtitle: 'Canal direto de vendas externas sem pagar taxas abusivas, com rastreio ao vivo e despacho rápido.',
    whoUses: 'Clientes externos, Cozinha/Bar e Motoboys',
    replaces: 'Comissões de 18% a 27% em aplicativos terceiros',
    overview:
      'Seu bar ganha um link próprio de delivery com as cores da casa. O cliente monta o pedido, informa endereço/bairro, escolhe pagamento (Pix, cartão na entrega ou troco) e acompanha cada etapa ao vivo.',
    image: deliveryImg,
    imageAlt: 'Pedido de delivery do bar embalado para despacho ao motoboy',
    imageCaption: 'Delivery Próprio · Taxas por bairro, rastreio do cliente e despacho com Google Maps',
    breakdown: [
      {
        area: 'Taxas por Bairro & Frete Grátis Configurável',
        detail:
          'Cadastre cada bairro atendido com sua taxa específica, defina pedido mínimo, tempo estimado e faixa de frete grátis.',
      },
      {
        area: 'Ligar / Pausar Delivery em 1 Toque',
        detail:
          'Salão lotou no sábado à noite? Pause o recebimento de delivery instantaneamente sem desligar o cardápio QR das mesas.',
      },
      {
        area: 'Despacho para Motoboy com Rota Google Maps',
        detail:
          'Cadastre seus motoboys e envie o pedido pronto no WhatsApp já com endereço formatado, link do mapa e valor a cobrar/troco.',
      },
      {
        area: 'Etiqueta Térmica + Rastreio do Cliente',
        detail:
          'Imprima etiqueta de entrega na impressora 58/80mm e deixe o cliente acompanhar: Recebido → Preparando → Saiu p/ entrega → Entregue.',
      },
    ],
    workflowSteps: [
      'Divulgue o link do delivery na bio do Instagram e no WhatsApp do bar.',
      'O pedido entra no painel com alerta sonoro e já vai para a fila da Cozinha/Bar.',
      'Imprima a etiqueta da embalagem e clique em “Despachar Motoboy”.',
      'O valor entra 100% no caixa do bar sem descontar comissão de marketplace.',
    ],
    highlights: [
      { label: 'Comissão por pedido', value: '0% para sempre' },
      { label: 'Rota motoboy', value: 'WhatsApp + Maps' },
      { label: 'Controle de fila', value: 'Pausa em 1 toque' },
    ],
  },
  {
    id: 'gestao',
    number: '08',
    category: 'gestao',
    categoryLabel: 'Gestão & Equipe',
    tabName: 'Central de Gestão',
    title: 'Central de Gestão — Financeiro CMV, Happy Hour, Fidelidade & RBAC',
    subtitle: 'Todos os controles estratégicos consolidados em abas limpas para crescer margem e recorrência.',
    whoUses: 'Dono e Gerente',
    replaces: 'Sistemas separados de financeiro, fidelidade, reservas e auditoria',
    overview:
      'Em vez de dezenas de menus confusos, a Central de Gestão reúne em um só lugar os módulos profissionais que aumentam o lucro e blindam a operação contra erros ou fraudes.',
    image: screenGestaoImg,
    imageAlt: 'Tablet exibindo painel financeiro com lucro líquido, CMV, Happy Hour e fidelidade',
    imageCaption: 'Central de Gestão · Lucro líquido com CMV, Happy Hour automático, Fidelidade e Auditoria',
    breakdown: [
      {
        area: 'Financeiro Real & CMV + Exportação CSV',
        detail:
          'Cruza receita bruta, custo real dos ingredientes vendidos (CMV), quebras/perdas e cortesias para mostrar o lucro líquido verdadeiro.',
      },
      {
        area: 'Happy Hour Automático & Cartão Fidelidade',
        detail:
          'Agende dias e horários de desconto que ativam sozinhos no cardápio e crie programas de selos ou cashback resgatáveis no Caixa.',
      },
      {
        area: 'Compras, Fornecedores, Perdas & Reservas/CRM',
        detail:
          'Controle agenda de reservas de mesas, histórico de clientes frequentes, registro de quebras e lista de compras por fornecedor.',
      },
      {
        area: 'Permissões por Cargo (RBAC) & Log de Auditoria',
        detail:
          'Defina exatamente o que Garçom, Barman, Cozinha, Caixa e Gerente podem fazer e audite cancelamentos, descontos e sangrias.',
      },
    ],
    workflowSteps: [
      'Configure horários de Happy Hour e regras de Fidelidade uma única vez.',
      'Defina as permissões de cada cargo e cadastre a chave Pix + impressora Bluetooth.',
      'Acompanhe semanalmente o relatório de CMV e perdas para corrigir gargalos.',
      'Exporte os dados em CSV sempre que precisar enviar para a contabilidade.',
    ],
    highlights: [
      { label: 'Módulos unificados', value: '7 em 1 central' },
      { label: 'Segurança interna', value: 'RBAC + Auditoria' },
      { label: 'Exportação', value: 'Planilha CSV' },
    ],
  },
  {
    id: 'equipe_suporte',
    number: '09',
    category: 'gestao',
    categoryLabel: 'Gestão & Equipe',
    tabName: 'Equipe, Vagas & Suporte',
    title: 'Equipe, Banco de Vagas/Currículos, Login Rápido & Suporte no App',
    subtitle: 'Contrate profissionais, proteja o acesso com biometria do celular e fale com o suporte sem sair do app.',
    whoUses: 'Dono, Equipe e Profissionais de Bar',
    replaces: 'Grupos bagunçados de emprego, senhas repetidas e suporte lento por e-mail',
    overview:
      'Além de operar o bar, o Meu Bar conecta donos a bartenders, garçons e cozinheiros da região, protege cada aparelho com desbloqueio biométrico e oferece chat direto com nossa equipe de suporte.',
    image: heroImg,
    imageAlt: 'Ambiente de bar profissional com equipe de coquetelaria e atendimento integrado',
    imageCaption: 'Ecossistema Completo · Contratação com perfil da loja, biometria no aparelho e suporte ao vivo',
    breakdown: [
      {
        area: 'Perfil Público da Loja, Vagas & Currículos Recebidos',
        detail:
          'Publique vagas em segundos; candidatos veem o perfil completo da loja, enviam currículo em PDF/perfil e o dono aprova e já adiciona na equipe.',
      },
      {
        area: 'Login Rápido com Biometria / Desbloqueio do Celular',
        detail:
          'Salva o último perfil usado no aparelho (sem armazenar senha) e permite destravar com digital, Face ID ou PIN rápido de 4–6 dígitos.',
      },
      {
        area: 'Chat Direto com o Suporte Dentro do App',
        detail:
          'As lojas conversam em tempo real com a equipe de suporte sem precisar sair do sistema, com histórico salvo e notificação de novas mensagens.',
      },
      {
        area: 'Navegação Fluida + Modo Diurno e Noturno',
        detail:
          'Botão voltar fixo que retrai ao rolar, suporte seguro ao botão voltar do celular e manutenção da tela atual mesmo após atualizar a página.',
      },
    ],
    workflowSteps: [
      'Publique uma vaga (ex: Barman fim de semana) e receba currículos em tempo real.',
      'Clique no candidato aprovado para já adicioná-lo como membro da loja.',
      'Ative o Login Rápido com biometria do celular em Mais → Login Rápido.',
      'Qualquer dúvida durante o turno? Abra o Chat Direto com o Suporte dentro do app.',
    ],
    highlights: [
      { label: 'Desbloqueio', value: 'Digital / Face ID / PIN' },
      { label: 'Contratação', value: 'Vagas + Currículos' },
      { label: 'Suporte', value: 'Chat ao vivo no app' },
    ],
  },
];

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
  const [selectedProblemId, setSelectedProblemId] = useState<string>(CLIENT_PROBLEM_SHOWCASE[0].id);

  // Estado da seção "Conhecendo o App" (Tour tela por tela)
  const [tourCategory, setTourCategory] = useState<'all' | 'operacao' | 'caixa_tv' | 'gestao'>('all');
  const [selectedScreenId, setSelectedScreenId] = useState<string>(APP_SCREEN_TOUR[0].id);

  const selectedProblemIdx = Math.max(
    0,
    CLIENT_PROBLEM_SHOWCASE.findIndex((p) => p.id === selectedProblemId)
  );
  const selectedProblem = CLIENT_PROBLEM_SHOWCASE[selectedProblemIdx] || CLIENT_PROBLEM_SHOWCASE[0];

  const filteredScreens = useMemo(
    () =>
      tourCategory === 'all'
        ? APP_SCREEN_TOUR
        : APP_SCREEN_TOUR.filter((s) => s.category === tourCategory),
    [tourCategory]
  );

  const selectedScreenIdx = Math.max(
    0,
    APP_SCREEN_TOUR.findIndex((s) => s.id === selectedScreenId)
  );
  const selectedScreen = APP_SCREEN_TOUR[selectedScreenIdx] || APP_SCREEN_TOUR[0];

  const jumpToTourScreen = (screenId: string) => {
    setTourCategory('all');
    setSelectedScreenId(screenId);
    const el = document.getElementById('conhecendo-o-app');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Lead / Demonstração form
  const [leadName, setLeadName] = useState('');
  const [leadBar, setLeadBar] = useState('');
  const [leadWhatsApp, setLeadWhatsApp] = useState('');
  const [leadTables, setLeadTables] = useState('10 a 25 mesas');
  const [leadErr, setLeadErr] = useState('');
  const [leadSent, setLeadSent] = useState(false);

  const monthlyPrice = Number(saasConfig.pro_price_monthly ?? DEFAULT_SAAS_CONFIG.pro_price_monthly);
  const yearlyPrice = Number(saasConfig.pro_price_yearly ?? DEFAULT_SAAS_CONFIG.pro_price_yearly);
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
      'Olá! Vim pela apresentação oficial do Meu Bar e quero conhecer o sistema.',
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
    if (!cd.allowed) {
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
          backgroundColor: 'rgba(12, 11, 10, 0.92)',
          borderColor: 'rgba(255, 255, 255, 0.08)',
        }}
      >
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#topo"
            className="flex items-center no-underline shrink-0 whitespace-nowrap"
            style={{ color: '#F5F0E8' }}
          >
            <span
              className="text-xl font-bold tracking-tight"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Meu Bar
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm" style={{ color: '#A89F94' }}>
            <a
              href="#diagnostico"
              className="no-underline hover:text-[#F5F0E8] transition-colors whitespace-nowrap shrink-0"
              style={{ color: 'inherit' }}
            >
              Problemas
            </a>
            <a
              href="#conhecendo-o-app"
              className="no-underline hover:text-[#F5F0E8] transition-colors whitespace-nowrap shrink-0"
              style={{ color: 'inherit' }}
            >
              Conhecendo o App
            </a>
            <a
              href="#calculadora"
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
      <section id="topo" className="max-w-[1200px] mx-auto px-6 pt-16 pb-20 lg:pt-22 lg:pb-26">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div
              className="text-xs font-semibold tracking-[0.14em] uppercase"
              style={{ color: '#E5A93C' }}
            >
              Operação completa para bares, pubs e gastrobares
            </div>
            <h1
              className="text-4xl sm:text-5xl lg:text-[3.3rem] leading-[1.06] font-semibold tracking-tight !m-0"
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                textWrap: 'balance',
                color: '#F5F0E8',
              }}
            >
              Controle o salão, o bar, a cozinha, o caixa e o delivery em um único sistema.
            </h1>
            <p
              className="text-base sm:text-lg leading-relaxed max-w-[54ch] !m-0"
              style={{ color: '#A89F94' }}
            >
              Cardápio QR personalizável, fila ao vivo para bartenders e cozinha, escala
              multi-garçom por praças, estoque com baixa automática por receita, segunda tela com
              QR Pix, TVs de fila e delivery próprio com 0% de comissão.
            </p>

            <div className="flex flex-wrap items-center gap-5 pt-2">
              <button
                type="button"
                onClick={onEnterApp}
                className="px-6 py-3.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 cursor-pointer border-0 whitespace-nowrap shrink-0"
                style={{ backgroundColor: '#E5A93C', color: '#0C0B0A' }}
              >
                {isLoggedIn
                  ? 'Abrir meu painel agora'
                  : trialDays > 0
                    ? `Começar grátis (${trialDays} dias Pro)`
                    : 'Criar conta grátis'}
              </button>
              <a
                href="#conhecendo-o-app"
                className="text-sm font-semibold underline underline-offset-4 hover:opacity-80 whitespace-nowrap shrink-0"
                style={{ color: '#F5F0E8' }}
              >
                Conhecer tela por tela (9 módulos)
              </a>
              <a
                href="#diagnostico"
                className="text-sm font-medium hover:opacity-80 whitespace-nowrap shrink-0 no-underline"
                style={{ color: '#A89F94' }}
              >
                Apresentação por dor do bar →
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
                  comissão no delivery próprio
                </div>
              </div>
              <div>
                <div
                  className="text-2xl font-bold tabular-nums"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: '#F5F0E8' }}
                >
                  9 telas
                </div>
                <div className="text-xs mt-1" style={{ color: '#A89F94' }}>
                  do estoque à 2ª tela Pix e TVs
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
                  impressão Bluetooth e USB
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
                    'linear-gradient(180deg, rgba(12,11,10,0.05) 0%, rgba(12,11,10,0.72) 100%)',
                }}
              />
              <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
                <div>
                  <div
                    className="text-[11px] font-semibold tracking-wider uppercase"
                    style={{ color: '#E5A93C' }}
                  >
                    Fluxo ponta a ponta em tempo real
                  </div>
                  <div className="text-sm font-medium mt-0.5" style={{ color: '#F5F0E8' }}>
                    Mesa QR → Bar/Cozinha → Garçom → Caixa + 2ª Tela Pix → Resumo do Dono
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

      {/* SEÇÃO 1: APRESENTAÇÃO INTERATIVA POR PROBLEMA DO CLIENTE (RESUMO DETALHADO) */}
      <section
        id="diagnostico"
        className="border-t py-20 lg:py-24"
        style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
      >
        <div className="max-w-[1200px] mx-auto px-6 space-y-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="max-w-2xl space-y-3">
              <div
                className="text-xs uppercase tracking-[0.16em] font-semibold"
                style={{ color: '#E5A93C' }}
              >
                Apresentação comercial guiada · Diagnóstico rápido
              </div>
              <h2
                className="text-3xl sm:text-4xl font-semibold leading-tight !m-0"
                style={{ fontFamily: "'Fraunces', Georgia, serif", textWrap: 'balance' }}
              >
                Qual é a maior dor do bar hoje? Selecione e mostre exatamente como o Meu Bar resolve.
              </h2>
            </div>
            <div className="text-sm max-w-sm leading-relaxed" style={{ color: '#A89F94' }}>
              Durante uma apresentação ao cliente, basta tocar no problema que ele relatar para ir
              direto ao comparativo antes/depois, passos práticos e simulação numérica.
            </div>
          </div>

          {/* Seletor dos 6 problemas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CLIENT_PROBLEM_SHOWCASE.map((item, idx) => {
              const isSelected = item.id === selectedProblem.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedProblemId(item.id)}
                  className="text-left rounded-xl p-4 border transition-all cursor-pointer flex flex-col justify-between gap-2"
                  style={{
                    backgroundColor: isSelected ? 'rgba(229, 169, 60, 0.14)' : '#161412',
                    borderColor: isSelected ? '#E5A93C' : 'rgba(255, 255, 255, 0.1)',
                    color: '#F5F0E8',
                  }}
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <span
                      className="text-[11px] font-bold tracking-wider"
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        color: isSelected ? '#E5A93C' : '#A89F94',
                      }}
                    >
                      0{idx + 1}. {item.shortLabel}
                    </span>
                    {isSelected && (
                      <span className="text-[11px] font-bold" style={{ color: '#E5A93C' }}>
                        Em foco
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium leading-snug" style={{ color: '#F5F0E8' }}>
                    {item.painQuestion}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Painel Detalhado do Problema Selecionado */}
          <div
            className="rounded-2xl border overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch"
            style={{
              backgroundColor: '#161412',
              borderColor: 'rgba(229, 169, 60, 0.35)',
            }}
          >
            {/* Coluna esquerda: Diagnóstico + Antes/Depois + Solução + Exemplo */}
            <div className="lg:col-span-6 p-7 sm:p-8 flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <div
                  className="text-xs font-semibold tracking-wider"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: '#E5A93C' }}
                >
                  {selectedProblem.moduleTag}
                </div>
                <h3
                  className="text-2xl sm:text-[1.7rem] font-semibold leading-tight !m-0"
                  style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#F5F0E8' }}
                >
                  {selectedProblem.screenTitle}
                </h3>
                <p className="text-sm leading-relaxed !m-0" style={{ color: '#A89F94' }}>
                  {selectedProblem.problemSummary}
                </p>

                {/* Comparativo Antes vs Com o Meu Bar */}
                <div
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1"
                >
                  <div
                    className="rounded-xl p-3.5 border space-y-1"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.06)',
                      borderColor: 'rgba(239, 68, 68, 0.22)',
                    }}
                  >
                    <div className="text-[11px] font-bold text-red-300">
                      Sem o sistema (hoje)
                    </div>
                    <p className="text-xs leading-relaxed !m-0" style={{ color: '#D6CFC7' }}>
                      {selectedProblem.beforeScenario}
                    </p>
                  </div>
                  <div
                    className="rounded-xl p-3.5 border space-y-1"
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.07)',
                      borderColor: 'rgba(16, 185, 129, 0.28)',
                    }}
                  >
                    <div className="text-[11px] font-bold text-emerald-300">
                      Com o Meu Bar
                    </div>
                    <p className="text-xs leading-relaxed !m-0" style={{ color: '#F5F0E8' }}>
                      {selectedProblem.afterScenario}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="text-xs font-bold" style={{ color: '#F5F0E8' }}>
                    Como o Meu Bar resolve passo a passo
                  </div>
                  <ul className="space-y-2 list-none p-0 m-0 text-sm" style={{ color: '#F5F0E8' }}>
                    {selectedProblem.solutionSteps.map((step) => (
                      <li key={step} className="flex items-start gap-2.5 leading-snug">
                        <span style={{ color: '#E5A93C' }} className="font-bold shrink-0">
                          ✓
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Bloco de Exemplo Real + Atalho pro Tour */}
              <div className="space-y-3">
                <div
                  className="rounded-xl border p-4 space-y-3"
                  style={{
                    backgroundColor: '#0C0B0A',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div className="text-xs font-bold" style={{ color: '#E5A93C' }}>
                    {selectedProblem.exampleTitle}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedProblem.exampleMetrics.map((m) => (
                      <div key={m.label}>
                        <div className="text-[11px]" style={{ color: '#A89F94' }}>
                          {m.label}
                        </div>
                        <div
                          className="text-sm sm:text-base font-bold tabular-nums mt-0.5"
                          style={{ fontFamily: "'JetBrains Mono', monospace", color: '#F5F0E8' }}
                        >
                          {m.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => jumpToTourScreen(selectedProblem.tourScreenId)}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold cursor-pointer border transition-colors hover:bg-white/5"
                  style={{
                    backgroundColor: 'transparent',
                    borderColor: 'rgba(229, 169, 60, 0.45)',
                    color: '#E5A93C',
                  }}
                >
                  Destrinchar esta tela em detalhes no Tour “Conhecendo o App” ↓
                </button>
              </div>
            </div>

            {/* Coluna direita: Imagem da Tela + Controles de Apresentador */}
            <div
              className="lg:col-span-6 flex flex-col justify-between bg-black/50 border-t lg:border-t-0 lg:border-l"
              style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
            >
              <div className="relative flex-1 min-h-[280px] sm:min-h-[380px]">
                <img
                  src={selectedProblem.image}
                  alt={selectedProblem.imageAlt}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover block"
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(12,11,10,0.08) 0%, rgba(12,11,10,0.82) 100%)',
                  }}
                />
                <div className="absolute bottom-4 left-5 right-5">
                  <div className="text-xs font-semibold" style={{ color: '#F5F0E8' }}>
                    {selectedProblem.screenCaption}
                  </div>
                </div>
              </div>

              <div
                className="px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap border-t"
                style={{
                  backgroundColor: '#11100E',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                }}
              >
                <div
                  className="text-xs tabular-nums"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: '#A89F94' }}
                >
                  Cenário {selectedProblemIdx + 1} de {CLIENT_PROBLEM_SHOWCASE.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const prevIdx =
                        (selectedProblemIdx - 1 + CLIENT_PROBLEM_SHOWCASE.length) %
                        CLIENT_PROBLEM_SHOWCASE.length;
                      setSelectedProblemId(CLIENT_PROBLEM_SHOWCASE[prevIdx].id);
                    }}
                    className="px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer border bg-transparent whitespace-nowrap"
                    style={{
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      color: '#F5F0E8',
                    }}
                  >
                    ← Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextIdx = (selectedProblemIdx + 1) % CLIENT_PROBLEM_SHOWCASE.length;
                      setSelectedProblemId(CLIENT_PROBLEM_SHOWCASE[nextIdx].id);
                    }}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer border-0 whitespace-nowrap"
                    style={{ backgroundColor: '#E5A93C', color: '#0C0B0A' }}
                  >
                    Próximo problema →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 2: CONHECENDO O APP — TOUR DETALHADO TELA POR TELA COM ESCOLHA DIRETA */}
      <section
        id="conhecendo-o-app"
        className="border-t py-20 lg:py-26"
        style={{
          borderColor: 'rgba(255, 255, 255, 0.08)',
          backgroundColor: '#11100E',
        }}
      >
        <div className="max-w-[1200px] mx-auto px-6 space-y-10">
          {/* Cabeçalho + Filtro por Área */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <div
                className="text-xs uppercase tracking-[0.16em] font-semibold"
                style={{ color: '#E5A93C' }}
              >
                Conhecendo o App · Mapa completo por tela
              </div>
              <h2
                className="text-3xl sm:text-4xl font-semibold leading-tight !m-0"
                style={{ fontFamily: "'Fraunces', Georgia, serif", textWrap: 'balance' }}
              >
                Destrinche cada tela do Meu Bar ou escolha diretamente a tela que deseja ver.
              </h2>
              <p className="text-sm leading-relaxed !m-0" style={{ color: '#A89F94' }}>
                Navegue na sequência completa das 9 telas ou clique direto no módulo que você quer
                apresentar ao cliente — com anatomia de cada botão, fluxo real de uso e resultados.
              </p>
            </div>

            {/* Controle segmentado de categoria (funcional) */}
            <div
              className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl border self-start"
              style={{ backgroundColor: '#0C0B0A', borderColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              {(
                [
                  { id: 'all', label: 'Todas (9)' },
                  { id: 'operacao', label: 'Operação' },
                  { id: 'caixa_tv', label: 'Caixa & TVs' },
                  { id: 'gestao', label: 'Gestão & Equipe' },
                ] as const
              ).map((cat) => {
                const active = tourCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setTourCategory(cat.id);
                      const nextList =
                        cat.id === 'all'
                          ? APP_SCREEN_TOUR
                          : APP_SCREEN_TOUR.filter((s) => s.category === cat.id);
                      if (nextList.length > 0 && !nextList.some((s) => s.id === selectedScreenId)) {
                        setSelectedScreenId(nextList[0].id);
                      }
                    }}
                    className="px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer border-0 transition-colors whitespace-nowrap shrink-0"
                    style={{
                      backgroundColor: active ? '#E5A93C' : 'transparent',
                      color: active ? '#0C0B0A' : '#A89F94',
                    }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grade de Seleção Direta de Telas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {filteredScreens.map((scr) => {
              const active = scr.id === selectedScreen.id;
              return (
                <button
                  key={scr.id}
                  type="button"
                  onClick={() => setSelectedScreenId(scr.id)}
                  className="text-left rounded-xl px-3.5 py-3 border transition-all cursor-pointer flex flex-col gap-1"
                  style={{
                    backgroundColor: active ? 'rgba(229, 169, 60, 0.16)' : '#161412',
                    borderColor: active ? '#E5A93C' : 'rgba(255, 255, 255, 0.09)',
                    color: '#F5F0E8',
                  }}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span
                      className="font-bold tabular-nums"
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        color: active ? '#E5A93C' : '#A89F94',
                      }}
                    >
                      Tela {scr.number}
                    </span>
                    <span style={{ color: '#A89F94' }}>{scr.categoryLabel}</span>
                  </div>
                  <div className="text-xs sm:text-[13px] font-semibold leading-snug truncate">
                    {scr.tabName}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Palco Principal da Tela Selecionada (Anatomia Completa) */}
          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              backgroundColor: '#161412',
              borderColor: 'rgba(255, 255, 255, 0.12)',
            }}
          >
            {/* Topo do palco: título, metadados limpos e navegação sequencial */}
            <div
              className="p-6 sm:p-8 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
            >
              <div className="space-y-1.5 max-w-3xl">
                <div
                  className="flex flex-wrap items-center gap-2 text-xs"
                  style={{ color: '#A89F94' }}
                >
                  <span
                    className="font-bold tabular-nums"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: '#E5A93C' }}
                  >
                    Tela {selectedScreen.number} de 0{APP_SCREEN_TOUR.length}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedScreen.categoryLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span>Quem usa: {selectedScreen.whoUses}</span>
                </div>
                <h3
                  className="text-2xl sm:text-3xl font-semibold leading-tight !m-0"
                  style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#F5F0E8' }}
                >
                  {selectedScreen.title}
                </h3>
                <p className="text-sm leading-relaxed !m-0" style={{ color: '#A89F94' }}>
                  {selectedScreen.subtitle}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const prev =
                      (selectedScreenIdx - 1 + APP_SCREEN_TOUR.length) % APP_SCREEN_TOUR.length;
                    setTourCategory('all');
                    setSelectedScreenId(APP_SCREEN_TOUR[prev].id);
                  }}
                  className="px-3.5 py-2.5 rounded-lg text-xs font-semibold cursor-pointer border bg-transparent whitespace-nowrap"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.2)', color: '#F5F0E8' }}
                >
                  ← Tela anterior
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = (selectedScreenIdx + 1) % APP_SCREEN_TOUR.length;
                    setTourCategory('all');
                    setSelectedScreenId(APP_SCREEN_TOUR[next].id);
                  }}
                  className="px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer border-0 whitespace-nowrap"
                  style={{ backgroundColor: '#E5A93C', color: '#0C0B0A' }}
                >
                  Próxima tela →
                </button>
              </div>
            </div>

            {/* Corpo em 2 colunas equilibradas */}
            <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
              {/* Esquerda: Prévia visual + Resumo + O que substitui + Métricas */}
              <div
                className="lg:col-span-5 flex flex-col justify-between border-b lg:border-b-0 lg:border-r"
                style={{ borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: '#0F0E0C' }}
              >
                <div className="relative aspect-[16/10] w-full bg-black/50 overflow-hidden">
                  <img
                    src={selectedScreen.image}
                    alt={selectedScreen.imageAlt}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover block"
                  />
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(12,11,10,0.04) 0%, rgba(12,11,10,0.82) 100%)',
                    }}
                  />
                  <div className="absolute bottom-3.5 left-4 right-4 text-xs font-medium" style={{ color: '#F5F0E8' }}>
                    {selectedScreen.imageCaption}
                  </div>
                </div>

                <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="text-xs font-bold" style={{ color: '#E5A93C' }}>
                      Visão geral desta tela
                    </div>
                    <p className="text-sm leading-relaxed !m-0" style={{ color: '#D6CFC7' }}>
                      {selectedScreen.overview}
                    </p>
                    <div
                      className="pt-3 border-t text-xs flex flex-col gap-1"
                      style={{ borderColor: 'rgba(255, 255, 255, 0.08)', color: '#A89F94' }}
                    >
                      <span>
                        <strong style={{ color: '#F5F0E8' }}>Substitui:</strong>{' '}
                        {selectedScreen.replaces}
                      </span>
                      <span>
                        <strong style={{ color: '#F5F0E8' }}>Equipe envolvida:</strong>{' '}
                        {selectedScreen.whoUses}
                      </span>
                    </div>
                  </div>

                  {/* 3 Métricas chave da tela */}
                  <div
                    className="grid grid-cols-3 gap-3 pt-4 border-t"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                  >
                    {selectedScreen.highlights.map((h) => (
                      <div key={h.label}>
                        <div className="text-[11px]" style={{ color: '#A89F94' }}>
                          {h.label}
                        </div>
                        <div
                          className="text-xs sm:text-sm font-bold tabular-nums mt-0.5"
                          style={{ fontFamily: "'JetBrains Mono', monospace", color: '#F5F0E8' }}
                        >
                          {h.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Direita: Anatomia destrinchada bloco por bloco + Fluxo prático */}
              <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-7">
                <div className="space-y-4">
                  <div className="text-xs font-bold" style={{ color: '#E5A93C' }}>
                    O que existe dentro desta tela (destrinchado ponto a ponto)
                  </div>

                  <div className="divide-y" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                    {selectedScreen.breakdown.map((part, idx) => (
                      <div
                        key={part.area}
                        className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-3.5"
                        style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                      >
                        <span
                          className="text-xs font-bold tabular-nums pt-0.5 shrink-0"
                          style={{ fontFamily: "'JetBrains Mono', monospace", color: '#E5A93C' }}
                        >
                          0{idx + 1}.
                        </span>
                        <div className="space-y-1">
                          <div className="text-sm font-semibold" style={{ color: '#F5F0E8' }}>
                            {part.area}
                          </div>
                          <p className="text-xs sm:text-[13px] leading-relaxed !m-0" style={{ color: '#A89F94' }}>
                            {part.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fluxo na prática */}
                <div
                  className="rounded-xl border p-5 space-y-3"
                  style={{
                    backgroundColor: '#0C0B0A',
                    borderColor: 'rgba(255, 255, 255, 0.09)',
                  }}
                >
                  <div className="text-xs font-bold" style={{ color: '#F5F0E8' }}>
                    Como funciona na prática durante o expediente
                  </div>
                  <ol className="space-y-2 list-none p-0 m-0 text-xs sm:text-[13px]">
                    {selectedScreen.workflowSteps.map((st, idx) => (
                      <li key={st} className="flex items-start gap-2.5 leading-relaxed">
                        <span
                          className="font-bold tabular-nums shrink-0"
                          style={{ fontFamily: "'JetBrains Mono', monospace", color: '#E5A93C' }}
                        >
                          {idx + 1}.
                        </span>
                        <span style={{ color: '#D6CFC7' }}>{st}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 3: CALCULADORA INTERATIVA DE ECONOMIA NO DELIVERY */}
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
                className="text-xs uppercase tracking-[0.16em] font-semibold"
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
                  <label className="!m-0 text-xs font-semibold" style={{ color: '#A89F94' }}>
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
                <div className="text-xs font-semibold" style={{ color: '#E5A93C' }}>
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

      {/* SEÇÃO 4: PLANOS TRANSPARENTES */}
      <section
        id="planos"
        className="border-t py-20 lg:py-24"
        style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
      >
        <div className="max-w-[1200px] mx-auto px-6 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <div
                className="text-xs uppercase tracking-[0.16em] font-semibold"
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
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer border-0 transition-colors whitespace-nowrap"
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
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer border-0 transition-colors whitespace-nowrap"
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
                <div className="text-sm font-semibold" style={{ color: '#A89F94' }}>
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
                <ul
                  className="space-y-2.5 text-sm pt-2 list-none p-0 m-0"
                  style={{ color: '#F5F0E8' }}
                >
                  <li>✓ Cardápio digital por QR Code ilimitado</li>
                  <li>✓ Controle de estoque e 100+ receitas automáticas</li>
                  <li>✓ Fila de pedidos ao vivo no Bar e Cozinha</li>
                  <li>✓ Personalização básica de cores, tema e logo</li>
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
                <div className="text-sm font-semibold" style={{ color: '#E5A93C' }}>
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
                <ul
                  className="space-y-2.5 text-sm pt-2 list-none p-0 m-0"
                  style={{ color: '#F5F0E8' }}
                >
                  <li>✓ Tudo do Grátis + zero anúncios no painel e cardápio</li>
                  <li>✓ Delivery próprio 0% comissão + taxas por bairro + motoboys</li>
                  <li>✓ Equipe Multi-Garçom (Híbrido, Praças Fixas e comissões)</li>
                  <li>✓ Caixa Detalhado + Dose Extra + 2ª Tela Pix + TVs de Fila</li>
                  <li>✓ Financeiro com CMV, lucro líquido, Happy Hour e Fidelidade</li>
                  <li>✓ Permissões por cargo (RBAC), Auditoria e Suporte no app</li>
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

      {/* SEÇÃO 5: FORMULÁRIO DE CONTATO / DEMONSTRAÇÃO */}
      <section
        id="contato"
        className="border-t py-20 lg:py-24"
        style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
      >
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5 space-y-4">
            <div
              className="text-xs uppercase tracking-[0.16em] font-semibold"
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
              segunda tela, impressoras Bluetooth, placas QR e ativação do Plano Pro.
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
        <div
          className="max-w-[1200px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs"
          style={{ color: '#A89F94' }}
        >
          <div
            style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#F5F0E8' }}
            className="text-base font-semibold"
          >
            Meu Bar
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <a
              href="#diagnostico"
              className="no-underline hover:text-[#F5F0E8]"
              style={{ color: 'inherit' }}
            >
              Problemas
            </a>
            <a
              href="#conhecendo-o-app"
              className="no-underline hover:text-[#F5F0E8]"
              style={{ color: 'inherit' }}
            >
              Conhecendo o App
            </a>
            <a
              href="#calculadora"
              className="no-underline hover:text-[#F5F0E8]"
              style={{ color: 'inherit' }}
            >
              Calculadora
            </a>
            <a
              href="#planos"
              className="no-underline hover:text-[#F5F0E8]"
              style={{ color: 'inherit' }}
            >
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
