import Link from 'next/link';
import { Bell, LogOut, Plus, Search } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { Brand } from '@/components/brand';
import { Avatar } from '@/components/avatar';
import { AppNav } from '@/components/app-nav';
import { NotificationRefresh } from '@/components/notification-refresh';
import { ThemeToggle } from '@/components/theme-toggle';
import { signOut } from '@/actions/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();
  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from('profiles').select('full_name,avatar_path,department').eq('id', user.id).single(),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false),
  ]);
  return <div className="app-layout"><NotificationRefresh userId={user.id}/>
    <aside className="sidebar">
      <div className="sidebar-brand"><Brand/><span className="sidebar-brand-caption">Campus collaboration</span></div>
      <AppNav/>
      <div className="sidebar-bottom">
        <div className="sidebar-help"><span className="sidebar-help-symbol">✦</span><strong>Find your people.</strong><small>Your next project starts with the right team.</small><Link href="/projects" className="sidebar-help-link">Explore projects →</Link></div>
        <form action={signOut}><button className="sidebar-logout"><LogOut size={17}/><span>Log out</span></button></form>
      </div>
    </aside>
    <div className="main-area">
      <header className="app-topbar">
        <div className="topbar-leading"><span className="topbar-page-label">TeamUp workspace</span><Link href="/projects" className="search-shortcut"><Search size={16}/><span>Search projects and teammates</span><kbd>⌕</kbd></Link></div>
        <div className="top-actions">
          <Link href="/projects/new" className="btn btn-primary btn-sm top-create"><Plus size={15}/> Create project</Link>
          <ThemeToggle/>
          <Link href="/notifications" className="icon-link top-notifications" aria-label={'Notifications' + (count ? ', ' + count + ' unread' : '')}><Bell size={19}/>{!!count && <span className="count-dot">{count}</span>}</Link>
          <span className="topbar-divider"/>
          <Link href={'/profile/' + user.id} className="user-chip"><Avatar name={profile?.full_name} path={profile?.avatar_path}/><span className="user-chip-copy"><strong>{profile?.full_name || 'Student'}</strong><small>{profile?.department || 'SRMIST student'}</small></span></Link>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  </div>;
}
