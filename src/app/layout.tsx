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
        <nav className="flex justify-between items-center container" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
          <Link href="/" className="text-f1" style={{ fontSize: '1.5rem', color: 'var(--f1-red)' }}>
            F1<span style={{ color: 'var(--white)' }}>25</span> LEAGUE
          </Link>
          <div className="flex gap-2 items-center">
            <Link href="/dashboard" className="text-f1" style={{ fontSize: '0.8rem', opacity: 0.8 }}>Standings</Link>
            <Link href="/admin" className="text-f1" style={{ fontSize: '0.8rem', opacity: 0.8 }}>Admin</Link>
            <Link href="/join" className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Join</Link>
          </div>
        </nav>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
