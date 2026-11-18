import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function GET(request:NextRequest) {
  const code=request.nextUrl.searchParams.get('code');
  const next=request.nextUrl.searchParams.get('next')||'/dashboard';
  if(code){const supabase=await createClient();const {error}=await supabase.auth.exchangeCodeForSession(code);if(!error) return NextResponse.redirect(new URL(next.startsWith('/')&&!next.startsWith('//')?next:'/dashboard',request.url));}
  return NextResponse.redirect(new URL('/login?error=Could%20not%20confirm%20your%20email',request.url));
}
