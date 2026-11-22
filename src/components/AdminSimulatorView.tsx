import React, { useMemo, useState } from 'react';
import { STAFF_ROLES } from '../lib/staffAuth';
import { money } from '../lib/utils';
import type { StaffRoleKey } from '../types/meubar';

interface SimStaff {
  id: string;
  name: string;
  username: string;
  password: string;
  roles: StaffRoleKey[];
  active: boolean;
}

interface SimStockItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  costBasis: string;
  cost: number;
  inStock: boolean;
}

interface SimMenuItem {
  id: string;
  name: string;
  category: 'Drinks' | 'Petiscos' | 'Avulsos';
  price: number;
  requiresStockName?: string;
}

interface SimOrderItem {
  id: string;
  table: string;
  clientName: string;
  waiterName: string;
  menuItemId: string;
  name: string;
  qty: number;
  unitPrice: number;
  status: 'pending' | 'ready' | 'done';
  paid: boolean;
  createdAt: string;
}

interface SimSale {
  id: string;
  table: string;
  subtotal: number;
  couvert: number;
  serviceFee: number;
  discount: number;
  total: number;
  waiterName: string;
  service100ToWaiter: boolean;
  approvedBy?: string;
  paidAt: string;
}

type SimView = 'owner' | 'staff_login' | 'cashier' | 'customer_menu' | 'second_screen';

const INITIAL_STAFF: SimStaff[] = [
  {
    id: 'st_1',
    name: 'Lucas Mendes',
    username: 'lucas',
    password: '123',
    roles: ['garcom'],
    active: true,
  },
  {
    id: 'st_2',
    name: 'Carla Souza',
    username: 'carla',
    password: '123',
    roles: ['caixa'],
    active: true,
  },
  {
    id: 'st_3',
    name: 'Bruno Lima',
    username: 'bruno',
    password: '123',
    roles: ['barman', 'cozinha'],
    active: true,
  },
  {
    id: 'st_4',
    name: 'Fernanda Rocha',
    username: 'fernanda',
    password: '123',
    roles: ['gerente', 'caixa', 'garcom'],
    active: true,
  },
];

const INITIAL_STOCK: SimStockItem[] = [
  { id: 'sk_1', name: 'Gin', category: 'Destilados', unit: 'Garrafa (ml)', costBasis: 'garrafa', cost: 118, inStock: true },
  { id: 'sk_2', name: 'Vodka', category: 'Destilados', unit: 'Garrafa (ml)', costBasis: 'garrafa', cost: 85, inStock: true },
  { id: 'sk_3', name: 'Limão', category: 'Guarnições', unit: 'Quilo (kg)', costBasis: 'kg', cost: 8.5, inStock: true },
  { id: 'sk_4', name: 'Água tônica', category: 'Mixers', unit: 'Lata (ml)', costBasis: 'lata', cost: 3.4, inStock: true },
  { id: 'sk_5', name: 'Heineken 330ml', category: 'Vinhos e aperitivos', unit: 'Unidade (un)', costBasis: 'un', cost: 6.2, inStock: true },
  { id: 'sk_6', name: 'Batata Frita', category: 'Petiscos', unit: 'Pacote', costBasis: 'pacote', cost: 24, inStock: true },
];

const INITIAL_MENU: SimMenuItem[] = [
  { id: 'm_1', name: 'Gin Tônica Clássico', category: 'Drinks', price: 32, requiresStockName: 'Gin' },
  { id: 'm_2', name: 'Moscow Mule', category: 'Drinks', price: 34, requiresStockName: 'Vodka' },
  { id: 'm_3', name: 'Caipiroska de Limão', category: 'Drinks', price: 28, requiresStockName: 'Limão' },
  { id: 'm_4', name: 'Heineken Long Neck', category: 'Avulsos', price: 14, requiresStockName: 'Heineken 330ml' },
  { id: 'm_5', name: 'Porção de Batata Frita', category: 'Petiscos', price: 38, requiresStockName: 'Batata Frita' },
];

const INITIAL_ORDERS: SimOrderItem[] = [
  {
    id: 'ord_1',
    table: 'Mesa 04',
    clientName: 'Mariana',
    waiterName: 'Lucas Mendes',
    menuItemId: 'm_1',
    name: 'Gin Tônica Clássico',
    qty: 2,
    unitPrice: 32,
    status: 'done',
    paid: false,
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    id: 'ord_2',
    table: 'Mesa 04',
    clientName: 'Rafael',
    waiterName: 'Lucas Mendes',
    menuItemId: 'm_5',
    name: 'Porção de Batata Frita',
    qty: 1,
    unitPrice: 38,
    status: 'ready',
    paid: false,
    createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
  },
  {
    id: 'ord_3',
    table: 'Mesa 07',
    clientName: 'Thiago',
    waiterName: 'Lucas Mendes',
    menuItemId: 'm_4',
    name: 'Heineken Long Neck',
    qty: 3,
    unitPrice: 14,
    status: 'pending',
    paid: false,
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
  },
];

export const AdminSimulatorView: React.FC<{
  onToast: (msg: string) => void;
}> = ({ onToast }) => {
  const [simView, setSimView] = useState<SimView>('owner');

  // Regras da loja fictícia
  const [storeName, setStoreName] = useState('Bar Modelo — Demo Comercial');
  const [managerPin, setManagerPin] = useState('1234');
  const [staffLoginEnabled, setStaffLoginEnabled] = useState(true);
  const [couvertEnabled, setCouvertEnabled] = useState(true);
  const [couvertPrice, setCouvertPrice] = useState(15);
  const [couvertMode, setCouvertMode] = useState<'mandatory' | 'optional'>('optional');
  const [defaultServicePct, setDefaultServicePct] = useState(10);
  const [service100ToWaiter, setService100ToWaiter] = useState(true);

  // Dados fictícios em memória (zero impacto no banco real!)
  const [staff, setStaff] = useState<SimStaff[]>(INITIAL_STAFF);
  const [stock, setStock] = useState<SimStockItem[]>(INITIAL_STOCK);
  const [orders, setOrders] = useState<SimOrderItem[]>(INITIAL_ORDERS);
  const [sales, setSales] = useState<SimSale[]>([]);
  const [auditLogs, setAuditLogs] = useState<string[]>([
    'Simulador iniciado — nenhum dado real de clientes é alterado.',
  ]);

  // Novo funcionário fictício
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffUser, setNewStaffUser] = useState('');
  const [newStaffPass, setNewStaffPass] = useState('123');
  const [newStaffRoles, setNewStaffRoles] = useState<StaffRoleKey[]>(['garcom']);

  // Login de funcionário no simulador
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loggedStaffId, setLoggedStaffId] = useState<string | null>(null);

  // Estado do Caixa no simulador
  const [selectedTable, setSelectedTable] = useState<string>('Mesa 04');
  const [cashierIncludeCouvert, setCashierIncludeCouvert] = useState(true);
  const [cashierIncludeTip, setCashierIncludeTip] = useState(true);
  const [cashierTipMode, setCashierTipMode] = useState<'pct' | 'fixed'>('pct');
  const [cashierTipPct, setCashierTipPct] = useState(10);
  const [cashierTipFixed, setCashierTipFixed] = useState('');
  const [cashierDiscountPin, setCashierDiscountPin] = useState('');
  const [cashierDiscountUnlocked, setCashierDiscountUnlocked] = useState(false);
  const [cashierDiscountVal, setCashierDiscountVal] = useState('0');
  const [projectedTable, setProjectedTable] = useState<string | null>('Mesa 04');

  // Estado do Cardápio do Cliente (Mesa 04)
  const [custIncludeCouvert, setCustIncludeCouvert] = useState(true);
  const [custIncludeTip, setCustIncludeTip] = useState(true);
  const [custTipMode, setCustTipMode] = useState<'pct' | 'fixed'>('pct');
  const [custTipPct, setCustTipPct] = useState(10);
  const [custTipFixed, setCustTipFixed] = useState('');
  const [custRepeatAlert, setCustRepeatAlert] = useState<string | null>(null);

  const pushAudit = (entry: string) => {
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setAuditLogs((prev) => [`[${time}] ${entry}`, ...prev].slice(0, 30));
  };

  const liveLoggedStaff = useMemo(
    () => staff.find((s) => s.id === loggedStaffId && s.active) || null,
    [staff, loggedStaffId]
  );

  const isMenuItemInStock = (m: SimMenuItem) => {
    if (!m.requiresStockName) return true;
    const found = stock.find((s) => s.name === m.requiresStockName);
    return Boolean(found && found.inStock);
  };

  const availableMenu = useMemo(
    () => INITIAL_MENU.filter((m) => isMenuItemInStock(m)),
    [stock]
  );

  const openOrders = useMemo(() => orders.filter((o) => !o.paid), [orders]);

  const tablesSummary = useMemo(() => {
    const map: Record<string, { table: string; items: SimOrderItem[]; subtotal: number; waiter: string }> = {};
    openOrders.forEach((o) => {
      if (!map[o.table]) {
        map[o.table] = { table: o.table, items: [], subtotal: 0, waiter: o.waiterName };
      }
      map[o.table].items.push(o);
      map[o.table].subtotal += o.qty * o.unitPrice;
    });
    return Object.values(map);
  }, [openOrders]);

  const activeCashierTab =
    tablesSummary.find((t) => t.table === selectedTable) || tablesSummary[0] || null;

  const cashierCalc = useMemo(() => {
    const subtotal = activeCashierTab?.subtotal || 0;
    const couvert =
      couvertEnabled && (couvertMode === 'mandatory' || cashierIncludeCouvert) ? couvertPrice : 0;
    const tip = cashierIncludeTip
      ? cashierTipMode === 'fixed'
        ? Math.max(0, Number(cashierTipFixed.replace(',', '.')) || 0)
        : Math.round(subtotal * (Math.max(0, cashierTipPct) / 100) * 100) / 100
      : 0;
    const discount = cashierDiscountUnlocked
      ? Math.min(subtotal + couvert + tip, Math.max(0, Number(cashierDiscountVal.replace(',', '.')) || 0))
      : 0;
    const total = Math.max(0, Math.round((subtotal + couvert + tip - discount) * 100) / 100);
    return { subtotal, couvert, tip, discount, total };
  }, [
    activeCashierTab,
    couvertEnabled,
    couvertMode,
    cashierIncludeCouvert,
    couvertPrice,
    cashierIncludeTip,
    cashierTipMode,
    cashierTipFixed,
    cashierTipPct,
    cashierDiscountUnlocked,
    cashierDiscountVal,
  ]);

  // Cliente da Mesa 04 no simulador
  const mesa04Orders = useMemo(
    () => openOrders.filter((o) => o.table === 'Mesa 04'),
    [openOrders]
  );
  const mesa04Subtotal = mesa04Orders.reduce((acc, o) => acc + o.qty * o.unitPrice, 0);
  const mesa04Couvert =
    couvertEnabled && (couvertMode === 'mandatory' || custIncludeCouvert) ? couvertPrice : 0;
  const mesa04Tip = custIncludeTip
    ? custTipMode === 'fixed'
      ? Math.max(0, Number(custTipFixed.replace(',', '.')) || 0)
      : Math.round(mesa04Subtotal * (Math.max(0, custTipPct) / 100) * 100) / 100
    : 0;
  const mesa04Total = Math.round((mesa04Subtotal + mesa04Couvert + mesa04Tip) * 100) / 100;

  // Ações rápidas de simulação
  const handleAddRandomOrder = (count = 1) => {
    const tables = ['Mesa 02', 'Mesa 04', 'Mesa 07', 'Mesa 11'];
    const clients = ['Mariana', 'Rafael', 'Camila', 'Thiago', 'Pedro', 'Juliana'];
    const pool = availableMenu.length > 0 ? availableMenu : INITIAL_MENU;
    const added: SimOrderItem[] = [];
    for (let i = 0; i < count; i++) {
      const m = pool[Math.floor(Math.random() * pool.length)];
      const tb = tables[Math.floor(Math.random() * tables.length)];
      const cl = clients[Math.floor(Math.random() * clients.length)];
      added.push({
        id: 'sim_o_' + Date.now() + '_' + i,
        table: tb,
        clientName: cl,
        waiterName: staff.find((s) => s.active && s.roles.includes('garcom'))?.name || 'Lucas Mendes',
        menuItemId: m.id,
        name: m.name,
        qty: 1,
        unitPrice: m.price,
        status: 'pending',
        paid: false,
        createdAt: new Date().toISOString(),
      });
    }
    setOrders((prev) => [...added, ...prev]);
    pushAudit(`+${count} pedido(s) fictício(s) gerado(s) para demonstração.`);
    onToast(`🧪 +${count} pedido(s) simulado(s) lançado(s)!`);
  };

  const handleToggleStockItem = (id: string) => {
    setStock((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const next = !s.inStock;
        pushAudit(
          `Estoque fictício: ${s.name} marcado como ${next ? 'DISPONÍVEL' : 'EM FALTA (saiu do cardápio, mas permanece nas comandas já pedidas)'}.`
        );
        return { ...s, inStock: next };
      })
    );
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffUser.trim() || newStaffRoles.length === 0) {
      onToast('Preencha nome, login e pelo menos 1 função.');
      return;
    }
    const created: SimStaff = {
      id: 'st_' + Date.now(),
      name: newStaffName.trim(),
      username: newStaffUser.trim().toLowerCase(),
      password: newStaffPass.trim() || '123',
      roles: [...newStaffRoles],
      active: true,
    };
    setStaff((prev) => [...prev, created]);
    setNewStaffName('');
    setNewStaffUser('');
    setNewStaffPass('123');
    setNewStaffRoles(['garcom']);
    pushAudit(`Funcionário fictício "${created.name}" criado (${created.roles.join(', ')}).`);
    onToast(`👤 ${created.name} adicionado à equipe fictícia!`);
  };

  const handleToggleStaffRole = (staffId: string, roleKey: StaffRoleKey) => {
    setStaff((prev) =>
      prev.map((s) => {
        if (s.id !== staffId) return s;
        const has = s.roles.includes(roleKey);
        const nextRoles = has ? s.roles.filter((r) => r !== roleKey) : [...s.roles, roleKey];
        if (nextRoles.length === 0) {
          onToast('Mantenha pelo menos 1 função marcada.');
          return s;
        }
        pushAudit(`Função atualizada em tempo real para ${s.name}: ${nextRoles.join(', ')}.`);
        return { ...s, roles: nextRoles };
      })
    );
  };

  const handleCloseSimulatedTable = () => {
    if (!activeCashierTab) return;
    const newSale: SimSale = {
      id: 'sim_sale_' + Date.now(),
      table: activeCashierTab.table,
      subtotal: cashierCalc.subtotal,
      couvert: cashierCalc.couvert,
      serviceFee: cashierCalc.tip,
      discount: cashierCalc.discount,
      total: cashierCalc.total,
      waiterName: activeCashierTab.waiter,
      service100ToWaiter,
      approvedBy: cashierDiscountUnlocked ? 'Gerente ADM (PIN validado)' : undefined,
      paidAt: new Date().toISOString(),
    };
    setSales((prev) => [newSale, ...prev]);
    setOrders((prev) =>
      prev.map((o) => (o.table === activeCashierTab.table ? { ...o, paid: true, status: 'done' } : o))
    );
    setCashierDiscountUnlocked(false);
    setCashierDiscountVal('0');
    setCashierDiscountPin('');
    setProjectedTable(null);
    pushAudit(
      `Conta fechada (${activeCashierTab.table}): ${money(newSale.total)}${
        newSale.couvert > 0 ? ` | Couvert ${money(newSale.couvert)}` : ''
      }${newSale.serviceFee > 0 ? ` | Garçom ${money(newSale.serviceFee)}` : ''}${
        newSale.discount > 0 ? ` | Desc. -${money(newSale.discount)} (ADM)` : ''
      }`
    );
    onToast(`✅ ${activeCashierTab.table} fechada (${money(newSale.total)})! 2ª Tela voltou para a Logo.`);
  };

  const handleResetDemo = () => {
    setStaff(INITIAL_STAFF);
    setStock(INITIAL_STOCK);
    setOrders(INITIAL_ORDERS);
    setSales([]);
    setLoggedStaffId(null);
    setProjectedTable('Mesa 04');
    setCustRepeatAlert(null);
    setCashierDiscountUnlocked(false);
    setCashierDiscountVal('0');
    setAuditLogs(['Loja fictícia resetada para o estado inicial de demonstração.']);
    onToast('🔄 Loja fictícia restaurada!');
  };

  const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);
  const totalWaiterComm = sales.reduce(
    (acc, s) => acc + (s.service100ToWaiter ? s.serviceFee : 0),
    0
  );

  return (
    <div className="space-y-3">
      {/* CABEÇALHO EXCLUSIVO ADM */}
      <div className="panel !border-purple-400/50 bg-purple-500/10 space-y-2.5">
        <div className="row sp flex-wrap gap-2">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-purple-300">
              🧪 Ambiente Exclusivo do Painel ADM (Fora do Perfil Normal)
            </div>
            <h2 className="!m-0 mt-0.5 text-lg">Simulador Completo de Loja Fictícia</h2>
            <p className="mu text-xs !mt-0.5 !mb-0">
              Demonstre todo o sistema para clientes ao vivo — adicione/remova funcionários, teste
              login por função, Couvert, 100% Garçom, Senha ADM, Estoque e 2ª Tela sem afetar dados
              reais.
            </p>
          </div>
          <button type="button" className="b g sm" onClick={handleResetDemo}>
            🔄 Resetar Demo
          </button>
        </div>

        {/* BARRA MESTRE DE CONTROLE DA DEMONSTRAÇÃO */}
        <div className="rounded-xl p-2.5 bg-black/25 border border-white/10 space-y-2">
          <div className="text-[11px] font-bold text-[var(--ac)]">
            🎛️ Controle Mestre da Loja Fictícia ({storeName})
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className="b sm" onClick={() => handleAddRandomOrder(1)}>
              + 1 Pedido Fictício
            </button>
            <button type="button" className="b sm ok" onClick={() => handleAddRandomOrder(4)}>
              🔥 Hora de Pico (+4)
            </button>
            <button
              type="button"
              className={`b sm ${couvertEnabled ? '' : 'g'}`}
              onClick={() => setCouvertEnabled((v) => !v)}
            >
              🎵 Couvert: {couvertEnabled ? `${money(couvertPrice)} (${couvertMode === 'mandatory' ? 'Obrig.' : 'Opc.'})` : 'OFF'}
            </button>
            {couvertEnabled && (
              <button
                type="button"
                className="b g sm"
                onClick={() =>
                  setCouvertMode((m) => (m === 'mandatory' ? 'optional' : 'mandatory'))
                }
              >
                Alternar Obrig./Opc.
              </button>
            )}
            <button
              type="button"
              className={`b sm ${service100ToWaiter ? 'ok' : 'g'}`}
              onClick={() => setService100ToWaiter((v) => !v)}
            >
              💚 100% Garçom: {service100ToWaiter ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              className={`b sm ${staffLoginEnabled ? '' : 'g'}`}
              onClick={() => setStaffLoginEnabled((v) => !v)}
            >
              🔐 Login Equipe: {staffLoginEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--mut)] shrink-0">Nome loja:</span>
              <input
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="!py-1 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--mut)] shrink-0">Senha ADM:</span>
              <input
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value)}
                className="!py-1 text-xs !w-24 font-bold"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--mut)] shrink-0">Couvert R$:</span>
              <input
                type="number"
                min={0}
                value={couvertPrice}
                onChange={(e) => setCouvertPrice(Math.max(0, Number(e.target.value) || 0))}
                className="!py-1 text-xs !w-20"
              />
              <span className="text-[var(--mut)] shrink-0">Serv %:</span>
              <input
                type="number"
                min={0}
                max={30}
                value={defaultServicePct}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(30, Number(e.target.value) || 0));
                  setDefaultServicePct(v);
                  setCashierTipPct(v);
                  setCustTipPct(v);
                }}
                className="!py-1 text-xs !w-16"
              />
            </div>
          </div>
        </div>

        {/* SELETOR DE PERSPECTIVA / TELA DO SIMULADOR */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'owner' as SimView, label: '👑 Dono & Equipe' },
            { id: 'staff_login' as SimView, label: '🔐 Login Funcionário' },
            { id: 'cashier' as SimView, label: '💳 Terminal Caixa' },
            { id: 'customer_menu' as SimView, label: '📱 Cardápio Cliente' },
            { id: 'second_screen' as SimView, label: '📺 2ª Tela / Logo' },
          ].map((v) => (
            <button
              key={v.id}
              type="button"
              className={`b sm ${simView === v.id ? '' : 'g'}`}
              onClick={() => setSimView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. VISÃO DONO: KPIs, MULTI-FUNÇÕES DA EQUIPE & ESTOQUE AO VIVO */}
      {simView === 'owner' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="panel !p-3">
              <div className="text-[11px] text-[var(--mut)]">Faturamento Simulado</div>
              <div className="text-lg font-black text-[var(--ok)]">{money(totalRevenue)}</div>
            </div>
            <div className="panel !p-3">
              <div className="text-[11px] text-[var(--mut)]">Comandas Abertas</div>
              <div className="text-lg font-black text-[var(--ac)]">{tablesSummary.length}</div>
            </div>
            <div className="panel !p-3">
              <div className="text-[11px] text-[var(--mut)]">Comissão 100% Garçons</div>
              <div className="text-lg font-black text-emerald-300">{money(totalWaiterComm)}</div>
            </div>
            <div className="panel !p-3">
              <div className="text-[11px] text-[var(--mut)]">Equipe Ativa</div>
              <div className="text-lg font-black">{staff.filter((s) => s.active).length}</div>
            </div>
          </div>

          {/* GERENCIAR FUNCIONÁRIOS FICTÍCIOS (MULTI-FUNÇÃO EM TEMPO REAL) */}
          <div className="panel space-y-2.5">
            <h3 className="!m-0">👥 Equipe Fictícia (Multi-Função em Tempo Real)</h3>
            <p className="mu text-xs !mt-0">
              Marque ou desmarque funções abaixo e vá em <b>🔐 Login Funcionário</b> para mostrar ao
              cliente como as telas do funcionário mudam na hora!
            </p>

            <div className="space-y-2">
              {staff.map((st) => (
                <div
                  key={st.id}
                  className="rounded-xl p-2.5 bg-[var(--bg2)] border border-[var(--bd)] space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-xs">
                      <b className="text-sm">{st.name}</b> · Login: <b>{st.username}</b> · Senha:{' '}
                      <b>{st.password}</b>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        className="b sm"
                        onClick={() => {
                          setLoggedStaffId(st.id);
                          setSimView('staff_login');
                          onToast(`Logado como ${st.name} no simulador!`);
                        }}
                      >
                        👤 Testar perfil
                      </button>
                      <button
                        type="button"
                        className="b g sm"
                        onClick={() =>
                          setStaff((prev) => prev.filter((x) => x.id !== st.id))
                        }
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {STAFF_ROLES.map((r) => {
                      const on = st.roles.includes(r.key);
                      return (
                        <button
                          key={r.key}
                          type="button"
                          className={`b sm !py-0.5 !px-2 !text-[11px] ${on ? '' : 'g opacity-70'}`}
                          onClick={() => handleToggleStaffRole(st.id, r.key)}
                        >
                          {on ? '✓ ' : '+ '}
                          {r.icon} {r.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={handleAddStaff}
              className="rounded-xl p-2.5 bg-white/5 border border-white/10 space-y-2"
            >
              <div className="text-xs font-bold">➕ Adicionar funcionário fictício</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="Nome (ex: Gabriel)"
                  className="!mt-0 text-xs"
                />
                <input
                  value={newStaffUser}
                  onChange={(e) => setNewStaffUser(e.target.value)}
                  placeholder="Login (ex: gabriel)"
                  className="!mt-0 text-xs"
                />
                <input
                  value={newStaffPass}
                  onChange={(e) => setNewStaffPass(e.target.value)}
                  placeholder="Senha (ex: 123)"
                  className="!mt-0 text-xs"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {STAFF_ROLES.map((r) => {
                  const on = newStaffRoles.includes(r.key);
                  return (
                    <button
                      key={r.key}
                      type="button"
                      className={`b sm !py-0.5 !px-2 !text-[11px] ${on ? '' : 'g'}`}
                      onClick={() =>
                        setNewStaffRoles((prev) =>
                          on ? prev.filter((x) => x !== r.key) : [...prev, r.key]
                        )
                      }
                    >
                      {on ? '✓ ' : '+ '}
                      {r.icon} {r.label}
                    </button>
                  );
                })}
              </div>
              <button type="submit" className="b ok sm">
                ➕ Criar funcionário fictício
              </button>
            </form>
          </div>

          {/* ESTOQUE FICTÍCIO (TESTAR SAÍDA AUTOMÁTICA DO CARDÁPIO) */}
          <div className="panel space-y-2">
            <h3 className="!m-0">🍾 Estoque Fictício (Teste Em Falta → Sai do Cardápio)</h3>
            <p className="mu text-xs !mt-0">
              Marque <b>Gin</b> como <b>Falta</b> e depois abra <b>📱 Cardápio Cliente</b>: o Gin
              Tônica sai do cardápio na hora, mas continua na comanda da Mesa 04 e mostra alerta ao
              clicar em <b>Pedir novamente</b>!
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {stock.map((sk) => (
                <div
                  key={sk.id}
                  className="rounded-xl px-3 py-2 bg-[var(--bg2)] border border-[var(--bd)] flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <b>{sk.name}</b>
                    <div className="text-[11px] text-[var(--mut)]">
                      {sk.unit} · {money(sk.cost)}/{sk.costBasis}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`chip ${sk.inStock ? 'st1' : 'st0'}`}
                    onClick={() => handleToggleStockItem(sk.id)}
                  >
                    {sk.inStock ? 'OK' : 'Em Falta'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* LOG DA SIMULAÇÃO */}
          <div className="panel space-y-1.5">
            <div className="text-xs font-bold">🕵️ Log de Auditoria da Simulação</div>
            <div className="space-y-1 max-h-40 overflow-y-auto text-[11px] text-[var(--mut)]">
              {auditLogs.map((l, idx) => (
                <div key={idx} className="rounded-lg bg-white/5 px-2.5 py-1">
                  {l}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. TESTE DE LOGIN DO FUNCIONÁRIO (RESTRIÇÃO REAL POR FUNÇÕES) */}
      {simView === 'staff_login' && (
        <div className="panel space-y-3">
          {!staffLoginEnabled ? (
            <div className="text-center py-6 space-y-2">
              <div className="text-2xl">🔓</div>
              <p className="text-sm font-bold">Sistema de Login de Funcionários está DESATIVADO</p>
              <p className="mu text-xs">
                Ative o botão <b>🔐 Login Equipe: ON</b> na barra acima para testar o bloqueio por
                função.
              </p>
            </div>
          ) : !liveLoggedStaff ? (
            <div className="max-w-md mx-auto space-y-2.5">
              <h3 className="!m-0">🔐 Login do Funcionário — {storeName}</h3>
              <p className="mu text-xs !mt-0">
                Entre com um login abaixo ou toque em um atalho rápido para demonstrar as telas
                restritas de cada cargo.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {staff.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    className="b g sm !text-[11px]"
                    onClick={() => {
                      setLoginUser(st.username);
                      setLoginPass(st.password);
                      setLoginErr('');
                    }}
                  >
                    ⚡ {st.name} ({st.roles.join('+')})
                  </button>
                ))}
              </div>
              <input
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                placeholder="Usuário (ex: lucas, carla, bruno)"
              />
              <input
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="Senha (ex: 123)"
              />
              {loginErr && <p className="err">{loginErr}</p>}
              <button
                type="button"
                className="b ok full"
                onClick={() => {
                  const found = staff.find(
                    (s) =>
                      s.active &&
                      s.username.toLowerCase() === loginUser.trim().toLowerCase() &&
                      s.password === loginPass.trim()
                  );
                  if (!found) {
                    setLoginErr('Login ou senha fictícia inválidos.');
                    return;
                  }
                  setLoggedStaffId(found.id);
                  setLoginErr('');
                  pushAudit(`Login simulado: ${found.name} entrou (${found.roles.join(', ')}).`);
                }}
              >
                🔓 Entrar como Funcionário
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="row sp flex-wrap gap-2 pb-2 border-b border-white/10">
                <div>
                  <div className="text-sm font-extrabold text-[var(--ac)]">
                    👤 Logado como: {liveLoggedStaff.name}
                  </div>
                  <div className="text-xs text-[var(--mut)]">
                    Telas liberadas agora (atualiza em tempo real):{' '}
                    <b>
                      {liveLoggedStaff.roles
                        .map((rk) => STAFF_ROLES.find((r) => r.key === rk)?.label || rk)
                        .join(' + ')}
                    </b>
                  </div>
                </div>
                <button
                  type="button"
                  className="b g sm"
                  onClick={() => setLoggedStaffId(null)}
                >
                  🔄 Trocar funcionário
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {liveLoggedStaff.roles.map((rk) => {
                  const meta = STAFF_ROLES.find((r) => r.key === rk);
                  return (
                    <div
                      key={rk}
                      className="rounded-xl p-3 bg-[var(--bg2)] border border-[var(--ac)]/40 space-y-1.5"
                    >
                      <div className="text-sm font-extrabold">
                        {meta?.icon} Tela Liberada: {meta?.label}
                      </div>
                      <p className="mu text-xs !m-0">{meta?.description}</p>
                      {rk === 'caixa' && (
                        <button
                          type="button"
                          className="b sm mt-1"
                          onClick={() => setSimView('cashier')}
                        >
                          💳 Ir para Terminal do Caixa
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mu text-[11px]">
                🔒 Todas as demais telas da loja ficam ocultas para {liveLoggedStaff.name}. Volte em{' '}
                <b>👑 Dono & Equipe</b> e altere as funções dele para ver esta tela mudar ao vivo!
              </p>
            </div>
          )}
        </div>
      )}

      {/* 3. TERMINAL DO CAIXA FICTÍCIO */}
      {simView === 'cashier' && (
        <div className="panel space-y-3">
          <div className="row sp flex-wrap gap-2">
            <div>
              <h3 className="!m-0">💳 Terminal Exclusivo do Caixa (Demo)</h3>
              <p className="mu text-xs !mt-0">
                Couvert + Comissão Garçom (% ou R$ Fixo) + Desconto protegido pela Senha ADM (
                <b>{managerPin}</b>) + 2ª Tela.
              </p>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {tablesSummary.map((tb) => (
                <button
                  key={tb.table}
                  type="button"
                  className={`b sm ${activeCashierTab?.table === tb.table ? '' : 'g'}`}
                  onClick={() => {
                    setSelectedTable(tb.table);
                    setProjectedTable(tb.table);
                  }}
                >
                  🪑 {tb.table} ({money(tb.subtotal)})
                </button>
              ))}
            </div>
          </div>

          {!activeCashierTab ? (
            <p className="mu text-xs">
              Todas as mesas foram fechadas! Clique em <b>+ 1 Pedido Fictício</b> acima para abrir
              uma nova comanda.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl p-3 bg-[var(--bg2)] border border-[var(--bd)] space-y-1.5">
                <div className="row sp">
                  <b className="text-sm">🪑 {activeCashierTab.table}</b>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className="b g sm"
                      onClick={() => {
                        setOrders((prev) => [
                          ...prev,
                          {
                            id: 'sim_extra_' + Date.now(),
                            table: activeCashierTab.table,
                            clientName: 'Balcão',
                            waiterName: activeCashierTab.waiter,
                            menuItemId: 'extra',
                            name: '➕ Dose extra Whisky',
                            qty: 1,
                            unitPrice: 16,
                            status: 'done',
                            paid: false,
                            createdAt: new Date().toISOString(),
                          },
                        ]);
                        onToast('➕ Dose extra adicionada na comanda!');
                      }}
                    >
                      ➕ Dose Extra (+R$ 16)
                    </button>
                    <button
                      type="button"
                      className="b sm"
                      onClick={() => {
                        setProjectedTable(activeCashierTab.table);
                        setSimView('second_screen');
                      }}
                    >
                      📺 Ver na 2ª Tela
                    </button>
                  </div>
                </div>
                {activeCashierTab.items.map((it) => (
                  <div key={it.id} className="flex justify-between text-xs py-1 border-t border-white/5">
                    <span>
                      <b>{it.qty}×</b> {it.name} <span className="mu">({it.clientName})</span>
                    </span>
                    <b>{money(it.qty * it.unitPrice)}</b>
                  </div>
                ))}
              </div>

              {/* COUVERT + GARÇOM + DESCONTO COM SENHA ADM */}
              <div className="rounded-xl p-3 bg-white/5 border border-white/10 space-y-2.5 text-xs">
                {couvertEnabled && (
                  <div className="row sp">
                    <label className="!m-0 flex items-center gap-2 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        className="!w-4 !h-4"
                        checked={couvertMode === 'mandatory' ? true : cashierIncludeCouvert}
                        disabled={couvertMode === 'mandatory' && !cashierDiscountUnlocked}
                        onChange={(e) => setCashierIncludeCouvert(e.target.checked)}
                      />
                      🎵 Couvert artístico ({couvertMode === 'mandatory' ? 'Obrigatório' : 'Opcional'})
                    </label>
                    <b>{money(cashierCalc.couvert)}</b>
                  </div>
                )}

                <div className="pt-2 border-t border-white/10 space-y-1.5">
                  <div className="row sp flex-wrap gap-2">
                    <label className="!m-0 flex items-center gap-2 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        className="!w-4 !h-4"
                        checked={cashierIncludeTip}
                        onChange={(e) => setCashierIncludeTip(e.target.checked)}
                      />
                      🙋 Comissão do garçom ({activeCashierTab.waiter})
                    </label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className={`b sm !py-0.5 !px-2 !text-[11px] ${cashierTipMode === 'pct' ? '' : 'g'}`}
                        onClick={() => setCashierTipMode('pct')}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        className={`b sm !py-0.5 !px-2 !text-[11px] ${cashierTipMode === 'fixed' ? '' : 'g'}`}
                        onClick={() => setCashierTipMode('fixed')}
                      >
                        R$ Fixo
                      </button>
                    </div>
                  </div>
                  {cashierIncludeTip &&
                    (cashierTipMode === 'pct' ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[10, 12, 15, 20].map((p) => (
                          <button
                            key={p}
                            type="button"
                            className={`b sm !py-0.5 !px-2 !text-[11px] ${cashierTipPct === p ? '' : 'g'}`}
                            onClick={() => setCashierTipPct(p)}
                          >
                            {p}%
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input
                        value={cashierTipFixed}
                        onChange={(e) => setCashierTipFixed(e.target.value)}
                        placeholder="Valor fixo (R$)"
                        className="!w-32 !py-1 text-xs"
                      />
                    ))}
                  {service100ToWaiter && cashierIncludeTip && (
                    <div className="text-[11px] font-bold text-emerald-300">
                      💚 100% vai diretamente para a comissão de {activeCashierTab.waiter}!
                    </div>
                  )}
                </div>

                {/* DESCONTO PROTEGIDO PELA SENHA ADM */}
                <div className="pt-2 border-t border-white/10 space-y-1.5">
                  <div className="font-semibold">
                    🏷️ Desconto{' '}
                    {cashierDiscountUnlocked ? (
                      <span className="text-emerald-300">(🔓 Liberado com Senha ADM)</span>
                    ) : (
                      <span className="text-amber-300">(🔐 Senha ADM: {managerPin})</span>
                    )}
                  </div>
                  {!cashierDiscountUnlocked ? (
                    <div className="flex gap-1.5">
                      <input
                        type="password"
                        value={cashierDiscountPin}
                        onChange={(e) => setCashierDiscountPin(e.target.value)}
                        placeholder={`Digite ${managerPin} para liberar desconto`}
                        className="!py-1 text-xs flex-1"
                      />
                      <button
                        type="button"
                        className="b sm"
                        onClick={() => {
                          if (cashierDiscountPin.trim() === managerPin.trim()) {
                            setCashierDiscountUnlocked(true);
                            onToast('🔓 Desconto liberado pelo Gerente/Dono!');
                          } else {
                            onToast('❌ Senha ADM incorreta!');
                          }
                        }}
                      >
                        🔓 Liberar
                      </button>
                    </div>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      value={cashierDiscountVal}
                      onChange={(e) => setCashierDiscountVal(e.target.value)}
                      placeholder="Valor do desconto (R$)"
                      className="!w-36 !py-1 text-xs"
                    />
                  )}
                </div>
              </div>

              <div className="pay space-y-1 text-xs">
                <div className="row sp">
                  <span>Subtotal</span>
                  <b>{money(cashierCalc.subtotal)}</b>
                </div>
                {cashierCalc.couvert > 0 && (
                  <div className="row sp">
                    <span>🎵 Couvert</span>
                    <b>+ {money(cashierCalc.couvert)}</b>
                  </div>
                )}
                {cashierCalc.tip > 0 && (
                  <div className="row sp">
                    <span>🙋 Garçom</span>
                    <b>+ {money(cashierCalc.tip)}</b>
                  </div>
                )}
                {cashierCalc.discount > 0 && (
                  <div className="row sp text-red-300">
                    <span>🏷️ Desconto (ADM)</span>
                    <b>- {money(cashierCalc.discount)}</b>
                  </div>
                )}
                <div className="row sp pt-2 border-t border-white/10 text-base">
                  <b>Total a Cobrar</b>
                  <span className="tt">{money(cashierCalc.total)}</span>
                </div>
              </div>

              <button
                type="button"
                className="b ok full"
                onClick={handleCloseSimulatedTable}
              >
                ✅ Confirmar Pagamento ({money(cashierCalc.total)}) & Liberar Mesa
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. CARDÁPIO DO CLIENTE FICTÍCIO (COUVERT + 100% GARÇOM + ALERTA ESTOQUE NO REPETIR) */}
      {simView === 'customer_menu' && (
        <div className="panel space-y-3">
          <div className="row sp flex-wrap gap-2">
            <div>
              <h3 className="!m-0">📱 Visão do Cliente — {storeName} (Mesa 04)</h3>
              <p className="mu text-xs !mt-0">
                Mostra ao vivo o aviso de Couvert, cardápio filtrado pelo estoque e comanda com
                opcional do garçom.
              </p>
            </div>
          </div>

          {couvertEnabled && (
            <div className="rounded-xl p-2.5 bg-purple-500/15 border border-purple-400/45 text-xs flex items-center justify-between gap-2 flex-wrap">
              <div>
                <b>🎵 Aviso da Casa: Couvert artístico — {money(couvertPrice)}</b>
                <div className="mu">
                  {couvertMode === 'mandatory'
                    ? 'Cobrança obrigatória incluída automaticamente na comanda.'
                    : 'Cobrança opcional — você decide na sua comanda.'}
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-300">
                {couvertMode === 'mandatory' ? 'Obrigatório' : 'Opcional'}
              </span>
            </div>
          )}

          <div>
            <div className="text-xs font-bold mb-1.5">
              Cardápio Disponível Agora ({availableMenu.length}/{INITIAL_MENU.length} itens — itens
              em falta saem automaticamente)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {availableMenu.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl px-3 py-2 bg-[var(--bg2)] border border-[var(--bd)] flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <b>{m.name}</b>
                    <div className="mu">{m.category} · {money(m.price)}</div>
                  </div>
                  <button
                    type="button"
                    className="b sm"
                    onClick={() => {
                      setOrders((prev) => [
                        ...prev,
                        {
                          id: 'sim_cli_' + Date.now(),
                          table: 'Mesa 04',
                          clientName: 'Mariana',
                          waiterName: 'Lucas Mendes',
                          menuItemId: m.id,
                          name: m.name,
                          qty: 1,
                          unitPrice: m.price,
                          status: 'pending',
                          paid: false,
                          createdAt: new Date().toISOString(),
                        },
                      ]);
                      onToast(`🍹 ${m.name} pedido na Mesa 04!`);
                    }}
                  >
                    + Pedir
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* COMANDA DO CLIENTE (MESA 04) */}
          <div className="rounded-xl p-3 bg-white/5 border border-white/10 space-y-2.5 text-xs">
            <div className="font-bold text-sm">🧾 Comanda da Mesa 04</div>
            {custRepeatAlert && (
              <div className="rounded-lg p-2.5 bg-amber-500/20 border border-amber-400/50 text-amber-200 font-semibold">
                {custRepeatAlert}
              </div>
            )}
            {mesa04Orders.map((o) => {
              const menuMatch = availableMenu.find((m) => m.id === o.menuItemId);
              return (
                <div key={o.id} className="flex items-center justify-between gap-2 py-1 border-b border-white/5">
                  <div>
                    <b>{o.qty}× {o.name}</b>
                    {!menuMatch && (
                      <span className="ml-1.5 text-[10px] text-amber-300 font-bold">
                        (⚠️ Fora de estoque agora)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <b>{money(o.qty * o.unitPrice)}</b>
                    <button
                      type="button"
                      className="b g sm !py-0.5 !px-2 !text-[11px]"
                      onClick={() => {
                        if (!menuMatch) {
                          const msg = `⚠️ "${o.name}" está fora de estoque no momento e não pode ser pedido novamente. O pedido já feito permanece na comanda.`;
                          setCustRepeatAlert(msg);
                          onToast(`⚠️ ${o.name} está fora de estoque!`);
                          return;
                        }
                        setCustRepeatAlert(null);
                        setOrders((prev) => [
                          ...prev,
                          {
                            ...o,
                            id: 'sim_rep_' + Date.now(),
                            qty: 1,
                            status: 'pending',
                            createdAt: new Date().toISOString(),
                          },
                        ]);
                        onToast(`✓ Mais 1× ${o.name} pedido!`);
                      }}
                    >
                      Pedir novamente
                    </button>
                  </div>
                </div>
              );
            })}

            {couvertEnabled && (
              <div className="row sp">
                <label className="!m-0 flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    className="!w-4 !h-4"
                    checked={couvertMode === 'mandatory' ? true : custIncludeCouvert}
                    disabled={couvertMode === 'mandatory'}
                    onChange={(e) => setCustIncludeCouvert(e.target.checked)}
                  />
                  🎵 Couvert ({couvertMode === 'mandatory' ? 'Obrigatório' : 'Opcional'})
                </label>
                <b>{money(mesa04Couvert)}</b>
              </div>
            )}

            <div className="space-y-1.5 pt-1 border-t border-white/10">
              <div className="row sp">
                <label className="!m-0 flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    className="!w-4 !h-4"
                    checked={custIncludeTip}
                    onChange={(e) => setCustIncludeTip(e.target.checked)}
                  />
                  🙋 Opcional do garçom (
                  {custTipMode === 'fixed' ? 'R$ fixo' : `${custTipPct}%`})
                </label>
                <b>{money(mesa04Tip)}</b>
              </div>
              {custIncludeTip && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[10, 12, 15, 20].map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`b sm !py-0.5 !px-2 !text-[11px] ${
                        custTipMode === 'pct' && custTipPct === p ? '' : 'g'
                      }`}
                      onClick={() => {
                        setCustTipMode('pct');
                        setCustTipPct(p);
                      }}
                    >
                      {p}%
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`b sm !py-0.5 !px-2 !text-[11px] ${custTipMode === 'fixed' ? '' : 'g'}`}
                    onClick={() => setCustTipMode('fixed')}
                  >
                    R$ Fixo
                  </button>
                  {custTipMode === 'fixed' && (
                    <input
                      value={custTipFixed}
                      onChange={(e) => setCustTipFixed(e.target.value)}
                      placeholder="Ex: 20"
                      className="!w-20 !py-0.5 text-xs"
                    />
                  )}
                </div>
              )}
              {service100ToWaiter && (
                <div className="text-[11px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-400/35 rounded-lg px-2 py-1">
                  💚 100% deste valor vai diretamente para o garçom!
                </div>
              )}
            </div>

            <div className="row sp pt-2 border-t border-white/10 text-sm">
              <b>Total estimado</b>
              <span className="tt">{money(mesa04Total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. 2ª TELA DO CLIENTE (RESUMO + PIX QR / LOGO OCIOSA) */}
      {simView === 'second_screen' && (
        <div className="panel space-y-3">
          <div className="row sp flex-wrap gap-2">
            <h3 className="!m-0">📺 Prévia da 2ª Tela do Cliente</h3>
            <div className="flex gap-1.5">
              <button
                type="button"
                className={`b sm ${projectedTable ? '' : 'g'}`}
                onClick={() => setProjectedTable(activeCashierTab?.table || 'Mesa 04')}
              >
                💳 Projetar Conta
              </button>
              <button
                type="button"
                className={`b sm ${!projectedTable ? '' : 'g'}`}
                onClick={() => setProjectedTable(null)}
              >
                🖼️ Modo Ocioso (Logo)
              </button>
            </div>
          </div>

          {!projectedTable || !activeCashierTab ? (
            <div className="rounded-2xl p-10 bg-gradient-to-br from-[#141218] to-[#0b0a0d] border border-[var(--ac)]/40 text-center space-y-2">
              <div className="text-5xl">🍸</div>
              <div className="text-2xl font-black text-[var(--ac)]">{storeName}</div>
              <div className="text-xs text-white/70">
                Quando o caixa não está fechando uma conta, a 2ª tela exibe a logo da empresa!
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-5 bg-[#121017] border border-[var(--ac)]/50 grid grid-cols-1 sm:grid-cols-12 gap-4 text-white">
              <div className="sm:col-span-7 space-y-2">
                <div className="text-xs uppercase tracking-wider text-white/60">Resumo da Conta</div>
                <div className="text-xl font-black text-[var(--ac)]">🪑 {activeCashierTab.table}</div>
                <div className="divide-y divide-white/10 text-xs">
                  {activeCashierTab.items.map((it) => (
                    <div key={it.id} className="py-1.5 flex justify-between">
                      <span>{it.qty}× {it.name}</span>
                      <b>{money(it.qty * it.unitPrice)}</b>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-white/10 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <b>{money(cashierCalc.subtotal)}</b>
                  </div>
                  {cashierCalc.couvert > 0 && (
                    <div className="flex justify-between">
                      <span>🎵 Couvert artístico</span>
                      <b>+ {money(cashierCalc.couvert)}</b>
                    </div>
                  )}
                  {cashierCalc.tip > 0 && (
                    <div className="flex justify-between">
                      <span>🙋 Garçom</span>
                      <b>+ {money(cashierCalc.tip)}</b>
                    </div>
                  )}
                  {service100ToWaiter && cashierCalc.tip > 0 && (
                    <div className="text-[11px] font-bold text-emerald-300">
                      💚 100% repassado diretamente ao garçom
                    </div>
                  )}
                </div>
              </div>
              <div className="sm:col-span-5 rounded-xl p-4 bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center space-y-2">
                <div className="text-[11px] uppercase tracking-wider text-white/60">Total a Pagar</div>
                <div className="text-3xl font-black text-[var(--ac)]">{money(cashierCalc.total)}</div>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                    `MEUBAR-DEMO-PIX-${cashierCalc.total.toFixed(2)}`
                  )}`}
                  alt="QR Pix Demo"
                  className="rounded-xl bg-white p-2 w-36 h-36"
                />
                <div className="text-[11px] text-white/70">Aponte a câmera para pagar no Pix</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
