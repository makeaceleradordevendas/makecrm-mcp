-- Fixture sintética exclusiva de um PostgreSQL temporário. NÃO executar no SaaS.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated, anon, service_role;

create table public.companys (id uuid primary key, status boolean);
create table public.users (id uuid primary key, company_id uuid, status boolean);
create table public.contacts (id uuid primary key, company_id uuid, name varchar, emails jsonb, phones jsonb, created_at timestamptz not null);
create table public.pipelines (id uuid primary key, company_id uuid, name varchar);
create table public.pipeline_deals (
  id uuid primary key, company_id uuid, pipeline_id uuid, name varchar, value numeric, status smallint,
  currency bigint, stage_id uuid, contact_id uuid, user_id uuid, sdr_id uuid, closer_id uuid,
  created_at timestamptz not null, updated_at timestamptz
);
create table public.inboxes (id uuid primary key, company_id uuid, name varchar);
create table public.inbox_conversations (
  id uuid primary key, inbox_id uuid, name varchar, identifier varchar, user_id uuid, sdr_id uuid,
  closer_id uuid, created_at timestamptz not null, last_inbound_at timestamptz, last_outbound_at timestamptz,
  last_message_content jsonb, external_ids jsonb
);
grant select on all tables in schema public to authenticated;
alter table public.users enable row level security;
alter table public.companys enable row level security;
alter table public.contacts enable row level security;
alter table public.pipelines enable row level security;
alter table public.pipeline_deals enable row level security;
alter table public.inboxes enable row level security;
alter table public.inbox_conversations enable row level security;
create policy own_user on public.users for select to authenticated using (id = auth.uid());
create policy own_company on public.companys for select to authenticated using (id = (select company_id from public.users where id = auth.uid()));
create policy own_contacts on public.contacts for select to authenticated using (company_id = (select company_id from public.users where id = auth.uid()));
create policy own_pipelines on public.pipelines for select to authenticated using (company_id = (select company_id from public.users where id = auth.uid()));
create policy assigned_deals on public.pipeline_deals for select to authenticated using (user_id = auth.uid());
create policy own_inboxes on public.inboxes for select to authenticated using (company_id = (select company_id from public.users where id = auth.uid()));
create policy assigned_conversations on public.inbox_conversations for select to authenticated using (user_id = auth.uid());

insert into companys values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true), ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);
insert into users values
 ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true),
 ('22222222-2222-4222-8222-222222222222', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true),
 ('33333333-3333-4333-8333-333333333333', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true),
 ('44444444-4444-4444-8444-444444444444', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false);
insert into contacts values
 ('10000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Primeiro', '[]', '[]', '2026-09-08 12:00:00.123456+00'),
 ('10000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '100% contato', '[]', '[]', '2026-09-08 12:00:00.123456+00'),
 ('10000000-0000-4000-8000-000000000003', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Segredo B', '[]', '[]', '2026-09-08 12:00:00.123456+00');
insert into pipelines values
 ('20000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Funil A'),
 ('20000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Funil B');
insert into pipeline_deals (id, company_id, pipeline_id, name, user_id, created_at) values
 ('30000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '20000000-0000-4000-8000-000000000001', 'Visível A', '11111111-1111-4111-8111-111111111111', now()),
 ('30000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '20000000-0000-4000-8000-000000000001', 'Outro responsável', '22222222-2222-4222-8222-222222222222', now()),
 ('30000000-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '20000000-0000-4000-8000-000000000002', 'Referência cruzada inválida', '11111111-1111-4111-8111-111111111111', now());
insert into inboxes values
 ('40000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Caixa A'),
 ('40000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Caixa B');
insert into inbox_conversations (id, inbox_id, name, user_id, created_at, last_message_content, external_ids) values
 ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Conversa A', '11111111-1111-4111-8111-111111111111', now(), '{"private":"segredo"}', '{"token":"segredo"}'),
 ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', 'Conversa A restrita', '22222222-2222-4222-8222-222222222222', now(), '{}', '{}'),
 ('50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000002', 'Conversa B', '33333333-3333-4333-8333-333333333333', now(), '{}', '{}');
