-- Knot v38: a Secret Crush is an Interested action, and a match may be created
-- when the other person independently chose either Interested or Secret Crush.
create or replace function public.add_secret_crush(p_target uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare mutual boolean := false; match_id uuid; target_name text;
begin
  if not public.is_active_user(auth.uid()) then raise exception 'KNOT_ACCESS_DENIED'; end if;
  if p_target = auth.uid() then raise exception 'Invalid target'; end if;
  if not exists(select 1 from public.profiles where id=p_target and profile_complete and eligibility='eligible' and verification_status='verified' and relationship_state='single' and not incognito and not public.is_banned(id)) then raise exception 'Profile is not available'; end if;
  if (select count(*) from public.secret_crushes where from_id=auth.uid()) >= 3
     and not exists(select 1 from public.secret_crushes where from_id=auth.uid() and to_id=p_target) then
    raise exception 'KNOT_SECRET_CRUSH_LIMIT';
  end if;

  insert into public.secret_crushes(from_id,to_id) values(auth.uid(),p_target) on conflict do nothing;
  insert into public.discovery_actions(actor_id,target_id,action)
    values(auth.uid(),p_target,'interested')
    on conflict(actor_id,target_id) do update set action='interested', created_at=now();

  -- The recipient may have chosen the viewer as either Interested or Secret Crush.
  mutual := exists(
    select 1 from public.discovery_actions
    where actor_id=p_target and target_id=auth.uid() and action='interested'
  ) or exists(
    select 1 from public.secret_crushes
    where from_id=p_target and to_id=auth.uid()
  );

  if mutual then
    insert into public.matches(user_a,user_b) values(auth.uid(),p_target) on conflict do nothing returning id into match_id;
    if match_id is null then
      select id into match_id from public.matches
      where least(user_a,user_b)=least(auth.uid(),p_target)
        and greatest(user_a,user_b)=greatest(auth.uid(),p_target);
    end if;
    insert into public.chats(match_id) values(match_id) on conflict(match_id) do nothing;
    insert into public.chat_members(chat_id,profile_id)
      select c.id,x.uid from public.chats c cross join lateral(values(auth.uid()),(p_target)) x(uid)
      where c.match_id=match_id on conflict do nothing;
    update public.profiles set relationship_state='trial' where id in(auth.uid(),p_target);
    select name into target_name from public.profiles where id=p_target;
    insert into public.notifications(profile_id,type,title,body) values
      (auth.uid(),'match','It’s a mutual connection','You and '||coalesce(target_name,'someone')||' can start a trial chat'),
      (p_target,'match','It’s a mutual connection','You have a new trial chat waiting');
  end if;
  return jsonb_build_object('ok',true,'mutual_match',mutual,'match_id',match_id);
end $$;

revoke all on function public.add_secret_crush(uuid) from public;
grant execute on function public.add_secret_crush(uuid) to authenticated;
