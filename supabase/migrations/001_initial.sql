create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default 'Student',
  department text not null default '',
  academic_year integer not null default 1 check (academic_year between 1 and 6),
  section text,
  bio text,
  skills text[] not null default '{}',
  interests text[] not null default '{}',
  project_preferences text[] not null default '{}',
  availability text not null default 'Available' check (availability in ('Available','Open to offers','Unavailable')),
  github_url text,
  linkedin_url text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 100),
  description text not null,
  category text not null,
  project_type text not null check (project_type in ('PBL','Minor','Major','Hackathon','Research','Other')),
  required_skills text[] not null default '{}',
  required_roles text[] not null default '{}',
  max_team_size integer not null check (max_team_size between 2 and 20),
  duration text,
  deadline date,
  status text not null default 'Open' check (status in ('Open','In Progress','Completed','Closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'Member',
  joined_at timestamptz not null default now(),
  primary key (project_id,user_id)
);
create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (char_length(message) between 5 and 500),
  status text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create unique index one_pending_request on public.join_requests(project_id,applicant_id) where status='pending';
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index projects_owner_idx on public.projects(owner_id);
create index projects_status_created_idx on public.projects(status,created_at desc);
create index members_user_idx on public.project_members(user_id);
create index requests_project_status_idx on public.join_requests(project_id,status);
create index requests_applicant_idx on public.join_requests(applicant_id);
create index notifications_user_created_idx on public.notifications(user_id,created_at desc);

create function public.new_profile() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,email,full_name)
  values(new.id,new.email,coalesce(nullif(new.raw_user_meta_data->>'full_name',''),'Student'));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.new_profile();
create function public.add_owner_member() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.project_members(project_id,user_id,role) values(new.id,new.owner_id,'Leader');
  return new;
end $$;
create trigger on_project_created after insert on public.projects for each row execute function public.add_owner_member();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.join_requests enable row level security;
alter table public.notifications enable row level security;
create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy projects_read on public.projects for select to authenticated using (true);
create policy projects_insert on public.projects for insert to authenticated with check (owner_id=auth.uid());
create policy projects_update on public.projects for update to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy projects_delete on public.projects for delete to authenticated using (owner_id=auth.uid());
create policy members_read on public.project_members for select to authenticated using (true);
create policy requests_read on public.join_requests for select to authenticated using (applicant_id=auth.uid() or exists(select 1 from public.projects p where p.id=project_id and p.owner_id=auth.uid()));
create policy notifications_read on public.notifications for select to authenticated using (user_id=auth.uid());
create policy notifications_update on public.notifications for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

create function public.apply_to_project(p_project_id uuid,p_message text) returns uuid language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_project public.projects%rowtype; v_count integer; v_id uuid;
begin
  if v_user is null then raise exception 'Sign in required'; end if;
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
create function public.review_join_request(p_request_id uuid,p_accept boolean) returns void language plpgsql security definer set search_path=public as $$
declare v_request public.join_requests%rowtype; v_project public.projects%rowtype; v_count integer;
begin
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
  if p_accept then
    insert into public.notifications(user_id,project_id,title,body) values(v_project.owner_id,v_project.id,'New teammate','A student joined '||v_project.title);
  end if;
end $$;
create function public.cancel_join_request(p_request_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  update public.join_requests set status='cancelled',reviewed_at=now() where id=p_request_id and applicant_id=auth.uid() and status='pending';
  if not found then raise exception 'Pending request not found'; end if;
end $$;
revoke all on function public.apply_to_project(uuid,text) from public;
revoke all on function public.review_join_request(uuid,boolean) from public;
revoke all on function public.cancel_join_request(uuid) from public;
grant execute on function public.apply_to_project(uuid,text) to authenticated;
grant execute on function public.review_join_request(uuid,boolean) to authenticated;
grant execute on function public.cancel_join_request(uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('avatars','avatars',true,2097152,array['image/png','image/jpeg','image/webp']) on conflict(id) do nothing;
create policy avatar_read on storage.objects for select to authenticated using (bucket_id='avatars');
create policy avatar_insert on storage.objects for insert to authenticated with check (bucket_id='avatars' and split_part(name,'/',1)=auth.uid()::text);
create policy avatar_update on storage.objects for update to authenticated using (bucket_id='avatars' and split_part(name,'/',1)=auth.uid()::text) with check (bucket_id='avatars' and split_part(name,'/',1)=auth.uid()::text);
create policy avatar_delete on storage.objects for delete to authenticated using (bucket_id='avatars' and split_part(name,'/',1)=auth.uid()::text);
