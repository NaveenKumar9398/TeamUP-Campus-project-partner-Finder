import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { Avatar } from '@/components/avatar';
import { Empty } from '@/components/empty';
import { inviteTeammate } from '@/actions/data';
import { list } from '@/lib/utils';
import { matchSkills, normalizeSkill, projectRank } from '@/lib/matching';
export default async function Teammates({searchParams}:{searchParams:Promise<{project?:string;department?:string;year?:string;skill?:string;availability?:string;error?:string}>}) {
  const filters=await searchParams;
  const {supabase,user}=await requireUser();
  const [{data:students},{data:projects}]=await Promise.all([
    supabase.from('profiles').select('*').neq('id',user.id).eq('is_discoverable',true),
    supabase.from('projects').select('id,title,required_skills,status,max_team_size').eq('owner_id',user.id)
  ]);
  const project=projects?.find(p=>p.id===filters.project);
  const {data:members}=project?await supabase.from('project_members').select('user_id').eq('project_id',project.id):{data:[]};
  const filtered=(students||[]).filter(s=>(!filters.department||s.department.toLowerCase().includes(filters.department.toLowerCase()))&&(!filters.year||s.academic_year===Number(filters.year))&&(!filters.skill||list(s.skills).some(x=>normalizeSkill(x).includes(normalizeSkill(filters.skill!))))&&(!filters.availability||s.availability===filters.availability)).sort((a,b)=>project?projectRank(list(project.required_skills),list(b.skills),b.availability)-projectRank(list(project.required_skills),list(a.skills),a.availability):0);
  const full=!!project&&(members?.length||0)>=project.max_team_size;
  return <><div className="page-head"><div><span className="eyebrow">People</span><h1>Find teammates</h1><p>Discover students who can bring something great to your project.</p></div></div>{filters.error&&<div className="notice">{filters.error}</div>}
  <form className="panel filter-bar"><select className="select" name="project" defaultValue={filters.project||''}><option value="">Browse all students</option>{projects?.map(p=><option key={p.id} value={p.id}>Match for: {p.title}</option>)}</select><input className="input" name="department" defaultValue={filters.department} placeholder="Department"/><input className="input" name="skill" defaultValue={filters.skill} placeholder="Skill"/><select className="select" name="year" defaultValue={filters.year||''}><option value="">All years</option>{[1,2,3,4,5,6].map(y=><option key={y} value={y}>Year {y}</option>)}</select><select className="select" name="availability" defaultValue={filters.availability||''}><option value="">Any availability</option>{['Available','Open to offers','Unavailable'].map(x=><option key={x}>{x}</option>)}</select><button className="btn btn-primary">Filter</button></form>
  {filtered.length?<div className="project-grid">{filtered.map(s=>{const match=project?matchSkills(list(project.required_skills),list(s.skills)):null;return <article className="panel panel-pad" key={s.id}><div style={{display:'flex',gap:13,alignItems:'center'}}><Avatar name={s.full_name} path={s.avatar_path} size={48}/><div><h2 className="panel-title">{s.full_name}</h2><p className="panel-sub">{s.department||'Department not set'} · Year {s.academic_year}</p></div><span className={s.availability==='Available'?'tag tag-green':'tag'} style={{marginLeft:'auto'}}>{s.availability}</span></div><p className="panel-sub">{s.bio||'This student has not added a bio yet.'}</p><div className="visual-tags">{list(s.skills).slice(0,6).map(x=><span className="tag" key={x}>{x}</span>)}</div>{match&&<p className="panel-sub"><strong>{match.score}% skill match</strong> · Matches: {match.matched.join(', ')||'none'} · Missing: {match.missing.join(', ')||'none'}</p>}<div style={{display:'flex',gap:8,alignItems:'center'}}><Link href={'/profile/'+s.id} className="btn btn-outline btn-sm">View profile</Link>{project&&!full&&project.status==='Open'&&s.availability!=='Unavailable'&&!members?.some(m=>m.user_id===s.id)&&<form action={inviteTeammate}><input type="hidden" name="project_id" value={project.id}/><input type="hidden" name="invitee_id" value={s.id}/><button className="btn btn-primary btn-sm">Invite teammate</button></form>}</div></article>})}</div>:<Empty title="No students found" description="Try different filters or check back as more students join."/>}</>;
}
