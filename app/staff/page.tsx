'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface StaffMember {
  id: number;
  name: string;
  title: string;
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStaff() {
      try {
        const { data, error } = await supabase
          .from('football_staff')
          .select('*')
          .order('id', { ascending: true });

        if (error) throw error;
        setStaff(data || []);
      } catch (err) {
        console.error('Error fetching staff:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStaff();
  }, []);

  const filteredStaff = staff.filter(
    (member) =>
      member.name.toLowerCase().includes(search.toLowerCase()) ||
      member.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12 pt-6">
      <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-6">
        
        {/* Header & Search */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Coaching & Operations Staff
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              2026 Penn State Football Personnel
            </p>
          </div>

          <input
            type="text"
            placeholder="Search staff or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
          />
        </div>

        {/* Staff Grid */}
        {loading ? (
          <p className="text-slate-500 font-medium">Loading coaching staff...</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredStaff.map((member) => (
              <div
                key={member.id}
                className="bg-white border border-slate-200 shadow-sm flex flex-col justify-between rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {member.name}
                  </h2>
                  <p className="text-sm font-semibold text-blue-800 mt-1">
                    {member.title}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 font-medium">
                  <span>Staff ID: #{member.id}</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}