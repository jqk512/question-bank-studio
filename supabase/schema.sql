-- Design draft for the hosted phase. Convert this file into a Supabase CLI
-- migration after connecting the target project.

create extension if not exists pgcrypto;

create type public.bank_status as enum ('draft', 'review', 'published');
create type public.bank_visibility as enum ('private', 'public');
create type public.question_type as enum ('single', 'multiple', 'judgment', 'unknown');
create type public.import_status as enum ('queued', 'extracting', 'parsing', 'review', 'completed', 'failed');

create table public.question_banks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  slug text not null unique check (
    char_length(slug) between 1 and 160
    and slug !~ '[[:space:]/?#]'
  ),
  description text not null default '',
  status public.bank_status not null default 'draft',
  visibility public.bank_visibility not null default 'private',
  content_mode text not null default 'questions' check (content_mode in ('questions', 'text')),
  source_file_path text,
  source_file_name text not null default '',
  source_file_type text not null default '',
  question_count integer not null default 0 check (question_count >= 0),
  warning_count integer not null default 0 check (warning_count >= 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null references public.question_banks(id) on delete cascade,
  sequence integer not null check (sequence > 0),
  type public.question_type not null default 'unknown',
  stem text not null,
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  answer jsonb not null default '[]'::jsonb check (jsonb_typeof(answer) = 'array'),
  answer_text jsonb not null default '[]'::jsonb check (jsonb_typeof(answer_text) = 'array'),
  explanation text not null default '',
  source_page integer,
  raw_text text not null default '',
  confidence numeric(4, 3) not null default 0 check (confidence between 0 and 1),
  warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(warnings) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bank_id, sequence)
);

create table public.bank_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bank_group_memberships (
  group_id uuid not null references public.bank_groups(id) on delete cascade,
  bank_id uuid not null references public.question_banks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, bank_id)
);

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  bank_id uuid references public.question_banks(id) on delete cascade,
  status public.import_status not null default 'queued',
  progress integer not null default 0 check (progress between 0 and 100),
  total_blocks integer not null default 0 check (total_blocks >= 0),
  parsed_count integer not null default 0 check (parsed_count >= 0),
  warning_count integer not null default 0 check (warning_count >= 0),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.registration_invites (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  label text not null default '',
  max_uses integer not null default 1 check (max_uses > 0),
  use_count integer not null default 0 check (use_count >= 0),
  expires_at timestamptz,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

revoke all on public.registration_invites from anon, authenticated, public;

create or replace function public.hook_validate_signup_invite(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite_code text := trim(coalesce(event->'user'->'user_metadata'->>'signup_code', ''));
  invite_id uuid;
begin
  select id into invite_id
  from public.registration_invites
  where invite_code <> ''
    and code_hash = encode(extensions.digest(invite_code, 'sha256'), 'hex')
    and enabled
    and use_count < max_uses
    and (expires_at is null or expires_at > now())
  for update;

  if invite_id is null then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'Registration access denied: invalid or expired invite code.'
    ));
  end if;

  update public.registration_invites set use_count = use_count + 1 where id = invite_id;
  return '{}'::jsonb;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_validate_signup_invite(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_validate_signup_invite(jsonb) from anon, authenticated, public;

create index question_banks_owner_updated_idx on public.question_banks (owner_id, updated_at desc);
create index question_banks_public_idx on public.question_banks (visibility, status) where visibility = 'public' and status = 'published';
create index questions_bank_sequence_idx on public.questions (bank_id, sequence);
create unique index bank_groups_owner_name_idx on public.bank_groups (owner_id, lower(name));
create index bank_group_memberships_bank_idx on public.bank_group_memberships (bank_id);
create index import_jobs_owner_created_idx on public.import_jobs (owner_id, created_at desc);

alter table public.question_banks enable row level security;
alter table public.questions enable row level security;
alter table public.bank_groups enable row level security;
alter table public.bank_group_memberships enable row level security;
alter table public.import_jobs enable row level security;

create policy "Owners can read their banks"
on public.question_banks for select to authenticated
using ((select auth.uid()) = owner_id);

create policy "Anyone can read published public banks"
on public.question_banks for select to anon, authenticated
using (visibility = 'public' and status = 'published');

create policy "Owners can create banks"
on public.question_banks for insert to authenticated
with check ((select auth.uid()) = owner_id);

create policy "Owners can update banks"
on public.question_banks for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "Owners can delete banks"
on public.question_banks for delete to authenticated
using ((select auth.uid()) = owner_id);

create policy "Owners can read bank questions"
on public.questions for select to authenticated
using (exists (
  select 1 from public.question_banks bank
  where bank.id = questions.bank_id and bank.owner_id = (select auth.uid())
));

create policy "Anyone can read questions from published public banks"
on public.questions for select to anon, authenticated
using (exists (
  select 1 from public.question_banks bank
  where bank.id = questions.bank_id
    and bank.visibility = 'public'
    and bank.status = 'published'
));

create policy "Owners can create bank questions"
on public.questions for insert to authenticated
with check (exists (
  select 1 from public.question_banks bank
  where bank.id = questions.bank_id and bank.owner_id = (select auth.uid())
));

create policy "Owners can update bank questions"
on public.questions for update to authenticated
using (exists (
  select 1 from public.question_banks bank
  where bank.id = questions.bank_id and bank.owner_id = (select auth.uid())
))
with check (exists (
  select 1 from public.question_banks bank
  where bank.id = questions.bank_id and bank.owner_id = (select auth.uid())
));

create policy "Owners can delete bank questions"
on public.questions for delete to authenticated
using (exists (
  select 1 from public.question_banks bank
  where bank.id = questions.bank_id and bank.owner_id = (select auth.uid())
));

create policy "Owners manage their import jobs"
on public.import_jobs for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "Owners manage their bank groups"
on public.bank_groups for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "Owners read their bank group memberships"
on public.bank_group_memberships for select to authenticated
using (exists (
  select 1 from public.bank_groups bank_group
  where bank_group.id = bank_group_memberships.group_id
    and bank_group.owner_id = (select auth.uid())
));

create policy "Owners create their bank group memberships"
on public.bank_group_memberships for insert to authenticated
with check (
  exists (
    select 1 from public.bank_groups bank_group
    where bank_group.id = bank_group_memberships.group_id
      and bank_group.owner_id = (select auth.uid())
  )
  and exists (
    select 1 from public.question_banks bank
    where bank.id = bank_group_memberships.bank_id
      and bank.owner_id = (select auth.uid())
  )
);

create policy "Owners delete their bank group memberships"
on public.bank_group_memberships for delete to authenticated
using (exists (
  select 1 from public.bank_groups bank_group
  where bank_group.id = bank_group_memberships.group_id
    and bank_group.owner_id = (select auth.uid())
));

-- Supabase changed new-project Data API defaults in 2026. Keep these grants
-- explicit; RLS still determines which rows each role may access.
grant usage on schema public to anon, authenticated;
grant select on public.question_banks, public.questions to anon;
grant select, insert, update, delete on public.question_banks, public.questions, public.import_jobs to authenticated;
grant select, insert, update, delete on public.bank_groups, public.bank_group_memberships to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'question-sources',
  'question-sources',
  false,
  52428800,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ]
)
on conflict (id) do nothing;

create policy "Users can upload their own source files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'question-sources'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can read their own source files"
on storage.objects for select to authenticated
using (
  bucket_id = 'question-sources'
  and owner_id = (select auth.uid()::text)
);

create policy "Users can update their own source files"
on storage.objects for update to authenticated
using (
  bucket_id = 'question-sources'
  and owner_id = (select auth.uid()::text)
)
with check (
  bucket_id = 'question-sources'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can delete their own source files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'question-sources'
  and owner_id = (select auth.uid()::text)
);

-- Some dashboard-created projects include this helper in the public schema.
-- It is administrative and must not be executable through the Data API.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;
