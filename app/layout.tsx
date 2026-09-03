import type { Metadata } from 'next';
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
            <span className="text-xl font-black tracking-wider text-blue-500">
              Penn State Overview
            </span>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}