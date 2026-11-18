import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';
import './dashboard.css';
export const metadata:Metadata={title:'TeamUp | Find Your People',description:'Find project partners at SRMIST Kattankulathur.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:"try{document.documentElement.dataset.theme=localStorage.getItem('teamup-theme')||'light'}catch(e){}"}}/></head><body>{children}<Toaster richColors position="top-right"/></body></html>}
