'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
export function TeamRefresh({projectId}:{projectId:string}) {
  const router=useRouter();
  useEffect(()=>{
    const supabase=createClient();
    const channel=supabase.channel('team-'+projectId).on('postgres_changes',{event:'INSERT',schema:'public',table:'team_messages',filter:'project_id=eq.'+projectId},()=>router.refresh()).on('postgres_changes',{event:'*',schema:'public',table:'project_tasks',filter:'project_id=eq.'+projectId},()=>router.refresh()).subscribe();
    const timer=setInterval(()=>router.refresh(),15000);
    return ()=>{clearInterval(timer);void supabase.removeChannel(channel)};
  },[projectId,router]);
  return null;
}
