-- Execute no SQL Editor do Supabase antes de inserir contatos.
create extension if not exists pgcrypto;
create table if not exists public.leads (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null, phone text not null, development text default 'Dom Parque',
 status text not null default 'Pendente' check(status in ('Pendente','Mensagem enviada','Retornar depois','Visita marcada','Visita realizada','Sem resposta','Não tem interesse','Convertido')),
 preferred_modality text, next_action_date date, notes text, archived boolean not null default false,
 last_contacted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.lead_history (
 id uuid primary key default gen_random_uuid(),
 lead_id uuid not null references public.leads(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 action text not null, details text, created_at timestamptz not null default now()
);
create index if not exists leads_user_id_idx on public.leads(user_id);
create index if not exists lead_history_lead_id_idx on public.lead_history(lead_id);
alter table public.leads enable row level security;
alter table public.lead_history enable row level security;
drop policy if exists "Users manage own leads" on public.leads;
create policy "Users manage own leads" on public.leads for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "Users read own history" on public.lead_history;
create policy "Users read own history" on public.lead_history for select to authenticated using(auth.uid()=user_id);
drop policy if exists "Users add own history" on public.lead_history;
create policy "Users add own history" on public.lead_history for insert to authenticated with check(auth.uid()=user_id);
create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists set_leads_updated_at on public.leads;
create trigger set_leads_updated_at before update on public.leads for each row execute function public.set_updated_at();
