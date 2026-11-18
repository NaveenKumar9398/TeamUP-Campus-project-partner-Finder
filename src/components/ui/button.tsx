import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
const styles=cva('btn',{variants:{variant:{default:'btn-primary',outline:'btn-outline',ghost:'btn-ghost',destructive:'btn-danger'},size:{default:'',sm:'btn-sm'}},defaultVariants:{variant:'default',size:'default'}});
type Props=React.ButtonHTMLAttributes<HTMLButtonElement>&VariantProps<typeof styles>;
export function Button({className,variant,size,...props}:Props){return <button className={cn(styles({variant,size}),className)} {...props}/>}
