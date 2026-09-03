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
      <body className="bg-slate-950 text-slate-100">
        <header className="border-b border-white/10 bg-slate-900/50 px-6 py-4">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            {/* Title */}
            <Link
              href="/"
              className="text-xl font-black tracking-wider text-blue-500 hover:text-blue-400 transition"
            >
              Penn State Overview
            </Link>

            {/* Penn State Logo Image */}
            <img
              src="https://upload.wikimedia.org/wikipedia/en/3/3a/Penn_State_Nittany_Lions_logo.svg"
              alt="Penn State Logo"
              className="h-10 w-auto object-contain"
            />
          </div>
        </header>

        {children}
      </body>
    </html>
  );
}