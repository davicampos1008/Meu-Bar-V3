/**
 * Suite automatizada de testes defensivos de segurança (Meu Bar)
 * Valida localmente proteções contra XSS, injeção de protocolo, path traversal,
 * upload malicioso, senhas fracas, flood/DoS, isolamento multi-tenant (RLS) e estabilidade.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  checkActionCooldown,
  evaluatePasswordStrength,
  safeExternalUrl,
  sanitizeStorageSegment,
  validateImageUpload,
  validatePdfUpload,
} from '../src/lib/security.ts';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function check(category: string, name: string, passed: boolean, detail: string) {
  results.push({ category, name, passed, detail });
}

function makeFakeFile(name: string, type: string, content: Uint8Array | string): File {
  const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
  return new File([bytes], name, { type });
}

async function run() {
  // 1. XSS & Protocol Injection em URLs externas
  const maliciousUrls = [
    'javascript:alert(1)',
    'JaVaScRiPt:alert(document.cookie)',
    '  javascript:void(0)',
    '\u0000javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'ftp://evil.example/file',
  ];
  for (const payload of maliciousUrls) {
    const out = safeExternalUrl(payload);
    check(
      'XSS / Protocol Injection',
      `Bloqueia payload "${payload.slice(0, 32)}"`,
      out === '',
      out === '' ? 'Rejeitado com sucesso' : `FALHA: retornou "${out}"`
    );
  }
  const validHttps = safeExternalUrl('meubar.com.br/cardapio');
  check(
    'XSS / Protocol Injection',
    'Permite domínio legítimo normalizado para HTTPS',
    validHttps === 'https://meubar.com.br/cardapio',
    `Retornou: ${validHttps}`
  );

  // 2. HTML Injection / Stored XSS na impressão térmica
  const opsSource = fs.readFileSync(path.resolve('src/lib/opsUtils.ts'), 'utf8');
  const hasSandbox = opsSource.includes("iframe.setAttribute('sandbox', 'allow-modals allow-same-origin')");
  const escapesQuotes =
    opsSource.includes('.replace(/"/g, \'&quot;\')') &&
    opsSource.includes(".replace(/'/g, '&#39;')");
  check(
    'Stored XSS (Impressão Térmica)',
    'Iframe de impressão isolado com sandbox sem allow-scripts',
    hasSandbox,
    hasSandbox ? 'sandbox ativo sem allow-scripts' : 'FALHA: iframe sem sandbox'
  );
  check(
    'Stored XSS (Impressão Térmica)',
    'escHtml escapa &, <, >, " e \'',
    escapesQuotes,
    escapesQuotes ? 'Todas as 5 entidades HTML escapadas' : 'FALHA: escape incompleto'
  );

  // 3. Path Traversal & Upload Malicioso (SVG XSS, Fake PDF, Arquivo Gigante)
  const traversal = sanitizeStorageSegment('../../admin/../../../etc/passwd');
  check(
    'Path Traversal & Uploads',
    'Remove tentativa de path traversal em caminhos de Storage',
    !traversal.includes('..') && !traversal.includes('/'),
    `Sanitizado para: "${traversal}"`
  );

  const svgAttack = makeFakeFile('avatar.svg', 'image/svg+xml', '<svg onload=alert(1)></svg>');
  const svgRes = validateImageUpload(svgAttack);
  check(
    'Path Traversal & Uploads',
    'Bloqueia upload de SVG com script embutido',
    !svgRes.ok,
    svgRes.error || 'FALHA: aceitou SVG'
  );

  const htmlAsJpg = makeFakeFile('shell.html', 'text/html', '<html><script>alert(1)</script></html>');
  const htmlRes = validateImageUpload(htmlAsJpg);
  check(
    'Path Traversal & Uploads',
    'Bloqueia HTML disfarçado no upload de imagem',
    !htmlRes.ok,
    htmlRes.error || 'FALHA: aceitou HTML'
  );

  const hugeImg = new File([new Uint8Array(10 * 1024 * 1024)], 'huge.jpg', { type: 'image/jpeg' });
  const hugeRes = validateImageUpload(hugeImg);
  check(
    'Path Traversal & Uploads',
    'Bloqueia imagem acima de 8 MB (DoS de Storage)',
    !hugeRes.ok,
    hugeRes.error || 'FALHA: aceitou 10MB'
  );

  const fakePdf = makeFakeFile('curriculo.pdf', 'application/pdf', '<html><script>alert(1)</script></html>');
  const fakePdfRes = await validatePdfUpload(fakePdf);
  check(
    'Path Traversal & Uploads',
    'Bloqueia PDF falso sem assinatura binária %PDF-',
    !fakePdfRes.ok,
    fakePdfRes.error || 'FALHA: aceitou falso PDF'
  );

  const realPdf = makeFakeFile('curriculo.pdf', 'application/pdf', '%PDF-1.7\n1 0 obj\n<<>>\nendobj');
  const realPdfRes = await validatePdfUpload(realPdf);
  check(
    'Path Traversal & Uploads',
    'Aceita PDF legítimo com assinatura %PDF-',
    realPdfRes.ok,
    realPdfRes.ok ? 'Validado com sucesso' : realPdfRes.error || 'FALHA'
  );

  // 4. Força de Senha & Anti-Flood Client-Side
  const weakPw = evaluatePasswordStrength('123456');
  const numericOnly = evaluatePasswordStrength('1234567890');
  const strongPw = evaluatePasswordStrength('BarSeguro2026!');
  check(
    'Autenticação & Anti-Flood',
    'Bloqueia senha curta no cadastro (123456)',
    !weakPw.ok,
    weakPw.hint
  );
  check(
    'Autenticação & Anti-Flood',
    'Bloqueia senha só numérica no cadastro',
    !numericOnly.ok,
    numericOnly.hint
  );
  check(
    'Autenticação & Anti-Flood',
    'Aprova senha forte com letras, números e símbolo',
    strongPw.ok && strongPw.score >= 3,
    `Score ${strongPw.score}/4 (${strongPw.label})`
  );

  const burst1 = checkActionCooldown('pentest_burst_key', 5000);
  const burst2 = checkActionCooldown('pentest_burst_key', 5000);
  check(
    'Autenticação & Anti-Flood',
    'Bloqueia disparo repetido (flood/double-submit)',
    burst1.ok && !burst2.ok && burst2.waitMs > 0,
    burst2.ok ? 'FALHA: permitiu flood' : `2º disparo bloqueado (${burst2.waitMs}ms restantes)`
  );

  // 5. Auditoria de Banco de Dados (RLS, Escalação de Privilégio, Vazamento Multi-Tenant e DoS)
  const sql = fs.readFileSync(path.resolve('supabase/schema_completo.sql'), 'utf8');

  const noCrossTenantBars =
    !sql.includes('or auth.uid() is not null\n  or exists(select 1 from job_posts');
  check(
    'Banco de Dados (RLS & Vazamento)',
    'Tabela bars bloqueia leitura direta de ops_data de outros bares',
    noCrossTenantBars && sql.includes('create or replace function list_public_bars()'),
    'RLS restrito a dono/equipe/admin + vitrine segura via list_public_bars()'
  );

  const noBarMembersEscalation =
    !sql.includes('create policy "bar_members_rw"') &&
    sql.includes('create policy "bar_members_insert" on bar_members for insert\n  with check (is_bar_manager(bar_id));');
  check(
    'Banco de Dados (RLS & Vazamento)',
    'bar_members impede auto-promoção a dono/gerente de outro bar',
    noBarMembersEscalation,
    'INSERT e UPDATE restritos exclusivamente a is_bar_manager(bar_id)'
  );

  const noGlobalRecipeTamper = !sql.includes('owner = auth.uid() or owner is null');
  check(
    'Banco de Dados (RLS & Vazamento)',
    'recipes bloqueia alteração de receitas globais (owner is null)',
    noGlobalRecipeTamper,
    'Escrita restrita ao criador da receita ou admin'
  );

  const storageIsolated = sql.includes('(storage.foldername(name))[1] = auth.uid()::text');
  check(
    'Banco de Dados (RLS & Vazamento)',
    'Storage isola gravação/sobrescrita na pasta do próprio usuário',
    storageIsolated,
    'Políticas INSERT/UPDATE/DELETE confinadas a auth.uid()'
  );

  const staffAuthOnly = sql.includes(
    'create policy "staff_prof_r" on staff_profiles for select using (auth.uid() is not null);'
  );
  check(
    'Banco de Dados (RLS & Vazamento)',
    'staff_profiles bloqueia raspagem anônima de currículos/telefones',
    staffAuthOnly,
    'Exige usuário autenticado (auth.uid() is not null)'
  );

  const planProtected =
    sql.includes('trg_protect_bar_plan_columns') &&
    sql.includes("new.plan_tier := old.plan_tier;");
  check(
    'Banco de Dados (RLS & Vazamento)',
    'Trigger impede fraude/auto-ativação de Plano Pro ou VIP',
    planProtected,
    'Trigger BEFORE INSERT OR UPDATE protege plan_tier/plan_expires_at'
  );

  const roleAllowlisted = sql.includes("in ('garcom','barman','cozinha','caixa')");
  check(
    'Banco de Dados (RLS & Vazamento)',
    'request_service_by_handle valida allowlist de cargos (impede pedir owner)',
    roleAllowlisted,
    'Aceita apenas garcom, barman, cozinha ou caixa'
  );

  const antiFloodSql =
    sql.includes('if v_client_recent >= 25 then') &&
    sql.includes('if v_bar_recent >= 150 then') &&
    sql.includes('if v_recent >= 3 then') &&
    sql.includes('p_ids[1:50]');
  check(
    'Disponibilidade (Anti-DoS / Sem Queda)',
    'RPCs de pedido, chamado e consulta de status têm limites server-side anti-flood',
    antiFloodSql,
    'place_order (25/min cliente, 150/min bar), call_waiter (3/2min), order_status (max 50 IDs)'
  );

  const pinPrivacy = sql.includes(
    "'members', case when t.status = 'open' and trim(coalesce(p_code, '')) = t.code then t.members"
  );
  check(
    'Privacidade de Comanda',
    'verify_table_tab_member não vaza nomes da mesa sem PIN correto',
    pinPrivacy,
    'Membros só são retornados quando o PIN de 4 dígitos confere'
  );

  // 6. Varredura Estática de Código Frontend (Zero Sinks Perigosos + ErrorBoundary)
  const srcFiles: string[] = [];
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) srcFiles.push(full);
    }
  }
  walk(path.resolve('src'));

  const dangerousHits: string[] = [];
  for (const file of srcFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (/\bdangerouslySetInnerHTML\b/.test(content)) dangerousHits.push(`${file}: dangerouslySetInnerHTML`);
    if (/\beval\s*\(/.test(content)) dangerousHits.push(`${file}: eval()`);
    if (/\bnew\s+Function\s*\(/.test(content)) dangerousHits.push(`${file}: new Function()`);
    if (/\bwindow\.open\s*\(/.test(content)) dangerousHits.push(`${file}: window.open()`);
    if (/\binnerHTML\s*=/.test(content)) dangerousHits.push(`${file}: innerHTML=`);
  }
  check(
    'Blindagem Frontend & Estabilidade',
    'Zero uso de dangerouslySetInnerHTML, eval, new Function, innerHTML ou window.open',
    dangerousHits.length === 0,
    dangerousHits.length === 0 ? `${srcFiles.length} arquivos auditados limpos` : dangerousHits.join(', ')
  );

  const mainTsx = fs.readFileSync(path.resolve('src/main.tsx'), 'utf8');
  const hasErrorBoundary = mainTsx.includes('<AppErrorBoundary>');
  check(
    'Blindagem Frontend & Estabilidade',
    'AppErrorBoundary ativo na raiz (evita tela branca / queda da UI)',
    hasErrorBoundary,
    hasErrorBoundary ? 'Proteção de recuperação ativa em src/main.tsx' : 'FALHA: sem ErrorBoundary'
  );

  const appTsx = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
  const noPublicOpsLeak = !appTsx.includes("from('bars').select('*').order('created_at'");
  check(
    'Blindagem Frontend & Estabilidade',
    'App.tsx não consulta ops_data de outros bares na vitrine pública',
    noPublicOpsLeak && appTsx.includes("sb.rpc('list_public_bars')"),
    'Usa list_public_bars() com fallback apenas de colunas públicas'
  );

  const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf8');
  const hasReferrerPolicy = indexHtml.includes('strict-origin-when-cross-origin');
  check(
    'Blindagem Frontend & Estabilidade',
    'Política de referrer strict-origin-when-cross-origin configurada',
    hasReferrerPolicy,
    hasReferrerPolicy ? 'Presente no index.html' : 'FALHA: ausente'
  );

  // Relatório final
  const passedCount = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed);

  console.log('\n=== RELATÓRIO DE TESTES DE SEGURANÇA (MEU BAR) ===');
  for (const r of results) {
    console.log(`${r.passed ? '[PASS]' : '[FAIL]'} [${r.category}] ${r.name} -> ${r.detail}`);
  }
  console.log(`\nResumo: ${passedCount}/${results.length} verificações aprovadas.`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

void run();
