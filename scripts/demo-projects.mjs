import { createClient } from '@supabase/supabase-js';

if (process.env.TEAMUP_DEMO_DATA !== '1' || process.env.NODE_ENV === 'production') {
  throw new Error('Demo seeding requires TEAMUP_DEMO_DATA=1 outside production.');
}
const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: key, DEMO_EMAIL: email, DEMO_PASSWORD: password } = process.env;
if (!url || !key || !email || !password) throw new Error('Set Supabase URL/key and DEMO_EMAIL/DEMO_PASSWORD.');
const supabase = createClient(url, key);
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email, password });
if (authError || !auth.user) throw authError || new Error('Sign in failed');
if (!auth.user.email_confirmed_at) throw new Error('Confirm the demo account email first.');
const examples = [
  ['AI-Based Attendance System','Minor','Education',['Python','React']],
  ['Smart Campus Navigation','PBL','Campus',['React','Maps','TypeScript']],
  ['College Event Management System','Major','Events',['React','SQL']],
  ['IoT-Based Smart Parking','Research','IoT',['Python','IoT']],
  ['Student Learning Assistant','PBL','Education',['Python','SQL']],
  ['Hackathon Web Development Team','Hackathon','Web',['React','TypeScript']],
];
for (const [title, project_type, category, required_skills] of examples) {
  const { data: existing, error: lookupError } = await supabase.from('projects').select('id').eq('owner_id',auth.user.id).eq('title',title).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) { console.log(`Already exists: ${title}`); continue; }
  const { error } = await supabase.from('projects').insert({ owner_id:auth.user.id,title,project_type,category,required_skills,required_roles:['Developer'],max_team_size:2,description:`${title} is a campus collaboration project. We are looking for a partner to help plan, build, test, and present a working prototype for our college demonstration.`,status:'Open' });
  if (error) throw error;
  console.log(`Created: ${title}`);
}
await supabase.auth.signOut();
