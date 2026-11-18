import { ProjectForm } from '@/components/project-form';
export default async function NewProject({searchParams}:{searchParams:Promise<{error?:string}>}){const {error}=await searchParams;return <ProjectForm error={error}/>}
