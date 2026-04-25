import './globals.css';
import Link from 'next/link';
import { TelemetryNav } from '@/components/common/TelemetryNav';
import AdminDropdown from "@/components/common/AdminDropdown";
import AuthNav from "@/components/common/AuthNav";
import { Providers } from '@/components/Providers';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <nav className="nav-bar">
            <div className="container flex justify-between items-center">
              <Link href="/" className="text-f1-bold" style={{ fontSize: '1.5rem', color: 'var(--f1-red)' }}>
                F1<span style={{ color: 'var(--text-primary)' }}>25</span> <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>LEAGUE</span>
              </Link>
              
              <div className="flex gap-small items-center nav-links">
                <Link href="/dashboard" className="nav-link">Standings</Link>
                
                <TelemetryNav />
                <AdminDropdown />
                <AuthNav />
              </div>
            </div>
          </nav>
          <main>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
