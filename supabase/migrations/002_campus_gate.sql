-- Confirmed by the project owner: srmist.edu.in.
create table public.approved_email_domains(domain text primary key);
insert into public.approved_email_domains(domain) values ('srmist.edu.in');
alter table public.approved_email_domains enable row level security;
create function public.campus_verified() returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from auth.users u join public.approved_email_domains d on d.domain=lower(split_part(u.email,'@',2))
    where u.id=auth.uid() and u.email_confirmed_at is not null
  );
$$;
revoke all on function public.campus_verified() from public;
grant execute on function public.campus_verified() to authenticated;

drop policy profiles_read on public.profiles;
drop policy profiles_update on public.profiles;
drop policy projects_read on public.projects;
drop policy projects_insert on public.projects;
drop policy projects_update on public.projects;
drop policy projects_delete on public.projects;
drop policy members_read on public.project_members;
drop policy requests_read on public.join_requests;
drop policy notifications_read on public.notifications;
drop policy notifications_update on public.notifications;
create policy profiles_read on public.profiles for select to authenticated using (public.campus_verified());
create policy profiles_update on public.profiles for update to authenticated using (id=auth.uid() and public.campus_verified()) with check (id=auth.uid() and public.campus_verified());
create policy projects_read on public.projects for select to authenticated using (public.campus_verified());
create policy projects_insert on public.projects for insert to authenticated with check (owner_id=auth.uid() and public.campus_verified());
create policy projects_update on public.projects for update to authenticated using (owner_id=auth.uid() and public.campus_verified()) with check (owner_id=auth.uid() and public.campus_verified());
create policy projects_delete on public.projects for delete to authenticated using (owner_id=auth.uid() and public.campus_verified());
create policy members_read on public.project_members for select to authenticated using (public.campus_verified());
create policy requests_read on public.join_requests for select to authenticated using (public.campus_verified() and (applicant_id=auth.uid() or exists(select 1 from public.projects p where p.id=project_id and p.owner_id=auth.uid())));
create policy notifications_read on public.notifications for select to authenticated using (user_id=auth.uid() and public.campus_verified());
create policy notifications_update on public.notifications for update to authenticated using (user_id=auth.uid() and public.campus_verified()) with check (user_id=auth.uid() and public.campus_verified());

create function public.protect_profile_identity() returns trigger language plpgsql as $$
begin
  if new.id<>old.id or new.email<>old.email then raise exception 'Profile identity cannot be changed'; end if;
  new.updated_at=now();
  return new;
end $$;
create trigger protect_profile before update on public.profiles for each row execute function public.protect_profile_identity();
create function public.protect_project_capacity() returns trigger language plpgsql as $$
begin
  if new.owner_id<>old.owner_id then raise exception 'Project ownership cannot be changed'; end if;
  if new.max_team_size < (select count(*) from public.project_members where project_id=old.id) then raise exception 'Team size cannot be below current members'; end if;
  new.updated_at=now();
  return new;
end $$;
create trigger protect_project before update on public.projects for each row execute function public.protect_project_capacity();

drop policy avatar_read on storage.objects;
drop policy avatar_insert on storage.objects;
drop policy avatar_update on storage.objects;
drop policy avatar_delete on storage.objects;
update storage.buckets set public=false where id='avatars';
create policy avatar_read on storage.objects for select to authenticated using (bucket_id='avatars' and public.campus_verified());
create policy avatar_insert on storage.objects for insert to authenticated with check (bucket_id='avatars' and public.campus_verified() and split_part(name,'/',1)=auth.uid()::text);
create policy avatar_update on storage.objects for update to authenticated using (bucket_id='avatars' and public.campus_verified() and split_part(name,'/',1)=auth.uid()::text) with check (bucket_id='avatars' and public.campus_verified() and split_part(name,'/',1)=auth.uid()::text);
create policy avatar_delete on storage.objects for delete to authenticated using (bucket_id='avatars' and public.campus_verified() and split_part(name,'/',1)=auth.uid()::text);

create or replace function public.apply_to_project(p_project_id uuid,p_message text) returns uuid language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_project public.projects%rowtype; v_count integer; v_id uuid;
begin
  if not public.campus_verified() then raise exception 'Verified campus account required'; end if;
  select * into v_project from public.projects where id=p_project_id for update;
  if not found then raise exception 'Project not found'; end if;
  if v_project.owner_id=v_user then raise exception 'You own this project'; end if;
  if v_project.status<>'Open' then raise exception 'Project is not open'; end if;
  if char_length(trim(p_message)) not between 5 and 500 then raise exception 'Message must be 5 to 500 characters'; end if;
  select count(*) into v_count from public.project_members where project_id=p_project_id;
  if v_count>=v_project.max_team_size then raise exception 'Team is full'; end if;
  if exists(select 1 from public.project_members where project_id=p_project_id and user_id=v_user) then raise exception 'Already a member'; end if;
  if exists(select 1 from public.join_requests where project_id=p_project_id and applicant_id=v_user and status='pending') then raise exception 'Request already pending'; end if;
  insert into public.join_requests(project_id,applicant_id,message) values(p_project_id,v_user,trim(p_message)) returning id into v_id;
  insert into public.notifications(user_id,project_id,title,body) values(v_project.owner_id,p_project_id,'New join request','A student applied to join '||v_project.title);
  return v_id;
end $$;
create or replace function public.review_join_request(p_request_id uuid,p_accept boolean) returns void language plpgsql security definer set search_path=public as $$
declare v_request public.join_requests%rowtype; v_project public.projects%rowtype; v_count integer;
begin
  if not public.campus_verified() then raise exception 'Verified campus account required'; end if;
  select * into v_request from public.join_requests where id=p_request_id for update;
  if not found or v_request.status<>'pending' then raise exception 'Pending request not found'; end if;
  select * into v_project from public.projects where id=v_request.project_id for update;
  if v_project.owner_id is distinct from auth.uid() then raise exception 'Only the project owner can review requests'; end if;
  if p_accept then
    if v_project.status<>'Open' then raise exception 'Project is not open'; end if;
    select count(*) into v_count from public.project_members where project_id=v_project.id;
    if v_count>=v_project.max_team_size then raise exception 'Team is full'; end if;
    insert into public.project_members(project_id,user_id,role) values(v_project.id,v_request.applicant_id,'Member');
  end if;
  update public.join_requests set status=case when p_accept then 'accepted' else 'rejected' end,reviewed_at=now() where id=p_request_id;
  insert into public.notifications(user_id,project_id,title,body) values(v_request.applicant_id,v_project.id,case when p_accept then 'Request accepted' else 'Request declined' end,case when p_accept then 'You joined ' else 'Your request was declined for ' end||v_project.title);
  if p_accept then insert into public.notifications(user_id,project_id,title,body) values(v_project.owner_id,v_project.id,'New teammate','A student joined '||v_project.title); end if;
end $$;
create or replace function public.cancel_join_request(p_request_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.campus_verified() then raise exception 'Verified campus account required'; end if;
  update public.join_requests set status='cancelled',reviewed_at=now() where id=p_request_id and applicant_id=auth.uid() and status='pending';
  if not found then raise exception 'Pending request not found'; end if;
end $$;
