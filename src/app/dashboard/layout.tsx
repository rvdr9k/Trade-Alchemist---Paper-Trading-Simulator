'use client';
import type { ReactNode } from 'react';
import { AppHeader } from '@/components/dashboard/header';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ThemeProvider } from '@/components/theme-provider';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        {/* You can replace this with a proper loader component */}
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <AppHeader />
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          {children}
        </main>
      </div>
    </ThemeProvider>
  );
}
