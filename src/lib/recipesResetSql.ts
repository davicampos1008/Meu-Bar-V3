import { EXTENDED_RECIPES } from './recipesSeed';

const normName = (s: string) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const sqlStr = (s: string) => `'${String(s ?? '').replace(/'/g, "''")}'`;

const sqlEscE = (s: string) => {
  const str = String(s ?? '');
  if (str.includes('\n')) {
    return `E'${str.replace(/\\/g, '\\\\').replace(/'/g, "''").replace(/\n/g, '\\n')}'`;
  }
  return sqlStr(str);
};

const sqlArr = (arr: string[]) => `array[${arr.map(sqlStr).join(',')}]::text[]`;

export function buildResetRecipesSql(): string {
  const valuesRows = EXTENDED_RECIPES.map((r) => {
    const ingJson = `${sqlStr(JSON.stringify(r.ingredients))}::jsonb`;
    const stepsExpr = sqlEscE(r.steps);
    return `(${sqlStr(r.name)}, ${sqlStr(r.category)}, ${ingJson}, ${stepsExpr}, ${sqlStr(r.description)}, ${sqlStr(r.story)}, ${sqlStr(r.glass)}, ${sqlStr(r.technique)}, ${sqlStr(r.garnish)}, ${r.shaken ? 'true' : 'false'}, ${sqlArr(r.tags || [])}, ${sqlStr(normName(r.name))})`;
  });

  return `-- =============================================================================
-- MEU BAR — RESET TOTAL E REPOPULAÇÃO DO CATÁLOGO (${EXTENDED_RECIPES.length} DRINKS AUTORAIS E CLÁSSICOS)
-- =============================================================================
-- Pode rodar direto no SQL Editor do Supabase:
-- 1) Desabilita triggers de usuário (como orders_guard) apenas dentro desta transação
-- 2) Preserva pedidos antigos (copia o nome do drink em orders.recipe_name e altera FK para ON DELETE SET NULL)
-- 3) Guarda preços configurados por loja e restaura nos drinks mantidos
-- 4) Apaga TODAS as receitas de drinks antigas (incluindo genéricas/bugadas)
-- 5) Insere os ${EXTENDED_RECIPES.length} drinks originais e reativa os triggers ao final

begin;

-- 1) Evita erro "Sem permissão" de triggers como orders_guard() no SQL Editor (postgres sem JWT)
alter table public.orders disable trigger user;
alter table public.recipes disable trigger user;
alter table public.bar_prices disable trigger user;

-- 2) Garante que apagar receitas nunca apague histórico de pedidos nem quebre por NOT NULL
do $$
declare
  c_name text;
begin
  alter table public.orders alter column recipe_id drop not null;
  for c_name in
    select con.conname
    from pg_constraint con
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
    where con.conrelid = 'public.orders'::regclass
      and con.contype = 'f'
      and att.attname = 'recipe_id'
  loop
    execute format('alter table public.orders drop constraint if exists %I', c_name);
  end loop;
  alter table public.orders
    add constraint orders_recipe_id_fkey
    foreign key (recipe_id) references public.recipes(id) on delete set null;
end $$;

update public.orders o
set recipe_name = coalesce(nullif(o.recipe_name, ''), r.name)
from public.recipes r
where o.recipe_id = r.id;

-- 3) Faz backup temporário dos preços das lojas pelo nome normalizado do drink
create temp table if not exists _saved_bar_prices on commit drop as
select
  bp.bar_id,
  translate(lower(trim(r.name)), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn') as norm_name,
  bp.price
from public.bar_prices bp
join public.recipes r on r.id = bp.recipe_id
where coalesce(r.item_type, 'drink') = 'drink';

-- 4) Apaga TODAS as receitas de drinks antigas (mantém apenas petiscos/avulsos próprios de loja)
delete from public.recipes
where coalesce(item_type, 'drink') = 'drink';

-- 5) Insere o novo catálogo completo (${EXTENDED_RECIPES.length} drinks reais, clássicos, brasileiros e exóticos)
with seed(name, category, ingredients, steps, description, story, glass, technique, garnish, shaken, tags, norm_name) as (
  values
${valuesRows.join(',\n')}
)
insert into public.recipes (owner, name, category, ingredients, steps, instructions, description, story, glass, technique, garnish, shaken, tags, author_nick, is_public, verified, item_type)
select null, s.name, s.category, s.ingredients, s.steps, s.steps, s.description, s.story, s.glass, s.technique, s.garnish, s.shaken, s.tags, 'Meu Bar', true, true, 'drink'
from seed s;

-- 6) Restaura preços das lojas para os drinks que permaneceram com o mesmo nome
insert into public.bar_prices (bar_id, recipe_id, price)
select distinct on (sp.bar_id, r.id)
  sp.bar_id,
  r.id,
  sp.price
from _saved_bar_prices sp
join public.recipes r
  on translate(lower(trim(r.name)), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn') = sp.norm_name
where coalesce(r.item_type, 'drink') = 'drink'
on conflict (bar_id, recipe_id) do nothing;

-- 7) Reativa os triggers de usuário normalmente
alter table public.bar_prices enable trigger user;
alter table public.recipes enable trigger user;
alter table public.orders enable trigger user;

commit;
`;
}
