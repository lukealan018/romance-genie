import React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary'|'secondary'|'quiet';
type Size = 'sm'|'md'|'lg';

export default function CustomButton({
  children, onClick, variant='primary', size='md', disabled=false, type='button', full=false, className
}: React.PropsWithChildren<{onClick?:()=>void; variant?:Variant; size?:Size; disabled?:boolean; type?:'button'|'submit'; full?:boolean; className?:string;}>) {
  const sizes: Record<Size,string> = {
    sm:'h-8 text-sm px-3', md:'h-10 text-base px-4', lg:'h-12 text-lg px-6'
  };
  const variants: Record<Variant,string> = {
    primary: 'btn-theme-secondary',
    secondary: 'btn-theme-secondary',
    quiet: 'bg-transparent text-muted-foreground hover:text-foreground'
  };

  return (
    <button 
      type={type} 
      disabled={disabled} 
      onClick={onClick} 
      className={cn(
        'inline-flex items-center justify-center select-none transition rounded-[var(--radius-md)]',
        full && 'w-full',
        sizes[size],
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
}
