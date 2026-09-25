import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Penn State Football Dashboard',
  description: 'Team Management Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        <header className="bg-blue-800 text-white sticky top-0 z-50 border-b border-blue-900 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="font-bold text-xl tracking-tight text-white flex items-center gap-3">
              <img 
                src="/penn-state-logo.jpeg" 
                alt="Penn State Logo" 
                className="h-9 w-auto rounded object-contain bg-white p-0.5"
              />
              <span className="tracking-wide uppercase font-extrabold text-lg">PENN STATE <span className="text-blue-200 font-semibold">FOOTBALL</span></span>
            </Link>
            <nav className="flex items-center gap-6 text-sm font-semibold">
              
              <Link href="/?tab=schedule" className="hover:text-slate-900">
  Schedule
</Link>
<Link href="/Depth-chart" className="text-blue-100 hover:text-white transition">
                Depth Chart
              </Link>
              <Link href="/injury-report" className="text-blue-100 hover:text-white transition">
                Injury Report
              </Link>
              <Link href="/staff" className="text-blue-100 hover:text-white transition">
                Staff
              </Link>
              <Link href="/" className="text-blue-100 hover:text-white transition">
                Roster
              </Link>
              
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}