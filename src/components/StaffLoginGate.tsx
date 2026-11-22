import React, { useState } from 'react';
import { getBarOpsData, logBarAudit, saveBarOpsData } from '../lib/opsUtils';
import { checkActionCooldown } from '../lib/security';
import {
  authenticateStaffAccount,
  hasStoreManagerPin,
  hashStoreSecret,
  normalizeStaffUsername,
  STAFF_ROLE_BY_KEY,
  STAFF_ROLES,
  verifyStoreManagerPin,
} from '../lib/staffAuth';
import type { Bar, StaffAccount, StaffRoleKey } from '../types/meubar';

/**
 * Tela de login de funcionários da loja (ativada quando o dono liga o sistema de login por cargo).
 * Protege o painel completo com a Senha ADM da loja (quando configurada) para que
 * tablets compartilhados no salão/caixa não permitam acesso indevido ao financeiro.
 */
export const StaffLoginGate: React.FC<{
  bar: Bar;
  isAccountOwnerOrManager: boolean;
  onStaffAuthenticated: (staff: StaffAccount) => void;
  onEnterOwnerPanel: () => void;
  onSwitchBar?: () => void;
  onToast?: (msg: string) => void;
}> = ({
  bar,
  isAccountOwnerOrManager,
  onStaffAuthenticated,
  onEnterOwnerPanel,
  onSwitchBar,
  onToast,
}) => {
  const ops = getBarOpsData(bar);
  const accounts = (ops.staff_accounts || []).filter((a) => a.active);
  const managerPinConfigured = hasStoreManagerPin(bar);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const [showAdminUnlock, setShowAdminUnlock] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminErr, setAdminErr] = useState('');

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const cd = checkActionCooldown('staff_login_submit', 500);
    if (!cd.allowed) {
      setErr(`Aguarde ${cd.waitSeconds}s antes de tentar novamente.`);
      return;
    }
    setBusy(true);
    const res = await authenticateStaffAccount(bar, username, password);
    setBusy(false);
    if (!res.ok || !res.staff) {
      setErr(res.error || 'Usuário ou senha inválidos.');
      return;
    }
    onToast?.(`Bem-vindo(a), ${res.staff.name}!`);
    onStaffAuthenticated(res.staff);
  };

  const handleOwnerAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminErr('');
    if (!managerPinConfigured) {
      onEnterOwnerPanel();
      return;
    }
    setBusy(true);
    const res = await verifyStoreManagerPin(bar, adminPin);
    setBusy(false);
    if (!res.ok) {
      setAdminErr(res.reason || 'Senha ADM incorreta.');
      return;
    }
    setAdminPin('');
    onEnterOwnerPanel();
  };

  return (
    <div className="w narrow min-h-[82dvh] flex flex-col justify-center py-6">
      <div className="panel space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            {bar.logo_url ? (
              <img
                src={bar.logo_url}
                alt={bar.name}
                className="w-12 h-12 rounded-xl object-cover border border-[var(--bd)] shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-[var(--s2)] border border-[var(--bd)] flex items-center justify-center text-2xl shrink-0">
                🍸
              </div>
            )}
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ac)]">
                Acesso por Funcionário
              </div>
              <h1 className="!m-0 text-xl truncate">{bar.name}</h1>
              <p className="mu text-xs !m-0">
                Entre com seu login e senha para abrir apenas as telas da sua função.
              </p>
            </div>
          </div>
          {onSwitchBar && (
            <button type="button" className="b g sm" onClick={onSwitchBar}>
              🏠 Trocar bar
            </button>
          )}
        </div>

        <form className="space-y-3" onSubmit={(e) => void handleStaffSubmit(e)}>
          <div>
            <label className="!mt-0">Login do funcionário</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ex: carlos, ana.caixa"
              autoComplete="username"
              maxLength={32}
            />
          </div>
          <div>
            <label className="!mt-0">Senha do funcionário</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              autoComplete="current-password"
              maxLength={40}
            />
          </div>

          {accounts.length > 0 && (
            <div className="space-y-1">
              <div className="text-[11px] text-[var(--mut)]">
                Atalho de login cadastrado ({accounts.length}):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {accounts.slice(0, 8).map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    className={`b sm !py-1 !px-2.5 !text-xs ${
                      normalizeStaffUsername(username) === acc.username ? '' : 'g'
                    }`}
                    onClick={() => setUsername(acc.username)}
                  >
                    👤 {acc.name} ({acc.roles.map((r) => STAFF_ROLE_BY_KEY[r]?.shortLabel || r).join(' + ')})
                  </button>
                ))}
              </div>
            </div>
          )}

          {err && <p className="err text-xs !m-0">{err}</p>}

          <button
            type="submit"
            className="b full !py-3"
            disabled={busy || !username.trim() || !password.trim()}
          >
            {busy ? 'Verificando…' : '🔓 Entrar no meu posto de trabalho'}
          </button>
        </form>

        {isAccountOwnerOrManager && (
          <div className="pt-3 border-t border-[var(--bd)] space-y-2.5">
            {!showAdminUnlock ? (
              <button
                type="button"
                className="b g full sm"
                onClick={() => {
                  if (!managerPinConfigured) {
                    onEnterOwnerPanel();
                  } else {
                    setShowAdminUnlock(true);
                  }
                }}
              >
                🛡️ Entrar como Dono / Gerente (Painel Completo)
              </button>
            ) : (
              <form className="space-y-2" onSubmit={(e) => void handleOwnerAccess(e)}>
                <div className="text-xs font-bold text-[var(--ac)]">
                  🛡️ Informe a Senha ADM da loja para abrir o painel completo:
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    placeholder="Senha de gerente / dono"
                    className="grow !mt-0"
                  />
                  <button type="submit" className="b ok sm shrink-0" disabled={busy}>
                    Liberar
                  </button>
                  <button
                    type="button"
                    className="b g sm shrink-0"
                    onClick={() => {
                      setShowAdminUnlock(false);
                      setAdminPin('');
                      setAdminErr('');
                    }}
                  >
                    Cancelar
                  </button>
                </div>
                {adminErr && <p className="err text-xs !m-0">{adminErr}</p>}
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Painel de gestão do Sistema de Login de Funcionários e Senha ADM da loja
 * (usado pelo Dono/Gerente em Gestão -> Configurações / Equipe).
 * Qualquer alteração nas funções de um funcionário é sincronizada em tempo real via Supabase.
 */
export const StaffAccountsManagerCard: React.FC<{
  bar: Bar;
  actorName: string;
  role: string | null;
  onBarUpdated: (updated: Bar) => void;
  onToast: (msg: string) => void;
}> = ({ bar, actorName, role, onBarUpdated, onToast }) => {
  const ops = getBarOpsData(bar);
  const accounts = ops.staff_accounts || [];
  const loginEnabled = Boolean(ops.staff_login_enabled);
  const pinConfigured = hasStoreManagerPin(bar);

  const [busy, setBusy] = useState(false);

  // Senha ADM da loja (gerente/dono)
  const [newManagerPin, setNewManagerPin] = useState('');
  const [savingPin, setSavingPin] = useState(false);

  // Novo funcionário
  const [staffName, setStaffName] = useState('');
  const [staffUser, setStaffUser] = useState('');
  const [staffPass, setStaffPass] = useState('');
  const [staffRoles, setStaffRoles] = useState<StaffRoleKey[]>(['garcom']);

  // Reset de senha por funcionário
  const [resetPassId, setResetPassId] = useState<string | null>(null);
  const [resetPassVal, setResetPassVal] = useState('');

  const toggleNewRole = (rk: StaffRoleKey) => {
    setStaffRoles((prev) =>
      prev.includes(rk) ? prev.filter((r) => r !== rk) : [...prev, rk]
    );
  };

  const handleToggleLoginSystem = async () => {
    const nextEnabled = !loginEnabled;
    if (nextEnabled && accounts.length === 0) {
      onToast('Cadastre pelo menos 1 funcionário abaixo antes de ativar o login da equipe.');
      return;
    }
    setBusy(true);
    const updated = await saveBarOpsData(
      bar,
      { staff_login_enabled: nextEnabled },
      onBarUpdated
    );
    setBusy(false);
    if (updated) {
      await logBarAudit(
        updated,
        nextEnabled ? 'Login de funcionários ativado' : 'Login de funcionários desativado',
        `Alterado por ${actorName}`,
        actorName,
        role || 'owner',
        onBarUpdated
      );
      onToast(
        nextEnabled
          ? '🔐 Sistema de login por funcionário ATIVADO! Ao abrir a loja será pedido usuário e senha.'
          : '🔓 Sistema de login por funcionário desativado.'
      );
    }
  };

  const handleSaveManagerPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newManagerPin.trim();
    if (clean.length < 4) {
      onToast('Defina uma senha ADM com pelo menos 4 caracteres ou números.');
      return;
    }
    setSavingPin(true);
    const { hash, salt } = await hashStoreSecret(clean);
    const updated = await saveBarOpsData(
      bar,
      { manager_pin_hash: hash, manager_pin_salt: salt },
      onBarUpdated
    );
    setSavingPin(false);
    if (updated) {
      setNewManagerPin('');
      await logBarAudit(
        updated,
        'Senha ADM da loja atualizada',
        'Senha de gerente/dono definida para descontos e edição no caixa.',
        actorName,
        role || 'owner',
        onBarUpdated
      );
      onToast('🛡️ Senha ADM (Gerente/Dono) salva com criptografia!');
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = staffName.trim();
    const cleanUser = normalizeStaffUsername(staffUser || cleanName);
    const cleanPass = staffPass.trim();

    if (cleanName.length < 2) {
      onToast('Informe o nome do funcionário.');
      return;
    }
    if (cleanUser.length < 2) {
      onToast('Informe um login válido (apenas letras/números).');
      return;
    }
    if (cleanPass.length < 4) {
      onToast('A senha precisa ter pelo menos 4 caracteres.');
      return;
    }
    if (staffRoles.length === 0) {
      onToast('Selecione pelo menos uma função para este funcionário.');
      return;
    }
    if (accounts.some((a) => normalizeStaffUsername(a.username) === cleanUser)) {
      onToast(`Já existe um funcionário com o login "${cleanUser}".`);
      return;
    }

    setBusy(true);
    const { hash, salt } = await hashStoreSecret(cleanPass);
    const entry: StaffAccount = {
      id: 'stf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      name: cleanName,
      username: cleanUser,
      password_hash: hash,
      password_salt: salt,
      roles: [...staffRoles],
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updated = await saveBarOpsData(
      bar,
      { staff_accounts: [...accounts, entry] },
      onBarUpdated
    );
    setBusy(false);
    if (updated) {
      setStaffName('');
      setStaffUser('');
      setStaffPass('');
      setStaffRoles(['garcom']);
      onToast(`✅ Funcionário ${entry.name} (@${entry.username}) cadastrado!`);
    }
  };

  const handleToggleExistingRole = async (acc: StaffAccount, rk: StaffRoleKey) => {
    const has = acc.roles.includes(rk);
    const nextRoles = has ? acc.roles.filter((r) => r !== rk) : [...acc.roles, rk];
    if (nextRoles.length === 0) {
      onToast('O funcionário precisa manter pelo menos 1 função ativa (ou desative o acesso).');
      return;
    }
    const nextList = accounts.map((a) =>
      a.id === acc.id
        ? { ...a, roles: nextRoles, updated_at: new Date().toISOString() }
        : a
    );
    const updated = await saveBarOpsData(bar, { staff_accounts: nextList }, onBarUpdated);
    if (updated) {
      onToast(
        `⚡ Funções de ${acc.name} atualizadas em tempo real: ${nextRoles
          .map((r) => STAFF_ROLE_BY_KEY[r]?.shortLabel || r)
          .join(' + ')}`
      );
    }
  };

  const handleToggleActive = async (acc: StaffAccount) => {
    const nextList = accounts.map((a) =>
      a.id === acc.id
        ? { ...a, active: !a.active, updated_at: new Date().toISOString() }
        : a
    );
    const updated = await saveBarOpsData(bar, { staff_accounts: nextList }, onBarUpdated);
    if (updated) {
      onToast(
        acc.active
          ? `🔒 Acesso de ${acc.name} desativado imediatamente.`
          : `✅ Acesso de ${acc.name} reativado.`
      );
    }
  };

  const handleResetPassword = async (acc: StaffAccount) => {
    if (resetPassVal.trim().length < 4) {
      onToast('A nova senha precisa ter pelo menos 4 caracteres.');
      return;
    }
    const { hash, salt } = await hashStoreSecret(resetPassVal.trim());
    const nextList = accounts.map((a) =>
      a.id === acc.id
        ? {
            ...a,
            password_hash: hash,
            password_salt: salt,
            updated_at: new Date().toISOString(),
          }
        : a
    );
    const updated = await saveBarOpsData(bar, { staff_accounts: nextList }, onBarUpdated);
    if (updated) {
      setResetPassId(null);
      setResetPassVal('');
      onToast(`🔑 Senha de ${acc.name} atualizada com sucesso.`);
    }
  };

  const handleRemoveStaff = async (acc: StaffAccount) => {
    const nextList = accounts.filter((a) => a.id !== acc.id);
    const updated = await saveBarOpsData(bar, { staff_accounts: nextList }, onBarUpdated);
    if (updated) {
      onToast(`Funcionário ${acc.name} removido.`);
    }
  };

  return (
    <div className="space-y-3">
      {/* 1. SENHA ADM DA LOJA (GERENTE / DONO) */}
      <form className="panel space-y-2.5" onSubmit={(e) => void handleSaveManagerPin(e)}>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <h3 className="!m-0">🛡️ Senha ADM da Loja (Gerente / Dono)</h3>
            <p className="mu text-xs !mt-0.5 !mb-0">
              Exigida no Caixa para liberar descontos/cortesias, editar ou cancelar itens de
              comandas no Terminal do Caixa e destravar o painel completo.
            </p>
          </div>
          <span
            className={`text-xs font-bold ${pinConfigured ? 'text-[var(--ok)]' : 'text-amber-300'}`}
          >
            {pinConfigured ? '✓ Configurada' : '⚠ Ainda não definida'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="password"
            value={newManagerPin}
            onChange={(e) => setNewManagerPin(e.target.value)}
            placeholder={
              pinConfigured
                ? 'Digite nova senha ADM para trocar (mín. 4 dígitos)'
                : 'Crie a senha de gerente/dono (ex: 4829)'
            }
            maxLength={32}
            className="grow !mt-0"
          />
          <button type="submit" className="b ok sm shrink-0" disabled={savingPin}>
            {savingPin ? 'Salvando…' : pinConfigured ? 'Atualizar Senha ADM' : 'Definir Senha ADM'}
          </button>
        </div>
      </form>

      {/* 2. SISTEMA DE LOGIN DE FUNCIONÁRIOS */}
      <div className="panel space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="!m-0">🔑 Sistema de Login por Funcionário (Telas por Função)</h3>
            <p className="mu text-xs !mt-0.5 !mb-0">
              Quando ativo, cada funcionário entra com seu login e senha e vê SOMENTE as telas das
              funções marcadas. Alterações feitas aqui atualizam o perfil dele em tempo real.
            </p>
          </div>
          <button
            type="button"
            className={`b sm ${loginEnabled ? 'ok' : 'g'}`}
            disabled={busy}
            onClick={() => void handleToggleLoginSystem()}
          >
            {loginEnabled ? '🟢 Sistema ATIVO (Desativar)' : '⚪ Sistema DESATIVADO (Ativar)'}
          </button>
        </div>

        {/* Formulário de novo funcionário */}
        <form
          className="rounded-xl p-3 bg-[var(--s2)] border border-[var(--bd)] space-y-2.5"
          onSubmit={(e) => void handleAddStaff(e)}
        >
          <div className="text-xs font-bold">➕ Cadastrar novo acesso de funcionário</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="!mt-0">Nome completo</label>
              <input
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Ex: Lucas Silva"
                maxLength={40}
              />
            </div>
            <div>
              <label className="!mt-0">Login de acesso</label>
              <input
                value={staffUser}
                onChange={(e) => setStaffUser(e.target.value)}
                placeholder="Ex: lucas.garcom"
                maxLength={32}
              />
            </div>
            <div>
              <label className="!mt-0">Senha inicial</label>
              <input
                type="password"
                value={staffPass}
                onChange={(e) => setStaffPass(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                maxLength={40}
              />
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold mb-1.5">
              Funções permitidas (pode selecionar mais de uma):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STAFF_ROLES.map((r) => {
                const on = staffRoles.includes(r.key);
                return (
                  <button
                    key={r.key}
                    type="button"
                    className={`b sm ${on ? '' : 'g'}`}
                    onClick={() => toggleNewRole(r.key)}
                  >
                    {r.icon} {r.shortLabel} {on ? '✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          <button type="submit" className="b ok sm" disabled={busy}>
            {busy ? 'Salvando…' : '✅ Cadastrar funcionário'}
          </button>
        </form>

        {/* Lista de funcionários cadastrados com edição de funções em tempo real */}
        <div className="space-y-2">
          <div className="text-xs font-bold">
            👥 Funcionários cadastrados ({accounts.length})
          </div>
          {accounts.length === 0 ? (
            <p className="mu text-xs !m-0">
              Nenhum funcionário cadastrado ainda. Crie acima para liberar logins individuais por
              cargo (Garçom, Barman, Cozinha, Caixa, Delivery, Estoque ou Gerente).
            </p>
          ) : (
            accounts.map((acc) => (
              <div
                key={acc.id}
                className={`rounded-xl p-3 border space-y-2 ${
                  acc.active
                    ? 'bg-[var(--s2)] border-[var(--bd)]'
                    : 'bg-red-500/5 border-red-400/25 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="font-bold text-sm">
                      {acc.name}{' '}
                      <span className="text-xs font-normal text-[var(--mut)]">
                        (@{acc.username})
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--mut)]">
                      {acc.active ? '🟢 Ativo · Atualiza em tempo real' : '🔴 Acesso suspenso'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      className="b g sm"
                      onClick={() => {
                        setResetPassId(resetPassId === acc.id ? null : acc.id);
                        setResetPassVal('');
                      }}
                    >
                      🔑 Senha
                    </button>
                    <button
                      type="button"
                      className={`b sm ${acc.active ? 'g' : 'ok'}`}
                      onClick={() => void handleToggleActive(acc)}
                    >
                      {acc.active ? 'Pausar' : 'Ativar'}
                    </button>
                    <button
                      type="button"
                      className="b g sm"
                      onClick={() => void handleRemoveStaff(acc)}
                    >
                      Remover
                    </button>
                  </div>
                </div>

                {/* Seleção múltipla de funções em tempo real */}
                <div className="flex flex-wrap gap-1.5">
                  {STAFF_ROLES.map((r) => {
                    const has = acc.roles.includes(r.key);
                    return (
                      <button
                        key={r.key}
                        type="button"
                        className={`b sm !py-1 !px-2 !text-[11px] ${has ? '' : 'g'}`}
                        title={r.description}
                        onClick={() => void handleToggleExistingRole(acc, r.key)}
                      >
                        {r.icon} {r.shortLabel} {has ? '✓' : ''}
                      </button>
                    );
                  })}
                </div>

                {resetPassId === acc.id && (
                  <div className="flex gap-2 pt-2 border-t border-[var(--bd)]">
                    <input
                      type="password"
                      value={resetPassVal}
                      onChange={(e) => setResetPassVal(e.target.value)}
                      placeholder="Nova senha (mín. 4 dígitos)"
                      className="grow !mt-0"
                    />
                    <button
                      type="button"
                      className="b ok sm shrink-0"
                      onClick={() => void handleResetPassword(acc)}
                    >
                      Salvar nova senha
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
