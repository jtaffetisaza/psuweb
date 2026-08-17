import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Team Management Dashboard',
  description: 'Roster, Depth Chart, and Coaching Staff Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-slate-100 font-sans min-h-screen">
        {/* Navigation Bar */}
        <header className="bg-slate-800 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <Link
              href="/"
              className="text-xl font-bold text-white tracking-wide"
            >
              FOOTBALL<span className="text-blue-500">OPS</span>
            </Link>
            <nav className="flex gap-2">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition"
              >
                Roster
              </Link>
              <Link
                href="/depth-chart"
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition"
              >
                Depth Chart
              </Link>
              <Link
                href="/staff"
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition"
              >
                Coaching Staff
              </Link>
            </nav>
          </div>
        </header>

        {/* Page Content */}
        {children}
      </body>
    </html>
  );
}
