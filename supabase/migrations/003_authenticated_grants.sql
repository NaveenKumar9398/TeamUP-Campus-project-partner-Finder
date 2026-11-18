-- Explicit API grants for signed-in students. RLS policies in 001 and 002 still
-- decide which rows each student may access.
grant usage on schema public to authenticated;
grant select on public.profiles, public.projects, public.project_members,
  public.join_requests, public.notifications to authenticated;
grant update on public.profiles, public.notifications to authenticated;
grant insert, update, delete on public.projects to authenticated;

-- Storage API privileges remain constrained by the avatar policies.
grant usage on schema storage to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
grant select on storage.buckets to authenticated;
