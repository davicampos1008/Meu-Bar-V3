import React, { useState } from 'react';
import { sb, writeBarSafe } from '../lib/supabase';
import { slugHandle } from '../lib/utils';
import type { Bar, BarEntry, JobPost, StaffProfile, UserCoords } from '../types/meubar';
import { PWAInstallButton } from './PWAControls';
import { BrandMark, ImageUploader, LocationPicker } from './SharedUI';

import { broadcastNewUserSignup } from '../lib/saas';
import { checkActionCooldown, evaluatePasswordStrength } from '../lib/security';
import { AdSlot } from './AdSlot';
import type { PartnerAdBanner, PlatformSaaSConfig } from '../types/meubar';

export const LoginScreen: React.FC<{
  saasConfig?: PlatformSaaSConfig;
  partnerAds?: PartnerAdBanner[];
  onOpenLegal?: (tab: 'terms' | 'privacy') => void;
  onOpenSalesSite?: () => void;
}> = ({ saasConfig, partnerAds = [], onOpenLegal, onOpenSalesSite }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [isOk, setIsOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const pwStrength = evaluatePasswordStrength(password);

  const formatAuthError = (raw: string) => {
    const low = raw.toLowerCase();
    if (low.includes('email not confirmed')) {
      return 'O Supabase ainda está exigindo confirmação de e-mail neste projeto. Para testar sem confirmar e-mail, desative "Confirm email" no painel do Supabase (Authentication → Providers → Email) e salve.';
    }
    if (low.includes('invalid login credentials')) {
      return 'E-mail ou senha incorretos.';
    }
    if (low.includes('user already registered')) {
      return 'Este e-mail já possui conta. Clique em "Entrar".';
    }
    return raw;
  };

  const handleAuth = async (mode: 'in' | 'up') => {
    setMsg('');
    setIsOk(false);
    const em = email.trim();
    if (!em || !password) {
      setMsg('Preencha e-mail e senha.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setMsg('Digite um e-mail válido.');
      return;
    }

    const cooldown = checkActionCooldown(`auth_${mode}`, mode === 'up' ? 3000 : 1200);
    if (!cooldown.ok) {
      setMsg(`Aguarde ${Math.ceil(cooldown.waitMs / 1000)}s antes de tentar novamente.`);
      return;
    }

    if (mode === 'in') {
      if (password.length < 6) {
        setMsg('A senha deve ter pelo menos 6 caracteres.');
        return;
      }
      setBusy(true);
      const r = await sb.auth.signInWithPassword({ email: em, password });
      setBusy(false);
      if (r.error) {
        setMsg(formatAuthError(r.error.message));
      }
      return;
    }

    // Cadastro exige senha forte (mínimo 8 caracteres com letras e números)
    if (!pwStrength.ok) {
      setMsg(pwStrength.hint);
      return;
    }

    setBusy(true);
    const r = await sb.auth.signUp({ email: em, password });
    if (r.error) {
      setBusy(false);
      setMsg(formatAuthError(r.error.message));
      return;
    }

    void broadcastNewUserSignup(em);

    if (!r.data.session) {
      const loginTry = await sb.auth.signInWithPassword({ email: em, password });
      setBusy(false);
      if (loginTry.error) {
        setMsg(formatAuthError(loginTry.error.message));
      } else {
        setIsOk(true);
        setMsg('Conta criada e conectada!');
      }
      return;
    }

    setBusy(false);
  };

  const trialDays = saasConfig?.trial_days ?? 14;

  return (
    <div className="w narrow">
      <div className="text-center mb-3.5">
        <BrandMark big />
      </div>
      <p className="mu text-center">
        Gestão completa de bar, receitas, estoque, cardápio QR, delivery 0% e equipe.
        {trialDays > 0 ? ` Comece grátis com ${trialDays} dias Pro liberados.` : ' Comece grátis.'}
      </p>
      <div className="panel">
        <label>E-mail</label>
        <input
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label>Senha</label>
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Mínimo 8 caracteres (letras e números)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleAuth('in');
          }}
        />
        {password.length > 0 && (
          <div className="mt-2 flex items-center justify-between gap-2 text-[0.75rem]">
            <div className="flex items-center gap-1.5 flex-1">
              {[1, 2, 3, 4].map((lvl) => (
                <span
                  key={lvl}
                  className="h-1.5 flex-1 rounded-full transition-colors"
                  style={{
                    background:
                      pwStrength.score >= lvl
                        ? pwStrength.score >= 3
                          ? 'var(--ok)'
                          : 'var(--ac)'
                        : 'var(--bd)',
                  }}
                />
              ))}
            </div>
            <span
              className="font-semibold"
              style={{
                color: pwStrength.ok ? 'var(--ok)' : 'var(--mut)',
              }}
            >
              {pwStrength.label}
            </span>
          </div>
        )}
        <div className="row mt-4">
          <button
            type="button"
            className="b grow"
            disabled={busy}
            onClick={() => void handleAuth('in')}
          >
            Entrar
          </button>
          <button
            type="button"
            className="b g grow"
            disabled={busy}
            onClick={() => void handleAuth('up')}
          >
            Criar conta grátis
          </button>
        </div>
        {msg && <p className={isOk ? 'ok-txt' : 'err'}>{msg}</p>}
      </div>

      {onOpenSalesSite && (
        <div className="mt-3">
          <button
            type="button"
            className="b g full"
            onClick={onOpenSalesSite}
          >
            🌐 Conhecer tudo que o Meu Bar faz (Site Oficial)
          </button>
        </div>
      )}

      <div className="mt-3">
        <PWAInstallButton variant="card" />
      </div>

      <AdSlot
        placement="explore"
        showAds
        config={saasConfig}
        partnerAds={partnerAds}
      />

      {onOpenLegal && (
        <div className="mt-4 pb-4 flex items-center justify-center gap-3 text-xs text-[var(--mut)]">
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
      )}
    </div>
  );
};

export const OnboardingScreen: React.FC<{
  userId: string;
  profile: StaffProfile;
  jobs: JobPost[];
  bars?: BarEntry[];
  userCoords: UserCoords | null;
  hasExistingBars: boolean;
  onPickBar?: (bar: Bar, role: string) => Promise<void>;
  onDetectCoords: () => Promise<UserCoords | null>;
  onGoSeeker: () => void;
  onBarCreated: (barId: string) => Promise<void>;
  onOpenStandalone: (jobsFirst: boolean) => void;
  onRefreshJobs: () => Promise<void>;
  onBackToApp?: () => void;
  onToast: (msg: string) => void;
}> = ({
  userId,
  profile,
  jobs,
  bars = [],
  userCoords,
  hasExistingBars,
  onPickBar,
  onDetectCoords,
  onGoSeeker,
  onBarCreated,
  onOpenStandalone,
  onRefreshJobs,
  onBackToApp,
  onToast,
}) => {
  const [barName, setBarName] = useState('');
  const [barHandle, setBarHandle] = useState('');
  const [manualHandle, setManualHandle] = useState(false);
  const [city, setCity] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [kind, setKind] = useState('home');
  const [memberName, setMemberName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [createErr, setCreateErr] = useState('');
  const [creating, setCreating] = useState(false);

  const [reqHandle, setReqHandle] = useState('');
  const [reqPass, setReqPass] = useState('');
  const [reqRole, setReqRole] = useState('barman');
  const [reqErr, setReqErr] = useState('');
  const [reqOk, setReqOk] = useState('');

  const handleCreateBar = async () => {
    setCreateErr('');
    const nm = barName.trim();
    const h = slugHandle(barHandle || nm);
    if (nm.length < 2) {
      setCreateErr('Digite o nome do bar.');
      return;
    }
    if (h.length < 3) {
      setCreateErr('Escolha um @ válido (mínimo 3 caracteres).');
      return;
    }
    setCreating(true);
    const ins = await writeBarSafe('insert', {
      name: nm,
      handle: h,
      city: city.trim() || null,
      lat: lat ? Number(lat) : null,
      lon: lon ? Number(lon) : null,
      kind,
      logo_url: logoUrl.trim() || null,
      banner_url: bannerUrl.trim() || null,
      owner: userId,
      shakers: [750, 500],
    });
    if (ins.error || !ins.data) {
      setCreating(false);
      setCreateErr(
        ins.error?.code === '23505'
          ? 'Esse @ já está em uso.'
          : ins.error?.message || 'Erro ao criar bar.'
      );
      return;
    }

    const memberNameVal = memberName.trim() || profile.display_name || 'Dono';
    const memRes = await sb.from('bar_members').insert({
      bar_id: ins.data.id,
      user_id: userId,
      role: 'owner',
      name: memberNameVal,
    });
    if (memRes.error && String(memRes.error.message || '').includes('bar_members_role_check')) {
      await sb.from('bar_members').insert({
        bar_id: ins.data.id,
        user_id: userId,
        role: 'dono',
        name: memberNameVal,
      });
    }
    localStorage.setItem('last_bar_' + userId, ins.data.id);
    setCreating(false);
    await onBarCreated(ins.data.id);
  };

  const handleRequestService = async () => {
    setReqErr('');
    setReqOk('');
    const r = await sb.rpc('request_service_by_handle', {
      p_handle: reqHandle,
      p_password: reqPass,
      p_role: reqRole,
    });
    if (r.error) {
      setReqErr(r.error.message);
      return;
    }
    setReqOk('Solicitação enviada com seu currículo!');
    await onRefreshJobs();
  };

  return (
    <div>
      <div className="top">
        <BrandMark />
        <div className="row">
          <PWAInstallButton variant="pill" />
          <button type="button" className="lnk" onClick={() => void sb.auth.signOut()}>
            Sair
          </button>
        </div>
      </div>

      <div className="w narrow">
        {hasExistingBars && onBackToApp && (
          <button type="button" className="b g sm mb-3" onClick={onBackToApp}>
            ← Voltar ao meu bar
          </button>
        )}
        <h1>Começar no Meu Bar</h1>
        <p className="mu">
          Crie seu bar, entre numa equipe, ou use só para <b>currículo e vagas</b>.
        </p>

        {bars.length > 0 && onPickBar && (
          <div className="panel !border-[var(--ok)]">
            <h2>🏪 Meus bares conectados ({bars.length})</h2>
            <p className="mu">Toque para entrar direto em um bar que você já participa:</p>
            <div className="flex flex-col gap-2 mt-2.5">
              {bars.map((entry) => (
                <div
                  key={entry.bar.id}
                  className="rounded-xl p-2.5 border border-[var(--bd)] bg-[var(--bg2)] flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={entry.bar.logo_url || '/logo.png'}
                      alt={entry.bar.name}
                      className="w-10 h-10 rounded-lg object-cover border border-[var(--bd)] shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">{entry.bar.name}</div>
                      <div className="text-xs text-[var(--mut)] truncate">
                        {entry.bar.handle ? `@${entry.bar.handle} · ` : ''}
                        Função: {entry.role}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="b sm shrink-0"
                    onClick={() => void onPickBar(entry.bar, entry.role)}
                  >
                    Entrar →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="panel !border-[var(--ac)]">
          <h2>Só quero emprego</h2>
          <p className="mu">Sem criar bar agora.</p>
          <button type="button" className="b full mt-2" onClick={onGoSeeker}>
            Continuar sem criar bar
          </button>
        </div>

        <div className="panel">
          <h2>Criar novo bar</h2>
          <label>Nome do bar</label>
          <input
            value={barName}
            placeholder="Ex: Minha casa"
            onChange={(e) => {
              const v = e.target.value;
              setBarName(v);
              if (!manualHandle) setBarHandle(slugHandle(v));
            }}
          />
          <label>@ do bar (único)</label>
          <input
            value={barHandle}
            placeholder="Ex: minha_casa_7228"
            onChange={(e) => {
              setManualHandle(true);
              setBarHandle(slugHandle(e.target.value));
            }}
          />

          <LocationPicker
            label="Localização do bar"
            placeholder="Ex: Asa Norte, Brasília, DF"
            value={city}
            userCoords={userCoords}
            showGeoButton
            onDetectCoords={onDetectCoords}
            onToast={onToast}
            onChange={(val, newLat, newLon) => {
              setCity(val);
              if (newLat != null) setLat(String(newLat));
              if (newLon != null) setLon(String(newLon));
            }}
          />

          <label>Tipo</label>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="home">Em casa / Amigos (sem preço)</option>
            <option value="bar">Bar / Restaurante (com preços)</option>
          </select>

          <label>Seu nome na equipe</label>
          <input
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            placeholder="Ex: Davi"
          />

          <ImageUploader
            label="Logo do bar (foto ou galeria)"
            value={logoUrl}
            folder="logos"
            userId={userId}
            onChange={setLogoUrl}
            onToast={onToast}
          />
          <ImageUploader
            label="Banner do bar (foto ou galeria)"
            value={bannerUrl}
            folder="banners"
            userId={userId}
            onChange={setBannerUrl}
            onToast={onToast}
          />

          <button
            type="button"
            className="b full mt-3.5"
            disabled={creating}
            onClick={() => void handleCreateBar()}
          >
            {creating ? 'Criando...' : 'Criar bar'}
          </button>
          {createErr && <p className="err">{createErr}</p>}
        </div>

        <div className="panel">
          <h2>Solicitar serviço por @ do bar + senha</h2>
          <label>@ do bar</label>
          <input
            value={reqHandle}
            onChange={(e) => setReqHandle(e.target.value)}
            placeholder="Ex: @minha_casa_7228"
          />
          <label>Senha de serviço</label>
          <input
            value={reqPass}
            onChange={(e) => setReqPass(e.target.value)}
            placeholder="Senha gerada pelo dono ou gerente"
          />
          <label>Função</label>
          <select value={reqRole} onChange={(e) => setReqRole(e.target.value)}>
            <option value="barman">Barman</option>
            <option value="garcom">Garçom</option>
            <option value="cozinha">Cozinha</option>
            <option value="caixa">Caixa</option>
          </select>
          <button
            type="button"
            className="b g full mt-3"
            onClick={() => void handleRequestService()}
          >
            Enviar solicitação
          </button>
          {reqErr && <p className="err">{reqErr}</p>}
          {reqOk && <p className="ok-txt">{reqOk}</p>}
        </div>

        <div className="panel">
          <h2>Currículo & Vagas</h2>
          <div className="row mt-2">
            <button
              type="button"
              className="b g grow"
              onClick={() => onOpenStandalone(false)}
            >
              Meu Currículo
            </button>
            <button
              type="button"
              className="b g grow"
              onClick={() => onOpenStandalone(true)}
            >
              Mural de Vagas ({jobs.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
