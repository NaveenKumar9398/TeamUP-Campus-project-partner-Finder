import Link from 'next/link';
import { Bell } from 'lucide-react';
import { markAllRead, markRead, reviewInvitation } from '@/actions/data';
import { requireUser } from '@/lib/auth';
import { Empty } from '@/components/empty';
import { dateLabel } from '@/lib/utils';
export default async function Notifications({searchParams}:{searchParams:Promise<{error?:string}>}) {
  const {error}=await searchParams;const {supabase,user}=await requireUser();
  const [{data},{data:invitations}]=await Promise.all([
    supabase.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}),
    supabase.from('team_invitations').select('id,project_id,status,created_at').eq('invitee_id',user.id).eq('status','pending').order('created_at',{ascending:false})
  ]);
  const ids=invitations?.map(i=>i.project_id)||[];
  const {data:projects}=ids.length?await supabase.from('projects').select('id,title').in('id',ids):{data:[]};
  return <><div className="page-head"><div><span className="eyebrow">Activity</span><h1>Notifications</h1><p>Updates from your projects and teams.</p></div>{data?.some(n=>!n.is_read)&&<form action={markAllRead}><button className="btn btn-outline">Mark all as read</button></form>}</div>{error&&<div className="notice">{error}</div>}
  {!!invitations?.length&&<section className="panel panel-pad" style={{marginBottom:18}}><h2 className="panel-title">Pending invitations</h2>{invitations.map(i=><div className="list-row" key={i.id}><div><h3>{projects?.find(p=>p.id===i.project_id)?.title||'Project invitation'}</h3><p>Invited {dateLabel(i.created_at)}</p></div><form action={reviewInvitation} style={{display:'flex',gap:8}}><input type="hidden" name="id" value={i.id}/><button className="btn btn-primary btn-sm" name="decision" value="accept">Accept</button><button className="btn btn-outline btn-sm" name="decision" value="decline">Decline</button></form></div>)}</section>}
  {data?.length?<div className="panel panel-pad">{data.map(n=><div className="list-row" key={n.id} style={{background:n.is_read?'transparent':'#f8faff',padding:'17px 12px',borderRadius:8}}><div style={{display:'flex',gap:12,alignItems:'center'}}><span className="stat-icon"><Bell size={16}/></span><div><h3>{n.title}</h3><p>{n.body} · {dateLabel(n.created_at)}</p></div></div><div style={{display:'flex',gap:8}}>{n.project_id&&<Link className="btn btn-outline btn-sm" href={n.title==='New join request'?'/requests/received':n.title==='New task assignment'?'/teams/'+n.project_id:'/projects/'+n.project_id}>View</Link>}{!n.is_read&&<form action={markRead}><input type="hidden" name="id" value={n.id}/><button className="btn btn-ghost btn-sm">Mark read</button></form>}</div></div>)}</div>:!invitations?.length&&<Empty title="All caught up" description="Updates about your requests and teams will appear here."/>}</>;
}
