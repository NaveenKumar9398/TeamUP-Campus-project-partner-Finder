'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { profileSchema, projectSchema, requestSchema } from '@/lib/validations/schemas';

const tags=(value:FormDataEntryValue|null)=>String(value||'').split(',').map(s=>s.trim()).filter(Boolean);
const fail=(path:string,error:string):never=>redirect(path+'?error='+encodeURIComponent(error));
export async function saveProfile(form:FormData) {
  const {supabase,user}=await requireUser();
  const value=profileSchema.safeParse({full_name:String(form.get('full_name')||''),department:String(form.get('department')||''),academic_year:Number(form.get('academic_year')),section:String(form.get('section')||''),bio:String(form.get('bio')||''),skills:tags(form.get('skills')),interests:tags(form.get('interests')),project_preferences:tags(form.get('project_preferences')),availability:String(form.get('availability')||''),is_discoverable:form.get('is_discoverable')==='on',github_url:String(form.get('github_url')||''),linkedin_url:String(form.get('linkedin_url')||'')});
  if(!value.success) fail('/profile/edit',value.error.issues[0]?.message||'Invalid profile');
  const {error}=await supabase.from('profiles').update(value.data!).eq('id',user.id);
  if(error) fail('/profile/edit',error.message);
  revalidatePath('/profile'); redirect('/profile/'+user.id);
}
export async function saveProject(form:FormData) {
  const {supabase,user}=await requireUser();
  const id=String(form.get('id')||'');
  const path=id?'/projects/'+id+'/edit':'/projects/new';
  const value=projectSchema.safeParse({title:String(form.get('title')||''),description:String(form.get('description')||''),category:String(form.get('category')||''),project_type:String(form.get('project_type')||''),required_skills:tags(form.get('required_skills')),required_roles:tags(form.get('required_roles')),max_team_size:Number(form.get('max_team_size')),duration:String(form.get('duration')||''),deadline:String(form.get('deadline')||'')||null,status:String(form.get('status')||'Open')});
  if(!value.success) fail(path,value.error.issues[0]?.message||'Invalid project');
  if(id){
    const {data:project}=await supabase.from('projects').select('owner_id').eq('id',id).single();
    if(project?.owner_id!==user.id) fail(path,'Only the owner can edit this project');
    const {error}=await supabase.from('projects').update(value.data!).eq('id',id).eq('owner_id',user.id);
    if(error) fail(path,error.message);
    revalidatePath('/projects/'+id);redirect('/projects/'+id);
  }
  const {data,error}=await supabase.from('projects').insert({...value.data!,owner_id:user.id}).select('id').single();
  if(error) fail(path,error.message);
  revalidatePath('/projects');redirect('/projects/'+data!.id);
}
export async function deleteProject(form:FormData) {
  const {supabase,user}=await requireUser();
  const id=String(form.get('id')||'');
  const {error}=await supabase.from('projects').delete().eq('id',id).eq('owner_id',user.id);
  if(error) fail('/projects/'+id,error.message);
  revalidatePath('/my-projects');redirect('/my-projects');
}
export async function applyToProject(form:FormData) {
  const {supabase}=await requireUser();
  const value=requestSchema.safeParse({project_id:String(form.get('project_id')||''),message:String(form.get('message')||'')});
  if(!value.success) fail('/projects/'+String(form.get('project_id')),value.error.issues[0]?.message||'Invalid request');
  const {error}=await supabase.rpc('apply_to_project',{p_project_id:value.data!.project_id,p_message:value.data!.message});
  if(error) fail('/projects/'+value.data!.project_id,error.message);
  revalidatePath('/requests/sent');redirect('/requests/sent');
}
export async function reviewRequest(form:FormData) {
  const {supabase}=await requireUser();
  const id=String(form.get('id')||'');
  const {error}=await supabase.rpc('review_join_request',{p_request_id:id,p_accept:form.get('decision')==='accept'});
  if(error) fail('/requests/received',error.message);
  revalidatePath('/requests/received');redirect('/requests/received');
}
export async function cancelRequest(form:FormData) {
  const {supabase}=await requireUser();
  const {error}=await supabase.rpc('cancel_join_request',{p_request_id:String(form.get('id')||'')});
  if(error) fail('/requests/sent',error.message);
  revalidatePath('/requests/sent');redirect('/requests/sent');
}
export async function markRead(form:FormData) {
  const {supabase,user}=await requireUser();
  await supabase.from('notifications').update({is_read:true}).eq('id',String(form.get('id')||'')).eq('user_id',user.id);
  revalidatePath('/notifications');
}
export async function markAllRead() {
  const {supabase,user}=await requireUser();
  await supabase.from('notifications').update({is_read:true}).eq('user_id',user.id).eq('is_read',false);
  revalidatePath('/notifications');
}
export async function inviteTeammate(form:FormData) {
  const {supabase}=await requireUser();
  const projectId=String(form.get('project_id')||'');
  const inviteeId=String(form.get('invitee_id')||'');
  if(!/^[\da-f-]{36}$/i.test(projectId)||!/^[\da-f-]{36}$/i.test(inviteeId)) fail('/teammates','Invalid invitation');
  const {error}=await supabase.rpc('send_team_invitation',{p_project_id:projectId,p_invitee_id:inviteeId});
  if(error) fail('/teammates',error.message);
  redirect('/teams/'+projectId);
}
export async function reviewInvitation(form:FormData) {
  const {supabase}=await requireUser();
  const {error}=await supabase.rpc('review_team_invitation',{p_invitation_id:String(form.get('id')||''),p_accept:form.get('decision')==='accept'});
  if(error) fail('/notifications',error.message);
  revalidatePath('/teams');redirect('/notifications');
}
export async function sendTeamMessage(form:FormData) {
  const {supabase,user}=await requireUser();
  const projectId=String(form.get('project_id')||'');
  const body=String(form.get('body')||'').trim();
  if(body.length<1||body.length>2000) fail('/teams/'+projectId,'Message must be 1 to 2000 characters');
  const {error}=await supabase.from('team_messages').insert({project_id:projectId,sender_id:user.id,body});
  if(error) fail('/teams/'+projectId,error.message);
  revalidatePath('/teams/'+projectId);
}
export async function createTask(form:FormData) {
  const {supabase,user}=await requireUser();
  const projectId=String(form.get('project_id')||'');
  const title=String(form.get('title')||'').trim();
  const description=String(form.get('description')||'').trim();
  const assignee=String(form.get('assignee_id')||'');
  const deadline=String(form.get('deadline')||'');
  if(title.length<3||title.length>160||description.length>2000||deadline&&!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) fail('/teams/'+projectId,'Invalid task details');
  const {error}=await supabase.from('project_tasks').insert({project_id:projectId,created_by:user.id,title,description,assignee_id:assignee||null,deadline:deadline||null});
  if(error) fail('/teams/'+projectId,error.message);
  revalidatePath('/teams/'+projectId);
}
export async function updateTaskStatus(form:FormData) {
  const {supabase}=await requireUser();
  const projectId=String(form.get('project_id')||'');
  const status=String(form.get('status')||'');
  if(!['To Do','In Progress','Completed'].includes(status)) fail('/teams/'+projectId,'Invalid status');
  const {error}=await supabase.from('project_tasks').update({status,updated_at:new Date().toISOString()}).eq('id',String(form.get('id')||'')).eq('project_id',projectId);
  if(error) fail('/teams/'+projectId,error.message);
  revalidatePath('/teams/'+projectId);
}
