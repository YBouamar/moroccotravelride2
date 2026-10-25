import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

// Primary = light teal with navy text (5.8:1); never white text on light teal (ADR-010).
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-control font-semibold transition disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-foreground hover:brightness-95',
        secondary: 'bg-secondary text-secondary-foreground hover:brightness-110',
        outline: 'border border-border bg-surface text-foreground hover:bg-background',
        ghost: 'text-foreground hover:bg-background',
      },
      size: {
        md: 'min-h-11 px-5 text-sm',
        lg: 'min-h-12 px-6 text-base',
        icon: 'size-11',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button';
  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
