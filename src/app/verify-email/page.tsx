import Link from 'next/link';import { AuthShell } from '@/components/auth-shell';
export default function Verify(){return <AuthShell><h1>Check your inbox</h1><p>Open the confirmation link from Supabase to verify your email, then sign in.</p><Link className="btn btn-primary" href="/login">Go to sign in</Link></AuthShell>}
