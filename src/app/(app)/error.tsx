'use client';
export default function ErrorPage({error,reset}:{error:Error;reset:()=>void}){return <div className="panel empty"><h2>Could not load this page</h2><p>{error.message}</p><button className="btn btn-primary" onClick={reset}>Try again</button></div>}
