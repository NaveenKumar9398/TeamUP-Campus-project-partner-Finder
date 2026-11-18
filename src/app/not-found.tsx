import Link from 'next/link';
export default function NotFound(){return <main className="auth-form-side" style={{minHeight:'100vh',textAlign:'center'}}><div><span className="eyebrow">404</span><h1>Page not found</h1><p style={{color:'#8290a6'}}>The page you’re looking for is unavailable.</p><Link href="/dashboard" className="btn btn-primary">Back to dashboard</Link></div></main>}
