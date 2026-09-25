-- Knot deployment diagnostic (read-only)
-- Run this in Supabase SQL Editor after applying both migrations.
-- It does not expose passwords, service-role keys, chat bodies, or Secret Crush rows.

select 'profiles' as object, to_regclass('public.profiles') is not null as present
union all select 'profile_interests', to_regclass('public.profile_interests') is not null
union all select 'discovery_actions', to_regclass('public.discovery_actions') is not null
union all select 'secret_crushes', to_regclass('public.secret_crushes') is not null
union all select 'matches', to_regclass('public.matches') is not null
union all select 'chats', to_regclass('public.chats') is not null
union all select 'messages', to_regclass('public.messages') is not null
union all select 'founder_access', to_regclass('public.founder_access') is not null
union all select 'notifications', to_regclass('public.notifications') is not null
union all select 'push_subscriptions', to_regclass('public.push_subscriptions') is not null;

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'save_profile','get_discover_profiles','record_discovery_action',
    'add_secret_crush','get_my_matches','get_my_chats','send_message',
    'is_founder','creator_overview'
  )
order by routine_name;

select id, name, public
from storage.buckets
where id = 'profile-photos';

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name = 'gender';
