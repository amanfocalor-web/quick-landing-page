-- Knot v27.4: ensure every authenticated user has a profile row before saving interests.
-- This repairs accounts created before the auth->profiles trigger was installed.

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

  -- Older accounts can exist in auth.users without a corresponding Knot profile.
  -- Create the parent row first so profile_interests foreign keys are valid.
  insert into public.profiles(id)
  values (auth.uid())
  on conflict (id) do nothing;

  if p_dob is not null and not (p_dob <= current_date - interval '18 years' and p_dob > current_date - interval '22 years') then
    update public.profiles
    set date_of_birth = p_dob, profile_complete = false, updated_at = now()
    where id = auth.uid()
    returning * into result;

    delete from public.profile_interests where profile_id = auth.uid();
    return result;
  end if;

  update public.profiles set
    name = trim(coalesce(p_name,'')),
    profile_photo_path = p_photo_path,
    date_of_birth = p_dob,
    city = trim(coalesce(p_city,'')),
    gender = nullif(trim(coalesce(p_gender,'')), ''),
    bio = trim(coalesce(p_bio,'')),
    intent = trim(coalesce(p_intent,'')),
    preference = trim(coalesce(p_preference,'')),
    age_min = p_age_min,
    age_max = p_age_max,
    theme = p_theme,
    star_color = p_star_color,
    incognito = coalesce(p_incognito,false),
    profile_complete = p_complete and p_dob is not null and p_gender in ('man','woman') and eligibility = 'eligible',
    updated_at = now()
  where id = auth.uid()
  returning * into result;

  delete from public.profile_interests where profile_id = auth.uid();
  insert into public.profile_interests(profile_id, interest)
  select auth.uid(), trim(x)
  from unnest(coalesce(p_interests, '{}'::text[])) x
  where char_length(trim(x)) between 1 and 40
  on conflict do nothing;

  return result;
end $$;

revoke all on function public.save_profile(text,text,date,text,text,text,text,text,smallint,smallint,text,text,boolean,text[],boolean) from public;
grant execute on function public.save_profile(text,text,date,text,text,text,text,text,smallint,smallint,text,text,boolean,text[],boolean) to authenticated;
