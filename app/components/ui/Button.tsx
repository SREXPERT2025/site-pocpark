import * as React from 'react';
import { clsx } from 'clsx';

type Variant = 'primary' | 'secondary';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export default function Button({ className, variant = 'primary', ...props }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-medium transition ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 ' +
    'focus-visible:ring-offset-bg-primary disabled:opacity-50 disabled:pointer-events-none';

  const variants: Record<Variant, string> = {
    primary: 'bg-accent-primary text-white hover:bg-state-hover',
    secondary:
      'bg-transparent text-accent-primary border border-accent-primary hover:bg-bg-secondary',
  };

  return <button className={clsx(base, variants[variant], className)} {...props} />;
}
