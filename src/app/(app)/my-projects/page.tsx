import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { ProjectCard } from '@/components/project-card';
import { Empty } from '@/components/empty';
export default async function MyProjects() {
  const {supabase,user}=await requireUser();
  const {data}=await supabase.from('projects').select('*').eq('owner_id',user.id).order('created_at',{ascending:false});
  const ids=data?.map(p=>p.id)||[];
  const {data:members}=ids.length?await supabase.from('project_members').select('project_id').in('project_id',ids):{data:[]};
  const counts=new Map<string,number>();members?.forEach(m=>counts.set(m.project_id,(counts.get(m.project_id)||0)+1));
  return <><div className="page-head"><div><span className="eyebrow">Your ideas</span><h1>My projects</h1><p>Manage the projects you’ve started.</p></div><Link href="/projects/new" className="btn btn-primary"><Plus size={16}/> New project</Link></div>{data?.length?<div className="project-grid">{data.map(p=><ProjectCard project={{...p,member_count:counts.get(p.id)||1}} key={p.id}/>)}</div>:<Empty title="No projects yet" description="Put your idea out there and find your first teammate." action={<Link href="/projects/new" className="btn btn-primary">Create a project</Link>}/>}</>;
}
