-- Meu Bar — Esquema completo e idempotente para Supabase.
-- Pode rodar no SQL Editor quantas vezes precisar (não apaga dados existentes).
create extension if not exists unaccent with schema extensions;

-- 1) Bares
create table if not exists bars (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  kind text not null default 'home',
  accepting_orders boolean not null default true,
  shakers int[] not null default '{750,500}',
  created_at timestamptz default now()
);

-- Atualiza constraint de kind para aceitar 'home', 'bar', 'counter', 'tables', 'casa'
alter table bars drop constraint if exists bars_kind_check;
alter table bars add constraint bars_kind_check check (kind in ('home','bar','counter','tables','casa'));

alter table bars add column if not exists tiers jsonb;
alter table bars add column if not exists handle text;
alter table bars add column if not exists city text;
alter table bars add column if not exists lat double precision;
alter table bars add column if not exists lon double precision;
alter table bars add column if not exists logo_url text;
alter table bars add column if not exists banner_url text;
alter table bars add column if not exists slogan text;
alter table bars add column if not exists name_font text default 'store-font-serif';
alter table bars add column if not exists crest_border text default 'crest-border-gold';
alter table bars add column if not exists crest_base text default 'circle';
alter table bars add column if not exists crest_icon text default 'glass';
alter table bars add column if not exists crest_ornament text default 'none';
alter table bars add column if not exists logo_pos text default 'left';
alter table bars add column if not exists name_pos text default 'left';
alter table bars add column if not exists menu_display_mode text default 'grid-classic';
alter table bars add column if not exists menu_presets jsonb default '[]'::jsonb;
alter table bars add column if not exists active_menu_preset text;
alter table bars add column if not exists color_bg text;
alter table bars add column if not exists color_surface text;
alter table bars add column if not exists color_accent text;
alter table bars add column if not exists color_ok text;
alter table bars add column if not exists color_text text;
alter table bars add column if not exists base_cost numeric(8,2) default 6;
alter table bars add column if not exists menu_design jsonb default '{}'::jsonb;
alter table bars add column if not exists menu_promotions jsonb default '[]'::jsonb;
alter table bars add column if not exists active_promotion_id text;
alter table bars add column if not exists table_names jsonb default '[]'::jsonb;

create unique index if not exists bars_handle_unique on bars (lower(handle)) where handle is not null;

-- 2) Estoque do bar
create table if not exists bar_items (
  id uuid primary key default gen_random_uuid(),
  bar_id uuid not null references bars on delete cascade,
  category text,
  name text not null,
  in_stock boolean not null default true,
  created_at timestamptz default now()
);
alter table bar_items alter column category drop not null;
alter table bar_items add column if not exists brand text;
alter table bar_items add column if not exists variant text;
alter table bar_items add column if not exists size_ml int;
alter table bar_items add column if not exists level text;
alter table bar_items add column if not exists qty int;
alter table bar_items add column if not exists unit_cost numeric(8,2) default 0;

-- 3) Receitas
create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  owner uuid default auth.uid() references auth.users on delete set null,
  name text not null,
  category text not null default 'Refrescantes',
  ingredients jsonb not null default '[]',
  steps text not null default '',
  story text,
  image_url text,
  shaken boolean not null default true,
  author_nick text not null default 'Meu Bar',
  is_public boolean not null default true,
  created_at timestamptz default now()
);
alter table recipes add column if not exists instructions text;
alter table recipes add column if not exists description text;
alter table recipes add column if not exists glass text;
alter table recipes add column if not exists technique text;
alter table recipes add column if not exists garnish text;
alter table recipes add column if not exists tags text[];
alter table recipes add column if not exists sources jsonb;
alter table recipes add column if not exists verified boolean not null default false;
alter table recipes add column if not exists base_cost numeric(8,2);

-- 4) Preços por bar
create table if not exists bar_prices (
  bar_id uuid references bars on delete cascade,
  recipe_id uuid references recipes on delete cascade,
  price numeric(8,2) not null,
  primary key (bar_id, recipe_id)
);

-- 5) Pedidos
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  bar_id uuid not null references bars on delete cascade,
  recipe_id uuid not null references recipes on delete cascade,
  client_name text not null,
  qty int not null default 1,
  note text,
  price numeric(8,2),
  status text not null default 'pending' check (status in ('pending','ready','done')),
  paid boolean not null default false,
  created_at timestamptz default now(),
  ready_at timestamptz
);
alter table orders add column if not exists customer_name text;
alter table orders add column if not exists recipe_name text;
alter table orders add column if not exists unit_price numeric(8,2);
alter table orders add column if not exists table_label text;

create table if not exists table_tabs (
  id uuid primary key default gen_random_uuid(),
  bar_id uuid not null references bars on delete cascade,
  table_label text not null,
  code text not null,
  opened_by text not null,
  members text[] not null default '{}',
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz default now(),
  closed_at timestamptz
);
create unique index if not exists table_tabs_one_open_per_table
  on table_tabs (bar_id, lower(trim(table_label)))
  where status = 'open';

alter table orders add column if not exists table_tab_id uuid references table_tabs(id) on delete set null;
create index if not exists orders_bar_created on orders (bar_id, created_at desc);

-- 6) Admins, Equipe, Senhas de Serviço, Solicitações, Currículos e Vagas
create table if not exists admins (
  user_id uuid primary key references auth.users on delete cascade
);

create table if not exists bar_members (
  id uuid primary key default gen_random_uuid(),
  bar_id uuid not null references bars on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'garcom',
  name text,
  created_at timestamptz default now(),
  unique (bar_id, user_id)
);

alter table bar_members drop constraint if exists bar_members_role_check;
alter table bar_members add constraint bar_members_role_check check (role in ('owner','dono','gerente','barman','garcom','cozinha','caixa','outro'));

create table if not exists bar_service_passwords (
  id uuid primary key default gen_random_uuid(),
  bar_id uuid not null references bars on delete cascade,
  password text,
  access_code text,
  label text,
  created_at timestamptz default now()
);
alter table bar_service_passwords add column if not exists password text;
alter table bar_service_passwords add column if not exists access_code text;
alter table bar_service_passwords alter column password drop not null;
alter table bar_service_passwords alter column access_code drop not null;

create table if not exists service_requests (
  id uuid primary key default gen_random_uuid(),
  bar_id uuid not null references bars on delete cascade,
  requester_id uuid not null references auth.users on delete cascade,
  requester_name text,
  role text not null default 'garcom',
  status text not null default 'pendente',
  created_at timestamptz default now()
);

create table if not exists staff_profiles (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  resume_pdf_url text,
  location text,
  skills text[] default '{}',
  work_mode text default 'ambos',
  experience_years int default 0,
  bio text,
  availability text,
  updated_at timestamptz default now()
);

create table if not exists job_posts (
  id uuid primary key default gen_random_uuid(),
  bar_id uuid not null references bars on delete cascade,
  created_by uuid references auth.users on delete set null,
  title text not null,
  role_needed text not null,
  contract_type text not null default 'freelance',
  location text not null,
  pay_info text,
  description text,
  is_open boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references job_posts on delete cascade,
  applicant_id uuid not null references auth.users on delete cascade,
  message text,
  created_at timestamptz default now(),
  unique (job_id, applicant_id)
);

-- RLS
alter table bars enable row level security;
alter table bar_items enable row level security;
alter table recipes enable row level security;
alter table bar_prices enable row level security;
alter table orders enable row level security;
alter table table_tabs enable row level security;
alter table admins enable row level security;
alter table bar_members enable row level security;
alter table bar_service_passwords enable row level security;
alter table service_requests enable row level security;
alter table staff_profiles enable row level security;
alter table job_posts enable row level security;
alter table job_applications enable row level security;

create or replace function is_bar_staff(p_bar uuid) returns boolean language sql security definer set search_path=public as $$
  select exists(select 1 from bars b where b.id = p_bar and b.owner = auth.uid())
      or exists(select 1 from bar_members m where m.bar_id = p_bar and m.user_id = auth.uid());
$$;

create or replace function is_bar_manager(p_bar uuid) returns boolean language sql security definer set search_path=public as $$
  select exists(select 1 from bars b where b.id = p_bar and b.owner = auth.uid())
      or exists(select 1 from bar_members m where m.bar_id = p_bar and m.user_id = auth.uid() and m.role in ('owner','dono','gerente'));
$$;

drop policy if exists "bars" on bars;
create policy "bars" on bars for select using (owner = auth.uid() or is_bar_staff(id) or exists(select 1 from job_posts j where j.bar_id = id and j.is_open));
drop policy if exists "bars_insert" on bars;
create policy "bars_insert" on bars for insert with check (owner = auth.uid());
drop policy if exists "bars_update" on bars;
create policy "bars_update" on bars for update using (is_bar_manager(id));
drop policy if exists "bars_delete" on bars;
create policy "bars_delete" on bars for delete using (owner = auth.uid());

drop policy if exists "itens" on bar_items;
create policy "itens" on bar_items for all using (is_bar_staff(bar_id)) with check (is_bar_staff(bar_id));

drop policy if exists "precos" on bar_prices;
create policy "precos" on bar_prices for all using (is_bar_staff(bar_id)) with check (is_bar_manager(bar_id));

drop policy if exists "pedidos" on orders;
create policy "pedidos" on orders for all using (is_bar_staff(bar_id)) with check (is_bar_staff(bar_id));

drop policy if exists "table_tabs_staff" on table_tabs;
create policy "table_tabs_staff" on table_tabs for all using (is_bar_staff(bar_id)) with check (is_bar_staff(bar_id));

drop policy if exists "admin ve o proprio" on admins;
create policy "admin ve o proprio" on admins for select using (user_id = auth.uid());

drop policy if exists "receitas ler" on recipes;
create policy "receitas ler" on recipes for select using (is_public or owner = auth.uid());
drop policy if exists "receitas criar" on recipes;
create policy "receitas criar" on recipes for insert with check (owner = auth.uid() or owner is null);
drop policy if exists "receitas editar" on recipes;
create policy "receitas editar" on recipes for update using (owner = auth.uid() or owner is null or exists(select 1 from admins a where a.user_id = auth.uid()));
drop policy if exists "receitas apagar" on recipes;
create policy "receitas apagar" on recipes for delete using (owner = auth.uid());

drop policy if exists "bar_members_rw" on bar_members;
create policy "bar_members_rw" on bar_members for all using (user_id = auth.uid() or is_bar_manager(bar_id)) with check (user_id = auth.uid() or is_bar_manager(bar_id));

drop policy if exists "bar_pw_rw" on bar_service_passwords;
create policy "bar_pw_rw" on bar_service_passwords for all using (is_bar_manager(bar_id)) with check (is_bar_manager(bar_id));

drop policy if exists "svc_req_rw" on service_requests;
create policy "svc_req_rw" on service_requests for all using (requester_id = auth.uid() or is_bar_manager(bar_id)) with check (requester_id = auth.uid() or is_bar_manager(bar_id));

drop policy if exists "staff_prof_r" on staff_profiles;
create policy "staff_prof_r" on staff_profiles for select using (true);
drop policy if exists "staff_prof_w" on staff_profiles;
create policy "staff_prof_w" on staff_profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "job_posts_r" on job_posts;
create policy "job_posts_r" on job_posts for select using (is_open or is_bar_manager(bar_id));
drop policy if exists "job_posts_w" on job_posts;
create policy "job_posts_w" on job_posts for all using (is_bar_manager(bar_id)) with check (is_bar_manager(bar_id));

drop policy if exists "job_apps_rw" on job_applications;
create policy "job_apps_rw" on job_applications for all using (applicant_id = auth.uid() or exists(select 1 from job_posts j where j.id = job_id and is_bar_manager(j.bar_id))) with check (applicant_id = auth.uid());

-- Storage buckets ('recipes' e 'bar-media')
insert into storage.buckets (id, name, public) values ('recipes', 'recipes', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('bar-media', 'bar-media', true) on conflict do nothing;

drop policy if exists "fotos ver" on storage.objects;
create policy "fotos ver" on storage.objects for select using (bucket_id in ('recipes', 'bar-media'));
drop policy if exists "fotos enviar" on storage.objects;
create policy "fotos enviar" on storage.objects for insert to authenticated with check (bucket_id in ('recipes', 'bar-media'));

-- RPCs do Cardápio QR (sem login) e Solicitação por @
create or replace function get_menu(p_bar uuid) returns json language sql security definer set search_path=public,extensions as $$
select json_build_object(
  'bar', json_build_object(
    'id', b.id,
    'name', b.name,
    'kind', b.kind,
    'open', b.accepting_orders,
    'slogan', b.slogan,
    'city', b.city,
    'logo_url', b.logo_url,
    'banner_url', b.banner_url,
    'name_font', b.name_font,
    'crest_border', b.crest_border,
    'crest_base', b.crest_base,
    'crest_icon', b.crest_icon,
    'crest_ornament', b.crest_ornament,
    'logo_pos', b.logo_pos,
    'name_pos', b.name_pos,
    'menu_display_mode', b.menu_display_mode,
    'color_bg', b.color_bg,
    'color_surface', b.color_surface,
    'color_accent', b.color_accent,
    'color_ok', b.color_ok,
    'color_text', b.color_text,
    'menu_design', b.menu_design,
    'menu_promotions', b.menu_promotions,
    'active_promotion_id', b.active_promotion_id,
    'menu_presets', b.menu_presets,
    'active_menu_preset', b.active_menu_preset
  ),
  'active_clients', coalesce((
    select json_agg(distinct cname order by cname)
    from (
      select trim(coalesce(nullif(o.client_name, ''), o.customer_name, '')) as cname
      from orders o
      where o.bar_id = b.id
        and (o.status <> 'done' or o.paid = false)
    ) t
    where t.cname <> ''
  ), '[]'::json),
  'items', coalesce((
    select json_agg(json_build_object(
      'id', r.id,
      'name', r.name,
      'category', r.category,
      'image_url', r.image_url,
      'price', p.price,
      'ingredients', r.ingredients,
      'description', r.description,
      'story', r.story,
      'tags', r.tags
    ) order by r.name)
    from recipes r
    left join bar_prices p on p.bar_id = b.id and p.recipe_id = r.id
    where (r.is_public is not false or r.owner = b.owner or p.price is not null)
      and (lower(coalesce(b.kind, '')) in ('home', 'casa') or p.price is not null)
      and not exists (
        select 1 from jsonb_array_elements(coalesce(r.ingredients, '[]'::jsonb)) i
        where trim(coalesce(i->>'n', '')) <> ''
          and lower(unaccent(trim(i->>'n'))) not in ('gelo', 'agua', 'agua gelada', 'agua filtrada', 'agua mineral')
          and lower(unaccent(trim(i->>'n'))) not like 'gelo %'
          and not exists (
            select 1 from bar_items bi
            where bi.bar_id = b.id and bi.in_stock
              and (
                lower(unaccent(trim(bi.name))) = lower(unaccent(trim(i->>'n')))
                or lower(unaccent(trim(bi.name))) like lower(unaccent(trim(i->>'n'))) || ' %'
                or lower(unaccent(trim(bi.name))) like lower(unaccent(trim(i->>'n'))) || '-%'
                or lower(unaccent(trim(bi.name))) like lower(unaccent(trim(i->>'n'))) || '/%'
                or lower(unaccent(trim(bi.name))) like lower(unaccent(trim(i->>'n'))) || '(%'
              )
          )
      )
  ), '[]'::json)
)
from bars b where b.id = p_bar $$;

create or replace function get_table_tab_state(p_bar uuid, p_table text) returns json
language sql security definer set search_path=public,extensions as $$
  select coalesce(
    (
      select json_build_object(
        'open', true,
        'tab_id', t.id,
        'table_label', t.table_label,
        'opened_by', t.opened_by,
        'members', t.members,
        'created_at', t.created_at
      )
      from table_tabs t
      where t.bar_id = p_bar
        and lower(trim(t.table_label)) = lower(trim(coalesce(p_table, '')))
        and t.status = 'open'
      limit 1
    ),
    json_build_object('open', false)
  )
$$;

create or replace function open_or_join_table_tab(p_bar uuid, p_table text, p_name text, p_code text default null) returns json
language plpgsql security definer set search_path=public,extensions as $$
declare
  v_bar bars;
  v_table text := left(trim(coalesce(p_table, '')), 60);
  v_name text := left(trim(coalesce(p_name, '')), 40);
  v_code text := trim(coalesce(p_code, ''));
  v_tab table_tabs;
  v_gen_code text;
  v_members text[];
begin
  select * into v_bar from bars where id = p_bar;
  if v_bar.id is null then
    return json_build_object('ok', false, 'error', 'Bar não encontrado.');
  end if;
  if v_table = '' then
    return json_build_object('ok', false, 'error', 'Mesa inválida.');
  end if;
  if length(v_name) < 2 then
    return json_build_object('ok', false, 'error', 'Informe seu nome (mínimo 2 letras).');
  end if;

  select * into v_tab from table_tabs
  where bar_id = p_bar
    and lower(trim(table_label)) = lower(v_table)
    and status = 'open'
  limit 1;

  if v_tab.id is null then
    v_gen_code := lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
    begin
      insert into table_tabs(bar_id, table_label, code, opened_by, members, status)
      values (p_bar, v_table, v_gen_code, v_name, array[v_name], 'open')
      returning * into v_tab;

      return json_build_object(
        'ok', true,
        'is_new', true,
        'tab_id', v_tab.id,
        'table_label', v_tab.table_label,
        'code', v_tab.code,
        'opened_by', v_tab.opened_by,
        'members', v_tab.members
      );
    exception when unique_violation then
      select * into v_tab from table_tabs
      where bar_id = p_bar
        and lower(trim(table_label)) = lower(v_table)
        and status = 'open'
      limit 1;
    end;
  end if;

  if v_code = '' then
    return json_build_object(
      'ok', false,
      'needs_code', true,
      'tab_id', v_tab.id,
      'opened_by', v_tab.opened_by,
      'error', 'Esta mesa já tem comanda aberta por ' || v_tab.opened_by || '. Digite o código de 4 dígitos exibido no cardápio da mesa.'
    );
  end if;

  if v_code <> v_tab.code then
    return json_build_object(
      'ok', false,
      'needs_code', true,
      'tab_id', v_tab.id,
      'opened_by', v_tab.opened_by,
      'error', 'Código da mesa incorreto. Confira os 4 dígitos no cardápio de quem abriu a mesa.'
    );
  end if;

  v_members := coalesce(v_tab.members, '{}'::text[]);
  if not exists (
    select 1 from unnest(v_members) m
    where lower(unaccent(trim(m))) = lower(unaccent(v_name))
  ) then
    v_members := array_append(v_members, v_name);
    update table_tabs set members = v_members where id = v_tab.id;
  end if;

  return json_build_object(
    'ok', true,
    'is_new', false,
    'tab_id', v_tab.id,
    'table_label', v_tab.table_label,
    'code', v_tab.code,
    'opened_by', v_tab.opened_by,
    'members', v_members
  );
end $$;

create or replace function verify_table_tab_member(p_tab_id uuid, p_code text) returns json
language sql security definer set search_path=public,extensions as $$
  select coalesce(
    (
      select json_build_object(
        'valid', (t.status = 'open' and trim(coalesce(p_code, '')) = t.code),
        'status', t.status,
        'tab_id', t.id,
        'table_label', t.table_label,
        'code', case when t.status = 'open' and trim(coalesce(p_code, '')) = t.code then t.code else null end,
        'opened_by', t.opened_by,
        'members', t.members
      )
      from table_tabs t
      where t.id = p_tab_id
      limit 1
    ),
    json_build_object('valid', false, 'status', 'closed')
  )
$$;

drop function if exists place_order(uuid, text, uuid, int, text);
create or replace function place_order(
  p_bar uuid,
  p_name text,
  p_recipe uuid,
  p_qty int,
  p_note text,
  p_table text default null,
  p_tab_id uuid default null
) returns uuid
language plpgsql security definer set search_path=public,extensions as $$
declare
  b bars;
  pr numeric;
  rname text;
  oid uuid;
  v_tab table_tabs;
  v_table text := nullif(left(trim(coalesce(p_table, '')), 60), '');
begin
  select * into b from bars where id = p_bar;
  if b.id is null then raise exception 'Bar não encontrado'; end if;
  if not b.accepting_orders then raise exception 'Pedidos pausados no momento'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Informe seu nome'; end if;
  if p_qty < 1 or p_qty > 5 then raise exception 'Quantidade inválida'; end if;

  if p_tab_id is not null then
    select * into v_tab from table_tabs where id = p_tab_id and bar_id = p_bar;
    if v_tab.id is null or v_tab.status <> 'open' then
      raise exception 'A comanda desta mesa já foi fechada no caixa. Atualize para abrir uma nova.';
    end if;
    v_table := v_tab.table_label;
  end if;

  select price into pr from bar_prices where bar_id = p_bar and recipe_id = p_recipe;
  select name into rname from recipes where id = p_recipe;
  if b.kind not in ('home', 'casa') and pr is null then raise exception 'Drink indisponível'; end if;

  insert into orders(bar_id, recipe_id, client_name, customer_name, recipe_name, qty, note, price, unit_price, table_label, table_tab_id)
  values(p_bar, p_recipe, left(trim(p_name), 40), left(trim(p_name), 40), rname, p_qty, left(p_note, 140), pr, pr, v_table, p_tab_id)
  returning id into oid;
  return oid;
end $$;

create or replace function order_status(p_ids uuid[]) returns table(id uuid, status text) language sql security definer set search_path=public as $$
  select o.id, o.status from orders o where o.id = any(p_ids)
$$;

create or replace function request_service_by_handle(p_handle text, p_password text, p_role text default 'garcom') returns uuid
language plpgsql security definer set search_path=public as $$
declare
  clean_handle text := lower(regexp_replace(trim(coalesce(p_handle, '')), '^@', ''));
  b bars;
  pw_ok boolean;
  prof_name text;
  rid uuid;
begin
  if auth.uid() is null then raise exception 'Faça login primeiro'; end if;
  select * into b from bars where lower(handle) = clean_handle;
  if b.id is null then raise exception 'Bar @% não encontrado', clean_handle; end if;
  select exists(
    select 1 from bar_service_passwords
    where bar_id = b.id
      and (password = trim(coalesce(p_password, '')) or access_code = trim(coalesce(p_password, '')))
  ) into pw_ok;
  if not pw_ok then raise exception 'Senha da loja incorreta'; end if;
  select display_name into prof_name from staff_profiles where user_id = auth.uid();
  insert into service_requests(bar_id, requester_id, requester_name, role, status)
  values (b.id, auth.uid(), coalesce(prof_name, 'Profissional'), coalesce(p_role, 'garcom'), 'pendente')
  returning id into rid;
  return rid;
end $$;

create or replace function active_client_names(p_bar uuid) returns text[]
language sql security definer set search_path=public as $$
  select coalesce(
    array_agg(distinct t.cname order by t.cname),
    '{}'::text[]
  )
  from (
    select trim(coalesce(nullif(o.client_name, ''), o.customer_name, '')) as cname
    from orders o
    where o.bar_id = p_bar
      and (o.status <> 'done' or o.paid = false)
  ) t
  where t.cname <> ''
$$;

grant execute on function get_menu(uuid), active_client_names(uuid), get_table_tab_state(uuid, text), open_or_join_table_tab(uuid, text, text, text), verify_table_tab_member(uuid, text), place_order(uuid, text, uuid, int, text, text, uuid), order_status(uuid[]) to anon, authenticated;
grant execute on function request_service_by_handle(text, text, text) to authenticated;

do $$ begin
  alter publication supabase_realtime add table bars;
exception when others then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table bar_items;
exception when others then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table bar_prices;
exception when others then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table orders;
exception when others then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table table_tabs;
exception when others then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table bar_members;
exception when others then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table bar_service_passwords;
exception when others then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table service_requests;
exception when others then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table job_posts;
exception when others then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table job_applications;
exception when others then null;
end $$;

-- Opcional (para testar sem confirmar e-mail):
-- Confirma usuários pendentes e cria gatilho para confirmar novos cadastros automaticamente.
-- Além disso, recomendamos desligar "Confirm email" em:
-- Supabase Dashboard → Authentication → Providers → Email → Confirm email (OFF)
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email_confirmed_at is null;

create or replace function public.auto_confirm_user()
returns trigger
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  return new;
end;
$$;

drop trigger if exists trg_auto_confirm_user on auth.users;
create trigger trg_auto_confirm_user
before insert on auth.users
for each row execute function public.auto_confirm_user();


-- 11) Catálogo ampliado de receitas (idempotente, sem duplicar receitas existentes)
with seed(name, category, ingredients, steps, instructions, description, story, glass, technique, garnish, shaken, tags, norm_name) as (
  values
('Gin Tônica de Morango', 'Refrescantes', '[{"n":"Gin","q":"50 ml"},{"n":"Água tônica","q":"completar"},{"n":"Morango","q":"3 unid"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Macere levemente os morangos na taça.
Encha de gelo, adicione o gin e complete com água tônica.', 'Macere levemente os morangos na taça.
Encha de gelo, adicione o gin e complete com água tônica.', 'Gin tônica aromático com morangos frescos.', 'Variação frutada muito pedida nos bares brasileiros.', 'Taça Gin', 'Direto na taça', 'Fatia de morango', false, array['Refrescante','Longo','Frutado']::text[], 'gin tonica de morango'),
('Gin Tônica de Maracujá', 'Tropicais', '[{"n":"Gin","q":"50 ml"},{"n":"Água tônica","q":"completar"},{"n":"Maracujá","q":"1/2 polpa"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque a polpa de maracujá e gelo na taça.
Adicione o gin e complete devagar com água tônica.', 'Coloque a polpa de maracujá e gelo na taça.
Adicione o gin e complete devagar com água tônica.', 'Combinação vibrante de gin botânico e maracujá fresco.', 'Clássico tropical de balcão.', 'Taça Gin', 'Direto na taça', 'Sementes de maracujá', false, array['Tropical','Refrescante','Ácido']::text[], 'gin tonica de maracuja'),
('Gin Tônica com Alecrim e Limão', 'Refrescantes', '[{"n":"Gin","q":"50 ml"},{"n":"Água tônica","q":"completar"},{"n":"Limão","q":"2 rodelas (siciliano)"},{"n":"Alecrim","q":"1 ramo"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Bata o alecrim nas mãos para liberar aroma e coloque na taça com gelo e limão.
Adicione gin e complete com água tônica.', 'Bata o alecrim nas mãos para liberar aroma e coloque na taça com gelo e limão.
Adicione gin e complete com água tônica.', 'Gin tônica herbal com alecrim perfumado e limão.', 'Toque botânico clássico de coquetelaria.', 'Taça Gin', 'Direto na taça', 'Ramo de alecrim e rodela de limão', false, array['Refrescante','Charmoso','Clássico']::text[], 'gin tonica com alecrim e limao'),
('Gin Tônica de Pepino', 'Refrescantes', '[{"n":"Gin","q":"50 ml"},{"n":"Água tônica","q":"completar"},{"n":"Pepino","q":"3 lâminas"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Forre a taça com lâminas finas de pepino e gelo.
Coloque o gin e complete com água tônica.', 'Forre a taça com lâminas finas de pepino e gelo.
Coloque o gin e complete com água tônica.', 'Leve, fresco e crocante com lâminas de pepino.', 'Inspirado no serviço clássico de gin botânico.', 'Taça Gin', 'Direto na taça', 'Fita de pepino', false, array['Refrescante','Longo','Fácil']::text[], 'gin tonica de pepino'),
('Gin Tropical (Energético)', 'Tropicais', '[{"n":"Gin","q":"50 ml"},{"n":"Energético","q":"completar"},{"n":"Laranja","q":"1 rodela"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha a taça de gelo, adicione o gin e a rodela de laranja.
Complete com energético bem gelado.', 'Encha a taça de gelo, adicione o gin e a rodela de laranja.
Complete com energético bem gelado.', 'Gin leve com energético e laranja.', 'Sucesso absoluto em festas e rooftops.', 'Taça Gin', 'Direto na taça', 'Meia lua de laranja', false, array['Tropical','Longo','Fácil']::text[], 'gin tropical (energetico)'),
('Gin Tônica de Hibisco', 'Refrescantes', '[{"n":"Gin","q":"50 ml"},{"n":"Xarope de hibisco","q":"20 ml"},{"n":"Água tônica","q":"completar"},{"n":"Limão","q":"10 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque gelo na taça, adicione gin, xarope de hibisco e limão.
Complete com tônica e mexa suavemente.', 'Coloque gelo na taça, adicione gin, xarope de hibisco e limão.
Complete com tônica e mexa suavemente.', 'Rubi vibrante com notas florais de hibisco.', 'Visual marcante para cardápios autorais.', 'Taça Gin', 'Direto na taça', 'Flores comestíveis ou rodela de limão', false, array['Charmoso','Refrescante','Frutado']::text[], 'gin tonica de hibisco'),
('Gin Tônica de Maçã Verde', 'Refrescantes', '[{"n":"Gin","q":"50 ml"},{"n":"Xarope de maçã verde","q":"20 ml"},{"n":"Água tônica","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture gin e xarope de maçã verde na taça com bastante gelo.
Complete com água tônica.', 'Misture gin e xarope de maçã verde na taça com bastante gelo.
Complete com água tônica.', 'Acidez refrescante da maçã verde com gin.', 'Muito leve e aromático.', 'Taça Gin', 'Direto na taça', 'Lâmina de maçã', false, array['Refrescante','Frutado','Longo']::text[], 'gin tonica de maca verde'),
('Gin Tônica de Melancia', 'Tropicais', '[{"n":"Gin","q":"50 ml"},{"n":"Xarope de melancia","q":"20 ml"},{"n":"Água tônica","q":"completar"},{"n":"Hortelã","q":"4 folhas"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque gelo e hortelã na taça.
Adicione gin, xarope de melancia e complete com tônica.', 'Coloque gelo e hortelã na taça.
Adicione gin, xarope de melancia e complete com tônica.', 'Doce na medida certa com frescor de melancia e hortelã.', 'Perfeito para dias quentes.', 'Taça Gin', 'Direto na taça', 'Ramo de hortelã', false, array['Tropical','Refrescante','Com hortelã']::text[], 'gin tonica de melancia'),
('Gin Tônica de Tangerina', 'Cítricos', '[{"n":"Gin","q":"50 ml"},{"n":"Xarope de tangerina","q":"20 ml"},{"n":"Água tônica","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha a taça com gelo, adicione gin e xarope de tangerina.
Complete com água tônica.', 'Encha a taça com gelo, adicione gin e xarope de tangerina.
Complete com água tônica.', 'Cítrico adocicado de tangerina com tônica.', 'Alternativa aromática ao limão tradicional.', 'Taça Gin', 'Direto na taça', 'Casca de laranja', false, array['Refrescante','Ácido','Frutado']::text[], 'gin tonica de tangerina'),
('Gin Tônica de Lavanda', 'Refrescantes', '[{"n":"Gin","q":"50 ml"},{"n":"Xarope de lavanda","q":"15 ml"},{"n":"Limão","q":"10 ml"},{"n":"Água tônica","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Adicione gelo, gin, xarope de lavanda e limão na taça.
Complete com água tônica e mexa leve.', 'Adicione gelo, gin, xarope de lavanda e limão na taça.
Complete com água tônica e mexa leve.', 'Perfume floral elegante com coloração violácea.', 'Sucesso em bares contemporâneos.', 'Taça Gin', 'Direto na taça', 'Flores comestíveis', false, array['Charmoso','Refrescante','Longo']::text[], 'gin tonica de lavanda'),
('Gin Basil Smash', 'Cítricos', '[{"n":"Gin","q":"60 ml"},{"n":"Manjericão","q":"10 folhas"},{"n":"Limão","q":"25 ml"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Macere o manjericão com o limão na coqueteleira.
Adicione gin, xarope e gelo, bata vigorosamente e faça dupla coagem.', 'Macere o manjericão com o limão na coqueteleira.
Adicione gin, xarope e gelo, bata vigorosamente e faça dupla coagem.', 'Verde vibrante com sabor intenso de manjericão e limão.', 'Clássico moderno criado em Hamburgo em 2008.', 'Copo baixo', 'Coqueteleira', 'Folha de manjericão', true, array['Ácido','Refrescante','Charmoso']::text[], 'gin basil smash'),
('Fitzgerald', 'Cítricos', '[{"n":"Gin","q":"50 ml"},{"n":"Limão","q":"25 ml"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Angostura","q":"2 gotas"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata todos os ingredientes com gelo na coqueteleira.
Coe para taça coupe gelada ou copo baixo com gelo.', 'Bata todos os ingredientes com gelo na coqueteleira.
Coe para taça coupe gelada ou copo baixo com gelo.', 'Equilíbrio perfeito entre gin, limão, açúcar e bitter.', 'Clássico moderno criado por Dale DeGroff.', 'Taça Coupe', 'Coqueteleira', 'Casca de limão', true, array['Clássico','Ácido','Curto']::text[], 'fitzgerald'),
('French 75', 'Aperitivos', '[{"n":"Gin","q":"35 ml"},{"n":"Limão","q":"15 ml"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Espumante","q":"completar"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata gin, limão e xarope com gelo.
Coe para taça flûte e complete com espumante.', 'Bata gin, limão e xarope com gelo.
Coe para taça flûte e complete com espumante.', 'Elegante, cítrico e borbulhante.', 'Clássico francês da era dos anos 1920.', 'Taça Flûte', 'Coqueteleira + completar', 'Zest de limão', true, array['Clássico','Charmoso','Aperitivo']::text[], 'french 75'),
('Bramble', 'Doces & Frutados', '[{"n":"Gin","q":"50 ml"},{"n":"Limão","q":"25 ml"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Xarope de amora","q":"15 ml"},{"n":"Gelo","q":"triturado"}]'::jsonb, 'Bata gin, limão e xarope de açúcar com gelo e coe sobre gelo triturado.
Finalize derramando xarope de amora por cima.', 'Bata gin, limão e xarope de açúcar com gelo e coe sobre gelo triturado.
Finalize derramando xarope de amora por cima.', 'Gin sour com calda marmorizada de amora.', 'Criado por Dick Bradsell em Londres nos anos 80.', 'Copo baixo', 'Coqueteleira', 'Framboesa ou fatia de limão', true, array['Frutado','Ácido','Clássico']::text[], 'bramble'),
('Dry Martini', 'Fortes', '[{"n":"Gin","q":"60 ml"},{"n":"Vermute","q":"15 ml (seco)"},{"n":"Azeitona","q":"1 unid"},{"n":"Gelo","q":"para mexer"}]'::jsonb, 'Mexa o gin e o vermute seco em mixing glass com gelo por 20 segundos.
Coe para taça martini gelada e decore com azeitona.', 'Mexa o gin e o vermute seco em mixing glass com gelo por 20 segundos.
Coe para taça martini gelada e decore com azeitona.', 'O rei dos coquetéis secos e elegantes.', 'Ícone mundial da coquetelaria clássica.', 'Taça Martini', 'Mexido', 'Azeitona no palito', false, array['Forte','Clássico','Curto']::text[], 'dry martini'),
('Southside', 'Refrescantes', '[{"n":"Gin","q":"50 ml"},{"n":"Limão","q":"25 ml"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Hortelã","q":"6 folhas"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata gin, limão, xarope e hortelã com bastante gelo.
Faça dupla coagem para taça gelada.', 'Bata gin, limão, xarope e hortelã com bastante gelo.
Faça dupla coagem para taça gelada.', 'Como um Mojito elegante feito com gin.', 'Clássico da era da Lei Seca americana.', 'Taça Coupe', 'Coqueteleira', 'Folha de hortelã', true, array['Com hortelã','Refrescante','Clássico']::text[], 'southside'),
('Clover Club', 'Doces & Frutados', '[{"n":"Gin","q":"50 ml"},{"n":"Xarope de framboesa","q":"20 ml"},{"n":"Limão","q":"20 ml"},{"n":"Clara de ovo","q":"20 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Faça dry shake sem gelo para espumar a clara.
Adicione gelo, bata novamente e coe para taça coupe.', 'Faça dry shake sem gelo para espumar a clara.
Adicione gelo, bata novamente e coe para taça coupe.', 'Espuma aveludada cor-de-rosa com sabor de framboesa.', 'Clássico pré-Lei Seca da Filadélfia.', 'Taça Coupe', 'Coqueteleira (dry shake)', 'Framboesa fresca', true, array['Charmoso','Clássico','Frutado']::text[], 'clover club'),
('White Lady', 'Cítricos', '[{"n":"Gin","q":"50 ml"},{"n":"Cointreau","q":"25 ml"},{"n":"Limão","q":"25 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata gin, Cointreau e limão com gelo.
Coe para taça gelada.', 'Bata gin, Cointreau e limão com gelo.
Coe para taça gelada.', 'Cítrico seco e sedoso com laranja e gin.', 'Criado por Harry MacElhone nos anos 1920.', 'Taça Coupe', 'Coqueteleira', 'Casca de limão', true, array['Ácido','Clássico','Curto']::text[], 'white lady'),
('Gin Mule', 'Refrescantes', '[{"n":"Gin","q":"50 ml"},{"n":"Limão","q":"20 ml"},{"n":"Ginger beer","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha uma caneca ou copo alto com gelo.
Adicione gin, limão e complete com ginger beer.', 'Encha uma caneca ou copo alto com gelo.
Adicione gin, limão e complete com ginger beer.', 'Picante de gengibre com frescor botânico do gin.', 'Variação refrescante do Moscow Mule.', 'Caneca / Copo alto', 'Direto no copo', 'Ramo de hortelã e limão', false, array['Refrescante','Longo','Fácil']::text[], 'gin mule'),
('Gin Blue Lagoon', 'Tropicais', '[{"n":"Gin","q":"50 ml"},{"n":"Curaçau Blue","q":"20 ml"},{"n":"Limão","q":"20 ml"},{"n":"Refrigerante de limão","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque gelo no copo longo.
Adicione gin, Curaçau Blue, limão e complete com refrigerante de limão.', 'Coloque gelo no copo longo.
Adicione gin, Curaçau Blue, limão e complete com refrigerante de limão.', 'Azul vibrante, cítrico e refrescante.', 'Versão com gin do famoso drink azul.', 'Copo alto', 'Direto no copo', 'Fatia de limão e cereja', false, array['Tropical','Longo','Charmoso']::text[], 'gin blue lagoon'),
('Gin com Água de Coco', 'Refrescantes', '[{"n":"Gin","q":"50 ml"},{"n":"Água de coco","q":"completar"},{"n":"Limão","q":"15 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha o copo alto com gelo.
Misture gin e limão e complete com água de coco bem gelada.', 'Encha o copo alto com gelo.
Misture gin e limão e complete com água de coco bem gelada.', 'Levíssimo, hidratante e suave.', 'Queridinho de praias e tardes ensolaradas.', 'Copo alto', 'Direto no copo', 'Fatia de limão', false, array['Refrescante','Tropical','Fácil']::text[], 'gin com agua de coco'),
('Gin com Suco de Cranberry', 'Doces & Frutados', '[{"n":"Gin","q":"50 ml"},{"n":"Suco de cranberry","q":"100 ml"},{"n":"Limão","q":"10 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture gin, limão e suco de cranberry em copo alto com gelo.', 'Misture gin, limão e suco de cranberry em copo alto com gelo.', 'Frutado levemente ácido e cor intensa.', 'Simples, rápido e elegante.', 'Copo alto', 'Direto no copo', 'Fatia de laranja', false, array['Frutado','Refrescante','Fácil']::text[], 'gin com suco de cranberry'),
('Gin com Suco de Abacaxi', 'Tropicais', '[{"n":"Gin","q":"50 ml"},{"n":"Suco de abacaxi","q":"100 ml"},{"n":"Hortelã","q":"4 folhas"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Bata gin, suco de abacaxi e hortelã com gelo.
Coe para copo longo com gelo.', 'Bata gin, suco de abacaxi e hortelã com gelo.
Coe para copo longo com gelo.', 'Doce tropical de abacaxi equilibrado pelo gin.', 'Refrescante e muito fácil de agradar.', 'Copo alto', 'Coqueteleira', 'Fatia de abacaxi e hortelã', true, array['Tropical','Com hortelã','Frutado']::text[], 'gin com suco de abacaxi'),
('Cosmopolitan', 'Cítricos', '[{"n":"Vodka","q":"45 ml"},{"n":"Cointreau","q":"20 ml"},{"n":"Suco de cranberry","q":"30 ml"},{"n":"Limão","q":"15 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata todos os ingredientes vigorosamente com gelo.
Coe para taça martini gelada.', 'Bata todos os ingredientes vigorosamente com gelo.
Coe para taça martini gelada.', 'Clássico rosado cítrico com cranberry e laranja.', 'Ícone dos bares nos anos 90.', 'Taça Martini', 'Coqueteleira', 'Casca de laranja', true, array['Clássico','Charmoso','Ácido']::text[], 'cosmopolitan'),
('Sex on the Beach', 'Doces & Frutados', '[{"n":"Vodka","q":"45 ml"},{"n":"Licor de pêssego","q":"25 ml"},{"n":"Suco de laranja","q":"90 ml"},{"n":"Grenadine","q":"15 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Bata vodka, licor de pêssego e suco de laranja com gelo.
Despeje no copo alto com gelo e finalize com grenadine.', 'Bata vodka, licor de pêssego e suco de laranja com gelo.
Despeje no copo alto com gelo e finalize com grenadine.', 'Degradê tropical de pêssego, laranja e romã.', 'Um dos drinks mais populares do mundo.', 'Copo alto', 'Coqueteleira', 'Meia fatia de laranja e cereja', true, array['Doce','Frutado','Tropical']::text[], 'sex on the beach'),
('Lagoa Azul', 'Tropicais', '[{"n":"Vodka","q":"50 ml"},{"n":"Curaçau Blue","q":"25 ml"},{"n":"Limão","q":"20 ml"},{"n":"Refrigerante de limão","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha o copo alto com gelo.
Adicione vodka, Curaçau Blue, limão e complete com refrigerante de limão.', 'Encha o copo alto com gelo.
Adicione vodka, Curaçau Blue, limão e complete com refrigerante de limão.', 'Visual azul cristalino com sabor cítrico de laranja e limão.', 'Clássico festivo de balcão.', 'Copo alto', 'Direto no copo', 'Rodelinha de limão', false, array['Tropical','Longo','Doce']::text[], 'lagoa azul'),
('Espresso Martini', 'Fortes', '[{"n":"Vodka","q":"50 ml"},{"n":"Licor de café","q":"25 ml"},{"n":"Café espresso","q":"35 ml"},{"n":"Xarope de açúcar","q":"10 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata forte na coqueteleira com bastante gelo para formar espuma.
Coe para taça martini gelada.', 'Bata forte na coqueteleira com bastante gelo para formar espuma.
Coe para taça martini gelada.', 'Cremoso, energizante e com espuma de café espresso.', 'Criado por Dick Bradsell em Londres para acordar e animar.', 'Taça Martini', 'Coqueteleira', '3 grãos de café', true, array['Forte','Charmoso','Clássico']::text[], 'espresso martini'),
('White Russian', 'Doces & Frutados', '[{"n":"Vodka","q":"50 ml"},{"n":"Licor de café","q":"25 ml"},{"n":"Creme de leite","q":"30 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque vodka e licor de café no copo baixo com gelo.
Despeje o creme de leite por cima lentamente.', 'Coloque vodka e licor de café no copo baixo com gelo.
Despeje o creme de leite por cima lentamente.', 'Cremoso, doce e encorpado com café.', 'Imortalizado pelo filme O Grande Lebowski.', 'Copo baixo', 'Direto no copo', 'Café em grãos', false, array['Doce','Clássico','Curto']::text[], 'white russian'),
('Black Russian', 'Fortes', '[{"n":"Vodka","q":"50 ml"},{"n":"Licor de café","q":"25 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Mexa vodka e licor de café no copo baixo com gelo.', 'Mexa vodka e licor de café no copo baixo com gelo.', 'Direto, intenso e adocicado pelo café.', 'Criado em Bruxelas em 1949.', 'Copo baixo', 'Direto no copo', 'Opcional sem guarnição', false, array['Forte','Clássico','Curto']::text[], 'black russian'),
('Bloody Mary', 'Aperitivos', '[{"n":"Vodka","q":"50 ml"},{"n":"Suco de tomate","q":"120 ml"},{"n":"Limão","q":"15 ml"},{"n":"Sal","q":"1 pitada"},{"n":"Pimenta","q":"1 pitada"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture todos os ingredientes rolando entre copos ou com gelo.
Sirva em copo alto.', 'Misture todos os ingredientes rolando entre copos ou com gelo.
Sirva em copo alto.', 'Salgado, picante e encorpado com suco de tomate.', 'Clássico de brunch mundial.', 'Copo alto', 'Rolado / Mexido', 'Azeitona e gomo de limão', false, array['Aperitivo','Clássico','Longo']::text[], 'bloody mary'),
('Vodka com Energético', 'Refrescantes', '[{"n":"Vodka","q":"50 ml"},{"n":"Energético","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha o copo de gelo, coloque a vodka e complete com energético.', 'Encha o copo de gelo, coloque a vodka e complete com energético.', 'Clássico de balada e festas.', 'Combinação direta e popular.', 'Copo alto', 'Direto no copo', 'Fatia de limão ou laranja', false, array['Longo','Fácil','Refrescante']::text[], 'vodka com energetico'),
('Vodka com Água de Coco', 'Refrescantes', '[{"n":"Vodka","q":"50 ml"},{"n":"Água de coco","q":"completar"},{"n":"Limão","q":"10 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture vodka, água de coco e limão no copo com gelo.', 'Misture vodka, água de coco e limão no copo com gelo.', 'Suave, leve e refrescante.', 'Clássico praiano simples.', 'Copo alto', 'Direto no copo', 'Fatia de limão', false, array['Refrescante','Fácil','Longo']::text[], 'vodka com agua de coco'),
('Caipiroska de Morango', 'Doces & Frutados', '[{"n":"Vodka","q":"60 ml"},{"n":"Morango","q":"5 unid"},{"n":"Açúcar","q":"2 colheres"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Macere os morangos com açúcar no copo.
Adicione gelo, vodka e misture ou bata na coqueteleira.', 'Macere os morangos com açúcar no copo.
Adicione gelo, vodka e misture ou bata na coqueteleira.', 'Doce e frutada com morangos frescos macerados.', 'Uma das caipiroskas mais amadas do Brasil.', 'Copo baixo', 'Macerado / Batido', 'Morango na borda', true, array['Doce','Frutado','Clássico']::text[], 'caipiroska de morango'),
('Caipiroska de Maracujá', 'Tropicais', '[{"n":"Vodka","q":"60 ml"},{"n":"Maracujá","q":"1 unid"},{"n":"Açúcar","q":"2 colheres"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Macere levemente a polpa de maracujá com açúcar.
Bata com vodka e gelo e sirva no copo baixo.', 'Macere levemente a polpa de maracujá com açúcar.
Bata com vodka e gelo e sirva no copo baixo.', 'Agridoce intenso e crocante com sementes de maracujá.', 'Favorita em qualquer bar brasileiro.', 'Copo baixo', 'Coqueteleira', 'Sementes de maracujá', true, array['Tropical','Ácido','Frutado']::text[], 'caipiroska de maracuja'),
('Caipiroska de Kiwi', 'Cítricos', '[{"n":"Vodka","q":"60 ml"},{"n":"Kiwi","q":"1 unid"},{"n":"Açúcar","q":"2 colheres"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Descasque e macere o kiwi com açúcar.
Adicione gelo e vodka e bata ou mexa bem.', 'Descasque e macere o kiwi com açúcar.
Adicione gelo e vodka e bata ou mexa bem.', 'Verde vibrante, doce e levemente ácido.', 'Clássica variação de frutas frescas.', 'Copo baixo', 'Coqueteleira', 'Rodelinha de kiwi', true, array['Frutado','Ácido','Charmoso']::text[], 'caipiroska de kiwi'),
('Caipiroska de Abacaxi com Hortelã', 'Tropicais', '[{"n":"Vodka","q":"60 ml"},{"n":"Abacaxi","q":"3 cubos"},{"n":"Hortelã","q":"5 folhas"},{"n":"Açúcar","q":"2 colheres"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Macere abacaxi, açúcar e hortelã.
Adicione gelo e vodka, bata bem e sirva.', 'Macere abacaxi, açúcar e hortelã.
Adicione gelo e vodka, bata bem e sirva.', 'Tropical com toque refrescante de hortelã.', 'Combinação infalível de fruta e erva.', 'Copo baixo', 'Coqueteleira', 'Folha de hortelã', true, array['Tropical','Com hortelã','Refrescante']::text[], 'caipiroska de abacaxi com hortela'),
('Caipiroska de Uva com Manjericão', 'Doces & Frutados', '[{"n":"Vodka","q":"60 ml"},{"n":"Uva","q":"8 bagos"},{"n":"Manjericão","q":"4 folhas"},{"n":"Açúcar","q":"1 colher"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Macere as uvas com açúcar e manjericão.
Bata com vodka e gelo e coe no copo baixo.', 'Macere as uvas com açúcar e manjericão.
Bata com vodka e gelo e coe no copo baixo.', 'Uva doce contrastada com aroma fresco de manjericão.', 'Receita autoral muito pedida.', 'Copo baixo', 'Coqueteleira', 'Uva e manjericão', true, array['Frutado','Charmoso','Doce']::text[], 'caipiroska de uva com manjericao'),
('Caipiroska de Manga', 'Tropicais', '[{"n":"Vodka","q":"60 ml"},{"n":"Manga","q":"4 cubos"},{"n":"Limão","q":"15 ml"},{"n":"Açúcar","q":"1 colher"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Macere a manga com açúcar e limão.
Bata com vodka e gelo até ficar cremoso.', 'Macere a manga com açúcar e limão.
Bata com vodka e gelo até ficar cremoso.', 'Cremosa, tropical e aveludada.', 'Variação tropical vibrante.', 'Copo baixo', 'Coqueteleira', 'Fatia de manga', true, array['Tropical','Doce','Frutado']::text[], 'caipiroska de manga'),
('Moscow Mule de Maracujá', 'Tropicais', '[{"n":"Vodka","q":"50 ml"},{"n":"Suco de maracujá","q":"40 ml"},{"n":"Limão","q":"15 ml"},{"n":"Ginger beer","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture vodka, maracujá e limão na caneca com gelo.
Complete com ginger beer.', 'Misture vodka, maracujá e limão na caneca com gelo.
Complete com ginger beer.', 'Toque tropical de maracujá no clássico Moscow Mule.', 'Releitura brasileira adorada.', 'Caneca', 'Direto na caneca', 'Limão e hortelã', false, array['Tropical','Refrescante','Longo']::text[], 'moscow mule de maracuja'),
('Vodka com Suco de Uva', 'Doces & Frutados', '[{"n":"Vodka","q":"50 ml"},{"n":"Suco de uva","q":"120 ml"},{"n":"Limão","q":"10 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque gelo no copo alto, adicione vodka, limão e suco de uva.', 'Coloque gelo no copo alto, adicione vodka, limão e suco de uva.', 'Doce, encorpado e muito fácil de fazer.', 'Sucesso rápido de balcão.', 'Copo alto', 'Direto no copo', 'Uva fresca', false, array['Doce','Frutado','Fácil']::text[], 'vodka com suco de uva'),
('Vodka Soda de Lichia', 'Refrescantes', '[{"n":"Vodka","q":"50 ml"},{"n":"Xarope de lichia","q":"25 ml"},{"n":"Limão","q":"10 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture vodka, xarope de lichia e limão no copo com gelo.
Complete com água com gás.', 'Misture vodka, xarope de lichia e limão no copo com gelo.
Complete com água com gás.', 'Delicado, floral e levemente adocicado de lichia.', 'Inspirado em coquetéis orientais modernos.', 'Copo alto', 'Direto no copo', 'Casca de limão', false, array['Charmoso','Com soda','Refrescante']::text[], 'vodka soda de lichia'),
('Vodka Soda de Framboesa', 'Doces & Frutados', '[{"n":"Vodka","q":"50 ml"},{"n":"Xarope de framboesa","q":"20 ml"},{"n":"Limão","q":"15 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque gelo, vodka, xarope de framboesa e limão no copo.
Complete com água com gás.', 'Coloque gelo, vodka, xarope de framboesa e limão no copo.
Complete com água com gás.', 'Frutado leve com gás refrescante.', 'Opção leve e saborosa.', 'Copo alto', 'Direto no copo', 'Framboesa', false, array['Com soda','Frutado','Refrescante']::text[], 'vodka soda de framboesa'),
('Vodka Soda de Pêssego', 'Doces & Frutados', '[{"n":"Vodka","q":"50 ml"},{"n":"Xarope de pêssego","q":"25 ml"},{"n":"Água com gás","q":"completar"},{"n":"Limão","q":"10 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha o copo de gelo, adicione vodka, xarope de pêssego e limão.
Complete com água com gás.', 'Encha o copo de gelo, adicione vodka, xarope de pêssego e limão.
Complete com água com gás.', 'Aromático de pêssego e bem leve.', 'Highball frutado de fácil preparo.', 'Copo alto', 'Direto no copo', 'Fatia de limão', false, array['Com soda','Doce','Fácil']::text[], 'vodka soda de pessego'),
('Vodka com Suco de Maçã e Canela', 'Doces & Frutados', '[{"n":"Vodka","q":"50 ml"},{"n":"Suco de maçã","q":"110 ml"},{"n":"Xarope de canela","q":"15 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Bata vodka, suco de maçã e xarope de canela com gelo.
Coe para copo com gelo.', 'Bata vodka, suco de maçã e xarope de canela com gelo.
Coe para copo com gelo.', 'Lembra torta de maçã gelada.', 'Combinação acolhedora de maçã e especiaria.', 'Copo baixo', 'Coqueteleira', 'Pau de canela', true, array['Doce','Charmoso','Frutado']::text[], 'vodka com suco de maca e canela'),
('Kamikaze', 'Cítricos', '[{"n":"Vodka","q":"40 ml"},{"n":"Triple Sec","q":"25 ml"},{"n":"Limão","q":"25 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata partes quase iguais de vodka, Triple Sec e limão com gelo.
Coe para copo ou taça gelada.', 'Bata partes quase iguais de vodka, Triple Sec e limão com gelo.
Coe para copo ou taça gelada.', 'Cítrico direto e intenso.', 'Clássico clássico dos anos 70.', 'Taça / Shot', 'Coqueteleira', 'Casca de limão', true, array['Ácido','Forte','Clássico']::text[], 'kamikaze'),
('Whisky & Coke', 'Refrescantes', '[{"n":"Whisky","q":"50 ml"},{"n":"Coca-Cola","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha um copo alto com gelo.
Coloque o whisky e complete com Coca-Cola.', 'Encha um copo alto com gelo.
Coloque o whisky e complete com Coca-Cola.', 'O clássico highball de whisky com cola.', 'Pedido obrigatório em qualquer pub.', 'Copo alto', 'Direto no copo', 'Gomo de limão', false, array['Fácil','Longo','Clássico']::text[], 'whisky & coke'),
('Whisky com Energético', 'Refrescantes', '[{"n":"Whisky","q":"50 ml"},{"n":"Energético","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Adicione gelo no copo, despeje o whisky e complete com energético.', 'Adicione gelo no copo, despeje o whisky e complete com energético.', 'Popular, direto e energético.', 'Clássico da noite brasileira.', 'Copo alto', 'Direto no copo', 'Opcional', false, array['Fácil','Longo']::text[], 'whisky com energetico'),
('Whisky com Água de Coco', 'Refrescantes', '[{"n":"Whisky","q":"50 ml"},{"n":"Água de coco","q":"120 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque gelo no copo alto ou baixo, adicione whisky e complete com água de coco.', 'Coloque gelo no copo alto ou baixo, adicione whisky e complete com água de coco.', 'Suaviza o whisky com doçura natural do coco.', 'Combinação brasileira muito popular.', 'Copo alto', 'Direto no copo', 'Fatia de limão', false, array['Refrescante','Fácil','Suave']::text[], 'whisky com agua de coco'),
('Whisky Highball', 'Refrescantes', '[{"n":"Whisky","q":"50 ml"},{"n":"Água com gás","q":"completar"},{"n":"Limão","q":"1 casca"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Gele bem o copo alto com muito gelo.
Adicione whisky, complete com água com gás e dê uma leve mexida.', 'Gele bem o copo alto com muito gelo.
Adicione whisky, complete com água com gás e dê uma leve mexida.', 'Refrescante, seco e efervescente ao estilo japonês.', 'O drink mais consumido nos bares do Japão.', 'Copo alto', 'Direto no copo', 'Casca de limão', false, array['Com soda','Refrescante','Clássico']::text[], 'whisky highball'),
('Whisky Ginger Ale', 'Refrescantes', '[{"n":"Whisky","q":"50 ml"},{"n":"Ginger ale","q":"completar"},{"n":"Limão","q":"10 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque whisky e limão no copo com gelo.
Complete com ginger ale.', 'Coloque whisky e limão no copo com gelo.
Complete com ginger ale.', 'Leve toque de gengibre adocicado combinando com o carvalho do whisky.', 'Clássico de pub irlandês e americano.', 'Copo alto', 'Direto no copo', 'Gomo de limão', false, array['Refrescante','Longo','Clássico']::text[], 'whisky ginger ale'),
('Manhattan', 'Fortes', '[{"n":"Whisky","q":"60 ml"},{"n":"Vermute","q":"25 ml (tinto)"},{"n":"Angostura","q":"2 gotas"},{"n":"Cereja","q":"1 unid"},{"n":"Gelo","q":"para mexer"}]'::jsonb, 'Mexa whisky, vermute tinto e Angostura em mixing glass com gelo.
Coe para taça coupe gelada.', 'Mexa whisky, vermute tinto e Angostura em mixing glass com gelo.
Coe para taça coupe gelada.', 'Sofisticado, encorpado e levemente adocicado.', 'Um dos coquetéis mais antigos e respeitados de Nova York.', 'Taça Coupe', 'Mexido', 'Cereja', false, array['Forte','Clássico','Curto']::text[], 'manhattan'),
('Boulevardier', 'Fortes', '[{"n":"Whisky","q":"30 ml"},{"n":"Campari","q":"30 ml"},{"n":"Vermute","q":"30 ml (tinto)"},{"n":"Laranja","q":"1 casca"},{"n":"Gelo","q":"cubo grande"}]'::jsonb, 'Mexa partes iguais de whisky, Campari e vermute tinto com gelo.
Coe no copo baixo com gelo e perfume com casca de laranja.', 'Mexa partes iguais de whisky, Campari e vermute tinto com gelo.
Coe no copo baixo com gelo e perfume com casca de laranja.', 'O primo do Negroni feito com whisky no lugar do gin.', 'Criado em Paris em 1927 para Erskine Gwynne.', 'Copo baixo', 'Mexido', 'Casca de laranja', false, array['Forte','Amargo','Clássico']::text[], 'boulevardier'),
('Mint Julep', 'Refrescantes', '[{"n":"Whisky","q":"60 ml"},{"n":"Hortelã","q":"8 folhas"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Gelo","q":"triturado"}]'::jsonb, 'Macere suavemente hortelã e xarope no copo.
Encha de gelo triturado, adicione whisky e mexa até gelar a parede.', 'Macere suavemente hortelã e xarope no copo.
Encha de gelo triturado, adicione whisky e mexa até gelar a parede.', 'Fresco e aromático, o clássico do Kentucky Derby.', 'Tradição sulista americana há quase dois séculos.', 'Copo baixo / Julep', 'Mexido no copo', 'Buquê de hortelã', false, array['Com hortelã','Forte','Clássico']::text[], 'mint julep'),
('Gold Rush', 'Cítricos', '[{"n":"Whisky","q":"60 ml"},{"n":"Mel","q":"20 ml"},{"n":"Limão","q":"20 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Misture o mel com limão até dissolver, adicione whisky e gelo.
Bata bem e coe para copo baixo com gelo.', 'Misture o mel com limão até dissolver, adicione whisky e gelo.
Bata bem e coe para copo baixo com gelo.', 'Versão de Whisky Sour adoçada com mel.', 'Clássico moderno do Milk & Honey de Nova York.', 'Copo baixo', 'Coqueteleira', 'Casca de limão', true, array['Clássico','Ácido','Curto']::text[], 'gold rush'),
('Penicillin', 'Cítricos', '[{"n":"Whisky","q":"60 ml"},{"n":"Xarope de mel","q":"15 ml"},{"n":"Xarope de gengibre","q":"15 ml"},{"n":"Limão","q":"22 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata todos os ingredientes com gelo na coqueteleira.
Coe sobre gelo novo no copo baixo.', 'Bata todos os ingredientes com gelo na coqueteleira.
Coe sobre gelo novo no copo baixo.', 'Picante de gengibre, doce de mel e acidez cítrica.', 'Criado por Sam Ross em 2005, já considerado clássico.', 'Copo baixo', 'Coqueteleira', 'Gengibre ou limão', true, array['Forte','Clássico','Ácido']::text[], 'penicillin'),
('Godfather', 'Fortes', '[{"n":"Whisky","q":"50 ml"},{"n":"Licor de amêndoa (Amaretto)","q":"25 ml"},{"n":"Gelo","q":"cubo grande"}]'::jsonb, 'Misture whisky e Amaretto direto no copo baixo com gelo.', 'Misture whisky e Amaretto direto no copo baixo com gelo.', 'Dois ingredientes com notas quentes de amêndoa.', 'Popularizado nos anos 70 com o sucesso de O Poderoso Chefão.', 'Copo baixo', 'Direto no copo', 'Casca de laranja', false, array['Forte','Doce','Curto']::text[], 'godfather'),
('Irish Coffee', 'Doces & Frutados', '[{"n":"Whisky","q":"45 ml"},{"n":"Café espresso","q":"90 ml"},{"n":"Açúcar","q":"1 colher (mascavo)"},{"n":"Chantilly","q":"por cima"}]'::jsonb, 'Misture café quente, açúcar e whisky na taça.
Finalize com camada generosa de chantilly ou creme por cima.', 'Misture café quente, açúcar e whisky na taça.
Finalize com camada generosa de chantilly ou creme por cima.', 'Café intenso com whisky e cobertura cremosa.', 'Clássico criado na Irlanda para aquecer viajantes.', 'Taça / Caneca de vidro', 'Montado', 'Café ou canela', false, array['Clássico','Charmoso','Forte']::text[], 'irish coffee'),
('Whisky com Suco de Maçã', 'Refrescantes', '[{"n":"Whisky","q":"50 ml"},{"n":"Suco de maçã","q":"120 ml"},{"n":"Limão","q":"10 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha o copo de gelo, adicione whisky, limão e suco de maçã.', 'Encha o copo de gelo, adicione whisky, limão e suco de maçã.', 'Suave, frutado e muito equilibrado.', 'Combinação surpreendente e leve.', 'Copo alto', 'Direto no copo', 'Fatia de maçã', false, array['Refrescante','Frutado','Fácil']::text[], 'whisky com suco de maca'),
('Tequila Sunrise', 'Tropicais', '[{"n":"Tequila","q":"50 ml"},{"n":"Suco de laranja","q":"120 ml"},{"n":"Grenadine","q":"15 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque tequila e suco de laranja no copo alto com gelo.
Despeje a grenadine lentamente para criar o efeito nascer do sol.', 'Coloque tequila e suco de laranja no copo alto com gelo.
Despeje a grenadine lentamente para criar o efeito nascer do sol.', 'Visual de pôr do sol com laranja e romã.', 'Clássico californiano dos anos 70.', 'Copo alto', 'Montado', 'Fatia de laranja e cereja', false, array['Tropical','Doce','Clássico']::text[], 'tequila sunrise'),
('Paloma', 'Cítricos', '[{"n":"Tequila","q":"50 ml"},{"n":"Limão","q":"20 ml"},{"n":"Refrigerante de limão","q":"completar"},{"n":"Sal","q":"na borda"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Faça borda de sal no copo alto.
Coloque gelo, tequila, limão e complete com refrigerante de limão.', 'Faça borda de sal no copo alto.
Coloque gelo, tequila, limão e complete com refrigerante de limão.', 'Refrescante, cítrico e salgadinho na borda.', 'O drink mais popular no México.', 'Copo alto', 'Direto no copo', 'Borda de sal e limão', false, array['Refrescante','Ácido','Clássico']::text[], 'paloma'),
('Margarita de Morango', 'Doces & Frutados', '[{"n":"Tequila","q":"50 ml"},{"n":"Triple Sec","q":"20 ml"},{"n":"Morango","q":"4 unid"},{"n":"Limão","q":"20 ml"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Macere os morangos na coqueteleira.
Bata com tequila, Triple Sec, limão, xarope e gelo e coe para taça.', 'Macere os morangos na coqueteleira.
Bata com tequila, Triple Sec, limão, xarope e gelo e coe para taça.', 'Margarita frutada e vibrante de morango.', 'Variação festiva muito pedida.', 'Taça Margarita', 'Coqueteleira', 'Morango na borda', true, array['Frutado','Doce','Ácido']::text[], 'margarita de morango'),
('Margarita de Maracujá', 'Tropicais', '[{"n":"Tequila","q":"50 ml"},{"n":"Triple Sec","q":"20 ml"},{"n":"Suco de maracujá","q":"40 ml"},{"n":"Limão","q":"20 ml"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata todos os ingredientes com gelo.
Coe para taça com borda de sal opcional.', 'Bata todos os ingredientes com gelo.
Coe para taça com borda de sal opcional.', 'Explosão cítrica de tequila com maracujá.', 'Toque tropical na receita mexicana.', 'Taça Margarita', 'Coqueteleira', 'Rodelinha de limão', true, array['Tropical','Ácido','Charmoso']::text[], 'margarita de maracuja'),
('Blue Margarita', 'Cítricos', '[{"n":"Tequila","q":"50 ml"},{"n":"Curaçau Blue","q":"25 ml"},{"n":"Limão","q":"25 ml"},{"n":"Sal","q":"na borda"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata tequila, Curaçau Blue e limão com gelo.
Coe para taça com borda de sal.', 'Bata tequila, Curaçau Blue e limão com gelo.
Coe para taça com borda de sal.', 'Margarita azul elétrica com sabor cítrico.', 'Visual chamativo para cardápios.', 'Taça Margarita', 'Coqueteleira', 'Borda de sal e limão', true, array['Ácido','Charmoso','Clássico']::text[], 'blue margarita'),
('Mexican Mule', 'Refrescantes', '[{"n":"Tequila","q":"50 ml"},{"n":"Limão","q":"20 ml"},{"n":"Ginger beer","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha a caneca de gelo.
Adicione tequila, limão e complete com ginger beer.', 'Encha a caneca de gelo.
Adicione tequila, limão e complete com ginger beer.', 'Tequila terrosa com picância de gengibre.', 'Versão mexicana do Moscow Mule.', 'Caneca', 'Direto na caneca', 'Fatia de limão', false, array['Refrescante','Longo','Fácil']::text[], 'mexican mule'),
('Mezcal Negroni', 'Fortes', '[{"n":"Mezcal","q":"30 ml"},{"n":"Campari","q":"30 ml"},{"n":"Vermute","q":"30 ml (tinto)"},{"n":"Laranja","q":"1 casca"},{"n":"Gelo","q":"cubo grande"}]'::jsonb, 'Mexa mezcal, Campari e vermute com gelo.
Coe para copo baixo com gelo grande.', 'Mexa mezcal, Campari e vermute com gelo.
Coe para copo baixo com gelo grande.', 'Negroni defumado pelo mezcal.', 'Clássico contemporâneo de bares autorais.', 'Copo baixo', 'Mexido', 'Casca de laranja', false, array['Forte','Amargo','Charmoso']::text[], 'mezcal negroni'),
('Mezcal Sour de Hibisco', 'Cítricos', '[{"n":"Mezcal","q":"50 ml"},{"n":"Xarope de hibisco","q":"20 ml"},{"n":"Limão","q":"25 ml"},{"n":"Clara de ovo","q":"15 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Faça dry shake e depois bata com gelo.
Coe para copo baixo ou taça coupe.', 'Faça dry shake e depois bata com gelo.
Coe para copo baixo ou taça coupe.', 'Notas defumadas combinadas com floral ácido de hibisco.', 'Coquetel autoral de destaque.', 'Taça Coupe', 'Coqueteleira', 'Flores comestíveis', true, array['Ácido','Charmoso','Forte']::text[], 'mezcal sour de hibisco'),
('Mojito de Morango', 'Doces & Frutados', '[{"n":"Rum","q":"50 ml"},{"n":"Morango","q":"4 unid"},{"n":"Hortelã","q":"6 folhas"},{"n":"Limão","q":"20 ml"},{"n":"Açúcar","q":"1 colher"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Macere levemente morango, açúcar, limão e hortelã.
Adicione gelo, rum e complete com água com gás.', 'Macere levemente morango, açúcar, limão e hortelã.
Adicione gelo, rum e complete com água com gás.', 'Mojito clássico enriquecido com morangos frescos.', 'Sucesso garantido no verão.', 'Copo alto', 'Direto no copo', 'Hortelã e morango', false, array['Com hortelã','Frutado','Refrescante']::text[], 'mojito de morango'),
('Mojito de Maracujá', 'Tropicais', '[{"n":"Rum","q":"50 ml"},{"n":"Maracujá","q":"1/2 polpa"},{"n":"Hortelã","q":"6 folhas"},{"n":"Limão","q":"15 ml"},{"n":"Açúcar","q":"1 colher"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Macere leve hortelã com açúcar e limão.
Adicione polpa de maracujá, rum, gelo e complete com água com gás.', 'Macere leve hortelã com açúcar e limão.
Adicione polpa de maracujá, rum, gelo e complete com água com gás.', 'Refrescante com toque tropical ácido do maracujá.', 'Variação tropical muito popular.', 'Copo alto', 'Direto no copo', 'Ramo de hortelã', false, array['Tropical','Com hortelã','Refrescante']::text[], 'mojito de maracuja'),
('Mojito de Melancia', 'Tropicais', '[{"n":"Rum","q":"50 ml"},{"n":"Melancia","q":"3 cubos"},{"n":"Hortelã","q":"6 folhas"},{"n":"Limão","q":"15 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Macere a melancia com limão e hortelã.
Adicione gelo, rum e complete com água com gás.', 'Macere a melancia com limão e hortelã.
Adicione gelo, rum e complete com água com gás.', 'Levíssimo e super hidratante.', 'Perfeito para tardes quentes.', 'Copo alto', 'Direto no copo', 'Fatia de melancia e hortelã', false, array['Tropical','Com hortelã','Refrescante']::text[], 'mojito de melancia'),
('Daiquiri de Morango', 'Doces & Frutados', '[{"n":"Rum","q":"50 ml"},{"n":"Morango","q":"4 unid"},{"n":"Limão","q":"20 ml"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Macere os morangos, adicione rum, limão, xarope e gelo.
Bata forte e coe para taça gelada.', 'Macere os morangos, adicione rum, limão, xarope e gelo.
Bata forte e coe para taça gelada.', 'Frutado, doce e equilibrado com acidez de limão.', 'Variação famosa do clássico cubano.', 'Taça Coupe', 'Coqueteleira', 'Morango', true, array['Doce','Frutado','Clássico']::text[], 'daiquiri de morango'),
('Mai Tai', 'Tropicais', '[{"n":"Rum","q":"60 ml"},{"n":"Cointreau","q":"15 ml"},{"n":"Orgeat","q":"15 ml"},{"n":"Limão","q":"25 ml"},{"n":"Gelo","q":"triturado"}]'::jsonb, 'Bata todos os ingredientes com gelo.
Coe sobre gelo triturado e decore com hortelã.', 'Bata todos os ingredientes com gelo.
Coe sobre gelo triturado e decore com hortelã.', 'O clássico tiki com rum, laranja e xarope de amêndoa orgeat.', 'Criado por Trader Vic em 1944.', 'Copo baixo', 'Coqueteleira', 'Hortelã e casca de limão', true, array['Tropical','Clássico','Forte']::text[], 'mai tai'),
('Dark ''n'' Stormy', 'Refrescantes', '[{"n":"Rum","q":"50 ml (escuro)"},{"n":"Ginger beer","q":"completar"},{"n":"Limão","q":"15 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha o copo alto com gelo, limão e ginger beer.
Finalize flutuando o rum escuro por cima.', 'Encha o copo alto com gelo, limão e ginger beer.
Finalize flutuando o rum escuro por cima.', 'Rum encorpado sobre ginger beer picante.', 'Drink nacional das Bermudas.', 'Copo alto', 'Montado', 'Gomo de limão', false, array['Clássico','Refrescante','Longo']::text[], 'dark ''n'' stormy'),
('Hurricane', 'Tropicais', '[{"n":"Rum","q":"60 ml"},{"n":"Suco de maracujá","q":"60 ml"},{"n":"Suco de laranja","q":"60 ml"},{"n":"Limão","q":"15 ml"},{"n":"Grenadine","q":"15 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata tudo com gelo na coqueteleira.
Sirva em copo grande com bastante gelo.', 'Bata tudo com gelo na coqueteleira.
Sirva em copo grande com bastante gelo.', 'Frutado, tropical e intenso de Nova Orleans.', 'Criado nos anos 40 no Pat O’Brien’s.', 'Taça Furacão / Copo alto', 'Coqueteleira', 'Laranja e cereja', true, array['Tropical','Frutado','Forte']::text[], 'hurricane'),
('Rum com Água de Coco', 'Tropicais', '[{"n":"Rum","q":"50 ml"},{"n":"Água de coco","q":"completar"},{"n":"Limão","q":"10 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture rum, limão e água de coco em copo alto com gelo.', 'Misture rum, limão e água de coco em copo alto com gelo.', 'Leve, praiano e refrescante.', 'Clássico caribenho simples.', 'Copo alto', 'Direto no copo', 'Limão', false, array['Tropical','Refrescante','Fácil']::text[], 'rum com agua de coco'),
('Rum com Suco de Abacaxi', 'Tropicais', '[{"n":"Rum","q":"50 ml"},{"n":"Suco de abacaxi","q":"120 ml"},{"n":"Limão","q":"10 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture rum, suco de abacaxi e limão com gelo.', 'Misture rum, suco de abacaxi e limão com gelo.', 'Simples, doce e tropical.', 'Combinação clássica do Caribe.', 'Copo alto', 'Direto no copo', 'Triângulo de abacaxi', false, array['Tropical','Doce','Fácil']::text[], 'rum com suco de abacaxi'),
('Caipirinha de Maracujá', 'Tropicais', '[{"n":"Cachaça","q":"60 ml"},{"n":"Maracujá","q":"1 unid"},{"n":"Açúcar","q":"2 colheres"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Macere levemente o maracujá com açúcar.
Adicione cachaça e gelo e bata ou mexa.', 'Macere levemente o maracujá com açúcar.
Adicione cachaça e gelo e bata ou mexa.', 'A acidez vibrante do maracujá com cachaça.', 'Clássico brasileiro em qualquer região.', 'Copo baixo', 'Coqueteleira', 'Sementes de maracujá', true, array['Tropical','Ácido','Frutado']::text[], 'caipirinha de maracuja'),
('Caipirinha de Abacaxi', 'Tropicais', '[{"n":"Cachaça","q":"60 ml"},{"n":"Abacaxi","q":"3 cubos"},{"n":"Açúcar","q":"2 colheres"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Macere bem os cubos de abacaxi com açúcar.
Adicione cachaça e gelo e bata.', 'Macere bem os cubos de abacaxi com açúcar.
Adicione cachaça e gelo e bata.', 'Doce tropical de abacaxi macerado na hora.', 'Queridinha de churrascos e praias.', 'Copo baixo', 'Coqueteleira', 'Fatia de abacaxi', true, array['Tropical','Doce','Frutado']::text[], 'caipirinha de abacaxi'),
('Caipirinha de Kiwi', 'Cítricos', '[{"n":"Cachaça","q":"60 ml"},{"n":"Kiwi","q":"1 unid"},{"n":"Açúcar","q":"2 colheres"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Macere o kiwi sem casca com açúcar.
Bata com cachaça e gelo.', 'Macere o kiwi sem casca com açúcar.
Bata com cachaça e gelo.', 'Sabor exótico e textura leve de kiwi.', 'Popular nos bares brasileiros.', 'Copo baixo', 'Coqueteleira', 'Rodelinha de kiwi', true, array['Frutado','Ácido']::text[], 'caipirinha de kiwi'),
('Caipirinha de Melancia com Hortelã', 'Tropicais', '[{"n":"Cachaça","q":"60 ml"},{"n":"Melancia","q":"3 cubos"},{"n":"Hortelã","q":"4 folhas"},{"n":"Açúcar","q":"1 colher"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Macere a melancia com açúcar e hortelã.
Adicione gelo e cachaça e bata.', 'Macere a melancia com açúcar e hortelã.
Adicione gelo e cachaça e bata.', 'Leve, refrescante e com aroma de hortelã.', 'Ótima opção de verão.', 'Copo baixo', 'Coqueteleira', 'Hortelã', true, array['Tropical','Com hortelã','Refrescante']::text[], 'caipirinha de melancia com hortela'),
('Caipirinha de Uva', 'Doces & Frutados', '[{"n":"Cachaça","q":"60 ml"},{"n":"Uva","q":"8 bagos"},{"n":"Açúcar","q":"1 colher"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Macere as uvas com açúcar.
Adicione cachaça e gelo e bata.', 'Macere as uvas com açúcar.
Adicione cachaça e gelo e bata.', 'Doce natural da uva combinada com cachaça.', 'Variação suave da caipirinha.', 'Copo baixo', 'Coqueteleira', 'Uva', true, array['Doce','Frutado']::text[], 'caipirinha de uva'),
('Melzinho (Caipirinha de Mel e Limão)', 'Cítricos', '[{"n":"Cachaça","q":"60 ml"},{"n":"Limão","q":"1 unid"},{"n":"Mel","q":"20 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Macere o limão com mel.
Bata com cachaça e gelo.', 'Macere o limão com mel.
Bata com cachaça e gelo.', 'Caipirinha adoçada com mel natural.', 'Clássico popular em Minas Gerais e São Paulo.', 'Copo baixo', 'Coqueteleira', 'Fatia de limão', true, array['Ácido','Doce','Clássico']::text[], 'melzinho (caipirinha de mel e limao)'),
('Jorge Amado', 'Tropicais', '[{"n":"Cachaça","q":"50 ml"},{"n":"Licor de maracujá","q":"25 ml"},{"n":"Limão","q":"20 ml"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Bata todos os ingredientes com gelo.
Coe para copo baixo com gelo.', 'Bata todos os ingredientes com gelo.
Coe para copo baixo com gelo.', 'Cachaça suave com maracujá e limão.', 'Drink símbolo de Paraty (RJ).', 'Copo baixo', 'Coqueteleira', 'Fatia de limão', true, array['Tropical','Clássico','Frutado']::text[], 'jorge amado'),
('Batida de Coco', 'Doces & Frutados', '[{"n":"Cachaça","q":"50 ml"},{"n":"Leite de coco","q":"60 ml"},{"n":"Leite condensado","q":"40 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata vigorosamente cachaça, leite de coco, leite condensado e gelo.
Coe para copo baixo ou taça.', 'Bata vigorosamente cachaça, leite de coco, leite condensado e gelo.
Coe para copo baixo ou taça.', 'Cremosa, doce e tradicional batida brasileira.', 'Patrimônio dos bares e quiosques.', 'Copo baixo', 'Coqueteleira', 'Coco ralado', true, array['Doce','Clássico','Tropical']::text[], 'batida de coco'),
('Batida de Maracujá', 'Doces & Frutados', '[{"n":"Cachaça","q":"50 ml"},{"n":"Suco de maracujá","q":"80 ml"},{"n":"Leite condensado","q":"40 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata todos os ingredientes com gelo até ficar bem cremoso.', 'Bata todos os ingredientes com gelo até ficar bem cremoso.', 'Cremosidade do leite condensado com acidez do maracujá.', 'Clássico das festas brasileiras.', 'Copo baixo', 'Coqueteleira', 'Sementes de maracujá', true, array['Doce','Tropical','Frutado']::text[], 'batida de maracuja'),
('Batida de Morango', 'Doces & Frutados', '[{"n":"Cachaça","q":"50 ml"},{"n":"Morango","q":"5 unid"},{"n":"Leite condensado","q":"40 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Macere os morangos e bata forte com cachaça, leite condensado e gelo.', 'Macere os morangos e bata forte com cachaça, leite condensado e gelo.', 'Rosa cremosa e bem frutada.', 'Favorita de quem prefere drinks doces.', 'Copo baixo', 'Coqueteleira', 'Morango', true, array['Doce','Frutado']::text[], 'batida de morango'),
('Batida de Abacaxi', 'Tropicais', '[{"n":"Cachaça","q":"50 ml"},{"n":"Suco de abacaxi","q":"80 ml"},{"n":"Leite condensado","q":"40 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata cachaça, suco de abacaxi, leite condensado e gelo na coqueteleira.', 'Bata cachaça, suco de abacaxi, leite condensado e gelo na coqueteleira.', 'Doce, cremosa e tropical.', 'Clássico brasileiro de quiosque.', 'Copo baixo', 'Coqueteleira', 'Fatia de abacaxi', true, array['Doce','Tropical']::text[], 'batida de abacaxi'),
('Bombeirinho', 'Doces & Frutados', '[{"n":"Cachaça","q":"50 ml"},{"n":"Grenadine","q":"20 ml"},{"n":"Limão","q":"20 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture ou bata cachaça, grenadine e limão com gelo.', 'Misture ou bata cachaça, grenadine e limão com gelo.', 'Vermelho vibrante, doce e cítrico.', 'Clássico de boteco brasileiro.', 'Copo baixo / Shot', 'Coqueteleira', 'Fatia de limão', true, array['Doce','Clássico','Fácil']::text[], 'bombeirinho'),
('Macunaíma', 'Fortes', '[{"n":"Cachaça","q":"50 ml"},{"n":"Fernet","q":"10 ml"},{"n":"Limão","q":"20 ml"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata todos os ingredientes com gelo.
Coe para copo baixo ou taça.', 'Bata todos os ingredientes com gelo.
Coe para copo baixo ou taça.', 'Cachaça equilibrada por limão, açúcar e o amargor herbal do Fernet.', 'Clássico moderno criado no Boca de Ouro em São Paulo.', 'Copo americano / baixo', 'Coqueteleira', 'Sem guarnição', true, array['Forte','Amargo','Clássico']::text[], 'macunaima'),
('Cachaça Mule', 'Refrescantes', '[{"n":"Cachaça","q":"50 ml"},{"n":"Limão","q":"20 ml"},{"n":"Ginger beer","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha o copo ou caneca com gelo, cachaça e limão.
Complete com ginger beer.', 'Encha o copo ou caneca com gelo, cachaça e limão.
Complete com ginger beer.', 'Mule brasileiro com frescor da cana e gengibre.', 'Releitura nacional do Moscow Mule.', 'Caneca', 'Direto no copo', 'Fatia de limão', false, array['Refrescante','Longo']::text[], 'cachaca mule'),
('Saquerinha de Morango', 'Doces & Frutados', '[{"n":"Saquê","q":"75 ml"},{"n":"Morango","q":"5 unid"},{"n":"Açúcar","q":"2 colheres"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Macere os morangos com açúcar.
Adicione gelo e saquê e bata ou mexa bem.', 'Macere os morangos com açúcar.
Adicione gelo e saquê e bata ou mexa bem.', 'Leve, aromática e muito suave com morangos.', 'Clássica em bares orientais e japoneses.', 'Copo baixo', 'Coqueteleira', 'Morango', true, array['Doce','Frutado','Clássico']::text[], 'saquerinha de morango'),
('Saquerinha de Kiwi', 'Cítricos', '[{"n":"Saquê","q":"75 ml"},{"n":"Kiwi","q":"1 unid"},{"n":"Açúcar","q":"2 colheres"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Macere o kiwi com açúcar.
Bata com saquê e gelo e sirva.', 'Macere o kiwi com açúcar.
Bata com saquê e gelo e sirva.', 'Suave e refrescante com acidez do kiwi.', 'Clássica nos restaurantes japoneses do Brasil.', 'Copo baixo', 'Coqueteleira', 'Rodelinha de kiwi', true, array['Frutado','Ácido','Refrescante']::text[], 'saquerinha de kiwi'),
('Saquerinha de Maracujá', 'Tropicais', '[{"n":"Saquê","q":"75 ml"},{"n":"Maracujá","q":"1 unid"},{"n":"Açúcar","q":"2 colheres"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Macere leve a polpa com açúcar.
Bata com saquê e gelo.', 'Macere leve a polpa com açúcar.
Bata com saquê e gelo.', 'Leveza do saquê com acidez tropical do maracujá.', 'Muito pedida em happy hours.', 'Copo baixo', 'Coqueteleira', 'Sementes de maracujá', true, array['Tropical','Ácido','Frutado']::text[], 'saquerinha de maracuja'),
('Saquerinha de Lichia', 'Doces & Frutados', '[{"n":"Saquê","q":"75 ml"},{"n":"Xarope de lichia","q":"25 ml"},{"n":"Limão","q":"15 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata saquê, xarope de lichia, limão e gelo.
Sirva no copo baixo com gelo.', 'Bata saquê, xarope de lichia, limão e gelo.
Sirva no copo baixo com gelo.', 'Sabor delicado e floral de lichia com saquê.', 'Harmonia oriental perfeita.', 'Copo baixo', 'Coqueteleira', 'Casca de limão', true, array['Doce','Charmoso','Frutado']::text[], 'saquerinha de lichia'),
('Saquê Tônica', 'Refrescantes', '[{"n":"Saquê","q":"70 ml"},{"n":"Água tônica","q":"completar"},{"n":"Limão","q":"1 rodela"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha a taça com gelo, adicione saquê e complete com tônica.', 'Encha a taça com gelo, adicione saquê e complete com tônica.', 'Baixo teor alcoólico e super refrescante.', 'Alternativa leve ao Gin Tônica.', 'Taça Gin', 'Direto na taça', 'Rodela de limão', false, array['Refrescante','Longo','Fácil']::text[], 'saque tonica'),
('Soju com Refrigerante de Limão', 'Refrescantes', '[{"n":"Soju","q":"75 ml"},{"n":"Refrigerante de limão","q":"completar"},{"n":"Limão","q":"1 rodela"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha o copo com gelo, adicione soju e complete com refrigerante de limão.', 'Encha o copo com gelo, adicione soju e complete com refrigerante de limão.', 'Suave, doce e leve ao estilo coreano.', 'Inspirado nos combos populares da Coreia.', 'Copo alto', 'Direto no copo', 'Fatia de limão', false, array['Refrescante','Fácil','Doce']::text[], 'soju com refrigerante de limao'),
('Soju de Morango com Leite Condensado', 'Doces & Frutados', '[{"n":"Soju","q":"75 ml"},{"n":"Xarope de morango","q":"25 ml"},{"n":"Leite condensado","q":"20 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata tudo com gelo e sirva bem gelado.', 'Bata tudo com gelo e sirva bem gelado.', 'Cremoso e doce estilo iogurte de morango.', 'Tendência dos bares asiáticos modernos.', 'Copo baixo', 'Coqueteleira', 'Morango', true, array['Doce','Frutado','Charmoso']::text[], 'soju de morango com leite condensado'),
('Pisco Sour', 'Cítricos', '[{"n":"Pisco","q":"60 ml"},{"n":"Limão","q":"25 ml"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Clara de ovo","q":"20 ml"},{"n":"Angostura","q":"3 gotas"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata sem gelo primeiro para formar espuma, depois bata com gelo.
Coe e finalize com gotas de Angostura na espuma.', 'Bata sem gelo primeiro para formar espuma, depois bata com gelo.
Coe e finalize com gotas de Angostura na espuma.', 'Sour sul-americano com espuma densa e aroma de bitter.', 'Patrimônio do Peru e do Chile.', 'Copo baixo / Taça', 'Coqueteleira', '3 gotas de Angostura', true, array['Clássico','Ácido','Charmoso']::text[], 'pisco sour'),
('Chilcano de Pisco', 'Refrescantes', '[{"n":"Pisco","q":"50 ml"},{"n":"Ginger ale","q":"completar"},{"n":"Limão","q":"15 ml"},{"n":"Angostura","q":"2 gotas"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha o copo alto de gelo, coloque pisco, limão, bitter e complete com ginger ale.', 'Encha o copo alto de gelo, coloque pisco, limão, bitter e complete com ginger ale.', 'Highball leve e perfumado com pisco.', 'Clássico refrescante peruano.', 'Copo alto', 'Direto no copo', 'Rodela de limão', false, array['Refrescante','Longo','Clássico']::text[], 'chilcano de pisco'),
('Sidecar', 'Cítricos', '[{"n":"Conhaque","q":"50 ml"},{"n":"Cointreau","q":"25 ml"},{"n":"Limão","q":"20 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata conhaque, Cointreau e limão com gelo.
Coe para taça coupe com borda de açúcar opcional.', 'Bata conhaque, Cointreau e limão com gelo.
Coe para taça coupe com borda de açúcar opcional.', 'Elegante e cítrico com base amadeirada de conhaque.', 'Clássico parisiense do pós-Primeira Guerra.', 'Taça Coupe', 'Coqueteleira', 'Casca de laranja', true, array['Clássico','Forte','Ácido']::text[], 'sidecar'),
('Alexander', 'Doces & Frutados', '[{"n":"Conhaque","q":"40 ml"},{"n":"Licor de cacau","q":"30 ml"},{"n":"Creme de leite","q":"30 ml"},{"n":"Noz-moscada","q":"pitada"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata forte conhaque, licor de cacau e creme de leite com gelo.
Coe para taça e rale noz-moscada por cima.', 'Bata forte conhaque, licor de cacau e creme de leite com gelo.
Coe para taça e rale noz-moscada por cima.', 'Sobremesa líquida cremosa com cacau e conhaque.', 'Clássico eternizado nos salões dos anos 1920.', 'Taça Coupe', 'Coqueteleira', 'Noz-moscada ralada', true, array['Doce','Clássico','Charmoso']::text[], 'alexander'),
('Brandy Milk Punch', 'Doces & Frutados', '[{"n":"Brandy","q":"50 ml"},{"n":"Leite","q":"90 ml"},{"n":"Xarope de baunilha","q":"20 ml"},{"n":"Noz-moscada","q":"pitada"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata tudo vigorosamente com gelo.
Coe para copo baixo com gelo e finalize com noz-moscada.', 'Bata tudo vigorosamente com gelo.
Coe para copo baixo com gelo e finalize com noz-moscada.', 'Cremoso e aromático com baunilha e brandy.', 'Clássico de brunch de Nova Orleans.', 'Copo baixo', 'Coqueteleira', 'Noz-moscada', true, array['Doce','Clássico']::text[], 'brandy milk punch'),
('French Connection', 'Fortes', '[{"n":"Conhaque","q":"45 ml"},{"n":"Licor de amêndoa (Amaretto)","q":"30 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Mexa conhaque e Amaretto no copo baixo com gelo.', 'Mexa conhaque e Amaretto no copo baixo com gelo.', 'Aveludado e aromático com toque de amêndoa.', 'Clássico da IBA dos anos 70.', 'Copo baixo', 'Direto no copo', 'Sem guarnição', false, array['Forte','Doce','Curto']::text[], 'french connection'),
('Campari Tonic', 'Aperitivos', '[{"n":"Campari","q":"50 ml"},{"n":"Água tônica","q":"completar"},{"n":"Laranja","q":"1 rodela"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha a taça ou copo com gelo, coloque o Campari e complete com água tônica.', 'Encha a taça ou copo com gelo, coloque o Campari e complete com água tônica.', 'Amargor cítrico refrescante com borbulhas.', 'Aperitivo italiano leve e elegante.', 'Taça Gin / Copo alto', 'Direto no copo', 'Rodela de laranja', false, array['Aperitivo','Amargo','Refrescante']::text[], 'campari tonic'),
('Garibaldi (Campari com Laranja)', 'Aperitivos', '[{"n":"Campari","q":"50 ml"},{"n":"Suco de laranja","q":"120 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha o copo alto com gelo.
Adicione Campari e complete com suco de laranja bem gelado.', 'Encha o copo alto com gelo.
Adicione Campari e complete com suco de laranja bem gelado.', 'Doce da laranja suavizando o amargo do Campari.', 'Clássico italiano simples e vibrante.', 'Copo alto', 'Direto no copo', 'Fatia de laranja', false, array['Aperitivo','Amargo','Fácil']::text[], 'garibaldi (campari com laranja)'),
('Americano', 'Aperitivos', '[{"n":"Campari","q":"35 ml"},{"n":"Vermute","q":"35 ml (tinto)"},{"n":"Água com gás","q":"completar"},{"n":"Laranja","q":"1 rodela"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque Campari e vermute tinto no copo com gelo.
Complete com água com gás.', 'Coloque Campari e vermute tinto no copo com gelo.
Complete com água com gás.', 'O antecessor do Negroni, mais leve e gaseificado.', 'Nascido em Milão na década de 1860.', 'Copo baixo / alto', 'Direto no copo', 'Meia fatia de laranja', false, array['Aperitivo','Amargo','Clássico']::text[], 'americano'),
('Cynar Tonic', 'Aperitivos', '[{"n":"Cynar","q":"50 ml"},{"n":"Água tônica","q":"completar"},{"n":"Limão","q":"1 rodela"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha o copo de gelo, adicione Cynar, limão e complete com tônica.', 'Encha o copo de gelo, adicione Cynar, limão e complete com tônica.', 'Herbal, agridoce e refrescante.', 'Clássico de balcão em São Paulo e Itália.', 'Copo alto', 'Direto no copo', 'Fatia de limão', false, array['Aperitivo','Amargo','Refrescante']::text[], 'cynar tonic'),
('Cynar Julep', 'Refrescantes', '[{"n":"Cynar","q":"50 ml"},{"n":"Hortelã","q":"8 folhas"},{"n":"Limão","q":"20 ml"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Macere leve hortelã com limão e xarope.
Adicione Cynar, gelo e complete com água com gás.', 'Macere leve hortelã com limão e xarope.
Adicione Cynar, gelo e complete com água com gás.', 'Refrescante herbal com hortelã e amargor equilibrado.', 'Clássico argentino muito amado.', 'Copo alto', 'Direto no copo', 'Ramo de hortelã', false, array['Com hortelã','Aperitivo','Amargo']::text[], 'cynar julep'),
('Mimosa', 'Aperitivos', '[{"n":"Espumante","q":"100 ml"},{"n":"Suco de laranja","q":"75 ml"}]'::jsonb, 'Sirva o suco de laranja gelado na taça flûte e complete com espumante.', 'Sirva o suco de laranja gelado na taça flûte e complete com espumante.', 'Leve, cítrico e borbulhante.', 'Clássico internacional de brunch e celebrações.', 'Taça Flûte', 'Montado', 'Meia fatia de laranja', false, array['Aperitivo','Clássico','Fácil']::text[], 'mimosa'),
('Kir Royale', 'Aperitivos', '[{"n":"Espumante","q":"120 ml"},{"n":"Licor de cassis","q":"20 ml"}]'::jsonb, 'Coloque o licor de cassis no fundo da taça flûte.
Complete delicadamente com espumante gelado.', 'Coloque o licor de cassis no fundo da taça flûte.
Complete delicadamente com espumante gelado.', 'Elegante, rubi e com notas frutadas de cassis.', 'Clássico francês da Borgonha.', 'Taça Flûte', 'Montado', 'Framboesa ou casca de limão', false, array['Aperitivo','Charmoso','Clássico']::text[], 'kir royale'),
('Bellini', 'Doces & Frutados', '[{"n":"Prosecco","q":"120 ml"},{"n":"Xarope de pêssego","q":"25 ml"}]'::jsonb, 'Coloque o xarope ou purê de pêssego na taça flûte.
Complete com Prosecco bem gelado e mexa leve.', 'Coloque o xarope ou purê de pêssego na taça flûte.
Complete com Prosecco bem gelado e mexa leve.', 'Doce, delicado e espumante com aroma de pêssego.', 'Criado no Harry’s Bar em Veneza nos anos 1940.', 'Taça Flûte', 'Montado', 'Sem guarnição', false, array['Charmoso','Doce','Clássico']::text[], 'bellini'),
('Rossini', 'Doces & Frutados', '[{"n":"Espumante","q":"120 ml"},{"n":"Morango","q":"3 unid"},{"n":"Xarope de açúcar","q":"10 ml"}]'::jsonb, 'Macere bem os morangos com xarope e coe para taça.
Complete com espumante gelado.', 'Macere bem os morangos com xarope e coe para taça.
Complete com espumante gelado.', 'Espumante frutado com morangos frescos.', 'Homenagem italiana ao compositor Gioachino Rossini.', 'Taça Flûte', 'Macerado + completar', 'Morango', false, array['Charmoso','Frutado','Aperitivo']::text[], 'rossini'),
('Hugo Spritz (Flor de Sabugueiro)', 'Aperitivos', '[{"n":"Licor de flor de sabugueiro","q":"40 ml"},{"n":"Espumante","q":"100 ml"},{"n":"Água com gás","q":"40 ml"},{"n":"Hortelã","q":"5 folhas"},{"n":"Limão","q":"1 rodela"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque gelo, hortelã e limão na taça.
Adicione o licor de flor de sabugueiro, espumante e água com gás.', 'Coloque gelo, hortelã e limão na taça.
Adicione o licor de flor de sabugueiro, espumante e água com gás.', 'Floral, leve e super refrescante.', 'Spritz alpino famoso em toda a Europa.', 'Taça Vinho / Gin', 'Direto na taça', 'Hortelã e limão', false, array['Aperitivo','Com hortelã','Charmoso']::text[], 'hugo spritz (flor de sabugueiro)'),
('Limoncello Spritz', 'Cítricos', '[{"n":"Limoncello","q":"50 ml"},{"n":"Espumante","q":"100 ml"},{"n":"Água com gás","q":"30 ml"},{"n":"Limão","q":"1 rodela"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha a taça de gelo, coloque Limoncello, espumante e água com gás.
Mexa delicadamente.', 'Encha a taça de gelo, coloque Limoncello, espumante e água com gás.
Mexa delicadamente.', 'Cítrico italiano de verão, doce e refrescante.', 'Inspirado na Costa Amalfitana.', 'Taça Vinho', 'Direto na taça', 'Limão siciliano e hortelã', false, array['Refrescante','Aperitivo','Ácido']::text[], 'limoncello spritz'),
('Lillet Vive', 'Aperitivos', '[{"n":"Lillet","q":"60 ml (blanc)"},{"n":"Água tônica","q":"100 ml"},{"n":"Morango","q":"2 unid"},{"n":"Pepino","q":"2 lâminas"},{"n":"Hortelã","q":"4 folhas"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha a taça com gelo, coloque Lillet Blanc e complete com tônica.
Decore com morango, pepino e hortelã.', 'Encha a taça com gelo, coloque Lillet Blanc e complete com tônica.
Decore com morango, pepino e hortelã.', 'Aperitivo francês floral, leve e elegante.', 'Serviço assinatura da casa Lillet.', 'Taça Gin', 'Direto na taça', 'Morango, pepino e hortelã', false, array['Aperitivo','Charmoso','Refrescante']::text[], 'lillet vive'),
('Clericot', 'Doces & Frutados', '[{"n":"Vinho branco","q":"120 ml"},{"n":"Abacaxi","q":"2 cubos"},{"n":"Morango","q":"2 unid"},{"n":"Maçã","q":"2 cubos"},{"n":"Laranja","q":"1 rodela"},{"n":"Água com gás","q":"40 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque as frutas picadas na taça com gelo.
Adicione vinho branco gelado e complete com água com gás.', 'Coloque as frutas picadas na taça com gelo.
Adicione vinho branco gelado e complete com água com gás.', 'Frutado, leve e colorido com vinho branco.', 'Clássico das praias do Cone Sul.', 'Taça grande', 'Montado', 'Frutas na taça', false, array['Frutado','Refrescante','Charmoso']::text[], 'clericot'),
('Sangria Clássica', 'Doces & Frutados', '[{"n":"Vinho tinto","q":"130 ml"},{"n":"Laranja","q":"2 fatias"},{"n":"Maçã","q":"3 cubos"},{"n":"Limão","q":"1 rodela"},{"n":"Açúcar","q":"1 colher"},{"n":"Soda","q":"50 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture vinho tinto, açúcar e frutas com gelo.
Complete com soda ou refrigerante cítrico.', 'Misture vinho tinto, açúcar e frutas com gelo.
Complete com soda ou refrigerante cítrico.', 'Vinho tinto gelado com frutas frescas.', 'Tradição espanhola apreciada no mundo todo.', 'Taça grande', 'Montado', 'Frutas e pau de canela', false, array['Frutado','Clássico','Doce']::text[], 'sangria classica'),
('Espanhola', 'Doces & Frutados', '[{"n":"Vinho tinto","q":"120 ml"},{"n":"Abacaxi","q":"3 cubos"},{"n":"Leite condensado","q":"40 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata vinho tinto, abacaxi, leite condensado e gelo até ficar cremoso.', 'Bata vinho tinto, abacaxi, leite condensado e gelo até ficar cremoso.', 'Batida roxa cremosa de vinho tinto e abacaxi.', 'Clássico absoluto de bares brasileiros.', 'Copo alto / Taça', 'Coqueteleira', 'Fatia de abacaxi', true, array['Doce','Frutado','Clássico']::text[], 'espanhola'),
('Amaretto Sour', 'Cítricos', '[{"n":"Licor de amêndoa (Amaretto)","q":"55 ml"},{"n":"Limão","q":"25 ml"},{"n":"Xarope de açúcar","q":"10 ml"},{"n":"Clara de ovo","q":"15 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata sem gelo e depois com gelo.
Coe para copo baixo com gelo e decore com cereja e laranja.', 'Bata sem gelo e depois com gelo.
Coe para copo baixo com gelo e decore com cereja e laranja.', 'Doce de amêndoas equilibrado com limão fresco e espuma.', 'Clássico dos anos 70 renovado por Jeffrey Morgenthaler.', 'Copo baixo', 'Coqueteleira', 'Cereja e laranja', true, array['Ácido','Doce','Clássico']::text[], 'amaretto sour'),
('Jägerbomb', 'Fortes', '[{"n":"Licor de ervas (Jägermeister)","q":"45 ml"},{"n":"Energético","q":"150 ml"}]'::jsonb, 'Sirva o energético gelado no copo e adicione a dose de Jägermeister.', 'Sirva o energético gelado no copo e adicione a dose de Jägermeister.', 'Herbal intenso combinado com energético.', 'Shot/drink icônico de casas noturnas.', 'Copo / Shot', 'Montado', 'Sem guarnição', false, array['Forte','Fácil']::text[], 'jagerbomb'),
('Baileys Iced Coffee', 'Doces & Frutados', '[{"n":"Licor de creme (Baileys)","q":"50 ml"},{"n":"Café espresso","q":"60 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha o copo baixo com gelo.
Adicione o café espresso frio e o Baileys e mexa.', 'Encha o copo baixo com gelo.
Adicione o café espresso frio e o Baileys e mexa.', 'Sobremesa gelada cremosa de café com creme irlandês.', 'Rápido, elegante e irresistível.', 'Copo baixo', 'Direto no copo', 'Grãos de café', false, array['Doce','Fácil','Charmoso']::text[], 'baileys iced coffee'),
('B-52', 'Doces & Frutados', '[{"n":"Licor de café","q":"20 ml"},{"n":"Licor de creme (Baileys)","q":"20 ml"},{"n":"Cointreau","q":"20 ml"}]'::jsonb, 'Monte em camadas usando uma colher bailarina: licor de café, Baileys e Cointreau.', 'Monte em camadas usando uma colher bailarina: licor de café, Baileys e Cointreau.', 'Shot clássico em 3 camadas contrastantes.', 'Clássico de balcão criado nos anos 70.', 'Copo de shot', 'Camadas', 'Sem guarnição', false, array['Doce','Forte','Charmoso']::text[], 'b-52'),
('Midori Sour (Licor de Melão)', 'Cítricos', '[{"n":"Licor de melão","q":"50 ml"},{"n":"Limão","q":"25 ml"},{"n":"Água com gás","q":"40 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Bata o licor de melão e limão com gelo.
Coe para copo com gelo e finalize com água com gás.', 'Bata o licor de melão e limão com gelo.
Coe para copo com gelo e finalize com água com gás.', 'Verde vibrante com sabor doce de melão e frescor cítrico.', 'Sucesso dos anos 80 de volta à moda.', 'Copo baixo', 'Coqueteleira', 'Cereja e limão', true, array['Doce','Ácido','Charmoso']::text[], 'midori sour (licor de melao)'),
('Grasshopper (Chocolate e Menta)', 'Doces & Frutados', '[{"n":"Licor de hortelã","q":"30 ml"},{"n":"Licor de cacau","q":"30 ml"},{"n":"Creme de leite","q":"30 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata bem todos os ingredientes com gelo.
Coe para taça coupe gelada.', 'Bata bem todos os ingredientes com gelo.
Coe para taça coupe gelada.', 'Lembra sorvete cremoso de menta com chocolate.', 'Clássico clássico de Nova Orleans.', 'Taça Coupe', 'Coqueteleira', 'Chocolate ralado', true, array['Doce','Clássico','Charmoso']::text[], 'grasshopper (chocolate e menta)'),
('Lichia Spritz', 'Doces & Frutados', '[{"n":"Licor de lichia","q":"45 ml"},{"n":"Espumante","q":"100 ml"},{"n":"Água com gás","q":"30 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha a taça com gelo, adicione licor de lichia, espumante e água com gás.', 'Encha a taça com gelo, adicione licor de lichia, espumante e água com gás.', 'Aromático, doce suave e elegante.', 'Muito pedido em festas e casamentos.', 'Taça Vinho', 'Direto na taça', 'Hortelã', false, array['Doce','Charmoso','Aperitivo']::text[], 'lichia spritz'),
('Bolo de Banana Gelado (Licor de Banana & Baileys)', 'Doces & Frutados', '[{"n":"Licor de banana","q":"30 ml"},{"n":"Licor de creme (Baileys)","q":"30 ml"},{"n":"Canela","q":"1 pitada"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata os licores com gelo e finalize com canela em pó.', 'Bata os licores com gelo e finalize com canela em pó.', 'Doce cremoso com toque de banana e canela.', 'Drink de sobremesa surpreendente.', 'Copo baixo', 'Coqueteleira', 'Canela', true, array['Doce','Charmoso']::text[], 'bolo de banana gelado (licor de banana & baileys)'),
('Fernet com Cola', 'Fortes', '[{"n":"Fernet","q":"50 ml"},{"n":"Coca-Cola","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque bastante gelo no copo alto, adicione Fernet e complete devagar com Coca-Cola.', 'Coloque bastante gelo no copo alto, adicione Fernet e complete devagar com Coca-Cola.', 'Herbal intenso e refrescante com cola.', 'Drink cultural mais popular da Argentina.', 'Copo alto', 'Direto no copo', 'Sem guarnição', false, array['Amargo','Forte','Clássico']::text[], 'fernet com cola'),
('Michelada Completa', 'Cítricos', '[{"n":"Cerveja","q":"1 garrafa"},{"n":"Limão","q":"30 ml"},{"n":"Sal","q":"na borda"},{"n":"Pimenta","q":"2 gotas"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Faça borda de sal na caneca.
Coloque gelo, limão, pimenta e complete com cerveja gelada.', 'Faça borda de sal na caneca.
Coloque gelo, limão, pimenta e complete com cerveja gelada.', 'Refrescante, salgada e levemente picante.', 'Clássico mexicano perfeito para dias quentes.', 'Caneca / Pint', 'Direto no copo', 'Borda de sal e limão', false, array['Ácido','Refrescante','Longo']::text[], 'michelada completa'),
('Cozumel', 'Cítricos', '[{"n":"Cerveja","q":"330 ml"},{"n":"Limão","q":"30 ml"},{"n":"Sal","q":"na borda"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Faça borda de sal na taça ou caneca.
Encha com gelo, limão e complete com cerveja.', 'Faça borda de sal na taça ou caneca.
Encha com gelo, limão e complete com cerveja.', 'Cerveja super gelada com limão e sal.', 'Clássico de botecos e bares brasileiros.', 'Caneca / Taça', 'Direto no copo', 'Borda de sal', false, array['Refrescante','Fácil','Ácido']::text[], 'cozumel'),
('Submarino com Jägermeister', 'Fortes', '[{"n":"Cerveja","q":"300 ml"},{"n":"Licor de ervas (Jägermeister)","q":"40 ml"}]'::jsonb, 'Sirva a cerveja gelada na caneca e acompanhe com o shot de Jägermeister.', 'Sirva a cerveja gelada na caneca e acompanhe com o shot de Jägermeister.', 'Chopp/cerveja combinado com ervas intensas.', 'Tradição festiva de pubs.', 'Pint + Shot', 'Montado', 'Sem guarnição', false, array['Forte','Clássico']::text[], 'submarino com jagermeister'),
('Radler de Tangerina', 'Refrescantes', '[{"n":"Cerveja","q":"250 ml"},{"n":"Xarope de tangerina","q":"20 ml"},{"n":"Refrigerante de limão","q":"80 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture xarope de tangerina e refrigerante de limão no copo e complete com cerveja gelada.', 'Misture xarope de tangerina e refrigerante de limão no copo e complete com cerveja gelada.', 'Cerveja leve, cítrica e super refrescante.', 'Inspirado na tradição alemã do Radler.', 'Pint', 'Montado', 'Fatia de laranja', false, array['Refrescante','Frutado','Longo']::text[], 'radler de tangerina'),
('Soda Italiana de Maçã Verde', 'Refrescantes', '[{"n":"Xarope de maçã verde","q":"35 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque gelo no copo alto, adicione xarope de maçã verde e complete com água com gás.', 'Coloque gelo no copo alto, adicione xarope de maçã verde e complete com água com gás.', 'Sem álcool, verde vibrante e refrescante.', 'Clássico para quem não consome álcool.', 'Copo alto', 'Direto no copo', 'Fatia de maçã', false, array['Com soda','Refrescante','Fácil']::text[], 'soda italiana de maca verde'),
('Soda Italiana de Morango', 'Doces & Frutados', '[{"n":"Xarope de morango","q":"35 ml"},{"n":"Água com gás","q":"completar"},{"n":"Limão","q":"10 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Adicione xarope de morango, limão e gelo no copo alto e complete com água com gás.', 'Adicione xarope de morango, limão e gelo no copo alto e complete com água com gás.', 'Doce frutado e borbulhante sem álcool.', 'Sucesso entre todas as idades.', 'Copo alto', 'Direto no copo', 'Morango', false, array['Com soda','Doce','Frutado']::text[], 'soda italiana de morango'),
('Soda Italiana de Maracujá', 'Tropicais', '[{"n":"Xarope de maracujá","q":"35 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha o copo alto com gelo, adicione xarope de maracujá e complete com água com gás.', 'Encha o copo alto com gelo, adicione xarope de maracujá e complete com água com gás.', 'Soda tropical sem álcool.', 'Refrescante para o dia todo.', 'Copo alto', 'Direto no copo', 'Hortelã', false, array['Com soda','Tropical','Fácil']::text[], 'soda italiana de maracuja'),
('Soda Italiana de Hibisco', 'Refrescantes', '[{"n":"Xarope de hibisco","q":"35 ml"},{"n":"Limão","q":"10 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture xarope de hibisco e limão no copo com gelo e complete com água com gás.', 'Misture xarope de hibisco e limão no copo com gelo e complete com água com gás.', 'Floral ácido sem álcool com cor rubi intensa.', 'Opção elegante sem álcool.', 'Copo alto', 'Direto no copo', 'Rodela de limão', false, array['Com soda','Charmoso','Refrescante']::text[], 'soda italiana de hibisco'),
('Soda Italiana de Melancia', 'Tropicais', '[{"n":"Xarope de melancia","q":"35 ml"},{"n":"Hortelã","q":"4 folhas"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque gelo e hortelã, adicione xarope de melancia e complete com água com gás.', 'Coloque gelo e hortelã, adicione xarope de melancia e complete com água com gás.', 'Soda leve e adocicada de melancia.', 'Refrescância imediata.', 'Copo alto', 'Direto no copo', 'Hortelã', false, array['Com soda','Com hortelã','Tropical']::text[], 'soda italiana de melancia'),
('Soda Italiana de Framboesa', 'Doces & Frutados', '[{"n":"Xarope de framboesa","q":"35 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque gelo no copo, adicione xarope de framboesa e complete com água com gás.', 'Coloque gelo no copo, adicione xarope de framboesa e complete com água com gás.', 'Frutada e borbulhante sem álcool.', 'Favorita de cardápios sem álcool.', 'Copo alto', 'Direto no copo', 'Framboesa', false, array['Com soda','Doce','Frutado']::text[], 'soda italiana de framboesa'),
('Soda Italiana de Kiwi', 'Cítricos', '[{"n":"Xarope de kiwi","q":"35 ml"},{"n":"Limão","q":"10 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Adicione xarope de kiwi e limão sobre gelo e complete com água com gás.', 'Adicione xarope de kiwi e limão sobre gelo e complete com água com gás.', 'Verde brilhante, cítrica e sem álcool.', 'Visual chamativo e leve.', 'Copo alto', 'Direto no copo', 'Fatia de kiwi', false, array['Com soda','Ácido','Refrescante']::text[], 'soda italiana de kiwi'),
('Soda Italiana de Tangerina', 'Cítricos', '[{"n":"Xarope de tangerina","q":"35 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque xarope de tangerina sobre gelo e complete com água com gás.', 'Coloque xarope de tangerina sobre gelo e complete com água com gás.', 'Cítrica e perfumada sem álcool.', 'Simples e vibrante.', 'Copo alto', 'Direto no copo', 'Fatia de laranja', false, array['Com soda','Refrescante','Fácil']::text[], 'soda italiana de tangerina'),
('Soda Italiana de Blue Curaçao', 'Tropicais', '[{"n":"Xarope de blue curaçao","q":"35 ml"},{"n":"Limão","q":"15 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture xarope blue curaçao e limão no copo com gelo e complete com água com gás.', 'Misture xarope blue curaçao e limão no copo com gelo e complete com água com gás.', 'Azul vibrante sem álcool com sabor de laranja e limão.', 'Sucesso garantido no balcão.', 'Copo alto', 'Direto no copo', 'Fatia de limão', false, array['Com soda','Charmoso','Refrescante']::text[], 'soda italiana de blue curacao'),
('Soda Italiana de Lavanda', 'Refrescantes', '[{"n":"Xarope de lavanda","q":"30 ml"},{"n":"Limão","q":"10 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque gelo, xarope de lavanda e limão e complete com água com gás.', 'Coloque gelo, xarope de lavanda e limão e complete com água com gás.', 'Floral relaxante e aromática sem álcool.', 'Elegância botânica sem álcool.', 'Copo alto', 'Direto no copo', 'Flores comestíveis', false, array['Com soda','Charmoso','Refrescante']::text[], 'soda italiana de lavanda'),
('Soda Italiana de Rosas', 'Refrescantes', '[{"n":"Xarope de rosas","q":"30 ml"},{"n":"Limão","q":"10 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture xarope de rosas e limão com gelo e complete com água com gás.', 'Misture xarope de rosas e limão com gelo e complete com água com gás.', 'Perfume delicado de rosas sem álcool.', 'Refrescante e autoral.', 'Copo alto', 'Direto no copo', 'Pétalas / Flores comestíveis', false, array['Com soda','Charmoso']::text[], 'soda italiana de rosas'),
('Soda Italiana de Lichia', 'Doces & Frutados', '[{"n":"Xarope de lichia","q":"35 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Adicione xarope de lichia no copo com gelo e complete com água com gás.', 'Adicione xarope de lichia no copo com gelo e complete com água com gás.', 'Doce floral de lichia sem álcool.', 'Muito pedida em eventos.', 'Copo alto', 'Direto no copo', 'Hortelã', false, array['Com soda','Doce','Fácil']::text[], 'soda italiana de lichia'),
('Soda Italiana de Manga com Pimenta', 'Tropicais', '[{"n":"Xarope de manga","q":"30 ml"},{"n":"Xarope de pimenta","q":"10 ml"},{"n":"Limão","q":"15 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture os xaropes e limão sobre gelo e complete com água com gás.', 'Misture os xaropes e limão sobre gelo e complete com água com gás.', 'Contraste ousado de manga doce com picância leve.', 'Soda autoral diferenciada.', 'Copo alto', 'Direto no copo', 'Pimenta ou fatia de limão', false, array['Com soda','Tropical','Charmoso']::text[], 'soda italiana de manga com pimenta'),
('Soda Italiana de Pepino com Limão', 'Refrescantes', '[{"n":"Xarope de pepino","q":"30 ml"},{"n":"Limão","q":"15 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Adicione xarope de pepino e limão sobre gelo e complete com água com gás.', 'Adicione xarope de pepino e limão sobre gelo e complete com água com gás.', 'Ultra refrescante e leve sem álcool.', 'Perfeita para limpar o paladar.', 'Copo alto', 'Direto no copo', 'Lâmina de pepino', false, array['Com soda','Refrescante','Ácido']::text[], 'soda italiana de pepino com limao'),
('Soda Italiana de Romã', 'Doces & Frutados', '[{"n":"Xarope de romã","q":"35 ml"},{"n":"Limão","q":"10 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque gelo, xarope de romã e limão e complete com água com gás.', 'Coloque gelo, xarope de romã e limão e complete com água com gás.', 'Agridoce de romã com gás refrescante.', 'Alternativa sofisticada sem álcool.', 'Copo alto', 'Direto no copo', 'Hortelã', false, array['Com soda','Frutado']::text[], 'soda italiana de roma'),
('Soda Italiana de Cranberry', 'Cítricos', '[{"n":"Xarope de cranberry","q":"35 ml"},{"n":"Limão","q":"10 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture xarope de cranberry e limão com gelo e complete com água com gás.', 'Misture xarope de cranberry e limão com gelo e complete com água com gás.', 'Vermelha, levemente ácida e refrescante.', 'Soda frutada sem álcool.', 'Copo alto', 'Direto no copo', 'Fatia de limão', false, array['Com soda','Ácido','Refrescante']::text[], 'soda italiana de cranberry'),
('Soda Italiana de Pêssego', 'Doces & Frutados', '[{"n":"Xarope de pêssego","q":"35 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque xarope de pêssego sobre gelo e complete com água com gás.', 'Coloque xarope de pêssego sobre gelo e complete com água com gás.', 'Suave, doce e perfumada de pêssego.', 'Clássico das sodas italianas.', 'Copo alto', 'Direto no copo', 'Hortelã', false, array['Com soda','Doce','Fácil']::text[], 'soda italiana de pessego'),
('Soda Italiana de Amora', 'Doces & Frutados', '[{"n":"Xarope de amora","q":"35 ml"},{"n":"Limão","q":"10 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture xarope de amora e limão sobre gelo e complete com água com gás.', 'Misture xarope de amora e limão sobre gelo e complete com água com gás.', 'Frutas escuras refrescantes sem álcool.', 'Sabor intenso e cor linda.', 'Copo alto', 'Direto no copo', 'Hortelã', false, array['Com soda','Frutado']::text[], 'soda italiana de amora'),
('Soda Italiana de Mirtilo', 'Doces & Frutados', '[{"n":"Xarope de mirtilo","q":"35 ml"},{"n":"Limão","q":"10 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture xarope de mirtilo e limão sobre gelo e complete com água com gás.', 'Misture xarope de mirtilo e limão sobre gelo e complete com água com gás.', 'Doce aromático de blueberry sem álcool.', 'Soda moderna muito pedida.', 'Copo alto', 'Direto no copo', 'Fatia de limão', false, array['Com soda','Frutado','Charmoso']::text[], 'soda italiana de mirtilo'),
('Soda Italiana de Gengibre e Limão', 'Refrescantes', '[{"n":"Xarope de gengibre","q":"30 ml"},{"n":"Limão","q":"20 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture xarope de gengibre e limão no copo com gelo e complete com água com gás.', 'Misture xarope de gengibre e limão no copo com gelo e complete com água com gás.', 'Picante e cítrica sem álcool (estilo ginger beer artesanal).', 'Ótima opção zero álcool no estilo Moscow Mule.', 'Copo alto', 'Direto no copo', 'Gengibre e limão', false, array['Com soda','Refrescante','Ácido']::text[], 'soda italiana de gengibre e limao'),
('Pink Lemonade Artesanal', 'Cítricos', '[{"n":"Limão","q":"35 ml"},{"n":"Grenadine","q":"20 ml"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture limão, xarope de açúcar e grenadine sobre gelo.
Complete com água com gás.', 'Misture limão, xarope de açúcar e grenadine sobre gelo.
Complete com água com gás.', 'Limonada rosada borbulhante sem álcool.', 'Clássica em hamburguerias e bares.', 'Copo alto', 'Direto no copo', 'Rodela de limão', false, array['Com soda','Ácido','Charmoso']::text[], 'pink lemonade artesanal'),
('Virgin Mojito (Sem Álcool)', 'Refrescantes', '[{"n":"Hortelã","q":"8 folhas"},{"n":"Limão","q":"25 ml"},{"n":"Açúcar","q":"2 colheres"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Macere leve hortelã, limão e açúcar.
Encha de gelo e complete com água com gás.', 'Macere leve hortelã, limão e açúcar.
Encha de gelo e complete com água com gás.', 'Todo o frescor do Mojito sem álcool.', 'O mocktail mais pedido em qualquer bar.', 'Copo alto', 'Direto no copo', 'Ramo de hortelã', false, array['Com hortelã','Com soda','Refrescante']::text[], 'virgin mojito (sem alcool)'),
('Espresso Tônica', 'Refrescantes', '[{"n":"Café espresso","q":"45 ml"},{"n":"Água tônica","q":"120 ml"},{"n":"Laranja","q":"1 rodela"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha o copo com gelo e água tônica.
Despeje o café espresso lentamente por cima.', 'Encha o copo com gelo e água tônica.
Despeje o café espresso lentamente por cima.', 'Contraste brilhante de café espresso com tônica cítrica.', 'Sensação das cafeterias e bares modernos.', 'Copo alto', 'Montado', 'Rodela de laranja', false, array['Refrescante','Amargo','Charmoso']::text[], 'espresso tonica'),
('Café Gelado Baunilha e Caramelo', 'Doces & Frutados', '[{"n":"Café espresso","q":"50 ml"},{"n":"Leite","q":"120 ml"},{"n":"Xarope de baunilha","q":"20 ml"},{"n":"Calda de caramelo","q":"15 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Decore o copo com calda de caramelo, coloque gelo, leite e xarope de baunilha.
Finalize com espresso.', 'Decore o copo com calda de caramelo, coloque gelo, leite e xarope de baunilha.
Finalize com espresso.', 'Iced latte doce e cremoso sem álcool.', 'Sucesso em cafeterias e bares diurnos.', 'Copo alto', 'Montado', 'Fios de calda de caramelo', false, array['Doce','Charmoso','Fácil']::text[], 'cafe gelado baunilha e caramelo'),
('Chá Gelado de Pêssego e Limão', 'Refrescantes', '[{"n":"Chá","q":"150 ml"},{"n":"Xarope de pêssego","q":"25 ml"},{"n":"Limão","q":"15 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture o chá frio, xarope de pêssego e limão no copo com gelo.', 'Misture o chá frio, xarope de pêssego e limão no copo com gelo.', 'Ice tea artesanal refrescante sem álcool.', 'Leve e muito agradável.', 'Copo alto', 'Direto no copo', 'Hortelã e limão', false, array['Refrescante','Fácil','Doce']::text[], 'cha gelado de pessego e limao'),
('Chá Gelado de Hibisco com Morango', 'Refrescantes', '[{"n":"Chá","q":"140 ml"},{"n":"Xarope de hibisco","q":"20 ml"},{"n":"Morango","q":"3 unid"},{"n":"Hortelã","q":"4 folhas"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Macere leve os morangos, coloque gelo, chá, xarope de hibisco e hortelã.', 'Macere leve os morangos, coloque gelo, chá, xarope de hibisco e hortelã.', 'Aromático e frutado sem álcool.', 'Refrescante para o cardápio zero álcool.', 'Copo alto', 'Direto no copo', 'Morango e hortelã', false, array['Com hortelã','Frutado','Refrescante']::text[], 'cha gelado de hibisco com morango'),
('Milkshake Alcoólico de Whisky e Caramelo', 'Doces & Frutados', '[{"n":"Whisky","q":"45 ml"},{"n":"Sorvete de baunilha","q":"2 bolas"},{"n":"Leite","q":"50 ml"},{"n":"Calda de caramelo","q":"20 ml"}]'::jsonb, 'Bata o sorvete com leite, whisky e calda de caramelo.
Sirva em copo decorado com calda.', 'Bata o sorvete com leite, whisky e calda de caramelo.
Sirva em copo decorado com calda.', 'Sobremesa alcoólica cremosa e intensa.', 'Sucesso em gastrobares e burger bars.', 'Taça Milkshake', 'Liquidificador / Coqueteleira', 'Calda de caramelo e chantilly', true, array['Doce','Charmoso','Forte']::text[], 'milkshake alcoolico de whisky e caramelo'),
('Gin Sour de Framboesa', 'Cítricos', '[{"n":"Gin","q":"50 ml"},{"n":"Limão","q":"25 ml"},{"n":"Xarope de framboesa","q":"20 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata gin, limão e xarope de framboesa com gelo.
Coe para copo baixo com gelo novo.', 'Bata gin, limão e xarope de framboesa com gelo.
Coe para copo baixo com gelo novo.', 'Sour rosado com acidez cítrica e perfume de framboesa.', 'Fácil e visualmente encantador.', 'Copo baixo', 'Coqueteleira', 'Framboesa', true, array['Ácido','Frutado','Charmoso']::text[], 'gin sour de framboesa'),
('Vodka Sour de Maracujá', 'Tropicais', '[{"n":"Vodka","q":"50 ml"},{"n":"Limão","q":"20 ml"},{"n":"Xarope de maracujá","q":"25 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata vodka, limão e xarope de maracujá com gelo.
Coe para copo baixo com gelo.', 'Bata vodka, limão e xarope de maracujá com gelo.
Coe para copo baixo com gelo.', 'Tropical ácido e suave.', 'Prático usando xarope de maracujá.', 'Copo baixo', 'Coqueteleira', 'Rodela de limão', true, array['Tropical','Ácido','Fácil']::text[], 'vodka sour de maracuja'),
('Vodka Sour de Morango', 'Doces & Frutados', '[{"n":"Vodka","q":"50 ml"},{"n":"Limão","q":"20 ml"},{"n":"Xarope de morango","q":"25 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata vodka, limão e xarope de morango com gelo.
Coe para copo baixo.', 'Bata vodka, limão e xarope de morango com gelo.
Coe para copo baixo.', 'Doce de morango equilibrado pelo limão.', 'Rápido de padronizar no bar.', 'Copo baixo', 'Coqueteleira', 'Morango', true, array['Doce','Frutado','Fácil']::text[], 'vodka sour de morango'),
('Vodka com Xarope de Baunilha e Maracujá (Pornstar Simples)', 'Tropicais', '[{"n":"Vodka","q":"50 ml"},{"n":"Xarope de baunilha","q":"20 ml"},{"n":"Suco de maracujá","q":"50 ml"},{"n":"Limão","q":"15 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata tudo forte com gelo e coe para taça coupe gelada.', 'Bata tudo forte com gelo e coe para taça coupe gelada.', 'Combinação clássica de baunilha cremosa com maracujá ácido.', 'Inspirado no famoso Pornstar Martini.', 'Taça Coupe', 'Coqueteleira', 'Meio maracujá', true, array['Tropical','Charmoso','Doce']::text[], 'vodka com xarope de baunilha e maracuja (pornstar simples)'),
('Vodka Tônica de Pepino', 'Refrescantes', '[{"n":"Vodka","q":"50 ml"},{"n":"Xarope de pepino","q":"20 ml"},{"n":"Água tônica","q":"completar"},{"n":"Limão","q":"10 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture vodka, xarope de pepino e limão no copo com gelo e complete com tônica.', 'Misture vodka, xarope de pepino e limão no copo com gelo e complete com tônica.', 'Limpo, verde e super refrescante.', 'Leveza para dias quentes.', 'Copo alto', 'Direto no copo', 'Fita de pepino', false, array['Refrescante','Longo','Fácil']::text[], 'vodka tonica de pepino'),
('Vodka Soda de Melancia', 'Tropicais', '[{"n":"Vodka","q":"50 ml"},{"n":"Xarope de melancia","q":"25 ml"},{"n":"Limão","q":"10 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha o copo de gelo, adicione vodka, xarope de melancia, limão e complete com água com gás.', 'Encha o copo de gelo, adicione vodka, xarope de melancia, limão e complete com água com gás.', 'Refrescante e doce na medida certa.', 'Highball frutado prático.', 'Copo alto', 'Direto no copo', 'Hortelã', false, array['Com soda','Tropical','Refrescante']::text[], 'vodka soda de melancia'),
('Vodka Soda de Manga', 'Tropicais', '[{"n":"Vodka","q":"50 ml"},{"n":"Xarope de manga","q":"25 ml"},{"n":"Limão","q":"10 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture vodka, xarope de manga e limão com gelo e complete com água com gás.', 'Misture vodka, xarope de manga e limão com gelo e complete com água com gás.', 'Sabor tropical envolvente de manga.', 'Fácil de fazer com xarope.', 'Copo alto', 'Direto no copo', 'Limão', false, array['Com soda','Tropical','Doce']::text[], 'vodka soda de manga'),
('Vodka Soda de Kiwi', 'Cítricos', '[{"n":"Vodka","q":"50 ml"},{"n":"Xarope de kiwi","q":"25 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque gelo no copo, vodka, xarope de kiwi e complete com água com gás.', 'Coloque gelo no copo, vodka, xarope de kiwi e complete com água com gás.', 'Verde vibrante e cítrico suave.', 'Rápido e refrescante.', 'Copo alto', 'Direto no copo', 'Kiwi ou limão', false, array['Com soda','Ácido','Fácil']::text[], 'vodka soda de kiwi'),
('Vodka Soda de Tangerina', 'Cítricos', '[{"n":"Vodka","q":"50 ml"},{"n":"Xarope de tangerina","q":"25 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture vodka e xarope de tangerina sobre gelo e complete com água com gás.', 'Misture vodka e xarope de tangerina sobre gelo e complete com água com gás.', 'Cítrico adocicado e refrescante.', 'Highball leve de tangerina.', 'Copo alto', 'Direto no copo', 'Casca de laranja', false, array['Com soda','Frutado','Refrescante']::text[], 'vodka soda de tangerina'),
('Rum Soda de Abacaxi', 'Tropicais', '[{"n":"Rum","q":"50 ml"},{"n":"Xarope de abacaxi","q":"25 ml"},{"n":"Limão","q":"15 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture rum, xarope de abacaxi e limão sobre gelo e complete com água com gás.', 'Misture rum, xarope de abacaxi e limão sobre gelo e complete com água com gás.', 'Tropical com toque leve e gaseificado.', 'Highball caribenho.', 'Copo alto', 'Direto no copo', 'Fatia de abacaxi', false, array['Tropical','Com soda','Refrescante']::text[], 'rum soda de abacaxi'),
('Rum com Xarope de Coco e Abacaxi', 'Tropicais', '[{"n":"Rum","q":"50 ml"},{"n":"Xarope de coco","q":"25 ml"},{"n":"Suco de abacaxi","q":"100 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata rum, xarope de coco e suco de abacaxi com gelo e sirva.', 'Bata rum, xarope de coco e suco de abacaxi com gelo e sirva.', 'Versão leve estilo Piña Colada sem creme.', 'Tropical aromático.', 'Copo alto', 'Coqueteleira', 'Fatia de abacaxi', true, array['Tropical','Doce','Fácil']::text[], 'rum com xarope de coco e abacaxi'),
('Vodka com Xarope de Caramelo e Café', 'Doces & Frutados', '[{"n":"Vodka","q":"50 ml"},{"n":"Café espresso","q":"40 ml"},{"n":"Xarope de caramelo","q":"20 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata forte vodka, café frio e xarope de caramelo com gelo.
Coe para taça coupe.', 'Bata forte vodka, café frio e xarope de caramelo com gelo.
Coe para taça coupe.', 'Café espresso com doçura tostada de caramelo.', 'Variação prática do Espresso Martini.', 'Taça Coupe', 'Coqueteleira', 'Grãos de café', true, array['Doce','Charmoso']::text[], 'vodka com xarope de caramelo e cafe'),
('Whisky com Xarope de Mel e Canela', 'Fortes', '[{"n":"Whisky","q":"50 ml"},{"n":"Xarope de mel","q":"15 ml"},{"n":"Xarope de canela","q":"10 ml"},{"n":"Limão","q":"15 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata todos os ingredientes com gelo e coe para copo baixo com gelo.', 'Bata todos os ingredientes com gelo e coe para copo baixo com gelo.', 'Quente nas especiarias, doce de mel e acidez equilibrada.', 'Coquetel aconchegante para noites mais frescas.', 'Copo baixo', 'Coqueteleira', 'Pau de canela', true, array['Forte','Doce','Charmoso']::text[], 'whisky com xarope de mel e canela'),
('Tequila com Xarope de Tangerina e Pimenta', 'Cítricos', '[{"n":"Tequila","q":"50 ml"},{"n":"Xarope de tangerina","q":"20 ml"},{"n":"Xarope de pimenta","q":"10 ml"},{"n":"Limão","q":"20 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata tequila, xaropes e limão com gelo.
Coe para copo baixo com gelo.', 'Bata tequila, xaropes e limão com gelo.
Coe para copo baixo com gelo.', 'Cítrico picante com personalidade mexicana.', 'Combinação marcante de agave, cítrico e pimenta.', 'Copo baixo', 'Coqueteleira', 'Casca de laranja', true, array['Ácido','Forte','Charmoso']::text[], 'tequila com xarope de tangerina e pimenta'),
('Gin Tônica de Framboesa e Hortelã', 'Refrescantes', '[{"n":"Gin","q":"50 ml"},{"n":"Framboesa","q":"4 unid"},{"n":"Hortelã","q":"4 folhas"},{"n":"Água tônica","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque framboesas, hortelã e gelo na taça.
Adicione gin e complete com água tônica.', 'Coloque framboesas, hortelã e gelo na taça.
Adicione gin e complete com água tônica.', 'Aromático e frutado com framboesa fresca.', 'Clássico elegante de taça.', 'Taça Gin', 'Direto na taça', 'Framboesa e hortelã', false, array['Com hortelã','Frutado','Refrescante']::text[], 'gin tonica de framboesa e hortela'),
('Gin Tônica de Laranja e Anis-estrelado', 'Refrescantes', '[{"n":"Gin","q":"50 ml"},{"n":"Laranja","q":"1 rodela"},{"n":"Anis-estrelado","q":"1 unid"},{"n":"Água tônica","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha a taça com gelo, laranja e anis-estrelado.
Adicione gin e complete com tônica.', 'Encha a taça com gelo, laranja e anis-estrelado.
Adicione gin e complete com tônica.', 'Especiado elegante com perfume de anis e laranja.', 'Serviço clássico de gin botânico.', 'Taça Gin', 'Direto na taça', 'Anis-estrelado e laranja', false, array['Charmoso','Refrescante','Clássico']::text[], 'gin tonica de laranja e anis-estrelado'),
('Gin Tônica de Limão e Gengibre', 'Refrescantes', '[{"n":"Gin","q":"50 ml"},{"n":"Limão","q":"2 fatias"},{"n":"Gengibre","q":"2 fatias"},{"n":"Água tônica","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque as fatias de gengibre e limão na taça com gelo.
Adicione gin e complete com tônica.', 'Coloque as fatias de gengibre e limão na taça com gelo.
Adicione gin e complete com tônica.', 'Picância sutil do gengibre fresco com tônica.', 'Refrescante e vibrante.', 'Taça Gin', 'Direto na taça', 'Limão e gengibre', false, array['Refrescante','Ácido','Longo']::text[], 'gin tonica de limao e gengibre'),
('Cachaça com Xarope de Tamarindo e Limão', 'Cítricos', '[{"n":"Cachaça","q":"50 ml"},{"n":"Xarope de tamarindo","q":"25 ml"},{"n":"Limão","q":"20 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata cachaça, xarope de tamarindo e limão com gelo e coe.', 'Bata cachaça, xarope de tamarindo e limão com gelo e coe.', 'Agridoce exótico de tamarindo com cachaça.', 'Sabor regional brasileiro em formato sour.', 'Copo baixo', 'Coqueteleira', 'Limão', true, array['Ácido','Tropical','Charmoso']::text[], 'cachaca com xarope de tamarindo e limao'),
('Cachaça com Xarope de Goiaba e Limão', 'Tropicais', '[{"n":"Cachaça","q":"50 ml"},{"n":"Xarope de goiaba","q":"25 ml"},{"n":"Limão","q":"20 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata tudo com gelo e coe para copo baixo com gelo.', 'Bata tudo com gelo e coe para copo baixo com gelo.', 'Sabor brasileiro doce-ácido de goiaba com cachaça.', 'Coquetel tropical brasileiro.', 'Copo baixo', 'Coqueteleira', 'Fatia de limão', true, array['Tropical','Frutado','Doce']::text[], 'cachaca com xarope de goiaba e limao'),
('Gin com Xarope de Violeta e Limão (Aviation Simplificado)', 'Cítricos', '[{"n":"Gin","q":"50 ml"},{"n":"Xarope de violeta","q":"15 ml"},{"n":"Limão","q":"20 ml"},{"n":"Maraschino","q":"10 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata todos os ingredientes com gelo.
Coe para taça coupe gelada.', 'Bata todos os ingredientes com gelo.
Coe para taça coupe gelada.', 'Cor lilás celestial e perfume floral clássico.', 'Inspirado no Aviation de 1916.', 'Taça Coupe', 'Coqueteleira', 'Cereja', true, array['Charmoso','Clássico','Ácido']::text[], 'gin com xarope de violeta e limao (aviation simplificado)'),
('Vodka com Xarope de Cardamomo e Tônica', 'Refrescantes', '[{"n":"Vodka","q":"50 ml"},{"n":"Xarope de cardamomo","q":"15 ml"},{"n":"Limão","q":"10 ml"},{"n":"Água tônica","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture vodka, xarope de cardamomo e limão no copo com gelo e complete com tônica.', 'Misture vodka, xarope de cardamomo e limão no copo com gelo e complete com tônica.', 'Perfume especiado sofisticado e refrescante.', 'Highball moderno de especiarias.', 'Copo alto', 'Direto no copo', 'Casca de limão', false, array['Refrescante','Charmoso']::text[], 'vodka com xarope de cardamomo e tonica'),
('Whisky com Xarope de Açúcar Mascavo (Old Fashioned Mascavo)', 'Fortes', '[{"n":"Whisky","q":"60 ml"},{"n":"Xarope de açúcar mascavo","q":"10 ml"},{"n":"Angostura","q":"2 gotas"},{"n":"Laranja","q":"1 casca"},{"n":"Gelo","q":"cubo grande"}]'::jsonb, 'Mexa whisky, xarope de mascavo e Angostura com gelo grande no copo baixo.', 'Mexa whisky, xarope de mascavo e Angostura com gelo grande no copo baixo.', 'Notas profundas de caramelo escuro no clássico Old Fashioned.', 'Variação rica do clássico americano.', 'Copo baixo', 'Mexido no copo', 'Casca de laranja', false, array['Forte','Clássico','Curto']::text[], 'whisky com xarope de acucar mascavo (old fashioned mascavo)'),
('Rum com Xarope de Demerara e Limão (Daiquiri Demerara)', 'Cítricos', '[{"n":"Rum","q":"60 ml"},{"n":"Xarope de demerara","q":"20 ml"},{"n":"Limão","q":"25 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata rum, xarope de demerara e limão com gelo e coe para taça.', 'Bata rum, xarope de demerara e limão com gelo e coe para taça.', 'Daiquiri com doçura mais complexa e tostada.', 'Preferido por muitos bartenders.', 'Taça Coupe', 'Coqueteleira', 'Fatia de limão', true, array['Ácido','Clássico','Curto']::text[], 'rum com xarope de demerara e limao (daiquiri demerara)'),
('Cachaça com Xarope de Acerola e Limão', 'Cítricos', '[{"n":"Cachaça","q":"50 ml"},{"n":"Xarope de acerola","q":"25 ml"},{"n":"Limão","q":"15 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata cachaça, xarope de acerola e limão com gelo e sirva.', 'Bata cachaça, xarope de acerola e limão com gelo e sirva.', 'Frutado cítrico brasileiro vibrante.', 'Sabor tropical de fruta nacional.', 'Copo baixo', 'Coqueteleira', 'Limão', true, array['Tropical','Ácido','Frutado']::text[], 'cachaca com xarope de acerola e limao'),
('Cachaça com Xarope de Caju e Limão', 'Tropicais', '[{"n":"Cachaça","q":"50 ml"},{"n":"Xarope de caju","q":"25 ml"},{"n":"Limão","q":"15 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata cachaça, xarope de caju e limão com gelo.', 'Bata cachaça, xarope de caju e limão com gelo.', 'Caju adstringente e doce harmonizando com cachaça.', 'Inspirado na tradicional cajuína nordestina.', 'Copo baixo', 'Coqueteleira', 'Fatia de limão', true, array['Tropical','Frutado']::text[], 'cachaca com xarope de caju e limao'),
('Absinto Frappé', 'Fortes', '[{"n":"Absinto","q":"40 ml"},{"n":"Xarope de hortelã","q":"15 ml"},{"n":"Água com gás","q":"60 ml"},{"n":"Gelo","q":"triturado"}]'::jsonb, 'Bata absinto e xarope de hortelã com gelo e coe sobre gelo triturado.
Complete com água com gás.', 'Bata absinto e xarope de hortelã com gelo e coe sobre gelo triturado.
Complete com água com gás.', 'Anis intenso e refrescante com hortelã.', 'Clássico da Belle Époque em Nova Orleans e Paris.', 'Taça / Copo baixo', 'Coqueteleira', 'Hortelã', true, array['Forte','Com hortelã','Clássico']::text[], 'absinto frappe'),
('Bitter de Laranja Spritz (Aperol + Bitter de Laranja)', 'Aperitivos', '[{"n":"Aperol","q":"60 ml"},{"n":"Espumante","q":"90 ml"},{"n":"Bitter de laranja","q":"2 gotas"},{"n":"Água com gás","q":"30 ml"},{"n":"Laranja","q":"1 rodela"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Monte em taça com gelo e perfume com 2 gotas de bitter de laranja.', 'Monte em taça com gelo e perfume com 2 gotas de bitter de laranja.', 'Spritz com aroma cítrico ainda mais acentuado.', 'Toque de bartender no Aperol Spritz.', 'Taça Vinho', 'Direto na taça', 'Rodela de laranja', false, array['Aperitivo','Refrescante','Charmoso']::text[], 'bitter de laranja spritz (aperol + bitter de laranja)'),
('Vodka com Xarope de Amora e Limão', 'Doces & Frutados', '[{"n":"Vodka","q":"50 ml"},{"n":"Xarope de amora","q":"25 ml"},{"n":"Limão","q":"20 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata vodka, xarope de amora e limão com gelo e sirva.', 'Bata vodka, xarope de amora e limão com gelo e sirva.', 'Roxo intenso, doce e ácido na medida.', 'Coquetel frutado rápido.', 'Copo baixo', 'Coqueteleira', 'Limão', true, array['Frutado','Doce','Fácil']::text[], 'vodka com xarope de amora e limao'),
('Vodka com Xarope de Mirtilo e Tônica', 'Refrescantes', '[{"n":"Vodka","q":"50 ml"},{"n":"Xarope de mirtilo","q":"20 ml"},{"n":"Água tônica","q":"completar"},{"n":"Limão","q":"10 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque gelo, vodka, xarope de mirtilo e limão.
Complete com água tônica.', 'Coloque gelo, vodka, xarope de mirtilo e limão.
Complete com água tônica.', 'Cor azul-violeta elegante com sabor de mirtilo.', 'Highball frutado moderno.', 'Copo alto', 'Direto no copo', 'Fatia de limão', false, array['Refrescante','Frutado','Charmoso']::text[], 'vodka com xarope de mirtilo e tonica'),
('Vodka com Xarope de Cereja e Cola', 'Doces & Frutados', '[{"n":"Vodka","q":"50 ml"},{"n":"Xarope de cereja","q":"20 ml"},{"n":"Coca-Cola","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture vodka e xarope de cereja sobre gelo e complete com Coca-Cola.', 'Misture vodka e xarope de cereja sobre gelo e complete com Coca-Cola.', 'Estilo cherry coke alcoólica refrescante.', 'Doce e nostálgico.', 'Copo alto', 'Direto no copo', 'Cereja', false, array['Doce','Fácil','Longo']::text[], 'vodka com xarope de cereja e cola'),
('Gin com Xarope de Pera e Tônica', 'Refrescantes', '[{"n":"Gin","q":"50 ml"},{"n":"Xarope de pera","q":"20 ml"},{"n":"Água tônica","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture gin e xarope de pera em taça com gelo e complete com tônica.', 'Misture gin e xarope de pera em taça com gelo e complete com tônica.', 'Frutado sutil e elegante de pera com zimbro.', 'Serviço aromático moderno.', 'Taça Gin', 'Direto na taça', 'Fatia de limão ou alecrim', false, array['Refrescante','Frutado','Charmoso']::text[], 'gin com xarope de pera e tonica'),
('Gin com Xarope de Banana e Limão', 'Tropicais', '[{"n":"Gin","q":"50 ml"},{"n":"Xarope de banana","q":"20 ml"},{"n":"Limão","q":"20 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata gin, xarope de banana e limão com gelo e coe.', 'Bata gin, xarope de banana e limão com gelo e coe.', 'Surpreendente combinação tropical de banana e cítrico.', 'Sour tropical criativo.', 'Copo baixo', 'Coqueteleira', 'Casca de limão', true, array['Tropical','Frutado','Charmoso']::text[], 'gin com xarope de banana e limao'),
('Vodka com Xarope de Melão e Limão', 'Refrescantes', '[{"n":"Vodka","q":"50 ml"},{"n":"Xarope de melão","q":"25 ml"},{"n":"Limão","q":"15 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture vodka, xarope de melão e limão sobre gelo e complete com água com gás.', 'Misture vodka, xarope de melão e limão sobre gelo e complete com água com gás.', 'Leve, doce e refrescante de melão.', 'Fácil de fazer no bar.', 'Copo alto', 'Direto no copo', 'Hortelã', false, array['Refrescante','Com soda','Doce']::text[], 'vodka com xarope de melao e limao'),
('Vodka Chocolate Cremosa', 'Doces & Frutados', '[{"n":"Vodka","q":"45 ml"},{"n":"Xarope de chocolate","q":"25 ml"},{"n":"Creme de leite","q":"35 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata forte vodka, xarope de chocolate e creme de leite com gelo e coe.', 'Bata forte vodka, xarope de chocolate e creme de leite com gelo e coe.', 'Cremoso e achocolatado estilo sobremesa.', 'Sucesso entre quem ama chocolate.', 'Taça Coupe', 'Coqueteleira', 'Chocolate ralado', true, array['Doce','Charmoso']::text[], 'vodka chocolate cremosa'),
('Vodka com Xarope de Avelã e Café', 'Doces & Frutados', '[{"n":"Vodka","q":"45 ml"},{"n":"Xarope de avelã","q":"20 ml"},{"n":"Café espresso","q":"45 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata forte com gelo e coe para taça gelada.', 'Bata forte com gelo e coe para taça gelada.', 'Café espresso com notas tostadas de avelã.', 'Alternativa aromática de Espresso Martini.', 'Taça Coupe', 'Coqueteleira', 'Café em grãos', true, array['Doce','Charmoso','Forte']::text[], 'vodka com xarope de avela e cafe'),
('Negroni Sbagliato', 'Aperitivos', '[{"n":"Campari","q":"30 ml"},{"n":"Vermute","q":"30 ml (tinto)"},{"n":"Espumante","q":"60 ml"},{"n":"Laranja","q":"1 rodela"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque gelo no copo baixo, adicione Campari e vermute tinto e complete com espumante.', 'Coloque gelo no copo baixo, adicione Campari e vermute tinto e complete com espumante.', 'Negroni leve com espumante no lugar do gin.', 'Criado por acaso em Milão no Bar Basso.', 'Copo baixo', 'Direto no copo', 'Fatia de laranja', false, array['Aperitivo','Amargo','Clássico']::text[], 'negroni sbagliato'),
('Porto Tônica', 'Aperitivos', '[{"n":"Vinho do Porto","q":"60 ml (branco)"},{"n":"Água tônica","q":"completar"},{"n":"Limão","q":"1 rodela"},{"n":"Hortelã","q":"3 folhas"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha o copo ou taça com gelo, adicione vinho do Porto e complete com água tônica.', 'Encha o copo ou taça com gelo, adicione vinho do Porto e complete com água tônica.', 'Aperitivo português refrescante e elegante.', 'Clássico da região do Douro e Porto.', 'Taça Vinho / Gin', 'Direto na taça', 'Hortelã e limão', false, array['Aperitivo','Refrescante','Clássico']::text[], 'porto tonica'),
('Gin com Licor de Pêssego e Laranja', 'Doces & Frutados', '[{"n":"Gin","q":"45 ml"},{"n":"Licor de pêssego","q":"25 ml"},{"n":"Suco de laranja","q":"90 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Bata ou mexa tudo com gelo em copo alto.', 'Bata ou mexa tudo com gelo em copo alto.', 'Frutado suave de pêssego e laranja.', 'Fácil e agradável para o dia.', 'Copo alto', 'Direto no copo', 'Fatia de laranja', false, array['Doce','Frutado','Fácil']::text[], 'gin com licor de pessego e laranja'),
('Vodka com Licor de Coco e Leite Condensado', 'Doces & Frutados', '[{"n":"Vodka","q":"45 ml"},{"n":"Licor de coco","q":"30 ml"},{"n":"Leite condensado","q":"30 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata bem todos os ingredientes com gelo e sirva em copo baixo.', 'Bata bem todos os ingredientes com gelo e sirva em copo baixo.', 'Doce cremoso estilo prestígio branco.', 'Batida moderna de coco.', 'Copo baixo', 'Coqueteleira', 'Coco ralado', true, array['Doce','Tropical']::text[], 'vodka com licor de coco e leite condensado'),
('Whisky com Licor de Avelã (Frangelico)', 'Fortes', '[{"n":"Whisky","q":"50 ml"},{"n":"Licor de avelã","q":"25 ml"},{"n":"Gelo","q":"cubo grande"}]'::jsonb, 'Mexa whisky e licor de avelã direto no copo baixo com gelo grande.', 'Mexa whisky e licor de avelã direto no copo baixo com gelo grande.', 'Encorpado com aroma adocicado de avelã tostada.', 'Variação elegante do Godfather.', 'Copo baixo', 'Direto no copo', 'Casca de laranja', false, array['Forte','Doce','Curto']::text[], 'whisky com licor de avela (frangelico)'),
('Rusty Nail', 'Fortes', '[{"n":"Whisky","q":"50 ml"},{"n":"Drambuie","q":"25 ml"},{"n":"Gelo","q":"cubo grande"}]'::jsonb, 'Coloque gelo no copo baixo, adicione whisky e Drambuie e mexa suavemente.', 'Coloque gelo no copo baixo, adicione whisky e Drambuie e mexa suavemente.', 'Clássico escocês intenso com mel, ervas e especiarias.', 'Sucesso dos anos 60 no clube 21 de Nova York.', 'Copo baixo', 'Mexido no copo', 'Casca de limão', false, array['Forte','Clássico','Doce']::text[], 'rusty nail'),
('Last Word', 'Cítricos', '[{"n":"Gin","q":"25 ml"},{"n":"Chartreuse","q":"25 ml (verde)"},{"n":"Maraschino","q":"25 ml"},{"n":"Limão","q":"25 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata partes iguais de gin, Chartreuse, Maraschino e limão com gelo.
Coe para taça coupe gelada.', 'Bata partes iguais de gin, Chartreuse, Maraschino e limão com gelo.
Coe para taça coupe gelada.', 'Herbal complexo, cítrico e equilibrado em partes iguais.', 'Criado em Detroit antes da Lei Seca.', 'Taça Coupe', 'Coqueteleira', 'Cereja ao maraschino', true, array['Forte','Clássico','Ácido']::text[], 'last word'),
('Vieux Carré', 'Fortes', '[{"n":"Whisky","q":"30 ml"},{"n":"Conhaque","q":"30 ml"},{"n":"Vermute","q":"30 ml (tinto)"},{"n":"Bénédictine","q":"10 ml"},{"n":"Bitter Peychaud","q":"2 gotas"},{"n":"Angostura","q":"2 gotas"},{"n":"Gelo","q":"para mexer"}]'::jsonb, 'Mexa todos os ingredientes em mixing glass com gelo.
Coe para copo baixo com gelo grande.', 'Mexa todos os ingredientes em mixing glass com gelo.
Coe para copo baixo com gelo grande.', 'Clássico complexo de Nova Orleans com whisky, conhaque e especiarias.', 'Criado no Hotel Monteleone nos anos 1930.', 'Copo baixo', 'Mexido', 'Casca de limão ou cereja', false, array['Forte','Clássico','Curto']::text[], 'vieux carre'),
('Sazerac', 'Fortes', '[{"n":"Whisky","q":"60 ml"},{"n":"Absinto","q":"5 ml (para perfumar)"},{"n":"Xarope de açúcar","q":"10 ml"},{"n":"Bitter Peychaud","q":"3 gotas"},{"n":"Gelo","q":"para mexer"}]'::jsonb, 'Perfume o copo gelado com absinto e descarte o excesso.
Mexa whisky, açúcar e Bitter Peychaud com gelo e coe sem gelo.', 'Perfume o copo gelado com absinto e descarte o excesso.
Mexa whisky, açúcar e Bitter Peychaud com gelo e coe sem gelo.', 'O coquetel oficial de Nova Orleans, seco e aromático.', 'Um dos drinks mais antigos da história americana.', 'Copo baixo', 'Mexido', 'Casca de limão', false, array['Forte','Clássico','Curto']::text[], 'sazerac'),
('White Negroni', 'Aperitivos', '[{"n":"Gin","q":"30 ml"},{"n":"Suze","q":"30 ml"},{"n":"Lillet","q":"30 ml (Blanc)"},{"n":"Gelo","q":"cubo grande"}]'::jsonb, 'Mexa gin, Suze e Lillet Blanc com gelo e coe para copo baixo com gelo grande.', 'Mexa gin, Suze e Lillet Blanc com gelo e coe para copo baixo com gelo grande.', 'Versão clara, floral e gentilmente amarga do Negroni.', 'Criado por Wayne Collins em 2001 em Bordeaux.', 'Copo baixo', 'Mexido', 'Casca de limão siciliano', false, array['Amargo','Aperitivo','Clássico']::text[], 'white negroni'),
('Bamboo', 'Aperitivos', '[{"n":"Xerez","q":"45 ml"},{"n":"Vermute","q":"45 ml (seco)"},{"n":"Bitter de laranja","q":"2 gotas"},{"n":"Angostura","q":"1 gota"},{"n":"Gelo","q":"para mexer"}]'::jsonb, 'Mexa tudo em mixing glass com gelo e coe para taça gelada.', 'Mexa tudo em mixing glass com gelo e coe para taça gelada.', 'Aperitivo leve de baixo teor alcoólico, seco e sofisticado.', 'Criado em Yokohama no final do século XIX.', 'Taça Coupe / Martini', 'Mexido', 'Casca de laranja', false, array['Aperitivo','Clássico','Curto']::text[], 'bamboo'),
('French Martini', 'Doces & Frutados', '[{"n":"Vodka","q":"45 ml"},{"n":"Licor de framboesa","q":"20 ml"},{"n":"Suco de abacaxi","q":"45 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata forte na coqueteleira para formar espuma cremosa.
Coe para taça martini gelada.', 'Bata forte na coqueteleira para formar espuma cremosa.
Coe para taça martini gelada.', 'Frutado, aveludado e com bela espuma de abacaxi e framboesa.', 'Clássico moderno criado nos anos 80 em Nova York.', 'Taça Martini', 'Coqueteleira', 'Framboesa', true, array['Frutado','Doce','Charmoso']::text[], 'french martini'),
('Kir Imperial', 'Aperitivos', '[{"n":"Champagne","q":"120 ml"},{"n":"Licor de framboesa","q":"15 ml"}]'::jsonb, 'Coloque o licor de framboesa na taça flûte gelada e complete devagar com Champagne.', 'Coloque o licor de framboesa na taça flûte gelada e complete devagar com Champagne.', 'Espumante elegante tingido com framboesa.', 'Variação nobre do Kir Royal.', 'Taça Flûte', 'Direto na taça', 'Framboesa', false, array['Aperitivo','Charmoso','Clássico']::text[], 'kir imperial'),
('Champagne Cocktail Clássico', 'Aperitivos', '[{"n":"Champagne","q":"130 ml"},{"n":"Açúcar","q":"1 cubo / colher"},{"n":"Angostura","q":"3 gotas"},{"n":"Conhaque","q":"15 ml"}]'::jsonb, 'Umedeça o açúcar com Angostura na taça, adicione conhaque e complete com Champagne.', 'Umedeça o açúcar com Angostura na taça, adicione conhaque e complete com Champagne.', 'Clássico centenário de celebração com notas aromáticas.', 'Presente nos primeiros livros clássicos de coquetelaria.', 'Taça Flûte', 'Montado', 'Casca de laranja', false, array['Aperitivo','Clássico','Charmoso']::text[], 'champagne cocktail classico'),
('Harvey Wallbanger', 'Doces & Frutados', '[{"n":"Vodka","q":"45 ml"},{"n":"Suco de laranja","q":"90 ml"},{"n":"Galliano","q":"15 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture vodka e suco de laranja em copo alto com gelo.
Finalize flutuando Galliano por cima.', 'Misture vodka e suco de laranja em copo alto com gelo.
Finalize flutuando Galliano por cima.', 'Laranja vibrante com toque doce de baunilha e ervas do Galliano.', 'Clássico californiano da cultura surf dos anos 70.', 'Copo alto', 'Montado', 'Fatia de laranja', false, array['Doce','Clássico','Frutado']::text[], 'harvey wallbanger'),
('Gibson Martini', 'Fortes', '[{"n":"Gin","q":"60 ml"},{"n":"Vermute","q":"15 ml (seco)"},{"n":"Cebola pérola","q":"2 unid"},{"n":"Gelo","q":"para mexer"}]'::jsonb, 'Mexa gin e vermute seco em mixing glass com gelo.
Coe para taça martini e finalize com cebola pérola no palito.', 'Mexa gin e vermute seco em mixing glass com gelo.
Coe para taça martini e finalize com cebola pérola no palito.', 'Elegante variação do Dry Martini com cebolinha em conserva.', 'Famoso clássico de executivos americanos.', 'Taça Martini', 'Mexido', 'Cebola pérola no palito', false, array['Forte','Clássico','Curto']::text[], 'gibson martini'),
('Sambuca com Café em Grãos (Con Mosca)', 'Fortes', '[{"n":"Sambuca","q":"50 ml"},{"n":"Café em grãos","q":"3 grãos"},{"n":"Gelo","q":"opcional"}]'::jsonb, 'Sirva a Sambuca em copo baixo ou taça.
Coloque 3 grãos de café para mastigar junto ou aromatizar.', 'Sirva a Sambuca em copo baixo ou taça.
Coloque 3 grãos de café para mastigar junto ou aromatizar.', 'Licor italiano intenso de anis estrelado com aroma de café.', 'Tradição italiana representando saúde, riqueza e felicidade.', 'Taça / Copo shot', 'Direto', '3 grãos de café', false, array['Forte','Clássico','Curto']::text[], 'sambuca com cafe em graos (con mosca)'),
('Whisky Sour Clássico com Ovo', 'Cítricos', '[{"n":"Whisky","q":"55 ml"},{"n":"Limão","q":"25 ml"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Ovo","q":"1 clara"},{"n":"Angostura","q":"2 gotas"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Faça dry shake sem gelo com whisky, limão, açúcar e clara.
Bata novamente com gelo e coe para copo baixo.', 'Faça dry shake sem gelo com whisky, limão, açúcar e clara.
Bata novamente com gelo e coe para copo baixo.', 'Espuma rica e textura aveludada no estilo tradicional.', 'Receita clássica de Boston Sour.', 'Copo baixo', 'Coqueteleira (dry shake)', 'Angostura e cereja', true, array['Ácido','Clássico','Charmoso']::text[], 'whisky sour classico com ovo'),
('Piña Colada Cremosa de Coco', 'Tropicais', '[{"n":"Rum","q":"50 ml"},{"n":"Creme de coco","q":"40 ml"},{"n":"Suco de abacaxi","q":"90 ml"},{"n":"Coco ralado","q":"1 pitada"},{"n":"Gelo","q":"triturado"}]'::jsonb, 'Bata forte rum, creme de coco, suco de abacaxi e gelo.
Sirva com borda ou topo salpicado de coco ralado.', 'Bata forte rum, creme de coco, suco de abacaxi e gelo.
Sirva com borda ou topo salpicado de coco ralado.', 'Versão ultra cremosa e encorpada com creme de coco.', 'Receita autêntica porto-riquenha.', 'Taça Furacão', 'Coqueteleira / Liquidificador', 'Coco ralado e abacaxi', true, array['Tropical','Doce','Clássico']::text[], 'pina colada cremosa de coco'),
('Gin Floral com Água de Rosas', 'Refrescantes', '[{"n":"Gin","q":"50 ml"},{"n":"Água de rosas","q":"3 gotas"},{"n":"Água tônica","q":"completar"},{"n":"Flores comestíveis","q":"2 pétalas"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque gelo na taça gin, adicione o gin e gotas de água de rosas.
Complete com tônica e decore com flores comestíveis.', 'Coloque gelo na taça gin, adicione o gin e gotas de água de rosas.
Complete com tônica e decore com flores comestíveis.', 'Perfume delicado de rosas e visual encantador.', 'Drink botânico refinado.', 'Taça Gin', 'Direto na taça', 'Flores comestíveis', false, array['Charmoso','Refrescante','Longo']::text[], 'gin floral com agua de rosas'),
('Batida de Doce de Leite com Cachaça', 'Doces & Frutados', '[{"n":"Cachaça","q":"50 ml"},{"n":"Doce de leite","q":"2 colheres"},{"n":"Leite","q":"40 ml"},{"n":"Canela","q":"1 pitada"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata bem cachaça, doce de leite, leite e gelo na coqueteleira até homogeneizar.
Coe para copo baixo e polvilhe canela.', 'Bata bem cachaça, doce de leite, leite e gelo na coqueteleira até homogeneizar.
Coe para copo baixo e polvilhe canela.', 'Cremosa sobremesa brasileira em forma de drink.', 'Sucesso em bares mineiros e paulistas.', 'Copo baixo', 'Coqueteleira', 'Canela em pó', true, array['Doce','Charmoso']::text[], 'batida de doce de leite com cachaca'),
('Alexander de Chocolate e Baunilha', 'Doces & Frutados', '[{"n":"Conhaque","q":"45 ml"},{"n":"Licor de cacau","q":"25 ml"},{"n":"Creme de leite","q":"30 ml"},{"n":"Essência de baunilha","q":"2 gotas"},{"n":"Chocolate ralado","q":"para finalizar"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata forte conhaque, licor de cacau, creme de leite, baunilha e gelo.
Coe para taça coupe e finalize com chocolate ralado.', 'Bata forte conhaque, licor de cacau, creme de leite, baunilha e gelo.
Coe para taça coupe e finalize com chocolate ralado.', 'Sedoso, aromático de baunilha e chocolate.', 'Toque confeiteiro sobre o Brandy Alexander.', 'Taça Coupe', 'Coqueteleira', 'Chocolate ralado', true, array['Doce','Charmoso','Clássico']::text[], 'alexander de chocolate e baunilha'),
('Vodka Morango & Chocolate (Sensação)', 'Doces & Frutados', '[{"n":"Vodka","q":"45 ml"},{"n":"Morango","q":"4 unid"},{"n":"Calda de chocolate","q":"20 ml"},{"n":"Calda de morango","q":"15 ml"},{"n":"Leite condensado","q":"30 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Decore o copo por dentro com calda de chocolate e calda de morango.
Bata vodka, morango, leite condensado e gelo e sirva.', 'Decore o copo por dentro com calda de chocolate e calda de morango.
Bata vodka, morango, leite condensado e gelo e sirva.', 'Drink sobremesa cremoso inspirado no bombom de morango.', 'Campeão de vendas em bares descontraídos.', 'Copo baixo / Taça', 'Coqueteleira', 'Morango e calda de chocolate', true, array['Doce','Frutado']::text[], 'vodka morango & chocolate (sensacao)'),
('Choco Shot Cremoso com Baileys', 'Doces & Frutados', '[{"n":"Licor de creme (Baileys)","q":"35 ml"},{"n":"Vodka","q":"25 ml"},{"n":"Chocolate","q":"20 g (derretido ou raspas)"},{"n":"Calda de chocolate","q":"10 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata Baileys, vodka e gelo e sirva em taça ou copo decorado com calda e chocolate.', 'Bata Baileys, vodka e gelo e sirva em taça ou copo decorado com calda e chocolate.', 'Rico em chocolate e licor cremoso.', 'Perfeito como drink digestivo ou sobremesa.', 'Copo baixo / Taça', 'Coqueteleira', 'Raspas de chocolate', true, array['Doce','Curto']::text[], 'choco shot cremoso com baileys'),
('Mai Tai com Xarope de Amêndoa', 'Tropicais', '[{"n":"Rum","q":"50 ml"},{"n":"Cointreau","q":"15 ml"},{"n":"Xarope de amêndoa","q":"20 ml"},{"n":"Limão","q":"25 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata rum, Cointreau, xarope de amêndoa e limão com gelo.
Sirva com bastante gelo.', 'Bata rum, Cointreau, xarope de amêndoa e limão com gelo.
Sirva com bastante gelo.', 'Clássico tiki equilibrado com notas de amêndoa e cítricos.', 'Alternativa usando xarope de amêndoa no lugar do orgeat.', 'Copo baixo', 'Coqueteleira', 'Hortelã e limão', true, array['Tropical','Clássico','Ácido']::text[], 'mai tai com xarope de amendoa'),
('Gin Tônica com Cravo e Laranja', 'Refrescantes', '[{"n":"Gin","q":"50 ml"},{"n":"Água tônica","q":"completar"},{"n":"Laranja","q":"1 rodela"},{"n":"Cravo-da-índia","q":"3 unid"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Espete os cravos na rodela de laranja na taça com gelo.
Adicione gin e complete com água tônica.', 'Espete os cravos na rodela de laranja na taça com gelo.
Adicione gin e complete com água tônica.', 'Especiado quente de cravo com frescor cítrico da laranja.', 'Toque aromático clássico de botânicos.', 'Taça Gin', 'Direto na taça', 'Laranja cravejada', false, array['Refrescante','Charmoso']::text[], 'gin tonica com cravo e laranja'),
('Vodka com Xarope de Café e Creme', 'Doces & Frutados', '[{"n":"Vodka","q":"50 ml"},{"n":"Xarope de café","q":"25 ml"},{"n":"Creme de leite","q":"30 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture vodka e xarope de café no copo com gelo e finalize com creme de leite.', 'Misture vodka e xarope de café no copo com gelo e finalize com creme de leite.', 'Versão prática do White Russian usando xarope de café.', 'Rápido de montar no balcão.', 'Copo baixo', 'Direto no copo', 'Café em grãos', false, array['Doce','Fácil']::text[], 'vodka com xarope de cafe e creme'),
('Gin Spritz de Groselha', 'Refrescantes', '[{"n":"Gin","q":"45 ml"},{"n":"Xarope de groselha","q":"20 ml"},{"n":"Limão","q":"15 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha a taça com gelo, misture gin, xarope de groselha e limão e complete com água com gás.', 'Encha a taça com gelo, misture gin, xarope de groselha e limão e complete com água com gás.', 'Avermelhado, leve e muito nostálgico com toque botânico.', 'Popular e super acessível.', 'Taça Gin', 'Direto na taça', 'Rodelinha de limão', false, array['Com soda','Doce','Fácil']::text[], 'gin spritz de groselha'),
('Gin Soda de Uva', 'Doces & Frutados', '[{"n":"Gin","q":"50 ml"},{"n":"Xarope de uva","q":"25 ml"},{"n":"Limão","q":"10 ml"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture gin, xarope de uva e limão no copo com gelo e complete com água com gás.', 'Misture gin, xarope de uva e limão no copo com gelo e complete com água com gás.', 'Frutado, roxo intenso e borbulhante.', 'Fácil de fazer com xarope de uva.', 'Copo alto', 'Direto no copo', 'Uva no palito', false, array['Com soda','Frutado','Fácil']::text[], 'gin soda de uva'),
('Vodka com Xarope de Laranja e Tônica', 'Cítricos', '[{"n":"Vodka","q":"50 ml"},{"n":"Xarope de laranja","q":"25 ml"},{"n":"Água tônica","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque gelo no copo alto, adicione vodka e xarope de laranja e complete com água tônica.', 'Coloque gelo no copo alto, adicione vodka e xarope de laranja e complete com água tônica.', 'Cítrico adocicado e refrescante.', 'Long drink simples e versátil.', 'Copo alto', 'Direto no copo', 'Meia lua de laranja', false, array['Refrescante','Longo','Fácil']::text[], 'vodka com xarope de laranja e tonica'),
('Gin Soda de Limão Siciliano', 'Cítricos', '[{"n":"Gin","q":"50 ml"},{"n":"Xarope de limão","q":"25 ml"},{"n":"Água com gás","q":"completar"},{"n":"Hortelã","q":"3 folhas"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture gin e xarope de limão no copo com gelo, adicione hortelã e complete com água com gás.', 'Misture gin e xarope de limão no copo com gelo, adicione hortelã e complete com água com gás.', 'Limonada alcoólica cítrica e super refrescante.', 'Pronto em 20 segundos.', 'Copo alto', 'Direto no copo', 'Hortelã e limão', false, array['Com soda','Ácido','Fácil']::text[], 'gin soda de limao siciliano'),
('Vodka com Guaraná e Limão', 'Refrescantes', '[{"n":"Vodka","q":"50 ml"},{"n":"Guaraná","q":"completar"},{"n":"Limão","q":"15 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Encha o copo alto com gelo, adicione vodka e limão e complete com Guaraná gelado.', 'Encha o copo alto com gelo, adicione vodka e limão e complete com Guaraná gelado.', 'Combinação bem brasileira, leve e adocicada.', 'Clássico simples de festas no Brasil.', 'Copo alto', 'Direto no copo', 'Gomo de limão', false, array['Fácil','Longo','Doce']::text[], 'vodka com guarana e limao'),
('Gin com Guaraná e Laranja', 'Refrescantes', '[{"n":"Gin","q":"50 ml"},{"n":"Guaraná","q":"completar"},{"n":"Laranja","q":"1 rodela"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque gelo e rodela de laranja na taça, adicione gin e complete com Guaraná.', 'Coloque gelo e rodela de laranja na taça, adicione gin e complete com Guaraná.', 'Alternativa brasileira mais suave que a tônica.', 'Ótima porta de entrada para quem prefere drinks doces.', 'Taça Gin', 'Direto na taça', 'Rodela de laranja', false, array['Fácil','Doce','Longo']::text[], 'gin com guarana e laranja'),
('Whisky com Guaraná', 'Refrescantes', '[{"n":"Whisky","q":"50 ml"},{"n":"Guaraná","q":"completar"},{"n":"Limão","q":"10 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Coloque gelo no copo alto, despeje whisky e limão e complete com Guaraná.', 'Coloque gelo no copo alto, despeje whisky e limão e complete com Guaraná.', 'Suave e frutado, clássico popular brasileiro.', 'Muito pedido em balcões pelo Brasil.', 'Copo alto', 'Direto no copo', 'Fatia de limão', false, array['Fácil','Longo']::text[], 'whisky com guarana'),
('Rum Tropical de Maracujá', 'Tropicais', '[{"n":"Rum","q":"50 ml"},{"n":"Suco de maracujá","q":"100 ml"},{"n":"Limão","q":"15 ml"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata rum, suco de maracujá, limão e xarope com gelo.
Coe para copo longo com gelo.', 'Bata rum, suco de maracujá, limão e xarope com gelo.
Coe para copo longo com gelo.', 'Caribenho e vibrante com acidez tropical.', 'Clássico de bares de praia.', 'Copo alto', 'Coqueteleira', 'Hortelã', true, array['Tropical','Ácido','Frutado']::text[], 'rum tropical de maracuja'),
('Tequila Tropical de Maracujá', 'Tropicais', '[{"n":"Tequila","q":"50 ml"},{"n":"Suco de maracujá","q":"90 ml"},{"n":"Limão","q":"15 ml"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, 'Bata tequila, maracujá, limão e açúcar com gelo.
Coe para copo alto com gelo.', 'Bata tequila, maracujá, limão e açúcar com gelo.
Coe para copo alto com gelo.', 'Agave terroso com maracujá intenso.', 'Combinação marcante e refrescante.', 'Copo alto', 'Coqueteleira', 'Fatia de limão', true, array['Tropical','Ácido','Forte']::text[], 'tequila tropical de maracuja'),
('Cachaça com Guaraná e Limão', 'Refrescantes', '[{"n":"Cachaça","q":"50 ml"},{"n":"Guaraná","q":"completar"},{"n":"Limão","q":"15 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Misture cachaça e limão no copo com gelo e complete com Guaraná.', 'Misture cachaça e limão no copo com gelo e complete com Guaraná.', 'Refrescante, brasileiro e pronto em segundos.', 'Versão longa e leve da cachaça com limão.', 'Copo alto', 'Direto no copo', 'Gomo de limão', false, array['Fácil','Refrescante','Longo']::text[], 'cachaca com guarana e limao'),
('Saquê Soda de Groselha e Morango', 'Doces & Frutados', '[{"n":"Saquê","q":"60 ml"},{"n":"Xarope de groselha","q":"20 ml"},{"n":"Morango","q":"3 unid"},{"n":"Água com gás","q":"completar"},{"n":"Gelo","q":"cubos"}]'::jsonb, 'Macere leve os morangos com xarope de groselha.
Adicione gelo, saquê e complete com água com gás.', 'Macere leve os morangos com xarope de groselha.
Adicione gelo, saquê e complete com água com gás.', 'Leve, doce e super frutado.', 'Opção refrescante com saquê.', 'Copo alto', 'Direto no copo', 'Morango', false, array['Doce','Com soda','Frutado']::text[], 'saque soda de groselha e morango')
)
insert into recipes (owner, name, category, ingredients, steps, instructions, description, story, glass, technique, garnish, shaken, tags, author_nick, is_public, verified)
select null, s.name, s.category, s.ingredients, s.steps, s.instructions, s.description, s.story, s.glass, s.technique, s.garnish, s.shaken, s.tags, 'Meu Bar', true, true
from seed s
where not exists (
  select 1 from recipes r
  where translate(lower(trim(r.name)), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn') = s.norm_name
);
