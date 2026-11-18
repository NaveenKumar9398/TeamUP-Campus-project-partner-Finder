-- Apply after 003. All membership changes are serialized on the project row.
alter table public.profiles add column if not exists is_discoverable boolean not null default true;
create or replace function public.profile_campus_verified(p_user_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from auth.users u join public.approved_email_domains d on d.domain=lower(split_part(u.email,'@',2))
    where u.id=p_user_id and u.email_confirmed_at is not null);
$$;
revoke all on function public.profile_campus_verified(uuid) from public;
grant execute on function public.profile_campus_verified(uuid) to authenticated;
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using
  (public.campus_verified() and (id=auth.uid() or public.profile_campus_verified(id)));
alter table public.projects drop constraint if exists projects_project_type_check;
alter table public.projects add constraint projects_project_type_check check (project_type in ('PBL','Minor','Major','Hackathon','Research','Technical Competition','Other'));

create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create unique index if not exists one_pending_invitation on public.team_invitations(project_id,invitee_id) where status='pending';
create index if not exists invitations_invitee_idx on public.team_invitations(invitee_id,created_at desc);

create table if not exists public.team_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists messages_project_idx on public.team_messages(project_id,created_at desc);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  assignee_id uuid references public.profiles(id),
  title text not null check (char_length(trim(title)) between 3 and 160),
  description text not null default '' check (char_length(description)<=2000),
  deadline date,
  status text not null default 'To Do' check (status in ('To Do','In Progress','Completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_project_idx on public.project_tasks(project_id,deadline);
create index if not exists tasks_assignee_idx on public.project_tasks(assignee_id,deadline);

create or replace function public.is_team_member(p_project_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.project_members where project_id=p_project_id and user_id=auth.uid());
$$;
revoke all on function public.is_team_member(uuid) from public;
grant execute on function public.is_team_member(uuid) to authenticated;

alter table public.team_invitations enable row level security;
alter table public.team_messages enable row level security;
alter table public.project_tasks enable row level security;
drop policy if exists invitations_read on public.team_invitations;
drop policy if exists messages_read on public.team_messages;
drop policy if exists messages_insert on public.team_messages;
drop policy if exists tasks_read on public.project_tasks;
drop policy if exists tasks_insert on public.project_tasks;
drop policy if exists tasks_update on public.project_tasks;
create policy invitations_read on public.team_invitations for select to authenticated using
  (public.campus_verified() and (invitee_id=auth.uid() or exists(select 1 from public.projects where id=project_id and owner_id=auth.uid())));
create policy messages_read on public.team_messages for select to authenticated using (public.campus_verified() and public.is_team_member(project_id));
create policy messages_insert on public.team_messages for insert to authenticated with check
  (public.campus_verified() and sender_id=auth.uid() and public.is_team_member(project_id));
create policy tasks_read on public.project_tasks for select to authenticated using (public.campus_verified() and public.is_team_member(project_id));
create policy tasks_insert on public.project_tasks for insert to authenticated with check
  (public.campus_verified() and created_by=auth.uid() and public.is_team_member(project_id)
   and (assignee_id is null or exists(select 1 from public.project_members where project_id=project_tasks.project_id and user_id=assignee_id)));
create policy tasks_update on public.project_tasks for update to authenticated using
  (public.campus_verified() and public.is_team_member(project_id) and (created_by=auth.uid() or assignee_id=auth.uid() or exists(select 1 from public.projects where id=project_id and owner_id=auth.uid())))
  with check (public.campus_verified() and public.is_team_member(project_id) and
    (assignee_id is null or exists(select 1 from public.project_members where project_id=project_tasks.project_id and user_id=assignee_id)));

create or replace function public.send_team_invitation(p_project_id uuid,p_invitee_id uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_project public.projects%rowtype; v_id uuid;
begin
  if not public.campus_verified() then raise exception 'Verified campus account required'; end if;
  select * into v_project from public.projects where id=p_project_id for update;
  if not found or v_project.owner_id<>auth.uid() then raise exception 'Only the owner can invite'; end if;
  if v_project.status<>'Open' then raise exception 'Project is not open'; end if;
  if p_invitee_id=auth.uid() then raise exception 'You cannot invite yourself'; end if;
  if not public.profile_campus_verified(p_invitee_id) or not exists(select 1 from public.profiles where id=p_invitee_id and is_discoverable and availability<>'Unavailable') then raise exception 'Student is not discoverable'; end if;
  if (select count(*) from public.project_members where project_id=p_project_id)>=v_project.max_team_size then raise exception 'Team is full'; end if;
  if exists(select 1 from public.project_members where project_id=p_project_id and user_id=p_invitee_id) then raise exception 'Already a member'; end if;
  if exists(select 1 from public.team_invitations where project_id=p_project_id and invitee_id=p_invitee_id and status='pending') then raise exception 'Invitation already pending'; end if;
  insert into public.team_invitations(project_id,invitee_id) values(p_project_id,p_invitee_id) returning id into v_id;
  insert into public.notifications(user_id,project_id,title,body) values(p_invitee_id,p_project_id,'Team invitation','You were invited to join '||v_project.title);
  return v_id;
end $$;

create or replace function public.review_team_invitation(p_invitation_id uuid,p_accept boolean) returns void
language plpgsql security definer set search_path=public as $$
declare v_inv public.team_invitations%rowtype; v_project public.projects%rowtype;
begin
  if not public.campus_verified() then raise exception 'Verified campus account required'; end if;
  select * into v_inv from public.team_invitations where id=p_invitation_id;
  if not found or v_inv.invitee_id<>auth.uid() then raise exception 'Invitation not found'; end if;
  select * into v_project from public.projects where id=v_inv.project_id for update;
  select * into v_inv from public.team_invitations where id=p_invitation_id for update;
  if v_inv.status<>'pending' then raise exception 'Invitation already reviewed'; end if;
  if p_accept then
    if v_project.status<>'Open' then raise exception 'Project is not open'; end if;
    if (select count(*) from public.project_members where project_id=v_project.id)>=v_project.max_team_size then raise exception 'Team is full'; end if;
    insert into public.project_members(project_id,user_id,role) values(v_project.id,auth.uid(),'Member');
  end if;
  update public.team_invitations set status=case when p_accept then 'accepted' else 'declined' end,reviewed_at=now() where id=p_invitation_id;
  insert into public.notifications(user_id,project_id,title,body) values(v_project.owner_id,v_project.id,case when p_accept then 'Invitation accepted' else 'Invitation declined' end,'A student '||case when p_accept then 'joined ' else 'declined ' end||v_project.title);
end $$;
revoke all on function public.send_team_invitation(uuid,uuid), public.review_team_invitation(uuid,boolean) from public;
grant execute on function public.send_team_invitation(uuid,uuid), public.review_team_invitation(uuid,boolean) to authenticated;

create or replace function public.task_assignment_notice() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' then
    if new.assignee_id is not null and new.assignee_id<>auth.uid() then
      insert into public.notifications(user_id,project_id,title,body) values(new.assignee_id,new.project_id,'New task assignment','You were assigned: '||new.title);
    end if;
  elsif new.assignee_id is not null and new.assignee_id is distinct from old.assignee_id and new.assignee_id<>auth.uid() then
    insert into public.notifications(user_id,project_id,title,body) values(new.assignee_id,new.project_id,'New task assignment','You were assigned: '||new.title);
  end if;
  return new;
end $$;
drop trigger if exists task_assignment_notice on public.project_tasks;
create trigger task_assignment_notice after insert or update of assignee_id on public.project_tasks for each row execute function public.task_assignment_notice();

grant select on public.team_invitations,public.team_messages,public.project_tasks to authenticated;
grant insert on public.team_messages,public.project_tasks to authenticated;
grant update(status,updated_at) on public.project_tasks to authenticated;
grant update(is_discoverable) on public.profiles to authenticated;
-- Supabase Realtime can be enabled for team_messages and notifications in the dashboard.
