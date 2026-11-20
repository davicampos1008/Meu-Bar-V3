import React, { useEffect, useState } from 'react';
import { JOB_ROLES, ROLE_LABELS, SKILL_OPTIONS } from '../lib/catalog';
import { sb, uploadPdfFile } from '../lib/supabase';
import {
  externalMapUrl,
  getMissingBarFields,
  getMissingProfileFields,
  haversineKm,
  reverseGeocodeExact,
} from '../lib/utils';
import type {
  Bar,
  BarEntry,
  BarMember,
  BarServicePassword,
  JobApplication,
  JobPost,
  ServiceRequest,
  StaffProfile,
  UserCoords,
} from '../types/meubar';
import { ImageUploader, LocationPicker } from './SharedUI';

export const ProfileSection: React.FC<{
  profile: StaffProfile;
  userId: string;
  userCoords: UserCoords | null;
  onDetectCoords?: () => Promise<UserCoords | null>;
  onProfileSaved: (profile: StaffProfile) => void;
  onToast: (msg: string) => void;
}> = ({ profile, userId, userCoords, onDetectCoords, onProfileSaved, onToast }) => {
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [pdfUrl, setPdfUrl] = useState(profile.resume_pdf_url || '');
  const [location, setLocation] = useState(profile.location || '');
  const [workMode, setWorkMode] = useState(profile.work_mode || 'ambos');
  const [expYears, setExpYears] = useState(String(profile.experience_years || 0));
  const [availability, setAvailability] = useState(profile.availability || '');
  const [skills, setSkills] = useState<Set<string>>(new Set(profile.skills || []));
  const [bio, setBio] = useState(profile.bio || '');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const handlePdfChange = async (file?: File | null) => {
    if (!file) return;
    onToast('Enviando PDF...');
    const res = await uploadPdfFile(file, 'resumes', userId);
    if (res.error) {
      onToast('Erro ao enviar PDF: ' + res.error);
      return;
    }
    if (res.url) {
      setPdfUrl(res.url);
      onToast('PDF anexado!');
    }
  };

  const handleSave = async () => {
    setErr('');
    setMsg('');
    const missing = getMissingProfileFields({
      display_name: displayName,
      avatar_url: avatarUrl,
      location,
      availability,
      skills: Array.from(skills),
      bio,
    });
    if (missing.length > 0) {
      const m = `Preencha todos os campos do currículo: ${missing.join(', ')}.`;
      setErr(m);
      onToast(m);
      return;
    }
    setSaving(true);
    const r = await sb
      .from('staff_profiles')
      .upsert(
        {
          user_id: userId,
          display_name: displayName.trim(),
          avatar_url: avatarUrl.trim(),
          resume_pdf_url: pdfUrl.trim() || null,
          location: location.trim(),
          work_mode: workMode,
          experience_years: Math.max(0, parseInt(expYears, 10) || 0),
          availability: availability.trim(),
          skills: Array.from(skills),
          bio: bio.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();
    setSaving(false);
    if (r.error) {
      onToast('Erro: ' + r.error.message);
      return;
    }
    if (r.data) onProfileSaved(r.data as StaffProfile);
    setMsg('Currículo salvo e pronto para vagas!');
    onToast('Currículo salvo!');
  };

  return (
    <div className="panel">
      <h2>Meu Currículo Profissional</h2>
      <p className="mu">Preencha os campos obrigatórios (*) para poder se candidatar às vagas.</p>
      <label>Nome profissional *</label>
      <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />

      <ImageUploader
        label="Foto de rosto * (câmera ou galeria)"
        value={avatarUrl}
        folder="avatars"
        userId={userId}
        onChange={setAvatarUrl}
        onToast={onToast}
      />

      <label>Anexar currículo em PDF (junto ao digital)</label>
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => void handlePdfChange(e.target.files?.[0])}
      />
      <input
        value={pdfUrl}
        onChange={(e) => setPdfUrl(e.target.value)}
        placeholder="Link do PDF (preenchido ao anexar)"
        className="mt-1.5"
      />

      <LocationPicker
        label="Localidade exata * (digite ou use sua localização)"
        placeholder="Ex: Asa Sul, Brasília, DF"
        value={location}
        userCoords={userCoords}
        showGeoButton={Boolean(onDetectCoords)}
        onDetectCoords={onDetectCoords}
        onToast={onToast}
        onChange={(val) => setLocation(val)}
      />

      <label>Vínculo</label>
      <select value={workMode} onChange={(e) => setWorkMode(e.target.value)}>
        <option value="ambos">Ambos</option>
        <option value="contrato">Contrato</option>
        <option value="freelance">Freelance</option>
      </select>

      <label>Anos de experiência</label>
      <input
        type="number"
        min={0}
        max={50}
        value={expYears}
        onChange={(e) => setExpYears(e.target.value)}
      />

      <label>Disponibilidade *</label>
      <input
        value={availability}
        onChange={(e) => setAvailability(e.target.value)}
        placeholder="Ex: Noites, fins de semana, eventos"
      />

      <label>Qualidades / Funções *</label>
      <div className="chips !flex-wrap !overflow-visible">
        {SKILL_OPTIONS.map((sk) => (
          <span
            key={sk}
            className={`chip ${skills.has(sk) ? 'on' : ''}`}
            onClick={() => {
              const next = new Set(skills);
              if (next.has(sk)) next.delete(sk);
              else next.add(sk);
              setSkills(next);
            }}
          >
            {sk}
          </span>
        ))}
      </div>

      <label>Resumo profissional *</label>
      <textarea value={bio} onChange={(e) => setBio(e.target.value)} />

      <button
        type="button"
        className="b full mt-3.5"
        disabled={saving}
        onClick={() => void handleSave()}
      >
        {saving ? 'Salvando...' : 'Salvar currículo'}
      </button>
      {err && <p className="err">{err}</p>}
      {msg && <p className="ok-txt">{msg}</p>}
    </div>
  );
};

export const JobsSection: React.FC<{
  jobs: JobPost[];
  myApps: JobApplication[];
  profile?: StaffProfile;
  userId: string;
  userCoords: UserCoords | null;
  onDetectCoords: () => Promise<UserCoords | null>;
  onRefreshJobs: () => Promise<void>;
  onGoProfile?: () => void;
  onToast: (msg: string) => void;
}> = ({
  jobs,
  myApps,
  profile,
  userId,
  userCoords,
  onDetectCoords,
  onRefreshJobs,
  onGoProfile,
  onToast,
}) => {
  const [roleFilter, setRoleFilter] = useState('todas');
  const [radiusKm, setRadiusKm] = useState(50);
  const [locFilter, setLocFilter] = useState('');
  const [exactGeoLabel, setExactGeoLabel] = useState('');
  const [detectingGeo, setDetectingGeo] = useState(false);
  const [typeFilter, setTypeFilter] = useState('todas');

  const origin = userCoords || { lat: -15.7942, lon: -47.8822 };
  const missingProfileFields = profile ? getMissingProfileFields(profile) : [];

  useEffect(() => {
    let active = true;
    if (userCoords && !exactGeoLabel) {
      void reverseGeocodeExact(userCoords.lat, userCoords.lon).then((lbl) => {
        if (active) setExactGeoLabel(lbl);
      });
    }
    return () => {
      active = false;
    };
  }, [userCoords?.lat, userCoords?.lon]);

  const list = jobs
    .map((j) => {
      const bCoords =
        j.bars && j.bars.lat != null && j.bars.lon != null
          ? { lat: Number(j.bars.lat), lon: Number(j.bars.lon) }
          : null;
      const km = bCoords ? haversineKm(origin, bCoords) : 9999;
      return { ...j, _km: km };
    })
    .filter((j) => {
      if (roleFilter !== 'todas' && j.role_needed !== roleFilter) return false;
      if (typeFilter !== 'todas' && j.contract_type !== typeFilter) return false;
      if (
        locFilter.trim() &&
        !(j.location || j.bars?.city || '').toLowerCase().includes(locFilter.trim().toLowerCase())
      ) {
        return false;
      }
      if (j._km < 9000 && j._km > radiusKm) return false;
      return true;
    })
    .sort((a, b) => a._km - b._km);

  const handleApply = async (jobId: string) => {
    if (missingProfileFields.length > 0) {
      onToast(`Complete seu currículo antes de se candidatar: ${missingProfileFields.join(', ')}.`);
      if (onGoProfile) onGoProfile();
      return;
    }
    const r = await sb
      .from('job_applications')
      .insert({ job_id: jobId, applicant_id: userId, message: 'Currículo enviado.' });
    if (r.error) {
      onToast('Erro: ' + r.error.message);
      return;
    }
    onToast('Candidatura enviada!');
    await onRefreshJobs();
  };

  return (
    <div>
      {missingProfileFields.length > 0 && (
        <div className="alert-box row sp mt-3">
          <div className="flex-1 min-w-[200px]">
            <b>📄 Currículo incompleto para se candidatar</b>
            <p className="mu mt-0.5">
              Falta preencher: <b>{missingProfileFields.join(', ')}</b>.
            </p>
          </div>
          {onGoProfile && (
            <button type="button" className="b sm" onClick={onGoProfile}>
              Preencher currículo
            </button>
          )}
        </div>
      )}

      <div className="panel">
        <h2>Vagas disponíveis (mais próximas primeiro)</h2>
        <div className="row mb-2">
          <button
            type="button"
            className="b g sm"
            disabled={detectingGeo}
            onClick={async () => {
              setDetectingGeo(true);
              const c = await onDetectCoords();
              if (!c) {
                setDetectingGeo(false);
                onToast('Não foi possível obter a localização.');
                return;
              }
              const exact = await reverseGeocodeExact(c.lat, c.lon);
              setExactGeoLabel(exact);
              setDetectingGeo(false);
              onToast(`Localização exata: ${exact}`);
            }}
          >
            {detectingGeo ? 'Obtendo localização…' : '📍 Usar minha localização'}
          </button>
          <select
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value) || 50)}
            className="!w-auto"
          >
            {[5, 10, 25, 50, 100, 200].map((km) => (
              <option key={km} value={km}>
                Até {km} km
              </option>
            ))}
          </select>
        </div>
        {exactGeoLabel && (
          <p className="tag mb-2">
            📍 Referência exata: <b>{exactGeoLabel}</b>
          </p>
        )}

        <div className="row">
          <div className="grow">
            <LocationPicker
              label="Filtrar por localidade exata"
              placeholder="Cidade ou bairro (opcional)"
              value={locFilter}
              userCoords={userCoords}
              showGeoButton
              onDetectCoords={onDetectCoords}
              onToast={onToast}
              onChange={(val) => setLocFilter(val)}
            />
          </div>
          <div className="grow">
            <label>Vínculo</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="todas">Contrato e Freelance</option>
              <option value="contrato">Contrato</option>
              <option value="freelance">Freelance</option>
            </select>
          </div>
        </div>

        <div className="chips !flex-wrap !overflow-visible mt-2.5">
          {['todas', ...JOB_ROLES].map((r) => (
            <span
              key={r}
              className={`chip ${roleFilter === r ? 'on' : ''}`}
              onClick={() => setRoleFilter(r)}
            >
              {r === 'todas' ? 'Todas funções' : ROLE_LABELS[r] || r}
            </span>
          ))}
        </div>
      </div>

      <div className="list mt-3">
        {list.length > 0 ? (
          list.map((j) => {
            const applied = myApps.some((a) => a.job_id === j.id);
            const bName = j.bars
              ? `${j.bars.name}${j.bars.handle ? ` (@${j.bars.handle})` : ''}`
              : 'Estabelecimento';
            const distTxt = j._km < 9000 ? ` · ${j._km.toFixed(1)} km` : '';
            return (
              <div key={j.id} className="!items-start">
                <div className="flex-1">
                  <b>{j.title}</b>{' '}
                  <span className="badge-warn">
                    {j.contract_type} · {ROLE_LABELS[j.role_needed] || j.role_needed}
                  </span>
                  <br />
                  <span className="tag">
                    {bName} · 📍 {j.location}
                    {distTxt} ·{' '}
                    <a
                      href={externalMapUrl(j.bars || { city: j.location })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--ac)]"
                    >
                      Abrir no mapa
                    </a>
                  </span>
                  {j.description && <p className="mu mt-1.5">{j.description}</p>}
                </div>
                <button
                  type="button"
                  className={`b sm ${applied ? 'g' : ''}`}
                  disabled={applied}
                  onClick={() => void handleApply(j.id)}
                >
                  {applied ? 'Candidatado' : 'Candidatar-se'}
                </button>
              </div>
            );
          })
        ) : (
          <p className="mu">Nenhuma vaga disponível no momento.</p>
        )}
      </div>
    </div>
  );
};

export const HandleServiceSection: React.FC<{
  serviceReqs: ServiceRequest[];
  onRefresh: () => Promise<void>;
}> = ({ serviceReqs, onRefresh }) => {
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('barman');
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  const approvedReq = serviceReqs.find(
    (x) => x.status === 'aprovada' || x.status === 'aceita'
  );

  const handleSend = async () => {
    setErr('');
    setOk('');
    const r = await sb.rpc('request_service_by_handle', {
      p_handle: handle,
      p_password: password,
      p_role: role,
    });
    if (r.error) {
      setErr(r.error.message);
      return;
    }
    setOk('Solicitação enviada para a loja!');
    await onRefresh();
  };

  return (
    <div className="panel">
      <h2>Solicitar serviço para a loja</h2>
      {approvedReq ? (
        <p className="ok-txt">
          ✓ Solicitação aprovada para {approvedReq.bars?.name || 'a loja'}!
        </p>
      ) : (
        <p className="mu">Preencha o @ da loja e a senha para enviar sua solicitação.</p>
      )}
      <label>@ da loja</label>
      <input
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
        placeholder="Ex: @minha_casa_7228"
      />
      <label>Senha da loja</label>
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Senha gerada pelo dono ou gerente"
      />
      <label>Função</label>
      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="barman">Barman</option>
        <option value="garcom">Garçom</option>
        <option value="cozinha">Cozinha</option>
        <option value="caixa">Caixa</option>
      </select>
      <button type="button" className="b full mt-3" onClick={() => void handleSend()}>
        Enviar solicitação para a loja
      </button>
      {ok && <p className="ok-txt">{ok}</p>}
      {err && <p className="err">{err}</p>}
    </div>
  );
};

export const TeamSection: React.FC<{
  bar: Bar;
  members: BarMember[];
  onMembersUpdated: (members: BarMember[]) => void;
  onToast: (msg: string) => void;
}> = ({ bar, members, onMembersUpdated, onToast }) => {
  const [svcPw, setSvcPw] = useState('');
  const [passwords, setPasswords] = useState<BarServicePassword[]>([]);
  const [pwErr, setPwErr] = useState('');
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [reqErr, setReqErr] = useState('');
  const [confirmRemoveMemberId, setConfirmRemoveMemberId] = useState<string | null>(null);

  const roles = [
    { id: 'owner', label: 'Dono' },
    { id: 'gerente', label: 'Gerente' },
    { id: 'barman', label: 'Barman' },
    { id: 'garcom', label: 'Garçom' },
    { id: 'cozinha', label: 'Cozinha' },
    { id: 'caixa', label: 'Caixa' },
  ];

  const loadPasswords = async () => {
    const r = await sb
      .from('bar_service_passwords')
      .select('*')
      .eq('bar_id', bar.id)
      .order('created_at', { ascending: false });
    if (r.error) {
      setPwErr(r.error.message);
      return;
    }
    setPwErr('');
    setPasswords((r.data as BarServicePassword[]) || []);
  };

  const loadRequests = async () => {
    const r = await sb
      .from('service_requests')
      .select('*')
      .eq('bar_id', bar.id)
      .eq('status', 'pendente')
      .order('created_at', { ascending: false });
    if (r.error) {
      setReqErr(r.error.message);
      return;
    }
    setReqErr('');
    setRequests((r.data as ServiceRequest[]) || []);
  };

  useEffect(() => {
    void loadPasswords();
    void loadRequests();
  }, [bar.id]);

  const handleCreatePassword = async () => {
    const pw = svcPw.trim();
    if (pw.length < 3) {
      onToast('Senha com pelo menos 3 caracteres');
      return;
    }
    const labelText = `Temporária ${new Date().toLocaleDateString('pt-BR')}`;
    let r = await sb.from('bar_service_passwords').insert({
      bar_id: bar.id,
      password: pw,
      access_code: pw,
      label: labelText,
    });
    if (r.error && String(r.error.message || '').includes('password')) {
      r = await sb.from('bar_service_passwords').insert({
        bar_id: bar.id,
        access_code: pw,
        label: labelText,
      });
    } else if (r.error && String(r.error.message || '').includes('access_code')) {
      r = await sb.from('bar_service_passwords').insert({
        bar_id: bar.id,
        password: pw,
        label: labelText,
      });
    }
    if (r.error) {
      onToast(r.error.message);
      return;
    }
    onToast(`Senha criada. Passe ao funcionário com o @${bar.handle || ''}`);
    setSvcPw('');
    await loadPasswords();
  };

  const handleAcceptRequest = async (req: ServiceRequest) => {
    if (!req.requester_id) {
      onToast('Pedido sem usuário');
      return;
    }
    await sb.from('service_requests').update({ status: 'aprovada' }).eq('id', req.id);
    let up = await sb.from('bar_members').upsert(
      {
        bar_id: bar.id,
        user_id: req.requester_id,
        role: req.role || 'garcom',
        name: req.requester_name || req.name || 'Funcionário',
      },
      { onConflict: 'bar_id,user_id' }
    );
    if (up.error) {
      up = await sb.from('bar_members').insert({
        bar_id: bar.id,
        user_id: req.requester_id,
        role: req.role || 'garcom',
        name: req.requester_name || req.name || 'Funcionário',
      });
    }
    if (up.error) {
      onToast(up.error.message);
      return;
    }
    const mem = await sb.from('bar_members').select('*').eq('bar_id', bar.id);
    onMembersUpdated((mem.data as BarMember[]) || []);
    onToast('Aceito na equipe');
    await loadRequests();
  };

  return (
    <div>
      <div className="panel">
        <h2>Equipe · {bar.name}</h2>
        <p className="mu">
          @ da loja: <b>@{bar.handle || 'sem_handle'}</b> — o funcionário usa este @ + a senha
          temporária.
        </p>
        <label>Senha temporária de entrada</label>
        <div className="row">
          <input
            value={svcPw}
            onChange={(e) => setSvcPw(e.target.value)}
            placeholder="Ex: 123"
            className="flex-1"
            maxLength={24}
          />
          <button
            type="button"
            className="b sm"
            onClick={() => void handleCreatePassword()}
          >
            Criar senha
          </button>
        </div>
        <p className="mu">
          Crie uma senha, envie ao funcionário. Depois de usada/aceita você pode apagar.
        </p>
        <div className="list mt-3">
          {pwErr ? (
            <p className="err">{pwErr}</p>
          ) : passwords.length > 0 ? (
            passwords.map((p) => (
              <div key={p.id}>
                <span>
                  <b>{p.access_code || p.password}</b>
                  <br />
                  <span className="mu">{p.label || 'Senha'}</span>
                </span>
                <button
                  type="button"
                  className="b g sm"
                  onClick={async () => {
                    await sb.from('bar_service_passwords').delete().eq('id', p.id);
                    await loadPasswords();
                  }}
                >
                  Apagar
                </button>
              </div>
            ))
          ) : (
            <p className="mu">Nenhuma senha ativa.</p>
          )}
        </div>
      </div>

      <div className="panel">
        <h2>Membros</h2>
        <div className="list">
          {members.length > 0 ? (
            members.map((m) => (
              <div key={m.id} className="!items-start">
                <div className="flex-1">
                  <b>{m.name || 'Membro'}</b>
                  <br />
                  <span className="tag">{m.role}</span>
                </div>
                {m.role === 'owner' || m.role === 'dono' ? (
                  <span className="chip st1">Dono</span>
                ) : (
                  <div className="row">
                    <select
                      value={m.role}
                      className="!w-auto"
                      onChange={async (e) => {
                        const newRole = e.target.value;
                        const r = await sb
                          .from('bar_members')
                          .update({ role: newRole })
                          .eq('id', m.id);
                        if (r.error) {
                          onToast(r.error.message);
                          return;
                        }
                        onMembersUpdated(
                          members.map((x) => (x.id === m.id ? { ...x, role: newRole } : x))
                        );
                        onToast('Função atualizada');
                      }}
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    {confirmRemoveMemberId === m.id ? (
                      <button
                        type="button"
                        className="b sm"
                        onClick={async () => {
                          await sb.from('bar_members').delete().eq('id', m.id);
                          onMembersUpdated(members.filter((x) => x.id !== m.id));
                          setConfirmRemoveMemberId(null);
                        }}
                      >
                        Confirmar
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="b g sm"
                        onClick={() => setConfirmRemoveMemberId(m.id)}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="mu">Só você na equipe por enquanto.</p>
          )}
        </div>
      </div>

      <div className="panel">
        <h2>Pedidos de entrada (aguardando aceite)</h2>
        <p className="mu">Quando alguém enviar convite com @ + senha, aparece aqui.</p>
        <div className="list">
          {reqErr ? (
            <p className="err">{reqErr}</p>
          ) : requests.length > 0 ? (
            requests.map((req) => (
              <div key={req.id} className="!items-start">
                <div className="flex-1">
                  <b>{req.requester_name || req.name || 'Candidato'}</b>
                  <br />
                  <span className="tag">{req.role || 'garcom'}</span>
                  {req.requester_id && (
                    <>
                      <br />
                      <span className="mu">{String(req.requester_id).slice(0, 8)}…</span>
                    </>
                  )}
                </div>
                <div className="row">
                  <button
                    type="button"
                    className="b sm ok"
                    onClick={() => void handleAcceptRequest(req)}
                  >
                    Aceitar
                  </button>
                  <button
                    type="button"
                    className="b g sm"
                    onClick={async () => {
                      await sb
                        .from('service_requests')
                        .update({ status: 'recusada' })
                        .eq('id', req.id);
                      await loadRequests();
                    }}
                  >
                    Recusar
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="mu">Nenhum pedido pendente.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export const CreateJobSection: React.FC<{
  activeBar: Bar;
  userId: string;
  userCoords: UserCoords | null;
  onDetectCoords?: () => Promise<UserCoords | null>;
  onGoStudio: () => void;
  onJobCreated: () => Promise<void>;
  onToast: (msg: string) => void;
}> = ({ activeBar, userId, userCoords, onDetectCoords, onGoStudio, onJobCreated, onToast }) => {
  const [title, setTitle] = useState('');
  const [roleNeeded, setRoleNeeded] = useState(JOB_ROLES[0]);
  const [contractType, setContractType] = useState('freelance');
  const [location, setLocation] = useState(activeBar.city || '');
  const [payInfo, setPayInfo] = useState('');
  const [description, setDescription] = useState('');
  const [msg, setMsg] = useState('');

  const missingStoreFields = getMissingBarFields(activeBar);

  if (missingStoreFields.length > 0) {
    return (
      <div className="panel">
        <h2>Cadastro da loja incompleto</h2>
        <p className="err">
          Para criar vagas, a loja precisa estar com o cadastro completo. Falta preencher:{' '}
          <b>{missingStoreFields.join(', ')}</b>.
        </p>
        <p className="mu mt-2">
          Preencha esses dados na aba <b>Visual da loja</b> do Editor (nome, @, localização exata,
          slogan e logo).
        </p>
        <button type="button" className="b full mt-3" onClick={onGoStudio}>
          Completar no Visual da loja
        </button>
      </div>
    );
  }

  const handlePublish = async () => {
    if (!title.trim() || !location.trim() || !description.trim()) {
      onToast('Informe título, localidade exata e descrição da vaga.');
      return;
    }
    const r = await sb
      .from('job_posts')
      .insert({
        bar_id: activeBar.id,
        created_by: userId,
        title: title.trim(),
        role_needed: roleNeeded,
        contract_type: contractType,
        location: location.trim(),
        pay_info: payInfo.trim() || null,
        description: description.trim() || null,
        is_open: true,
      })
      .select()
      .single();
    if (r.error) {
      onToast('Erro: ' + r.error.message);
      return;
    }
    setMsg('Vaga publicada!');
    setTitle('');
    setPayInfo('');
    setDescription('');
    await onJobCreated();
    onToast('Vaga publicada!');
  };

  return (
    <div className="panel">
      <h2>
        Criar nova vaga ({activeBar.name} · @{activeBar.handle})
      </h2>
      <label>Título da vaga *</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ex: Barman ou Garçom para fim de semana"
      />
      <div className="row">
        <div className="grow">
          <label>Função</label>
          <select value={roleNeeded} onChange={(e) => setRoleNeeded(e.target.value)}>
            {JOB_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r] || r}
              </option>
            ))}
          </select>
        </div>
        <div className="grow">
          <label>Tipo</label>
          <select value={contractType} onChange={(e) => setContractType(e.target.value)}>
            <option value="freelance">Freelance</option>
            <option value="contrato">Contrato</option>
          </select>
        </div>
      </div>

      <LocationPicker
        label="Localidade exata da vaga *"
        placeholder="Digite cidade/bairro ou use sua localização"
        value={location}
        userCoords={userCoords}
        showGeoButton={Boolean(onDetectCoords)}
        onDetectCoords={onDetectCoords}
        onToast={onToast}
        onChange={(val) => setLocation(val)}
      />

      <label>Pagamento / Detalhes</label>
      <input
        value={payInfo}
        onChange={(e) => setPayInfo(e.target.value)}
        placeholder="Ex: Diária ou fixo"
      />
      <label>Descrição *</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      <button type="button" className="b sm mt-2.5" onClick={() => void handlePublish()}>
        Publicar vaga
      </button>
      {msg && <p className="ok-txt">{msg}</p>}
    </div>
  );
};

export const ReceivedAppsSection: React.FC<{ receivedApps: JobApplication[] }> = ({
  receivedApps,
}) => {
  const byJob: Record<string, { title: string; items: JobApplication[] }> = {};
  receivedApps.forEach((a) => {
    const jid = a.job_id || 'geral';
    const jTitle = a.job_posts?.title || 'Vaga';
    if (!byJob[jid]) byJob[jid] = { title: jTitle, items: [] };
    byJob[jid].items.push(a);
  });
  const groups = Object.values(byJob);

  return (
    <div className="panel">
      <h2>Currículos recebidos por vaga ({receivedApps.length})</h2>
      {groups.length > 0 ? (
        groups.map((g) => (
          <div key={g.title} className="panel !bg-[var(--s2)] mt-3">
            <h3>
              Vaga: {g.title} ({g.items.length})
            </h3>
            <div className="list mt-2.5">
              {g.items.map((a) => {
                const sp = a.staff_profiles || ({} as StaffProfile);
                return (
                  <div key={a.id} className="!items-start">
                    <div className="row !items-start flex-1">
                      {sp.avatar_url && (
                        <img className="img-thumb" src={sp.avatar_url} alt="Rosto" />
                      )}
                      <div className="flex-1">
                        <b>{sp.display_name || 'Candidato'}</b>
                        {sp.location && (
                          <>
                            <br />
                            <span className="tag">
                              📍 {sp.location}
                              {sp.work_mode ? ` · ${sp.work_mode}` : ''}
                              {sp.experience_years ? ` · ${sp.experience_years}a exp.` : ''}
                            </span>
                          </>
                        )}
                        {Array.isArray(sp.skills) && sp.skills.length > 0 && (
                          <>
                            <br />
                            <span className="tag">Funções: {sp.skills.join(', ')}</span>
                          </>
                        )}
                        {sp.resume_pdf_url && (
                          <>
                            <br />
                            <a
                              href={sp.resume_pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[var(--ac)] text-[0.82rem]"
                            >
                              📄 Ver currículo em PDF
                            </a>
                          </>
                        )}
                        {sp.bio && <p className="mu mt-1.5">{sp.bio}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        <p className="mu mt-2">Nenhum currículo recebido ainda.</p>
      )}
    </div>
  );
};

export const MyStoreProfiles: React.FC<{
  bars: BarEntry[];
  activeBar: Bar | null;
  onUsePersonal: () => void;
  onOpenBar: (bar: Bar, role: string) => Promise<void>;
}> = ({ bars, activeBar, onUsePersonal, onOpenBar }) => (
  <div className="panel">
    <h2>Perfis de loja</h2>
    <p className="mu">Alterne entre seu perfil pessoal e as lojas em que você trabalha.</p>
    <div className="list">
      <div>
        <div className="flex-1">
          <b>Perfil pessoal</b>
          <br />
          <span className="mu">Acesso completo ao app</span>
        </div>
        {activeBar ? (
          <button type="button" className="b sm g" onClick={onUsePersonal}>
            Usar pessoal
          </button>
        ) : (
          <span className="chip st1">Ativo</span>
        )}
      </div>
      {bars.map((x) => {
        const active = activeBar?.id === x.bar.id;
        return (
          <div key={x.bar.id}>
            <div className="flex-1">
              <b>{x.bar.name}</b>
              <br />
              <span className="tag">
                {x.role}
                {x.bar.handle ? ` · @${x.bar.handle}` : ''}
              </span>
            </div>
            {active ? (
              <span className="chip st1">Ativo</span>
            ) : (
              <button
                type="button"
                className="b sm"
                onClick={() => void onOpenBar(x.bar, x.role)}
              >
                Entrar
              </button>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

export const CareersView: React.FC<{
  mode: 'store' | 'personal';
  isManager: boolean;
  activeBar: Bar | null;
  bars: BarEntry[];
  members: BarMember[];
  jobs: JobPost[];
  myApps: JobApplication[];
  receivedApps: JobApplication[];
  serviceReqs: ServiceRequest[];
  profile: StaffProfile;
  userId: string;
  userCoords: UserCoords | null;
  onDetectCoords: () => Promise<UserCoords | null>;
  onMembersUpdated: (members: BarMember[]) => void;
  onProfileSaved: (profile: StaffProfile) => void;
  onRefreshJobs: () => Promise<void>;
  onUsePersonal: () => void;
  onOpenBar: (bar: Bar, role: string) => Promise<void>;
  onGoStudio: () => void;
  onBack: () => void;
  onToast: (msg: string) => void;
}> = ({
  mode,
  isManager,
  activeBar,
  bars,
  members,
  jobs,
  myApps,
  receivedApps,
  serviceReqs,
  profile,
  userId,
  userCoords,
  onDetectCoords,
  onMembersUpdated,
  onProfileSaved,
  onRefreshJobs,
  onUsePersonal,
  onOpenBar,
  onGoStudio,
  onBack,
  onToast,
}) => {
  const storeMode = mode === 'store' && isManager && !!activeBar;
  const [subTab, setSubTab] = useState(storeMode ? 'createJob' : 'jobs');

  useEffect(() => {
    setSubTab(storeMode ? 'createJob' : 'jobs');
  }, [storeMode]);

  return (
    <div>
      {activeBar && (
        <button type="button" className="b g sm mb-3" onClick={onBack}>
          ← Voltar
        </button>
      )}
      <h1>{storeMode ? 'Equipe & Vagas da loja' : 'Meu currículo & Vagas'}</h1>

      <div className="chips !flex-wrap !overflow-visible">
        {storeMode ? (
          <>
            <span
              className={`chip ${subTab === 'createJob' ? 'on' : ''}`}
              onClick={() => setSubTab('createJob')}
            >
              Criar vagas
            </span>
            <span
              className={`chip ${subTab === 'apps' ? 'on' : ''}`}
              onClick={() => setSubTab('apps')}
            >
              Currículos ({receivedApps.length})
            </span>
            <span
              className={`chip ${subTab === 'team' ? 'on' : ''}`}
              onClick={() => setSubTab('team')}
            >
              Equipe
            </span>
          </>
        ) : (
          <>
            <span
              className={`chip ${subTab === 'jobs' ? 'on' : ''}`}
              onClick={() => setSubTab('jobs')}
            >
              Vagas na região
            </span>
            <span
              className={`chip ${subTab === 'profile' ? 'on' : ''}`}
              onClick={() => setSubTab('profile')}
            >
              Meu currículo
            </span>
            <span
              className={`chip ${subTab === 'req' ? 'on' : ''}`}
              onClick={() => setSubTab('req')}
            >
              Entrar na loja (@ + senha)
            </span>
            <span
              className={`chip ${subTab === 'stores' ? 'on' : ''}`}
              onClick={() => setSubTab('stores')}
            >
              Minhas lojas
            </span>
          </>
        )}
      </div>

      {storeMode && activeBar ? (
        subTab === 'createJob' ? (
          <CreateJobSection
            activeBar={activeBar}
            userId={userId}
            userCoords={userCoords}
            onDetectCoords={onDetectCoords}
            onGoStudio={onGoStudio}
            onJobCreated={onRefreshJobs}
            onToast={onToast}
          />
        ) : subTab === 'apps' ? (
          <ReceivedAppsSection receivedApps={receivedApps} />
        ) : (
          <TeamSection
            bar={activeBar}
            members={members}
            onMembersUpdated={onMembersUpdated}
            onToast={onToast}
          />
        )
      ) : subTab === 'jobs' ? (
        <JobsSection
          jobs={jobs}
          myApps={myApps}
          profile={profile}
          userId={userId}
          userCoords={userCoords}
          onDetectCoords={onDetectCoords}
          onRefreshJobs={onRefreshJobs}
          onGoProfile={() => setSubTab('profile')}
          onToast={onToast}
        />
      ) : subTab === 'profile' ? (
        <ProfileSection
          profile={profile}
          userId={userId}
          userCoords={userCoords}
          onDetectCoords={onDetectCoords}
          onProfileSaved={onProfileSaved}
          onToast={onToast}
        />
      ) : subTab === 'req' ? (
        <HandleServiceSection serviceReqs={serviceReqs} onRefresh={onRefreshJobs} />
      ) : (
        <MyStoreProfiles
          bars={bars}
          activeBar={activeBar}
          onUsePersonal={onUsePersonal}
          onOpenBar={onOpenBar}
        />
      )}
    </div>
  );
};

export const ExploreBarsView: React.FC<{
  jobs: JobPost[];
  userCoords: UserCoords | null;
}> = ({ jobs, userCoords }) => {
  const origin = userCoords || { lat: -15.7942, lon: -47.8822 };
  const map: Record<
    string,
    { id: string; name: string; handle?: string; city?: string; lat?: number | null; lon?: number | null; jobs: number }
  > = {};

  jobs.forEach((j) => {
    if (!j.bars?.name) return;
    const id = j.bar_id;
    if (!map[id]) {
      map[id] = {
        id,
        name: j.bars.name,
        handle: j.bars.handle,
        city: j.bars.city || j.location,
        lat: j.bars.lat,
        lon: j.bars.lon,
        jobs: 0,
      };
    }
    map[id].jobs++;
  });

  const list = Object.values(map)
    .map((b) => {
      const km =
        b.lat != null && b.lon != null
          ? haversineKm(origin, { lat: Number(b.lat), lon: Number(b.lon) })
          : 9999;
      return { ...b, _km: km };
    })
    .sort((a, b) => a._km - b._km);

  return (
    <div>
      <h1>Bares próximos</h1>
      <p className="mu">Com vagas abertas.</p>
      <div className="list mt-3">
        {list.length > 0 ? (
          list.map((b) => (
            <div key={b.id}>
              <div className="flex-1">
                <b>{b.name}</b>
                {b.handle && <span className="tag"> @{b.handle}</span>}
                {b.city && (
                  <>
                    <br />
                    <span className="tag">
                      📍 {b.city}
                      {b._km < 9000 ? ` · ${b._km.toFixed(1)} km` : ''}
                    </span>
                  </>
                )}
                <br />
                <span className="mu">{b.jobs} vaga(s)</span>
              </div>
            </div>
          ))
        ) : (
          <p className="mu">Nenhum bar com vaga no momento.</p>
        )}
      </div>
    </div>
  );
};
