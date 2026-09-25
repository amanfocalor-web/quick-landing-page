-- Knot v27: explicit gender for current straight-only matching + Secret Crush limit
alter table public.profiles
  add column if not exists gender text;

alter table public.profiles
  drop constraint if exists profiles_gender_check;

alter table public.profiles
  add constraint profiles_gender_check check (gender is null or gender in ('man','woman'));

-- Replace the profile-save RPC with the v27 gender field.
drop function if exists public.save_profile(text,text,date,text,text,text,text,smallint,smallint,text,text,boolean,text[],boolean);

create or replace function public.save_profile(
  p_name text,
  p_photo_path text,
  p_dob date,
  p_city text,
  p_gender text,
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
  if p_gender is not null and trim(p_gender) not in ('man','woman') then raise exception 'Invalid gender'; end if;
  if p_dob is not null and not (p_dob <= current_date - interval '18 years' and p_dob > current_date - interval '22 years') then
    update public.profiles set date_of_birth = p_dob, profile_complete = false where id = auth.uid() returning * into result;
    delete from public.profile_interests where profile_id = auth.uid();
    return result;
  end if;
  update public.profiles set
    name = trim(coalesce(p_name,'')), profile_photo_path = p_photo_path, date_of_birth = p_dob,
    city = trim(coalesce(p_city,'')), gender = nullif(trim(coalesce(p_gender,'')), ''),
    bio = trim(coalesce(p_bio,'')), intent = trim(coalesce(p_intent,'')),
    preference = trim(coalesce(p_preference,'')), age_min = p_age_min, age_max = p_age_max,
    theme = p_theme, star_color = p_star_color, incognito = coalesce(p_incognito,false),
    profile_complete = p_complete and p_dob is not null and p_gender in ('man','woman') and eligibility = 'eligible', updated_at = now()
  where id = auth.uid()
  returning * into result;

  delete from public.profile_interests where profile_id = auth.uid();
  insert into public.profile_interests(profile_id, interest)
  select auth.uid(), trim(x) from unnest(coalesce(p_interests, '{}'::text[])) x
  where char_length(trim(x)) between 1 and 40 on conflict do nothing;
  return result;
end $$;

-- Straight-only Discover pool for users who have supplied a gender.
-- Existing legacy profiles without gender remain discoverable until they complete v27 setup.
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
      and (viewer.gender is null or p.gender is null or (viewer.gender='man' and p.gender='woman') or (viewer.gender='woman' and p.gender='man'))
      and extract(year from age(current_date, p.date_of_birth)) between viewer.age_min and viewer.age_max
      and not exists (select 1 from public.discovery_actions a where a.actor_id = auth.uid() and a.target_id = p.id)
    group by p.id
    order by case when exists (select 1 from public.cupid_actions ca where ca.ends_at > now() and ((ca.target_a=auth.uid() and ca.target_b=p.id) or (ca.target_b=auth.uid() and ca.target_a=p.id))) then 0 else 1 end, p.created_at desc;
end $$;

-- Enforce the three-active-Secret-Crush limit server-side.
create or replace function public.add_secret_crush(p_target uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare mutual boolean := false; match_id uuid;
begin
  if not public.is_active_user(auth.uid()) then raise exception 'KNOT_ACCESS_DENIED'; end if;
  if p_target = auth.uid() then raise exception 'Invalid target'; end if;
  if not exists(select 1 from public.profiles where id=p_target and profile_complete and eligibility='eligible' and verification_status='verified' and relationship_state='single' and not incognito and not public.is_banned(id)) then raise exception 'Profile is not available'; end if;
  if (select count(*) from public.secret_crushes where from_id=auth.uid()) >= 3
     and not exists(select 1 from public.secret_crushes where from_id=auth.uid() and to_id=p_target) then
    raise exception 'KNOT_SECRET_CRUSH_LIMIT';
  end if;
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
