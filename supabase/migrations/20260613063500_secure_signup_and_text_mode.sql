alter table public.question_banks
  add column if not exists content_mode text not null default 'questions'
  check (content_mode in ('questions', 'text'));

create table if not exists public.registration_invites (
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

insert into public.registration_invites (code_hash, label, max_uses, expires_at)
values (
  '73d0d409b252d8db21c6fe5b13fd04e92ab49dc522d82f0f1bed5f58b3ce028f',
  'initial private beta',
  5,
  '2027-01-01T00:00:00Z'
)
on conflict (code_hash) do nothing;

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
  if invite_code = '' then
    return jsonb_build_object(
      'error', jsonb_build_object('http_code', 403, 'message', 'Registration access denied: invite code required.')
    );
  end if;

  select id into invite_id
  from public.registration_invites
  where code_hash = encode(extensions.digest(invite_code, 'sha256'), 'hex')
    and enabled
    and use_count < max_uses
    and (expires_at is null or expires_at > now())
  for update;

  if invite_id is null then
    return jsonb_build_object(
      'error', jsonb_build_object('http_code', 403, 'message', 'Registration access denied: invalid or expired invite code.')
    );
  end if;

  update public.registration_invites
  set use_count = use_count + 1
  where id = invite_id;

  return '{}'::jsonb;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_validate_signup_invite(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_validate_signup_invite(jsonb) from anon, authenticated, public;
