import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-cyan-500/30 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25',
        secondary: 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50',
        destructive: 'border-red-500/30 bg-red-500/15 text-red-300 hover:bg-red-500/25',
        outline: 'border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800/50',
        success: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25',
        warning: 'border-amber-500/30 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge };