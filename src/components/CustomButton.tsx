import React from 'react';

type Variant = 'primary'|'secondary'|'quiet';
type Size = 'sm'|'md'|'lg';

export default function CustomButton({
  children, onClick, variant='primary', size='md', disabled=false, type='button', full=false
}: React.PropsWithChildren<{onClick?:()=>void; variant?:Variant; size?:Size; disabled?:boolean; type?:'button'|'submit'; full?:boolean;}>) {
  const base = `
    inline-flex items-center justify-center select-none transition
    rounded-[var(--radius-md)] px-4
    ${full ? 'w-full' : ''}
  `;
  const sizes: Record<Size,string> = {
    sm:'h-8 text-[var(--text-sm)]', md:'h-10 text-[var(--text-md)]', lg:'h-12 text-[var(--text-lg)]'
  };
  const variants: Record<Variant,string> = {
    primary:  'bg-primary/20 text-primary border border-primary/50 shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)] hover:bg-primary/30 disabled:opacity-60 animate-subtle-pulse',
    secondary:'bg-card text-primary border border-primary hover:bg-muted disabled:opacity-60',
    quiet:    'bg-transparent text-muted-foreground hover:text-foreground'
  };

  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${sizes[size]} ${variants[variant]}`}>
      {children}
    </button>
  );
}
