import { FolderSearch } from 'lucide-react';
export function Empty({title,description,action}:{title:string;description:string;action?:React.ReactNode}){return <div className="panel empty"><div className="empty-icon"><FolderSearch size={25}/></div><h3>{title}</h3><p>{description}</p>{action&&<div style={{marginTop:18}}>{action}</div>}</div>}
