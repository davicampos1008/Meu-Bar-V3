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
alter table bars add column if not exists store_profile_data jsonb default '{}'::jsonb;
alter table bars add column if not exists store_profiles jsonb default '[]'::jsonb;
alter table bars add column if not exists active_store_profile text;
alter table bars add column if not exists qr_designs jsonb default '[]'::jsonb;
alter table bars add column if not exists active_qr_design text;
alter table bars add column if not exists phone text;
alter table bars add column if not exists instagram text;
alter table bars add column if not exists opening_hours text;
alter table bars add column if not exists about text;
alter table bars add column if not exists ops_data jsonb default '{}'::jsonb;
alter table bars add column if not exists plan_tier text not null default 'free';
alter table bars add column if not exists plan_expires_at timestamptz;
alter table bars add column if not exists trial_ends_at timestamptz;
alter table bars add column if not exists plan_note text;

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
alter table bar_items add column if not exists unit text;
alter table bar_items add column if not exists min_qty int;
alter table bar_items add column if not exists supplier text;

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
alter table recipes add column if not exists item_type text default 'drink';
alter table recipes add column if not exists audit_status text default 'approved';
alter table recipes add column if not exists creator_name text;
alter table recipes add column if not exists audit_note text;
alter table recipes add column if not exists audited_at timestamptz;

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
  recipe_id uuid references recipes on delete set null,
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
alter table orders add column if not exists station text;
alter table orders add column if not exists payment_method text;
alter table orders add column if not exists discount numeric(8,2) default 0;
alter table orders add column if not exists service_fee numeric(8,2) default 0;
alter table orders add column if not exists canceled_reason text;
alter table orders add column if not exists paid_at timestamptz;

-- Garante recipe_id nullable + on delete set null
do $$
declare
  c_name text;
begin
  alter table orders alter column recipe_id drop not null;
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
  alter table orders add constraint orders_recipe_id_fkey foreign key (recipe_id) references recipes(id) on delete set null;
end $$;

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

create table if not exists table_calls (
  id uuid primary key default gen_random_uuid(),
  bar_id uuid not null references bars on delete cascade,
  table_label text,
  client_name text not null,
  kind text not null default 'waiter' check (kind in ('waiter','bill')),
  note text,
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz default now(),
  resolved_at timestamptz
);
create index if not exists table_calls_bar_status on table_calls (bar_id, status, created_at desc);

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
alter table table_calls enable row level security;
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
create policy "bars" on bars for select using (
  owner = auth.uid()
  or is_bar_staff(id)
);
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
create policy "receitas criar" on recipes for insert with check (
  owner = auth.uid()
  or exists(select 1 from admins a where a.user_id = auth.uid())
);
drop policy if exists "receitas editar" on recipes;
create policy "receitas editar" on recipes for update using (
  owner = auth.uid()
  or exists(select 1 from admins a where a.user_id = auth.uid())
) with check (
  owner = auth.uid()
  or exists(select 1 from admins a where a.user_id = auth.uid())
);
drop policy if exists "receitas apagar" on recipes;
create policy "receitas apagar" on recipes for delete using (
  owner = auth.uid()
  or exists(select 1 from admins a where a.user_id = auth.uid())
);

drop policy if exists "bar_members_rw" on bar_members;
drop policy if exists "bar_members_select" on bar_members;
drop policy if exists "bar_members_insert" on bar_members;
drop policy if exists "bar_members_update" on bar_members;
drop policy if exists "bar_members_delete" on bar_members;
create policy "bar_members_select" on bar_members for select
  using (user_id = auth.uid() or is_bar_staff(bar_id));
create policy "bar_members_insert" on bar_members for insert
  with check (is_bar_manager(bar_id));
create policy "bar_members_update" on bar_members for update
  using (is_bar_manager(bar_id))
  with check (is_bar_manager(bar_id));
create policy "bar_members_delete" on bar_members for delete
  using (user_id = auth.uid() or is_bar_manager(bar_id));

drop policy if exists "bar_pw_rw" on bar_service_passwords;
create policy "bar_pw_rw" on bar_service_passwords for all using (is_bar_manager(bar_id)) with check (is_bar_manager(bar_id));

drop policy if exists "svc_req_rw" on service_requests;
create policy "svc_req_rw" on service_requests for all using (requester_id = auth.uid() or is_bar_manager(bar_id)) with check (requester_id = auth.uid() or is_bar_manager(bar_id));

drop policy if exists "staff_prof_r" on staff_profiles;
create policy "staff_prof_r" on staff_profiles for select using (auth.uid() is not null);
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
drop policy if exists "fotos atualizar" on storage.objects;
drop policy if exists "fotos remover" on storage.objects;
create policy "fotos enviar" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('recipes', 'bar-media')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "fotos atualizar" on storage.objects for update to authenticated
  using (
    bucket_id in ('recipes', 'bar-media')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('recipes', 'bar-media')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "fotos remover" on storage.objects for delete to authenticated
  using (
    bucket_id in ('recipes', 'bar-media')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

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
    'active_menu_preset', b.active_menu_preset,
    'store_profile_data', b.store_profile_data,
    'phone', b.phone,
    'instagram', b.instagram,
    'opening_hours', b.opening_hours,
    'about', b.about,
    'plan_tier', coalesce(b.plan_tier, 'free'),
    'plan_expires_at', b.plan_expires_at,
    'trial_ends_at', b.trial_ends_at,
    'created_at', b.created_at,
    'ops_data', json_build_object(
      'modifiers', coalesce(b.ops_data->'modifiers', '[]'::jsonb),
      'happy_hours', coalesce(b.ops_data->'happy_hours', '[]'::jsonb),
      'delivery_config', b.ops_data->'delivery_config'
    )
  ),
  'stock_items', coalesce((
    select json_agg(json_build_object(
      'id', bi.id,
      'bar_id', bi.bar_id,
      'name', bi.name,
      'in_stock', bi.in_stock,
      'qty', bi.qty
    ))
    from bar_items bi
    where bi.bar_id = b.id
  ), '[]'::json),
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
      'item_type', coalesce(r.item_type, 'drink'),
      'image_url', r.image_url,
      'price', p.price,
      'ingredients', r.ingredients,
      'description', r.description,
      'story', r.story,
      'author_nick', r.author_nick,
      'creator_name', r.creator_name,
      'audit_status', r.audit_status,
      'tags', r.tags
    ) order by r.name)
    from recipes r
    left join bar_prices p on p.bar_id = b.id and p.recipe_id = r.id
    where (r.is_public = true or r.owner = b.owner)
      and (lower(coalesce(b.kind, '')) in ('home', 'casa') or p.price is not null)
      and not exists (
        select 1 from unnest(coalesce(r.tags, '{}'::text[])) tg
        where tg like '__bar:%' and tg <> ('__bar:' || b.id::text)
      )
      and not ('__avail:0' = any(coalesce(r.tags, '{}'::text[])))
      and not exists (
        select 1 from jsonb_array_elements(coalesce(r.ingredients, '[]'::jsonb)) i
        where trim(coalesce(nullif(i->>'n', ''), nullif(i->>'name', ''), nullif(i->>'nome', ''), nullif(i->>'item', ''), '')) <> ''
          and lower(unaccent(trim(coalesce(nullif(i->>'n', ''), nullif(i->>'name', ''), nullif(i->>'nome', ''), nullif(i->>'item', ''), '')))) not in ('gelo', 'agua', 'agua gelada', 'agua filtrada', 'agua mineral')
          and lower(unaccent(trim(coalesce(nullif(i->>'n', ''), nullif(i->>'name', ''), nullif(i->>'nome', ''), nullif(i->>'item', ''), '')))) not like 'gelo %'
          and not exists (
            select 1 from bar_items bi
            where bi.bar_id = b.id
              and bi.in_stock
              and (bi.qty is null or bi.qty > 0)
              and (
                lower(unaccent(trim(bi.name))) = lower(unaccent(trim(coalesce(nullif(i->>'n', ''), nullif(i->>'name', ''), nullif(i->>'nome', ''), nullif(i->>'item', ''), ''))))
                or lower(unaccent(trim(bi.name))) like lower(unaccent(trim(coalesce(nullif(i->>'n', ''), nullif(i->>'name', ''), nullif(i->>'nome', ''), nullif(i->>'item', ''), '')))) || ' %'
                or lower(unaccent(trim(bi.name))) like lower(unaccent(trim(coalesce(nullif(i->>'n', ''), nullif(i->>'name', ''), nullif(i->>'nome', ''), nullif(i->>'item', ''), '')))) || '-%'
                or lower(unaccent(trim(bi.name))) like lower(unaccent(trim(coalesce(nullif(i->>'n', ''), nullif(i->>'name', ''), nullif(i->>'nome', ''), nullif(i->>'item', ''), '')))) || '/%'
                or lower(unaccent(trim(bi.name))) like lower(unaccent(trim(coalesce(nullif(i->>'n', ''), nullif(i->>'name', ''), nullif(i->>'nome', ''), nullif(i->>'item', ''), '')))) || '(%'
                or (
                  lower(unaccent(trim(coalesce(nullif(i->>'n', ''), nullif(i->>'name', ''), nullif(i->>'nome', ''), nullif(i->>'item', ''), '')))) = 'xarope de acucar'
                  and lower(unaccent(trim(bi.name))) like 'acucar%'
                )
                or (
                  lower(unaccent(trim(coalesce(nullif(i->>'n', ''), nullif(i->>'name', ''), nullif(i->>'nome', ''), nullif(i->>'item', ''), '')))) = 'acucar'
                  and lower(unaccent(trim(bi.name))) in ('xarope de acucar', 'xarope simples')
                )
              )
          )
      )
      and not (
        jsonb_array_length(coalesce(r.ingredients, '[]'::jsonb)) = 0
        and exists (
          select 1 from bar_items bi
          where bi.bar_id = b.id
            and (
              lower(unaccent(trim(bi.name))) = lower(unaccent(trim(r.name)))
              or lower(unaccent(trim(bi.name))) like lower(unaccent(trim(r.name))) || ' %'
              or lower(unaccent(trim(r.name))) like lower(unaccent(trim(bi.name))) || ' %'
            )
        )
        and not exists (
          select 1 from bar_items bi
          where bi.bar_id = b.id
            and bi.in_stock
            and (bi.qty is null or bi.qty > 0)
            and (
              lower(unaccent(trim(bi.name))) = lower(unaccent(trim(r.name)))
              or lower(unaccent(trim(bi.name))) like lower(unaccent(trim(r.name))) || ' %'
              or lower(unaccent(trim(r.name))) like lower(unaccent(trim(bi.name))) || ' %'
            )
        )
      )
  ), '[]'::json)
)
from bars b where b.id = p_bar $$;

drop policy if exists table_calls_staff on table_calls;
create policy table_calls_staff on table_calls for all using (is_bar_staff(bar_id)) with check (is_bar_staff(bar_id));

create or replace function call_waiter(
  p_bar uuid,
  p_table text default null,
  p_client text default 'Cliente',
  p_kind text default 'waiter',
  p_note text default null
) returns uuid
language plpgsql security definer set search_path=public,extensions as $$
declare
  v_id uuid;
  v_kind text := case when lower(coalesce(p_kind, '')) = 'bill' then 'bill' else 'waiter' end;
  v_table text := nullif(left(trim(coalesce(p_table, '')), 60), '');
  v_client text := coalesce(nullif(left(trim(coalesce(p_client, '')), 50), ''), 'Cliente');
  v_recent int;
begin
  if not exists (select 1 from bars where id = p_bar) then
    raise exception 'Bar não encontrado.';
  end if;
  -- Anti-flood / proteção contra spam de chamados (máx 3 abertos em 2 minutos por mesa/cliente)
  select count(*) into v_recent
  from table_calls
  where bar_id = p_bar
    and status = 'open'
    and created_at > now() - interval '2 minutes'
    and (
      (v_table is not null and lower(coalesce(table_label, '')) = lower(v_table))
      or lower(coalesce(client_name, '')) = lower(v_client)
    );
  if v_recent >= 3 then
    raise exception 'Chamado já enviado! Aguarde o atendimento da equipe.';
  end if;
  insert into table_calls(bar_id, table_label, client_name, kind, note, status)
  values (
    p_bar,
    v_table,
    v_client,
    v_kind,
    nullif(left(trim(coalesce(p_note, '')), 140), ''),
    'open'
  )
  returning id into v_id;
  return v_id;
end $$;
grant execute on function call_waiter(uuid, text, text, text, text) to anon, authenticated;

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
    if coalesce(array_length(v_members, 1), 0) >= 25 then
      return json_build_object('ok', false, 'error', 'Limite máximo de pessoas nesta mesa atingido.');
    end if;
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
        'opened_by', case when t.status = 'open' and trim(coalesce(p_code, '')) = t.code then t.opened_by else null end,
        'members', case when t.status = 'open' and trim(coalesce(p_code, '')) = t.code then t.members else '{}'::text[] end
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
  v_client text := left(trim(coalesce(p_name, '')), 40);
  v_client_recent int;
  v_bar_recent int;
begin
  select * into b from bars where id = p_bar;
  if b.id is null then raise exception 'Bar não encontrado'; end if;
  if not b.accepting_orders then raise exception 'Pedidos pausados no momento'; end if;
  if length(v_client) < 2 then raise exception 'Informe seu nome'; end if;
  if p_qty < 1 or p_qty > 5 then raise exception 'Quantidade inválida'; end if;

  -- Proteção anti-flood / DoS no banco (evita derrubar a fila com bots)
  select count(*) into v_client_recent
  from orders
  where bar_id = p_bar
    and lower(coalesce(client_name, '')) = lower(v_client)
    and created_at > now() - interval '60 seconds';
  if v_client_recent >= 25 then
    raise exception 'Muitos pedidos seguidos. Aguarde 1 minuto e tente novamente.';
  end if;

  select count(*) into v_bar_recent
  from orders
  where bar_id = p_bar
    and created_at > now() - interval '60 seconds';
  if v_bar_recent >= 150 then
    raise exception 'Fila temporariamente sobrecarregada. Tente novamente em instantes.';
  end if;

  if p_tab_id is not null then
    select * into v_tab from table_tabs where id = p_tab_id and bar_id = p_bar;
    if v_tab.id is null or v_tab.status <> 'open' then
      raise exception 'A comanda desta mesa já foi fechada no caixa. Atualize para abrir uma nova.';
    end if;
    v_table := v_tab.table_label;
  end if;

  select price into pr from bar_prices where bar_id = p_bar and recipe_id = p_recipe;
  select name into rname from recipes where id = p_recipe;
  if rname is null then raise exception 'Item não encontrado'; end if;
  if b.kind not in ('home', 'casa') and pr is null then raise exception 'Item indisponível'; end if;

  insert into orders(bar_id, recipe_id, client_name, customer_name, recipe_name, qty, note, price, unit_price, table_label, table_tab_id, station)
  values(
    p_bar,
    p_recipe,
    v_client,
    v_client,
    rname,
    p_qty,
    left(coalesce(p_note, ''), 450),
    pr,
    pr,
    v_table,
    p_tab_id,
    (
      select case
        when coalesce(r.item_type, '') = 'petisco' or '__type:petisco' = any(coalesce(r.tags, '{}'::text[])) then 'cozinha'
        else 'bar'
      end
      from recipes r where r.id = p_recipe
    )
  )
  returning id into oid;
  return oid;
end $$;

create or replace function order_status(p_ids uuid[]) returns table(id uuid, status text) language sql security definer set search_path=public as $$
  select o.id, o.status from orders o where o.id = any(p_ids[1:50])
$$;

create or replace function request_service_by_handle(p_handle text, p_password text, p_role text default 'garcom') returns uuid
language plpgsql security definer set search_path=public as $$
declare
  clean_handle text := lower(regexp_replace(trim(coalesce(p_handle, '')), '^@', ''));
  safe_role text := case
    when lower(trim(coalesce(p_role, ''))) in ('garcom','barman','cozinha','caixa') then lower(trim(p_role))
    else 'garcom'
  end;
  b bars;
  pw_ok boolean;
  prof_name text;
  rid uuid;
begin
  if auth.uid() is null then raise exception 'Faça login primeiro'; end if;
  if length(trim(coalesce(p_password, ''))) < 1 then raise exception 'Informe a senha da loja'; end if;
  select * into b from bars where lower(handle) = clean_handle;
  if b.id is null then raise exception 'Bar @% não encontrado', clean_handle; end if;
  select exists(
    select 1 from bar_service_passwords
    where bar_id = b.id
      and (password = trim(coalesce(p_password, '')) or access_code = trim(coalesce(p_password, '')))
  ) into pw_ok;
  if not pw_ok then raise exception 'Senha da loja incorreta'; end if;
  if exists(
    select 1 from service_requests
    where bar_id = b.id and requester_id = auth.uid() and status = 'pendente'
  ) then
    raise exception 'Você já possui uma solicitação pendente para este bar.';
  end if;
  select display_name into prof_name from staff_profiles where user_id = auth.uid();
  insert into service_requests(bar_id, requester_id, requester_name, role, status)
  values (b.id, auth.uid(), coalesce(prof_name, 'Profissional'), safe_role, 'pendente')
  returning id into rid;
  return rid;
end $$;

create or replace function list_public_bars() returns json
language sql security definer set search_path=public as $$
  select coalesce((
    select json_agg(row_to_json(t))
    from (
      select
        b.id,
        b.name,
        b.handle,
        b.city,
        b.lat,
        b.lon,
        b.kind,
        b.logo_url,
        b.banner_url,
        b.slogan,
        b.phone,
        b.instagram,
        b.opening_hours,
        b.about,
        b.store_profile_data,
        b.color_bg,
        b.color_surface,
        b.color_accent,
        b.color_ok,
        b.color_text,
        b.name_font,
        b.crest_border,
        b.crest_base,
        b.crest_icon,
        b.crest_ornament,
        b.accepting_orders,
        b.created_at
      from public.bars b
      order by b.created_at desc
      limit 80
    ) t
  ), '[]'::json)
$$;

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

grant execute on function get_menu(uuid), list_public_bars(), active_client_names(uuid), get_table_tab_state(uuid, text), open_or_join_table_tab(uuid, text, text, text), verify_table_tab_member(uuid, text), place_order(uuid, text, uuid, int, text, text, uuid), order_status(uuid[]) to anon, authenticated;
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
  alter publication supabase_realtime add table table_calls;
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

-- 10.5) Monetização SaaS: Planos Grátis/Pro/VIP, Super Admin, Banners de Parceiros e Google AdSense
create table if not exists platform_admins (
  email text primary key,
  created_at timestamptz default now()
);

insert into platform_admins(email)
values ('nygames92@gmail.com')
on conflict (email) do nothing;

create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from platform_admins pa
    where lower(trim(pa.email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

create table if not exists platform_settings (
  id text primary key default 'default',
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create or replace function public.has_platform_permission(p_perm text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_del jsonb;
begin
  if public.is_platform_admin() then
    return true;
  end if;
  if v_email = '' or coalesce(trim(p_perm), '') = '' then
    return false;
  end if;
  select config -> 'admin_delegates' -> v_email
    into v_del
    from public.platform_settings
   where id = 'default'
   limit 1;
  if v_del is null or jsonb_typeof(v_del) <> 'object' then
    return false;
  end if;
  if coalesce((v_del ->> 'active')::boolean, false) is not true then
    return false;
  end if;
  return coalesce((v_del -> 'permissions' ->> trim(p_perm))::boolean, false);
exception when others then
  return false;
end $$;
grant execute on function public.has_platform_permission(text) to authenticated;

create or replace function public.update_platform_saas_config(p_config jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_cur jsonb;
  v_next jsonb;
  v_changed boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Faça login primeiro.';
  end if;

  if p_config is null or jsonb_typeof(p_config) <> 'object' then
    raise exception 'Configuração inválida.';
  end if;

  if public.is_platform_admin() then
    insert into public.platform_settings(id, config, updated_at)
    values ('default', p_config, now())
    on conflict (id) do update
      set config = excluded.config,
          updated_at = now();
    return p_config;
  end if;

  select coalesce(config, '{}'::jsonb)
    into v_cur
    from public.platform_settings
   where id = 'default'
   limit 1;
  if v_cur is null then
    v_cur := '{}'::jsonb;
  end if;
  v_next := v_cur;

  if public.has_platform_permission('manage_saas_pricing') then
    v_next := v_next || jsonb_strip_nulls(jsonb_build_object(
      'pro_price_monthly', p_config -> 'pro_price_monthly',
      'pro_price_yearly', p_config -> 'pro_price_yearly',
      'trial_days', p_config -> 'trial_days',
      'free_max_tables', p_config -> 'free_max_tables',
      'free_max_bars', p_config -> 'free_max_bars',
      'support_whatsapp', p_config -> 'support_whatsapp',
      'checkout_monthly_url', p_config -> 'checkout_monthly_url',
      'checkout_yearly_url', p_config -> 'checkout_yearly_url'
    ));
    v_changed := true;
  end if;

  if public.has_platform_permission('manage_adsense') then
    v_next := v_next || jsonb_strip_nulls(jsonb_build_object(
      'adsense_enabled', p_config -> 'adsense_enabled',
      'adsense_client_id', p_config -> 'adsense_client_id',
      'adsense_slot_panel', p_config -> 'adsense_slot_panel',
      'adsense_slot_explore', p_config -> 'adsense_slot_explore',
      'adsense_slot_menu_free', p_config -> 'adsense_slot_menu_free',
      'ads_rotation_mode', p_config -> 'ads_rotation_mode'
    ));
    v_changed := true;
  end if;

  if public.has_platform_permission('manage_vip_plans') then
    v_next := v_next || jsonb_strip_nulls(jsonb_build_object(
      'free_user_emails', p_config -> 'free_user_emails',
      'bar_plan_overrides', p_config -> 'bar_plan_overrides'
    ));
    v_changed := true;
  end if;

  if not v_changed then
    raise exception 'Sem permissão para alterar configurações da plataforma.';
  end if;

  insert into public.platform_settings(id, config, updated_at)
  values ('default', v_next, now())
  on conflict (id) do update
    set config = excluded.config,
        updated_at = now();

  return v_next;
end $$;
grant execute on function public.update_platform_saas_config(jsonb) to authenticated;

drop policy if exists "bars" on bars;
create policy "bars" on bars for select using (
  owner = auth.uid()
  or is_bar_staff(id)
  or public.is_platform_admin()
  or public.has_platform_permission('view_accounts')
  or public.has_platform_permission('manage_stores')
  or public.has_platform_permission('manage_vip_plans')
);

alter table platform_settings enable row level security;
drop policy if exists platform_settings_read on platform_settings;
create policy platform_settings_read on platform_settings for select using (true);
drop policy if exists platform_settings_admin_write on platform_settings;
create policy platform_settings_admin_write on platform_settings for all
  using (is_platform_admin())
  with check (is_platform_admin());

create table if not exists partner_ads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  cta_label text default 'Conhecer',
  image_url text,
  click_url text,
  placement text not null default 'panel' check (placement in ('panel','explore','menu_free','all')),
  badge_text text default 'Parceiro',
  bg_color text,
  accent_color text default '#e5a93c',
  active boolean not null default true,
  priority int not null default 10,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  created_at timestamptz default now()
);

alter table partner_ads enable row level security;
drop policy if exists partner_ads_public_read on partner_ads;
create policy partner_ads_public_read on partner_ads for select using (
  active = true
  or is_platform_admin()
  or public.has_platform_permission('manage_partner_ads')
);
drop policy if exists partner_ads_admin_write on partner_ads;
create policy partner_ads_admin_write on partner_ads for all
  using (is_platform_admin() or public.has_platform_permission('manage_partner_ads'))
  with check (is_platform_admin() or public.has_platform_permission('manage_partner_ads'));

create or replace function public.track_ad_event(p_ad_id uuid, p_kind text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_kind = 'click' then
    update partner_ads set clicks = coalesce(clicks, 0) + 1 where id = p_ad_id and active = true;
  elsif p_kind = 'impression' then
    update partner_ads set impressions = coalesce(impressions, 0) + 1 where id = p_ad_id and active = true;
  end if;
end $$;
grant execute on function public.track_ad_event(uuid, text) to anon, authenticated;

create or replace function public.admin_list_bars() returns json
language plpgsql security definer set search_path = public, auth as $$
begin
  if not (
    public.is_platform_admin()
    or public.has_platform_permission('view_accounts')
    or public.has_platform_permission('manage_stores')
    or public.has_platform_permission('manage_vip_plans')
  ) then
    raise exception 'Acesso restrito ao administrador ou equipe autorizada.';
  end if;
  return coalesce((
    select json_agg(row_to_json(t))
    from (
      select
        b.id,
        b.name,
        b.handle,
        b.city,
        b.kind,
        b.owner,
        u.email as owner_email,
        coalesce(b.plan_tier, 'free') as plan_tier,
        b.plan_expires_at,
        b.trial_ends_at,
        b.plan_note,
        b.created_at,
        (select count(*) from public.orders o where o.bar_id = b.id)::int as orders_count,
        (select count(*) from public.bar_items bi where bi.bar_id = b.id)::int as items_count
      from public.bars b
      left join auth.users u on u.id = b.owner
      order by b.created_at desc
      limit 300
    ) t
  ), '[]'::json);
end $$;
grant execute on function public.admin_list_bars() to authenticated;

create or replace function public.admin_set_bar_plan(
  p_bar_id uuid,
  p_tier text,
  p_expires_at timestamptz default null,
  p_note text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_tier text := case when lower(coalesce(p_tier, '')) in ('pro','vip') then lower(p_tier) else 'free' end;
begin
  if not (public.is_platform_admin() or public.has_platform_permission('manage_vip_plans')) then
    raise exception 'Acesso restrito à gestão de planos.';
  end if;
  update public.bars
  set
    plan_tier = v_tier,
    plan_expires_at = case when v_tier = 'pro' then p_expires_at else null end,
    trial_ends_at = case when v_tier = 'free' then (now() - interval '1 minute') else null end,
    plan_note = nullif(left(trim(coalesce(p_note, '')), 140), '')
  where id = p_bar_id;
end $$;
grant execute on function public.admin_set_bar_plan(uuid, text, timestamptz, text) to authenticated;

create or replace function public.protect_bar_plan_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not (
    public.is_platform_admin()
    or public.has_platform_permission('manage_vip_plans')
  ) then
    if tg_op = 'INSERT' then
      new.plan_tier := 'free';
      new.plan_expires_at := null;
      new.trial_ends_at := null;
      new.plan_note := null;
    elsif tg_op = 'UPDATE' then
      new.plan_tier := old.plan_tier;
      new.plan_expires_at := old.plan_expires_at;
      new.trial_ends_at := old.trial_ends_at;
      new.plan_note := old.plan_note;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_bar_plan_columns on public.bars;
create trigger trg_protect_bar_plan_columns
before insert or update on public.bars
for each row execute function public.protect_bar_plan_columns();

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'new_user',
  title text not null,
  message text,
  user_id uuid,
  user_email text,
  recipe_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.admin_notifications add column if not exists recipe_id uuid;

alter table public.admin_notifications enable row level security;
drop policy if exists admin_notifications_admin_only on public.admin_notifications;
drop policy if exists admin_notifications_scoped_select on public.admin_notifications;
drop policy if exists admin_notifications_scoped_update on public.admin_notifications;
drop policy if exists admin_notifications_admin_write on public.admin_notifications;
create policy admin_notifications_scoped_select on public.admin_notifications for select
  using (
    public.is_platform_admin()
    or (kind = 'recipe_audit' and public.has_platform_permission('audit_recipes'))
    or (kind <> 'recipe_audit' and public.has_platform_permission('view_accounts'))
  );
create policy admin_notifications_scoped_update on public.admin_notifications for update
  using (
    public.is_platform_admin()
    or (kind = 'recipe_audit' and public.has_platform_permission('audit_recipes'))
    or (kind <> 'recipe_audit' and public.has_platform_permission('view_accounts'))
  )
  with check (
    public.is_platform_admin()
    or (kind = 'recipe_audit' and public.has_platform_permission('audit_recipes'))
    or (kind <> 'recipe_audit' and public.has_platform_permission('view_accounts'))
  );
create policy admin_notifications_admin_write on public.admin_notifications for insert
  with check (public.is_platform_admin());

do $$ begin
  alter publication supabase_realtime add table public.admin_notifications;
exception when others then null;
end $$;

-- Notificações para criadores de receitas autorais + políticas rígidas de auditoria
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null default 'recipe_approved',
  title text not null,
  message text,
  recipe_id uuid references public.recipes(id) on delete set null,
  recipe_name text,
  creator_name text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_notifications_user on public.user_notifications(user_id, created_at desc);

alter table public.user_notifications enable row level security;
drop policy if exists user_notifications_own_select on public.user_notifications;
create policy user_notifications_own_select on public.user_notifications for select
  using (
    user_id = auth.uid()
    or public.is_platform_admin()
    or public.has_platform_permission('audit_recipes')
  );
drop policy if exists user_notifications_own_update on public.user_notifications;
create policy user_notifications_own_update on public.user_notifications for update
  using (
    user_id = auth.uid()
    or public.is_platform_admin()
    or public.has_platform_permission('audit_recipes')
  )
  with check (
    user_id = auth.uid()
    or public.is_platform_admin()
    or public.has_platform_permission('audit_recipes')
  );
drop policy if exists user_notifications_admin_insert on public.user_notifications;
create policy user_notifications_admin_insert on public.user_notifications for insert
  with check (public.is_platform_admin() or public.has_platform_permission('audit_recipes'));

do $$ begin
  alter publication supabase_realtime add table public.user_notifications;
exception when others then null;
end $$;

drop policy if exists "receitas ler" on recipes;
create policy "receitas ler" on recipes for select using (
  is_public = true
  or owner = auth.uid()
  or public.is_platform_admin()
  or public.has_platform_permission('audit_recipes')
  or public.has_platform_permission('edit_global_recipes')
  or public.has_platform_permission('search_recipe_images')
);

drop policy if exists "receitas criar" on recipes;
create policy "receitas criar" on recipes for insert with check (
  public.is_platform_admin()
  or public.has_platform_permission('edit_global_recipes')
  or (
    owner = auth.uid()
    and (
      coalesce(item_type, 'drink') <> 'drink'
      or (
        coalesce(is_public, false) = false
        and coalesce(verified, false) = false
        and image_url is null
        and coalesce(audit_status, 'private') in ('private', 'pending')
      )
    )
  )
);

drop policy if exists "receitas editar" on recipes;
create policy "receitas editar" on recipes for update using (
  public.is_platform_admin()
  or public.has_platform_permission('edit_global_recipes')
  or public.has_platform_permission('search_recipe_images')
  or public.has_platform_permission('audit_recipes')
  or (owner = auth.uid() and coalesce(item_type, 'drink') <> 'drink')
) with check (
  public.is_platform_admin()
  or public.has_platform_permission('edit_global_recipes')
  or public.has_platform_permission('search_recipe_images')
  or public.has_platform_permission('audit_recipes')
  or (owner = auth.uid() and coalesce(item_type, 'drink') <> 'drink')
);

create or replace function public.protect_recipe_photo_only_delegate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and coalesce(old.item_type, 'drink') = 'drink'
     and not (
       public.is_platform_admin()
       or public.has_platform_permission('edit_global_recipes')
       or public.has_platform_permission('audit_recipes')
     )
     and public.has_platform_permission('search_recipe_images')
  then
    -- Quem possui apenas permissão de fotos só altera image_url
    new.name := old.name;
    new.category := old.category;
    new.ingredients := old.ingredients;
    new.steps := old.steps;
    new.instructions := old.instructions;
    new.description := old.description;
    new.story := old.story;
    new.tags := old.tags;
    new.is_public := old.is_public;
    new.verified := old.verified;
    new.audit_status := old.audit_status;
    new.creator_name := old.creator_name;
    new.author_nick := old.author_nick;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_recipe_photo_only_delegate on public.recipes;
create trigger trg_protect_recipe_photo_only_delegate
before update on public.recipes
for each row execute function public.protect_recipe_photo_only_delegate();

drop policy if exists "receitas apagar" on recipes;
create policy "receitas apagar" on recipes for delete using (
  public.is_platform_admin()
  or public.has_platform_permission('edit_global_recipes')
  or (owner = auth.uid() and coalesce(item_type, 'drink') <> 'drink')
);

drop policy if exists "fotos enviar" on storage.objects;
drop policy if exists "fotos atualizar" on storage.objects;
drop policy if exists "fotos remover" on storage.objects;
create policy "fotos enviar" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('recipes', 'bar-media')
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        bucket_id = 'recipes'
        and (
          public.is_platform_admin()
          or public.has_platform_permission('search_recipe_images')
          or public.has_platform_permission('edit_global_recipes')
          or public.has_platform_permission('audit_recipes')
        )
      )
    )
  );
create policy "fotos atualizar" on storage.objects for update to authenticated
  using (
    bucket_id in ('recipes', 'bar-media')
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        bucket_id = 'recipes'
        and (
          public.is_platform_admin()
          or public.has_platform_permission('search_recipe_images')
          or public.has_platform_permission('edit_global_recipes')
          or public.has_platform_permission('audit_recipes')
        )
      )
    )
  )
  with check (
    bucket_id in ('recipes', 'bar-media')
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        bucket_id = 'recipes'
        and (
          public.is_platform_admin()
          or public.has_platform_permission('search_recipe_images')
          or public.has_platform_permission('edit_global_recipes')
          or public.has_platform_permission('audit_recipes')
        )
      )
    )
  );
create policy "fotos remover" on storage.objects for delete to authenticated
  using (
    bucket_id in ('recipes', 'bar-media')
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        bucket_id = 'recipes'
        and (
          public.is_platform_admin()
          or public.has_platform_permission('search_recipe_images')
          or public.has_platform_permission('edit_global_recipes')
          or public.has_platform_permission('audit_recipes')
        )
      )
    )
  );

do $$ begin
  alter publication supabase_realtime add table public.recipes;
exception when others then null;
end $$;

create or replace function public.submit_recipe_for_audit(
  p_recipe_id uuid,
  p_creator_name text,
  p_bar_name text default null
) returns json
language plpgsql security definer set search_path = public, auth as $$
declare
  v_rec public.recipes;
  v_creator text;
  v_bar text := nullif(left(trim(coalesce(p_bar_name, '')), 60), '');
  v_email text;
  v_tags text[];
  v_alert_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Faça login primeiro.';
  end if;

  select * into v_rec from public.recipes where id = p_recipe_id;
  if v_rec.id is null then
    raise exception 'Receita não encontrada.';
  end if;

  if v_rec.owner is distinct from auth.uid() and not public.is_platform_admin() then
    raise exception 'Sem permissão para enviar esta receita.';
  end if;

  v_creator := coalesce(
    nullif(left(trim(coalesce(p_creator_name, '')), 60), ''),
    nullif(trim(coalesce(v_rec.creator_name, '')), ''),
    nullif(trim(coalesce(v_rec.author_nick, '')), ''),
    'Criador Parceiro'
  );

  v_tags := array(
    select tg from unnest(coalesce(v_rec.tags, '{}'::text[])) tg
    where tg not like '__audit:%' and tg not like '__creator:%'
  ) || array['__audit:pending', '__creator:' || v_creator];

  update public.recipes
     set is_public = false,
         verified = false,
         audit_status = 'pending',
         creator_name = v_creator,
         author_nick = v_creator,
         tags = v_tags
   where id = p_recipe_id;

  select u.email into v_email from auth.users u where u.id = auth.uid();

  insert into public.admin_notifications(kind, title, message, user_id, user_email, recipe_id, read)
  values (
    'recipe_audit',
    'Novo drink aguardando auditoria',
    '"' || v_rec.name || '" enviado por ' || v_creator ||
      case when v_bar is not null then ' (' || v_bar || ')' else '' end ||
      ' aguarda sua autorização para publicar.',
    auth.uid(),
    v_email,
    p_recipe_id,
    false
  )
  returning id into v_alert_id;

  return json_build_object('ok', true, 'recipe_id', p_recipe_id, 'alert_id', v_alert_id);
end $$;
grant execute on function public.submit_recipe_for_audit(uuid, text, text) to authenticated;

create or replace function public.admin_audit_recipe(
  p_recipe_id uuid,
  p_decision text,
  p_creator_name text default null,
  p_note text default null,
  p_image_url text default null
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_rec public.recipes;
  v_updated public.recipes;
  v_decision text := case
    when lower(trim(coalesce(p_decision, ''))) = 'approved' then 'approved'
    when lower(trim(coalesce(p_decision, ''))) = 'rejected' then 'rejected'
    else null
  end;
  v_creator text;
  v_note text := nullif(left(trim(coalesce(p_note, '')), 240), '');
  v_img text;
  v_tags text[];
  v_notif_id uuid;
begin
  if not (public.is_platform_admin() or public.has_platform_permission('audit_recipes')) then
    raise exception 'Acesso restrito ao administrador ou equipe de auditoria.';
  end if;
  if v_decision is null then
    raise exception 'Decisão de auditoria inválida.';
  end if;

  select * into v_rec from public.recipes where id = p_recipe_id;
  if v_rec.id is null then
    raise exception 'Receita não encontrada.';
  end if;

  v_creator := coalesce(
    nullif(left(trim(coalesce(p_creator_name, '')), 60), ''),
    nullif(trim(coalesce(v_rec.creator_name, '')), ''),
    nullif(trim(coalesce(v_rec.author_nick, '')), ''),
    'Autor Parceiro'
  );

  if p_image_url is not null and trim(p_image_url) <> '' then
    v_img := trim(p_image_url);
  elsif p_image_url = '' then
    v_img := null;
  else
    v_img := v_rec.image_url;
  end if;

  v_tags := array(
    select tg from unnest(coalesce(v_rec.tags, '{}'::text[])) tg
    where tg not like '__audit:%'
      and tg not like '__creator:%'
      and not (v_decision = 'approved' and tg like '__bar:%')
  ) || array['__audit:' || v_decision, '__creator:' || v_creator];

  update public.recipes
     set is_public = (v_decision = 'approved'),
         verified = (v_decision = 'approved'),
         audit_status = v_decision,
         creator_name = v_creator,
         author_nick = v_creator,
         audit_note = v_note,
         audited_at = now(),
         image_url = v_img,
         tags = v_tags
   where id = p_recipe_id
   returning * into v_updated;

  update public.admin_notifications
     set read = true
   where kind = 'recipe_audit'
     and recipe_id = p_recipe_id;

  if v_rec.owner is not null then
    insert into public.user_notifications(user_id, kind, title, message, recipe_id, recipe_name, creator_name, read)
    values (
      v_rec.owner,
      case when v_decision = 'approved' then 'recipe_approved' else 'recipe_rejected' end,
      case when v_decision = 'approved' then 'Drink autoral publicado!' else 'Drink autoral não publicado' end,
      case
        when v_decision = 'approved' then
          'Seu drink "' || v_rec.name || '" foi autorizado pela equipe e publicado no catálogo geral com a marca "' || v_creator || '"!'
        else
          'Seu drink "' || v_rec.name || '" não foi aprovado para o catálogo geral' ||
          case when v_note is not null then ': ' || v_note else '.' end
      end,
      p_recipe_id,
      v_rec.name,
      v_creator,
      false
    )
    returning id into v_notif_id;
  end if;

  return json_build_object('ok', true, 'recipe', row_to_json(v_updated), 'notification_id', v_notif_id);
end $$;
grant execute on function public.admin_audit_recipe(uuid, text, text, text, text) to authenticated;

create or replace function public.notify_admin_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.admin_notifications(kind, title, message, user_id, user_email, read)
  values (
    'new_user',
    'Nova conta criada',
    coalesce(new.email, 'Novo usuário') || ' acabou de criar conta no Meu Bar.',
    new.id,
    new.email,
    false
  );
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists trg_notify_admin_new_user on auth.users;
create trigger trg_notify_admin_new_user
after insert on auth.users
for each row execute function public.notify_admin_new_user();

create or replace function public.admin_list_users() returns json
language plpgsql security definer set search_path = public, auth as $$
begin
  if not (
    public.is_platform_admin()
    or public.has_platform_permission('view_accounts')
    or public.has_platform_permission('manage_vip_plans')
  ) then
    raise exception 'Acesso restrito ao administrador ou equipe autorizada.';
  end if;
  return coalesce((
    select json_agg(row_to_json(t))
    from (
      select
        u.id,
        u.email,
        sp.display_name,
        sp.location,
        u.created_at,
        u.last_sign_in_at,
        (select count(*) from public.bars b where b.owner = u.id)::int as bars_count,
        (select count(*) from public.bar_members bm where bm.user_id = u.id)::int as member_bars_count
      from auth.users u
      left join public.staff_profiles sp on sp.user_id = u.id
      order by u.created_at desc
      limit 500
    ) t
  ), '[]'::json);
end $$;
grant execute on function public.admin_list_users() to authenticated;

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


-- 11) Catálogo ampliado de receitas (326 drinks idempotentes)
with seed(name, category, ingredients, steps, instructions, description, story, glass, technique, garnish, shaken, tags, norm_name) as (
  values
('Old Fashioned', 'Clássicos', '[{"n":"Whisky","q":"60 ml (Bourbon)"},{"n":"Açúcar","q":"1 torrão ou 10 ml xarope"},{"n":"Angostura","q":"3 dashes"},{"n":"Laranja","q":"1 casca"},{"n":"Gelo","q":"1 cubo grande"}]'::jsonb, E'1. Dissolva o açúcar com a Angostura e um fio de água no copo baixo.\n2. Adicione o gelo grande e o bourbon em etapas, mexendo devagar por 25 segundos.\n3. Perfume com casca de laranja.', E'1. Dissolva o açúcar com a Angostura e um fio de água no copo baixo.\n2. Adicione o gelo grande e o bourbon em etapas, mexendo devagar por 25 segundos.\n3. Perfume com casca de laranja.', 'Bourbon encorpado, açúcar, Angostura e óleos de casca de laranja.', 'O avô dos coquetéis. Nasceu no século XIX quando clientes em Louisville pediam um drink preparado “à moda antiga”, sem licores modernos.', 'Old fashioned', 'Mexido no copo', 'Casca de laranja e cereja', false, array['Clássico','Forte','Curto','Whisky']::text[], 'old fashioned'),
('Negroni', 'Clássicos', '[{"n":"Gin","q":"30 ml"},{"n":"Campari","q":"30 ml"},{"n":"Vermute","q":"30 ml (Tinto)"},{"n":"Laranja","q":"1 casca ou fatia"},{"n":"Gelo","q":"1 cubo grande"}]'::jsonb, E'1. Misture partes iguais de gin, Campari e vermute tinto em copo com gelo.\n2. Mexa por 25 segundos até gelar perfeitamente.\n3. Coe sobre gelo grande e decore com laranja.', E'1. Misture partes iguais de gin, Campari e vermute tinto em copo com gelo.\n2. Mexa por 25 segundos até gelar perfeitamente.\n3. Coe sobre gelo grande e decore com laranja.', 'Trindade italiana em partes iguais de gin, Campari e vermute tinto.', 'Criado em Florença em 1919 quando o conde Camillo Negroni pediu ao bartender Fosco Scarselli que reforçasse seu Americano trocando a água com gás por gin.', 'Old fashioned', 'Mexido', 'Meia fatia ou casca de laranja', false, array['Clássico','Amargo','Forte','Curto','Gin']::text[], 'negroni'),
('Dry Martini', 'Clássicos', '[{"n":"Gin","q":"60 ml (London Dry)"},{"n":"Vermute","q":"10 ml (Seco)"},{"n":"Azeitona","q":"1 ou 2 unid"},{"n":"Gelo","q":"para mexer"}]'::jsonb, E'1. Gele bem a taça martini previamente.\n2. Mexa gin e vermute seco em mixing glass com gelo grande por 30 segundos.\n3. Coe sem gelo para a taça e finalize com azeitona ou twist de limão.', E'1. Gele bem a taça martini previamente.\n2. Mexa gin e vermute seco em mixing glass com gelo grande por 30 segundos.\n3. Coe sem gelo para a taça e finalize com azeitona ou twist de limão.', 'Seco, cristalino e imponente: gin mexido com vermute seco.', 'Conhecido como “o rei dos coquetéis”, imortalizado nos grandes hotéis e no cinema pela pureza gelada servida em taça em V.', 'Taça Martini', 'Mexido (stirred)', 'Azeitona no palito ou twist de limão', false, array['Clássico','Forte','Curto','Gin']::text[], 'dry martini'),
('Manhattan', 'Clássicos', '[{"n":"Whisky","q":"60 ml (Rye ou Bourbon)"},{"n":"Vermute","q":"25 ml (Tinto)"},{"n":"Angostura","q":"2 dashes"},{"n":"Cereja","q":"1 unid"},{"n":"Gelo","q":"para mexer"}]'::jsonb, E'1. Mexa whisky, vermute tinto e Angostura em mixing glass cheio de gelo por 25 segundos.\n2. Coe para taça coupe gelada.\n3. Decore com cereja.', E'1. Mexa whisky, vermute tinto e Angostura em mixing glass cheio de gelo por 25 segundos.\n2. Coe para taça coupe gelada.\n3. Decore com cereja.', 'Whisky, vermute tinto e Angostura mexidos e servidos sem gelo.', 'Nascido em Nova York na década de 1870 no Manhattan Club, foi o primeiro grande clássico a casar whisky com vermute doce.', 'Taça Coupe', 'Mexido', 'Cereja ao marasquino', false, array['Clássico','Forte','Curto','Whisky']::text[], 'manhattan'),
('Whiskey Sour', 'Clássicos', '[{"n":"Whisky","q":"60 ml (Bourbon)"},{"n":"Limão","q":"25 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Clara de ovo","q":"15 ml (opcional)"},{"n":"Angostura","q":"2 gotas"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Se usar clara de ovo, bata primeiro sem gelo (dry shake) por 10 segundos.\n2. Adicione gelo, bata forte por 12 segundos e coe para copo baixo com gelo.\n3. Finalize com gotas de Angostura na espuma.', E'1. Se usar clara de ovo, bata primeiro sem gelo (dry shake) por 10 segundos.\n2. Adicione gelo, bata forte por 12 segundos e coe para copo baixo com gelo.\n3. Finalize com gotas de Angostura na espuma.', 'Bourbon, limão siciliano e açúcar batidos em espuma cremosa.', 'Documentado desde 1862 no primeiro livro de receitas de Jerry Thomas, é o pilar absoluto da família dos Sours no mundo.', 'Copo baixo', 'Dry shake + shaker', 'Cereja e gotas de Angostura', true, array['Clássico','Cítrico / Ácido','Cremoso','Whisky']::text[], 'whiskey sour'),
('Margarita', 'Clássicos', '[{"n":"Tequila","q":"50 ml (Prata)"},{"n":"Triple Sec","q":"25 ml (ou Cointreau)"},{"n":"Limão","q":"25 ml (Taiti)"},{"n":"Sal","q":"na borda"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Passe limão em meia borda da taça e encoste no sal fino.\n2. Bata tequila, licor de laranja e limão com muito gelo por 12 segundos.\n3. Coe duas vezes na taça gelada.', E'1. Passe limão em meia borda da taça e encoste no sal fino.\n2. Bata tequila, licor de laranja e limão com muito gelo por 12 segundos.\n3. Coe duas vezes na taça gelada.', 'Tequila prata, licor de laranja, limão fresco e meia borda de sal.', 'Ícone mexicano dos anos 1930-40 em que o sal na borda realça o agave da tequila e equilibra a acidez do limão.', 'Taça Margarita / Coupe', 'Shaker', 'Meia borda de sal e rodela de limão', true, array['Clássico','Cítrico / Ácido','Tequila']::text[], 'margarita'),
('Tommy''s Margarita', 'Cítricos', '[{"n":"Tequila","q":"60 ml (Reposado ou Prata)"},{"n":"Limão","q":"30 ml (Taiti)"},{"n":"Mel","q":"15 ml (ou agave)"},{"n":"Sal","q":"na borda"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata tequila, limão fresco e mel diluído (ou néctar de agave) com bastante gelo.\n2. Coe sobre gelo novo em copo baixo com meia borda de sal.', E'1. Bata tequila, limão fresco e mel diluído (ou néctar de agave) com bastante gelo.\n2. Coe sobre gelo novo em copo baixo com meia borda de sal.', 'Versão moderna de São Francisco sem licor de laranja, destacando o agave puro.', 'Criada por Julio Bermejo no restaurante Tommy’s em São Francisco no fim dos anos 1980, tornou-se referência mundial entre bartenders.', 'Copo baixo', 'Shaker', 'Meia borda de sal e limão', true, array['Clássico','Cítrico / Ácido','Tequila']::text[], 'tommy''s margarita'),
('Daiquiri', 'Clássicos', '[{"n":"Rum","q":"60 ml (Branco)"},{"n":"Limão","q":"25 ml (Taiti)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata rum branco, suco de limão fresco e xarope de açúcar vigorosamente com bastante gelo.\n2. Coe duas vezes para taça coupe gelada.', E'1. Bata rum branco, suco de limão fresco e xarope de açúcar vigorosamente com bastante gelo.\n2. Coe duas vezes para taça coupe gelada.', 'Rum branco, limão fresco e açúcar em equilíbrio cristalino.', 'Batizado em homenagem à praia e mina de Daiquirí em Cuba por volta de 1898, era o favorito de Ernest Hemingway em Havana.', 'Taça Coupe', 'Shaker', 'Casca ou fatia fina de limão', true, array['Clássico','Cítrico / Ácido','Curto','Rum']::text[], 'daiquiri'),
('Hemingway Daiquiri', 'Cítricos', '[{"n":"Rum","q":"60 ml (Branco)"},{"n":"Maraschino","q":"15 ml"},{"n":"Suco de grapefruit","q":"30 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata todos os ingredientes vigorosamente com muito gelo.\n2. Coe duas vezes para taça coupe gelada.', E'1. Bata todos os ingredientes vigorosamente com muito gelo.\n2. Coe duas vezes para taça coupe gelada.', 'Daiquiri seco com licor Maraschino e frescor cítrico de grapefruit.', 'Criado no bar El Floridita em Havana para Ernest Hemingway, que preferia o drink sem açúcar refinado e com toque de toranja e cereja maraschino.', 'Taça Coupe', 'Shaker', 'Rodela de limão', true, array['Clássico','Cítrico / Ácido','Forte','Rum']::text[], 'hemingway daiquiri'),
('Mojito', 'Clássicos', '[{"n":"Rum","q":"50 ml (Branco)"},{"n":"Hortelã","q":"10 folhas"},{"n":"Limão","q":"25 ml (Taiti)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Água com gás","q":"60 ml"},{"n":"Gelo","q":"cubos ou picado"}]'::jsonb, E'1. Pressione suavemente a hortelã com limão e xarope no fundo do copo alto sem triturar.\n2. Adicione rum e muito gelo.\n3. Complete com água com gás e mexa de baixo para cima.', E'1. Pressione suavemente a hortelã com limão e xarope no fundo do copo alto sem triturar.\n2. Adicione rum e muito gelo.\n3. Complete com água com gás e mexa de baixo para cima.', 'Rum branco, hortelã fresca, limão, açúcar e água com gás.', 'Herdeiro cubano do século XVI (“El Draque”), consolidado nos bares de Havana como sinônimo de frescor caribenho.', 'Copo alto', 'Macerado suave + build', 'Buquê de hortelã e rodela de limão', false, array['Clássico','Refrescante','Herbal / Hortelã','Longo','Rum']::text[], 'mojito'),
('Moscow Mule', 'Clássicos', '[{"n":"Vodka","q":"50 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Xarope de gengibre","q":"25 ml"},{"n":"Água com gás","q":"90 ml"},{"n":"Hortelã","q":"4 folhas"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha a caneca de cobre ou copo alto com gelo.\n2. Despeje vodka, limão e xarope de gengibre.\n3. Complete com água com gás, mexa leve e decore com hortelã.', E'1. Encha a caneca de cobre ou copo alto com gelo.\n2. Despeje vodka, limão e xarope de gengibre.\n3. Complete com água com gás, mexa leve e decore com hortelã.', 'Vodka, gengibre picante e limão servidos geladíssimos na caneca.', 'Criado em 1941 em Los Angeles por John Martin e Jack Morgan para unir vodka Smirnoff, ginger beer e canecas de cobre numa jogada histórica de bar.', 'Caneca de cobre', 'Montado na caneca', 'Rodela de limão e ramo de hortelã', false, array['Clássico','Refrescante','Picante / Gengibre','Vodka']::text[], 'moscow mule'),
('Dark ''n'' Stormy', 'Clássicos', '[{"n":"Rum","q":"50 ml (Escuro ou Branco)"},{"n":"Xarope de gengibre","q":"25 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Água com gás","q":"90 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha o copo alto com gelo.\n2. Adicione xarope de gengibre, limão e água com gás.\n3. Finalize com o rum flutuando por cima para criar o visual de nuvem escura.', E'1. Encha o copo alto com gelo.\n2. Adicione xarope de gengibre, limão e água com gás.\n3. Finalize com o rum flutuando por cima para criar o visual de nuvem escura.', 'Rum aromático com gengibre intenso e limão sobre gelo.', 'Drink nacional das Bermudas criado após a Primeira Guerra Mundial por marinheiros britânicos fascinados pela cor de tempestade no mar.', 'Copo alto', 'Montado em camadas', 'Gomo de limão', false, array['Clássico','Picante / Gengibre','Refrescante','Longo','Rum']::text[], 'dark ''n'' stormy'),
('Cosmopolitan', 'Clássicos', '[{"n":"Vodka","q":"45 ml"},{"n":"Triple Sec","q":"15 ml"},{"n":"Suco de cranberry","q":"30 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata vodka, Triple Sec, suco de cranberry e limão com muito gelo.\n2. Coe duas vezes para taça martini ou coupe gelada.\n3. Perfume com casca de laranja.', E'1. Bata vodka, Triple Sec, suco de cranberry e limão com muito gelo.\n2. Coe duas vezes para taça martini ou coupe gelada.\n3. Perfume com casca de laranja.', 'Elegante, rosado e cítrico: vodka, laranja, cranberry e limão.', 'Popularizado em Nova York nos anos 1990 por Dale DeGroff no Rainbow Room e consagrado na cultura pop mundial.', 'Taça Martini / Coupe', 'Shaker', 'Casca de laranja', true, array['Clássico','Cítrico / Ácido','Frutado','Vodka']::text[], 'cosmopolitan'),
('Espresso Martini', 'Clássicos', '[{"n":"Vodka","q":"50 ml"},{"n":"Licor de café","q":"25 ml"},{"n":"Café espresso","q":"35 ml"},{"n":"Xarope de açúcar","q":"10 ml"},{"n":"Café em grãos","q":"3 grãos"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Extraia o café espresso e deixe esfriar brevemente.\n2. Bata todos os ingredientes com força máxima e bastante gelo por 15 segundos para formar crema espessa.\n3. Coe duas vezes e decore com 3 grãos.', E'1. Extraia o café espresso e deixe esfriar brevemente.\n2. Bata todos os ingredientes com força máxima e bastante gelo por 15 segundos para formar crema espessa.\n3. Coe duas vezes e decore com 3 grãos.', 'Espresso fresco batido com vodka e licor de café com crema aveludada.', 'Criado em Londres em 1983 pelo lendário Dick Bradsell quando uma cliente pediu algo que a acordasse e a animasse ao mesmo tempo.', 'Taça Coupe / Martini', 'Shaker vigoroso', '3 grãos de café', true, array['Clássico','Cremoso','Forte','Vodka']::text[], 'espresso martini'),
('Pornstar Martini', 'Clássicos', '[{"n":"Vodka","q":"45 ml"},{"n":"Maracujá","q":"1 fruta"},{"n":"Xarope de baunilha","q":"20 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Espumante","q":"60 ml (shot à parte)"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata vodka, polpa de maracujá, xarope de baunilha e limão com gelo.\n2. Coe duas vezes na taça coupe e coloque meia casca de maracujá flutuando.\n3. Sirva acompanhado de um shot de espumante gelado.', E'1. Bata vodka, polpa de maracujá, xarope de baunilha e limão com gelo.\n2. Coe duas vezes na taça coupe e coloque meia casca de maracujá flutuando.\n3. Sirva acompanhado de um shot de espumante gelado.', 'Maracujá vibrante, baunilha sedosa e taça acompanhada de espumante.', 'Criado em Londres em 2002 por Douglas Ankrah no bar Townhouse, tornou-se um dos coquetéis mais pedidos dos bares contemporâneos europeus.', 'Taça Coupe + Shot', 'Shaker', 'Meia casca de maracujá', true, array['Clássico','Tropical','Frutado','Vodka']::text[], 'pornstar martini'),
('Cuba Libre', 'Clássicos', '[{"n":"Rum","q":"50 ml (Branco ou Dourado)"},{"n":"Coca-Cola","q":"130 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha um copo alto com cubos de gelo.\n2. Esprema o limão fresco, adicione o rum e complete com Coca-Cola gelada.\n3. Mexa suavemente uma vez.', E'1. Encha um copo alto com cubos de gelo.\n2. Esprema o limão fresco, adicione o rum e complete com Coca-Cola gelada.\n3. Mexa suavemente uma vez.', 'Rum, Coca-Cola gelada e o corte cítrico indispensável do limão.', 'Surgido em Havana por volta de 1900 como brinde à independência de Cuba — o limão fresco transforma o refrigerante em coquetel de verdade.', 'Copo alto', 'Montado (build)', 'Gomo de limão', false, array['Clássico','Refrescante','Longo','Rum']::text[], 'cuba libre'),
('Gin Tônica', 'Clássicos', '[{"n":"Gin","q":"50 ml (London Dry)"},{"n":"Água tônica","q":"130 ml"},{"n":"Limão","q":"1 rodela (Siciliano)"},{"n":"Gelo","q":"muitos cubos"}]'::jsonb, E'1. Encha uma taça balão com bastante gelo firme.\n2. Despeje o gin, complete suavemente com água tônica gelada.\n3. Finalize com rodela ou casca de limão siciliano.', E'1. Encha uma taça balão com bastante gelo firme.\n2. Despeje o gin, complete suavemente com água tônica gelada.\n3. Finalize com rodela ou casca de limão siciliano.', 'Clássico atemporal de gin botânico, tônica gelada e perfume cítrico.', 'Nascido no século XIX na Índia colonial quando oficiais britânicos suavizaram a água tônica rica em quinino com gin e limão.', 'Taça balão', 'Montado na taça', 'Rodela de limão siciliano', false, array['Clássico','Refrescante','Com soda / Tônica','Longo','Gin']::text[], 'gin tonica'),
('Tom Collins', 'Clássicos', '[{"n":"Gin","q":"50 ml"},{"n":"Limão","q":"25 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Água com gás","q":"90 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata gin, suco de limão siciliano e xarope de açúcar com gelo (ou monte direto).\n2. Coe para copo alto com gelo novo e complete com água com gás.', E'1. Bata gin, suco de limão siciliano e xarope de açúcar com gelo (ou monte direto).\n2. Coe para copo alto com gelo novo e complete com água com gás.', 'Limonada elegante e gaseificada com base de gin.', 'Popularizado em 1874 por causa da “Grande Farsa de Tom Collins” em Nova York e eternizado por Jerry Thomas em seu guia de 1876.', 'Copo alto (Collins)', 'Shaker + build', 'Rodela de limão e cereja', true, array['Clássico','Refrescante','Cítrico / Ácido','Longo','Gin']::text[], 'tom collins'),
('Gin Fizz', 'Clássicos', '[{"n":"Gin","q":"50 ml"},{"n":"Limão","q":"25 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Água com gás","q":"60 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata gin, limão siciliano e xarope vigorosamente com gelo por 12 segundos.\n2. Coe para copo alto sem gelo (ou pouco gelo) e complete com água com gás para subir a espuma.', E'1. Bata gin, limão siciliano e xarope vigorosamente com gelo por 12 segundos.\n2. Coe para copo alto sem gelo (ou pouco gelo) e complete com água com gás para subir a espuma.', 'Aéreo, cítrico e efervescente em copo alto.', 'Estrela dos bares americanos desde o final do século XIX, famoso por ser servido bem gelado logo ao sair da coqueteleira.', 'Copo alto', 'Shaker + top de gás', 'Casca de limão siciliano', true, array['Clássico','Refrescante','Cítrico / Ácido','Gin']::text[], 'gin fizz'),
('Ramos Gin Fizz', 'Clássicos', '[{"n":"Gin","q":"50 ml"},{"n":"Limão","q":"20 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Creme de leite","q":"30 ml"},{"n":"Clara de ovo","q":"20 ml"},{"n":"Água de flor de laranjeira","q":"3 gotas"},{"n":"Água com gás","q":"40 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata todos os ingredientes exceto a água com gás sem gelo (dry shake) por 20 segundos.\n2. Adicione gelo e bata vigorosamente até formar espuma densa.\n3. Coe para copo alto e complete devagar com água com gás para erguer o colarinho.', E'1. Bata todos os ingredientes exceto a água com gás sem gelo (dry shake) por 20 segundos.\n2. Adicione gelo e bata vigorosamente até formar espuma densa.\n3. Coe para copo alto e complete devagar com água com gás para erguer o colarinho.', 'Nuvem cremosa de gin, creme de leite, cítricos e flor de laranjeira.', 'Criado por Henry C. Ramos em 1888 em Nova Orleans — tão trabalhoso de bater que os bares contratavam filas de bartenders para revezar na coqueteleira.', 'Copo alto', 'Dry shake longo + shaker', 'Colarinho alto de espuma', true, array['Clássico','Cremoso','Cítrico / Ácido','Gin']::text[], 'ramos gin fizz'),
('Gimlet', 'Clássicos', '[{"n":"Gin","q":"60 ml"},{"n":"Limão","q":"25 ml (Taiti)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata gin, limão fresco e xarope de açúcar com muito gelo por 12 segundos.\n2. Coe duas vezes para taça coupe bem gelada.', E'1. Bata gin, limão fresco e xarope de açúcar com muito gelo por 12 segundos.\n2. Coe duas vezes para taça coupe bem gelada.', 'Minimalista, ácido e sedoso: gin em evidência com corte de limão.', 'Batizado em homenagem ao médico naval britânico Sir Thomas Gimlette, que misturava suco de limão ao gin dos marinheiros contra o escorbuto.', 'Taça Coupe', 'Shaker', 'Rodela fina ou casca de limão', true, array['Clássico','Cítrico / Ácido','Curto','Gin']::text[], 'gimlet'),
('Southside', 'Refrescantes', '[{"n":"Gin","q":"60 ml"},{"n":"Hortelã","q":"10 folhas"},{"n":"Limão","q":"25 ml (Taiti)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Coloque gin, hortelã fresca, limão e xarope na coqueteleira com bastante gelo.\n2. Bata forte por 12 segundos.\n3. Coe duas vezes para taça coupe gelada.', E'1. Coloque gin, hortelã fresca, limão e xarope na coqueteleira com bastante gelo.\n2. Bata forte por 12 segundos.\n3. Coe duas vezes para taça coupe gelada.', 'O primo elegante do Mojito feito com gin e servido em taça coupe.', 'Lenda da Lei Seca americana ligado ao South Side de Chicago (ou ao Southside Sportsmen’s Club em Long Island), onde a hortelã suavizava os gins intensos da época.', 'Taça Coupe', 'Shaker + double strain', 'Folha de hortelã flutuando', true, array['Clássico','Refrescante','Herbal / Hortelã','Gin']::text[], 'southside'),
('Southside Fizz', 'Refrescantes', '[{"n":"Gin","q":"50 ml"},{"n":"Hortelã","q":"10 folhas"},{"n":"Limão","q":"25 ml (Taiti)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Água com gás","q":"70 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata gin, hortelã, limão e xarope com gelo.\n2. Coe duas vezes para copo alto com gelo novo e complete com água com gás.', E'1. Bata gin, hortelã, limão e xarope com gelo.\n2. Coe duas vezes para copo alto com gelo novo e complete com água com gás.', 'Versão longa e borbulhante do Southside, como um Mojito de gin.', 'Evolução de clubes de verão americanos que adicionou água com gás ao Southside para tardes quentes.', 'Copo alto', 'Shaker + build', 'Ramo de hortelã e rodela de limão', true, array['Clássico','Refrescante','Herbal / Hortelã','Longo','Gin']::text[], 'southside fizz'),
('Gin Basil Smash', 'Refrescantes', '[{"n":"Gin","q":"60 ml"},{"n":"Manjericão","q":"12 folhas"},{"n":"Limão","q":"25 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Macere delicadamente o manjericão com o xarope no fundo da coqueteleira.\n2. Adicione gin, limão e gelo e bata forte.\n3. Coe duas vezes sobre gelo grande.', E'1. Macere delicadamente o manjericão com o xarope no fundo da coqueteleira.\n2. Adicione gin, limão e gelo e bata forte.\n3. Coe duas vezes sobre gelo grande.', 'Verde vibrante e aromático de manjericão fresco com gin e siciliano.', 'Criado em 2008 por Jörg Meyer no bar Le Lion em Hamburgo, virou fenômeno imediato na coquetelaria moderna mundial.', 'Copo baixo', 'Macerado + shaker', 'Ramo de manjericão fresco', true, array['Clássico','Refrescante','Herbal / Hortelã','Gin']::text[], 'gin basil smash'),
('Clover Club', 'Clássicos', '[{"n":"Gin","q":"50 ml"},{"n":"Xarope de framboesa","q":"20 ml"},{"n":"Limão","q":"20 ml (Siciliano)"},{"n":"Clara de ovo","q":"20 ml"},{"n":"Framboesa","q":"2 unid"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata todos os ingredientes primeiro sem gelo (dry shake) por 10 segundos.\n2. Adicione bastante gelo, bata vigorosamente e coe duas vezes na taça coupe.', E'1. Bata todos os ingredientes primeiro sem gelo (dry shake) por 10 segundos.\n2. Adicione bastante gelo, bata vigorosamente e coe duas vezes na taça coupe.', 'Rosa sedoso de gin, framboesa, limão siciliano e espuma de clara.', 'Batizado em homenagem ao clube de cavalheiros do Hotel Bellevue-Stratford na Filadélfia nos anos 1890, muito antes da Lei Seca.', 'Taça Coupe', 'Dry shake + shaker', '3 framboesas no palito', true, array['Clássico','Cremoso','Frutado','Gin']::text[], 'clover club'),
('Bramble', 'Clássicos', '[{"n":"Gin","q":"50 ml"},{"n":"Limão","q":"25 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Licor de amora","q":"15 ml"},{"n":"Amora","q":"2 unid"},{"n":"Gelo","q":"triturado"}]'::jsonb, E'1. Bata gin, limão siciliano e xarope de açúcar com gelo.\n2. Coe para copo baixo lotado de gelo triturado.\n3. Despeje o licor de amora lentamente por cima para escorrer em efeito mármore.', E'1. Bata gin, limão siciliano e xarope de açúcar com gelo.\n2. Coe para copo baixo lotado de gelo triturado.\n3. Despeje o licor de amora lentamente por cima para escorrer em efeito mármore.', 'Gin sour servido em gelo picado com cascata roxa de licor de amora.', 'Criado em Londres em 1984 por Dick Bradsell, inspirado nas memórias de infância colhendo amoras silvestres na Ilha de Wight.', 'Copo baixo', 'Shaker + drizzle', 'Amoras frescas e rodela de limão', true, array['Clássico','Frutado','Cítrico / Ácido','Gin']::text[], 'bramble'),
('Fitzgerald', 'Cítricos', '[{"n":"Gin","q":"50 ml"},{"n":"Limão","q":"25 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Angostura","q":"2 dashes"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata gin, limão siciliano, xarope e Angostura com muito gelo.\n2. Coe duas vezes na taça coupe gelada.', E'1. Bata gin, limão siciliano, xarope e Angostura com muito gelo.\n2. Coe duas vezes na taça coupe gelada.', 'Gin sour perfumado pela especiaria da Angostura.', 'Criado por Dale DeGroff no Rainbow Room em Nova York nos anos 1990 em tributo a F. Scott Fitzgerald, autor de O Grande Gatsby.', 'Taça Coupe', 'Shaker', 'Rodela de limão siciliano', true, array['Clássico','Cítrico / Ácido','Curto','Gin']::text[], 'fitzgerald'),
('Bee''s Knees', 'Cítricos', '[{"n":"Gin","q":"60 ml"},{"n":"Mel","q":"20 ml (diluído)"},{"n":"Limão","q":"25 ml (Siciliano)"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Dissolva o mel em um fio de água morna ou bata bem com o suco de limão.\n2. Adicione gin e gelo, bata vigorosamente e coe duas vezes na coupe.', E'1. Dissolva o mel em um fio de água morna ou bata bem com o suco de limão.\n2. Adicione gin e gelo, bata vigorosamente e coe duas vezes na coupe.', 'Mel floral, limão siciliano e gin botânico da era da Lei Seca.', 'Expressão dos anos 1920 equivalente a “o máximo!” — bartenders usavam mel e limão para domar destilados artesanais da época.', 'Taça Coupe', 'Shaker', 'Casca de limão siciliano', true, array['Clássico','Cítrico / Ácido','Doce','Gin']::text[], 'bee''s knees'),
('Aviation', 'Clássicos', '[{"n":"Gin","q":"50 ml"},{"n":"Maraschino","q":"15 ml"},{"n":"Crème de Violette","q":"7 ml"},{"n":"Limão","q":"20 ml (Siciliano)"},{"n":"Cereja","q":"1 unid"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata todos os ingredientes com bastante gelo.\n2. Coe duas vezes para taça coupe gelada e finalize com cereja no fundo.', E'1. Bata todos os ingredientes com bastante gelo.\n2. Coe duas vezes para taça coupe gelada e finalize com cereja no fundo.', 'Coquetel azul-lavanda pálido com notas florais de violeta e cereja maraschino.', 'Criado por Hugo Ensslin em 1916 no Hotel Wallick em Nova York, batizado pela cor de céu limpo no alvorecer da aviação.', 'Taça Coupe', 'Shaker', 'Cereja ao marasquino', true, array['Clássico','Cítrico / Ácido','Curto','Gin']::text[], 'aviation'),
('Corpse Reviver No. 2', 'Clássicos', '[{"n":"Gin","q":"22 ml"},{"n":"Cointreau","q":"22 ml"},{"n":"Lillet","q":"22 ml (Blanc)"},{"n":"Limão","q":"22 ml (Siciliano)"},{"n":"Absinto","q":"1 borrifada"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Perfume o interior da taça coupe gelada com absinto e descarte o excesso.\n2. Bata gin, Cointreau, Lillet e limão com gelo.\n3. Coe duas vezes na taça.', E'1. Perfume o interior da taça coupe gelada com absinto e descarte o excesso.\n2. Bata gin, Cointreau, Lillet e limão com gelo.\n3. Coe duas vezes na taça.', 'Equilíbrio cítrico, floral e anisado que “ressuscita” qualquer noite.', 'Imortalizado por Harry Craddock no Savoy Cocktail Book em 1930 com o famoso aviso: “quatro destes seguidos irão desreviver o cadáver”.', 'Taça Coupe', 'Shaker + rinse de absinto', 'Casca de laranja ou cereja', true, array['Clássico','Cítrico / Ácido','Curto','Gin']::text[], 'corpse reviver no. 2'),
('Last Word', 'Fortes', '[{"n":"Gin","q":"25 ml"},{"n":"Chartreuse","q":"25 ml (Verde)"},{"n":"Maraschino","q":"25 ml"},{"n":"Limão","q":"25 ml (Taiti)"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata os quatro ingredientes em partes iguais com muito gelo.\n2. Coe duas vezes para taça coupe gelada.', E'1. Bata os quatro ingredientes em partes iguais com muito gelo.\n2. Coe duas vezes para taça coupe gelada.', 'Quatro partes iguais explosivas: gin, Chartreuse verde, Maraschino e limão.', 'Nascido no Detroit Athletic Club antes da Lei Seca e redescoberto em 2004 em Seattle, virou obsessão absoluta da coquetelaria moderna.', 'Taça Coupe', 'Shaker', 'Cereja ou casca de limão', true, array['Clássico','Forte','Herbal / Hortelã','Gin']::text[], 'last word'),
('Paper Plane', 'Clássicos', '[{"n":"Whisky","q":"25 ml (Bourbon)"},{"n":"Aperol","q":"25 ml"},{"n":"Amaro","q":"25 ml (Nonino)"},{"n":"Limão","q":"25 ml (Siciliano)"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata bourbon, Aperol, Amaro e limão siciliano em partes iguais com gelo.\n2. Coe duas vezes para taça coupe gelada.', E'1. Bata bourbon, Aperol, Amaro e limão siciliano em partes iguais com gelo.\n2. Coe duas vezes para taça coupe gelada.', 'O clássico moderno perfeito: bourbon, Aperol, amaro italiano e siciliano.', 'Criado por Sam Ross em 2008 para o Violet Hour em Chicago ao som da música “Paper Planes” da M.I.A., usando a fórmula simétrica do Last Word.', 'Taça Coupe', 'Shaker', 'Mini avião de papel na borda', true, array['Clássico','Amargo','Cítrico / Ácido','Whisky']::text[], 'paper plane'),
('Penicillin', 'Clássicos', '[{"n":"Whisky","q":"60 ml (Scotch)"},{"n":"Xarope de mel","q":"15 ml"},{"n":"Xarope de gengibre","q":"15 ml"},{"n":"Limão","q":"25 ml (Siciliano)"},{"n":"Gengibre","q":"1 fatia"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata Scotch whisky, xarope de mel, xarope de gengibre e limão siciliano com gelo.\n2. Coe sobre gelo grande no copo baixo.\n3. Se tiver whisky turfado, flutue 5 ml por cima.', E'1. Bata Scotch whisky, xarope de mel, xarope de gengibre e limão siciliano com gelo.\n2. Coe sobre gelo grande no copo baixo.\n3. Se tiver whisky turfado, flutue 5 ml por cima.', 'Scotch whisky, mel, gengibre picante e limão siciliano em copo baixo.', 'Criado por Sam Ross em 2005 no Milk & Honey de Nova York, é considerado o clássico moderno mais influente do século XXI.', 'Copo baixo', 'Shaker', 'Fatia de gengibre', true, array['Clássico','Picante / Gengibre','Forte','Whisky']::text[], 'penicillin'),
('Gold Rush', 'Fortes', '[{"n":"Whisky","q":"60 ml (Bourbon)"},{"n":"Mel","q":"20 ml (diluído)"},{"n":"Limão","q":"25 ml (Siciliano)"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata bourbon, xarope de mel e limão siciliano com gelo.\n2. Coe sobre pedra grande de gelo em copo baixo.', E'1. Bata bourbon, xarope de mel e limão siciliano com gelo.\n2. Coe sobre pedra grande de gelo em copo baixo.', 'Versão de bourbon do Bee’s Knees: mel aveludado e acidez limpa.', 'Criado por T.J. Siegal no Milk & Honey em Nova York no início dos anos 2000, abrindo caminho direto para a criação do Penicillin.', 'Copo baixo', 'Shaker', 'Casca de limão siciliano', true, array['Clássico','Forte','Cítrico / Ácido','Whisky']::text[], 'gold rush'),
('Brown Derby', 'Cítricos', '[{"n":"Whisky","q":"50 ml (Bourbon)"},{"n":"Suco de grapefruit","q":"30 ml"},{"n":"Mel","q":"15 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata bourbon, suco de grapefruit fresco e xarope de mel com muito gelo.\n2. Coe para taça coupe gelada.', E'1. Bata bourbon, suco de grapefruit fresco e xarope de mel com muito gelo.\n2. Coe para taça coupe gelada.', 'Bourbon com amargor frutado de grapefruit e toque de mel.', 'Criado em Hollywood nos anos 1930 para o restaurante Brown Derby, famoso pelo salão em formato de chapéu-coco.', 'Taça Coupe', 'Shaker', 'Casca de grapefruit', true, array['Clássico','Cítrico / Ácido','Whisky']::text[], 'brown derby'),
('Boulevardier', 'Fortes', '[{"n":"Whisky","q":"30 ml (Bourbon)"},{"n":"Campari","q":"30 ml"},{"n":"Vermute","q":"30 ml (Tinto)"},{"n":"Laranja","q":"1 casca"},{"n":"Gelo","q":"1 cubo grande"}]'::jsonb, E'1. Mexa bourbon, Campari e vermute tinto em mixing glass com gelo.\n2. Coe sobre gelo grande no copo baixo.\n3. Perfume com casca de laranja.', E'1. Mexa bourbon, Campari e vermute tinto em mixing glass com gelo.\n2. Coe sobre gelo grande no copo baixo.\n3. Perfume com casca de laranja.', 'O irmão parisiense do Negroni com calor amadeirado de bourbon.', 'Criado em 1927 no Harry’s New York Bar em Paris para o escritor americano Erskine Gwynne, fundador da revista Boulevardier.', 'Old fashioned', 'Mexido (stirred)', 'Casca de laranja', false, array['Clássico','Amargo','Forte','Curto','Whisky']::text[], 'boulevardier'),
('Sazerac', 'Fortes', '[{"n":"Whisky","q":"45 ml (Rye)"},{"n":"Conhaque","q":"15 ml"},{"n":"Absinto","q":"1 borrifada"},{"n":"Bitter Peychaud","q":"4 dashes"},{"n":"Açúcar","q":"1 torrão"},{"n":"Limão","q":"1 casca (Siciliano)"},{"n":"Gelo","q":"para mexer"}]'::jsonb, E'1. Gele um copo baixo, borrife absinto e gire para perfumar.\n2. Em mixing glass, macere açúcar com Peychaud, adicione whisky, conhaque e gelo e mexa por 25s.\n3. Coe sem gelo para o copo perfumado e torça a casca de limão siciliano.', E'1. Gele um copo baixo, borrife absinto e gire para perfumar.\n2. Em mixing glass, macere açúcar com Peychaud, adicione whisky, conhaque e gelo e mexa por 25s.\n3. Coe sem gelo para o copo perfumado e torça a casca de limão siciliano.', 'Drink oficial de Nova Orleans: whisky, conhaque, Peychaud e halo de absinto.', 'Nascido em Nova Orleans na década de 1850, considerado por muitos historiadores o primeiro coquetel americano de marca registrada.', 'Old fashioned (sem gelo)', 'Mexido + rinse de absinto', 'Casca de limão siciliano torcida', false, array['Clássico','Forte','Curto','Whisky','Conhaque']::text[], 'sazerac'),
('Vieux Carré', 'Fortes', '[{"n":"Whisky","q":"30 ml (Rye)"},{"n":"Conhaque","q":"30 ml"},{"n":"Vermute","q":"30 ml (Tinto)"},{"n":"Bénédictine","q":"10 ml"},{"n":"Angostura","q":"2 dashes"},{"n":"Bitter Peychaud","q":"2 dashes"},{"n":"Gelo","q":"1 cubo grande"}]'::jsonb, E'1. Mexa todos os ingredientes em mixing glass com gelo por 25 segundos.\n2. Coe sobre gelo grande em copo baixo.', E'1. Mexa todos os ingredientes em mixing glass com gelo por 25 segundos.\n2. Coe sobre gelo grande em copo baixo.', 'Complexidade de Nova Orleans unindo centeio, conhaque, vermute, Bénédictine e bitters.', 'Criado por Walter Bergeron em 1938 no Carousel Bar do Hotel Monteleone, batizado em homenagem ao bairro francês de Nova Orleans.', 'Old fashioned', 'Mexido', 'Cereja ou casca de limão', false, array['Clássico','Forte','Curto','Whisky','Conhaque']::text[], 'vieux carre'),
('Sidecar', 'Clássicos', '[{"n":"Conhaque","q":"50 ml"},{"n":"Cointreau","q":"25 ml"},{"n":"Limão","q":"20 ml (Siciliano)"},{"n":"Açúcar","q":"na borda"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Faça meia borda de açúcar na taça coupe.\n2. Bata conhaque, Cointreau e limão siciliano com gelo.\n3. Coe duas vezes na taça gelada.', E'1. Faça meia borda de açúcar na taça coupe.\n2. Bata conhaque, Cointreau e limão siciliano com gelo.\n3. Coe duas vezes na taça gelada.', 'Conhaque francês, licor de laranja e limão siciliano com crosta de açúcar.', 'Surgido em Paris ou Londres logo após a Primeira Guerra Mundial, batizado em homenagem ao sidecar da motocicleta de um capitão frequentador do bar.', 'Taça Coupe', 'Shaker', 'Meia borda de açúcar e casca de laranja', true, array['Clássico','Cítrico / Ácido','Conhaque']::text[], 'sidecar'),
('Between the Sheets', 'Fortes', '[{"n":"Rum","q":"30 ml (Branco)"},{"n":"Conhaque","q":"30 ml"},{"n":"Triple Sec","q":"30 ml"},{"n":"Limão","q":"20 ml (Siciliano)"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata rum branco, conhaque, Triple Sec e limão com bastante gelo.\n2. Coe duas vezes para taça coupe gelada.', E'1. Bata rum branco, conhaque, Triple Sec e limão com bastante gelo.\n2. Coe duas vezes para taça coupe gelada.', 'Variação provocante do Sidecar com rum branco dividindo o palco com o conhaque.', 'Criado por Harry MacElhone nos anos 1930 no Harry’s New York Bar em Paris como um clássico noturno de altíssimo astral.', 'Taça Coupe', 'Shaker', 'Casca de limão siciliano', true, array['Clássico','Forte','Cítrico / Ácido','Rum','Conhaque']::text[], 'between the sheets'),
('Brandy Alexander', 'Doces & Frutados', '[{"n":"Conhaque","q":"40 ml"},{"n":"Licor de cacau","q":"25 ml"},{"n":"Creme de leite","q":"30 ml"},{"n":"Noz-moscada","q":"1 pitada"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata conhaque, licor de cacau e creme de leite com muito gelo por 15 segundos.\n2. Coe para taça coupe gelada e rale noz-moscada fresca por cima.', E'1. Bata conhaque, licor de cacau e creme de leite com muito gelo por 15 segundos.\n2. Coe para taça coupe gelada e rale noz-moscada fresca por cima.', 'Sobremesa líquida clássica de conhaque, cacau e creme de leite com noz-moscada.', 'Evolução de um drink de gin criado nos anos 1910 em Nova York; na versão com conhaque, conquistou os salões do século XX.', 'Taça Coupe', 'Shaker', 'Noz-moscada ralada', true, array['Clássico','Cremoso','Doce','Conhaque']::text[], 'brandy alexander'),
('Vesper Martini', 'Fortes', '[{"n":"Gin","q":"45 ml"},{"n":"Vodka","q":"15 ml"},{"n":"Lillet","q":"10 ml (Blanc)"},{"n":"Limão","q":"1 casca (Siciliano)"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata gin, vodka e Lillet Blanc com muito gelo até ficar quase congelado.\n2. Coe para taça coupe gelada e perfume com casca larga de limão siciliano.', E'1. Bata gin, vodka e Lillet Blanc com muito gelo até ficar quase congelado.\n2. Coe para taça coupe gelada e perfume com casca larga de limão siciliano.', 'Gin, vodka e Lillet Blanc geladíssimos, batidos e finalizados com siciliano.', 'Escrito por Ian Fleming em 1953 em Casino Royale, batizado por James Bond em homenagem a Vesper Lynd.', 'Taça Martini / Coupe', 'Shaker', 'Casca de limão siciliano', true, array['Clássico','Forte','Curto','Gin','Vodka']::text[], 'vesper martini'),
('Hanky Panky', 'Fortes', '[{"n":"Gin","q":"45 ml"},{"n":"Vermute","q":"45 ml (Tinto)"},{"n":"Fernet","q":"7 ml"},{"n":"Laranja","q":"1 casca"},{"n":"Gelo","q":"para mexer"}]'::jsonb, E'1. Mexa gin, vermute tinto e Fernet em mixing glass com gelo.\n2. Coe para taça coupe gelada e expresse os óleos da casca de laranja.', E'1. Mexa gin, vermute tinto e Fernet em mixing glass com gelo.\n2. Coe para taça coupe gelada e expresse os óleos da casca de laranja.', 'Gin e vermute doce aprofundados por um toque medicinal e mentolado de Fernet.', 'Criado por Ada Coleman no American Bar do Hotel Savoy em Londres nos anos 1900 para o ator Sir Charles Hawtrey.', 'Taça Coupe', 'Mexido', 'Casca de laranja', false, array['Clássico','Amargo','Forte','Gin']::text[], 'hanky panky'),
('Martinez', 'Fortes', '[{"n":"Gin","q":"45 ml"},{"n":"Vermute","q":"45 ml (Tinto)"},{"n":"Maraschino","q":"7 ml"},{"n":"Bitter de laranja","q":"2 dashes"},{"n":"Laranja","q":"1 casca"},{"n":"Gelo","q":"para mexer"}]'::jsonb, E'1. Mexa todos os ingredientes em mixing glass com gelo por 25 segundos.\n2. Coe para taça coupe gelada e perfume com laranja.', E'1. Mexa todos os ingredientes em mixing glass com gelo por 25 segundos.\n2. Coe para taça coupe gelada e perfume com laranja.', 'O elo perdido entre o Manhattan e o Dry Martini, rico e aromático.', 'Publicado na década de 1880 na Califórnia, é celebrado como o ancestral direto do Dry Martini.', 'Taça Coupe', 'Mexido', 'Casca de laranja ou cereja', false, array['Clássico','Forte','Curto','Gin']::text[], 'martinez'),
('White Lady', 'Cítricos', '[{"n":"Gin","q":"45 ml"},{"n":"Triple Sec","q":"25 ml"},{"n":"Limão","q":"20 ml (Siciliano)"},{"n":"Clara de ovo","q":"15 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata sem gelo (dry shake) por 10 segundos.\n2. Adicione gelo, bata vigorosamente e coe duas vezes para taça coupe.', E'1. Bata sem gelo (dry shake) por 10 segundos.\n2. Adicione gelo, bata vigorosamente e coe duas vezes para taça coupe.', 'Espuma branca acetinada unindo gin, laranja e limão siciliano.', 'Consagrado por Harry Craddock em 1930 no Hotel Savoy em Londres, o equivalente ao Sidecar feito com gin.', 'Taça Coupe', 'Dry shake + shaker', 'Casca de limão siciliano', true, array['Clássico','Cítrico / Ácido','Cremoso','Gin']::text[], 'white lady'),
('Pink Lady', 'Doces & Frutados', '[{"n":"Gin","q":"45 ml"},{"n":"Calvados","q":"15 ml"},{"n":"Grenadine","q":"10 ml"},{"n":"Limão","q":"20 ml (Siciliano)"},{"n":"Clara de ovo","q":"15 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Faça dry shake sem gelo por 10 segundos.\n2. Bata com gelo e coe duas vezes na coupe gelada.', E'1. Faça dry shake sem gelo por 10 segundos.\n2. Bata com gelo e coe duas vezes na coupe gelada.', 'Elegante drink rosado da década de 1910 com gin, maçã e grenadine.', 'Batizado em homenagem ao musical da Broadway “The Pink Lady” de 1911 — um clássico refinado injustamente subestimado.', 'Taça Coupe', 'Dry shake + shaker', 'Cereja', true, array['Clássico','Cremoso','Frutado','Gin']::text[], 'pink lady'),
('White Russian', 'Doces & Frutados', '[{"n":"Vodka","q":"50 ml"},{"n":"Licor de café","q":"25 ml"},{"n":"Creme de leite","q":"30 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Monte vodka e licor de café no copo baixo com gelo.\n2. Despeje o creme de leite levemente batido por cima para criar efeito mármore.', E'1. Monte vodka e licor de café no copo baixo com gelo.\n2. Despeje o creme de leite levemente batido por cima para criar efeito mármore.', 'Café intenso com vodka e camada sedosa de creme de leite.', 'Imortalizado por Jeff Bridges em O Grande Lebowski (1998), nasceu nos anos 1960 como variação cremosa do Black Russian.', 'Old fashioned', 'Montado no copo', 'Opcional: raspas de chocolate', false, array['Clássico','Cremoso','Doce','Vodka']::text[], 'white russian'),
('Black Russian', 'Fortes', '[{"n":"Vodka","q":"50 ml"},{"n":"Licor de café","q":"25 ml"},{"n":"Gelo","q":"1 cubo grande"}]'::jsonb, E'1. Coloque vodka e licor de café em copo baixo com gelo.\n2. Mexa por 15 segundos para gelar e integrar.', E'1. Coloque vodka e licor de café em copo baixo com gelo.\n2. Mexa por 15 segundos para gelar e integrar.', 'Direto, escuro e elegante: apenas vodka e licor de café sobre gelo.', 'Criado em 1949 em Bruxelas por Gustave Tops no Hotel Metropole em homenagem à embaixadora americana Perle Mesta.', 'Old fashioned', 'Mexido no copo', 'Sem guarnição', false, array['Clássico','Forte','Curto','Vodka']::text[], 'black russian'),
('Amaretto Sour', 'Doces & Frutados', '[{"n":"Licor de amêndoa (Amaretto)","q":"45 ml"},{"n":"Whisky","q":"20 ml (Bourbon)"},{"n":"Limão","q":"30 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"10 ml"},{"n":"Clara de ovo","q":"15 ml"},{"n":"Angostura","q":"2 dashes"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Faça dry shake com todos os ingredientes exceto gelo.\n2. Bata com gelo e coe sobre cubo grande em copo baixo.\n3. Finalize com gotas de Angostura na espuma.', E'1. Faça dry shake com todos os ingredientes exceto gelo.\n2. Bata com gelo e coe sobre cubo grande em copo baixo.\n3. Finalize com gotas de Angostura na espuma.', 'Amêndoa doce equilibrada com bourbon encorpado e espuma cítrica.', 'Elevado ao patamar de alta coquetelaria por Jeffrey Morgenthaler em 2012 ao incluir bourbon para dar estrutura ao licor de amêndoas.', 'Copo baixo', 'Dry shake + shaker', 'Cereja e casca de laranja', true, array['Clássico','Doce','Cremoso','Cítrico / Ácido']::text[], 'amaretto sour'),
('Mint Julep', 'Fortes', '[{"n":"Whisky","q":"60 ml (Bourbon)"},{"n":"Hortelã","q":"12 folhas"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Gelo","q":"triturado"}]'::jsonb, E'1. Pressione suavemente a hortelã com o xarope no copo ou caneca.\n2. Encha com gelo triturado, despeje o bourbon e mexa até o copo suar por fora.\n3. Complete o domo de gelo triturado e espete um buquê de hortelã.', E'1. Pressione suavemente a hortelã com o xarope no copo ou caneca.\n2. Encha com gelo triturado, despeje o bourbon e mexa até o copo suar por fora.\n3. Complete o domo de gelo triturado e espete um buquê de hortelã.', 'Bourbon geladíssimo em montanha de gelo triturado e hortelã aromática.', 'Drink oficial do Kentucky Derby desde 1938, símbolo da hospitalidade sulista americana desde o século XVIII.', 'Copo Julep / Baixo', 'Montado + swizzle', 'Buquê generoso de hortelã', false, array['Clássico','Forte','Herbal / Hortelã','Whisky']::text[], 'mint julep'),
('New York Sour', 'Clássicos', '[{"n":"Whisky","q":"60 ml (Bourbon ou Rye)"},{"n":"Limão","q":"25 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Clara de ovo","q":"15 ml"},{"n":"Vinho tinto","q":"15 ml (seco)"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata whisky, limão, xarope e clara (dry shake + gelo).\n2. Coe sobre gelo novo no copo baixo.\n3. Com uma colher bailarina, flutue o vinho tinto lentamente sobre a espuma.', E'1. Bata whisky, limão, xarope e clara (dry shake + gelo).\n2. Coe sobre gelo novo no copo baixo.\n3. Com uma colher bailarina, flutue o vinho tinto lentamente sobre a espuma.', 'Whiskey sour visualmente marcante coroado por uma camada de vinho tinto.', 'Surgiu em Chicago na década de 1880 com nomes variados antes de se firmar como New York Sour nos bares de Manhattan.', 'Copo baixo', 'Shaker + float de vinho', 'Casca de limão e camada rubi de vinho', true, array['Clássico','Cítrico / Ácido','Cremoso','Whisky']::text[], 'new york sour'),
('Horse''s Neck', 'Refrescantes', '[{"n":"Conhaque","q":"50 ml"},{"n":"Xarope de gengibre","q":"25 ml"},{"n":"Água com gás","q":"110 ml"},{"n":"Limão","q":"1 espiral inteira (Siciliano)"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Descasque o limão siciliano em uma espiral contínua e acomode dentro do copo alto.\n2. Encha com gelo, adicione conhaque e xarope de gengibre.\n3. Complete com água com gás.', E'1. Descasque o limão siciliano em uma espiral contínua e acomode dentro do copo alto.\n2. Encha com gelo, adicione conhaque e xarope de gengibre.\n3. Complete com água com gás.', 'Conhaque, gengibre e espiral longa de limão siciliano em copo alto.', 'Nasceu como bebida sem álcool nos anos 1890 e ganhou conhaque na virada do século XX, batizado pela casca que lembra um pescoço de cavalo.', 'Copo alto', 'Montado no copo', 'Espiral longa de limão siciliano', false, array['Clássico','Picante / Gengibre','Refrescante','Conhaque']::text[], 'horse''s neck'),
('Brandy Sour', 'Cítricos', '[{"n":"Conhaque","q":"60 ml"},{"n":"Limão","q":"25 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata conhaque, suco de limão siciliano e xarope de açúcar com muito gelo.\n2. Coe sobre gelo novo ou em taça coupe.', E'1. Bata conhaque, suco de limão siciliano e xarope de açúcar com muito gelo.\n2. Coe sobre gelo novo ou em taça coupe.', 'Conhaque aveludado domado por limão siciliano fresco e xarope simples.', 'Clássico oitocentista anterior até ao Sidecar, muito apreciado no Mediterrâneo e em clubes britânicos.', 'Copo baixo', 'Shaker', 'Rodela de limão siciliano', true, array['Clássico','Cítrico / Ácido','Conhaque']::text[], 'brandy sour'),
('Brandy Daisy', 'Cítricos', '[{"n":"Conhaque","q":"50 ml"},{"n":"Limão","q":"25 ml (Siciliano)"},{"n":"Xarope de groselha","q":"15 ml"},{"n":"Água com gás","q":"45 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata conhaque, limão siciliano e groselha com gelo.\n2. Coe sobre gelo em taça ou copo baixo e finalize com splash de água com gás.', E'1. Bata conhaque, limão siciliano e groselha com gelo.\n2. Coe sobre gelo em taça ou copo baixo e finalize com splash de água com gás.', 'Clássico da família Daisy com conhaque, limão, groselha e gás leve.', 'Documentado por Jerry Thomas nos anos 1870, faz parte da linhagem histórica das “Daisies” que deu origem à própria Margarita.', 'Copo baixo', 'Shaker + splash', 'Morango ou casca de limão', true, array['Clássico','Cítrico / Ácido','Frutado','Conhaque']::text[], 'brandy daisy'),
('Gin Daisy', 'Cítricos', '[{"n":"Gin","q":"50 ml"},{"n":"Limão","q":"25 ml (Siciliano)"},{"n":"Xarope de groselha","q":"15 ml"},{"n":"Água com gás","q":"50 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata gin, limão siciliano e xarope de groselha com bastante gelo.\n2. Coe sobre gelo triturado e complete com splash de água com gás.', E'1. Bata gin, limão siciliano e xarope de groselha com bastante gelo.\n2. Coe sobre gelo triturado e complete com splash de água com gás.', 'Gin cítrico e rosado da família oitocentista das Daisies.', 'Antes da fama do Negroni, a Gin Daisy reinava nos bares americanos como uma combinação refrescante, rubi e gaseificada.', 'Taça ou copo baixo', 'Shaker + splash', 'Rodela de limão e hortelã', true, array['Clássico','Cítrico / Ácido','Frutado','Gin']::text[], 'gin daisy'),
('Gin Rickey', 'Refrescantes', '[{"n":"Gin","q":"50 ml"},{"n":"Limão","q":"25 ml (Taiti)"},{"n":"Água com gás","q":"120 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha o copo alto com gelo.\n2. Esprema o limão fresco e jogue a casca no copo.\n3. Adicione gin e complete com água com gás sem açúcar.', E'1. Encha o copo alto com gelo.\n2. Esprema o limão fresco e jogue a casca no copo.\n3. Adicione gin e complete com água com gás sem açúcar.', 'Zero açúcar: apenas gin, limão taiti fresco e muita água com gás.', 'Criado no Shoemaker’s Bar em Washington D.C. nos anos 1880 para o coronel Joe Rickey, perfeito para quem prefere drinks secos.', 'Copo alto', 'Montado no copo', 'Meio limão taiti', false, array['Clássico','Refrescante','Cítrico / Ácido','Com soda / Tônica','Gin']::text[], 'gin rickey'),
('Metropolitan', 'Fortes', '[{"n":"Conhaque","q":"50 ml"},{"n":"Vermute","q":"25 ml (Tinto)"},{"n":"Xarope de açúcar","q":"5 ml"},{"n":"Gelo","q":"para mexer"}]'::jsonb, E'1. Mexa conhaque, vermute tinto e um fio de xarope em mixing glass com gelo por 25s.\n2. Coe para taça coupe gelada.', E'1. Mexa conhaque, vermute tinto e um fio de xarope em mixing glass com gelo por 25s.\n2. Coe para taça coupe gelada.', 'O primo elegante e macio do Manhattan feito com conhaque.', 'Clássico da virada do século XX em Nova York quando o conhaque francês rivalizava com o rye whiskey nos salões de hotel.', 'Taça Coupe', 'Mexido', 'Cereja ou casca de laranja', false, array['Clássico','Forte','Curto','Conhaque']::text[], 'metropolitan'),
('Harvard', 'Aperitivos', '[{"n":"Conhaque","q":"45 ml"},{"n":"Vermute","q":"45 ml (Tinto)"},{"n":"Água com gás","q":"45 ml"},{"n":"Limão","q":"1 casca (Siciliano)"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Mexa conhaque e vermute tinto com gelo em mixing glass.\n2. Coe para taça ou copo baixo e finalize com água com gás.', E'1. Mexa conhaque e vermute tinto com gelo em mixing glass.\n2. Coe para taça ou copo baixo e finalize com água com gás.', 'Aperitivo clássico de conhaque e vermute tinto alongado com gás.', 'Receita registrada no início do século XX em livros clássicos americanos como opção leve de fim de tarde.', 'Taça Coupe / Copo baixo', 'Mexido + splash', 'Casca de limão siciliano', false, array['Clássico','Refrescante','Conhaque','Vermute & Aperitivos']::text[], 'harvard'),
('Rusty Nail', 'Fortes', '[{"n":"Whisky","q":"45 ml (Scotch)"},{"n":"Drambuie","q":"25 ml"},{"n":"Limão","q":"1 casca (Siciliano)"},{"n":"Gelo","q":"1 cubo grande"}]'::jsonb, E'1. Despeje Scotch e Drambuie sobre gelo grande em copo baixo.\n2. Mexa suavemente por 20 segundos e perfume com casca de limão.', E'1. Despeje Scotch e Drambuie sobre gelo grande em copo baixo.\n2. Mexa suavemente por 20 segundos e perfume com casca de limão.', 'Scotch whisky e licor escocês Drambuie com notas de mel e urze.', 'Consagrado nos anos 1960 pelo Rat Pack em Nova York, nasceu ainda antes como o “prego enferrujado” dos bares escoceses.', 'Old fashioned', 'Mexido no copo', 'Casca de limão siciliano', false, array['Clássico','Forte','Curto','Whisky']::text[], 'rusty nail'),
('Godfather', 'Fortes', '[{"n":"Whisky","q":"50 ml (Scotch ou Bourbon)"},{"n":"Licor de amêndoa (Amaretto)","q":"25 ml"},{"n":"Gelo","q":"1 cubo grande"}]'::jsonb, E'1. Coloque whisky e Amaretto sobre uma pedra grande de gelo.\n2. Mexa devagar por 20 segundos.', E'1. Coloque whisky e Amaretto sobre uma pedra grande de gelo.\n2. Mexa devagar por 20 segundos.', 'Whisky robusto amaciado pelo perfume adocicado de amêndoas do Amaretto.', 'Popularizado nos anos 1970 na esteira do sucesso do filme O Poderoso Chefão, virou um digestivo clássico de fim de noite.', 'Old fashioned', 'Mexido no copo', 'Casca de laranja opcional', false, array['Clássico','Forte','Curto','Whisky']::text[], 'godfather'),
('French Connection', 'Fortes', '[{"n":"Conhaque","q":"35 ml"},{"n":"Licor de amêndoa (Amaretto)","q":"35 ml"},{"n":"Gelo","q":"1 cubo grande"}]'::jsonb, E'1. Despeje partes iguais de conhaque e Amaretto no copo baixo com gelo grande.\n2. Mexa suavemente para resfriar.', E'1. Despeje partes iguais de conhaque e Amaretto no copo baixo com gelo grande.\n2. Mexa suavemente para resfriar.', 'Partes iguais de conhaque francês e Amaretto italiano sobre gelo.', 'Batizado em homenagem ao premiado thriller Operação França (1971), faz parte da lista oficial da IBA.', 'Old fashioned', 'Mexido no copo', 'Sem guarnição', false, array['Clássico','Forte','Doce','Conhaque']::text[], 'french connection'),
('Long Island Iced Tea', 'Fortes', '[{"n":"Vodka","q":"15 ml"},{"n":"Gin","q":"15 ml"},{"n":"Rum","q":"15 ml (Branco)"},{"n":"Tequila","q":"15 ml"},{"n":"Triple Sec","q":"15 ml"},{"n":"Limão","q":"25 ml (Taiti)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Coca-Cola","q":"40 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Coloque todos os destilados, Triple Sec, limão e xarope em copo alto com gelo.\n2. Mexa bem e complete apenas com um toque de Coca-Cola para dar cor âmbar de chá.', E'1. Coloque todos os destilados, Triple Sec, limão e xarope em copo alto com gelo.\n2. Mexa bem e complete apenas com um toque de Coca-Cola para dar cor âmbar de chá.', 'Cinco destilados equilibrados com limão e toque de cola em copo alto.', 'Criado nos anos 1970 em Long Island, Nova York, por Robert “Rosebud” Butt em um concurso de criação de drinks com Triple Sec.', 'Copo alto', 'Montado + mexido', 'Gomo de limão', false, array['Clássico','Forte','Longo']::text[], 'long island iced tea'),
('Aperol Spritz', 'Aperitivos', '[{"n":"Aperol","q":"60 ml"},{"n":"Prosecco","q":"90 ml"},{"n":"Água com gás","q":"30 ml"},{"n":"Laranja","q":"1 rodela"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha uma taça de vinho grande com bastante gelo.\n2. Despeje Prosecco, depois Aperol e finalize com splash de água com gás.\n3. Decore com rodela de laranja.', E'1. Encha uma taça de vinho grande com bastante gelo.\n2. Despeje Prosecco, depois Aperol e finalize com splash de água com gás.\n3. Decore com rodela de laranja.', 'O aperitivo italiano alaranjado de ervas cítricas com Prosecco.', 'Nascido no Vêneto e popularizado em Pádua e Veneza nos anos 1950, virou o brinde oficial do fim de tarde europeu.', 'Taça de vinho', 'Montado na taça', 'Rodela de laranja', false, array['Clássico','Amargo','Refrescante','Com soda / Tônica','Vermute & Aperitivos']::text[], 'aperol spritz'),
('Negroni Sbagliato', 'Aperitivos', '[{"n":"Campari","q":"30 ml"},{"n":"Vermute","q":"30 ml (Tinto)"},{"n":"Espumante","q":"30 ml (Brut ou Prosecco)"},{"n":"Laranja","q":"1 rodela"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Despeje Campari e vermute tinto em copo baixo ou taça com gelo.\n2. Complete suavemente com espumante brut e decore com laranja.', E'1. Despeje Campari e vermute tinto em copo baixo ou taça com gelo.\n2. Complete suavemente com espumante brut e decore com laranja.', 'O “Negroni errado” onde o espumante substitui o gin com leveza e gás.', 'Criado por acidente em 1972 por Mirko Stocchetto no Bar Basso em Milão ao pegar uma garrafa de espumante em vez de gin.', 'Old fashioned / Taça', 'Montado no copo', 'Meia rodela de laranja', false, array['Clássico','Amargo','Refrescante','Vermute & Aperitivos']::text[], 'negroni sbagliato'),
('Americano', 'Aperitivos', '[{"n":"Campari","q":"30 ml"},{"n":"Vermute","q":"30 ml (Tinto)"},{"n":"Água com gás","q":"60 ml"},{"n":"Laranja","q":"1 rodela"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Coloque gelo em copo alto ou baixo.\n2. Adicione Campari e vermute tinto e complete com água com gás bem gelada.', E'1. Coloque gelo em copo alto ou baixo.\n2. Adicione Campari e vermute tinto e complete com água com gás bem gelada.', 'Leve, amargo e borbulhante: o pai histórico do próprio Negroni.', 'Servido desde a década de 1860 no Caffè Campari em Milão e batizado pelo sucesso entre turistas americanos durante a Lei Seca.', 'Copo alto / Old fashioned', 'Montado no copo', 'Meia rodela de laranja', false, array['Clássico','Amargo','Refrescante','Com soda / Tônica','Vermute & Aperitivos']::text[], 'americano'),
('Milano-Torino', 'Aperitivos', '[{"n":"Campari","q":"45 ml"},{"n":"Vermute","q":"45 ml (Tinto)"},{"n":"Laranja","q":"1 casca"},{"n":"Gelo","q":"1 cubo grande"}]'::jsonb, E'1. Mexa Campari e vermute tinto sobre gelo grande no copo baixo.\n2. Perfume com casca de laranja.', E'1. Mexa Campari e vermute tinto sobre gelo grande no copo baixo.\n2. Perfume com casca de laranja.', 'O encontro puro de Milão (Campari) e Turim (vermute tinto) sem gás.', 'Batizado pelas duas cidades italianas de origem de seus ingredientes em meados do século XIX.', 'Old fashioned', 'Mexido no copo', 'Casca de laranja', false, array['Clássico','Amargo','Curto','Vermute & Aperitivos']::text[], 'milano-torino'),
('Garibaldi', 'Aperitivos', '[{"n":"Campari","q":"45 ml"},{"n":"Suco de laranja","q":"120 ml (aerado)"},{"n":"Laranja","q":"1 rodela"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata o suco de laranja na coqueteleira ou liquidificador rápido para ficar aerado e espumoso (“fluffy”).\n2. Despeje sobre Campari e gelo em copo alto.', E'1. Bata o suco de laranja na coqueteleira ou liquidificador rápido para ficar aerado e espumoso (“fluffy”).\n2. Despeje sobre Campari e gelo em copo alto.', 'Campari vibrante com suco de laranja aerado e cremoso no topo.', 'Homenagem ao herói da unificação italiana Giuseppe Garibaldi, consagrado pela versão “fluffy orange” do bar Dante em Nova York.', 'Copo alto', 'Montado com suco aerado', 'Gomo de laranja', false, array['Clássico','Amargo','Cítrico / Ácido','Vermute & Aperitivos']::text[], 'garibaldi'),
('Campari Tonic', 'Aperitivos', '[{"n":"Campari","q":"50 ml"},{"n":"Água tônica","q":"120 ml"},{"n":"Laranja","q":"1 rodela"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha a taça ou copo alto com gelo.\n2. Despeje o Campari e complete com água tônica gelada.', E'1. Encha a taça ou copo alto com gelo.\n2. Despeje o Campari e complete com água tônica gelada.', 'Amargor herbáceo do Campari alongado pela efervescência da tônica.', 'Um dos highballs mais pedidos em bares italianos e rooftops paulistanos pela simplicidade elegante.', 'Taça balão', 'Montado na taça', 'Rodela de laranja ou limão', false, array['Clássico','Amargo','Refrescante','Com soda / Tônica','Vermute & Aperitivos']::text[], 'campari tonic'),
('Cynar Julep', 'Aperitivos', '[{"n":"Cynar","q":"50 ml"},{"n":"Hortelã","q":"10 folhas"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Suco de grapefruit","q":"45 ml"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Gelo","q":"triturado"}]'::jsonb, E'1. Pressione suavemente a hortelã no copo com xarope e limão.\n2. Adicione Cynar, grapefruit e muito gelo triturado, mexendo até gelar.', E'1. Pressione suavemente a hortelã no copo com xarope e limão.\n2. Adicione Cynar, grapefruit e muito gelo triturado, mexendo até gelar.', 'Aperitivo italiano de alcachofra refrescado com hortelã e grapefruit.', 'Hit dos bares argentinos e paulistanos modernos que provou como o Cynar brilha com cítricos frescos.', 'Copo baixo / Julep', 'Macerado + swizzle', 'Ramo de hortelã', false, array['Amargo','Refrescante','Herbal / Hortelã','Vermute & Aperitivos']::text[], 'cynar julep'),
('Cynar Tonic', 'Aperitivos', '[{"n":"Cynar","q":"50 ml"},{"n":"Água tônica","q":"120 ml"},{"n":"Limão","q":"1 rodela"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Coloque bastante gelo em copo alto ou taça.\n2. Adicione Cynar, complete com água tônica e finalize com limão espremido.', E'1. Coloque bastante gelo em copo alto ou taça.\n2. Adicione Cynar, complete com água tônica e finalize com limão espremido.', 'Amargo herbal complexo de alcachofra com quinino da tônica.', 'Aperitivo italiano criado em 1952 que ganhou nova juventude nos balcões de coquetelaria ao lado da água tônica.', 'Copo alto', 'Montado no copo', 'Rodela de limão', false, array['Amargo','Refrescante','Com soda / Tônica','Vermute & Aperitivos']::text[], 'cynar tonic'),
('Hugo Spritz', 'Aperitivos', '[{"n":"Espumante","q":"90 ml (Prosecco ou Brut)"},{"n":"Licor de flor de sabugueiro","q":"30 ml"},{"n":"Hortelã","q":"8 folhas"},{"n":"Água com gás","q":"30 ml"},{"n":"Limão","q":"1 rodela"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha uma taça de vinho com gelo e folhas de hortelã.\n2. Adicione licor de flor de sabugueiro, espumante e água com gás.', E'1. Encha uma taça de vinho com gelo e folhas de hortelã.\n2. Adicione licor de flor de sabugueiro, espumante e água com gás.', 'Spritz alpino floral de sabugueiro, hortelã fresca e Prosecco.', 'Criado em 2005 pelo bartender Roland Gruber no Tirol do Sul (Itália) como alternativa floral e refrescante ao Aperol Spritz.', 'Taça de vinho', 'Montado na taça', 'Hortelã e rodela de limão', false, array['Clássico','Refrescante','Herbal / Hortelã','Com soda / Tônica']::text[], 'hugo spritz'),
('St-Germain Spritz', 'Aperitivos', '[{"n":"Licor de flor de sabugueiro","q":"40 ml"},{"n":"Espumante","q":"60 ml (Brut)"},{"n":"Água com gás","q":"60 ml"},{"n":"Limão","q":"1 casca (Siciliano)"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha um copo alto ou taça com gelo.\n2. Despeje o licor de flor de sabugueiro, espumante e água com gás.\n3. Perfume com casca de limão siciliano.', E'1. Encha um copo alto ou taça com gelo.\n2. Despeje o licor de flor de sabugueiro, espumante e água com gás.\n3. Perfume com casca de limão siciliano.', 'Floral, leve e perfumado: licor francês de sabugueiro com bolhas.', 'Spritz assinatura da maison francesa St-Germain, famoso pela leveza aromática em almoços e terraços ao sol.', 'Taça de vinho', 'Montado na taça', 'Casca de limão siciliano', false, array['Refrescante','Doce','Com soda / Tônica']::text[], 'st-germain spritz'),
('French 75', 'Aperitivos', '[{"n":"Gin","q":"35 ml"},{"n":"Limão","q":"15 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Espumante","q":"90 ml (Brut)"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata gin, limão siciliano e xarope com gelo.\n2. Coe para taça flûte gelada e complete com espumante brut.', E'1. Bata gin, limão siciliano e xarope com gelo.\n2. Coe para taça flûte gelada e complete com espumante brut.', 'Gin cítrico batido e coroado com espumante seco em taça flûte.', 'Batizado em Paris durante a Primeira Guerra Mundial em referência ao rápido canhão francês de 75mm pelo efeito festivo.', 'Taça Flûte', 'Shaker + top de espumante', 'Espiral de limão siciliano', true, array['Clássico','Cítrico / Ácido','Refrescante','Gin']::text[], 'french 75'),
('Kir Royale', 'Aperitivos', '[{"n":"Champagne","q":"100 ml (ou Espumante Brut)"},{"n":"Licor de cassis","q":"15 ml"}]'::jsonb, E'1. Coloque o licor de cassis no fundo da taça flûte gelada.\n2. Complete delicadamente com Champagne ou espumante brut.', E'1. Coloque o licor de cassis no fundo da taça flûte gelada.\n2. Complete delicadamente com Champagne ou espumante brut.', 'Brinde francês rubi de Champagne seco com licor de cassis da Borgonha.', 'Versão nobre do aperitivo criado pelo cônego Félix Kir em Dijon após a Segunda Guerra Mundial, trocando o vinho branco por Champagne.', 'Taça Flûte', 'Montado na taça', 'Amora ou casca de limão', false, array['Clássico','Frutado','Doce']::text[], 'kir royale'),
('Bellini', 'Aperitivos', '[{"n":"Prosecco","q":"100 ml"},{"n":"Suco de pêssego","q":"50 ml (ou purê)"},{"n":"Pêssego","q":"1 fatia"}]'::jsonb, E'1. Coloque o purê ou suco gelado de pêssego na taça flûte.\n2. Complete lentamente com Prosecco e mexa uma vez.', E'1. Coloque o purê ou suco gelado de pêssego na taça flûte.\n2. Complete lentamente com Prosecco e mexa uma vez.', 'Prosecco italiano aveludado com néctar suave de pêssego.', 'Criado por Giuseppe Cipriani em 1948 no Harry’s Bar de Veneza, batizado pela cor rosada das pinturas do mestre renascentista Giovanni Bellini.', 'Taça Flûte', 'Montado na taça', 'Fatia fina de pêssego', false, array['Clássico','Frutado','Doce']::text[], 'bellini'),
('Rossini', 'Aperitivos', '[{"n":"Prosecco","q":"100 ml"},{"n":"Morango","q":"3 unid (em purê)"},{"n":"Xarope de açúcar","q":"5 ml"}]'::jsonb, E'1. Amasse bem os morangos com o fio de xarope até virar purê liso e coe para a taça flûte.\n2. Complete com Prosecco bem gelado.', E'1. Amasse bem os morangos com o fio de xarope até virar purê liso e coe para a taça flûte.\n2. Complete com Prosecco bem gelado.', 'Prosecco vibrante com purê fresco de morango.', 'Irmão italiano do Bellini, batizado em homenagem ao célebre compositor Gioachino Rossini.', 'Taça Flûte', 'Montado na taça', 'Morango na borda', false, array['Clássico','Frutado','Refrescante']::text[], 'rossini'),
('Mimosa', 'Aperitivos', '[{"n":"Espumante","q":"75 ml (Brut)"},{"n":"Suco de laranja","q":"75 ml (fresco e coado)"}]'::jsonb, E'1. Coloque o suco de laranja bem gelado na taça flûte.\n2. Complete em partes iguais com espumante brut gelado.', E'1. Coloque o suco de laranja bem gelado na taça flûte.\n2. Complete em partes iguais com espumante brut gelado.', 'Partes iguais de espumante brut e suco fresco de laranja.', 'Consagrado nos anos 1920 no Hotel Ritz de Paris como o brinde perfeito de brunchs e manhãs ensolaradas.', 'Taça Flûte', 'Montado na taça', 'Twist fino de laranja', false, array['Clássico','Cítrico / Ácido','Refrescante']::text[], 'mimosa'),
('Old Cuban', 'Aperitivos', '[{"n":"Rum","q":"45 ml (Envelhecido)"},{"n":"Hortelã","q":"8 folhas"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Angostura","q":"2 dashes"},{"n":"Espumante","q":"60 ml (Brut)"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata rum envelhecido, hortelã, limão, xarope e Angostura com gelo.\n2. Coe duas vezes para taça coupe gelada e complete com espumante brut.', E'1. Bata rum envelhecido, hortelã, limão, xarope e Angostura com gelo.\n2. Coe duas vezes para taça coupe gelada e complete com espumante brut.', 'Encontro luxuoso entre Mojito e French 75 com rum envelhecido e espumante.', 'Criado em 2001 por Audrey Saunders no Pegu Club de Nova York — um dos grandes ícones modernos dos bares nova-iorquinos.', 'Taça Coupe', 'Shaker + top de espumante', 'Folha de hortelã', true, array['Clássico','Herbal / Hortelã','Refrescante','Rum']::text[], 'old cuban'),
('White Negroni', 'Aperitivos', '[{"n":"Gin","q":"30 ml"},{"n":"Lillet","q":"30 ml (Blanc)"},{"n":"Suze","q":"30 ml"},{"n":"Limão","q":"1 casca (Siciliano)"},{"n":"Gelo","q":"1 cubo grande"}]'::jsonb, E'1. Mexa gin, Lillet Blanc e Suze com gelo em mixing glass por 25 segundos.\n2. Coe sobre pedra grande de gelo e perfume com casca de limão siciliano.', E'1. Mexa gin, Lillet Blanc e Suze com gelo em mixing glass por 25 segundos.\n2. Coe sobre pedra grande de gelo e perfume com casca de limão siciliano.', 'Variação clara e floral do Negroni com genciana francesa (Suze) e Lillet.', 'Criado em 2001 em Bordeaux por Wayne Collins para a feira Vinexpo, usando ingredientes franceses no lugar dos italianos.', 'Old fashioned', 'Mexido', 'Casca de limão siciliano', false, array['Clássico','Amargo','Curto','Gin']::text[], 'white negroni'),
('Porto Tonico', 'Aperitivos', '[{"n":"Vinho do Porto","q":"60 ml (Branco)"},{"n":"Água tônica","q":"110 ml"},{"n":"Limão","q":"1 casca (Siciliano)"},{"n":"Hortelã","q":"1 ramo"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha uma taça balão com gelo.\n2. Adicione Vinho do Porto Branco e complete com água tônica.\n3. Finalize com hortelã e casca de limão.', E'1. Encha uma taça balão com gelo.\n2. Adicione Vinho do Porto Branco e complete com água tônica.\n3. Finalize com hortelã e casca de limão.', 'Aperitivo português levíssimo de Porto Branco com tônica e hortelã.', 'Cartão-postal das margens do rio Douro em Portugal, perfeito para quem quer frescor aromático e baixo teor alcoólico.', 'Taça balão', 'Montado na taça', 'Ramo de hortelã e limão', false, array['Clássico','Refrescante','Com soda / Tônica','Vermute & Aperitivos']::text[], 'porto tonico'),
('Tinto de Verano', 'Aperitivos', '[{"n":"Vinho tinto","q":"100 ml"},{"n":"Refrigerante de limão","q":"100 ml"},{"n":"Laranja","q":"1 rodela"},{"n":"Limão","q":"1 rodela"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha um copo alto ou taça de vinho com muito gelo e frutas cítricas.\n2. Despeje partes iguais de vinho tinto gelado e refrigerante de limão.', E'1. Encha um copo alto ou taça de vinho com muito gelo e frutas cítricas.\n2. Despeje partes iguais de vinho tinto gelado e refrigerante de limão.', 'Clássico popular espanhol de verão com vinho tinto e soda cítrica.', 'Nascido em Córdoba na Espanha no início do século XX, disputando até com a Sangria a preferência nas tardes quentes.', 'Taça de vinho / Copo alto', 'Montado na taça', 'Rodela de limão e laranja', false, array['Clássico','Refrescante','Longo','Vermute & Aperitivos']::text[], 'tinto de verano'),
('Bamboo', 'Aperitivos', '[{"n":"Xerez","q":"45 ml (Seco)"},{"n":"Vermute","q":"45 ml (Seco)"},{"n":"Bitter de laranja","q":"2 dashes"},{"n":"Limão","q":"1 casca (Siciliano)"},{"n":"Gelo","q":"para mexer"}]'::jsonb, E'1. Mexa xerez seco, vermute seco e bitter de laranja com muito gelo.\n2. Coe para taça coupe gelada e expresse casca de limão siciliano.', E'1. Mexa xerez seco, vermute seco e bitter de laranja com muito gelo.\n2. Coe para taça coupe gelada e expresse casca de limão siciliano.', 'Aperitivo histórico de baixo teor alcoólico, seco, mineral e elegante.', 'Criado por volta de 1890 pelo bartender alemão Louis Eppinger no Grand Hotel de Yokohama, no Japão.', 'Taça Coupe', 'Mexido', 'Casca de limão siciliano', false, array['Clássico','Curto','Vermute & Aperitivos']::text[], 'bamboo'),
('Tinto Tonic', 'Aperitivos', '[{"n":"Vermute","q":"50 ml (Tinto)"},{"n":"Água tônica","q":"100 ml"},{"n":"Laranja","q":"1 fatia"},{"n":"Limão","q":"10 ml (Siciliano)"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha uma taça de vinho com bastante gelo.\n2. Despeje vermute tinto e limão siciliano e complete com água tônica.\n3. Finalize com fatia de laranja.', E'1. Encha uma taça de vinho com bastante gelo.\n2. Despeje vermute tinto e limão siciliano e complete com água tônica.\n3. Finalize com fatia de laranja.', 'Vermute tinto aromático alongado com tônica e cítricos frescos.', 'Aperitivo descomplicado de boteco europeu adotado nos bares brasileiros por sua leveza e especiarias suaves.', 'Taça de vinho', 'Montado na taça', 'Fatia de laranja', false, array['Refrescante','Com soda / Tônica','Vermute & Aperitivos']::text[], 'tinto tonic'),
('Sweet Martini', 'Fortes', '[{"n":"Gin","q":"50 ml"},{"n":"Vermute","q":"25 ml (Tinto)"},{"n":"Cereja","q":"1 unid"},{"n":"Gelo","q":"para mexer"}]'::jsonb, E'1. Mexa gin e vermute tinto em mixing glass com bastante gelo por 25 segundos.\n2. Coe para taça martini gelada e decore com cereja.', E'1. Mexa gin e vermute tinto em mixing glass com bastante gelo por 25 segundos.\n2. Coe para taça martini gelada e decore com cereja.', 'A versão doce e rubi do Martini antes do predomínio do Dry.', 'Muito popular antes dos anos 1920, mostra como o gin botânico casa com a riqueza herbácea do vermute tinto.', 'Taça Martini', 'Mexido', 'Cereja no palito', false, array['Clássico','Forte','Curto','Gin']::text[], 'sweet martini'),
('Gin & It', 'Aperitivos', '[{"n":"Gin","q":"45 ml"},{"n":"Vermute","q":"45 ml (Tinto)"},{"n":"Laranja","q":"1 casca"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Mexa partes iguais de gin e vermute tinto italiano em copo baixo com gelo.\n2. Perfume com casca de laranja.', E'1. Mexa partes iguais de gin e vermute tinto italiano em copo baixo com gelo.\n2. Perfume com casca de laranja.', 'Clássico britânico de pub: gin e vermute italiano servidos em partes iguais.', 'Abreviação inglesa para “Gin and Italian Vermouth”, onipresente nos pubs londrinos desde o século XIX.', 'Copo baixo', 'Mexido no copo', 'Casca de laranja', false, array['Clássico','Curto','Gin','Vermute & Aperitivos']::text[], 'gin & it'),
('Cardinale', 'Aperitivos', '[{"n":"Gin","q":"40 ml"},{"n":"Campari","q":"20 ml"},{"n":"Vermute","q":"20 ml (Seco)"},{"n":"Limão","q":"1 casca (Siciliano)"},{"n":"Gelo","q":"para mexer"}]'::jsonb, E'1. Mexa gin, Campari e vermute seco com gelo por 25 segundos.\n2. Coe para taça ou copo baixo com gelo novo.', E'1. Mexa gin, Campari e vermute seco com gelo por 25 segundos.\n2. Coe para taça ou copo baixo com gelo novo.', 'Variação mais seca e luminosa do Negroni usando vermute seco.', 'Criado em Roma em 1950 no Hotel Excelsior em homenagem a um cardeal frequentador do bar — daí sua cor púrpura-escarlate.', 'Old fashioned', 'Mexido', 'Casca de limão siciliano', false, array['Clássico','Amargo','Forte','Gin']::text[], 'cardinale'),
('Bloody Mary', 'Aperitivos', '[{"n":"Vodka","q":"50 ml"},{"n":"Suco de tomate","q":"120 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Pimenta","q":"3 gotas"},{"n":"Molho inglês","q":"4 gotas"},{"n":"Sal","q":"1 pitada"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Combine vodka, suco de tomate, limão, molho inglês, pimenta e sal em coqueteleira com gelo.\n2. Passe suavemente de um copo a outro (rolling) sem espumar demais.\n3. Sirva em copo alto com gelo.', E'1. Combine vodka, suco de tomate, limão, molho inglês, pimenta e sal em coqueteleira com gelo.\n2. Passe suavemente de um copo a outro (rolling) sem espumar demais.\n3. Sirva em copo alto com gelo.', 'Salgado, picante e encorpado: o coquetel de brunch mais famoso da história.', 'Aperfeiçoado por Fernand Petiot em Paris nos anos 1920 e no St. Regis de Nova York nos anos 1930.', 'Copo alto', 'Rolling (aerado suave)', 'Gomo de limão e pimenta', false, array['Clássico','Picante / Gengibre','Longo','Vodka']::text[], 'bloody mary'),
('Red Snapper', 'Aperitivos', '[{"n":"Gin","q":"50 ml"},{"n":"Suco de tomate","q":"120 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Molho inglês","q":"4 gotas"},{"n":"Pimenta","q":"3 gotas"},{"n":"Sal","q":"1 pitada"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Faça o rolling suave com gin, suco de tomate, limão e temperos com gelo.\n2. Sirva em copo alto com gelo fresco.', E'1. Faça o rolling suave com gin, suco de tomate, limão e temperos com gelo.\n2. Sirva em copo alto com gelo fresco.', 'O Bloody Mary aromático feito com gin no lugar da vodka.', 'Nome original usado por Fernand Petiot no King Cole Bar de Nova York nos anos 1930 antes de Bloody Mary virar o padrão.', 'Copo alto', 'Rolling', 'Gomo de limão', false, array['Clássico','Picante / Gengibre','Longo','Gin']::text[], 'red snapper'),
('Caipirinha', 'Brasileiríssimos', '[{"n":"Cachaça","q":"50 ml (Prata)"},{"n":"Limão","q":"1 unid (Taiti)"},{"n":"Açúcar","q":"2 colheres"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Corte o limão em gomos retirando o miolo branco e macere suavemente com o açúcar no copo baixo.\n2. Encha de gelo, adicione a cachaça e misture bem.', E'1. Corte o limão em gomos retirando o miolo branco e macere suavemente com o açúcar no copo baixo.\n2. Encha de gelo, adicione a cachaça e misture bem.', 'Patrimônio brasileiro: cachaça, limão taiti fresco, açúcar e muito gelo.', 'Nascida no interior paulista entre o fim do século XIX e início do XX, tornou-se o maior símbolo da coquetelaria do Brasil no mundo.', 'Copo baixo', 'Macerado', 'Meia rodela de limão', false, array['Clássico','Brasileiro','Cítrico / Ácido','Refrescante','Cachaça']::text[], 'caipirinha'),
('Caipiroska', 'Brasileiríssimos', '[{"n":"Vodka","q":"50 ml"},{"n":"Limão","q":"1 unid (Taiti)"},{"n":"Açúcar","q":"2 colheres"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere o limão taiti cortado com açúcar no copo baixo.\n2. Encha de gelo, adicione vodka e agite ou mexa muito bem.', E'1. Macere o limão taiti cortado com açúcar no copo baixo.\n2. Encha de gelo, adicione vodka e agite ou mexa muito bem.', 'A versão neutra e cristalina da caipirinha preparada com vodka.', 'Popularizada nos bares brasileiros nos anos 1990 como alternativa suave para quem prefere o sabor limpo da fruta.', 'Copo baixo', 'Macerado', 'Rodela de limão', false, array['Clássico','Brasileiro','Cítrico / Ácido','Vodka']::text[], 'caipiroska'),
('Caipirinha de Morango', 'Brasileiríssimos', '[{"n":"Cachaça","q":"50 ml (Prata)"},{"n":"Morango","q":"5 unid"},{"n":"Limão","q":"0.5 unid (Taiti)"},{"n":"Açúcar","q":"2 colheres"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere morangos maduros e meio limão com açúcar no fundo do copo.\n2. Adicione bastante gelo, cachaça e bata rápido na coqueteleira ou mexa.', E'1. Macere morangos maduros e meio limão com açúcar no fundo do copo.\n2. Adicione bastante gelo, cachaça e bata rápido na coqueteleira ou mexa.', 'Morangos frescos macerados com toque cítrico de limão e cachaça prata.', 'A variação frutada mais pedida nas noites e praias brasileiras pelo contraste doce-ácido vibrante.', 'Copo baixo', 'Macerado', 'Morango fatiado na borda', false, array['Clássico','Brasileiro','Frutado','Doce','Cachaça']::text[], 'caipirinha de morango'),
('Caipirinha de Maracujá', 'Brasileiríssimos', '[{"n":"Cachaça","q":"50 ml (Prata)"},{"n":"Maracujá","q":"1 fruta"},{"n":"Limão","q":"0.5 unid (Taiti)"},{"n":"Açúcar","q":"2 colheres"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Coloque a polpa fresca de maracujá com açúcar e meio limão no copo ou shaker.\n2. Adicione cachaça e gelo, agite forte e sirva no copo baixo.', E'1. Coloque a polpa fresca de maracujá com açúcar e meio limão no copo ou shaker.\n2. Adicione cachaça e gelo, agite forte e sirva no copo baixo.', 'Maracujá azedinho e perfumado com cachaça prata e gelo.', 'Presença garantida em qualquer carta brasileira pela crocância das sementes e intensidade tropical.', 'Copo baixo', 'Shaker / Macerado', 'Meia casca ou sementes por cima', true, array['Brasileiro','Tropical','Cítrico / Ácido','Cachaça']::text[], 'caipirinha de maracuja'),
('Caipirinha de Abacaxi com Hortelã', 'Brasileiríssimos', '[{"n":"Cachaça","q":"50 ml (Prata)"},{"n":"Abacaxi","q":"80 g"},{"n":"Hortelã","q":"8 folhas"},{"n":"Limão","q":"0.5 unid"},{"n":"Açúcar","q":"1.5 colher"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere o abacaxi com açúcar e limão; pressione suavemente a hortelã.\n2. Adicione gelo e cachaça e agite na coqueteleira.', E'1. Macere o abacaxi com açúcar e limão; pressione suavemente a hortelã.\n2. Adicione gelo e cachaça e agite na coqueteleira.', 'Abacaxi doce, hortelã fresca e cachaça prata em sintonia de verão.', 'Combinação clássica de suco brasileiro transformada em uma das caipirinhas mais refrescantes do país.', 'Copo baixo', 'Macerado + shaker', 'Folha de abacaxi e ramo de hortelã', true, array['Brasileiro','Refrescante','Tropical','Herbal / Hortelã','Cachaça']::text[], 'caipirinha de abacaxi com hortela'),
('Caipirinha de Kiwi', 'Brasileiríssimos', '[{"n":"Cachaça","q":"50 ml (Prata)"},{"n":"Kiwi","q":"1 unid descascada"},{"n":"Açúcar","q":"2 colheres"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere o kiwi descascado com açúcar no fundo do copo ou shaker.\n2. Adicione cachaça e muito gelo e agite bem.', E'1. Macere o kiwi descascado com açúcar no fundo do copo ou shaker.\n2. Adicione cachaça e muito gelo e agite bem.', 'Verde vibrante e textura suculenta de kiwi fresco com cachaça.', 'Clássico das cartas de praia desde os anos 2000 pela acidez delicada do kiwi combinada com a cana.', 'Copo baixo', 'Macerado + shaker', 'Rodelas de kiwi', true, array['Brasileiro','Frutado','Refrescante','Cachaça']::text[], 'caipirinha de kiwi'),
('Caipirinha de Tangerina com Pimenta', 'Brasileiríssimos', '[{"n":"Cachaça","q":"50 ml (Prata)"},{"n":"Tangerina","q":"4 gomos"},{"n":"Pimenta","q":"1 fatia fina (dedo-de-moça)"},{"n":"Açúcar","q":"1.5 colher"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere os gomos de tangerina sem sementes com açúcar e uma fatia fina de pimenta.\n2. Bata com cachaça e gelo e sirva no copo baixo.', E'1. Macere os gomos de tangerina sem sementes com açúcar e uma fatia fina de pimenta.\n2. Bata com cachaça e gelo e sirva no copo baixo.', 'Doçura aromática da mexerica com picância leve de pimenta dedo-de-moça.', 'Receita querida dos bares autorais brasileiros que desperta o paladar sem esconder a cachaça.', 'Copo baixo', 'Macerado + shaker', 'Gomo de tangerina e pontinha de pimenta', true, array['Brasileiro','Picante / Gengibre','Cítrico / Ácido','Cachaça']::text[], 'caipirinha de tangerina com pimenta'),
('Caipirinha de Caju', 'Brasileiríssimos', '[{"n":"Cachaça","q":"50 ml (Prata)"},{"n":"Caju","q":"1 fruta"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Açúcar","q":"2 colheres"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere o caju fatiado com açúcar e limão no fundo da coqueteleira.\n2. Adicione cachaça e gelo, agite bem e sirva sem coar.', E'1. Macere o caju fatiado com açúcar e limão no fundo da coqueteleira.\n2. Adicione cachaça e gelo, agite bem e sirva sem coar.', 'Adstringência perfumada do caju fresco em tributo ao Nordeste.', 'Uma das frutas mais brasileiras de todas, que entrega perfume inconfundível junto da cachaça branca.', 'Copo baixo', 'Macerado + shaker', 'Fatia de caju na borda', true, array['Brasileiro','Frutado','Tropical','Cachaça']::text[], 'caipirinha de caju'),
('Caipiríssima', 'Brasileiríssimos', '[{"n":"Rum","q":"50 ml (Branco)"},{"n":"Limão","q":"1 unid (Taiti)"},{"n":"Açúcar","q":"2 colheres"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere o limão com açúcar no copo baixo.\n2. Encha com gelo, adicione rum branco e misture vigorosamente.', E'1. Macere o limão com açúcar no copo baixo.\n2. Encha com gelo, adicione rum branco e misture vigorosamente.', 'Caipirinha caribenha feita com rum branco no lugar da cachaça.', 'Popular em toda a América Latina e Caribe como irmã mais adocicada da caipirinha brasileira.', 'Copo baixo', 'Macerado', 'Rodela de limão', false, array['Clássico','Brasileiro','Cítrico / Ácido','Rum']::text[], 'caipirissima'),
('Caipisakê de Morango', 'Brasileiríssimos', '[{"n":"Saquê","q":"70 ml"},{"n":"Morango","q":"5 unid"},{"n":"Açúcar","q":"1.5 colher"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere os morangos com açúcar no copo ou coqueteleira.\n2. Adicione gelo e saquê e bata rápido para gelar.', E'1. Macere os morangos com açúcar no copo ou coqueteleira.\n2. Adicione gelo e saquê e bata rápido para gelar.', 'Leveza japonesa do saquê com morangos frescos macerados.', 'Fusão nipo-brasileira consagrada em São Paulo que combina baixa graduação alcoólica com frutas frescas.', 'Copo baixo', 'Macerado + shaker', 'Morango na borda', true, array['Brasileiro','Frutado','Doce']::text[], 'caipisake de morango'),
('Caipisakê de Kiwi', 'Brasileiríssimos', '[{"n":"Saquê","q":"70 ml"},{"n":"Kiwi","q":"1 unid"},{"n":"Açúcar","q":"1.5 colher"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere o kiwi descascado com açúcar.\n2. Adicione saquê e muito gelo, mexendo ou batendo suavemente.', E'1. Macere o kiwi descascado com açúcar.\n2. Adicione saquê e muito gelo, mexendo ou batendo suavemente.', 'Saquê gelado com acidez delicada e cor esmeralda do kiwi.', 'Clássico das cartas paulistanas de izakayas e bares de fim de tarde.', 'Copo baixo', 'Macerado', 'Fatia de kiwi', false, array['Brasileiro','Frutado','Refrescante']::text[], 'caipisake de kiwi'),
('Rabo de Galo', 'Brasileiríssimos', '[{"n":"Cachaça","q":"50 ml (Prata ou Ouro)"},{"n":"Vermute","q":"30 ml (Tinto)"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Coloque cachaça e vermute tinto em copo baixo com gelo.\n2. Mexa por 20 segundos até resfriar e integrar.', E'1. Coloque cachaça e vermute tinto em copo baixo com gelo.\n2. Mexa por 20 segundos até resfriar e integrar.', 'O ícone absoluto dos botecos brasileiros: cachaça e vermute tinto.', 'Criado em São Paulo nos anos 1950 e traduzido literalmente de “cock-tail”, hoje faz parte oficial da lista da International Bartenders Association.', 'Copo baixo', 'Mexido no copo', 'Opcional: casca de laranja', false, array['Clássico','Brasileiro','Forte','Curto','Cachaça','Vermute & Aperitivos']::text[], 'rabo de galo'),
('Macunaíma', 'Brasileiríssimos', '[{"n":"Cachaça","q":"50 ml (Prata)"},{"n":"Fernet","q":"7 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata cachaça, Fernet, limão e xarope com muito gelo por 12 segundos.\n2. Coe para copo americano gelado sem gelo (ou sobre cubo único).', E'1. Bata cachaça, Fernet, limão e xarope com muito gelo por 12 segundos.\n2. Coe para copo americano gelado sem gelo (ou sobre cubo único).', 'Cachaça, limão, açúcar e um golpe herbal de Fernet Branca.', 'Criado por Arnaldo Hirai no bar Boca de Ouro em São Paulo em 2014 — o drink autoral brasileiro mais replicado do país.', 'Copo americano / Baixo', 'Shaker', 'Sem guarnição', true, array['Clássico','Brasileiro','Amargo','Cítrico / Ácido','Cachaça']::text[], 'macunaima'),
('Jorge Amado', 'Brasileiríssimos', '[{"n":"Cachaça","q":"50 ml (Gabriela / Cravo e canela)"},{"n":"Maracujá","q":"1 fruta"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Açúcar","q":"1.5 colher"},{"n":"Canela","q":"1 pitada"},{"n":"Cravo-da-índia","q":"1 unid"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere polpa de maracujá com açúcar e limão.\n2. Adicione cachaça temperada com cravo e canela e bata forte com gelo.', E'1. Macere polpa de maracujá com açúcar e limão.\n2. Adicione cachaça temperada com cravo e canela e bata forte com gelo.', 'Maracujá com cachaça especiada de cravo e canela num abraço baiano.', 'Criado por Camila Paiva em Paraty em 2007 em homenagem ao escritor de Gabriela, Cravo e Canela.', 'Copo baixo', 'Shaker', 'Meia casca de maracujá e pau de canela', true, array['Clássico','Brasileiro','Tropical','Cachaça']::text[], 'jorge amado'),
('Caju Amigo', 'Brasileiríssimos', '[{"n":"Cachaça","q":"50 ml (Prata)"},{"n":"Suco de caju","q":"50 ml"},{"n":"Caju","q":"1 fatia"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Açúcar","q":"10 ml xarope"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata cachaça, suco de caju, limão e açúcar com muito gelo.\n2. Coe sobre gelo novo no copo baixo e sirva com um pedaço de caju para morder após o gole.', E'1. Bata cachaça, suco de caju, limão e açúcar com muito gelo.\n2. Coe sobre gelo novo no copo baixo e sirva com um pedaço de caju para morder após o gole.', 'Cachaça prata com acidez aveludada de caju fresco e limão.', 'Imortalizado nos anos 2000 no balcão do Bar Astor em São Paulo como um dos marcos da coquetelaria nacional contemporânea.', 'Copo baixo', 'Shaker', 'Caju em conserva ou fresco no palito', true, array['Clássico','Brasileiro','Frutado','Cachaça']::text[], 'caju amigo'),
('Bombeirinho', 'Brasileiríssimos', '[{"n":"Cachaça","q":"50 ml (Prata)"},{"n":"Xarope de groselha","q":"20 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata ou mexa bem cachaça prata, groselha e gotas de limão com gelo.\n2. Sirva bem gelado em copo baixo ou americano.', E'1. Bata ou mexa bem cachaça prata, groselha e gotas de limão com gelo.\n2. Sirva bem gelado em copo baixo ou americano.', 'Vermelho vivo de botequim: cachaça, groselha doce e corte de limão.', 'Clássico popular dos balcões paulistas batizado pela cor vermelha brilhante que lembra o uniforme dos bombeiros.', 'Copo americano / Baixo', 'Mexido ou shaker', 'Rodela de limão', false, array['Clássico','Brasileiro','Doce','Cachaça']::text[], 'bombeirinho'),
('Capeta', 'Brasileiríssimos', '[{"n":"Cachaça","q":"50 ml (ou Vodka)"},{"n":"Leite condensado","q":"35 ml"},{"n":"Chocolate","q":"15 g (em pó)"},{"n":"Canela","q":"1 pitada"},{"n":"Morango","q":"2 unid"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata todos os ingredientes com bastante gelo no liquidificador ou shaker até ficar cremoso.\n2. Sirva com canela polvilhada por cima.', E'1. Bata todos os ingredientes com bastante gelo no liquidificador ou shaker até ficar cremoso.\n2. Sirva com canela polvilhada por cima.', 'Cremoso, doce e especiado: patrimônio das festas e praias do Nordeste.', 'Nascido nas praias baianas e famoso nos carnavais do Brasil inteiro pela energia doce e enganosamente suave.', 'Copo alto / Taça', 'Batido', 'Canela em pó', true, array['Brasileiro','Cremoso','Doce','Cachaça']::text[], 'capeta'),
('Batida de Coco', 'Brasileiríssimos', '[{"n":"Cachaça","q":"50 ml (Prata)"},{"n":"Leite de coco","q":"50 ml"},{"n":"Leite condensado","q":"40 ml"},{"n":"Coco ralado","q":"1 colher"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata cachaça, leite de coco, leite condensado e gelo no liquidificador até ficar liso.\n2. Sirva gelado polvilhado com coco ralado.', E'1. Bata cachaça, leite de coco, leite condensado e gelo no liquidificador até ficar liso.\n2. Sirva gelado polvilhado com coco ralado.', 'A batida brasileira mais clássica: doce, tropical e aveludada.', 'Tradição das festas de rua, praias e botecos cariocas desde a metade do século XX.', 'Copo baixo / Taça', 'Batido', 'Coco ralado', true, array['Clássico','Brasileiro','Cremoso','Tropical','Cachaça']::text[], 'batida de coco'),
('Batida de Maracujá', 'Brasileiríssimos', '[{"n":"Cachaça","q":"50 ml (Prata)"},{"n":"Maracujá","q":"1 fruta"},{"n":"Leite condensado","q":"40 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata a polpa do maracujá rapidamente com cachaça, leite condensado e gelo.\n2. Coe (ou sirva com sementes) em copo bem gelado.', E'1. Bata a polpa do maracujá rapidamente com cachaça, leite condensado e gelo.\n2. Coe (ou sirva com sementes) em copo bem gelado.', 'Creme doce-azedo de maracujá fresco batido com leite condensado e cachaça.', 'Companheira inseparável das batidas de coco em quiosques de praia e churrascos pelo Brasil.', 'Copo baixo / Taça', 'Batido', 'Sementes de maracujá', true, array['Brasileiro','Cremoso','Tropical','Cachaça']::text[], 'batida de maracuja'),
('Batida de Morango', 'Brasileiríssimos', '[{"n":"Vodka","q":"50 ml"},{"n":"Morango","q":"5 unid"},{"n":"Leite condensado","q":"40 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata morangos, vodka, leite condensado e gelo até ficar homogêneo e rosado.\n2. Sirva na taça ou copo baixo.', E'1. Bata morangos, vodka, leite condensado e gelo até ficar homogêneo e rosado.\n2. Sirva na taça ou copo baixo.', 'Batida rosada e cremosa de morangos frescos com vodka.', 'Favorita absoluta das festas brasileiras pela textura suave de milkshake frutado.', 'Taça / Copo baixo', 'Batido', 'Morango na borda', true, array['Brasileiro','Cremoso','Frutado','Doce','Vodka']::text[], 'batida de morango'),
('Quentão Gelado da Serra', 'Brasileiríssimos', '[{"n":"Cachaça","q":"50 ml (Ouro)"},{"n":"Gengibre","q":"3 fatias"},{"n":"Canela","q":"1 pau"},{"n":"Cravo-da-índia","q":"2 unid"},{"n":"Laranja","q":"2 cascas"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Macere gengibre e especiarias com xarope no fundo da coqueteleira.\n2. Adicione cachaça ouro, casca de laranja e gelo e bata forte.\n3. Coe duas vezes sobre gelo grande.', E'1. Macere gengibre e especiarias com xarope no fundo da coqueteleira.\n2. Adicione cachaça ouro, casca de laranja e gelo e bata forte.\n3. Coe duas vezes sobre gelo grande.', 'Os aromas juninos de gengibre, cravo, canela e laranja servidos bem gelados.', 'Releitura de balcão que leva as especiarias acolhedoras do quentão tradicional para as noites quentes.', 'Copo baixo', 'Macerado + shaker', 'Casca de laranja e canela em pau', true, array['Autoral','Brasileiro','Picante / Gengibre','Cachaça']::text[], 'quentao gelado da serra'),
('Maria Mole', 'Brasileiríssimos', '[{"n":"Conhaque","q":"45 ml"},{"n":"Vermute","q":"45 ml (Branco)"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Despeje partes iguais de conhaque nacional (ou brandy) e vermute branco sobre gelo.\n2. Mexa suavemente até gelar.', E'1. Despeje partes iguais de conhaque nacional (ou brandy) e vermute branco sobre gelo.\n2. Mexa suavemente até gelar.', 'Clássico boêmio dos botecos antigos: conhaque e vermute branco sobre gelo.', 'Companheiro histórico do Rabo de Galo nos balcões antigos de São Paulo e Minas Gerais.', 'Copo americano / Baixo', 'Mexido no copo', 'Sem guarnição', false, array['Clássico','Brasileiro','Forte','Conhaque','Vermute & Aperitivos']::text[], 'maria mole'),
('Submarino', 'Brasileiríssimos', '[{"n":"Cerveja","q":"300 ml (Pilsen gelada)"},{"n":"Cachaça","q":"40 ml (Ouro ou Steinhaeger)"}]'::jsonb, E'1. Encha uma caneca de chopp com cerveja trincando.\n2. Encha um copo de shot com cachaça ouro, vire com cuidado e apoie emborcado no fundo da caneca.', E'1. Encha uma caneca de chopp com cerveja trincando.\n2. Encha um copo de shot com cachaça ouro, vire com cuidado e apoie emborcado no fundo da caneca.', 'Caneca de cerveja trincando com dose submersa que se mistura a cada gole.', 'Clássico dos bares alemães do Sul do Brasil e botecos tradicionais pelo ritual cênico do copinho submerso.', 'Caneca de chopp + Shot', 'Emborcado', 'Ritual no copo', false, array['Clássico','Brasileiro','Forte','Cachaça']::text[], 'submarino'),
('Cozumel', 'Brasileiríssimos', '[{"n":"Cerveja","q":"330 ml (Pilsen ou Lager)"},{"n":"Limão","q":"35 ml (Taiti)"},{"n":"Sal","q":"na borda"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Passe limão na borda de uma caneca grande e encoste no sal.\n2. Encha com gelo, suco de limão fresco e complete devagar com cerveja gelada.', E'1. Passe limão na borda de uma caneca grande e encoste no sal.\n2. Encha com gelo, suco de limão fresco e complete devagar com cerveja gelada.', 'Cerveja gelada com limão espremido, muito gelo e borda de sal.', 'Inspirado na michelada mexicana e adotado em peso pelos bares do Centro-Oeste brasileiro como o drink mais refrescante do calor.', 'Caneca / Copo alto', 'Montado na caneca', 'Borda de sal e limão', false, array['Brasileiro','Refrescante','Cítrico / Ácido','Longo']::text[], 'cozumel'),
('Lagoa Azul', 'Brasileiríssimos', '[{"n":"Vodka","q":"45 ml"},{"n":"Curaçau Blue","q":"20 ml"},{"n":"Refrigerante de limão","q":"120 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha o copo alto ou taça com gelo.\n2. Adicione vodka, Curaçau Blue e limão e complete com refrigerante de limão.', E'1. Encha o copo alto ou taça com gelo.\n2. Adicione vodka, Curaçau Blue e limão e complete com refrigerante de limão.', 'Azul elétrico vibrante de laranja curaçau, vodka e soda de limão.', 'Sucesso absoluto nas praias e formaturas brasileiras desde os anos 1990 pela cor turquesa cinematográfica.', 'Copo alto / Taça', 'Montado no copo', 'Rodela de limão e cereja', false, array['Clássico','Brasileiro','Refrescante','Doce','Vodka']::text[], 'lagoa azul'),
('Cachaça Sour', 'Brasileiríssimos', '[{"n":"Cachaça","q":"50 ml (Ouro ou Prata)"},{"n":"Limão","q":"25 ml (Taiti)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata cachaça, suco de limão e xarope de açúcar com muito gelo por 12 segundos.\n2. Coe duas vezes sobre gelo novo ou em taça coupe.', E'1. Bata cachaça, suco de limão e xarope de açúcar com muito gelo por 12 segundos.\n2. Coe duas vezes sobre gelo novo ou em taça coupe.', 'A alma da caipirinha com textura sedosa e coada da coqueteleira.', 'Mostra a versatilidade da cachaça em estrutura clássica de sour sem precisar de ingredientes importados.', 'Copo baixo / Coupe', 'Shaker', 'Rodela de limão', true, array['Brasileiro','Cítrico / Ácido','Curto','Cachaça']::text[], 'cachaca sour'),
('Negroni Brasileiro', 'Brasileiríssimos', '[{"n":"Cachaça","q":"30 ml (Ouro)"},{"n":"Campari","q":"30 ml"},{"n":"Vermute","q":"30 ml (Tinto)"},{"n":"Laranja","q":"1 casca"},{"n":"Gelo","q":"1 cubo grande"}]'::jsonb, E'1. Mexa cachaça ouro, Campari e vermute tinto em mixing glass com gelo.\n2. Coe sobre pedra grande de gelo e perfume com casca de laranja.', E'1. Mexa cachaça ouro, Campari e vermute tinto em mixing glass com gelo.\n2. Coe sobre pedra grande de gelo e perfume com casca de laranja.', 'O clássico italiano com cachaça envelhecida trazendo baunilha e madeira.', 'Releitura nacional já presente nas cartas premiadas do país inteiro, celebrando o encontro da cana envelhecida com o bitter italiano.', 'Old fashioned', 'Mexido', 'Casca de laranja', false, array['Brasileiro','Amargo','Forte','Curto','Cachaça']::text[], 'negroni brasileiro'),
('Bossa Nova', 'Brasileiríssimos', '[{"n":"Cachaça","q":"30 ml (Ouro)"},{"n":"Rum","q":"20 ml (Branco)"},{"n":"Maracujá","q":"1 fruta"},{"n":"Suco de abacaxi","q":"45 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata cachaça, rum, polpa de maracujá, suco de abacaxi, limão e xarope com gelo.\n2. Coe sobre gelo em copo alto ou taça.', E'1. Bata cachaça, rum, polpa de maracujá, suco de abacaxi, limão e xarope com gelo.\n2. Coe sobre gelo em copo alto ou taça.', 'Sinfonia tropical carioca de cachaça ouro, rum, maracujá e abacaxi.', 'Criado para homenagear a cadência suave e luminosa do Rio de Janeiro dos anos 1960.', 'Taça Hurricane / Copo alto', 'Shaker', 'Folha de abacaxi e hortelã', true, array['Brasileiro','Tropical','Frutado','Cachaça','Rum']::text[], 'bossa nova'),
('Mai Tai', 'Tiki & Tropicais', '[{"n":"Rum","q":"60 ml (Escuro e Branco)"},{"n":"Cointreau","q":"15 ml"},{"n":"Orgeat","q":"15 ml"},{"n":"Limão","q":"25 ml (Taiti)"},{"n":"Hortelã","q":"1 ramo"},{"n":"Gelo","q":"triturado"}]'::jsonb, E'1. Bata rum, Cointreau, orgeat e limão com gelo.\n2. Coe sobre copo baixo lotado de gelo triturado.\n3. Decore com meia casca de limão invertida e ramo farto de hortelã.', E'1. Bata rum, Cointreau, orgeat e limão com gelo.\n2. Coe sobre copo baixo lotado de gelo triturado.\n3. Decore com meia casca de limão invertida e ramo farto de hortelã.', 'O ícone máximo da cultura Tiki: rum complexo, laranja, limão e amêndoa orgeat.', 'Criado por Trader Vic em 1944 na Califórnia; ao provar, amigos taitianos exclamaram “Maita’i roa ae!” — “fora deste mundo!”.', 'Copo baixo', 'Shaker', 'Meia casca de limão e hortelã', true, array['Clássico','Tropical','Forte','Rum']::text[], 'mai tai'),
('Piña Colada', 'Tiki & Tropicais', '[{"n":"Rum","q":"50 ml (Branco)"},{"n":"Suco de abacaxi","q":"90 ml"},{"n":"Leite de coco","q":"40 ml"},{"n":"Creme de leite","q":"20 ml"},{"n":"Abacaxi","q":"1 fatia"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata rum, suco de abacaxi, leite de coco, creme e gelo no liquidificador ou shaker forte.\n2. Sirva em taça hurricane e decore com abacaxi.', E'1. Bata rum, suco de abacaxi, leite de coco, creme e gelo no liquidificador ou shaker forte.\n2. Sirva em taça hurricane e decore com abacaxi.', 'Cremosidade tropical porto-riquenha de rum, abacaxi doce e coco.', 'Drink oficial de Porto Rico desde os anos 1950 e símbolo eterno das férias à beira-mar.', 'Taça Hurricane', 'Batido', 'Fatia de abacaxi e cereja', true, array['Clássico','Tropical','Cremoso','Doce','Rum']::text[], 'pina colada'),
('Zombie', 'Tiki & Tropicais', '[{"n":"Rum","q":"60 ml (Branco e Escuro)"},{"n":"Falernum","q":"15 ml"},{"n":"Suco de grapefruit","q":"30 ml"},{"n":"Xarope de canela","q":"15 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Grenadine","q":"10 ml"},{"n":"Absinto","q":"1 dash"},{"n":"Angostura","q":"1 dash"},{"n":"Hortelã","q":"1 ramo"},{"n":"Gelo","q":"triturado"}]'::jsonb, E'1. Bata todos os ingredientes com bastante gelo.\n2. Coe para copo alto cheio de gelo triturado e decore com hortelã.', E'1. Bata todos os ingredientes com bastante gelo.\n2. Coe para copo alto cheio de gelo triturado e decore com hortelã.', 'Lendário elixir tiki especiado de múltiplos runs, canela, grapefruit e absinto.', 'Inventado em 1934 por Donn Beach em Hollywood para curar um cliente com ressaca — que depois disse ter virado um zumbi.', 'Copo Tiki / Alto', 'Shaker', 'Hortelã e cereja', true, array['Clássico','Tropical','Forte','Rum']::text[], 'zombie'),
('Jungle Bird', 'Tiki & Tropicais', '[{"n":"Rum","q":"45 ml (Escuro)"},{"n":"Campari","q":"20 ml"},{"n":"Suco de abacaxi","q":"45 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Abacaxi","q":"1 folha"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata rum escuro, Campari, suco de abacaxi, limão e xarope com gelo.\n2. Coe sobre gelo grande em copo baixo.', E'1. Bata rum escuro, Campari, suco de abacaxi, limão e xarope com gelo.\n2. Coe sobre gelo grande em copo baixo.', 'Tropical agridoce inconfundível unindo abacaxi espumoso e amargor de Campari.', 'Criado em 1978 no Aviary Bar do Hilton de Kuala Lumpur na Malásia, resgatado pela coquetelaria moderna como obra-prima Tiki.', 'Copo baixo', 'Shaker', 'Folha e pedaço de abacaxi', true, array['Clássico','Tropical','Amargo','Rum']::text[], 'jungle bird'),
('Painkiller', 'Tiki & Tropicais', '[{"n":"Rum","q":"60 ml (Escuro)"},{"n":"Suco de abacaxi","q":"100 ml"},{"n":"Suco de laranja","q":"30 ml"},{"n":"Creme de coco","q":"30 ml"},{"n":"Noz-moscada","q":"1 pitada"},{"n":"Abacaxi","q":"1 fatia"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata rum escuro, sucos de abacaxi e laranja e creme de coco com muito gelo.\n2. Sirva em copo cheio de gelo e rale noz-moscada fresca por cima.', E'1. Bata rum escuro, sucos de abacaxi e laranja e creme de coco com muito gelo.\n2. Sirva em copo cheio de gelo e rale noz-moscada fresca por cima.', 'Coco cremoso, abacaxi, laranja e noz-moscada ralada na hora.', 'Nascido nos anos 1970 no Soggy Dollar Bar nas Ilhas Virgens Britânicas, onde os clientes literalmente nadavam até o bar.', 'Copo alto / Caneca', 'Shaker', 'Fatia de abacaxi e noz-moscada', true, array['Clássico','Tropical','Cremoso','Doce','Rum']::text[], 'painkiller'),
('Hurricane', 'Tiki & Tropicais', '[{"n":"Rum","q":"60 ml (Escuro e Branco)"},{"n":"Maracujá","q":"1 fruta"},{"n":"Suco de laranja","q":"30 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Grenadine","q":"10 ml"},{"n":"Laranja","q":"1 rodela"},{"n":"Cereja","q":"1 unid"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata todos os ingredientes com bastante gelo.\n2. Coe em taça hurricane com gelo novo e decore com laranja e cereja.', E'1. Bata todos os ingredientes com bastante gelo.\n2. Coe em taça hurricane com gelo novo e decore com laranja e cereja.', 'Clássico rubi de Nova Orleans com rum, maracujá intenso e cítricos.', 'Criado por Pat O’Brien em Nova Orleans nos anos 1940 quando precisou escoar grandes lotes de rum durante a escassez de whisky.', 'Taça Hurricane', 'Shaker', 'Rodela de laranja e cereja', true, array['Clássico','Tropical','Frutado','Longo','Rum']::text[], 'hurricane'),
('Planter''s Punch', 'Tiki & Tropicais', '[{"n":"Rum","q":"60 ml (Escuro)"},{"n":"Suco de laranja","q":"45 ml"},{"n":"Suco de abacaxi","q":"45 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Grenadine","q":"15 ml"},{"n":"Angostura","q":"2 dashes"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata todos os ingredientes com muito gelo.\n2. Coe para copo alto com gelo fresco e finalize com Angostura e hortelã.', E'1. Bata todos os ingredientes com muito gelo.\n2. Coe para copo alto com gelo fresco e finalize com Angostura e hortelã.', 'Ponche jamaicano frutado e aromático de rum escuro e especiarias.', 'Registrado em 1878 na revista Punch de Londres seguindo a rima tradicional do Caribe: um de azedo, dois de doce, três de forte e quatro de fraco.', 'Copo alto', 'Shaker', 'Laranja, cereja e hortelã', true, array['Clássico','Tropical','Frutado','Rum']::text[], 'planter''s punch'),
('Blue Hawaiian', 'Tiki & Tropicais', '[{"n":"Rum","q":"45 ml (Branco)"},{"n":"Curaçau Blue","q":"20 ml"},{"n":"Suco de abacaxi","q":"80 ml"},{"n":"Creme de coco","q":"30 ml"},{"n":"Abacaxi","q":"1 fatia"},{"n":"Cereja","q":"1 unid"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata rum, Curaçau Blue, suco de abacaxi e creme de coco com gelo.\n2. Sirva em taça hurricane azul-turquesa com abacaxi.', E'1. Bata rum, Curaçau Blue, suco de abacaxi e creme de coco com gelo.\n2. Sirva em taça hurricane azul-turquesa com abacaxi.', 'Piña Colada azul-turquesa com toque cítrico de Curaçau Blue.', 'Criado em 1957 em Waikiki, Havaí, por Harry Yee no Hilton Hawaiian Village — ícone visual da era de ouro havaiana.', 'Taça Hurricane', 'Batido / Shaker', 'Fatia de abacaxi e cereja', true, array['Clássico','Tropical','Cremoso','Doce','Rum']::text[], 'blue hawaiian'),
('Bahama Mama', 'Tiki & Tropicais', '[{"n":"Rum","q":"30 ml (Dourado)"},{"n":"Licor de coco","q":"20 ml"},{"n":"Licor de café","q":"15 ml"},{"n":"Suco de abacaxi","q":"60 ml"},{"n":"Suco de laranja","q":"45 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Grenadine","q":"10 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata os runs/licores e sucos com gelo.\n2. Sirva em taça hurricane e finalize com grenadine.', E'1. Bata os runs/licores e sucos com gelo.\n2. Sirva em taça hurricane e finalize com grenadine.', 'Mistura caribenha rica de coco, abacaxi, laranja e toque surpreendente de café.', 'Famoso nos resorts das Bahamas desde os anos 1960 como o drink tropical com personalidade achocolatada de fundo.', 'Taça Hurricane', 'Shaker', 'Abacaxi e cereja', true, array['Clássico','Tropical','Frutado','Doce','Rum']::text[], 'bahama mama'),
('Singapore Sling', 'Tiki & Tropicais', '[{"n":"Gin","q":"30 ml"},{"n":"Cherry Brandy","q":"15 ml"},{"n":"Cointreau","q":"7 ml"},{"n":"Bénédictine","q":"7 ml"},{"n":"Suco de abacaxi","q":"90 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Grenadine","q":"10 ml"},{"n":"Angostura","q":"1 dash"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata todos os ingredientes com gelo até formar leve espuma de abacaxi.\n2. Coe em copo alto com gelo fresco.', E'1. Bata todos os ingredientes com gelo até formar leve espuma de abacaxi.\n2. Coe em copo alto com gelo fresco.', 'O lendário drink rosado de Singapura com gin, cereja, ervas e abacaxi.', 'Criado por volta de 1915 por Ngiam Tong Boon no Long Bar do Raffles Hotel em Singapura como um clássico de salão elegante.', 'Copo alto / Hurricane', 'Shaker', 'Fatia de abacaxi e cereja', true, array['Clássico','Tropical','Frutado','Longo','Gin']::text[], 'singapore sling'),
('Saturn', 'Tiki & Tropicais', '[{"n":"Gin","q":"45 ml"},{"n":"Limão","q":"20 ml (Siciliano)"},{"n":"Xarope de maracujá","q":"15 ml"},{"n":"Orgeat","q":"10 ml"},{"n":"Falernum","q":"10 ml"},{"n":"Gelo","q":"triturado"}]'::jsonb, E'1. Bata gin, limão siciliano, maracujá, orgeat e falernum com gelo.\n2. Sirva em taça coupe ou copo baixo com gelo picado.', E'1. Bata gin, limão siciliano, maracujá, orgeat e falernum com gelo.\n2. Sirva em taça coupe ou copo baixo com gelo picado.', 'Raro clássico Tiki à base de gin com maracujá, amêndoa orgeat e especiarias.', 'Vencedor do campeonato mundial da IBA em 1967 nas mãos do californiano Popo Galsini, batizado em plena corrida espacial.', 'Taça Coupe / Copo baixo', 'Shaker', 'Espiral de limão com cereja (planeta e anel)', true, array['Clássico','Tropical','Cítrico / Ácido','Gin']::text[], 'saturn'),
('Chartreuse Swizzle', 'Tiki & Tropicais', '[{"n":"Chartreuse","q":"45 ml (Verde)"},{"n":"Suco de abacaxi","q":"30 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Falernum","q":"15 ml"},{"n":"Hortelã","q":"1 ramo"},{"n":"Noz-moscada","q":"1 pitada"},{"n":"Gelo","q":"triturado"}]'::jsonb, E'1. Coloque todos os ingredientes em copo alto com gelo triturado.\n2. Gire vigorosamente com colher bailarina (swizzle) até o copo gelar por fora.\n3. Decore com hortelã e noz-moscada.', E'1. Coloque todos os ingredientes em copo alto com gelo triturado.\n2. Gire vigorosamente com colher bailarina (swizzle) até o copo gelar por fora.\n3. Decore com hortelã e noz-moscada.', 'Verde vibrante e herbáceo: 130 ervas do Chartreuse domadas por abacaxi e limão.', 'Criado por Marco Dionysos em 2002 em São Francisco (Smuggler’s Cove canon), considerado um milagre de equilíbrio Tiki moderno.', 'Copo alto', 'Swizzle em gelo picado', 'Hortelã e noz-moscada', false, array['Clássico','Tropical','Herbal / Hortelã','Forte']::text[], 'chartreuse swizzle'),
('Navy Grog', 'Tiki & Tropicais', '[{"n":"Rum","q":"60 ml (Escuro e Dourado)"},{"n":"Suco de grapefruit","q":"25 ml"},{"n":"Limão","q":"25 ml (Taiti)"},{"n":"Mel","q":"20 ml (diluído)"},{"n":"Gelo","q":"triturado"}]'::jsonb, E'1. Bata os runs com suco de grapefruit, limão e xarope de mel com gelo.\n2. Sirva em copo baixo cheio de gelo triturado.', E'1. Bata os runs com suco de grapefruit, limão e xarope de mel com gelo.\n2. Sirva em copo baixo cheio de gelo triturado.', 'Potência naval de runs envelhecidos com mel e acidez seca de grapefruit.', 'Inspirado na ração diária de rum da Marinha Real Britânica e elevado à perfeição por Donn Beach nos anos 1940.', 'Copo baixo', 'Shaker', 'Hortelã e casca de limão', true, array['Clássico','Tropical','Forte','Rum']::text[], 'navy grog'),
('Suffering Bastard', 'Tiki & Tropicais', '[{"n":"Gin","q":"30 ml"},{"n":"Conhaque","q":"30 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Ginger beer","q":"90 ml"},{"n":"Angostura","q":"2 dashes"},{"n":"Hortelã","q":"1 ramo"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata gin, conhaque, limão e Angostura com gelo.\n2. Coe em copo alto com gelo novo e complete com ginger beer.', E'1. Bata gin, conhaque, limão e Angostura com gelo.\n2. Coe em copo alto com gelo novo e complete com ginger beer.', 'Gin + conhaque com gengibre picante e hortelã — cura clássica de ressaca.', 'Criado em 1942 por Joe Scialom no Shepheard’s Hotel no Cairo para aliviar as tropas aliadas durante a Segunda Guerra.', 'Copo alto', 'Shaker + build', 'Ramo de hortelã e laranja', true, array['Clássico','Picante / Gengibre','Forte','Gin','Conhaque']::text[], 'suffering bastard'),
('Queen''s Park Swizzle', 'Tiki & Tropicais', '[{"n":"Rum","q":"60 ml (Dourado)"},{"n":"Hortelã","q":"12 folhas"},{"n":"Limão","q":"25 ml (Taiti)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Angostura","q":"4 dashes"},{"n":"Gelo","q":"triturado"}]'::jsonb, E'1. Coloque hortelã, xarope, limão e rum em copo alto com gelo triturado.\n2. Faça o swizzle até formar geada no copo e coroe com 4 dashes generosos de Angostura.', E'1. Coloque hortelã, xarope, limão e rum em copo alto com gelo triturado.\n2. Faça o swizzle até formar geada no copo e coroe com 4 dashes generosos de Angostura.', 'O “Mojito de Trinidad” com rum envelhecido, gelo picado e topo vermelho de Angostura.', 'Nascido nos anos 1920 no Queen’s Park Hotel em Port of Spain, Trinidad e Tobago — berço da própria Angostura.', 'Copo alto', 'Swizzle', 'Buquê de hortelã e camada de Angostura', false, array['Clássico','Herbal / Hortelã','Refrescante','Rum']::text[], 'queen''s park swizzle'),
('Three Dots and a Dash', 'Tiki & Tropicais', '[{"n":"Rum","q":"60 ml (Envelhecido)"},{"n":"Falernum","q":"15 ml"},{"n":"Mel","q":"15 ml"},{"n":"Suco de laranja","q":"15 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Angostura","q":"1 dash"},{"n":"Cereja","q":"3 unid"},{"n":"Gelo","q":"triturado"}]'::jsonb, E'1. Bata todos os ingredientes líquidos com muito gelo.\n2. Coe sobre gelo triturado e decore com 3 cerejas e 1 pedaço de abacaxi (código Morse da vitória).', E'1. Bata todos os ingredientes líquidos com muito gelo.\n2. Coe sobre gelo triturado e decore com 3 cerejas e 1 pedaço de abacaxi (código Morse da vitória).', 'Rum agrícola e envelhecido com mel, falernum e especiarias quentes.', 'Criado por Donn Beach nos anos 1940: o nome representa a letra “V” de Vitória em código Morse (...-).', 'Copo alto / Tiki', 'Shaker', '3 cerejas + 1 tira de abacaxi', true, array['Clássico','Tropical','Forte','Rum']::text[], 'three dots and a dash'),
('Canchánchara', 'Tiki & Tropicais', '[{"n":"Rum","q":"60 ml (Branco ou Aguardente)"},{"n":"Mel","q":"20 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Dilua o mel no fundo do copo com o suco de limão e um fio de água.\n2. Adicione gelo e rum e mexa bem.', E'1. Dilua o mel no fundo do copo com o suco de limão e um fio de água.\n2. Adicione gelo e rum e mexa bem.', 'Ancestral cubano do Daiquiri feito com mel de abelha, limão e rum.', 'Bebida dos guerreiros mambises durante as guerras de independência de Cuba no século XIX — hoje coquetel oficial da IBA.', 'Copo baixo', 'Mexido no copo', 'Rodela de limão', false, array['Clássico','Cítrico / Ácido','Rum']::text[], 'canchanchara'),
('Ti'' Punch', 'Tiki & Tropicais', '[{"n":"Rum","q":"50 ml (Agrícola ou Cachaça)"},{"n":"Xarope de açúcar","q":"10 ml"},{"n":"Limão","q":"1 moeda de casca com polpa (Taiti)"}]'::jsonb, E'1. Esprema a moeda de limão no copo baixo com xarope de cana.\n2. Adicione o rum e mexa (tradicionalmente com pouco ou nenhum gelo).', E'1. Esprema a moeda de limão no copo baixo com xarope de cana.\n2. Adicione o rum e mexa (tradicionalmente com pouco ou nenhum gelo).', 'Puro, direto e aromático: o drink nacional das Antilhas Francesas.', 'Na Martinica e Guadalupe o ritual é “Chacun prépare sa propre mort” — cada convidado ajusta o próprio equilíbrio de cana e limão.', 'Copo baixo', 'Montado no copo', 'Moeda de limão', false, array['Clássico','Forte','Curto','Rum']::text[], 'ti'' punch'),
('El Presidente', 'Tiki & Tropicais', '[{"n":"Rum","q":"45 ml (Branco ou Dourado)"},{"n":"Vermute","q":"25 ml (Branco/Seco)"},{"n":"Cointreau","q":"15 ml"},{"n":"Grenadine","q":"5 ml"},{"n":"Laranja","q":"1 casca"},{"n":"Gelo","q":"para mexer"}]'::jsonb, E'1. Mexa todos os ingredientes em mixing glass com gelo por 25 segundos.\n2. Coe para taça coupe gelada e perfume com casca de laranja.', E'1. Mexa todos os ingredientes em mixing glass com gelo por 25 segundos.\n2. Coe para taça coupe gelada e perfume com casca de laranja.', 'O Manhattan aristocrático de Havana: rum, vermute, laranja e toque rubi de grenadine.', 'Criado em Havana nos anos 1910-20 em homenagem ao presidente cubano Mario García Menocal.', 'Taça Coupe', 'Mexido', 'Casca de laranja e cereja', false, array['Clássico','Forte','Curto','Rum']::text[], 'el presidente'),
('Mary Pickford', 'Tiki & Tropicais', '[{"n":"Rum","q":"50 ml (Branco)"},{"n":"Suco de abacaxi","q":"45 ml"},{"n":"Maraschino","q":"7 ml"},{"n":"Grenadine","q":"7 ml"},{"n":"Cereja","q":"1 unid"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata rum branco, suco de abacaxi fresco, Maraschino e grenadine com gelo.\n2. Coe para taça coupe gelada.', E'1. Bata rum branco, suco de abacaxi fresco, Maraschino e grenadine com gelo.\n2. Coe para taça coupe gelada.', 'Rosado delicado de rum branco, abacaxi e cereja maraschino.', 'Criado em Havana nos anos 1920 para a estrela do cinema mudo Mary Pickford durante filmagens em Cuba.', 'Taça Coupe', 'Shaker', 'Cereja', true, array['Clássico','Tropical','Frutado','Rum']::text[], 'mary pickford'),
('Hotel Nacional Special', 'Tiki & Tropicais', '[{"n":"Rum","q":"45 ml (Dourado)"},{"n":"Apricot Brandy","q":"15 ml"},{"n":"Suco de abacaxi","q":"30 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Xarope de açúcar","q":"10 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata rum, licor de damasco, suco de abacaxi, limão e xarope com gelo.\n2. Coe para taça coupe gelada.', E'1. Bata rum, licor de damasco, suco de abacaxi, limão e xarope com gelo.\n2. Coe para taça coupe gelada.', 'Rum cubano dourado com notas frutadas de damasco, abacaxi e limão.', 'Clássico da era dourada do lendário Hotel Nacional de Cuba em 1930, assinado por Wil Taylor.', 'Taça Coupe', 'Shaker', 'Fatia de abacaxi ou limão', true, array['Clássico','Tropical','Frutado','Rum']::text[], 'hotel nacional special'),
('Pineapple Express', 'Tiki & Tropicais', '[{"n":"Rum","q":"50 ml (Branco)"},{"n":"Abacaxi","q":"70 g"},{"n":"Xarope de gengibre","q":"15 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Hortelã","q":"6 folhas"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Macere o abacaxi com a hortelã no fundo do shaker.\n2. Adicione rum, gengibre e limão e bata forte com gelo.\n3. Coe sobre gelo novo.', E'1. Macere o abacaxi com a hortelã no fundo do shaker.\n2. Adicione rum, gengibre e limão e bata forte com gelo.\n3. Coe sobre gelo novo.', 'Abacaxi fresco macerado com rum, gengibre picante e hortelã.', 'Queridinho de bares tropicais modernos por unir frutas frescas de feira ao vigor picante do gengibre.', 'Copo baixo / Tiki', 'Macerado + shaker', 'Folha de abacaxi e hortelã', true, array['Tropical','Picante / Gengibre','Refrescante','Rum']::text[], 'pineapple express'),
('Vulcão de Maracujá', 'Tiki & Tropicais', '[{"n":"Rum","q":"40 ml (Branco)"},{"n":"Cachaça","q":"20 ml (Ouro)"},{"n":"Maracujá","q":"1 fruta"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Gelo","q":"triturado"}]'::jsonb, E'1. Bata rum, cachaça ouro, polpa de maracujá, limão e xarope com gelo.\n2. Coe sobre gelo triturado em copo tiki e decore com casca de limão.', E'1. Bata rum, cachaça ouro, polpa de maracujá, limão e xarope com gelo.\n2. Coe sobre gelo triturado em copo tiki e decore com casca de limão.', 'Casamento potente de rum e cachaça ouro em erupção de maracujá.', 'Criação tropical brasileira inspirada nos rituais Tiki de fogo e frutas ácidas da casa.', 'Copo Tiki / Baixo', 'Shaker', 'Casca de limão e maracujá', true, array['Autoral','Tropical','Forte','Rum','Cachaça']::text[], 'vulcao de maracuja'),
('Zumbi Carioca', 'Tiki & Tropicais', '[{"n":"Rum","q":"30 ml (Branco)"},{"n":"Cachaça","q":"20 ml (Ouro)"},{"n":"Conhaque","q":"20 ml"},{"n":"Abacaxi","q":"50 g"},{"n":"Xarope de groselha","q":"15 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Hortelã","q":"6 folhas"},{"n":"Canela","q":"1 pitada"},{"n":"Gelo","q":"triturado"}]'::jsonb, E'1. Macere o abacaxi na coqueteleira.\n2. Adicione rum, cachaça, conhaque, groselha e limão e bata com gelo.\n3. Coe sobre gelo triturado e finalize com hortelã e canela.', E'1. Macere o abacaxi na coqueteleira.\n2. Adicione rum, cachaça, conhaque, groselha e limão e bata com gelo.\n3. Coe sobre gelo triturado e finalize com hortelã e canela.', 'Três destilados em versão brasileira do clássico Zombie, frutado e especiado.', 'Releitura tropical de alma carioca que substitui ingredientes raros por cachaça ouro, conhaque e abacaxi fresco.', 'Copo Tiki / Alto', 'Macerado + shaker', 'Hortelã e pitada de canela', true, array['Autoral','Brasileiro','Tropical','Forte','Rum','Cachaça']::text[], 'zumbi carioca'),
('Naufrágio', 'Tiki & Tropicais', '[{"n":"Rum","q":"50 ml (Branco)"},{"n":"Abacaxi","q":"70 g"},{"n":"Xarope de groselha","q":"15 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Gelo","q":"triturado"}]'::jsonb, E'1. Macere o abacaxi no shaker.\n2. Adicione rum, groselha, limão e xarope e bata com gelo.\n3. Sirva sobre gelo triturado.', E'1. Macere o abacaxi no shaker.\n2. Adicione rum, groselha, limão e xarope e bata com gelo.\n3. Sirva sobre gelo triturado.', 'Abacaxi tropical tingido de rubi com groselha e rum sobre gelo picado.', 'Criado para ter visual de pôr do sol em alto-mar usando ingredientes diretos do balcão brasileiro.', 'Copo Tiki / Baixo', 'Shaker', 'Folha de abacaxi', true, array['Autoral','Tropical','Frutado','Rum']::text[], 'naufragio'),
('Pirata do Abacaxi', 'Tiki & Tropicais', '[{"n":"Rum","q":"50 ml (Branco)"},{"n":"Abacaxi","q":"80 g (grelhado ou fresco)"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Doure rapidamente o abacaxi (ou macere fresco) no fundo do shaker.\n2. Adicione rum, xarope e limão, bata forte com gelo e coe sobre cubo grande.', E'1. Doure rapidamente o abacaxi (ou macere fresco) no fundo do shaker.\n2. Adicione rum, xarope e limão, bata forte com gelo e coe sobre cubo grande.', 'Doçura caramelizada do abacaxi com rum branco e toque de limão.', 'Receita tiki enxuta que extrai o máximo sabor da fruta caramelizada na coqueteleira.', 'Copo baixo', 'Macerado + shaker', 'Fatia de abacaxi grelhado', true, array['Autoral','Tropical','Frutado','Rum']::text[], 'pirata do abacaxi'),
('Hurricane Rosa', 'Tiki & Tropicais', '[{"n":"Rum","q":"45 ml (Branco)"},{"n":"Maracujá","q":"1 fruta"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Xarope de groselha","q":"20 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata rum, polpa de maracujá, limão e xarope de groselha com bastante gelo.\n2. Coe em taça hurricane com gelo novo.', E'1. Bata rum, polpa de maracujá, limão e xarope de groselha com bastante gelo.\n2. Coe em taça hurricane com gelo novo.', 'Versão rosada e vibrante do clássico de Nova Orleans com maracujá fresco.', 'Adaptação tropical com cor intensa e acidez envolvente pronta para o estoque de casa.', 'Taça Hurricane', 'Shaker', 'Cereja e casca de maracujá', true, array['Autoral','Tropical','Doce','Frutado','Rum']::text[], 'hurricane rosa'),
('Scorpion', 'Tiki & Tropicais', '[{"n":"Rum","q":"45 ml (Branco)"},{"n":"Conhaque","q":"20 ml"},{"n":"Suco de laranja","q":"50 ml"},{"n":"Limão","q":"25 ml (Taiti)"},{"n":"Orgeat","q":"15 ml"},{"n":"Gelo","q":"triturado"}]'::jsonb, E'1. Bata rum, conhaque, sucos de laranja e limão e orgeat com muito gelo.\n2. Coe para copo alto cheio de gelo picado.', E'1. Bata rum, conhaque, sucos de laranja e limão e orgeat com muito gelo.\n2. Coe para copo alto cheio de gelo picado.', 'Clássico tiki de Trader Vic com rum, conhaque, laranja e amêndoa orgeat.', 'Nascido no Havaí nos anos 1940 e famoso tanto em doses individuais quanto em grandes tigelas compartilhadas.', 'Copo alto / Tiki', 'Shaker', 'Hortelã e flor ou rodela de laranja', true, array['Clássico','Tropical','Forte','Rum','Conhaque']::text[], 'scorpion'),
('Paloma', 'Cítricos', '[{"n":"Tequila","q":"50 ml (Prata ou Reposado)"},{"n":"Suco de grapefruit","q":"90 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Água com gás","q":"45 ml"},{"n":"Sal","q":"na borda"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Passe sal em meia borda de um copo alto e encha com gelo.\n2. Despeje tequila, suco de grapefruit e limão.\n3. Complete com água com gás e mexa uma vez.', E'1. Passe sal em meia borda de um copo alto e encha com gelo.\n2. Despeje tequila, suco de grapefruit e limão.\n3. Complete com água com gás e mexa uma vez.', 'Mais popular no México que a Margarita: tequila, toranja e borda de sal.', 'Nascida em Jalisco por volta dos anos 1950 e atribuída ao lendário Don Javier Delgado Corona no bar La Capilla em Tequila.', 'Copo alto', 'Montado no copo', 'Borda de sal e gomo de grapefruit', false, array['Clássico','Cítrico / Ácido','Refrescante','Longo','Tequila']::text[], 'paloma'),
('El Diablo', 'Cítricos', '[{"n":"Tequila","q":"45 ml (Reposado)"},{"n":"Licor de cassis","q":"15 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Ginger beer","q":"90 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata tequila, licor de cassis e limão com gelo.\n2. Coe em copo alto com gelo fresco e complete com ginger beer.', E'1. Bata tequila, licor de cassis e limão com gelo.\n2. Coe em copo alto com gelo fresco e complete com ginger beer.', 'Tequila reposado com cassis rubi, limão e picância de ginger beer.', 'Registrado por Trader Vic em 1946 no Book of Food and Drink como “Mexican El Diablo”, um casamento surpreendente de agave e cassis.', 'Copo alto', 'Shaker + build', 'Amora ou gomo de limão', true, array['Clássico','Picante / Gengibre','Frutado','Tequila']::text[], 'el diablo'),
('Mexican Mule', 'Refrescantes', '[{"n":"Tequila","q":"50 ml (Prata)"},{"n":"Xarope de gengibre","q":"20 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Água com gás","q":"90 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha a caneca ou copo alto com gelo.\n2. Despeje tequila, limão e xarope de gengibre e complete com água com gás.', E'1. Encha a caneca ou copo alto com gelo.\n2. Despeje tequila, limão e xarope de gengibre e complete com água com gás.', 'O Moscow Mule trocando a vodka pela energia terrosa da tequila.', 'Adaptação contemporânea presente em quase todo bar mexicano moderno pela combinação natural entre agave e gengibre.', 'Caneca de cobre', 'Montado na caneca', 'Rodela de limão e hortelã', false, array['Clássico','Picante / Gengibre','Refrescante','Tequila']::text[], 'mexican mule'),
('Oaxaca Old Fashioned', 'Fortes', '[{"n":"Tequila","q":"45 ml (Reposado)"},{"n":"Mezcal","q":"15 ml"},{"n":"Mel","q":"10 ml (ou agave)"},{"n":"Angostura","q":"2 dashes"},{"n":"Laranja","q":"1 casca"},{"n":"Gelo","q":"1 cubo grande"}]'::jsonb, E'1. Mexa tequila reposado, mezcal espadín, mel de agave e Angostura com gelo.\n2. Coe sobre pedra grande de gelo e perfume com casca de laranja.', E'1. Mexa tequila reposado, mezcal espadín, mel de agave e Angostura com gelo.\n2. Coe sobre pedra grande de gelo e perfume com casca de laranja.', 'Old Fashioned defumado unindo tequila reposado e mezcal artesanal.', 'Criado por Phil Ward em 2007 no Death & Co de Nova York — o drink que apresentou o mezcal à coquetelaria mundial.', 'Old fashioned', 'Mexido', 'Casca de laranja flambada', false, array['Clássico','Forte','Curto','Tequila']::text[], 'oaxaca old fashioned'),
('Naked and Famous', 'Cítricos', '[{"n":"Mezcal","q":"22 ml"},{"n":"Chartreuse","q":"22 ml (Amarelo)"},{"n":"Aperol","q":"22 ml"},{"n":"Limão","q":"22 ml (Taiti)"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata os quatro ingredientes em partes iguais com bastante gelo.\n2. Coe duas vezes para taça coupe gelada.', E'1. Bata os quatro ingredientes em partes iguais com bastante gelo.\n2. Coe duas vezes para taça coupe gelada.', 'Fumaça de mezcal, ervas do Chartreuse amarelo, Aperol e limão em partes iguais.', 'Criado por Joaquín Simó em 2011 no Death & Co como filho direto do Paper Plane e do Last Word.', 'Taça Coupe', 'Shaker', 'Sem guarnição ou casca de limão', true, array['Clássico','Amargo','Cítrico / Ácido','Forte']::text[], 'naked and famous'),
('Division Bell', 'Cítricos', '[{"n":"Mezcal","q":"30 ml"},{"n":"Aperol","q":"22 ml"},{"n":"Maraschino","q":"15 ml"},{"n":"Limão","q":"22 ml (Taiti)"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata mezcal, Aperol, Maraschino e suco de limão fresco com gelo.\n2. Coe duas vezes para taça coupe gelada e perfume com grapefruit ou limão.', E'1. Bata mezcal, Aperol, Maraschino e suco de limão fresco com gelo.\n2. Coe duas vezes para taça coupe gelada e perfume com grapefruit ou limão.', 'Mezcal defumado abraçado por Aperol e cereja seca de Maraschino.', 'Criado por Phil Ward no Mayahuel de Nova York por volta de 2009, batizado em homenagem ao álbum do Pink Floyd.', 'Taça Coupe', 'Shaker', 'Twist de grapefruit ou limão', true, array['Clássico','Amargo','Cítrico / Ácido']::text[], 'division bell'),
('Matador', 'Cítricos', '[{"n":"Tequila","q":"50 ml (Prata)"},{"n":"Suco de abacaxi","q":"60 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata tequila, suco de abacaxi e limão fresco vigorosamente com gelo.\n2. Coe para taça coupe ou copo baixo com gelo.', E'1. Bata tequila, suco de abacaxi e limão fresco vigorosamente com gelo.\n2. Coe para taça coupe ou copo baixo com gelo.', 'A resposta mexicana ao Daiquiri: tequila, abacaxi fresco e limão.', 'Registrado em manuais dos anos 1940-50 como um dos clássicos tropicais mais simples e certeiros de tequila.', 'Taça Coupe / Copo baixo', 'Shaker', 'Fatia de abacaxi ou limão', true, array['Clássico','Tropical','Cítrico / Ácido','Tequila']::text[], 'matador'),
('Watermelon Margarita', 'Doces & Frutados', '[{"n":"Tequila","q":"50 ml (Prata)"},{"n":"Melancia","q":"100 g (em cubos)"},{"n":"Triple Sec","q":"20 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Sal","q":"na borda"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Macere a melancia fresca no fundo da coqueteleira.\n2. Adicione tequila, Triple Sec, limão e gelo e bata forte.\n3. Coe duas vezes no copo baixo com meia borda de sal.', E'1. Macere a melancia fresca no fundo da coqueteleira.\n2. Adicione tequila, Triple Sec, limão e gelo e bata forte.\n3. Coe duas vezes no copo baixo com meia borda de sal.', 'Melancia suculenta macerada com tequila, Triple Sec e contraste de sal.', 'Clássico moderno de verão que transforma a Margarita em explosão vermelha refrescante.', 'Copo baixo / Taça', 'Macerado + shaker', 'Triângulo de melancia e borda de sal', true, array['Frutado','Refrescante','Cítrico / Ácido','Tequila']::text[], 'watermelon margarita'),
('Pisco Sour', 'Cítricos', '[{"n":"Pisco","q":"60 ml"},{"n":"Limão","q":"25 ml (Taiti)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Clara de ovo","q":"20 ml"},{"n":"Angostura","q":"3 gotas"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Faça dry shake (sem gelo) com Pisco, limão, xarope e clara por 12 segundos.\n2. Adicione bastante gelo, bata vigorosamente e coe duas vezes para copo baixo ou coupe.\n3. Finalize com 3 gotas de Angostura sobre a espuma.', E'1. Faça dry shake (sem gelo) com Pisco, limão, xarope e clara por 12 segundos.\n2. Adicione bastante gelo, bata vigorosamente e coe duas vezes para copo baixo ou coupe.\n3. Finalize com 3 gotas de Angostura sobre a espuma.', 'Espuma cremosa andina com destilado de uva Pisco, limão e Angostura.', 'Criado por Victor Vaughen Morris no Morris’ Bar em Lima por volta de 1920 — patrimônio cultural do Peru.', 'Copo baixo / Coupe', 'Dry shake + shaker', '3 gotas de Angostura na espuma', true, array['Clássico','Cítrico / Ácido','Cremoso']::text[], 'pisco sour'),
('Chilcano', 'Refrescantes', '[{"n":"Pisco","q":"50 ml"},{"n":"Ginger ale","q":"120 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Angostura","q":"2 dashes"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha um copo alto com gelo.\n2. Despeje Pisco, suco de limão fresco e complete com ginger ale.\n3. Finalize com dashes de Angostura.', E'1. Encha um copo alto com gelo.\n2. Despeje Pisco, suco de limão fresco e complete com ginger ale.\n3. Finalize com dashes de Angostura.', 'Highball peruano leve e efervescente de Pisco, gengibre e limão.', 'Tão popular nas noites de Lima quanto o próprio Pisco Sour pela leveza refrescante de festa.', 'Copo alto', 'Montado no copo', 'Rodela de limão', false, array['Clássico','Refrescante','Picante / Gengibre','Longo']::text[], 'chilcano'),
('Pisco Punch', 'Tiki & Tropicais', '[{"n":"Pisco","q":"60 ml"},{"n":"Suco de abacaxi","q":"35 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata Pisco, suco de abacaxi fresco, limão e xarope com muito gelo.\n2. Coe duas vezes para taça coupe gelada.', E'1. Bata Pisco, suco de abacaxi fresco, limão e xarope com muito gelo.\n2. Coe duas vezes para taça coupe gelada.', 'Clássico histórico de São Francisco de Pisco com abacaxi e limão.', 'Criado por Duncan Nicol no Bank Exchange Saloon em São Francisco no século XIX — diziam que tinha o sabor de mil uvas e abacaxis.', 'Taça Coupe', 'Shaker', 'Pedaço de abacaxi', true, array['Clássico','Tropical','Frutado']::text[], 'pisco punch'),
('Carajillo 43', 'Fortes', '[{"n":"Licor 43","q":"50 ml"},{"n":"Café espresso","q":"50 ml"},{"n":"Café em grãos","q":"3 grãos"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata Licor 43 e café espresso fresco com muito gelo por 12 segundos até criar espuma dourada.\n2. Coe sobre cubo grande de gelo em copo baixo e decore com grãos.', E'1. Bata Licor 43 e café espresso fresco com muito gelo por 12 segundos até criar espuma dourada.\n2. Coe sobre cubo grande de gelo em copo baixo e decore com grãos.', 'Café espresso batido com baunilha e especiarias espanholas do Licor 43.', 'Febre nos restaurantes do México e do Brasil nos últimos anos, unindo energia do espresso ao dulçor aromático das 43 botânicas.', 'Copo baixo', 'Shaker vigoroso', '3 grãos de café', true, array['Clássico','Cremoso','Doce','Forte']::text[], 'carajillo 43'),
('Espresso Tonic', 'Refrescantes', '[{"n":"Café espresso","q":"45 ml"},{"n":"Água tônica","q":"120 ml"},{"n":"Laranja","q":"1 rodela ou casca"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha um copo alto com gelo e despeje a água tônica.\n2. Lentamente, despeje o espresso sobre o gelo para formar duas camadas contrastantes.', E'1. Encha um copo alto com gelo e despeje a água tônica.\n2. Lentamente, despeje o espresso sobre o gelo para formar duas camadas contrastantes.', 'Camadas visuais de tônica cristalina e espresso recém-extraído com laranja.', 'Nascido na Suécia em 2007 na Koppi Roasters e adotado por coffee bars e coquetelarias do mundo inteiro.', 'Copo alto', 'Montado em camadas', 'Rodela de laranja ou limão', false, array['Refrescante','Amargo','Com soda / Tônica','Sem álcool']::text[], 'espresso tonic'),
('Irish Coffee', 'Fortes', '[{"n":"Whisky","q":"45 ml (Irish)"},{"n":"Café espresso","q":"90 ml (quente)"},{"n":"Açúcar","q":"1.5 colher (Mascavo)"},{"n":"Chantilly","q":"30 ml (creme batido leve)"}]'::jsonb, E'1. Aqueça uma taça com água quente e descarte.\n2. Dissolva açúcar mascavo no café quente e adicione o whisky irlandês.\n3. Flutue delicadamente creme fresco batido por cima sem misturar.', E'1. Aqueça uma taça com água quente e descarte.\n2. Dissolva açúcar mascavo no café quente e adicione o whisky irlandês.\n3. Flutue delicadamente creme fresco batido por cima sem misturar.', 'Whisky irlandês, café quente adocicado e colarinho frio de creme.', 'Criado por Joe Sheridan nos anos 1940 no aeroporto de Foynes na Irlanda para aquecer passageiros em noites chuvosas.', 'Taça Irish Coffee', 'Montado quente + float de creme', 'Camada cremosa branca', false, array['Clássico','Cremoso','Forte','Whisky']::text[], 'irish coffee'),
('Hot Toddy', 'Fortes', '[{"n":"Whisky","q":"50 ml (Scotch ou Bourbon)"},{"n":"Mel","q":"20 ml"},{"n":"Limão","q":"20 ml (Siciliano)"},{"n":"Canela","q":"1 pau"},{"n":"Cravo-da-índia","q":"3 unid"}]'::jsonb, E'1. Coloque mel, limão siciliano, whisky e especiarias em caneca resistente ao calor.\n2. Complete com 100 ml de água bem quente e mexa com o pau de canela.', E'1. Coloque mel, limão siciliano, whisky e especiarias em caneca resistente ao calor.\n2. Complete com 100 ml de água bem quente e mexa com o pau de canela.', 'Abraço quente de whisky, mel, limão siciliano, cravo e canela.', 'Receita escocesa tradicional dos séculos XVIII-XIX famosa como conforto aromático em noites frias.', 'Caneca / Copo térmico', 'Montado quente', 'Rodela de limão espetada com cravos e canela', false, array['Clássico','Forte','Whisky']::text[], 'hot toddy'),
('Trinidad Sour', 'Fortes', '[{"n":"Angostura","q":"45 ml"},{"n":"Orgeat","q":"30 ml"},{"n":"Limão","q":"22 ml (Siciliano)"},{"n":"Whisky","q":"15 ml (Rye)"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata a dose inteira de Angostura com orgeat, limão e whisky com bastante gelo.\n2. Coe duas vezes para taça coupe gelada.', E'1. Bata a dose inteira de Angostura com orgeat, limão e whisky com bastante gelo.\n2. Coe duas vezes para taça coupe gelada.', 'Ousadia histórica: a própria Angostura é a base principal, domada por orgeat.', 'Criado em 2009 por Giuseppe González em Nova York — desafia tudo o que se pensava sobre bitters na coquetelaria.', 'Taça Coupe', 'Shaker', 'Sem guarnição', true, array['Clássico','Amargo','Forte','Whisky']::text[], 'trinidad sour'),
('Gin Gin Mule', 'Refrescantes', '[{"n":"Gin","q":"50 ml"},{"n":"Hortelã","q":"10 folhas"},{"n":"Xarope de gengibre","q":"25 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Água com gás","q":"60 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata gin, hortelã, xarope de gengibre e limão com gelo.\n2. Coe para copo alto com gelo novo e complete com água com gás.', E'1. Bata gin, hortelã, xarope de gengibre e limão com gelo.\n2. Coe para copo alto com gelo novo e complete com água com gás.', 'Encontro brilhante do Mojito com o Moscow Mule feito com gin.', 'Criado por Audrey Saunders em 2000 no Beacon e consagrado no Pegu Club de Nova York como clássico moderno.', 'Copo alto / Caneca', 'Shaker + build', 'Ramo de hortelã', true, array['Clássico','Refrescante','Herbal / Hortelã','Picante / Gengibre','Gin']::text[], 'gin gin mule'),
('French Martini', 'Doces & Frutados', '[{"n":"Vodka","q":"45 ml"},{"n":"Licor de framboesa","q":"15 ml"},{"n":"Suco de abacaxi","q":"45 ml"},{"n":"Framboesa","q":"1 unid"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata vodka, licor de framboesa e suco de abacaxi vigorosamente para criar espuma natural do abacaxi.\n2. Coe duas vezes para taça martini gelada.', E'1. Bata vodka, licor de framboesa e suco de abacaxi vigorosamente para criar espuma natural do abacaxi.\n2. Coe duas vezes para taça martini gelada.', 'Espuma aveludada de abacaxi com licor de framboesa e vodka.', 'Criado nos anos 1980 em Nova York no Balthazar por Keith McNally e Allen Katz — favorito dos jantares cosmopolitas.', 'Taça Martini / Coupe', 'Shaker vigoroso', 'Framboesa ou casca de limão', true, array['Clássico','Frutado','Cremoso','Vodka']::text[], 'french martini'),
('Lemon Drop Martini', 'Cítricos', '[{"n":"Vodka","q":"50 ml"},{"n":"Triple Sec","q":"20 ml"},{"n":"Limão","q":"25 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Açúcar","q":"na borda"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Passe limão na borda da taça martini e encoste no açúcar.\n2. Bata vodka, Triple Sec, limão siciliano e xarope com muito gelo e coe duas vezes.', E'1. Passe limão na borda da taça martini e encoste no açúcar.\n2. Bata vodka, Triple Sec, limão siciliano e xarope com muito gelo e coe duas vezes.', 'Ácido-doce cristalino de limão siciliano com borda açucarada.', 'Criado nos anos 1970 em São Francisco por Norman Jay Hobday no Henry Africa’s Bar, inspirado nas balas ácidas de limão.', 'Taça Martini', 'Shaker', 'Borda de açúcar e espiral de limão', true, array['Clássico','Cítrico / Ácido','Doce','Vodka']::text[], 'lemon drop martini'),
('Lychee Martini', 'Doces & Frutados', '[{"n":"Vodka","q":"50 ml"},{"n":"Licor de lichia","q":"25 ml"},{"n":"Vermute","q":"10 ml (Seco)"},{"n":"Lichia","q":"1 fruta"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata vodka, licor de lichia e vermute seco com muito gelo.\n2. Coe para taça martini gelada e sirva com uma lichia no palito.', E'1. Bata vodka, licor de lichia e vermute seco com muito gelo.\n2. Coe para taça martini gelada e sirva com uma lichia no palito.', 'Perfume floral exótico da lichia em taça martini geladíssima.', 'Ícone dos bares modernos asiático-contemporâneos pela elegância perfumada e leve.', 'Taça Martini', 'Shaker', 'Lichia no palito', true, array['Frutado','Doce','Vodka']::text[], 'lychee martini'),
('Appletini', 'Doces & Frutados', '[{"n":"Vodka","q":"45 ml"},{"n":"Xarope de maçã verde","q":"25 ml"},{"n":"Triple Sec","q":"15 ml"},{"n":"Limão","q":"15 ml (Siciliano)"},{"n":"Maçã","q":"1 fatia fina"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata vodka, xarope de maçã verde, Triple Sec e limão siciliano com muito gelo.\n2. Coe duas vezes na taça martini e decore com leque fino de maçã.', E'1. Bata vodka, xarope de maçã verde, Triple Sec e limão siciliano com muito gelo.\n2. Coe duas vezes na taça martini e decore com leque fino de maçã.', 'Verde esmeralda vibrante, ácido e crocante de maçã verde.', 'Criado em 1996 em West Hollywood no Lola’s Restaurant — o drink verde mais famoso do cinema e da TV.', 'Taça Martini', 'Shaker', 'Fatia fina de maçã verde', true, array['Clássico','Frutado','Cítrico / Ácido','Vodka']::text[], 'appletini'),
('Midori Sour', 'Cítricos', '[{"n":"Licor de melão","q":"45 ml"},{"n":"Limão","q":"25 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"10 ml"},{"n":"Água com gás","q":"45 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata licor de melão, limão siciliano e xarope com gelo.\n2. Coe para copo baixo com gelo novo e finalize com splash de água com gás.', E'1. Bata licor de melão, limão siciliano e xarope com gelo.\n2. Coe para copo baixo com gelo novo e finalize com splash de água com gás.', 'Verde neon de melão doce equilibrado por acidez intensa de limão.', 'Explodiu nos anos 1980 nos Estados Unidos e Japão logo após o lançamento do licor japonês Midori na festa do Studio 54.', 'Copo baixo / Alto', 'Shaker + splash', 'Cereja e rodela de limão', true, array['Clássico','Frutado','Doce','Cítrico / Ácido']::text[], 'midori sour'),
('Tokyo Iced Tea', 'Fortes', '[{"n":"Vodka","q":"15 ml"},{"n":"Gin","q":"15 ml"},{"n":"Rum","q":"15 ml (Branco)"},{"n":"Tequila","q":"15 ml"},{"n":"Licor de melão","q":"20 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Refrigerante de limão","q":"60 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Monte os quatro destilados, licor de melão e limão em copo alto com gelo.\n2. Mexa e complete com refrigerante de limão.', E'1. Monte os quatro destilados, licor de melão e limão em copo alto com gelo.\n2. Mexa e complete com refrigerante de limão.', 'Versão verde esmeralda do Long Island substituindo Triple Sec e cola por melão e soda.', 'Clássico festivo dos anos 1990 adorado pelo visual fluorescente e perfil frutado.', 'Copo alto', 'Montado + mexido', 'Rodela de limão e cereja', false, array['Forte','Longo','Doce']::text[], 'tokyo iced tea'),
('Japanese Slipper', 'Cítricos', '[{"n":"Licor de melão","q":"30 ml"},{"n":"Cointreau","q":"30 ml"},{"n":"Limão","q":"30 ml (Siciliano)"},{"n":"Cereja","q":"1 unid"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata partes iguais de licor de melão, Cointreau e limão siciliano com gelo.\n2. Coe para taça coupe gelada com uma cereja ao centro.', E'1. Bata partes iguais de licor de melão, Cointreau e limão siciliano com gelo.\n2. Coe para taça coupe gelada com uma cereja ao centro.', 'Partes iguais de melão vibrante, laranja e limão siciliano.', 'Criado em 1984 em Melbourne por Jean-Paul Bourguignon no Mietta’s Restaurant — o primeiro clássico moderno australiano.', 'Taça Coupe / Martini', 'Shaker', 'Cereja ao marasquino', true, array['Clássico','Cítrico / Ácido','Frutado']::text[], 'japanese slipper'),
('Jack Rose', 'Cítricos', '[{"n":"Calvados","q":"50 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Grenadine","q":"15 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata Calvados, suco de limão e grenadine com bastante gelo.\n2. Coe duas vezes para taça coupe gelada.', E'1. Bata Calvados, suco de limão e grenadine com bastante gelo.\n2. Coe duas vezes para taça coupe gelada.', 'Destilado de maçã com romã grenadine e limão em tom rubi clássico.', 'Famoso nos anos 1920 em Paris e citado por Ernest Hemingway em O Sol Também Se Levanta.', 'Taça Coupe', 'Shaker', 'Casca de limão', true, array['Clássico','Cítrico / Ácido','Frutado']::text[], 'jack rose'),
('Angel Face', 'Fortes', '[{"n":"Gin","q":"30 ml"},{"n":"Apricot Brandy","q":"30 ml"},{"n":"Calvados","q":"30 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata partes iguais de gin, licor de damasco e Calvados com gelo.\n2. Coe para taça coupe gelada.', E'1. Bata partes iguais de gin, licor de damasco e Calvados com gelo.\n2. Coe para taça coupe gelada.', 'Clássico da Lei Seca em partes iguais: gin, damasco e maçã destilada.', 'Publicado no Savoy Cocktail Book de 1930 e batizado em referência a um célebre gângster da época.', 'Taça Coupe', 'Shaker', 'Fatia fina de maçã', true, array['Clássico','Forte','Curto','Gin']::text[], 'angel face'),
('Pegu Club', 'Cítricos', '[{"n":"Gin","q":"60 ml"},{"n":"Cointreau","q":"20 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Angostura","q":"1 dash"},{"n":"Bitter de laranja","q":"1 dash"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata gin, Cointreau, limão e os dois bitters com bastante gelo.\n2. Coe duas vezes para taça coupe gelada.', E'1. Bata gin, Cointreau, limão e os dois bitters com bastante gelo.\n2. Coe duas vezes para taça coupe gelada.', 'Gin seco, laranja, limão e dupla camada aromática de bitters.', 'Drink assinatura do clube britânico homônimo em Yangon, Mianmar, na década de 1920.', 'Taça Coupe', 'Shaker', 'Roda ou casca de limão', true, array['Clássico','Cítrico / Ácido','Forte','Gin']::text[], 'pegu club'),
('Casino', 'Cítricos', '[{"n":"Gin","q":"45 ml"},{"n":"Maraschino","q":"10 ml"},{"n":"Limão","q":"15 ml (Siciliano)"},{"n":"Bitter de laranja","q":"2 dashes"},{"n":"Cereja","q":"1 unid"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata gin, Maraschino, limão siciliano e bitter de laranja com gelo.\n2. Coe para taça coupe gelada e finalize com cereja.', E'1. Bata gin, Maraschino, limão siciliano e bitter de laranja com gelo.\n2. Coe para taça coupe gelada e finalize com cereja.', 'Irmão mais seco e cristalino do Aviation sem violeta.', 'Registrado em 1909 no manual de Hugo Ensslin em Nova York — patrimônio oficial da lista Unforgettables da IBA.', 'Taça Coupe', 'Shaker', 'Cereja e casca de limão', true, array['Clássico','Cítrico / Ácido','Curto','Gin']::text[], 'casino'),
('Enzoni', 'Aperitivos', '[{"n":"Gin","q":"30 ml"},{"n":"Campari","q":"30 ml"},{"n":"Uva","q":"5 bagos (verdes sem semente)"},{"n":"Limão","q":"20 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere as uvas verdes no fundo da coqueteleira.\n2. Adicione gin, Campari, limão siciliano e xarope e bata com gelo.\n3. Coe sobre gelo em copo baixo.', E'1. Macere as uvas verdes no fundo da coqueteleira.\n2. Adicione gin, Campari, limão siciliano e xarope e bata com gelo.\n3. Coe sobre gelo em copo baixo.', 'Encontro mágico entre Negroni e Sour com uvas verdes frescas maceradas.', 'Criado por Vincenzo Errico no Milk & Honey em Nova York em 2002 — surpreende até quem acha que não gosta de Campari.', 'Copo baixo', 'Macerado + shaker', 'Espeto com uvas verdes', true, array['Amargo','Frutado','Refrescante','Gin']::text[], 'enzoni'),
('Jasmine', 'Cítricos', '[{"n":"Gin","q":"45 ml"},{"n":"Campari","q":"10 ml"},{"n":"Cointreau","q":"10 ml"},{"n":"Limão","q":"20 ml (Siciliano)"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata gin, Campari, Cointreau e limão siciliano com muito gelo.\n2. Coe para taça coupe gelada — a cor fica igual à de toranja rosa.', E'1. Bata gin, Campari, Cointreau e limão siciliano com muito gelo.\n2. Coe para taça coupe gelada — a cor fica igual à de toranja rosa.', 'Amargor cítrico brilhante que lembra grapefruit rosa sem levar uma gota da fruta.', 'Criado por Paul Harrington nos anos 1990 em Berkeley no Townhouse Bar & Grill.', 'Taça Coupe', 'Shaker', 'Casca de limão siciliano', true, array['Clássico','Amargo','Cítrico / Ácido','Gin']::text[], 'jasmine'),
('Kentucky Buck', 'Refrescantes', '[{"n":"Whisky","q":"50 ml (Bourbon)"},{"n":"Morango","q":"2 unid"},{"n":"Limão","q":"20 ml (Siciliano)"},{"n":"Ginger beer","q":"90 ml"},{"n":"Angostura","q":"2 dashes"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere os morangos no fundo do shaker.\n2. Adicione bourbon, limão e Angostura e bata com gelo.\n3. Coe para copo alto com gelo novo e complete com ginger beer.', E'1. Macere os morangos no fundo do shaker.\n2. Adicione bourbon, limão e Angostura e bata com gelo.\n3. Coe para copo alto com gelo novo e complete com ginger beer.', 'Bourbon com morangos frescos macerados, limão e gengibre picante.', 'Criado por Erick Castro em São Francisco nos anos 2010 — prova irresistível de que morango e bourbon nasceram um para o outro.', 'Copo alto / Caneca', 'Macerado + shaker + build', 'Morango e rodela de limão', true, array['Picante / Gengibre','Frutado','Refrescante','Whisky']::text[], 'kentucky buck'),
('Whiskey Smash', 'Refrescantes', '[{"n":"Whisky","q":"60 ml (Bourbon)"},{"n":"Limão","q":"0.5 unid em gomos (Siciliano)"},{"n":"Hortelã","q":"8 folhas"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere os gomos de limão siciliano com xarope e hortelã na coqueteleira.\n2. Adicione bourbon e gelo, bata forte e coe sobre gelo novo no copo baixo.', E'1. Macere os gomos de limão siciliano com xarope e hortelã na coqueteleira.\n2. Adicione bourbon e gelo, bata forte e coe sobre gelo novo no copo baixo.', 'Mint Julep cítrico e vibrante com gomos de limão siciliano esmagados.', 'Popularizado por Dale DeGroff nos anos 1990 a partir de receitas americanas do século XIX — porta de entrada perfeita para bourbon.', 'Copo baixo', 'Macerado + shaker', 'Buquê de hortelã', true, array['Clássico','Refrescante','Herbal / Hortelã','Cítrico / Ácido','Whisky']::text[], 'whiskey smash'),
('Eastside', 'Refrescantes', '[{"n":"Gin","q":"50 ml"},{"n":"Pepino","q":"3 fatias"},{"n":"Hortelã","q":"8 folhas"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Macere suavemente pepino e hortelã com xarope na coqueteleira.\n2. Adicione gin, limão e gelo e bata forte.\n3. Coe duas vezes para taça coupe gelada.', E'1. Macere suavemente pepino e hortelã com xarope na coqueteleira.\n2. Adicione gin, limão e gelo e bata forte.\n3. Coe duas vezes para taça coupe gelada.', 'O Southside elevado pelo frescor aquático e verde do pepino.', 'Clássico moderno do Little Branch em Nova York que conquistou bares autorais no mundo todo.', 'Taça Coupe', 'Macerado + shaker', 'Fatia fina de pepino e folha de hortelã', true, array['Refrescante','Herbal / Hortelã','Cítrico / Ácido','Gin']::text[], 'eastside'),
('Spicy Fifty', 'Cítricos', '[{"n":"Vodka","q":"50 ml"},{"n":"Licor de flor de sabugueiro","q":"15 ml"},{"n":"Mel","q":"10 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Pimenta","q":"2 rodelas finas (dedo-de-moça)"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Macere levemente a pimenta com o mel diluído na coqueteleira.\n2. Adicione vodka, licor de sabugueiro e limão, bata com gelo e coe duas vezes.', E'1. Macere levemente a pimenta com o mel diluído na coqueteleira.\n2. Adicione vodka, licor de sabugueiro e limão, bata com gelo e coe duas vezes.', 'Floral de sabugueiro com mel e picância viva de pimenta vermelha.', 'Criado por Salvatore Calabrese em 2005 para os 50 anos do bar Fifty em Londres — hoje membro oficial da IBA.', 'Taça Coupe', 'Shaker', 'Pimenta vermelha na borda', true, array['Clássico','Picante / Gengibre','Cítrico / Ácido','Vodka']::text[], 'spicy fifty'),
('Fernet con Coca', 'Fortes', '[{"n":"Fernet","q":"50 ml"},{"n":"Coca-Cola","q":"150 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha um copo alto com muito gelo.\n2. Despeje o Fernet e complete devagar com Coca-Cola pela parede para controlar a espuma.', E'1. Encha um copo alto com muito gelo.\n2. Despeje o Fernet e complete devagar com Coca-Cola pela parede para controlar a espuma.', 'Amargor intenso e mentolado de ervas casado com cola gelada.', 'Ícone cultural da Argentina (chamado de Fernandito pela IBA) que ganhou os balcões descolados de toda a América do Sul.', 'Copo alto', 'Montado lentamente', 'Sem guarnição', false, array['Clássico','Amargo','Longo']::text[], 'fernet con coca'),
('Tequila Sunrise', 'Tiki & Tropicais', '[{"n":"Tequila","q":"50 ml"},{"n":"Suco de laranja","q":"120 ml"},{"n":"Grenadine","q":"15 ml"},{"n":"Laranja","q":"1 fatia"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Misture tequila e suco de laranja no copo alto com gelo.\n2. Despeje grenadine devagar pela parede interna para criar o degradê solar.', E'1. Misture tequila e suco de laranja no copo alto com gelo.\n2. Despeje grenadine devagar pela parede interna para criar o degradê solar.', 'Degradê solar luminoso de tequila, suco de laranja e grenadine.', 'Reinventado no Trident Bar em Sausalito nos anos 1970 e eternizado pelas turnês dos Rolling Stones.', 'Copo alto', 'Montado em camadas', 'Fatia de laranja e cereja', false, array['Clássico','Tropical','Doce','Frutado','Tequila']::text[], 'tequila sunrise'),
('Sex on the Beach', 'Doces & Frutados', '[{"n":"Vodka","q":"45 ml"},{"n":"Licor de pêssego","q":"20 ml"},{"n":"Suco de laranja","q":"80 ml"},{"n":"Suco de cranberry","q":"40 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha um copo alto com gelo.\n2. Adicione vodka, licor de pêssego e suco de laranja.\n3. Finalize com suco de cranberry no topo.', E'1. Encha um copo alto com gelo.\n2. Adicione vodka, licor de pêssego e suco de laranja.\n3. Finalize com suco de cranberry no topo.', 'Frutado, doce e vibrante de vodka, pêssego, laranja e cranberry.', 'Nascido em 1987 em Fort Lauderdale na Flórida durante um concurso nacional de vendas de licor de pêssego.', 'Copo alto', 'Montado no copo', 'Rodela de laranja e cereja', false, array['Clássico','Frutado','Doce','Longo','Vodka']::text[], 'sex on the beach'),
('Sea Breeze', 'Refrescantes', '[{"n":"Vodka","q":"45 ml"},{"n":"Suco de cranberry","q":"90 ml"},{"n":"Suco de grapefruit","q":"30 ml"},{"n":"Limão","q":"1 gomo"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha um copo alto com gelo.\n2. Adicione vodka, cranberry e suco de grapefruit e mexa suavemente.', E'1. Encha um copo alto com gelo.\n2. Adicione vodka, cranberry e suco de grapefruit e mexa suavemente.', 'Brisa marinha seca e frutada de vodka, cranberry e toranja.', 'Clássico da família Breeze desde os anos 1980, adorado pelo equilíbrio leve entre ácido e frutado.', 'Copo alto', 'Montado no copo', 'Gomo de limão', false, array['Clássico','Refrescante','Frutado','Vodka']::text[], 'sea breeze'),
('Hortelã Dourada', 'Autorais', '[{"n":"Rum","q":"30 ml (Branco)"},{"n":"Conhaque","q":"20 ml"},{"n":"Abacaxi","q":"50 g"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Hortelã","q":"8 folhas"},{"n":"Xarope de hortelã","q":"10 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere o abacaxi com hortelã no fundo da coqueteleira.\n2. Adicione rum, conhaque, limão e xarope de hortelã e bata forte com gelo.\n3. Coe duas vezes sobre gelo novo.', E'1. Macere o abacaxi com hortelã no fundo da coqueteleira.\n2. Adicione rum, conhaque, limão e xarope de hortelã e bata forte com gelo.\n3. Coe duas vezes sobre gelo novo.', 'Rum e conhaque dão profundidade, enquanto abacaxi e hortelã trazem frescor.', 'Nascido de um experimento na Campos House que, após ajustes finos, virou o autoral mais pedido da casa.', 'Copo baixo', 'Macerado + shaker', 'Ramo de hortelã e fatia de abacaxi', true, array['Autoral','Tropical','Herbal / Hortelã','Rum','Conhaque']::text[], 'hortela dourada'),
('Mule do Campos', 'Autorais', '[{"n":"Vodka","q":"50 ml"},{"n":"Xarope de gengibre","q":"25 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Água com gás","q":"80 ml"},{"n":"Hortelã","q":"6 folhas"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata vodka, xarope de gengibre e limão com gelo.\n2. Coe no copo ou caneca com gelo novo e complete com água com gás.\n3. Finalize com hortelã batida na palma da mão.', E'1. Bata vodka, xarope de gengibre e limão com gelo.\n2. Coe no copo ou caneca com gelo novo e complete com água com gás.\n3. Finalize com hortelã batida na palma da mão.', 'Mule da casa batido para máxima maciez, picante de gengibre e hortelã.', 'Receita assinatura da Campos House que dispensa espuma industrializada apostando em gengibre e hortelã frescos.', 'Caneca / Copo alto', 'Shaker + build', 'Hortelã e rodela de limão', true, array['Autoral','Picante / Gengibre','Refrescante','Vodka']::text[], 'mule do campos'),
('Maracujá Smash de Cachaça', 'Autorais', '[{"n":"Cachaça","q":"50 ml (Prata)"},{"n":"Maracujá","q":"1 fruta"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Hortelã","q":"6 folhas"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Coloque polpa de maracujá, hortelã e xarope no shaker e pressione de leve.\n2. Adicione cachaça e limão, bata com gelo e coe sobre gelo novo.', E'1. Coloque polpa de maracujá, hortelã e xarope no shaker e pressione de leve.\n2. Adicione cachaça e limão, bata com gelo e coe sobre gelo novo.', 'Azedinho, tropical e perfumado com hortelã batida junto da cachaça.', 'Criação de verão da Campos House pensada para destacar a fruta brasileira com acabamento fotogênico.', 'Copo baixo', 'Macerado + shaker', 'Meia casca de maracujá e hortelã', true, array['Autoral','Brasileiro','Tropical','Cachaça']::text[], 'maracuja smash de cachaca'),
('Gin Tônica Morango e Gengibre', 'Refrescantes', '[{"n":"Gin","q":"50 ml (London Dry)"},{"n":"Morango","q":"3 unid"},{"n":"Xarope de gengibre","q":"10 ml"},{"n":"Água tônica","q":"120 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere levemente 2 morangos com xarope de gengibre no fundo da taça.\n2. Adicione bastante gelo, gin e complete com água tônica.\n3. Decore com o morango fatiado.', E'1. Macere levemente 2 morangos com xarope de gengibre no fundo da taça.\n2. Adicione bastante gelo, gin e complete com água tônica.\n3. Decore com o morango fatiado.', 'Gin tônica rosado de morango com toque picante de gengibre no final.', 'Uma das variações mais pedidas da casa por unir visual rosado convidativo e calor sutil de gengibre.', 'Taça balão', 'Macerado leve + build', 'Morango fatiado', false, array['Autoral','Refrescante','Frutado','Com soda / Tônica','Gin']::text[], 'gin tonica morango e gengibre'),
('Caipi Maçã Verde e Gengibre', 'Brasileiríssimos', '[{"n":"Cachaça","q":"50 ml (Prata)"},{"n":"Limão","q":"1 unid (Taiti)"},{"n":"Xarope de maçã verde","q":"20 ml"},{"n":"Gengibre","q":"2 fatias"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere limão e gengibre no fundo do copo ou coqueteleira.\n2. Adicione xarope de maçã verde, cachaça e gelo e agite bem.', E'1. Macere limão e gengibre no fundo do copo ou coqueteleira.\n2. Adicione xarope de maçã verde, cachaça e gelo e agite bem.', 'Caipirinha moderna verde-esmeralda com acidez crocante e toque picante.', 'Receita autoral brasileira que moderniza a caipirinha com maçã verde aromática e gengibre fresco.', 'Copo baixo', 'Macerado + shaker', 'Fatia fina de maçã e gengibre', true, array['Autoral','Brasileiro','Picante / Gengibre','Cítrico / Ácido','Cachaça']::text[], 'caipi maca verde e gengibre'),
('Rubi de Morango', 'Autorais', '[{"n":"Vodka","q":"50 ml"},{"n":"Morango","q":"3 unid"},{"n":"Xarope de morango","q":"15 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Água tônica","q":"100 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere os morangos com xarope de morango e limão.\n2. Adicione gelo, vodka e complete com água tônica gelada.', E'1. Macere os morangos com xarope de morango e limão.\n2. Adicione gelo, vodka e complete com água tônica gelada.', 'Vermelho intenso de morangos amassados com vodka e bolhas de tônica.', 'Pensado na Campos House para quem pede algo doce, leve e refrescante em taça alta.', 'Taça balão / Copo alto', 'Macerado + build', 'Morango fresco', false, array['Autoral','Frutado','Doce','Com soda / Tônica','Vodka']::text[], 'rubi de morango'),
('Rum Sour de Maçã Verde', 'Cítricos', '[{"n":"Rum","q":"50 ml (Branco)"},{"n":"Xarope de maçã verde","q":"20 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Angostura","q":"2 gotas"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata rum, xarope de maçã verde e limão vigorosamente com gelo.\n2. Coe sobre gelo novo e pingue 2 gotas de Angostura por cima.', E'1. Bata rum, xarope de maçã verde e limão vigorosamente com gelo.\n2. Coe sobre gelo novo e pingue 2 gotas de Angostura por cima.', 'Daiquiri verde vibrante aromatizado com maçã verde e gotas de Angostura.', 'Variação autoral de Sour que equilibra o frescor cítrico da maçã verde com especiarias do bitter.', 'Copo baixo / Coupe', 'Shaker', 'Fatia fina de maçã verde', true, array['Autoral','Cítrico / Ácido','Frutado','Rum']::text[], 'rum sour de maca verde'),
('Garden Siciliano', 'Refrescantes', '[{"n":"Gin","q":"50 ml"},{"n":"Limão","q":"25 ml (Siciliano)"},{"n":"Hortelã","q":"10 folhas"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Água com gás","q":"80 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata gin, limão siciliano, hortelã e xarope com gelo.\n2. Coe duas vezes para copo alto com gelo novo e complete com água com gás.', E'1. Bata gin, limão siciliano, hortelã e xarope com gelo.\n2. Coe duas vezes para copo alto com gelo novo e complete com água com gás.', 'Jardim cítrico aromático de gin, limão siciliano, hortelã e gás.', 'Versão da casa inspirada nos coquetéis botânicos ingleses de verão.', 'Copo alto / Taça', 'Shaker + build', 'Ramo de hortelã e casca de limão siciliano', true, array['Autoral','Refrescante','Herbal / Hortelã','Cítrico / Ácido','Gin']::text[], 'garden siciliano'),
('Old Fashioned Caiçara', 'Fortes', '[{"n":"Cachaça","q":"60 ml (Ouro)"},{"n":"Açúcar","q":"10 ml xarope"},{"n":"Angostura","q":"2 dashes"},{"n":"Laranja","q":"1 casca"},{"n":"Gelo","q":"1 cubo grande"}]'::jsonb, E'1. Mexa cachaça ouro, xarope de açúcar e Angostura em copo baixo com cubo grande de gelo por 25s.\n2. Expresse óleos essenciais de casca de laranja por cima.', E'1. Mexa cachaça ouro, xarope de açúcar e Angostura em copo baixo com cubo grande de gelo por 25s.\n2. Expresse óleos essenciais de casca de laranja por cima.', 'Old Fashioned de alambique envelhecido com baunilha natural da madeira.', 'Mostra a força da cachaça envelhecida em carvalho ou umburana quando tratada com o respeito de um grande whisky.', 'Old fashioned', 'Mexido no copo', 'Casca de laranja', false, array['Autoral','Brasileiro','Forte','Curto','Cachaça']::text[], 'old fashioned caicara'),
('Manhattan Carioca', 'Fortes', '[{"n":"Cachaça","q":"50 ml (Ouro)"},{"n":"Vermute","q":"25 ml (Tinto)"},{"n":"Angostura","q":"2 dashes"},{"n":"Laranja","q":"1 casca"},{"n":"Gelo","q":"para mexer"}]'::jsonb, E'1. Mexa cachaça ouro, vermute tinto e Angostura em mixing glass com gelo.\n2. Coe para taça coupe gelada e perfume com casca de laranja.', E'1. Mexa cachaça ouro, vermute tinto e Angostura em mixing glass com gelo.\n2. Coe para taça coupe gelada e perfume com casca de laranja.', 'Manhattan brasileiro coado e elegante em taça coupe.', 'Ponte entre o Rabo de Galo paulistano e o clássico nova-iorquino servido sem gelo.', 'Taça Coupe', 'Mexido', 'Casca de laranja', false, array['Autoral','Brasileiro','Forte','Curto','Cachaça']::text[], 'manhattan carioca'),
('Cachaça Margarita Tropical', 'Cítricos', '[{"n":"Cachaça","q":"50 ml (Prata)"},{"n":"Maracujá","q":"0.5 fruta"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Sal","q":"na borda"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Faça meia borda de sal no copo baixo.\n2. Bata cachaça, maracujá, limão e xarope com muito gelo.\n3. Coe sobre gelo novo no copo preparado.', E'1. Faça meia borda de sal no copo baixo.\n2. Bata cachaça, maracujá, limão e xarope com muito gelo.\n3. Coe sobre gelo novo no copo preparado.', 'Cachaça prata com maracujá, limão e borda de sal que realça o sabor.', 'Troca a tequila pela cachaça fresca numa releitura tropical brasileira da Margarita.', 'Copo baixo', 'Shaker', 'Meia borda de sal e casca de limão', true, array['Autoral','Brasileiro','Tropical','Cítrico / Ácido','Cachaça']::text[], 'cachaca margarita tropical'),
('Guaraná Spritz', 'Aperitivos', '[{"n":"Vermute","q":"60 ml (Tinto)"},{"n":"Guaraná","q":"90 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Laranja","q":"1 rodela"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha uma taça de vinho com muito gelo.\n2. Adicione vermute tinto e suco de limão e complete com guaraná gelado.', E'1. Encha uma taça de vinho com muito gelo.\n2. Adicione vermute tinto e suco de limão e complete com guaraná gelado.', 'Spritz verde-amarelo de vermute tinto, limão e guaraná bem gelado.', 'Nascido na Campos House como alternativa brasileira e leve aos spritzes europeus.', 'Taça de vinho', 'Montado na taça', 'Rodela de laranja', false, array['Autoral','Brasileiro','Refrescante','Vermute & Aperitivos']::text[], 'guarana spritz'),
('Pink Lemonade Gin', 'Cítricos', '[{"n":"Gin","q":"50 ml"},{"n":"Morango","q":"3 unid"},{"n":"Limão","q":"25 ml (Siciliano)"},{"n":"Xarope de groselha","q":"15 ml"},{"n":"Água com gás","q":"80 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata gin, morangos, limão siciliano e groselha com gelo.\n2. Coe sobre gelo novo no copo alto e complete com água com gás.', E'1. Bata gin, morangos, limão siciliano e groselha com gelo.\n2. Coe sobre gelo novo no copo alto e complete com água com gás.', 'Limonada rosada espumante com base botânica de gin e morango fresco.', 'Visual encantador e equilíbrio cítrico que agrada de primeira em qualquer mesa.', 'Copo alto / Taça', 'Shaker + build', 'Morango e rodela de limão siciliano', true, array['Autoral','Frutado','Cítrico / Ácido','Refrescante','Gin']::text[], 'pink lemonade gin'),
('Mojito Maracujá e Gengibre', 'Autorais', '[{"n":"Rum","q":"50 ml (Branco)"},{"n":"Maracujá","q":"0.5 fruta"},{"n":"Xarope de gengibre","q":"15 ml"},{"n":"Hortelã","q":"8 folhas"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Água com gás","q":"60 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Pressione suavemente a hortelã com polpa de maracujá e xarope de gengibre.\n2. Adicione rum, limão e gelo e complete com água com gás.', E'1. Pressione suavemente a hortelã com polpa de maracujá e xarope de gengibre.\n2. Adicione rum, limão e gelo e complete com água com gás.', 'Mojito autoral explosivo com sementes de maracujá e final de gengibre.', 'Releitura caribenha criada na casa para elevar o Mojito com acidez tropical e picância.', 'Copo alto', 'Macerado + build', 'Hortelã e maracujá', false, array['Autoral','Tropical','Picante / Gengibre','Herbal / Hortelã','Rum']::text[], 'mojito maracuja e gengibre'),
('Sunset Campos', 'Autorais', '[{"n":"Vodka","q":"50 ml"},{"n":"Abacaxi","q":"50 g"},{"n":"Maracujá","q":"0.5 fruta"},{"n":"Xarope de groselha","q":"15 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata vodka, abacaxi macerado, maracujá e limão com gelo.\n2. Coe sobre gelo em copo alto e despeje a groselha devagar pela borda para formar degradê.', E'1. Bata vodka, abacaxi macerado, maracujá e limão com gelo.\n2. Coe sobre gelo em copo alto e despeje a groselha devagar pela borda para formar degradê.', 'Degradê de pôr do sol com abacaxi, maracujá, vodka e fundo rubi.', 'Cartão de visitas visual da Campos House servido em degradê laranja e vermelho.', 'Copo alto', 'Shaker + camadas', 'Fatia de abacaxi', true, array['Autoral','Tropical','Frutado','Vodka']::text[], 'sunset campos'),
('Dark Brasileiro', 'Autorais', '[{"n":"Cachaça","q":"50 ml (Ouro)"},{"n":"Xarope de gengibre","q":"25 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Água com gás","q":"90 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha o copo alto com gelo.\n2. Despeje xarope de gengibre, limão e água com gás.\n3. Flutue a cachaça ouro por cima como no Dark ’n’ Stormy.', E'1. Encha o copo alto com gelo.\n2. Despeje xarope de gengibre, limão e água com gás.\n3. Flutue a cachaça ouro por cima como no Dark ’n’ Stormy.', 'Versão brasileira do Dark ’n’ Stormy feita com cachaça envelhecida.', 'Substitui o rum escuro caribenho pela cachaça ouro, destacando notas amadeiradas junto ao gengibre.', 'Copo alto', 'Montado em camadas', 'Rodela de limão', false, array['Autoral','Brasileiro','Picante / Gengibre','Refrescante','Cachaça']::text[], 'dark brasileiro'),
('Morango Picante', 'Autorais', '[{"n":"Vodka","q":"50 ml"},{"n":"Morango","q":"4 unid"},{"n":"Pimenta","q":"2 rodelas finas (dedo-de-moça)"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Macere os morangos com uma rodela fina de pimenta e xarope.\n2. Adicione vodka, limão e gelo e bata forte.\n3. Coe duas vezes sobre gelo novo.', E'1. Macere os morangos com uma rodela fina de pimenta e xarope.\n2. Adicione vodka, limão e gelo e bata forte.\n3. Coe duas vezes sobre gelo novo.', 'Morangos doces cortados por pimenta dedo-de-moça fresca e limão.', 'Autoral de contraste marcante que surpreende no primeiro gole e convida ao segundo.', 'Copo baixo', 'Macerado + shaker', 'Morango e pontinha de pimenta', true, array['Autoral','Picante / Gengibre','Frutado','Vodka']::text[], 'morango picante'),
('Caipi Abacaxi, Hortelã e Gengibre', 'Brasileiríssimos', '[{"n":"Cachaça","q":"50 ml (Prata)"},{"n":"Abacaxi","q":"70 g"},{"n":"Hortelã","q":"6 folhas"},{"n":"Gengibre","q":"2 fatias"},{"n":"Açúcar","q":"1.5 colher"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere abacaxi, gengibre e açúcar no shaker.\n2. Adicione hortelã, limão, cachaça e gelo e bata forte.\n3. Sirva sem coar no copo baixo.', E'1. Macere abacaxi, gengibre e açúcar no shaker.\n2. Adicione hortelã, limão, cachaça e gelo e bata forte.\n3. Sirva sem coar no copo baixo.', 'Caipirinha super aromática que combina doçura do abacaxi, frescor e gengibre.', 'Receita querida de festas brasileiras por entregar explosão de sabores naturais no copo.', 'Copo baixo', 'Macerado + shaker', 'Folha de abacaxi e hortelã', true, array['Autoral','Brasileiro','Tropical','Picante / Gengibre','Cachaça']::text[], 'caipi abacaxi, hortela e gengibre'),
('Green Apple Gin Fizz', 'Refrescantes', '[{"n":"Gin","q":"50 ml"},{"n":"Xarope de maçã verde","q":"20 ml"},{"n":"Limão","q":"20 ml (Siciliano)"},{"n":"Água com gás","q":"80 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata gin, xarope de maçã verde e limão siciliano com gelo.\n2. Coe para copo alto com gelo novo e complete com água com gás.', E'1. Bata gin, xarope de maçã verde e limão siciliano com gelo.\n2. Coe para copo alto com gelo novo e complete com água com gás.', 'Gin fizz refrescante e esverdeado com acidez crocante de maçã verde.', 'Releitura refrescante do clássico Gin Fizz que conquista visualmente pela cor verde-clara.', 'Copo alto', 'Shaker + build', 'Fatia fina de maçã ou limão', true, array['Autoral','Refrescante','Cítrico / Ácido','Com soda / Tônica','Gin']::text[], 'green apple gin fizz'),
('Jesus Mule', 'Autorais', '[{"n":"Vodka","q":"50 ml"},{"n":"Xarope de gengibre","q":"15 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Guaraná","q":"100 ml"},{"n":"Hortelã","q":"4 folhas"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha a caneca com gelo.\n2. Adicione vodka, xarope de gengibre e limão.\n3. Complete com guaraná bem gelado e decore com hortelã e limão.', E'1. Encha a caneca com gelo.\n2. Adicione vodka, xarope de gengibre e limão.\n3. Complete com guaraná bem gelado e decore com hortelã e limão.', 'Moscow Mule abrasileirado com guaraná gelado no lugar da água com gás.', 'Brincadeira criativa de balcão brasileiro que substitui o gás neutro pelo guaraná doce e aromático.', 'Caneca / Copo alto', 'Montado na caneca', 'Rodela de limão e hortelã', false, array['Autoral','Brasileiro','Picante / Gengibre','Doce','Vodka']::text[], 'jesus mule'),
('Curupira Reverso', 'Brasileiríssimos', '[{"n":"Cachaça","q":"50 ml (Prata)"},{"n":"Hortelã","q":"10 folhas"},{"n":"Xarope de gengibre","q":"20 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Macere suavemente a hortelã com xarope de gengibre.\n2. Adicione cachaça e limão, bata forte com gelo e coe duas vezes sobre gelo novo.', E'1. Macere suavemente a hortelã com xarope de gengibre.\n2. Adicione cachaça e limão, bata forte com gelo e coe duas vezes sobre gelo novo.', 'Verde-mata intenso e herbáceo unindo cachaça, hortelã e gengibre.', 'Batizado em homenagem ao folclore brasileiro — refrescante na entrada, marcante na saída.', 'Copo baixo', 'Macerado + shaker', 'Ramo de hortelã', true, array['Autoral','Brasileiro','Herbal / Hortelã','Picante / Gengibre','Cachaça']::text[], 'curupira reverso'),
('Raio de Sol Salgado', 'Cítricos', '[{"n":"Cachaça","q":"50 ml (Prata)"},{"n":"Maracujá","q":"1 fruta"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Sal","q":"1 pitada"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Coloque polpa de maracujá, cachaça, limão, xarope e uma pitada de sal na coqueteleira.\n2. Bata forte com gelo e coe sobre cubo novo.', E'1. Coloque polpa de maracujá, cachaça, limão, xarope e uma pitada de sal na coqueteleira.\n2. Bata forte com gelo e coe sobre cubo novo.', 'Maracujá fresco e cachaça despertados por uma pitada mágica de sal.', 'Truque de mixologia que prova como uma pitada de sal abre o aroma e reduz o amargor do maracujá.', 'Copo baixo', 'Shaker', 'Casca de limão', true, array['Autoral','Brasileiro','Tropical','Cítrico / Ácido','Cachaça']::text[], 'raio de sol salgado'),
('Eclipse Verde', 'Autorais', '[{"n":"Cachaça","q":"50 ml (Prata)"},{"n":"Xarope de maçã verde","q":"25 ml"},{"n":"Xarope de gengibre","q":"15 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Água com gás","q":"60 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata cachaça, xaropes de maçã verde e gengibre e limão com gelo.\n2. Coe para copo alto com gelo novo e complete com água com gás.', E'1. Bata cachaça, xaropes de maçã verde e gengibre e limão com gelo.\n2. Coe para copo alto com gelo novo e complete com água com gás.', 'Contraste vibrante de maçã verde ácida, gengibre e cachaça prata.', 'Criado para quem gosta de drinks verdes vibrantes com final picante e efervescente.', 'Copo alto', 'Shaker + build', 'Fatia de limão', true, array['Autoral','Refrescante','Picante / Gengibre','Cachaça']::text[], 'eclipse verde'),
('Sertão Doce', 'Cítricos', '[{"n":"Cachaça","q":"50 ml (Prata)"},{"n":"Abacaxi","q":"50 g"},{"n":"Maracujá","q":"0.5 fruta"},{"n":"Xarope de gengibre","q":"10 ml"},{"n":"Sal","q":"1 pitada"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Macere o abacaxi no fundo do shaker.\n2. Adicione maracujá, cachaça, gengibre e sal e bata com gelo.\n3. Coe duas vezes sobre gelo novo.', E'1. Macere o abacaxi no fundo do shaker.\n2. Adicione maracujá, cachaça, gengibre e sal e bata com gelo.\n3. Coe duas vezes sobre gelo novo.', 'Abacaxi doce, maracujá ácido e pitada de sal em tributo ao Nordeste.', 'Inspirado no contraste salgado-doce da culinária sertaneja com frutas tropicais.', 'Copo baixo', 'Macerado + shaker', 'Fatia de abacaxi', true, array['Autoral','Brasileiro','Tropical','Cítrico / Ácido','Cachaça']::text[], 'sertao doce'),
('Engenho Velho', 'Fortes', '[{"n":"Cachaça","q":"60 ml (Ouro)"},{"n":"Xarope de açúcar","q":"10 ml"},{"n":"Vermute","q":"15 ml (Tinto)"},{"n":"Gelo","q":"1 cubo grande"}]'::jsonb, E'1. Misture cachaça ouro, vermute tinto e xarope de açúcar com cubo grande de gelo.\n2. Mexa lentamente por 25 segundos até resfriar bem.', E'1. Misture cachaça ouro, vermute tinto e xarope de açúcar com cubo grande de gelo.\n2. Mexa lentamente por 25 segundos até resfriar bem.', 'Curto, encorpado e amadeirado: cachaça ouro arredondada com vermute.', 'Homenagem aos alambiques antigos onde a cachaça descansa em madeira brasileira.', 'Old fashioned', 'Mexido no copo', 'Casca de limão ou laranja', false, array['Autoral','Brasileiro','Forte','Curto','Cachaça']::text[], 'engenho velho'),
('Beira-Mar', 'Refrescantes', '[{"n":"Cachaça","q":"45 ml (Prata)"},{"n":"Limão","q":"20 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Água tônica","q":"90 ml"},{"n":"Sal","q":"1 pitada"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Dissolva uma pitada de sal no xarope com suco de limão siciliano na taça.\n2. Encha de gelo, adicione cachaça prata e complete com água tônica.', E'1. Dissolva uma pitada de sal no xarope com suco de limão siciliano na taça.\n2. Encha de gelo, adicione cachaça prata e complete com água tônica.', 'Seco, salgadinho como maresia e refrescante com limão siciliano e tônica.', 'Tônica de cachaça criada para dias quentes à beira da piscina ou do mar.', 'Taça balão', 'Montado na taça', 'Casca de limão siciliano', false, array['Autoral','Brasileiro','Refrescante','Com soda / Tônica','Cachaça']::text[], 'beira-mar'),
('Cobre Líquido', 'Fortes', '[{"n":"Rum","q":"50 ml (Branco)"},{"n":"Vermute","q":"25 ml (Tinto)"},{"n":"Xarope de gengibre","q":"7 ml"},{"n":"Gelo","q":"1 cubo grande"}]'::jsonb, E'1. Mexa rum, vermute tinto e toque de xarope de gengibre com gelo por 25 segundos.\n2. Coe sobre gelo grande no copo baixo.', E'1. Mexa rum, vermute tinto e toque de xarope de gengibre com gelo por 25 segundos.\n2. Coe sobre gelo grande no copo baixo.', 'Rum aveludado com vermute tinto e sutil calor picante de gengibre.', 'Variação enxuta e elegante inspirada nos alambiques de cobre caribenhos.', 'Old fashioned', 'Mexido', 'Casca de limão', false, array['Autoral','Forte','Curto','Rum']::text[], 'cobre liquido'),
('Oásis', 'Refrescantes', '[{"n":"Rum","q":"50 ml (Branco)"},{"n":"Maracujá","q":"1 fruta"},{"n":"Hortelã","q":"10 folhas"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Água com gás","q":"50 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Pressione suavemente hortelã, polpa de maracujá e xarope no fundo do copo.\n2. Adicione rum, limão, gelo e complete com água com gás.', E'1. Pressione suavemente hortelã, polpa de maracujá e xarope no fundo do copo.\n2. Adicione rum, limão, gelo e complete com água com gás.', 'Mojito tropical de maracujá fresco com aroma refrescante de hortelã.', 'Receita refrescante de verão que combina o melhor do Mojito com a acidez do maracujá.', 'Copo alto', 'Macerado + build', 'Ramo de hortelã', false, array['Autoral','Refrescante','Tropical','Herbal / Hortelã','Rum']::text[], 'oasis'),
('Tempestade Amarela', 'Refrescantes', '[{"n":"Rum","q":"50 ml (Branco)"},{"n":"Xarope de gengibre","q":"25 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Água com gás","q":"90 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha o copo alto com gelo.\n2. Adicione rum, xarope de gengibre e limão e complete com água com gás.', E'1. Encha o copo alto com gelo.\n2. Adicione rum, xarope de gengibre e limão e complete com água com gás.', 'Versão clara e dourada do Dark ’n’ Stormy com rum branco e gengibre.', 'Direto, picante e refrescante para quem ama drinks com gengibre no estoque da casa.', 'Copo alto', 'Montado no copo', 'Rodela de limão', false, array['Refrescante','Picante / Gengibre','Longo','Rum']::text[], 'tempestade amarela'),
('Maré Alta', 'Refrescantes', '[{"n":"Rum","q":"45 ml (Branco)"},{"n":"Limão","q":"15 ml (Siciliano)"},{"n":"Água tônica","q":"110 ml"},{"n":"Hortelã","q":"6 folhas"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Pressione a hortelã levemente na taça ou copo alto.\n2. Encha de gelo, adicione rum e limão siciliano e complete com tônica.', E'1. Pressione a hortelã levemente na taça ou copo alto.\n2. Encha de gelo, adicione rum e limão siciliano e complete com tônica.', 'Rum leve com hortelã, limão siciliano e frescor amargo de tônica.', 'Alternativa praiana ao Gin Tônica que surpreende pela leveza aromática do rum branco.', 'Copo alto', 'Montado no copo', 'Folha de hortelã', false, array['Refrescante','Com soda / Tônica','Herbal / Hortelã','Rum']::text[], 'mare alta'),
('Old Fashioned Tropical', 'Fortes', '[{"n":"Rum","q":"40 ml (Branco)"},{"n":"Conhaque","q":"20 ml"},{"n":"Abacaxi","q":"45 g"},{"n":"Xarope de açúcar","q":"10 ml"},{"n":"Gelo","q":"1 cubo grande"}]'::jsonb, E'1. Macere suavemente o abacaxi com o xarope no copo ou mixing glass.\n2. Adicione rum, conhaque e gelo, mexa por 25s e coe sobre cubo grande.', E'1. Macere suavemente o abacaxi com o xarope no copo ou mixing glass.\n2. Adicione rum, conhaque e gelo, mexa por 25s e coe sobre cubo grande.', 'Rum e conhaque arredondados com doçura frutada de abacaxi.', 'Ponte entre a coquetelaria clássica de bar de madeira e o frescor tropical.', 'Old fashioned', 'Macerado + mexido', 'Abacaxi desidratado ou fresco', false, array['Autoral','Forte','Curto','Rum','Conhaque']::text[], 'old fashioned tropical'),
('Trovoada de Abacaxi', 'Refrescantes', '[{"n":"Cachaça","q":"45 ml (Prata)"},{"n":"Abacaxi","q":"60 g"},{"n":"Xarope de gengibre","q":"15 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Hortelã","q":"5 folhas"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Macere abacaxi e hortelã no fundo da coqueteleira.\n2. Adicione cachaça, gengibre e limão, bata com gelo e coe sobre gelo novo.', E'1. Macere abacaxi e hortelã no fundo da coqueteleira.\n2. Adicione cachaça, gengibre e limão, bata com gelo e coe sobre gelo novo.', 'Abacaxi doce, picância de gengibre e cachaça prata em copo baixo.', 'Um dos destaques tropicais da casa por entregar fruta fresca com contraste picante.', 'Copo baixo', 'Macerado + shaker', 'Folha de hortelã', true, array['Autoral','Tropical','Picante / Gengibre','Cachaça']::text[], 'trovoada de abacaxi'),
('Coral Tropical', 'Refrescantes', '[{"n":"Cachaça","q":"45 ml (Prata)"},{"n":"Maracujá","q":"1 fruta"},{"n":"Xarope de groselha","q":"10 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Água tônica","q":"80 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Coloque polpa de maracujá e muito gelo na taça balão.\n2. Adicione cachaça, limão e groselha e complete com água tônica.', E'1. Coloque polpa de maracujá e muito gelo na taça balão.\n2. Adicione cachaça, limão e groselha e complete com água tônica.', 'Maracujá, groselha e tônica em tons alaranjados de recife de coral.', 'Leve, colorido e perfeito para fotos ao sol ou em mesas externas.', 'Taça balão', 'Montado na taça', 'Meia casca de maracujá', false, array['Autoral','Tropical','Com soda / Tônica','Cachaça']::text[], 'coral tropical'),
('Garoa Gelada', 'Refrescantes', '[{"n":"Cachaça","q":"50 ml (Prata)"},{"n":"Refrigerante de limão","q":"100 ml"},{"n":"Xarope de groselha","q":"10 ml"},{"n":"Limão","q":"10 ml (Taiti)"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha um copo alto com gelo.\n2. Despeje cachaça prata, limão e groselha e complete com refrigerante de limão.', E'1. Encha um copo alto com gelo.\n2. Despeje cachaça prata, limão e groselha e complete com refrigerante de limão.', 'Refrescante, rosado e fácil de beber com refrigerante de limão e cachaça.', 'Inspirado nas tardes de chuva fina em São Paulo — simples no preparo, marcante na cor.', 'Copo alto', 'Montado no copo', 'Rodela de limão', false, array['Autoral','Brasileiro','Refrescante','Longo','Cachaça']::text[], 'garoa gelada'),
('Brandy Fix', 'Cítricos', '[{"n":"Conhaque","q":"50 ml"},{"n":"Abacaxi","q":"45 g"},{"n":"Limão","q":"20 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Gelo","q":"triturado"}]'::jsonb, E'1. Macere o abacaxi com xarope e limão.\n2. Adicione conhaque e gelo, bata rápido e sirva sobre gelo triturado.', E'1. Macere o abacaxi com xarope e limão.\n2. Adicione conhaque e gelo, bata rápido e sirva sobre gelo triturado.', 'Clássico oitocentista de conhaque batido com abacaxi e limão no gelo picado.', 'Documentado por Jerry Thomas em 1862 como um dos “Fixes” refrescantes de verão antes da invenção das geladeiras modernas.', 'Copo baixo', 'Macerado + shaker', 'Fatia de abacaxi e hortelã', true, array['Clássico','Cítrico / Ácido','Frutado','Conhaque']::text[], 'brandy fix'),
('Vodka Rickey', 'Refrescantes', '[{"n":"Vodka","q":"50 ml"},{"n":"Limão","q":"25 ml (Taiti)"},{"n":"Água com gás","q":"120 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha um copo alto com gelo.\n2. Esprema o limão fresco e solte a casca dentro.\n3. Adicione vodka e complete com água com gás.', E'1. Encha um copo alto com gelo.\n2. Esprema o limão fresco e solte a casca dentro.\n3. Adicione vodka e complete com água com gás.', 'Levíssimo, zero açúcar e cristalino: vodka, limão fresco e gás.', 'Variação contemporânea do clássico Rickey de 1880 para quem busca drink bem seco e pouco calórico.', 'Copo alto', 'Montado no copo', 'Meio limão taiti', false, array['Refrescante','Cítrico / Ácido','Com soda / Tônica','Vodka']::text[], 'vodka rickey'),
('Blue Lagoon', 'Doces & Frutados', '[{"n":"Vodka","q":"45 ml"},{"n":"Curaçau Blue","q":"20 ml"},{"n":"Refrigerante de limão","q":"120 ml"},{"n":"Limão","q":"15 ml (Siciliano)"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha um copo alto com gelo.\n2. Despeje vodka, Curaçau Blue e suco de limão.\n3. Complete com refrigerante de limão e mexa leve.', E'1. Encha um copo alto com gelo.\n2. Despeje vodka, Curaçau Blue e suco de limão.\n3. Complete com refrigerante de limão e mexa leve.', 'Azul vibrante tropical com sabor cítrico doce de laranja curaçau.', 'Criado em Paris nos anos 1960 por Andy MacElhone no Harry’s New York Bar — o drink azul mais famoso do planeta.', 'Copo alto / Hurricane', 'Montado no copo', 'Rodela de limão e cereja', false, array['Clássico','Doce','Refrescante','Longo','Vodka']::text[], 'blue lagoon'),
('Grasshopper', 'Doces & Frutados', '[{"n":"Licor de hortelã","q":"30 ml (Verde)"},{"n":"Licor de cacau","q":"30 ml (Branco)"},{"n":"Creme de leite","q":"30 ml"},{"n":"Chocolate ralado","q":"1 pitada"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata partes iguais de licor de menta verde, licor de cacau e creme de leite com gelo por 15s.\n2. Coe para taça coupe gelada e polvilhe chocolate.', E'1. Bata partes iguais de licor de menta verde, licor de cacau e creme de leite com gelo por 15s.\n2. Coe para taça coupe gelada e polvilhe chocolate.', 'Sobremesa líquida verde-menta com cacau branco e creme de leite.', 'Criado por Philibert Guichet Jr. no Tujague’s em Nova Orleans por volta de 1918 — sabor nostálgico de chocolate com menta.', 'Taça Coupe', 'Shaker vigoroso', 'Raspas de chocolate', true, array['Clássico','Cremoso','Doce','Herbal / Hortelã']::text[], 'grasshopper'),
('Mudslide', 'Doces & Frutados', '[{"n":"Vodka","q":"30 ml"},{"n":"Licor de café","q":"30 ml"},{"n":"Licor de creme (Baileys)","q":"30 ml"},{"n":"Creme de leite","q":"30 ml"},{"n":"Calda de chocolate","q":"10 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Decore a taça internamente com calda de chocolate.\n2. Bata vodka, licor de café, Baileys e creme de leite com gelo e coe.', E'1. Decore a taça internamente com calda de chocolate.\n2. Bata vodka, licor de café, Baileys e creme de leite com gelo e coe.', 'Café, creme irlandês Baileys, vodka e calda de chocolate em taça sedosa.', 'Nascido nos anos 1970 no Wreck Bar das Ilhas Cayman como uma variação de White Russian com Baileys.', 'Taça Coupe / Copo baixo', 'Shaker', 'Raspas e calda de chocolate', true, array['Clássico','Cremoso','Doce','Vodka']::text[], 'mudslide'),
('Chocolate Martini', 'Doces & Frutados', '[{"n":"Vodka","q":"45 ml"},{"n":"Licor de cacau","q":"25 ml"},{"n":"Licor de creme (Baileys)","q":"25 ml"},{"n":"Calda de chocolate","q":"10 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Faça desenhos com calda de chocolate na taça martini gelada.\n2. Bata vodka, licor de cacau e Baileys com muito gelo e coe.', E'1. Faça desenhos com calda de chocolate na taça martini gelada.\n2. Bata vodka, licor de cacau e Baileys com muito gelo e coe.', 'Martini cremoso e achocolatado feito para encerrar a noite em grande estilo.', 'Clássico das cartas de sobremesa americanas desde os anos 1990 pela textura veludosa.', 'Taça Martini', 'Shaker', 'Calda e raspas de chocolate', true, array['Cremoso','Doce','Vodka']::text[], 'chocolate martini'),
('Woo Woo', 'Doces & Frutados', '[{"n":"Vodka","q":"45 ml"},{"n":"Licor de pêssego","q":"25 ml"},{"n":"Suco de cranberry","q":"90 ml"},{"n":"Limão","q":"1 gomo"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata ou misture vodka, licor de pêssego e suco de cranberry com muito gelo.\n2. Sirva em copo alto ou taça com gomo de limão.', E'1. Bata ou misture vodka, licor de pêssego e suco de cranberry com muito gelo.\n2. Sirva em copo alto ou taça com gomo de limão.', 'Pêssego doce e cranberry vibrante: primo irmão do Sex on the Beach.', 'Hit dos bares universitários e clubes dos anos 1980 em Nova York — batizado pelos brindes animados do restaurante Woo Woo.', 'Copo alto', 'Montado ou shaker', 'Gomo de limão', false, array['Clássico','Frutado','Doce','Longo','Vodka']::text[], 'woo woo'),
('Bay Breeze', 'Doces & Frutados', '[{"n":"Vodka","q":"45 ml"},{"n":"Suco de cranberry","q":"60 ml"},{"n":"Suco de abacaxi","q":"60 ml"},{"n":"Limão","q":"1 gomo"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha um copo alto com gelo.\n2. Despeje vodka, suco de cranberry e suco de abacaxi e mexa leve.', E'1. Encha um copo alto com gelo.\n2. Despeje vodka, suco de cranberry e suco de abacaxi e mexa leve.', 'Versão tropical do Sea Breeze trocando a toranja por abacaxi espumoso.', 'Clássico de resort havaiano muito popular pela leveza frutada e zero amargor.', 'Copo alto', 'Montado no copo', 'Rodela de limão ou abacaxi', false, array['Clássico','Frutado','Tropical','Refrescante','Vodka']::text[], 'bay breeze'),
('Harvey Wallbanger', 'Doces & Frutados', '[{"n":"Vodka","q":"45 ml"},{"n":"Suco de laranja","q":"110 ml"},{"n":"Galliano","q":"15 ml"},{"n":"Laranja","q":"1 rodela"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Misture vodka e suco de laranja sobre gelo em copo alto.\n2. Flutue o licor italiano Galliano (baunilha e anis) por cima.', E'1. Misture vodka e suco de laranja sobre gelo em copo alto.\n2. Flutue o licor italiano Galliano (baunilha e anis) por cima.', 'Screwdriver perfumado no topo pelo toque herbáceo-baunilha do Galliano.', 'Lenda californiana de 1952 sobre um surfista chamado Harvey que batia na parede do bar após derrotas nas ondas.', 'Copo alto', 'Montado + float', 'Rodela de laranja e cereja', false, array['Clássico','Frutado','Doce','Vodka']::text[], 'harvey wallbanger'),
('Strawberry Smash', 'Doces & Frutados', '[{"n":"Gin","q":"50 ml"},{"n":"Morango","q":"4 unid"},{"n":"Limão","q":"20 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Hortelã","q":"6 folhas"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere morangos e hortelã com xarope na coqueteleira.\n2. Adicione gin, limão siciliano e gelo e bata forte.\n3. Coe sobre gelo novo.', E'1. Macere morangos e hortelã com xarope na coqueteleira.\n2. Adicione gin, limão siciliano e gelo e bata forte.\n3. Coe sobre gelo novo.', 'Morangos frescos esmagados com gin botânico, siciliano e hortelã.', 'Smash frutado clássico de primavera que faz enorme sucesso em jardins e rooftops.', 'Copo baixo', 'Macerado + shaker', 'Morango e ramo de hortelã', true, array['Frutado','Refrescante','Herbal / Hortelã','Gin']::text[], 'strawberry smash'),
('Mojito de Morango', 'Doces & Frutados', '[{"n":"Rum","q":"50 ml (Branco)"},{"n":"Morango","q":"4 unid"},{"n":"Hortelã","q":"8 folhas"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Água com gás","q":"60 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere suavemente morangos, hortelã, limão e xarope no fundo do copo.\n2. Adicione rum e gelo e complete com água com gás.', E'1. Macere suavemente morangos, hortelã, limão e xarope no fundo do copo.\n2. Adicione rum e gelo e complete com água com gás.', 'O clássico Mojito cubano tingido de vermelho com morangos frescos.', 'Uma das variações mais populares dos bares de praia do mundo inteiro.', 'Copo alto', 'Macerado + build', 'Morango fatiado e hortelã', false, array['Frutado','Refrescante','Herbal / Hortelã','Rum']::text[], 'mojito de morango'),
('Mojito de Abacaxi', 'Doces & Frutados', '[{"n":"Rum","q":"50 ml (Branco)"},{"n":"Abacaxi","q":"60 g"},{"n":"Hortelã","q":"8 folhas"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Água com gás","q":"60 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere o abacaxi com xarope e limão; pressione a hortelã.\n2. Adicione rum, muito gelo e complete com água com gás.', E'1. Macere o abacaxi com xarope e limão; pressione a hortelã.\n2. Adicione rum, muito gelo e complete com água com gás.', 'Mojito ensolarado com pedaços frescos de abacaxi macerado.', 'Mistura tropical caribenha que amplifica o frescor da hortelã com doçura natural da fruta.', 'Copo alto', 'Macerado + build', 'Fatia de abacaxi e hortelã', false, array['Tropical','Refrescante','Herbal / Hortelã','Rum']::text[], 'mojito de abacaxi'),
('Piña Sem Coco Frozen', 'Frozen', '[{"n":"Rum","q":"50 ml (Branco)"},{"n":"Abacaxi","q":"120 g"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Hortelã","q":"6 folhas"},{"n":"Gelo","q":"150 g"}]'::jsonb, E'1. Bata rum, abacaxi em cubos, limão, xarope, hortelã e bastante gelo no liquidificador até ficar cremoso.\n2. Sirva em taça grande.', E'1. Bata rum, abacaxi em cubos, limão, xarope, hortelã e bastante gelo no liquidificador até ficar cremoso.\n2. Sirva em taça grande.', 'Piña colada sem coco: abacaxi gelado batido com rum e hortelã fresca.', 'Criação da Campos House para quem não curte coco: a cremosidade nasce do próprio abacaxi batido com gelo.', 'Taça Hurricane', 'Batido (blend)', 'Folha de abacaxi e hortelã', false, array['Autoral','Frozen','Tropical','Refrescante','Rum']::text[], 'pina sem coco frozen'),
('Strawberry Daiquiri', 'Frozen', '[{"n":"Rum","q":"50 ml (Branco)"},{"n":"Morango","q":"5 unid"},{"n":"Xarope de morango","q":"20 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Gelo","q":"150 g"}]'::jsonb, E'1. Bata rum, morangos, xarope de morango, limão e bastante gelo no liquidificador até formar raspadinha cremosa.\n2. Sirva em taça hurricane.', E'1. Bata rum, morangos, xarope de morango, limão e bastante gelo no liquidificador até formar raspadinha cremosa.\n2. Sirva em taça hurricane.', 'O frozen de morango clássico dos resorts com rum branco e limão.', 'Versão congelada e festiva do Daiquiri clássico que dominou os balcões tropicais desde os anos 1950.', 'Taça Hurricane', 'Batido (blend)', 'Morango na borda', false, array['Clássico','Frozen','Frutado','Doce','Rum']::text[], 'strawberry daiquiri'),
('Frozen Margarita', 'Frozen', '[{"n":"Tequila","q":"50 ml (Prata)"},{"n":"Triple Sec","q":"25 ml"},{"n":"Limão","q":"25 ml (Taiti)"},{"n":"Xarope de açúcar","q":"10 ml"},{"n":"Sal","q":"na borda"},{"n":"Gelo","q":"150 g"}]'::jsonb, E'1. Passe sal em meia borda da taça margarita.\n2. Bata tequila, Triple Sec, limão, xarope e gelo no liquidificador até virar creme gelado.', E'1. Passe sal em meia borda da taça margarita.\n2. Bata tequila, Triple Sec, limão, xarope e gelo no liquidificador até virar creme gelado.', 'Margarita em textura de sorbet gelado com borda de sal.', 'Imortalizada por Mariano Martinez em Dallas em 1971 ao adaptar uma máquina de sorvete para servir Margaritas congeladas.', 'Taça Margarita', 'Batido (blend)', 'Meia borda de sal e limão', false, array['Clássico','Frozen','Cítrico / Ácido','Tequila']::text[], 'frozen margarita'),
('Frozen Strawberry Margarita', 'Frozen', '[{"n":"Tequila","q":"50 ml (Prata)"},{"n":"Morango","q":"5 unid"},{"n":"Triple Sec","q":"20 ml"},{"n":"Limão","q":"25 ml (Taiti)"},{"n":"Sal","q":"na borda"},{"n":"Gelo","q":"150 g"}]'::jsonb, E'1. Bata tequila, morangos, Triple Sec, limão e bastante gelo no liquidificador.\n2. Sirva na taça margarita com borda de sal ou açúcar.', E'1. Bata tequila, morangos, Triple Sec, limão e bastante gelo no liquidificador.\n2. Sirva na taça margarita com borda de sal ou açúcar.', 'Sorbet rosado de morango com tequila e corte ácido de limão.', 'A variação mais fotogênica e pedida da Margarita Frozen em bares mexicanos e rooftops.', 'Taça Margarita', 'Batido (blend)', 'Morango e rodela de limão', false, array['Frozen','Frutado','Doce','Tequila']::text[], 'frozen strawberry margarita'),
('Miami Vice', 'Frozen', '[{"n":"Rum","q":"60 ml (Branco)"},{"n":"Morango","q":"4 unid"},{"n":"Suco de abacaxi","q":"60 ml"},{"n":"Creme de coco","q":"30 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Gelo","q":"180 g"}]'::jsonb, E'1. Bata metade do rum com suco de abacaxi, creme de coco e gelo (Piña Colada).\n2. Bata a outra metade com morangos, limão e gelo (Strawberry Daiquiri) e monte em camadas na taça.', E'1. Bata metade do rum com suco de abacaxi, creme de coco e gelo (Piña Colada).\n2. Bata a outra metade com morangos, limão e gelo (Strawberry Daiquiri) e monte em camadas na taça.', 'Metade Piña Colada, metade Strawberry Daiquiri num visual bicolor icônico.', 'Nascido nas praias de Miami nos anos 1980 em homenagem à série policial homônima — impossível passar despercebido.', 'Taça Hurricane', 'Duplo blend em camadas', 'Morango e fatia de abacaxi', false, array['Clássico','Frozen','Tropical','Cremoso','Rum']::text[], 'miami vice'),
('Frozen Aperol Spritz', 'Frozen', '[{"n":"Aperol","q":"50 ml"},{"n":"Prosecco","q":"60 ml"},{"n":"Suco de laranja","q":"40 ml"},{"n":"Xarope de açúcar","q":"10 ml"},{"n":"Gelo","q":"140 g"}]'::jsonb, E'1. Bata Aperol, suco de laranja, xarope e gelo no liquidificador até textura slush.\n2. Despeje na taça e finalize com Prosecco gelado.', E'1. Bata Aperol, suco de laranja, xarope e gelo no liquidificador até textura slush.\n2. Despeje na taça e finalize com Prosecco gelado.', 'Versão raspadinha alaranjada do Aperol Spritz coroada com Prosecco.', 'Tendência dos verões europeus e rooftops modernos para refrescar os dias mais quentes.', 'Taça de vinho', 'Blend + top de Prosecco', 'Rodela de laranja', false, array['Frozen','Amargo','Refrescante','Vermute & Aperitivos']::text[], 'frozen aperol spritz'),
('Frosé', 'Frozen', '[{"n":"Espumante","q":"120 ml (Rosé)"},{"n":"Morango","q":"5 unid"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Limão","q":"15 ml (Siciliano)"},{"n":"Gelo","q":"140 g"}]'::jsonb, E'1. Bata espumante ou vinho rosé gelado com morangos, xarope, limão siciliano e gelo no liquidificador.\n2. Sirva imediatamente em taça de vinho.', E'1. Bata espumante ou vinho rosé gelado com morangos, xarope, limão siciliano e gelo no liquidificador.\n2. Sirva imediatamente em taça de vinho.', 'Slushie rosado de espumante ou vinho rosé com morangos e limão siciliano.', 'Criado no Bar Primi em Nova York em 2016 e viralizado como o drink oficial do verão internacional.', 'Taça de vinho', 'Batido (blend)', 'Morango fresco', false, array['Clássico','Frozen','Frutado','Refrescante']::text[], 'frose'),
('Frozen Mango Daiquiri', 'Frozen', '[{"n":"Rum","q":"50 ml (Branco)"},{"n":"Manga","q":"120 g (madura)"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Gelo","q":"150 g"}]'::jsonb, '1. Bata rum branco, manga em cubos, limão, xarope e gelo no liquidificador até ficar liso e dourado.', '1. Bata rum branco, manga em cubos, limão, xarope e gelo no liquidificador até ficar liso e dourado.', 'Creme dourado e gelado de manga madura com rum branco e limão.', 'Clássico dos bares caribenhos que valoriza a textura naturalmente aveludada da manga.', 'Taça Hurricane', 'Batido (blend)', 'Fatia de manga e hortelã', false, array['Frozen','Tropical','Frutado','Rum']::text[], 'frozen mango daiquiri'),
('Lava Flow', 'Frozen', '[{"n":"Rum","q":"50 ml (Branco)"},{"n":"Morango","q":"4 unid"},{"n":"Creme de coco","q":"35 ml"},{"n":"Suco de abacaxi","q":"60 ml"},{"n":"Gelo","q":"160 g"}]'::jsonb, E'1. Bata morangos com metade do rum no fundo da taça.\n2. Bata o restante do rum com abacaxi, creme de coco e gelo e despeje sobre a base vermelha para criar rios de lava.', E'1. Bata morangos com metade do rum no fundo da taça.\n2. Bata o restante do rum com abacaxi, creme de coco e gelo e despeje sobre a base vermelha para criar rios de lava.', 'Erupção havaiana de Piña Colada atravessada por veios vermelhos de morango.', 'Clássico dos resorts do Havaí onde a camada cremosa encontra o purê de morango formando efeito vulcânico.', 'Taça Hurricane', 'Blend em camadas', 'Abacaxi e guarda-chuva', false, array['Frozen','Tropical','Cremoso','Rum']::text[], 'lava flow'),
('Frozen Mudslide', 'Frozen', '[{"n":"Vodka","q":"30 ml"},{"n":"Licor de café","q":"30 ml"},{"n":"Licor de creme (Baileys)","q":"30 ml"},{"n":"Sorvete de baunilha","q":"1 bola"},{"n":"Calda de chocolate","q":"15 ml"},{"n":"Gelo","q":"100 g"}]'::jsonb, E'1. Bata vodka, licor de café, Baileys, sorvete de baunilha e gelo no liquidificador.\n2. Sirva em taça riscada com calda de chocolate.', E'1. Bata vodka, licor de café, Baileys, sorvete de baunilha e gelo no liquidificador.\n2. Sirva em taça riscada com calda de chocolate.', 'Milkshake alcoólico indulgente de café, Baileys, vodka e sorvete.', 'Sobremesa icônica das casas praianas americanas desde os anos 1980.', 'Taça Hurricane', 'Batido (blend)', 'Calda de chocolate e chantilly', false, array['Frozen','Cremoso','Doce','Vodka']::text[], 'frozen mudslide'),
('Red Bomb', 'Energéticos', '[{"n":"Vodka","q":"50 ml"},{"n":"Xarope de groselha","q":"15 ml"},{"n":"Xarope de morango","q":"10 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Energético","q":"120 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha um copo alto com gelo.\n2. Adicione vodka, groselha, xarope de morango e limão e complete com energético gelado.', E'1. Encha um copo alto com gelo.\n2. Adicione vodka, groselha, xarope de morango e limão e complete com energético gelado.', 'Explosão vermelha de pista unindo morango, groselha, limão e energético.', 'Hit de pista da Campos House feito para manter a cor rubi vibrante e o frescor cítrico.', 'Copo alto', 'Montado no copo', 'Morango ou rodela de limão', false, array['Autoral','Energético','Frutado','Vodka']::text[], 'red bomb'),
('Gin Energy Sunrise', 'Energéticos', '[{"n":"Gin","q":"50 ml"},{"n":"Suco de laranja","q":"50 ml"},{"n":"Xarope de groselha","q":"15 ml"},{"n":"Energético","q":"100 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Coloque gelo, gin, suco de laranja e energético no copo alto.\n2. Despeje groselha pela parede para formar efeito degradê.', E'1. Coloque gelo, gin, suco de laranja e energético no copo alto.\n2. Despeje groselha pela parede para formar efeito degradê.', 'Gin com suco de laranja, energético e fundo rubi solar.', 'Inspirado no Tequila Sunrise para virar um long drink de festa cheio de energia.', 'Copo alto', 'Montado em camadas', 'Rodela de laranja', false, array['Autoral','Energético','Frutado','Gin']::text[], 'gin energy sunrise'),
('Combustão Rubi', 'Energéticos', '[{"n":"Vodka","q":"45 ml"},{"n":"Energético","q":"110 ml"},{"n":"Xarope de groselha","q":"15 ml"},{"n":"Morango","q":"1 unid"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Monte vodka e energético no copo alto com muito gelo.\n2. Despeje groselha e decore com morango.', E'1. Monte vodka e energético no copo alto com muito gelo.\n2. Despeje groselha e decore com morango.', 'Rubi brilhante e refrescante pensado para animar a pista.', 'Clássico direto de balada com visual escarlate marcante.', 'Copo alto', 'Montado no copo', 'Morango na borda', false, array['Energético','Doce','Longo','Vodka']::text[], 'combustao rubi'),
('Neon Verde', 'Energéticos', '[{"n":"Vodka","q":"45 ml"},{"n":"Energético","q":"110 ml"},{"n":"Xarope de maçã verde","q":"20 ml"},{"n":"Maçã","q":"1 fatia"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha o copo alto com gelo.\n2. Adicione vodka e xarope de maçã verde e complete com energético.', E'1. Encha o copo alto com gelo.\n2. Adicione vodka e xarope de maçã verde e complete com energético.', 'Verde elétrico com acidez adocicada de maçã verde e energético.', 'Drink de pista com brilho verde inconfundível pronto com o estoque base.', 'Copo alto', 'Montado no copo', 'Fatia de maçã verde', false, array['Energético','Frutado','Longo','Vodka']::text[], 'neon verde'),
('Trovão Tropical', 'Energéticos', '[{"n":"Rum","q":"45 ml (Branco)"},{"n":"Energético","q":"100 ml"},{"n":"Abacaxi","q":"50 g"},{"n":"Maracujá","q":"0.5 fruta"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere abacaxi e maracujá no fundo do copo.\n2. Encha de gelo, adicione rum e complete com energético.', E'1. Macere abacaxi e maracujá no fundo do copo.\n2. Encha de gelo, adicione rum e complete com energético.', 'Frutas tropicais maceradas turbinadas com rum e energético.', 'Energético frutado de verdade usando abacaxi e maracujá frescos.', 'Copo alto', 'Macerado + build', 'Fatia de abacaxi', false, array['Energético','Tropical','Rum']::text[], 'trovao tropical'),
('Cavalo Marinho', 'Energéticos', '[{"n":"Gin","q":"45 ml"},{"n":"Energético","q":"110 ml"},{"n":"Limão","q":"15 ml (Siciliano)"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha o copo alto com gelo.\n2. Adicione gin, suco de limão siciliano e complete com energético.', E'1. Encha o copo alto com gelo.\n2. Adicione gin, suco de limão siciliano e complete com energético.', 'Gin botânico com corte cítrico siciliano e energia vibrante.', 'Combinação limpa e refrescante para noites longas sem pesar no paladar.', 'Copo alto', 'Montado no copo', 'Rodela de limão siciliano', false, array['Energético','Cítrico / Ácido','Gin']::text[], 'cavalo marinho'),
('Raio Dourado', 'Energéticos', '[{"n":"Cachaça","q":"45 ml (Ouro)"},{"n":"Energético","q":"110 ml"},{"n":"Xarope de gengibre","q":"15 ml"},{"n":"Abacaxi","q":"1 triângulo"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha o copo alto com gelo.\n2. Adicione cachaça ouro e xarope de gengibre e complete com energético.', E'1. Encha o copo alto com gelo.\n2. Adicione cachaça ouro e xarope de gengibre e complete com energético.', 'Cachaça ouro com toque picante de gengibre e energético gelado.', 'Prova que cachaça amadeirada e gengibre formam um highball energético cheio de personalidade.', 'Copo alto', 'Montado no copo', 'Abacaxi', false, array['Energético','Picante / Gengibre','Brasileiro','Cachaça']::text[], 'raio dourado'),
('Jägerbomb', 'Energéticos', '[{"n":"Licor de ervas (Jägermeister)","q":"45 ml"},{"n":"Energético","q":"120 ml"}]'::jsonb, E'1. Despeje o energético bem gelado em copo largo.\n2. Sirva o shot de Jägermeister ao lado (ou submerso no momento do brinde).', E'1. Despeje o energético bem gelado em copo largo.\n2. Sirva o shot de Jägermeister ao lado (ou submerso no momento do brinde).', 'Clássico mundial de balada: licor alemão de 56 ervas e energético.', 'Presença obrigatória nas pistas europeias e americanas desde os anos 2000.', 'Copo + Shot', 'Bomb / Submerso', 'Sem guarnição', false, array['Clássico','Energético','Herbal / Hortelã']::text[], 'jagerbomb'),
('B-52', 'Shots', '[{"n":"Licor de café","q":"15 ml"},{"n":"Licor de creme (Baileys)","q":"15 ml"},{"n":"Cointreau","q":"15 ml"}]'::jsonb, E'1. Despeje licor de café no fundo do shot.\n2. Usando as costas de uma colher, flutue o Baileys no meio e o Cointreau no topo em três camadas distintas.', E'1. Despeje licor de café no fundo do shot.\n2. Usando as costas de uma colher, flutue o Baileys no meio e o Cointreau no topo em três camadas distintas.', 'Shot em três camadas perfeitas: café, creme irlandês e laranja.', 'Criado em 1977 no Alice’s Restaurant em Malibu — batizado pelo avião B-52 e pela banda B-52’s.', 'Shot', 'Em camadas', 'Camadas definidas', false, array['Clássico','Shot','Cremoso','Doce']::text[], 'b-52'),
('Green Tea Shot', 'Shots', '[{"n":"Whisky","q":"20 ml (Irish)"},{"n":"Licor de pêssego","q":"20 ml"},{"n":"Limão","q":"15 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"10 ml"},{"n":"Refrigerante de limão","q":"15 ml"}]'::jsonb, E'1. Bata whisky irlandês, licor de pêssego, limão e xarope com gelo.\n2. Coe para copo de shot e finalize com um splash de refrigerante de limão.', E'1. Bata whisky irlandês, licor de pêssego, limão e xarope com gelo.\n2. Coe para copo de shot e finalize com um splash de refrigerante de limão.', 'Não leva chá verde: whisky irlandês e pêssego com gosto surpreendente de chá gelado.', 'Criado nos bares da costa leste americana nos anos 2000 pela marca Jameson — o shot mais pedido dos EUA.', 'Shot', 'Shaker + splash', 'Espuma leve', true, array['Clássico','Shot','Frutado','Whisky']::text[], 'green tea shot'),
('Kamikaze', 'Shots', '[{"n":"Vodka","q":"25 ml"},{"n":"Triple Sec","q":"15 ml"},{"n":"Limão","q":"15 ml (Taiti)"}]'::jsonb, E'1. Bata vodka, Triple Sec e suco de limão fresco com bastante gelo.\n2. Coe bem gelado para o copo de shot.', E'1. Bata vodka, Triple Sec e suco de limão fresco com bastante gelo.\n2. Coe bem gelado para o copo de shot.', 'Shot clássico ácido e afiado de vodka, laranja e limão.', 'Nascido nos anos 1970 e registrado no Boston Bartender’s Guide — direto ao ponto.', 'Shot', 'Shaker', 'Gomo opcional de limão', true, array['Clássico','Shot','Cítrico / Ácido','Vodka']::text[], 'kamikaze'),
('Lemon Drop Shot', 'Shots', '[{"n":"Vodka","q":"30 ml"},{"n":"Limão","q":"15 ml (Siciliano)"},{"n":"Açúcar","q":"1 colher"}]'::jsonb, E'1. Bata vodka, limão siciliano e um pouco de açúcar (ou xarope) com gelo.\n2. Coe no shot e sirva com fatia de limão açucarada.', E'1. Bata vodka, limão siciliano e um pouco de açúcar (ou xarope) com gelo.\n2. Coe no shot e sirva com fatia de limão açucarada.', 'Doce e ácido na medida certa, como uma bala de limão gelada.', 'Versão shot do famoso coquetel californiano dos anos 1970, perfeito com a fatia de limão açucarada após o gole.', 'Shot', 'Shaker', 'Fatia de limão polvilhada com açúcar', true, array['Clássico','Shot','Cítrico / Ácido','Vodka']::text[], 'lemon drop shot'),
('Baby Guinness', 'Shots', '[{"n":"Licor de café","q":"30 ml"},{"n":"Licor de creme (Baileys)","q":"15 ml"}]'::jsonb, E'1. Encha dois terços do shot com licor de café.\n2. Flutue suavemente o Baileys sobre as costas de uma colher para parecer o colarinho de uma pint escura.', E'1. Encha dois terços do shot com licor de café.\n2. Flutue suavemente o Baileys sobre as costas de uma colher para parecer o colarinho de uma pint escura.', 'Miniatura visual de cerveja escura feita com café e creme irlandês.', 'Clássico dos pubs irlandeses e ingleses desde os anos 1980 pelo efeito visual idêntico ao pint da Guinness.', 'Shot', 'Em camadas', 'Colarinho cremoso', false, array['Clássico','Shot','Cremoso','Doce']::text[], 'baby guinness'),
('Mexican Candy Shot', 'Shots', '[{"n":"Tequila","q":"25 ml (Prata)"},{"n":"Xarope de melancia","q":"15 ml"},{"n":"Limão","q":"10 ml (Taiti)"},{"n":"Pimenta","q":"1 gota"},{"n":"Sal","q":"na borda"}]'::jsonb, E'1. Passe limão na borda do shot e encoste no sal com uma pitada de pimenta.\n2. Bata tequila, xarope de melancia, limão e gota de pimenta com gelo e coe.', E'1. Passe limão na borda do shot e encoste no sal com uma pitada de pimenta.\n2. Bata tequila, xarope de melancia, limão e gota de pimenta com gelo e coe.', 'Melancia doce, tequila, limão e ardor divertido inspirado nos doces mexicanos.', 'Hit nos bares texanos e mexicanos por replicar o famoso doce ácido-picante de melancia com chile.', 'Shot', 'Shaker', 'Borda salgada apimentada', true, array['Shot','Picante / Gengibre','Frutado','Tequila']::text[], 'mexican candy shot'),
('White Tea Shot', 'Shots', '[{"n":"Vodka","q":"20 ml"},{"n":"Licor de pêssego","q":"20 ml"},{"n":"Limão","q":"15 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"10 ml"},{"n":"Refrigerante de limão","q":"15 ml"}]'::jsonb, E'1. Bata vodka, licor de pêssego, limão siciliano e xarope com gelo.\n2. Coe no shot e finalize com um fio de refrigerante de limão.', E'1. Bata vodka, licor de pêssego, limão siciliano e xarope com gelo.\n2. Coe no shot e finalize com um fio de refrigerante de limão.', 'Irmão suave do Green Tea Shot feito com vodka, pêssego e siciliano.', 'Alternativa leve e frutada ao Green Tea Shot para quem prefere vodka ao whisky.', 'Shot', 'Shaker + splash', 'Sem guarnição', true, array['Shot','Frutado','Vodka']::text[], 'white tea shot'),
('Scooby Snack', 'Shots', '[{"n":"Licor de melão","q":"15 ml"},{"n":"Licor de coco","q":"15 ml"},{"n":"Suco de abacaxi","q":"15 ml"},{"n":"Creme de leite","q":"10 ml"}]'::jsonb, E'1. Bata todos os ingredientes com gelo na coqueteleira.\n2. Coe no shot bem cremoso e verde-claro.', E'1. Bata todos os ingredientes com gelo na coqueteleira.\n2. Coe no shot bem cremoso e verde-claro.', 'Shot cremoso verde-menta com sabor tropical de melão, coco e abacaxi.', 'Clássico divertido das casas de festa americanas pelo sabor que lembra sobremesa tropical.', 'Shot', 'Shaker', 'Chantilly opcional', true, array['Shot','Cremoso','Tropical','Doce']::text[], 'scooby snack'),
('Cometa Rubi', 'Shots', '[{"n":"Vodka","q":"30 ml"},{"n":"Xarope de groselha","q":"10 ml"},{"n":"Limão","q":"10 ml (Taiti)"}]'::jsonb, E'1. Bata vodka, groselha e limão com gelo até congelar.\n2. Coe rápido para o shot.', E'1. Bata vodka, groselha e limão com gelo até congelar.\n2. Coe rápido para o shot.', 'Vermelho vivo, gelado e ácido-doce com passagem limpa.', 'Shot assinatura da casa para brindes rápidos usando o estoque básico.', 'Shot', 'Shaker', 'Sem guarnição', true, array['Shot','Frutado','Vodka']::text[], 'cometa rubi'),
('Dragão Verde', 'Shots', '[{"n":"Vodka","q":"30 ml"},{"n":"Xarope de maçã verde","q":"15 ml"},{"n":"Limão","q":"10 ml (Siciliano)"}]'::jsonb, E'1. Bata vodka, xarope de maçã verde e limão siciliano com gelo.\n2. Coe no copo de shot.', E'1. Bata vodka, xarope de maçã verde e limão siciliano com gelo.\n2. Coe no copo de shot.', 'Esmeralda vibrante, cítrico e refrescante em um gole só.', 'Shot de cor impactante que contrasta acidez de limão siciliano com maçã verde.', 'Shot', 'Shaker', 'Sem guarnição', true, array['Shot','Cítrico / Ácido','Vodka']::text[], 'dragao verde'),
('Sangria Espanhola', 'Jarras', '[{"n":"Vinho tinto","q":"500 ml"},{"n":"Conhaque","q":"90 ml"},{"n":"Suco de laranja","q":"150 ml"},{"n":"Laranja","q":"1 unid fatiada"},{"n":"Maçã","q":"1 unid em cubos"},{"n":"Limão","q":"1 unid fatiada"},{"n":"Água com gás","q":"200 ml"},{"n":"Gelo","q":"bastante"}]'::jsonb, E'1. Coloque as frutas fatiadas na jarra com vinho tinto, conhaque e suco de laranja.\n2. Deixe descansar gelado, adicione bastante gelo e complete com água com gás na hora de servir.', E'1. Coloque as frutas fatiadas na jarra com vinho tinto, conhaque e suco de laranja.\n2. Deixe descansar gelado, adicione bastante gelo e complete com água com gás na hora de servir.', 'Jarra clássica ibérica de vinho tinto, conhaque e frutas frescas.', 'Tradição da Península Ibérica reconhecida mundialmente como o drink de mesa mais festivo de todos.', 'Jarra 1,2 L', 'Montado na jarra', 'Frutas fatiadas e canela em pau', false, array['Clássico','Para dividir (Jarra)','Frutado','Conhaque','Vermute & Aperitivos']::text[], 'sangria espanhola'),
('Clericot', 'Jarras', '[{"n":"Vinho branco","q":"400 ml"},{"n":"Espumante","q":"250 ml (Brut)"},{"n":"Cointreau","q":"60 ml"},{"n":"Morango","q":"6 unid"},{"n":"Abacaxi","q":"120 g"},{"n":"Uva","q":"10 bagos"},{"n":"Maçã","q":"0.5 unid"},{"n":"Gelo","q":"bastante"}]'::jsonb, E'1. Disponha todas as frutas picadas na jarra com gelo.\n2. Despeje Cointreau e vinho branco gelado e complete com espumante antes de levar à mesa.', E'1. Disponha todas as frutas picadas na jarra com gelo.\n2. Despeje Cointreau e vinho branco gelado e complete com espumante antes de levar à mesa.', 'Jarra elegante e colorida de vinho branco, espumante, Cointreau e frutas.', 'Clássico de verão do Cone Sul (Uruguai, Argentina e Sul do Brasil) que brilha em almoços ao ar livre.', 'Jarra 1,2 L', 'Montado na jarra', 'Frutas frescas e hortelã', false, array['Clássico','Para dividir (Jarra)','Frutado','Refrescante']::text[], 'clericot'),
('Aperol Spritz na Jarra', 'Jarras', '[{"n":"Aperol","q":"240 ml"},{"n":"Prosecco","q":"360 ml"},{"n":"Água com gás","q":"120 ml"},{"n":"Laranja","q":"1 unid em rodelas"},{"n":"Gelo","q":"bastante"}]'::jsonb, E'1. Encha uma jarra grande com cubos de gelo e rodelas de laranja.\n2. Despeje Prosecco, Aperol e água com gás e mexa suavemente.', E'1. Encha uma jarra grande com cubos de gelo e rodelas de laranja.\n2. Despeje Prosecco, Aperol e água com gás e mexa suavemente.', 'O aperitivo italiano favorito servido em jarra para quatro brindes.', 'Ideal para mesas compartilhadas no happy hour sem perder a proporção exata 3-2-1.', 'Jarra 1 L', 'Montado na jarra', 'Rodelas de laranja', false, array['Clássico','Para dividir (Jarra)','Amargo','Vermute & Aperitivos']::text[], 'aperol spritz na jarra'),
('Jarra de Mojito', 'Jarras', '[{"n":"Rum","q":"250 ml (Branco)"},{"n":"Hortelã","q":"35 folhas"},{"n":"Limão","q":"100 ml (Taiti)"},{"n":"Xarope de açúcar","q":"90 ml"},{"n":"Água com gás","q":"450 ml"},{"n":"Gelo","q":"bastante"}]'::jsonb, E'1. Pressione suavemente a hortelã com limão e xarope no fundo da jarra.\n2. Encha de gelo, adicione rum branco e complete com água com gás.', E'1. Pressione suavemente a hortelã com limão e xarope no fundo da jarra.\n2. Encha de gelo, adicione rum branco e complete com água com gás.', 'Mojito fresco preparado em jarra para dividir com a mesa inteira.', 'Perfeita para grupos que querem frescor cubano contínuo direto do centro da mesa.', 'Jarra 1,2 L', 'Macerado suave + jarra', 'Ramos grandes de hortelã e limão', false, array['Para dividir (Jarra)','Refrescante','Herbal / Hortelã','Rum']::text[], 'jarra de mojito'),
('Jarra de Caipirinha', 'Jarras', '[{"n":"Cachaça","q":"250 ml (Prata)"},{"n":"Limão","q":"5 unid (Taiti)"},{"n":"Açúcar","q":"8 colheres"},{"n":"Gelo","q":"bastante"}]'::jsonb, E'1. Macere os limões em gomos com açúcar na base da jarra.\n2. Adicione bastante gelo, cachaça prata e misture vigorosamente.', E'1. Macere os limões em gomos com açúcar na base da jarra.\n2. Adicione bastante gelo, cachaça prata e misture vigorosamente.', 'Cinco doses de caipirinha tradicional gelada no centro da mesa.', 'A estrela dos churrascos e encontros brasileiros para servir toda a turma de uma vez.', 'Jarra 1 L', 'Macerado na jarra', 'Rodelas de limão', false, array['Para dividir (Jarra)','Brasileiro','Cítrico / Ácido','Cachaça']::text[], 'jarra de caipirinha'),
('Jarra de Moscow Mule', 'Jarras', '[{"n":"Vodka","q":"250 ml"},{"n":"Xarope de gengibre","q":"120 ml"},{"n":"Limão","q":"90 ml (Taiti)"},{"n":"Água com gás","q":"450 ml"},{"n":"Hortelã","q":"12 folhas"},{"n":"Gelo","q":"bastante"}]'::jsonb, E'1. Encha uma jarra grande com gelo.\n2. Adicione vodka, xarope de gengibre e limão, complete com água com gás e decore com hortelã.', E'1. Encha uma jarra grande com gelo.\n2. Adicione vodka, xarope de gengibre e limão, complete com água com gás e decore com hortelã.', 'Picância refrescante de gengibre e vodka para brindar em grupo.', 'Versão compartilhada do queridinho das noites brasileiras.', 'Jarra 1,2 L', 'Montado na jarra', 'Hortelã e rodelas de limão', false, array['Para dividir (Jarra)','Picante / Gengibre','Refrescante','Vodka']::text[], 'jarra de moscow mule'),
('Jarra Tropical da Casa', 'Jarras', '[{"n":"Rum","q":"220 ml (Branco)"},{"n":"Maracujá","q":"3 frutas"},{"n":"Abacaxi","q":"180 g"},{"n":"Xarope de groselha","q":"50 ml"},{"n":"Limão","q":"70 ml (Taiti)"},{"n":"Água com gás","q":"350 ml"},{"n":"Gelo","q":"bastante"}]'::jsonb, E'1. Macere abacaxi e maracujá na base da jarra.\n2. Adicione gelo, rum, groselha e limão e complete com água com gás.', E'1. Macere abacaxi e maracujá na base da jarra.\n2. Adicione gelo, rum, groselha e limão e complete com água com gás.', 'Explosão rubi de maracujá, abacaxi e rum para dividir com até 6 pessoas.', 'Criação de mesa da Campos House colorida, frutada e 100% pronta com o estoque base.', 'Jarra 1,2 L', 'Macerado + jarra', 'Frutas tropicais e hortelã', false, array['Autoral','Para dividir (Jarra)','Tropical','Frutado','Rum']::text[], 'jarra tropical da casa'),
('Virgin Mojito', 'Sem álcool', '[{"n":"Hortelã","q":"10 folhas"},{"n":"Limão","q":"25 ml (Taiti)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Água com gás","q":"140 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Pressione suavemente a hortelã com suco de limão e xarope no copo alto.\n2. Encha com gelo e complete com água com gás.', E'1. Pressione suavemente a hortelã com suco de limão e xarope no copo alto.\n2. Encha com gelo e complete com água com gás.', 'Todo o frescor herbal e cítrico do Mojito cubano sem uma gota de álcool.', 'O mocktail mais pedido do mundo em bares e restaurantes de todas as faixas etárias.', 'Copo alto', 'Macerado suave + build', 'Buquê de hortelã e rodela de limão', false, array['Clássico','Sem álcool','Refrescante','Herbal / Hortelã']::text[], 'virgin mojito'),
('Virgin Piña Colada', 'Sem álcool', '[{"n":"Suco de abacaxi","q":"110 ml"},{"n":"Leite de coco","q":"50 ml"},{"n":"Creme de leite","q":"25 ml"},{"n":"Abacaxi","q":"1 fatia"},{"n":"Gelo","q":"120 g"}]'::jsonb, E'1. Bata suco de abacaxi, leite de coco, creme de leite e gelo no liquidificador.\n2. Sirva cremoso em taça hurricane.', E'1. Bata suco de abacaxi, leite de coco, creme de leite e gelo no liquidificador.\n2. Sirva cremoso em taça hurricane.', 'Cremosidade tropical intacta de abacaxi e coco em versão zero álcool.', 'Popular em toda praia e hotel por entregar a experiência completa da Piña Colada sem álcool.', 'Taça Hurricane', 'Batido (blend)', 'Fatia de abacaxi e cereja', false, array['Clássico','Sem álcool','Tropical','Cremoso']::text[], 'virgin pina colada'),
('Shirley Temple', 'Sem álcool', '[{"n":"Ginger ale","q":"150 ml"},{"n":"Grenadine","q":"20 ml"},{"n":"Limão","q":"10 ml (Taiti)"},{"n":"Cereja","q":"1 unid"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha um copo alto com gelo.\n2. Despeje ginger ale (ou refrigerante de limão) e gotas de limão e finalize com grenadine.', E'1. Encha um copo alto com gelo.\n2. Despeje ginger ale (ou refrigerante de limão) e gotas de limão e finalize com grenadine.', 'Mocktail clássico de Hollywood doce, brilhante e gaseificado.', 'Criado nos anos 1930 no restaurante Chasen’s em Beverly Hills para a atriz mirim Shirley Temple.', 'Copo alto', 'Montado no copo', 'Cereja e fatia de laranja', false, array['Clássico','Sem álcool','Doce','Refrescante']::text[], 'shirley temple'),
('Arnold Palmer', 'Sem álcool', '[{"n":"Chá","q":"100 ml (preto gelado)"},{"n":"Limão","q":"30 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Prepare chá preto forte e deixe esfriar.\n2. Sirva em copo alto com gelo em partes iguais com limonada siciliana fresca.', E'1. Prepare chá preto forte e deixe esfriar.\n2. Sirva em copo alto com gelo em partes iguais com limonada siciliana fresca.', 'Meio chá gelado, meio limonada fresca — equilíbrio seco e revigorante.', 'Batizado nos anos 1960 em homenagem ao lendário golfista Arnold Palmer, que sempre pedia essa mistura após os torneios.', 'Copo alto', 'Montado no copo', 'Rodela de limão siciliano', false, array['Clássico','Sem álcool','Refrescante','Cítrico / Ácido']::text[], 'arnold palmer'),
('Pink Lemonade', 'Sem álcool', '[{"n":"Limão","q":"30 ml (Siciliano)"},{"n":"Morango","q":"3 unid"},{"n":"Xarope de groselha","q":"15 ml"},{"n":"Água com gás","q":"130 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere os morangos com groselha e suco de limão siciliano.\n2. Coe para copo alto com gelo e complete com água com gás.', E'1. Macere os morangos com groselha e suco de limão siciliano.\n2. Coe para copo alto com gelo e complete com água com gás.', 'Limonada rosa borbulhante com morangos frescos e limão siciliano.', 'Clássico americano de verão desde o século XIX que virou febre nas hamburguerias e bares modernos.', 'Copo alto', 'Macerado + build', 'Morango e rodela de limão siciliano', false, array['Clássico','Sem álcool','Cítrico / Ácido','Frutado']::text[], 'pink lemonade'),
('Limonada Suíça', 'Sem álcool', '[{"n":"Limão","q":"2 unid (Taiti com casca limpa)"},{"n":"Leite condensado","q":"45 ml"},{"n":"Açúcar","q":"1 colher"},{"n":"Gelo","q":"150 g"}]'::jsonb, E'1. Bata rapidamente no liquidificador (10s) os limões cortados em 4 com água gelada e coe na hora.\n2. Volte ao liquidificador com leite condensado e gelo e bata até espumar.', E'1. Bata rapidamente no liquidificador (10s) os limões cortados em 4 com água gelada e coe na hora.\n2. Volte ao liquidificador com leite condensado e gelo e bata até espumar.', 'A limonada cremosa brasileira batida com casca e leite condensado.', 'Apesar do nome europeu, é criação genuinamente brasileira presente nos melhores bares e restaurantes do país.', 'Copo alto', 'Batido rápido', 'Rodela de limão', false, array['Clássico','Sem álcool','Brasileiro','Cremoso','Cítrico / Ácido']::text[], 'limonada suica'),
('Safe Sex on the Beach', 'Sem álcool', '[{"n":"Suco de laranja","q":"80 ml"},{"n":"Suco de cranberry","q":"60 ml"},{"n":"Xarope de pêssego","q":"25 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha um copo alto com gelo.\n2. Adicione suco de laranja e xarope de pêssego e finalize com cranberry por cima.', E'1. Encha um copo alto com gelo.\n2. Adicione suco de laranja e xarope de pêssego e finalize com cranberry por cima.', 'Todo o sabor praiano do Sex on the Beach em versão 100% zero álcool.', 'Presença garantida em cartas familiares e motoristas da rodada desde os anos 1990.', 'Copo alto', 'Montado no copo', 'Rodela de laranja e cereja', false, array['Clássico','Sem álcool','Frutado','Doce']::text[], 'safe sex on the beach'),
('Soda Italiana de Maçã Verde', 'Sem álcool', '[{"n":"Xarope de maçã verde","q":"35 ml"},{"n":"Água com gás","q":"150 ml"},{"n":"Limão","q":"10 ml (Siciliano)"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Coloque o xarope de maçã verde no fundo do copo alto com gelo.\n2. Adicione algumas gotas de limão e complete devagar com água com gás.', E'1. Coloque o xarope de maçã verde no fundo do copo alto com gelo.\n2. Adicione algumas gotas de limão e complete devagar com água com gás.', 'Refrescante, cristalina e bicolor com acidez suave de maçã verde.', 'Sucesso das cafeterias e bares italianos — visual marcante sem álcool.', 'Copo alto', 'Montado em camadas', 'Fatia fina de maçã verde', false, array['Sem álcool','Refrescante','Com soda / Tônica']::text[], 'soda italiana de maca verde'),
('Soda Italiana de Morango', 'Sem álcool', '[{"n":"Xarope de morango","q":"35 ml"},{"n":"Água com gás","q":"150 ml"},{"n":"Limão","q":"10 ml (Taiti)"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Coloque o xarope de morango no fundo do copo alto cheio de gelo.\n2. Complete delicadamente com água com gás e gotas de limão.', E'1. Coloque o xarope de morango no fundo do copo alto cheio de gelo.\n2. Complete delicadamente com água com gás e gotas de limão.', 'Soda rubi brilhante e refrescante de morango com borbulhas.', 'Clássico das cartas sem álcool pelo visual em duas camadas que pede foto antes do primeiro gole.', 'Copo alto', 'Montado em camadas', 'Morango na borda', false, array['Sem álcool','Frutado','Doce','Com soda / Tônica']::text[], 'soda italiana de morango'),
('Jardim Secreto', 'Sem álcool', '[{"n":"Hortelã","q":"8 folhas"},{"n":"Limão","q":"20 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Água tônica","q":"120 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere levemente a hortelã com limão siciliano e xarope.\n2. Bata com gelo e coe sobre gelo novo completando com água tônica.', E'1. Macere levemente a hortelã com limão siciliano e xarope.\n2. Bata com gelo e coe sobre gelo novo completando com água tônica.', 'Mocktail botânico e herbal com amargor elegante de água tônica.', 'Pensado na casa para quem quer experiência adulta de Gin Tônica sem álcool.', 'Taça balão', 'Shaker + tônica', 'Ramo de hortelã e casca de limão', true, array['Autoral','Sem álcool','Herbal / Hortelã','Com soda / Tônica']::text[], 'jardim secreto'),
('Pôr do Sol Zero', 'Sem álcool', '[{"n":"Maracujá","q":"1 fruta"},{"n":"Xarope de groselha","q":"20 ml"},{"n":"Limão","q":"10 ml (Taiti)"},{"n":"Água com gás","q":"120 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Coloque gelo, polpa de maracujá e limão no copo alto.\n2. Complete com água com gás e despeje groselha por último para assentar no fundo.', E'1. Coloque gelo, polpa de maracujá e limão no copo alto.\n2. Complete com água com gás e despeje groselha por último para assentar no fundo.', 'Degradê dourado e vermelho de maracujá e groselha zero álcool.', 'Traz o visual vibrante do Tequila Sunrise sem álcool usando frutas do estoque.', 'Copo alto', 'Montado em camadas', 'Casca de laranja ou maracujá', false, array['Autoral','Sem álcool','Tropical','Refrescante']::text[], 'por do sol zero'),
('Gin Sour', 'Clássicos', '[{"n":"Gin","q":"60 ml (London Dry)"},{"n":"Limão","q":"25 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata gin, suco de limão siciliano e xarope de açúcar na coqueteleira com bastante gelo por 12 segundos.\n2. Faça dupla coagem para uma taça coupe gelada.\n3. Decore com casca de limão torcida por cima.', E'1. Bata gin, suco de limão siciliano e xarope de açúcar na coqueteleira com bastante gelo por 12 segundos.\n2. Faça dupla coagem para uma taça coupe gelada.\n3. Decore com casca de limão torcida por cima.', 'Clássico inglês do século XIX: gin botânico equilibrado com acidez cítrica viva.', 'Um dos pilares originais da família dos Sours no guia de Jerry Thomas de 1862, provando que três ingredientes precisos bastam para a perfeição.', 'Taça coupe', 'Shaker + double strain', 'Twist de limão siciliano', true, array['Clássico','Cítrico / Ácido','Curto','Gin']::text[], 'gin sour'),
('Vodka Sour', 'Clássicos', '[{"n":"Vodka","q":"60 ml"},{"n":"Limão","q":"25 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Coloque vodka, limão siciliano e xarope de açúcar na coqueteleira com gelo.\n2. Agite com vigor por 12 segundos até gelar a lata.\n3. Coe duplamente em copo baixo com pedra de gelo ou taça gelada.', E'1. Coloque vodka, limão siciliano e xarope de açúcar na coqueteleira com gelo.\n2. Agite com vigor por 12 segundos até gelar a lata.\n3. Coe duplamente em copo baixo com pedra de gelo ou taça gelada.', 'Limpo, brilhante e refrescante: vodka gelada com limão siciliano e doçura medida.', 'A porta de entrada cristalina para os coquetéis cítricos clássicos: zero amargor, textura sedosa e final seco.', 'Copo baixo', 'Shaker + double strain', 'Rodelinha fina de limão', true, array['Clássico','Cítrico / Ácido','Curto','Vodka']::text[], 'vodka sour'),
('Rum Sour', 'Cítricos', '[{"n":"Rum","q":"60 ml (Carta Branca)"},{"n":"Limão","q":"25 ml (Taiti)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Agite rum branco, limão taiti fresco e xarope de açúcar com gelo por 12 segundos.\n2. Coe sobre gelo novo em copo baixo.\n3. Finalize com casca de limão aromática.', E'1. Agite rum branco, limão taiti fresco e xarope de açúcar com gelo por 12 segundos.\n2. Coe sobre gelo novo em copo baixo.\n3. Finalize com casca de limão aromática.', 'Primo caribenho do Daiquiri servido on the rocks: direto, cítrico e vibrante.', 'Herdeiro direto das rações navais britânicas de rum e limão que deram origem aos sours tropicais do Caribe.', 'Copo baixo', 'Shaker', 'Fatia de limão taiti', true, array['Clássico','Cítrico / Ácido','Curto','Rum']::text[], 'rum sour'),
('Gin Buck', 'Clássicos', '[{"n":"Gin","q":"50 ml (London Dry)"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Xarope de gengibre","q":"20 ml"},{"n":"Água com gás","q":"100 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha um copo alto com gelo bem frio.\n2. Adicione o gin, o limão taiti e o xarope de gengibre.\n3. Complete com água com gás e dê uma mexida suave de baixo para cima.', E'1. Encha um copo alto com gelo bem frio.\n2. Adicione o gin, o limão taiti e o xarope de gengibre.\n3. Complete com água com gás e dê uma mexida suave de baixo para cima.', 'Highball histórico de 1900 que antecedeu o Moscow Mule: gin botânico com gengibre picante.', 'Popularizado nos clubes americanos no início do século XX, o termo Buck designava todo destilado combinado com cítrico e gengibre gaseificado.', 'Copo alto', 'Montado no copo (build)', 'Cunha de limão e lâmina de gengibre', false, array['Clássico','Picante / Gengibre','Com soda / Tônica','Longo','Gin']::text[], 'gin buck'),
('Rum Buck', 'Clássicos', '[{"n":"Rum","q":"50 ml (Carta Branca)"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Xarope de gengibre","q":"20 ml"},{"n":"Água com gás","q":"100 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Em copo alto com bastante gelo, despeje o rum, o suco de limão e o xarope de gengibre.\n2. Complete com água com gás gelada e misture gentilmente.\n3. Decore com limão fresco na borda.', E'1. Em copo alto com bastante gelo, despeje o rum, o suco de limão e o xarope de gengibre.\n2. Complete com água com gás gelada e misture gentilmente.\n3. Decore com limão fresco na borda.', 'Versão leve e efervescente do Buck clássico com rum branco e gengibre vibrante.', 'Precursor direto do Dark ''n'' Stormy das Bermudas, mantendo o protagonismo do gengibre fresco e da leveza efervescente.', 'Copo alto', 'Montado no copo (build)', 'Meia rodela de limão', false, array['Clássico','Picante / Gengibre','Com soda / Tônica','Longo','Rum']::text[], 'rum buck'),
('Brandy Fizz', 'Clássicos', '[{"n":"Conhaque","q":"50 ml"},{"n":"Limão","q":"25 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Água com gás","q":"90 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata conhaque, limão siciliano e xarope de açúcar com gelo até esfriar bem.\n2. Coe para um copo alto sem gelo (ou com pouco gelo) e complete com água com gás.\n3. Sirva imediatamente enquanto borbulha.', E'1. Bata conhaque, limão siciliano e xarope de açúcar com gelo até esfriar bem.\n2. Coe para um copo alto sem gelo (ou com pouco gelo) e complete com água com gás.\n3. Sirva imediatamente enquanto borbulha.', 'Conhaque aveludado elevado por bolhas cítricas no estilo clássico de Nova Orleans.', 'Receita tradicional dos grandes hotéis do final do século XIX que transformou destilados amadeirados em refrescos matinais elegantes.', 'Copo alto', 'Shaker + build', 'Casca de limão siciliano', true, array['Clássico','Cítrico / Ácido','Com soda / Tônica','Conhaque']::text[], 'brandy fizz'),
('Brandy Collins', 'Clássicos', '[{"n":"Conhaque","q":"50 ml"},{"n":"Limão","q":"25 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Água com gás","q":"110 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata conhaque, limão e xarope de açúcar com gelo.\n2. Coe sobre um copo Collins cheio de gelo novo.\n3. Complete com água com gás e mexa uma única vez.', E'1. Bata conhaque, limão e xarope de açúcar com gelo.\n2. Coe sobre um copo Collins cheio de gelo novo.\n3. Complete com água com gás e mexa uma única vez.', 'Primo amadeirado do Tom Collins: longo, refrescante e com notas quentes de conhaque.', 'Descendente direto da família Collins registrada por Harry Johnson em 1882, pensado para longas noites quentes de verão.', 'Copo Collins', 'Shaker + build', 'Rodela de limão', true, array['Clássico','Refrescante','Com soda / Tônica','Longo','Conhaque']::text[], 'brandy collins'),
('Brandy Highball', 'Fortes', '[{"n":"Conhaque","q":"50 ml"},{"n":"Refrigerante de limão","q":"110 ml"},{"n":"Limão","q":"10 ml (Taiti)"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha um copo alto com cubos de gelo cristalinos.\n2. Despeje o conhaque e o suco de limão espremido na hora.\n3. Complete com refrigerante de limão bem gelado e misture de leve.', E'1. Encha um copo alto com cubos de gelo cristalinos.\n2. Despeje o conhaque e o suco de limão espremido na hora.\n3. Complete com refrigerante de limão bem gelado e misture de leve.', 'Clássico descomplicado de bistrô europeu: conhaque macio com cítrico gaseificado.', 'Muito pedido nos cafés franceses e ingleses desde os anos 1920 como alternativa leve ao conhaque puro após o jantar.', 'Copo alto', 'Montado no copo (build)', 'Casca de limão', false, array['Clássico','Com soda / Tônica','Longo','Conhaque']::text[], 'brandy highball'),
('Vermouth Tonic', 'Aperitivos', '[{"n":"Vermute","q":"60 ml (Tinto)"},{"n":"Água tônica","q":"100 ml"},{"n":"Limão","q":"15 ml (Siciliano)"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Gele uma taça ou copo baixo largo com bastante gelo.\n2. Adicione o vermute tinto e um toque de limão siciliano.\n3. Complete com água tônica gelada e mexa delicadamente.', E'1. Gele uma taça ou copo baixo largo com bastante gelo.\n2. Adicione o vermute tinto e um toque de limão siciliano.\n3. Complete com água tônica gelada e mexa delicadamente.', 'Aperitivo europeu elegante: ervas e especiarias do vermute tinto cortadas pela tônica.', 'Rito sagrado da hora do vermú em Madri, Barcelona e Turim antes do jantar, leve em teor alcoólico e rico em botânicos.', 'Taça balão', 'Montado no copo (build)', 'Meia rodela de limão siciliano', false, array['Clássico','Amargo','Com soda / Tônica','Vermute & Aperitivos']::text[], 'vermouth tonic'),
('Vermouth Spritz', 'Aperitivos', '[{"n":"Vermute","q":"60 ml (Tinto)"},{"n":"Água com gás","q":"90 ml"},{"n":"Limão","q":"10 ml (Siciliano)"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Em taça de vinho com gelo, sirva o vermute tinto bem gelado.\n2. Esprema um gomo de limão siciliano e deixe no copo.\n3. Complete com água com gás e sirva na hora.', E'1. Em taça de vinho com gelo, sirva o vermute tinto bem gelado.\n2. Esprema um gomo de limão siciliano e deixe no copo.\n3. Complete com água com gás e sirva na hora.', 'Leve, herbal e borbulhante: a essência do aperitivo italiano no fim da tarde.', 'Precursor simples dos spritzes do norte da Itália, nascido quando viajantes diluíam vinhos fortificados com água gaseificada.', 'Taça de vinho', 'Montado no copo (build)', 'Casca de limão siciliano', false, array['Clássico','Amargo','Com soda / Tônica','Vermute & Aperitivos']::text[], 'vermouth spritz'),
('Salty Gin Fizz', 'Cítricos', '[{"n":"Gin","q":"50 ml (London Dry)"},{"n":"Limão","q":"25 ml (Taiti)"},{"n":"Sal","q":"1 pitada"},{"n":"Água com gás","q":"110 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Passe limão em metade da borda do copo alto e encoste no sal (opcional), depois encha de gelo.\n2. Adicione gin, suco de limão taiti e uma pitada mínima de sal para realçar o cítrico.\n3. Complete com água com gás e mexa de leve.', E'1. Passe limão em metade da borda do copo alto e encoste no sal (opcional), depois encha de gelo.\n2. Adicione gin, suco de limão taiti e uma pitada mínima de sal para realçar o cítrico.\n3. Complete com água com gás e mexa de leve.', 'Seco, mineral e zero açúcar: inspirado no Ranch Water texano com alma de gin.', 'O toque de sal reduz qualquer aspereza do limão e amplia os aromas botânicos do zimbro sem adicionar uma gota de xarope.', 'Copo alto', 'Montado no copo (build)', 'Fatia de limão e borda salgada', false, array['Cítrico / Ácido','Refrescante','Com soda / Tônica','Gin']::text[], 'salty gin fizz'),
('Caipirinha de Limão Siciliano', 'Brasileiríssimos', '[{"n":"Cachaça","q":"55 ml (Ouro)"},{"n":"Limão","q":"1 unid (Siciliano)"},{"n":"Açúcar","q":"2 colheres de chá"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Corte o limão siciliano em gomos retirando a parte branca central e macere suavemente com o açúcar.\n2. Adicione cachaça ouro e bastante gelo.\n3. Mexa bem ou dê um golpe rápido na coqueteleira para emulsionar os óleos da casca.', E'1. Corte o limão siciliano em gomos retirando a parte branca central e macere suavemente com o açúcar.\n2. Adicione cachaça ouro e bastante gelo.\n3. Mexa bem ou dê um golpe rápido na coqueteleira para emulsionar os óleos da casca.', 'Perfume cítrico mais floral com a maciez amadeirada da cachaça ouro.', 'Releitura sofisticada dos bares de São Paulo que valoriza o óleo essencial aromático do limão siciliano sobre a madeira da cachaça.', 'Copo baixo', 'Macerado (muddle)', 'Fatia fina de limão siciliano', false, array['Brasileiro','Cítrico / Ácido','Cachaça']::text[], 'caipirinha de limao siciliano'),
('Caipirinha de Maçã Verde', 'Brasileiríssimos', '[{"n":"Cachaça","q":"50 ml (Prata)"},{"n":"Limão","q":"0.5 unid (Taiti)"},{"n":"Xarope de maçã verde","q":"25 ml"},{"n":"Açúcar","q":"1 colher de chá"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere os pedaços de limão taiti com o açúcar e o xarope de maçã verde no copo.\n2. Encha de gelo e despeje a cachaça prata.\n3. Misture vigorosamente de baixo para cima.', E'1. Macere os pedaços de limão taiti com o açúcar e o xarope de maçã verde no copo.\n2. Encha de gelo e despeje a cachaça prata.\n3. Misture vigorosamente de baixo para cima.', 'Cor esmeralda vibrante com acidez crocante de maçã verde e frescor brasileiro.', 'Sucesso imediato em bares modernos ao unir a base popular da caipirinha com a nota ácida e frutada da maçã verde.', 'Copo baixo', 'Macerado (muddle)', 'Casca verde de limão', false, array['Brasileiro','Frutado','Cítrico / Ácido','Cachaça']::text[], 'caipirinha de maca verde'),
('Caipirinha Carioca de Gengibre', 'Brasileiríssimos', '[{"n":"Cachaça","q":"50 ml (Ouro)"},{"n":"Limão","q":"1 unid (Taiti)"},{"n":"Gengibre","q":"3 fatias finas"},{"n":"Açúcar","q":"2 colheres de chá"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere o gengibre fresco primeiro com o açúcar no fundo do copo ou coqueteleira.\n2. Acrescente os gomos de limão e pressione de leve.\n3. Adicione cachaça ouro, gelo e misture ou agite rapidamente.', E'1. Macere o gengibre fresco primeiro com o açúcar no fundo do copo ou coqueteleira.\n2. Acrescente os gomos de limão e pressione de leve.\n3. Adicione cachaça ouro, gelo e misture ou agite rapidamente.', 'Cachaça envelhecida com ardência aromática de gengibre fresco e limão taiti.', 'Inspirada nos quiosques da Zona Sul do Rio, onde o gengibre dá um choque térmico delicioso ao calor da praia.', 'Copo baixo', 'Macerado (muddle)', 'Lâmina de gengibre e limão', false, array['Brasileiro','Picante / Gengibre','Cítrico / Ácido','Cachaça']::text[], 'caipirinha carioca de gengibre'),
('Caipiroska de Maracujá', 'Brasileiríssimos', '[{"n":"Vodka","q":"55 ml"},{"n":"Maracujá","q":"1 fruta"},{"n":"Açúcar","q":"2 colheres de chá"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Coloque a polpa fresca de maracujá e o açúcar na coqueteleira e macere de leve.\n2. Adicione vodka e gelo e bata rápido por 8 segundos.\n3. Sirva com tudo no copo baixo.', E'1. Coloque a polpa fresca de maracujá e o açúcar na coqueteleira e macere de leve.\n2. Adicione vodka e gelo e bata rápido por 8 segundos.\n3. Sirva com tudo no copo baixo.', 'Azedinha, cremosa e intensa: polpa fresca de maracujá com vodka bem gelada.', 'Presença obrigatória nos cardápios brasileiros de verão, celebrando o perfume ácido e as sementes crocantes do maracujá.', 'Copo baixo', 'Shaker', 'Meia casca ou sementes de maracujá', true, array['Brasileiro','Tropical','Frutado','Vodka']::text[], 'caipiroska de maracuja'),
('Caipiroska de Morango', 'Brasileiríssimos', '[{"n":"Vodka","q":"55 ml"},{"n":"Morango","q":"5 unid"},{"n":"Açúcar","q":"2 colheres de chá"},{"n":"Limão","q":"10 ml (Taiti)"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere os morangos limpos com o açúcar e um toque de limão no copo ou shaker.\n2. Complete com gelo e vodka e agite ou mexa bem.\n3. Sirva decorado com morango na borda.', E'1. Macere os morangos limpos com o açúcar e um toque de limão no copo ou shaker.\n2. Complete com gelo e vodka e agite ou mexa bem.\n3. Sirva decorado com morango na borda.', 'Rubi, suculenta e popular: morango fresco macerado com vodka e toque cítrico.', 'Clássico absoluto das festas brasileiras desde os anos 1990; o fio de limão evita que fique enjoativa.', 'Copo baixo', 'Macerado (muddle)', 'Morango fatiado na borda', false, array['Brasileiro','Frutado','Doce','Vodka']::text[], 'caipiroska de morango'),
('Caipiroska de Abacaxi com Hortelã', 'Brasileiríssimos', '[{"n":"Vodka","q":"55 ml"},{"n":"Abacaxi","q":"3 pedaços"},{"n":"Hortelã","q":"6 folhas"},{"n":"Açúcar","q":"2 colheres de chá"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere os cubos de abacaxi com o açúcar e dê uma leve batida nas folhas de hortelã.\n2. Junte vodka e gelo e agite rápido ou mexa vigorosamente.\n3. Sirva em copo baixo com um ramo fresco de hortelã.', E'1. Macere os cubos de abacaxi com o açúcar e dê uma leve batida nas folhas de hortelã.\n2. Junte vodka e gelo e agite rápido ou mexa vigorosamente.\n3. Sirva em copo baixo com um ramo fresco de hortelã.', 'Dupla tropical imbatível: abacaxi doce macerado e frescor verde de hortelã.', 'Combinação querida dos bares praianos do Nordeste e do litoral paulista pela leveza e aroma herbal.', 'Copo baixo', 'Macerado (muddle)', 'Ramo de hortelã', false, array['Brasileiro','Tropical','Herbal / Hortelã','Vodka']::text[], 'caipiroska de abacaxi com hortela'),
('Caipiríssima de Morango', 'Brasileiríssimos', '[{"n":"Rum","q":"55 ml (Carta Branca)"},{"n":"Morango","q":"4 unid"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Açúcar","q":"2 colheres de chá"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere os morangos com o açúcar e o suco de limão no copo baixo.\n2. Adicione bastante gelo e o rum branco.\n3. Mexa bem até gelar e ficar homogêneo.', E'1. Macere os morangos com o açúcar e o suco de limão no copo baixo.\n2. Adicione bastante gelo e o rum branco.\n3. Mexa bem até gelar e ficar homogêneo.', 'Versão caribenha da caipirinha de morango com notas leves de cana do rum branco.', 'Traz a doçura sutil da cana destilada em coluna para casar naturalmente com morangos frescos e limão.', 'Copo baixo', 'Macerado (muddle)', 'Morango aberto e rodela de limão', false, array['Brasileiro','Frutado','Doce','Rum']::text[], 'caipirissima de morango'),
('Cachaça Mule', 'Brasileiríssimos', '[{"n":"Cachaça","q":"50 ml (Prata)"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Xarope de gengibre","q":"25 ml"},{"n":"Água com gás","q":"80 ml"},{"n":"Hortelã","q":"6 folhas"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata cachaça prata, limão taiti e xarope de gengibre com gelo.\n2. Coe sobre gelo novo em caneca ou copo alto.\n3. Complete com água com gás e finalize com ramo de hortelã batido.', E'1. Bata cachaça prata, limão taiti e xarope de gengibre com gelo.\n2. Coe sobre gelo novo em caneca ou copo alto.\n3. Complete com água com gás e finalize com ramo de hortelã batido.', 'O Moscow Mule repensado com alma brasileira: cachaça fresca, limão e gengibre picante.', 'Criado na onda da nova coquetelaria nacional, onde a personalidade vegetal da cachaça prata substitui com vantagem a vodka neutra.', 'Caneca ou copo alto', 'Shaker + build', 'Ramo de hortelã e rodela de limão', true, array['Brasileiro','Picante / Gengibre','Com soda / Tônica','Cachaça']::text[], 'cachaca mule'),
('Guaraná Mule', 'Brasileiríssimos', '[{"n":"Vodka","q":"50 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Gengibre","q":"3 fatias"},{"n":"Guaraná","q":"100 ml"},{"n":"Hortelã","q":"5 folhas"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere o gengibre fresco com o suco de limão no fundo da coqueteleira.\n2. Junte a vodka e gelo, bata firme e coe em copo com gelo.\n3. Complete com guaraná gelado e decore com hortelã.', E'1. Macere o gengibre fresco com o suco de limão no fundo da coqueteleira.\n2. Junte a vodka e gelo, bata firme e coe em copo com gelo.\n3. Complete com guaraná gelado e decore com hortelã.', 'Versão verde-amarela divertida do Mule usando guaraná gaseificado e gengibre fresco.', 'Nascido nas mesas de festa brasileiras quando o guaraná gelado assumiu o papel dos refrigerantes importados de gengibre.', 'Copo alto', 'Shaker + build', 'Hortelã e limão', true, array['Brasileiro','Picante / Gengibre','Com soda / Tônica','Vodka']::text[], 'guarana mule'),
('Cachaça & Tônica', 'Brasileiríssimos', '[{"n":"Cachaça","q":"50 ml (Prata)"},{"n":"Água tônica","q":"120 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Hortelã","q":"5 folhas"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha uma taça balão ou copo alto com gelo grande.\n2. Adicione a cachaça prata e o suco de limão fresco.\n3. Complete com tônica bem gelada e finalize com hortelã aromática.', E'1. Encha uma taça balão ou copo alto com gelo grande.\n2. Adicione a cachaça prata e o suco de limão fresco.\n3. Complete com tônica bem gelada e finalize com hortelã aromática.', 'Leve como um Gin Tônica, com o perfume fresco da cana-de-açúcar e amargor limpo de quinino.', 'Conhecida em Minas e São Paulo como a resposta nacional ao Gin & Tonic, revelando toda a elegância herbal da cachaça branca.', 'Taça balão', 'Montado no copo (build)', 'Folhas de hortelã e rodela de limão', false, array['Brasileiro','Refrescante','Com soda / Tônica','Cachaça']::text[], 'cachaca & tonica'),
('Chilcano de Cachaça', 'Refrescantes', '[{"n":"Cachaça","q":"50 ml (Prata)"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Gengibre","q":"2 fatias"},{"n":"Refrigerante de limão","q":"110 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere levemente as fatias de gengibre com o limão no copo alto.\n2. Adicione gelo e a cachaça prata.\n3. Complete com refrigerante de limão bem gelado e misture de leve.', E'1. Macere levemente as fatias de gengibre com o limão no copo alto.\n2. Adicione gelo e a cachaça prata.\n3. Complete com refrigerante de limão bem gelado e misture de leve.', 'Inspirado no clássico Chilcano peruano, adaptado com cachaça prata, gengibre e gás cítrico.', 'Une a tradição sul-americana do Chilcano de Lima à versatilidade aromática do destilado brasileiro.', 'Copo alto', 'Montado no copo (build)', 'Fatia de gengibre e limão', false, array['Brasileiro','Refrescante','Picante / Gengibre','Com soda / Tônica','Cachaça']::text[], 'chilcano de cachaca'),
('Veludo Vermelho', 'Fortes', '[{"n":"Vodka","q":"40 ml"},{"n":"Vermute","q":"25 ml (Tinto)"},{"n":"Morango","q":"3 unid"},{"n":"Limão","q":"15 ml (Siciliano)"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere os morangos na coqueteleira com o limão siciliano.\n2. Adicione a vodka, o vermute tinto e gelo e bata forte por 10 segundos.\n3. Faça dupla coagem para taça coupe gelada.', E'1. Macere os morangos na coqueteleira com o limão siciliano.\n2. Adicione a vodka, o vermute tinto e gelo e bata forte por 10 segundos.\n3. Faça dupla coagem para taça coupe gelada.', 'Rubi profundo e aveludado: notas especiadas do vermute tinto abraçadas por morango fresco.', 'Homenagem aos drinks noturnos de speakeasy onde frutas vermelhas suavizam a profundidade herbácea dos aperitivos tintos.', 'Taça coupe', 'Shaker + double strain', 'Morango inteiro na borda', true, array['Autoral','Forte','Frutado','Curto','Vodka','Vermute & Aperitivos']::text[], 'veludo vermelho'),
('Bramble de Morango', 'Doces & Frutados', '[{"n":"Gin","q":"50 ml (London Dry)"},{"n":"Limão","q":"25 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Morango","q":"3 unid"},{"n":"Xarope de morango","q":"15 ml"},{"n":"Gelo","q":"triturado ou cubos"}]'::jsonb, E'1. Bata gin, limão siciliano e xarope de açúcar com gelo.\n2. Coe em copo baixo cheio de gelo picado e morangos fatiados.\n3. Regue o xarope de morango por cima para criar o efeito cascata.', E'1. Bata gin, limão siciliano e xarope de açúcar com gelo.\n2. Coe em copo baixo cheio de gelo picado e morangos fatiados.\n3. Regue o xarope de morango por cima para criar o efeito cascata.', 'Adaptação vibrante do Bramble londrino trocando amora por morangos frescos e calda rubi.', 'Inspirado na criação de Dick Bradsell nos anos 1980 em Londres, mantendo o belo contraste visual entre a base cítrica clara e o fio vermelho.', 'Copo baixo', 'Shaker + float', 'Morango e meia rodela de limão', true, array['Clássico','Frutado','Cítrico / Ácido','Gin']::text[], 'bramble de morango'),
('Gin Tônica de Maracujá', 'Refrescantes', '[{"n":"Gin","q":"50 ml (London Dry)"},{"n":"Maracujá","q":"0.5 fruta"},{"n":"Hortelã","q":"5 folhas"},{"n":"Água tônica","q":"120 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha uma taça balão com gelo e coloque a polpa de meio maracujá fresco.\n2. Despeje o gin e complete com tônica gelada.\n3. Mexa uma vez suavemente e decore com hortelã.', E'1. Encha uma taça balão com gelo e coloque a polpa de meio maracujá fresco.\n2. Despeje o gin e complete com tônica gelada.\n3. Mexa uma vez suavemente e decore com hortelã.', 'Azedinho tropical vibrante que transforma o Gin Tônica em drink de pôr do sol.', 'Um dos Gin Tônicas mais pedidos nos rooftops brasileiros pela combinação entre o aroma seco do zimbro e o frescor do maracujá.', 'Taça balão', 'Montado no copo (build)', 'Ramo de hortelã e sementes de maracujá', false, array['Refrescante','Tropical','Com soda / Tônica','Gin']::text[], 'gin tonica de maracuja'),
('Gin Tônica de Maçã Verde e Hortelã', 'Refrescantes', '[{"n":"Gin","q":"50 ml (London Dry)"},{"n":"Xarope de maçã verde","q":"15 ml"},{"n":"Limão","q":"10 ml (Siciliano)"},{"n":"Hortelã","q":"6 folhas"},{"n":"Água tônica","q":"120 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Adicione gin, xarope de maçã verde e limão siciliano na taça com gelo.\n2. Complete com água tônica bem gelada.\n3. Desperte a hortelã batendo nas mãos e finalize por cima.', E'1. Adicione gin, xarope de maçã verde e limão siciliano na taça com gelo.\n2. Complete com água tônica bem gelada.\n3. Desperte a hortelã batendo nas mãos e finalize por cima.', 'Verdejante, crocante e refrescante: maçã verde com botânicos do gin e hortelã.', 'Combinação pensada para paladares que preferem notas frutadas mais frescas e menos doces no Gin Tônica.', 'Taça balão', 'Montado no copo (build)', 'Ramo de hortelã e casca de limão', false, array['Refrescante','Herbal / Hortelã','Com soda / Tônica','Gin']::text[], 'gin tonica de maca verde e hortela'),
('Gin Tônica de Abacaxi e Gengibre', 'Refrescantes', '[{"n":"Gin","q":"50 ml (London Dry)"},{"n":"Abacaxi","q":"2 pedaços"},{"n":"Gengibre","q":"2 fatias"},{"n":"Água tônica","q":"120 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere suavemente o abacaxi e o gengibre no fundo da taça ou coqueteleira.\n2. Acrescente bastante gelo e o gin.\n3. Complete com tônica e mexa de leve.', E'1. Macere suavemente o abacaxi e o gengibre no fundo da taça ou coqueteleira.\n2. Acrescente bastante gelo e o gin.\n3. Complete com tônica e mexa de leve.', 'Abacaxi doce equilibrado pelo calor aromático do gengibre fresco e tônica gelada.', 'Perfeito para dias quentes: a picância natural do gengibre prolonga o frescor do abacaxi a cada gole.', 'Taça balão', 'Montado no copo (build)', 'Triângulo de abacaxi e fatia de gengibre', false, array['Refrescante','Tropical','Picante / Gengibre','Com soda / Tônica','Gin']::text[], 'gin tonica de abacaxi e gengibre'),
('Moscow Mule de Morango', 'Autorais', '[{"n":"Vodka","q":"50 ml"},{"n":"Morango","q":"3 unid"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Xarope de gengibre","q":"25 ml"},{"n":"Água com gás","q":"80 ml"},{"n":"Hortelã","q":"5 folhas"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere os morangos com o limão no fundo da coqueteleira.\n2. Adicione vodka, xarope de gengibre e gelo e agite firme.\n3. Coe para o copo com gelo, complete com água com gás e decore com hortelã.', E'1. Macere os morangos com o limão no fundo da coqueteleira.\n2. Adicione vodka, xarope de gengibre e gelo e agite firme.\n3. Coe para o copo com gelo, complete com água com gás e decore com hortelã.', 'O Mule mais fotogênico da casa: doçura rubi de morango com choque de gengibre.', 'Variação autoral muito pedida por quem ama a picância do Moscow Mule mas busca um toque frutado marcante.', 'Caneca ou copo alto', 'Shaker + build', 'Morango e ramo de hortelã', true, array['Autoral','Frutado','Picante / Gengibre','Vodka']::text[], 'moscow mule de morango'),
('Moscow Mule de Maracujá', 'Autorais', '[{"n":"Vodka","q":"50 ml"},{"n":"Maracujá","q":"1 fruta"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Xarope de gengibre","q":"25 ml"},{"n":"Água com gás","q":"80 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata polpa de maracujá, vodka, limão e xarope de gengibre com gelo.\n2. Coe sobre gelo novo (ou sirva rústico com algumas sementes) em copo alto.\n3. Complete com água com gás e decore com limão.', E'1. Bata polpa de maracujá, vodka, limão e xarope de gengibre com gelo.\n2. Coe sobre gelo novo (ou sirva rústico com algumas sementes) em copo alto.\n3. Complete com água com gás e decore com limão.', 'Explosão cítrica e picante: acidez intensa de maracujá encontra o calor do gengibre.', 'Reinterpretação tropical criada para transformar o clássico Mule de bar em um bestseller de verão.', 'Caneca ou copo alto', 'Shaker + build', 'Rodela de limão e maracujá', true, array['Autoral','Tropical','Picante / Gengibre','Vodka']::text[], 'moscow mule de maracuja'),
('Mojito de Maracujá', 'Tiki & Tropicais', '[{"n":"Rum","q":"50 ml (Carta Branca)"},{"n":"Maracujá","q":"1 fruta"},{"n":"Hortelã","q":"8 folhas"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Água com gás","q":"80 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. No copo alto, macere suavemente hortelã com xarope de açúcar e limão.\n2. Acrescente a polpa de maracujá, o rum e bastante gelo.\n3. Complete com água com gás e misture de baixo para cima.', E'1. No copo alto, macere suavemente hortelã com xarope de açúcar e limão.\n2. Acrescente a polpa de maracujá, o rum e bastante gelo.\n3. Complete com água com gás e misture de baixo para cima.', 'Refrescância cubana da hortelã turbinada pela acidez perfumada do maracujá.', 'Casamento tropical natural entre Havana e o Brasil, com aroma intenso desde o primeiro instante.', 'Copo alto', 'Macerado (muddle)', 'Ramo de hortelã e sementes de maracujá', false, array['Tropical','Herbal / Hortelã','Refrescante','Rum']::text[], 'mojito de maracuja'),
('Mojito de Maçã Verde', 'Refrescantes', '[{"n":"Rum","q":"50 ml (Carta Branca)"},{"n":"Xarope de maçã verde","q":"20 ml"},{"n":"Hortelã","q":"8 folhas"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Água com gás","q":"90 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Pressione suavemente a hortelã com limão e xarope de maçã verde no copo alto.\n2. Encha de gelo e despeje o rum branco.\n3. Complete com água com gás e mexa delicadamente.', E'1. Pressione suavemente a hortelã com limão e xarope de maçã verde no copo alto.\n2. Encha de gelo e despeje o rum branco.\n3. Complete com água com gás e mexa delicadamente.', 'Mojito verde vibrante com acidez crocante de maçã e folhas frescas de hortelã.', 'Perfeito para quem procura um drink longo super refrescante com perfil moderno e cor luminosa.', 'Copo alto', 'Macerado (muddle)', 'Hortelã fresca e rodela de limão', false, array['Refrescante','Herbal / Hortelã','Com soda / Tônica','Rum']::text[], 'mojito de maca verde'),
('Daiquiri de Abacaxi', 'Tiki & Tropicais', '[{"n":"Rum","q":"50 ml (Carta Branca)"},{"n":"Abacaxi","q":"3 pedaços"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere bem o abacaxi na coqueteleira.\n2. Adicione rum branco, limão, xarope de açúcar e gelo e bata forte por 12 segundos.\n3. Coe duas vezes para taça coupe gelada.', E'1. Macere bem o abacaxi na coqueteleira.\n2. Adicione rum branco, limão, xarope de açúcar e gelo e bata forte por 12 segundos.\n3. Coe duas vezes para taça coupe gelada.', 'Clássico cubano enriquecido com abacaxi fresco batido na coqueteleira.', 'Variação de ilha popularizada nos bares de Havana dos anos 1940 para ressaltar o lado frutado do rum carta branca.', 'Taça coupe', 'Shaker + double strain', 'Triângulo ou folha de abacaxi', true, array['Tropical','Cítrico / Ácido','Curto','Rum']::text[], 'daiquiri de abacaxi'),
('Daiquiri de Maracujá', 'Tiki & Tropicais', '[{"n":"Rum","q":"50 ml (Carta Branca)"},{"n":"Maracujá","q":"1 fruta"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata polpa de maracujá, rum, limão e xarope de açúcar com bastante gelo.\n2. Faça dupla coagem para uma taça coupe previamente gelada.\n3. Finalize com algumas sementes por cima para aroma.', E'1. Bata polpa de maracujá, rum, limão e xarope de açúcar com bastante gelo.\n2. Faça dupla coagem para uma taça coupe previamente gelada.\n3. Finalize com algumas sementes por cima para aroma.', 'Azedinho sedoso de cor dourada: Daiquiri clássico com polpa de maracujá fresco.', 'Inspirado no estilo do Pornstar Martini e dos daiquiris tropicais de praia, com textura incrivelmente aerada.', 'Taça coupe', 'Shaker + double strain', 'Meia casca de maracujá ou twist de limão', true, array['Tropical','Cítrico / Ácido','Curto','Rum']::text[], 'daiquiri de maracuja'),
('Tiki Tônica do Campos', 'Tiki & Tropicais', '[{"n":"Rum","q":"50 ml (Carta Branca)"},{"n":"Abacaxi","q":"2 pedaços"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Xarope de açúcar","q":"10 ml"},{"n":"Água tônica","q":"110 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere o abacaxi com limão e xarope na coqueteleira e bata rápido com o rum e gelo.\n2. Coe em taça ou copo alto com gelo novo.\n3. Complete com água tônica gelada.', E'1. Macere o abacaxi com limão e xarope na coqueteleira e bata rápido com o rum e gelo.\n2. Coe em taça ou copo alto com gelo novo.\n3. Complete com água tônica gelada.', 'Highball tropical leve: rum e abacaxi cortados pelo amargor limpo da tônica.', 'Mostra que o espírito Tiki pode ser leve e refrescante sem precisar de meia dúzia de licores.', 'Taça balão', 'Shaker + build', 'Fatia e folha de abacaxi', true, array['Autoral','Tropical','Com soda / Tônica','Rum']::text[], 'tiki tonica do campos'),
('Frozen de Morango com Hortelã', 'Frozen', '[{"n":"Vodka","q":"50 ml"},{"n":"Morango","q":"5 unid"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Hortelã","q":"6 folhas"},{"n":"Gelo","q":"150 g"}]'::jsonb, E'1. Bata morangos, vodka, limão, xarope de açúcar, hortelã e gelo no liquidificador até ficar cremoso.\n2. Sirva em taça grande.\n3. Decore com morango fresco e raminho de hortelã.', E'1. Bata morangos, vodka, limão, xarope de açúcar, hortelã e gelo no liquidificador até ficar cremoso.\n2. Sirva em taça grande.\n3. Decore com morango fresco e raminho de hortelã.', 'Raspadinha alcoólica de morango vivo com toque verde refrescante de hortelã.', 'Pensado para tardes de sol ou piscina, entregando cremosidade sem nenhum laticínio.', 'Taça hurricane', 'Batido (blend)', 'Morango e hortelã', false, array['Frozen','Frutado','Herbal / Hortelã','Vodka']::text[], 'frozen de morango com hortela'),
('Frozen de Maracujá com Gengibre', 'Frozen', '[{"n":"Rum","q":"50 ml (Carta Branca)"},{"n":"Maracujá","q":"1 fruta"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Xarope de gengibre","q":"15 ml"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Gelo","q":"150 g"}]'::jsonb, E'1. Coloque todos os ingredientes no liquidificador com gelo.\n2. Bata na potência máxima até formar creme uniforme e gelado.\n3. Sirva em taça grande decorada com maracujá.', E'1. Coloque todos os ingredientes no liquidificador com gelo.\n2. Bata na potência máxima até formar creme uniforme e gelado.\n3. Sirva em taça grande decorada com maracujá.', 'Creme gelado tropical de maracujá com picância elegante de gengibre e rum branco.', 'Combinação autoral de contraste térmico: super gelado na textura e levemente picante no retrogosto.', 'Taça hurricane', 'Batido (blend)', 'Sementes de maracujá e limão', false, array['Frozen','Tropical','Picante / Gengibre','Rum']::text[], 'frozen de maracuja com gengibre'),
('Energy Tropical Gin', 'Energéticos', '[{"n":"Gin","q":"50 ml (London Dry)"},{"n":"Maracujá","q":"0.5 fruta"},{"n":"Limão","q":"10 ml (Taiti)"},{"n":"Energético","q":"120 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Coloque bastante gelo, a polpa de maracujá e o limão em um copo alto.\n2. Despeje o gin.\n3. Complete com energético bem gelado e misture devagar.', E'1. Coloque bastante gelo, a polpa de maracujá e o limão em um copo alto.\n2. Despeje o gin.\n3. Complete com energético bem gelado e misture devagar.', 'Gin aromático e maracujá fresco turbinados com energético gelado.', 'Queridinho das noites de festa para quem quer sair do combo tradicional de energético com vodka.', 'Copo alto', 'Montado no copo (build)', 'Rodela de limão', false, array['Energético','Tropical','Longo','Gin']::text[], 'energy tropical gin'),
('Green Apple Bomb', 'Energéticos', '[{"n":"Vodka","q":"50 ml"},{"n":"Xarope de maçã verde","q":"20 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Energético","q":"110 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha um copo alto com gelo.\n2. Adicione vodka, xarope de maçã verde e limão.\n3. Complete com energético gelado e mexa uma vez.', E'1. Encha um copo alto com gelo.\n2. Adicione vodka, xarope de maçã verde e limão.\n3. Complete com energético gelado e mexa uma vez.', 'Verde elétrico, ácido e vibrante: maçã verde cítrica com energia na medida.', 'Inspirado nos highballs neon de pista de dança, equilibrado pelo suco de limão fresco.', 'Copo alto', 'Montado no copo (build)', 'Fatia fina de limão', false, array['Energético','Cítrico / Ácido','Longo','Vodka']::text[], 'green apple bomb'),
('Groselha Spritz Zero', 'Sem álcool', '[{"n":"Xarope de groselha","q":"25 ml"},{"n":"Limão","q":"20 ml (Taiti)"},{"n":"Hortelã","q":"6 folhas"},{"n":"Água com gás","q":"130 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha uma taça balão com gelo e dê uma leve maceração nas folhas de hortelã com o limão.\n2. Adicione o xarope de groselha.\n3. Complete com água com gás e mexa suavemente.', E'1. Encha uma taça balão com gelo e dê uma leve maceração nas folhas de hortelã com o limão.\n2. Adicione o xarope de groselha.\n3. Complete com água com gás e mexa suavemente.', 'Soda artesanal vermelha de groselha cortada por limão taiti e hortelã fresca.', 'Resgata a nostalgia da groselha de infância em uma versão adulta, seca no ponto e super aromática.', 'Taça balão', 'Montado no copo (build)', 'Ramo de hortelã e rodela de limão', false, array['Sem álcool','Frutado','Refrescante','Com soda / Tônica']::text[], 'groselha spritz zero'),
('Maracujá Fizz Zero', 'Sem álcool', '[{"n":"Maracujá","q":"1 fruta"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Xarope de gengibre","q":"20 ml"},{"n":"Água com gás","q":"120 ml"},{"n":"Hortelã","q":"5 folhas"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Bata a polpa de maracujá, o limão e o xarope de gengibre com gelo.\n2. Coe em copo alto com gelo novo.\n3. Complete com água com gás e finalize com hortelã.', E'1. Bata a polpa de maracujá, o limão e o xarope de gengibre com gelo.\n2. Coe em copo alto com gelo novo.\n3. Complete com água com gás e finalize com hortelã.', 'Mocktail sofisticado com acidez de maracujá, picância de gengibre e final borbulhante.', 'Criado para oferecer experiência de coquetelaria completa a quem não está bebendo álcool.', 'Copo alto', 'Shaker + build', 'Hortelã e sementes de maracujá', true, array['Sem álcool','Tropical','Picante / Gengibre','Com soda / Tônica']::text[], 'maracuja fizz zero'),
('Abacaxi Cooler Zero', 'Sem álcool', '[{"n":"Abacaxi","q":"3 pedaços"},{"n":"Hortelã","q":"7 folhas"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Refrigerante de limão","q":"120 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere o abacaxi com a hortelã e o limão no fundo do copo alto.\n2. Complete com bastante gelo.\n3. Finalize com refrigerante de limão gelado e mexa devagar.', E'1. Macere o abacaxi com a hortelã e o limão no fundo do copo alto.\n2. Complete com bastante gelo.\n3. Finalize com refrigerante de limão gelado e mexa devagar.', 'Cooler natural gelado de abacaxi macerado com hortelã e gás cítrico.', 'Opção leve para qualquer idade, trazendo frescor imediato com ingredientes naturais da casa.', 'Copo alto', 'Macerado (muddle)', 'Fatia de abacaxi e hortelã', false, array['Sem álcool','Tropical','Herbal / Hortelã','Refrescante']::text[], 'abacaxi cooler zero'),
('Jarra de Gin Tônica Tropical', 'Jarras', '[{"n":"Gin","q":"200 ml (London Dry)"},{"n":"Abacaxi","q":"6 pedaços"},{"n":"Morango","q":"6 unid"},{"n":"Limão","q":"1 unid (Siciliano)"},{"n":"Hortelã","q":"12 folhas"},{"n":"Água tônica","q":"500 ml"},{"n":"Gelo","q":"bastante gelo"}]'::jsonb, E'1. Encha uma jarra de 1 litro até a metade com cubos de gelo.\n2. Distribua abacaxi em cubos, morangos fatiados, rodelas de limão siciliano e hortelã.\n3. Adicione o gin, complete com água tônica gelada e mexa com colher bailarina.', E'1. Encha uma jarra de 1 litro até a metade com cubos de gelo.\n2. Distribua abacaxi em cubos, morangos fatiados, rodelas de limão siciliano e hortelã.\n3. Adicione o gin, complete com água tônica gelada e mexa com colher bailarina.', 'Jarra compartilhável de 1 L: Gin Tônica frutado com abacaxi, morango, limão e hortelã.', 'Ideal para reunir a mesa inteira em celebrações: colorida, leve e com ótimo rendimento por dose.', 'Jarra 1 L', 'Montado na jarra', 'Ramos de hortelã e frutas frescas', false, array['Para dividir (Jarra)','Refrescante','Com soda / Tônica','Gin']::text[], 'jarra de gin tonica tropical'),
('Conhaque Sour do Engenho', 'Autorais', '[{"n":"Conhaque","q":"40 ml"},{"n":"Cachaça","q":"20 ml (Ouro)"},{"n":"Limão","q":"25 ml (Siciliano)"},{"n":"Xarope de açúcar","q":"20 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Misture conhaque, cachaça ouro, limão siciliano e xarope de açúcar na coqueteleira.\n2. Bata forte com gelo por 12 segundos.\n3. Coe duas vezes sobre uma pedra grande de gelo.', E'1. Misture conhaque, cachaça ouro, limão siciliano e xarope de açúcar na coqueteleira.\n2. Bata forte com gelo por 12 segundos.\n3. Coe duas vezes sobre uma pedra grande de gelo.', 'Fusão autoral franco-brasileira: madeira nobre do conhaque com cachaça ouro e siciliano.', 'Criado para unir duas culturas de destilados envelhecidos em um sour sedoso e perfumado.', 'Old fashioned', 'Shaker + double strain', 'Casca de limão siciliano', true, array['Autoral','Brasileiro','Cítrico / Ácido','Conhaque','Cachaça']::text[], 'conhaque sour do engenho'),
('Caipirinha Rubi de Groselha', 'Brasileiríssimos', '[{"n":"Cachaça","q":"50 ml (Prata)"},{"n":"Limão","q":"1 unid (Taiti)"},{"n":"Xarope de groselha","q":"20 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere levemente os gomos de limão taiti no copo baixo.\n2. Adicione o xarope de groselha (no lugar do açúcar), cachaça prata e bastante gelo.\n3. Mexa bem ou bata rápido na coqueteleira.', E'1. Macere levemente os gomos de limão taiti no copo baixo.\n2. Adicione o xarope de groselha (no lugar do açúcar), cachaça prata e bastante gelo.\n3. Mexa bem ou bata rápido na coqueteleira.', 'Caipirinha cor de rubi onde o xarope de groselha substitui o açúcar com doçura frutada.', 'Truque clássico de botecos criativos do interior que dá cor vibrante e sabor nostálgico ao coquetel nacional.', 'Copo baixo', 'Macerado (muddle)', 'Rodela de limão taiti', false, array['Brasileiro','Doce','Frutado','Cachaça']::text[], 'caipirinha rubi de groselha'),
('Rabo de Galo com Limão', 'Brasileiríssimos', '[{"n":"Cachaça","q":"50 ml (Ouro)"},{"n":"Vermute","q":"25 ml (Tinto)"},{"n":"Limão","q":"10 ml (Taiti)"},{"n":"Gelo","q":"1 cubo grande"}]'::jsonb, E'1. Coloque cachaça ouro, vermute tinto e um fio de suco de limão sobre gelo no copo baixo.\n2. Mexa por 15 segundos para integrar e gelar.\n3. Perfume com a casca do limão.', E'1. Coloque cachaça ouro, vermute tinto e um fio de suco de limão sobre gelo no copo baixo.\n2. Mexa por 15 segundos para integrar e gelar.\n3. Perfume com a casca do limão.', 'Rabo de Galo mais fresco e equilibrado com toque cítrico vivo cortando a doçura do vermute.', 'Interpretação contemporânea do ícone paulistano dos balcões dos anos 1950, mantendo a alma firme da cachaça.', 'Old fashioned', 'Mexido', 'Casca de limão', false, array['Brasileiro','Forte','Curto','Cachaça','Vermute & Aperitivos']::text[], 'rabo de galo com limao'),
('Ginger Spritz de Conhaque', 'Aperitivos', '[{"n":"Conhaque","q":"35 ml"},{"n":"Vermute","q":"25 ml (Tinto)"},{"n":"Xarope de gengibre","q":"15 ml"},{"n":"Água com gás","q":"90 ml"},{"n":"Limão","q":"10 ml (Siciliano)"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Em taça com gelo, misture conhaque, vermute tinto, xarope de gengibre e limão.\n2. Complete com água com gás bem gelada.\n3. Mexa uma vez suavemente.', E'1. Em taça com gelo, misture conhaque, vermute tinto, xarope de gengibre e limão.\n2. Complete com água com gás bem gelada.\n3. Mexa uma vez suavemente.', 'Aperitivo especiado de conhaque e vermute tinto alongado com gengibre e gás.', 'Une a complexidade de um Metropolitan leve com a refrescância gaseificada de um spritz noturno.', 'Taça de vinho', 'Montado no copo (build)', 'Fatia fina de gengibre e limão', false, array['Autoral','Picante / Gengibre','Com soda / Tônica','Conhaque','Vermute & Aperitivos']::text[], 'ginger spritz de conhaque'),
('Vodka Tônica de Morango e Hortelã', 'Refrescantes', '[{"n":"Vodka","q":"50 ml"},{"n":"Morango","q":"3 unid"},{"n":"Hortelã","q":"6 folhas"},{"n":"Limão","q":"10 ml (Taiti)"},{"n":"Água tônica","q":"120 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere levemente 2 morangos com limão no copo alto.\n2. Adicione gelo, vodka e hortelã batida.\n3. Complete com água tônica e decore com o morango restante.', E'1. Macere levemente 2 morangos com limão no copo alto.\n2. Adicione gelo, vodka e hortelã batida.\n3. Complete com água tônica e decore com o morango restante.', 'Alternativa leve ao Gin Tônica para quem prefere base neutra de vodka com frutas frescas.', 'Combina a pureza gelada da vodka com aroma campestre de morango e hortelã sobre quinino leve.', 'Copo alto', 'Montado no copo (build)', 'Morango e hortelã', false, array['Refrescante','Frutado','Herbal / Hortelã','Com soda / Tônica','Vodka']::text[], 'vodka tonica de morango e hortela'),
('Abacaxi Smash de Rum', 'Tiki & Tropicais', '[{"n":"Rum","q":"50 ml (Carta Branca)"},{"n":"Abacaxi","q":"3 pedaços"},{"n":"Hortelã","q":"8 folhas"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere o abacaxi com a hortelã e o xarope na coqueteleira.\n2. Adicione rum e limão, bata com gelo por 10 segundos.\n3. Coe grosso em copo baixo com gelo novo.', E'1. Macere o abacaxi com a hortelã e o xarope na coqueteleira.\n2. Adicione rum e limão, bata com gelo por 10 segundos.\n3. Coe grosso em copo baixo com gelo novo.', 'Rum carta branca batido com pedaços de abacaxi fresco e bastante hortelã aromática.', 'Resgata a tradição dos Smashes clássicos americanos em roupagem caribenha de fruta fresca.', 'Copo baixo', 'Shaker', 'Ramo de hortelã e abacaxi', true, array['Tropical','Herbal / Hortelã','Refrescante','Rum']::text[], 'abacaxi smash de rum'),
('Ginger Smash de Gin', 'Refrescantes', '[{"n":"Gin","q":"50 ml (London Dry)"},{"n":"Gengibre","q":"3 fatias"},{"n":"Limão","q":"20 ml (Siciliano)"},{"n":"Hortelã","q":"6 folhas"},{"n":"Xarope de açúcar","q":"15 ml"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Macere as fatias de gengibre com xarope de açúcar no fundo da coqueteleira.\n2. Junte gin, limão siciliano, hortelã e gelo e agite firme.\n3. Coe duas vezes sobre gelo novo em copo baixo.', E'1. Macere as fatias de gengibre com xarope de açúcar no fundo da coqueteleira.\n2. Junte gin, limão siciliano, hortelã e gelo e agite firme.\n3. Coe duas vezes sobre gelo novo em copo baixo.', 'Parente picante do Gin Basil Smash: gengibre fresco, hortelã, limão siciliano e gin.', 'Une o frescor herbáceo do Smash europeu com a energia vibrante do gengibre recém-macerado.', 'Copo baixo', 'Shaker + double strain', 'Lâmina de gengibre e hortelã', true, array['Refrescante','Picante / Gengibre','Herbal / Hortelã','Gin']::text[], 'ginger smash de gin'),
('Guaraná Spritz da Casa', 'Autorais', '[{"n":"Vermute","q":"50 ml (Tinto)"},{"n":"Guaraná","q":"100 ml"},{"n":"Limão","q":"15 ml (Taiti)"},{"n":"Hortelã","q":"5 folhas"},{"n":"Gelo","q":"cubos"}]'::jsonb, E'1. Encha uma taça de vinho com gelo.\n2. Despeje o vermute tinto e o suco de limão.\n3. Complete com guaraná gelado e finalize com hortelã.', E'1. Encha uma taça de vinho com gelo.\n2. Despeje o vermute tinto e o suco de limão.\n3. Complete com guaraná gelado e finalize com hortelã.', 'Aperitivo brasileiro leve: ervas amargas do vermute tinto equilibradas com guaraná e limão.', 'Mostra como ingredientes cotidianos da geladeira brasileira criam um spritz de boteco cheio de personalidade.', 'Taça de vinho', 'Montado no copo (build)', 'Rodela de limão e hortelã', false, array['Autoral','Brasileiro','Com soda / Tônica','Vermute & Aperitivos']::text[], 'guarana spritz da casa'),
('Shot Fogo Verde', 'Shots', '[{"n":"Vodka","q":"30 ml"},{"n":"Xarope de maçã verde","q":"15 ml"},{"n":"Limão","q":"10 ml (Taiti)"},{"n":"Xarope de gengibre","q":"5 ml"},{"n":"Gelo","q":"para bater"}]'::jsonb, E'1. Bata todos os ingredientes bem gelados na coqueteleira com gelo por 8 segundos.\n2. Coe direto para o copo de shot gelado.', E'1. Bata todos os ingredientes bem gelados na coqueteleira com gelo por 8 segundos.\n2. Coe direto para o copo de shot gelado.', 'Shot esmeralda ágil que começa ácido de maçã verde e termina com picância de gengibre.', 'Criado para animar brindes em grupo sem ser enjoativo — curto, gelado e marcante.', 'Copo shot', 'Shaker', 'Sem guarnição', true, array['Shot','Autoral','Picante / Gengibre','Vodka']::text[], 'shot fogo verde'),
('Jarra de Moscow Mule de Morango', 'Jarras', '[{"n":"Vodka","q":"200 ml"},{"n":"Morango","q":"10 unid"},{"n":"Limão","q":"60 ml (Taiti)"},{"n":"Xarope de gengibre","q":"90 ml"},{"n":"Água com gás","q":"350 ml"},{"n":"Hortelã","q":"12 folhas"},{"n":"Gelo","q":"bastante gelo"}]'::jsonb, E'1. Macere os morangos fatiados com o xarope de gengibre e o suco de limão no fundo da jarra.\n2. Adicione gelo e vodka, mexendo bem.\n3. Complete com água com gás gelada e decore com bastante hortelã.', E'1. Macere os morangos fatiados com o xarope de gengibre e o suco de limão no fundo da jarra.\n2. Adicione gelo e vodka, mexendo bem.\n3. Complete com água com gás gelada e decore com bastante hortelã.', 'Jarra festiva de 1 L de Moscow Mule rosado com morango fresco, gengibre e hortelã.', 'Pensada para compartilhar em comemorações: mantém a refrescância do Mule sem precisar preparar copo por copo.', 'Jarra 1 L', 'Montado na jarra', 'Morangos, limão e hortelã', false, array['Para dividir (Jarra)','Frutado','Picante / Gengibre','Vodka']::text[], 'jarra de moscow mule de morango')
)
insert into recipes (owner, name, category, ingredients, steps, instructions, description, story, glass, technique, garnish, shaken, tags, author_nick, is_public, verified, item_type)
select null, s.name, s.category, s.ingredients, s.steps, s.instructions, s.description, s.story, s.glass, s.technique, s.garnish, s.shaken, s.tags, 'Meu Bar', true, true, 'drink'
from seed s
where not exists (
  select 1 from recipes r
  where translate(lower(trim(r.name)), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn') = s.norm_name
);

-- =============================================================================
-- CHAT DIRETO DE SUPORTE (LOJAS <-> ADMIN / EQUIPE DE SUPORTE)
-- =============================================================================
create or replace function public.is_support_staff()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_agents jsonb;
begin
  if public.is_platform_admin() or public.has_platform_permission('support_desk') then
    return true;
  end if;
  if v_email = '' then
    return false;
  end if;
  select config -> 'support_agent_emails'
    into v_agents
    from public.platform_settings
   where id = 'default'
   limit 1;
  if v_agents is null or jsonb_typeof(v_agents) <> 'array' then
    return false;
  end if;
  return exists (
    select 1
      from jsonb_array_elements_text(v_agents) as elem(val)
     where lower(trim(elem.val)) = v_email
  );
end;
$$;
grant execute on function public.is_support_staff() to authenticated;

create table if not exists public.support_threads (
  id uuid primary key default gen_random_uuid(),
  bar_id uuid references public.bars(id) on delete set null,
  bar_name text not null default 'Minha conta',
  user_id uuid not null,
  user_email text,
  subject text not null default 'Atendimento Meu Bar',
  status text not null default 'open' check (status in ('open','pending','resolved')),
  assigned_agent_email text,
  last_message text,
  last_sender_role text check (last_sender_role in ('store','support')),
  last_message_at timestamptz not null default now(),
  unread_for_support int not null default 0,
  unread_for_store int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads(id) on delete cascade,
  sender_id uuid not null,
  sender_name text not null,
  sender_email text,
  sender_role text not null check (sender_role in ('store','support')),
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists idx_support_threads_user on public.support_threads(user_id, last_message_at desc);
create index if not exists idx_support_threads_bar on public.support_threads(bar_id, last_message_at desc);
create index if not exists idx_support_messages_thread on public.support_messages(thread_id, created_at asc);

alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;

drop policy if exists support_threads_select on public.support_threads;
create policy support_threads_select on public.support_threads for select
using (
  public.is_support_staff()
  or user_id = auth.uid()
  or (bar_id is not null and exists (
    select 1 from public.bars b where b.id = support_threads.bar_id and b.owner = auth.uid()
  ))
  or (bar_id is not null and exists (
    select 1 from public.bar_members m where m.bar_id = support_threads.bar_id and m.user_id = auth.uid()
  ))
);

drop policy if exists support_threads_insert on public.support_threads;
create policy support_threads_insert on public.support_threads for insert
with check (
  auth.uid() is not null
  and (
    public.is_support_staff()
    or user_id = auth.uid()
  )
);

drop policy if exists support_threads_update on public.support_threads;
create policy support_threads_update on public.support_threads for update
using (
  public.is_support_staff()
  or user_id = auth.uid()
  or (bar_id is not null and exists (
    select 1 from public.bars b where b.id = support_threads.bar_id and b.owner = auth.uid()
  ))
)
with check (
  public.is_support_staff()
  or user_id = auth.uid()
  or (bar_id is not null and exists (
    select 1 from public.bars b where b.id = support_threads.bar_id and b.owner = auth.uid()
  ))
);

drop policy if exists support_messages_select on public.support_messages;
create policy support_messages_select on public.support_messages for select
using (
  public.is_support_staff()
  or exists (
    select 1 from public.support_threads t
     where t.id = support_messages.thread_id
       and (
         t.user_id = auth.uid()
         or (t.bar_id is not null and exists (
           select 1 from public.bars b where b.id = t.bar_id and b.owner = auth.uid()
         ))
         or (t.bar_id is not null and exists (
           select 1 from public.bar_members m where m.bar_id = t.bar_id and m.user_id = auth.uid()
         ))
       )
  )
);

drop policy if exists support_messages_insert on public.support_messages;
create policy support_messages_insert on public.support_messages for insert
with check (
  auth.uid() is not null
  and sender_id = auth.uid()
  and (
    (sender_role = 'support' and public.is_support_staff())
    or (
      sender_role = 'store'
      and exists (
        select 1 from public.support_threads t
         where t.id = support_messages.thread_id
           and (
             t.user_id = auth.uid()
             or (t.bar_id is not null and exists (
               select 1 from public.bars b where b.id = t.bar_id and b.owner = auth.uid()
             ))
             or (t.bar_id is not null and exists (
               select 1 from public.bar_members m where m.bar_id = t.bar_id and m.user_id = auth.uid()
             ))
           )
      )
    )
  )
);

create or replace function public.touch_support_thread_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.support_threads
     set last_message = left(trim(new.body), 160),
         last_sender_role = new.sender_role,
         last_message_at = new.created_at,
         status = case when new.sender_role = 'store' and status = 'resolved' then 'open' else status end,
         unread_for_support = case when new.sender_role = 'store' then coalesce(unread_for_support, 0) + 1 else 0 end,
         unread_for_store = case when new.sender_role = 'support' then coalesce(unread_for_store, 0) + 1 else 0 end
   where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists trg_support_message_touch_thread on public.support_messages;
create trigger trg_support_message_touch_thread
after insert on public.support_messages
for each row execute function public.touch_support_thread_on_message();

do $$ begin
  alter publication supabase_realtime add table public.support_threads;
exception when others then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.support_messages;
exception when others then null;
end $$;

