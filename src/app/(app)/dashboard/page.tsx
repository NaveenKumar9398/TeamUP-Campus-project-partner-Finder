import Link from 'next/link';
import { ArrowRight, ArrowUpRight, CalendarDays, Folder, Inbox, Plus, Sparkles, Users } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { Empty } from '@/components/empty';
import { dateLabel, list } from '@/lib/utils';
import { matchSkills, projectRank } from '@/lib/matching';
import type { Project } from '@/types';

type Filters = { q?: string; type?: string };
export default async function Dashboard({ searchParams }: { searchParams: Promise<Filters> }) {
  const { q = '', type = '' } = await searchParams;
  const { supabase, user } = await requireUser();
  const [{ data: profile }, { data: owned }, { data: memberships }, { data: requests }, { data: projects }, { data: activity }] = await Promise.all([
    supabase.from('profiles').select('full_name,skills').eq('id', user.id).single(),
    supabase.from('projects').select('id,status').eq('owner_id', user.id),
    supabase.from('project_members').select('project_id').eq('user_id', user.id),
    supabase.from('join_requests').select('id').eq('applicant_id', user.id).eq('status', 'pending'),
    supabase.from('projects').select('*').eq('status', 'Open').neq('owner_id', user.id).order('created_at', { ascending: false }).limit(60),
    supabase.from('notifications').select('id,title,body,project_id,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(4),
  ]);
  const skills = list(profile?.skills);
  const teamIds = memberships?.map(m=>m.project_id)||[];
  const {data:upcomingTasks}=teamIds.length?await supabase.from('project_tasks').select('id,title,deadline,project_id').in('project_id',teamIds).neq('status','Completed').gte('deadline',new Date().toISOString().slice(0,10)).order('deadline',{ascending:true}).limit(5):{data:[]};
  const available = (projects || []) as Project[];
  const ids = available.map(project => project.id);
  const { data: allMembers } = ids.length ? await supabase.from('project_members').select('project_id').in('project_id', ids) : { data: [] };
  const memberCounts = new Map<string, number>();
  allMembers?.forEach(member => memberCounts.set(member.project_id, (memberCounts.get(member.project_id) || 0) + 1));
  const ranked = available.sort((a, b) => projectRank(list(b.required_skills), skills) - projectRank(list(a.required_skills), skills));
  const featured = ranked[0];
  const featuredMatch = featured ? matchSkills(list(featured.required_skills), skills) : null;
  const visible = ranked.filter(project =>
    (!q || (project.title + ' ' + project.description + ' ' + list(project.required_skills).join(' ')).toLowerCase().includes(q.toLowerCase())) &&
    (!type || project.project_type === type)
  ).slice(0, 7);
  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  return <div className="dashboard-home">
    <div className="dashboard-overline"><span className="eyebrow">Overview</span><span className="dashboard-date">Your TeamUp workspace</span></div>
    <section className="dashboard-hero">
      <div className="dashboard-hero-copy">
        <span className="dashboard-hero-kicker"><Sparkles size={14}/> A place to build together</span>
        <h1>Welcome back,<br/><span>{firstName}.</span></h1>
        <p>Find the people and projects that fit your skills. Your next big idea starts with a conversation.</p>
        <div className="dashboard-hero-actions"><Link href="/projects" className="btn btn-primary">Explore projects <ArrowUpRight size={16}/></Link><Link href="/projects/new" className="btn btn-outline">Create a project</Link></div>
      </div>
      <div className="dashboard-hero-visual" aria-label={featured ? 'Your top project match' : 'Find your next team'}>
        <div className="orbit orbit-one"/><div className="orbit orbit-two"/>
        <div className="hero-project-card hero-project-card-back"><span className="hero-card-symbol">✦</span></div>
        <div className="hero-project-card hero-project-card-middle"><span className="hero-card-symbol">⌘</span></div>
        <div className="hero-project-card hero-project-card-front"><span className="hero-card-symbol">↗</span></div>
        <div className="dashboard-featured-label">{featured ? <><span>Top match for you</span><strong>{featured.title}</strong><small>{featuredMatch?.total ? `${featuredMatch.score}% skill match` : 'Open to all skills'} · {featured.project_type}</small></> : <><span>Your next collaboration</span><strong>Find your people</strong><small>Explore projects across campus</small></>}</div>
      </div>
    </section>

    <div className="stats-grid dashboard-stats">
      <Link href="/my-projects" className="panel stat"><div className="stat-top">Projects created <span className="stat-icon"><Folder size={17}/></span></div><strong>{owned?.length || 0}</strong><small>Your ideas in motion</small></Link>
      <Link href="/my-projects" className="panel stat"><div className="stat-top">Active projects <span className="stat-icon"><Sparkles size={17}/></span></div><strong>{owned?.filter(project => project.status === 'Open' || project.status === 'In Progress').length || 0}</strong><small>Open or in progress</small></Link>
      <Link href="/teams" className="panel stat"><div className="stat-top">Joined teams <span className="stat-icon"><Users size={17}/></span></div><strong>{Math.max(0, (memberships?.length || 0) - (owned?.length || 0))}</strong><small>Teams you collaborate with</small></Link>
      <Link href="/requests/sent" className="panel stat"><div className="stat-top">Pending requests <span className="stat-icon"><Inbox size={17}/></span></div><strong>{requests?.length || 0}</strong><small>Waiting for a response</small></Link>
    </div>

    <div className="dashboard-section-title"><div><span className="eyebrow">Discover</span><h2>Projects picked for you</h2><p>Transparent skill matching, based on the skills in your profile.</p></div><Link href="/projects" className="btn btn-ghost btn-sm">View all projects <ArrowRight size={15}/></Link></div>
    <section className="panel dashboard-table-panel">
      <div className="dashboard-table-toolbar">
        <nav className="dashboard-tabs" aria-label="Project types">{[['','All'],['PBL','PBL'],['Hackathon','Hackathons'],['Research','Research']].map(([value,label]) => <Link key={label} className={type === value ? 'selected' : ''} href={value ? '/dashboard?type=' + value : '/dashboard'}>{label}</Link>)}</nav>
        <form action="/dashboard" className="dashboard-search"><input type="hidden" name="type" value={type}/><label><span className="sr-only">Search recommended projects</span><input name="q" defaultValue={q} placeholder="Search projects"/><button aria-label="Search projects"><span>⌕</span></button></label></form>
      </div>
      {visible.length ? <div className="dashboard-table-scroll"><table className="dashboard-project-table"><thead><tr><th>Project</th><th>Type</th><th>Skills needed</th><th>Match</th><th>Availability</th><th aria-label="Open project"/></tr></thead><tbody>{visible.map(project => {
        const match = matchSkills(list(project.required_skills), skills);
        const slots = project.max_team_size - (memberCounts.get(project.id) || 1);
        return <tr key={project.id}><td><Link className="table-project-title" href={'/projects/' + project.id}>{project.title}</Link><span className="table-project-sub"><CalendarDays size={12}/> {dateLabel(project.deadline)} · {project.category}</span></td><td><span className="tag">{project.project_type}</span></td><td><div className="table-skills">{list(project.required_skills).slice(0, 2).map(skill => <span className="tag" key={skill}>{skill}</span>)}{!list(project.required_skills).length && <span className="table-muted">Open to all skills</span>}</div></td><td><span className="table-match">{match.total ? `${match.score}%` : 'Open'}</span><span className="table-match-sub">{match.total ? `${match.matched.length}/${match.total} skills` : 'All skills welcome'}</span></td><td><span className={slots > 0 ? 'availability-open' : 'availability-full'}>{slots > 0 ? slots + ' spots open' : 'Team full'}</span></td><td><Link href={'/projects/' + project.id} className="table-open" aria-label={'View ' + project.title}><ArrowUpRight size={16}/></Link></td></tr>;
      })}</tbody></table></div> : <Empty title="No matching projects" description={q || type ? 'Try another search or project type.' : 'New campus projects will appear here as students create them.'} action={<Link href="/projects/new" className="btn btn-primary"><Plus size={15}/> Create project</Link>}/>}
    </section>

    <section className="dashboard-activity"><div className="dashboard-section-title"><div><span className="eyebrow">Updates</span><h2>Recent activity</h2></div><Link href="/notifications" className="btn btn-ghost btn-sm">All notifications <ArrowRight size={15}/></Link></div><div className="activity-grid">{activity?.length ? activity.map(item => <Link className="panel activity-card" href={item.project_id ? '/projects/' + item.project_id : '/notifications'} key={item.id}><span className="activity-icon"><Sparkles size={17}/></span><span><strong>{item.title}</strong><small>{item.body}</small></span><ArrowUpRight size={15}/></Link>) : <div className="panel activity-empty">No activity yet. Team updates will appear here.</div>}</div></section>
    <section className="dashboard-activity"><div className="dashboard-section-title"><div><span className="eyebrow">Plan ahead</span><h2>Upcoming task deadlines</h2></div></div><div className="activity-grid">{upcomingTasks?.length?upcomingTasks.map(task=><Link key={task.id} href={'/teams/'+task.project_id} className="panel activity-card"><span className="activity-icon"><CalendarDays size={17}/></span><span><strong>{task.title}</strong><small>Due {dateLabel(task.deadline)}</small></span><ArrowUpRight size={15}/></Link>):<div className="panel activity-empty">No upcoming task deadlines.</div>}</div></section>
  </div>;
}
