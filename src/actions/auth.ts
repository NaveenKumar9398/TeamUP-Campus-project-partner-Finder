'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
const message = (value:string) => encodeURIComponent(value);
export async function signIn(form:FormData) {
  const supabase=await createClient();
  const email=String(form.get('email')||'').trim().toLowerCase();
  const password=String(form.get('password')||'');
  const {error}=await supabase.auth.signInWithPassword({email,password});
  if(error) redirect('/login?error='+message(error.message==='Invalid login credentials'?'Email or password did not match. Use the email you registered with, or reset your password.':error.message));
  redirect('/dashboard');
}
export async function signUp(form:FormData) {
  const supabase=await createClient();
  const email=String(form.get('email')||'').trim();
  const password=String(form.get('password')||'');
  const full_name=String(form.get('full_name')||'').trim();
  if(full_name.length<2 || password.length<8) redirect('/register?error='+message('Enter a name and a password of at least 8 characters.'));
  const origin=process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const {error}=await supabase.auth.signUp({email,password,options:{data:{full_name},emailRedirectTo:origin+'/auth/callback'}});
  if(error) redirect('/register?error='+message(error.message));
  redirect('/verify-email');
}
export async function signOut() { const supabase=await createClient(); await supabase.auth.signOut(); redirect('/'); }
export async function forgotPassword(form:FormData) {
  const supabase=await createClient();
  const email=String(form.get('email')||'');
  const origin=process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  await supabase.auth.resetPasswordForEmail(email,{redirectTo:origin+'/auth/callback?next=/reset-password'});
  redirect('/forgot-password?sent=1');
}
export async function resetPassword(form:FormData) {
  const supabase=await createClient();
  const password=String(form.get('password')||'');
  if(password.length<8) redirect('/reset-password?error='+message('Password must have at least 8 characters.'));
  const {error}=await supabase.auth.updateUser({password});
  if(error) redirect('/reset-password?error='+message(error.message));
  redirect('/dashboard');
}
