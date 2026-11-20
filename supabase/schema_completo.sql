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

create or replace function place_order(p_bar uuid, p_name text, p_recipe uuid, p_qty int, p_note text) returns uuid
language plpgsql security definer set search_path=public,extensions as $$
declare b bars; pr numeric; rname text; oid uuid;
begin
  select * into b from bars where id = p_bar;
  if b.id is null then raise exception 'Bar não encontrado'; end if;
  if not b.accepting_orders then raise exception 'Pedidos pausados no momento'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Informe seu nome'; end if;
  if p_qty < 1 or p_qty > 5 then raise exception 'Quantidade inválida'; end if;
  select price into pr from bar_prices where bar_id = p_bar and recipe_id = p_recipe;
  select name into rname from recipes where id = p_recipe;
  if b.kind not in ('home', 'casa') and pr is null then raise exception 'Drink indisponível'; end if;
  insert into orders(bar_id, recipe_id, client_name, customer_name, recipe_name, qty, note, price, unit_price)
  values(p_bar, p_recipe, left(trim(p_name), 40), left(trim(p_name), 40), rname, p_qty, left(p_note, 140), pr, pr)
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

grant execute on function get_menu(uuid), active_client_names(uuid), place_order(uuid, text, uuid, int, text), order_status(uuid[]) to anon, authenticated;
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
  alter publication supabase_realtime add table job_posts;
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

