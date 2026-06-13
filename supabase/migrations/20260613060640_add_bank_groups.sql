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

create unique index bank_groups_owner_name_idx on public.bank_groups (owner_id, lower(name));
create index bank_group_memberships_bank_idx on public.bank_group_memberships (bank_id);

alter table public.bank_groups enable row level security;
alter table public.bank_group_memberships enable row level security;

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

grant select, insert, update, delete on public.bank_groups, public.bank_group_memberships to authenticated;
