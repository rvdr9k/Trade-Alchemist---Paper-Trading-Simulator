'use client';
import Link from 'next/link';
import { UserNav } from '@/components/dashboard/user-nav';
import { Logo } from '@/components/icons';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

export function AppHeader() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/trade', label: 'Trade' },
    { href: '/dashboard/portfolio', label: 'Portfolio' },
    { href: '/dashboard/watchlist', label: 'Watchlist' },
    { href: '/dashboard/history', label: 'Transaction History' },
  ];
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <Link href="/dashboard" className="mr-6 flex items-center gap-2">
        <Logo className="h-6 w-6 text-primary" />
        <span className="hidden font-bold sm:inline-block">StockSim</span>
      </Link>
      <nav className="flex-1">
        <ul className="flex items-center gap-2 text-sm">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Button
                asChild
                variant="ghost"
                className={cn(
                  'font-semibold',
                  pathname === link.href
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground'
                )}
              >
                <Link href={link.href}>{link.label}</Link>
              </Button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <UserNav />
      </div>
    </header>
  );
}
