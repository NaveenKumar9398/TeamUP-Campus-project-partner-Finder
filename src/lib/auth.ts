import { redirect } from 'next/navigation';
import { approvedEmail, createClient } from '@/lib/supabase/server';
export async function requireUser() {
  const supabase = await createClient();
  const {data:{user}} = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!user.email_confirmed_at) redirect('/verify-email');
  if (!approvedEmail(user.email)) redirect('/campus-access');
  return {supabase,user};
}
