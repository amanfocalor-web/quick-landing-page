create extension if not exists pgcrypto;

-- Knot core schema
-- Privacy rule: Creator/admin functions never expose secret-crush rows or chat message bodies

do $$ begin
  create type public.knot_eligibility as enum ('pending','eligible','ineligible');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.knot_relationship as enum ('single','trial','coupled','cooling_off','banned');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.discovery_action as enum ('pass','interested');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.verification_state as enum ('not_started','pending','verified','rejected','needs_review');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.chat_state as enum ('trial','coupled','closed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.admin_role as enum ('moderator','admin','founder');
exception when duplicate_object then null; end $$;

drop table if exists public.demo_profiles cascade;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 80),
  profile_photo_path text,
  date_of_birth date,
  city text not null default '' check (char_length(city) between 0 and 80),
  bio text not null default '' check (char_length(bio) <= 500),
  intent text not null default '' check (char_length(intent) <= 100),
  preference text not null default '' check (char_length(preference) <= 100),
  age_min smallint not null default 18 check (age_min between 18 and 21),
  age_max smallint not null default 21 check (age_max between 18 and 21 and age_max >= age_min),
  theme text not null default 'dark' check (theme in ('light','dark')),
  star_color text not null default '#c084fc' check (star_color ~ '^#[0-9A-Fa-f]{6}$'),
  incognito boolean not null default false,
  profile_complete boolean not null default false,
  eligibility public.knot_eligibility not null default 'pending',
  verification_status public.verification_state not null default 'not_started',
  relationship_state public.knot_relationship not null default 'single',
  partner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_interests (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  interest text not null check (char_length(interest) between 1 and 40),
  primary key (profile_id, interest)
);

create table if not exists public.discovery_actions (
  actor_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  action public.discovery_action not null,
  created_at timestamptz not null default now(),
  primary key (actor_id, target_id),
  check (actor_id <> target_id)
);

create table if not exists public.secret_crushes (
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  matched_at timestamptz not null default now(),
  state public.knot_relationship not null default 'trial',
  exclusive_requested_by uuid references public.profiles(id),
  exclusive_requested_at timestamptz,
  check (user_a <> user_b)
);

create unique index if not exists uq_matches_pair on public.matches(least(user_a, user_b), greatest(user_a, user_b));

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  match_id uuid unique not null references public.matches(id) on delete cascade,
  state public.chat_state not null default 'trial',
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.chat_members (
  chat_id uuid not null references public.chats(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  primary key (chat_id, profile_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  partner_a uuid not null references public.profiles(id) on delete cascade,
  partner_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  check (partner_a <> partner_b)
);
create unique index if not exists uq_couples_pair on public.couples(least(partner_a, partner_b), greatest(partner_a, partner_b));

create table if not exists public.breakups (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  requested_by uuid not null references public.profiles(id),
  requested_at timestamptz not null default now(),
  cooling_off_until timestamptz not null default (now() + interval '24 hours'),
  resolved_at timestamptz,
  resolved_state text check (resolved_state in ('continued','ended'))
);

create table if not exists public.couple_connections (
  id uuid primary key default gen_random_uuid(),
  couple_a_id uuid not null references public.couples(id) on delete cascade,
  couple_b_id uuid not null references public.couples(id) on delete cascade,
  approved_by_a boolean not null default false,
  approved_by_b boolean not null default false,
  created_at timestamptz not null default now(),
  check (couple_a_id <> couple_b_id)
);
create unique index if not exists uq_couple_connections_pair on public.couple_connections(least(couple_a_id, couple_b_id), greatest(couple_a_id, couple_b_id));

create table if not exists public.bans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  ban_type text not null check (ban_type in ('temporary','permanent')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  reason text not null,
  internal_note text,
  issued_by uuid references public.profiles(id) on delete set null,
  appeal_state text not null default 'none' check (appeal_state in ('none','pending','approved','rejected')),
  created_at timestamptz not null default now(),
  check (ban_type = 'permanent' or ends_at is not null)
);

create table if not exists public.appeals (
  id uuid primary key default gen_random_uuid(),
  ban_id uuid not null references public.bans(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  state text not null default 'pending' check (state in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  description text,
  state text not null default 'open' check (state in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.moderation_cases (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports(id) on delete set null,
  target_id uuid references public.profiles(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  state text not null default 'open' check (state in ('open','reviewing','resolved','dismissed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_roles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  role public.admin_role not null,
  created_at timestamptz not null default now()
);

-- The founder allowlist is the only source of access to the private Cupid/Command Center.
-- It starts empty and must be populated manually for the founder account after Supabase Auth is created.
create table if not exists public.founder_access (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cupid_actions (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  target_a uuid not null references public.profiles(id) on delete cascade,
  target_b uuid not null references public.profiles(id) on delete cascade,
  action_type text not null check (action_type in ('spark','boost')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  check (target_a <> target_b)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read_at timestamptz,
  push_sent_at timestamptz,
  push_error text,
  created_at timestamptz not null default now()
);

alter table public.notifications add column if not exists push_sent_at timestamptz;
alter table public.notifications add column if not exists push_error text;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique(profile_id, endpoint)
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  body text not null check (char_length(body) between 1 and 5000),
  category text,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_city on public.profiles(city);
create index if not exists idx_profiles_eligibility on public.profiles(eligibility);
create index if not exists idx_profiles_relationship on public.profiles(relationship_state);
create index if not exists idx_actions_actor on public.discovery_actions(actor_id, created_at desc);
create index if not exists idx_messages_chat_time on public.messages(chat_id, created_at);
create index if not exists idx_notifications_profile on public.notifications(profile_id, created_at desc);
create index if not exists idx_bans_profile on public.bans(profile_id, starts_at desc);
create index if not exists idx_reports_state on public.reports(state, created_at desc);

create or replace function public.set_updated_at() returns trigger
language plpgsql security invoker as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists moderation_cases_updated_at on public.moderation_cases;
create trigger moderation_cases_updated_at before update on public.moderation_cases for each row execute function public.set_updated_at();

create or replace function public.refresh_eligibility() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.date_of_birth is null then
    new.eligibility := 'pending';
  elsif new.date_of_birth <= (current_date - interval '18 years')
    and new.date_of_birth > (current_date - interval '22 years') then
    new.eligibility := 'eligible';
  else
    new.eligibility := 'ineligible';
    new.profile_complete := false;
  end if;
  return new;
end $$;

drop trigger if exists profiles_eligibility on public.profiles;
create trigger profiles_eligibility before insert or update of date_of_birth on public.profiles for each row execute function public.refresh_eligibility();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id) values (new.id) on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_roles where profile_id = auth.uid());
$$;

create or replace function public.is_founder() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.founder_access where profile_id = auth.uid() and active);
$$;

create or replace function public.is_banned(p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.bans b
    where b.profile_id = p_user
      and b.starts_at <= now()
      and (b.ban_type = 'permanent' or b.ends_at > now())
  );
$$;

create or replace function public.is_active_user(p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user
      and p.eligibility = 'eligible'
      and p.profile_complete = true
      and p.verification_status = 'verified'
      and not public.is_banned(p_user)
  );
$$;

-- Profile save. The caller cannot mark themselves eligible or verified.
create or replace function public.save_profile(
  p_name text,
  p_photo_path text,
  p_dob date,
  p_city text,
  p_bio text,
  p_intent text,
  p_preference text,
  p_age_min smallint,
  p_age_max smallint,
  p_theme text,
  p_star_color text,
  p_incognito boolean,
  p_interests text[],
  p_complete boolean
) returns public.profiles
language plpgsql security definer set search_path = public as $$
declare result public.profiles;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_dob is not null and not (p_dob <= current_date - interval '18 years' and p_dob > current_date - interval '22 years') then
    update public.profiles set date_of_birth = p_dob, profile_complete = false where id = auth.uid() returning * into result;
    delete from public.profile_interests where profile_id = auth.uid();
    return result;
  end if;
  update public.profiles set
    name = trim(coalesce(p_name,'')), profile_photo_path = p_photo_path, date_of_birth = p_dob,
    city = trim(coalesce(p_city,'')), bio = trim(coalesce(p_bio,'')), intent = trim(coalesce(p_intent,'')),
    preference = trim(coalesce(p_preference,'')), age_min = p_age_min, age_max = p_age_max,
    theme = p_theme, star_color = p_star_color, incognito = coalesce(p_incognito,false),
    profile_complete = p_complete and p_dob is not null and eligibility = 'eligible', updated_at = now()
  where id = auth.uid()
  returning * into result;

  delete from public.profile_interests where profile_id = auth.uid();
  insert into public.profile_interests(profile_id, interest)
  select auth.uid(), trim(x) from unnest(coalesce(p_interests, '{}'::text[])) x
  where char_length(trim(x)) between 1 and 40 on conflict do nothing;
  return result;
end $$;

-- Discovery is returned only through this controlled function. City is used as a filter but never returned as a visible card field.
create or replace function public.get_discover_profiles()
returns table(id uuid, name text, age integer, profile_photo_path text, interests text[])
language plpgsql security definer set search_path = public as $$
declare viewer public.profiles;
begin
  select * into viewer from public.profiles where profiles.id = auth.uid();
  if viewer.id is null or not public.is_active_user(auth.uid()) then return; end if;
  return query
    select p.id,
      p.name,
      extract(year from age(current_date, p.date_of_birth))::integer,
      p.profile_photo_path,
      coalesce(array_agg(pi.interest) filter (where pi.interest is not null), '{}')
    from public.profiles p
    left join public.profile_interests pi on pi.profile_id = p.id
    where p.id <> auth.uid()
      and p.profile_complete = true
      and p.eligibility = 'eligible'
      and p.relationship_state = 'single'
      and not p.incognito
      and not public.is_banned(p.id)
      and p.city = viewer.city
      and extract(year from age(current_date, p.date_of_birth)) between viewer.age_min and viewer.age_max
      and not exists (select 1 from public.discovery_actions a where a.actor_id = auth.uid() and a.target_id = p.id)
    group by p.id
    order by case when exists (select 1 from public.cupid_actions ca where ca.ends_at > now() and ((ca.target_a=auth.uid() and ca.target_b=p.id) or (ca.target_b=auth.uid() and ca.target_a=p.id))) then 0 else 1 end, p.created_at desc;
end $$;

create or replace function public.record_discovery_action(p_target uuid, p_action public.discovery_action)
returns jsonb language plpgsql security definer set search_path = public as $$
declare mutual boolean := false; match_id uuid; target_name text;
begin
  if not public.is_active_user(auth.uid()) then raise exception 'KNOT_ACCESS_DENIED'; end if;
  if p_target = auth.uid() then raise exception 'Invalid target'; end if;
  if not exists (select 1 from public.profiles p where p.id=p_target and p.profile_complete and p.eligibility='eligible' and p.relationship_state='single' and not p.incognito and not public.is_banned(p.id)) then raise exception 'Profile is not available'; end if;
  insert into public.discovery_actions(actor_id,target_id,action) values(auth.uid(),p_target,p_action)
    on conflict(actor_id,target_id) do update set action=excluded.action, created_at=now();
  if p_action='interested' then
    mutual := exists(select 1 from public.discovery_actions where actor_id=p_target and target_id=auth.uid() and action='interested');
    if mutual then
      insert into public.matches(user_a,user_b) values(auth.uid(),p_target) on conflict do nothing returning id into match_id;
      if match_id is null then select id into match_id from public.matches where least(user_a,user_b)=least(auth.uid(),p_target) and greatest(user_a,user_b)=greatest(auth.uid(),p_target); end if;
      insert into public.chats(match_id) values(match_id) on conflict(match_id) do nothing;
      insert into public.chat_members(chat_id,profile_id)
        select c.id, x.uid from public.chats c cross join lateral (values(auth.uid()),(p_target)) x(uid) where c.match_id=match_id on conflict do nothing;
      update public.profiles set relationship_state='trial' where id in(auth.uid(),p_target);
      select name into target_name from public.profiles where id=p_target;
      insert into public.notifications(profile_id,type,title,body) values
        (auth.uid(),'match','It’s a mutual connection','You and '||coalesce(target_name,'someone')||' can start a trial chat'),
        (p_target,'match','It’s a mutual connection','You have a new trial chat waiting');
    end if;
  end if;
  return jsonb_build_object('ok',true,'mutual_match',mutual,'match_id',match_id);
end $$;

-- Secret Crush is deliberately write-only to the recipient. The caller can only see their own outgoing rows through RLS.
create or replace function public.add_secret_crush(p_target uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare mutual boolean := false; match_id uuid;
begin
  if not public.is_active_user(auth.uid()) then raise exception 'KNOT_ACCESS_DENIED'; end if;
  if p_target = auth.uid() then raise exception 'Invalid target'; end if;
  if not exists(select 1 from public.profiles where id=p_target and profile_complete and eligibility='eligible' and verification_status='verified' and relationship_state='single' and not incognito and not public.is_banned(id)) then raise exception 'Profile is not available'; end if;
  insert into public.secret_crushes(from_id,to_id) values(auth.uid(),p_target) on conflict do nothing;
  mutual := exists(select 1 from public.secret_crushes where from_id=p_target and to_id=auth.uid());
  if mutual then
    insert into public.matches(user_a,user_b) values(auth.uid(),p_target) on conflict do nothing returning id into match_id;
    if match_id is null then select id into match_id from public.matches where least(user_a,user_b)=least(auth.uid(),p_target) and greatest(user_a,user_b)=greatest(auth.uid(),p_target); end if;
    insert into public.chats(match_id) values(match_id) on conflict(match_id) do nothing;
    insert into public.chat_members(chat_id,profile_id) select c.id,x.uid from public.chats c cross join lateral(values(auth.uid()),(p_target)) x(uid) where c.match_id=match_id on conflict do nothing;
    update public.profiles set relationship_state='trial' where id in(auth.uid(),p_target);
    insert into public.notifications(profile_id,type,title,body) values(auth.uid(),'match','Your Secret Crush matched','You both chose each other'),(p_target,'match','Your Secret Crush matched','You both chose each other');
  end if;
  return jsonb_build_object('ok',true,'mutual_match',mutual,'match_id',match_id);
end $$;

create or replace function public.remove_secret_crush(p_target uuid) returns boolean
language sql security definer set search_path=public as $$
  delete from public.secret_crushes where from_id=auth.uid() and to_id=p_target;
  select true;
$$;

create or replace function public.get_my_matches()
returns table(match_id uuid, other_id uuid, other_name text, other_photo_path text, state public.knot_relationship)
language sql security definer set search_path=public as $$
  select m.id, case when m.user_a=auth.uid() then m.user_b else m.user_a end,
    p.name,p.profile_photo_path,m.state
  from public.matches m
  join public.profiles p on p.id = case when m.user_a=auth.uid() then m.user_b else m.user_a end
  where (m.user_a=auth.uid() or m.user_b=auth.uid()) and public.is_active_user(auth.uid());
$$;

create or replace function public.get_my_chats()
returns table(chat_id uuid, other_id uuid, other_name text, other_photo_path text, state public.chat_state, last_message text, last_message_at timestamptz)
language sql security definer set search_path=public as $$
  select c.id, p.id, p.name, p.profile_photo_path, c.state, lm.body, lm.created_at
  from public.chats c
  join public.chat_members me on me.chat_id=c.id and me.profile_id=auth.uid()
  join public.chat_members other on other.chat_id=c.id and other.profile_id<>auth.uid()
  join public.profiles p on p.id=other.profile_id
  left join lateral (select body,created_at from public.messages m where m.chat_id=c.id order by created_at desc limit 1) lm on true
  where public.is_active_user(auth.uid());
$$;

create or replace function public.send_message(p_chat uuid,p_body text) returns public.messages
language plpgsql security definer set search_path=public as $$
declare result public.messages;
begin
  if not public.is_active_user(auth.uid()) then raise exception 'KNOT_ACCESS_DENIED'; end if;
  if not exists(select 1 from public.chat_members where chat_id=p_chat and profile_id=auth.uid()) then raise exception 'Not a chat member'; end if;
  insert into public.messages(chat_id,sender_id,body) values(p_chat,auth.uid(),trim(p_body)) returning * into result;
  insert into public.notifications(profile_id,type,title,body)
    select cm.profile_id,'message','New message',left(trim(p_body),120) from public.chat_members cm where cm.chat_id=p_chat and cm.profile_id<>auth.uid();
  return result;
end $$;

create or replace function public.request_exclusive(p_match uuid) returns boolean
language plpgsql security definer set search_path=public as $$
declare other_id uuid;
begin
  select case when user_a=auth.uid() then user_b else user_a end into other_id from public.matches where id=p_match and (user_a=auth.uid() or user_b=auth.uid()) and state='trial';
  if other_id is null then raise exception 'Match unavailable'; end if;
  update public.matches set exclusive_requested_by=auth.uid(),exclusive_requested_at=now() where id=p_match;
  insert into public.notifications(profile_id,type,title,body) values(other_id,'exclusive','A new step in your connection','They chose to ask about going exclusive');
  return true;
end $$;

create or replace function public.accept_exclusive(p_match uuid) returns boolean
language plpgsql security definer set search_path=public as $$
declare a uuid;b uuid;cid uuid;
begin
  select user_a,user_b into a,b from public.matches where id=p_match and (user_a=auth.uid() or user_b=auth.uid()) and state='trial' and exclusive_requested_by is not null;
  if a is null then raise exception 'Match unavailable'; end if;
  insert into public.couples(partner_a,partner_b) values(a,b) on conflict do nothing returning id into cid;
  if cid is null then select id into cid from public.couples where least(partner_a,partner_b)=least(a,b) and greatest(partner_a,partner_b)=greatest(a,b); end if;
  update public.matches set state='coupled' where id=p_match;
  update public.profiles set relationship_state='coupled',partner_id=case when id=a then b else a end where id in(a,b);
  update public.chats set state='coupled' where match_id=p_match;
  insert into public.notifications(profile_id,type,title,body) values(a,'coupled','Welcome to Coupled Mode','Your connection is now shared'),(b,'coupled','Welcome to Coupled Mode','Your connection is now shared');
  return true;
end $$;

create or replace function public.start_breakup(p_couple uuid) returns boolean
language plpgsql security definer set search_path=public as $$
declare other_id uuid;
begin
  select case when partner_a=auth.uid() then partner_b else partner_a end into other_id from public.couples where id=p_couple and ended_at is null and (partner_a=auth.uid() or partner_b=auth.uid());
  if other_id is null then raise exception 'Couple unavailable'; end if;
  insert into public.breakups(couple_id,requested_by) values(p_couple,auth.uid());
  update public.profiles set relationship_state='cooling_off' where id in(auth.uid(),other_id);
  insert into public.notifications(profile_id,type,title,body) values(other_id,'breakup','A relationship change was requested','Knot has started the 24-hour cooling-off period');
  return true;
end $$;

create or replace function public.resolve_breakup(p_breakup uuid,p_continue boolean) returns boolean
language plpgsql security definer set search_path=public as $$
declare cid uuid; a uuid;b uuid;
begin
  select couple_id into cid from public.breakups where id=p_breakup and requested_by=auth.uid() and resolved_at is null;
  if cid is null then raise exception 'Breakup request unavailable'; end if;
  if now() < (select cooling_off_until from public.breakups where id=p_breakup) and not p_continue then raise exception 'Cooling off is still active'; end if;
  select partner_a,partner_b into a,b from public.couples where id=cid;
  update public.breakups set resolved_at=now(),resolved_state=case when p_continue then 'continued' else 'ended' end where id=p_breakup;
  if p_continue then update public.profiles set relationship_state='coupled' where id in(a,b);
  else update public.couples set ended_at=now() where id=cid; update public.profiles set relationship_state='single',partner_id=null where id in(a,b); end if;
  return true;
end $$;

-- Creator controls operate through narrowly-scoped functions and audit every action. They cannot read chat bodies or secret crush rows.
create or replace function public.creator_overview()
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not public.is_founder() then raise exception 'Not authorized'; end if;
  return jsonb_build_object(
    'users',(select count(*) from public.profiles),
    'eligible',(select count(*) from public.profiles where eligibility='eligible'),
    'active',(select count(*) from public.profiles where public.is_active_user(id)),
    'trial_matches',(select count(*) from public.matches where state='trial'),
    'couples',(select count(*) from public.couples where ended_at is null),
    'open_reports',(select count(*) from public.reports where state in('open','reviewing')),
    'banned',(select count(*) from public.bans where starts_at<=now() and (ban_type='permanent' or ends_at>now()))
  );
end $$;

create or replace function public.creator_user_search(p_query text)
returns table(id uuid,name text,city text,eligibility public.knot_eligibility,relationship_state public.knot_relationship,verification_status public.verification_state,joined_at timestamptz)
language sql security definer set search_path=public as $$
  select p.id,p.name,p.city,p.eligibility,p.relationship_state,p.verification_status,p.created_at
  from public.profiles p where public.is_founder() and (p.name ilike '%'||coalesce(p_query,'')||'%' or p.city ilike '%'||coalesce(p_query,'')||'%') order by p.created_at desc limit 100;
$$;

create or replace function public.creator_ban_user(p_target uuid,p_type text,p_duration_hours integer,p_reason text,p_note text)
returns boolean language plpgsql security definer set search_path=public as $$
declare ends timestamptz;
begin
  if not public.is_founder() then raise exception 'Not authorized'; end if;
  if p_type='temporary' then ends:=now()+make_interval(hours=>greatest(p_duration_hours,1)); else ends:=null; end if;
  insert into public.bans(profile_id,ban_type,ends_at,reason,internal_note,issued_by) values(p_target,p_type,ends,p_reason,p_note,auth.uid());
  update public.profiles set relationship_state='banned',profile_complete=false where id=p_target;
  insert into public.audit_logs(actor_id,action,target_type,target_id,metadata) values(auth.uid(),'ban_user','profile',p_target,jsonb_build_object('type',p_type,'reason',p_reason));
  return true;
end $$;

create or replace function public.creator_unban_user(p_target uuid) returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not public.is_founder() then raise exception 'Not authorized'; end if;
  update public.bans set ends_at=now(),appeal_state='approved' where profile_id=p_target and starts_at<=now() and (ban_type='permanent' or ends_at>now());
  update public.profiles set relationship_state='single' where id=p_target and eligibility='eligible';
  insert into public.audit_logs(actor_id,action,target_type,target_id) values(auth.uid(),'unban_user','profile',p_target);
  return true;
end $$;

create or replace function public.creator_spark(p_a uuid,p_b uuid,p_hours integer default 24) returns boolean
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_founder() then raise exception 'Founder access required'; end if;
  insert into public.cupid_actions(created_by,target_a,target_b,action_type,ends_at) values(auth.uid(),p_a,p_b,'spark',now()+make_interval(hours=>greatest(p_hours,1)));
  insert into public.audit_logs(actor_id,action,target_type,metadata) values(auth.uid(),'cupid_spark','profile_pair',jsonb_build_object('target_a',p_a,'target_b',p_b,'hours',p_hours));
  return true;
end $$;

create or replace function public.get_notifications() returns table(id uuid,type text,title text,body text,read_at timestamptz,created_at timestamptz)
language sql security definer set search_path=public as $$ select id,type,title,body,read_at,created_at from public.notifications where profile_id=auth.uid() order by created_at desc limit 100; $$;

create or replace function public.mark_notification_read(p_id uuid) returns boolean language sql security definer set search_path=public as $$ update public.notifications set read_at=now() where id=p_id and profile_id=auth.uid(); select true; $$;

create or replace function public.creator_reports()
returns table(id uuid, reporter_id uuid, target_id uuid, category text, description text, state text, created_at timestamptz)
language sql security definer set search_path=public as $$
  select r.id,r.reporter_id,r.target_id,r.category,r.description,r.state,r.created_at
  from public.reports r where public.is_founder() order by r.created_at desc limit 100;
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.profile_interests enable row level security;
alter table public.discovery_actions enable row level security;
alter table public.secret_crushes enable row level security;
alter table public.matches enable row level security;
alter table public.chats enable row level security;
alter table public.chat_members enable row level security;
alter table public.messages enable row level security;
alter table public.couples enable row level security;
alter table public.breakups enable row level security;
alter table public.couple_connections enable row level security;
alter table public.bans enable row level security;
alter table public.appeals enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_cases enable row level security;
alter table public.admin_roles enable row level security;
alter table public.founder_access enable row level security;
alter table public.audit_logs enable row level security;
alter table public.cupid_actions enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.feedback enable row level security;

drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles for select using (id=auth.uid());
drop policy if exists interests_self on public.profile_interests;
create policy interests_self on public.profile_interests for all using (profile_id=auth.uid()) with check (profile_id=auth.uid());
drop policy if exists discovery_self on public.discovery_actions;
create policy discovery_self on public.discovery_actions for select using (actor_id=auth.uid());
drop policy if exists crush_self on public.secret_crushes;
create policy crush_self on public.secret_crushes for select using (from_id=auth.uid());

drop policy if exists matches_member on public.matches;
create policy matches_member on public.matches for select using (public.is_active_user(auth.uid()) and (user_a=auth.uid() or user_b=auth.uid()));
drop policy if exists chats_member on public.chats;
create policy chats_member on public.chats for select using (public.is_active_user(auth.uid()) and exists(select 1 from public.chat_members cm where cm.chat_id=id and cm.profile_id=auth.uid()));
drop policy if exists chat_members_self on public.chat_members;
create policy chat_members_self on public.chat_members for select using (public.is_active_user(auth.uid()) and profile_id=auth.uid());
drop policy if exists messages_member on public.messages;
create policy messages_member on public.messages for select using (public.is_active_user(auth.uid()) and exists(select 1 from public.chat_members cm where cm.chat_id=messages.chat_id and cm.profile_id=auth.uid()));

-- No direct insert/update/delete on messages, crushes, matches, chats, or chat members from the client. Use controlled RPCs.

drop policy if exists couples_member on public.couples;
create policy couples_member on public.couples for select using (public.is_active_user(auth.uid()) and (partner_a=auth.uid() or partner_b=auth.uid()));
drop policy if exists breakups_member on public.breakups;
create policy breakups_member on public.breakups for select using (requested_by=auth.uid() or exists(select 1 from public.couples c where c.id=couple_id and (c.partner_a=auth.uid() or c.partner_b=auth.uid())));
drop policy if exists bans_self on public.bans;
create policy bans_self on public.bans for select using (profile_id=auth.uid());
drop policy if exists appeals_self on public.appeals;
create policy appeals_self on public.appeals for select using (profile_id=auth.uid());
create policy appeals_insert on public.appeals for insert with check (profile_id=auth.uid());
drop policy if exists reports_create on public.reports;
create policy reports_create on public.reports for insert with check (reporter_id=auth.uid() and public.is_active_user(auth.uid()));
drop policy if exists notifications_self on public.notifications;
create policy notifications_self on public.notifications for select using (profile_id=auth.uid());
drop policy if exists push_self on public.push_subscriptions;
create policy push_self on public.push_subscriptions for all using (profile_id=auth.uid()) with check (profile_id=auth.uid());
drop policy if exists feedback_self on public.feedback;
create policy feedback_self on public.feedback for insert with check (profile_id=auth.uid());

-- founder_access intentionally has no client policy. Founder identity is enforced only by security-definer functions.
-- Admin/Creator data is exposed through RPCs only. In particular, there is intentionally no admin policy on messages or secret_crushes.

-- Private profile photo bucket
insert into storage.buckets(id,name,public) values('profile-photos','profile-photos',false) on conflict(id) do nothing;

drop policy if exists profile_photo_upload on storage.objects;
create policy profile_photo_upload on storage.objects for insert to authenticated with check (bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists profile_photo_select on storage.objects;
create policy profile_photo_select on storage.objects for select to authenticated using (bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists profile_photo_update on storage.objects;
create policy profile_photo_update on storage.objects for update to authenticated using (bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists profile_photo_delete on storage.objects;
create policy profile_photo_delete on storage.objects for delete to authenticated using (bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text);

-- Realtime can be enabled later for messages/notifications without changing the data model

-- Push delivery
-- Configure a Supabase Database Webhook for public.notifications INSERT -> send-push.
-- The webhook must use the project's service-role auth header. The Edge Function then marks push_sent_at/push_error.
-- This keeps push delivery server-side and prevents browsers from choosing another user's profile_id.
