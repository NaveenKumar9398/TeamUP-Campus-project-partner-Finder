'use client';
export default function ErrorPage({error,reset}:{error:Error;reset:()=>void}){return <main className="auth-form-side" style={{minHeight:'100vh',textAlign:'center'}}><div><h1>Something went wrong</h1><p style={{color:'#8c98aa'}}>{error.message}</p><button className="btn btn-primary" onClick={reset}>Try again</button></div></main>}
