-- EXECUTE ESTAS QUERIES NO SQL EDITOR DO SUPABASE PARA CRIAR AS TABELAS

-- 1. EXTENSÃO PARA UUID
create extension if not exists "uuid-ossp";

-- 2. TABELA DE LEADS
create table if not exists leads (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  segment text,
  address text,
  city text,
  state text,
  phone text,
  email text,
  website text,
  has_own_website boolean default false,
  rating decimal,
  user_ratings_total integer,
  place_id text,
  score integer default 0,
  status text default 'new',
  origin text default 'manual',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(name, city)
);

-- 3. TABELA DE CAMPANHAS
create table if not exists campaigns (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  niche text,
  city text,
  status text default 'draft',
  daily_limit integer default 30,
  sent_count integer default 0,
  replies_count integer default 0,
  meetings_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. TABELA DE HISTÓRICO DE CONTATOS
create table if not exists contacts_history (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references leads(id) on delete cascade,
  type text not null, -- 'email', 'whatsapp'
  status text not null, -- 'sent', 'replied', 'failed', 'pending'
  message text,
  date timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. TABELA DE PERFIS / CONFIGURAÇÕES
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  google_places_api_key text,
  n8n_webhook_url text,
  smtp_host text,
  smtp_port text,
  email_sender text,
  warmup_mode boolean default true,
  waba_token text,
  phone_number_id text,
  b2b_only boolean default true,
  unsubscribe_option boolean default true,
  validation_before_send boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- HABILITAR RLS (Row Level Security)
alter table leads enable row level security;
alter table campaigns enable row level security;
alter table contacts_history enable row level security;
alter table profiles enable row level security;

-- CRIAR POLÍTICAS DE ACESSO (Exemplo: Todos os usuários autenticados podem ver e editar)
create policy "Allow all actions for authenticated users" on leads for all using (true); -- Alterado para true para facilitar o teste inicial
create policy "Allow all actions for authenticated users" on campaigns for all using (true);
create policy "Allow all actions for authenticated users" on contacts_history for all using (true);
create policy "Allow all actions for authenticated users" on profiles for all using (true);

-- TRIGGERS PARA ATUALIZAR O UPDATED_AT AUTOMATICAMENTE
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leads_updated_at before update on leads for each row execute procedure handle_updated_at();
create trigger campaigns_updated_at before update on campaigns for each row execute procedure handle_updated_at();
create trigger profiles_updated_at before update on profiles for each row execute procedure handle_updated_at();
