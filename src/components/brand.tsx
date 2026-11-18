import Link from 'next/link';import { Boxes } from 'lucide-react';
export function Brand(){return <Link href="/" className="brand"><span className="brand-mark"><Boxes size={20}/></span><span>teamup<span style={{color:'#4362f1'}}>.</span></span></Link>}
