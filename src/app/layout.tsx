import type { Metadata } from "next";
import Link from 'next/link';
import "./globals.css";

export const metadata: Metadata = {
  title: "F1 25 Racing League Manager",
  description: "Manage your F1 25 racing league with AI-powered results and automated scoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <nav className="nav-bar">
          <div className="container flex justify-between items-center">
            <Link href="/" className="text-f1-bold" style={{ fontSize: '1.5rem', color: 'var(--f1-red)' }}>
              F1<span style={{ color: 'var(--text-primary)' }}>25</span> <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>LEAGUE</span>
            </Link>
            
            <div className="flex gap-medium items-center nav-links">
              <Link href="/dashboard" className="text-f1-bold" style={{ fontSize: '0.75rem', opacity: 0.8 }}>Standings</Link>
              <Link href="/admin" className="text-f1-bold" style={{ fontSize: '0.75rem', opacity: 0.8 }}>Admin Hub</Link>
              <Link href="/join" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Join League</Link>
            </div>
          </div>
        </nav>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
