'use client';

import { useTheme } from 'next-themes';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';

export function Logo(props: Omit<ComponentProps<typeof Image>, 'src' | 'alt'>) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder or null to avoid server-client mismatch
    return null;
  }
  
  const logoSrc = resolvedTheme === 'dark' ? '/logo-dark.png' : '/logo-light.png';

  return (
    <Image
      src={logoSrc}
      alt="StockSim Logo"
      width={24}
      height={24}
      {...props}
    />
  );
}
