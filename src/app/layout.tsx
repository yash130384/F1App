import './globals.css';
import Link from 'next/link';
import { TelemetryNav } from '@/components/common/TelemetryNav';
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
                <Link href="/live" className="nav-link">Live Track</Link>
                <TelemetryNav />
                <Link 
                  href="/admin" 
                  className="nav-link" 
                  style={{ 
                    color: 'var(--f1-red)', 
                    fontWeight: 'bold',
                    letterSpacing: '0.08em'
                  }}
                >
                  ADMIN
                </Link>
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
