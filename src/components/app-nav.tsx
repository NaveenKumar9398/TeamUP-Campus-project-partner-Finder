'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Compass, Folder, Inbox, LayoutDashboard, Search, Send, Settings, UserRound, Users } from 'lucide-react';
const groups = [
  { label: 'Workspace', links: [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/projects', label: 'Explore projects', icon: Compass },
    { href: '/teammates', label: 'Find teammates', icon: Search },
    { href: '/my-projects', label: 'My projects', icon: Folder },
    { href: '/teams', label: 'My teams', icon: Users },
  ] },
  { label: 'Activity', links: [
    { href: '/requests/sent', label: 'Sent requests', icon: Send },
    { href: '/requests/received', label: 'Received requests', icon: Inbox },
    { href: '/notifications', label: 'Notifications', icon: Bell },
  ] },
  { label: 'Account', links: [
    { href: '/profile/edit', label: 'Edit profile', icon: UserRound },
    { href: '/settings', label: 'Settings', icon: Settings },
  ] },
];
export function AppNav() {
  const pathname = usePathname();
  return <nav aria-label="Dashboard navigation" className="sidebar-nav">
    {groups.map(group => <div className="nav-group" key={group.label}>
      <span className="side-label">{group.label}</span>
      {group.links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href === '/projects' && pathname.startsWith('/projects/') && pathname !== '/projects/new');
        return <Link href={href} key={href} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined} title={label}>
          <Icon size={17} strokeWidth={active ? 2.3 : 1.9}/><span>{label}</span>{active && <span className="active-arrow">›</span>}
        </Link>;
      })}
    </div>)}
  </nav>;
}
