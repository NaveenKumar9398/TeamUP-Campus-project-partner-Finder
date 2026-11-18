'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
export function NotificationRefresh({userId}:{userId:string}) {
  const router=useRouter();
  useEffect(()=>{
    const supabase=createClient();
    const channel=supabase.channel('notifications-'+userId).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+userId},()=>router.refresh()).subscribe();
    const timer=setInterval(()=>router.refresh(),15000);
    return ()=>{clearInterval(timer);void supabase.removeChannel(channel)};
  },[userId,router]);
  return null;
}
