import type { Metadata } from "next";
import Link from 'next/link';
import "./globals.css";
import { Providers } from "@/components/Providers";

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
            
            <div className="flex gap-small items-center nav-links">
              <Link href="/dashboard" className="nav-link">Standings</Link>
              <Link href="/admin" className="nav-link">Admin Hub</Link>
              <Link href="/profile" className="nav-link" style={{color: 'var(--f1-red)', fontWeight: 'bold'}}>Profile</Link>
              <Link href="/join" className="btn btn-primary btn-sm">Join League</Link>
            </div>
          </div>
        </nav>
        <main>
          <Providers>
            {children}
          </Providers>
        </main>
      </body>
    </html>
  );
}
