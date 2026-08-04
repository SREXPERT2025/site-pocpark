'use client';

import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

import { dispatchLandingEntryEvent } from '@/app/lib/analytics-events';

type Props = Omit<ComponentProps<typeof Link>, 'children' | 'href'> & {
  children: ReactNode;
  href: '/parkovka' | '/parkovka-pod-klyuch';
  sourceSection: string;
  targetVariant: 'parkovka' | 'puzzle2';
};

export default function LandingEntryLink({
  children,
  href,
  onClick,
  sourceSection,
  targetVariant,
  ...props
}: Props) {
  return (
    <Link
      {...props}
      href={href}
      onClick={(event) => {
        dispatchLandingEntryEvent({
          source_section: sourceSection,
          target_variant: targetVariant,
        });
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}
