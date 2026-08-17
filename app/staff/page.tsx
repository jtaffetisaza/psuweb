export default function StaffPage() {
  const staff = [
    { name: 'Head Coach', title: 'Head Coach', role: 'Head Coach' },
    { name: 'Offensive Coordinator', title: 'Offensive Coordinator / QBs', role: 'Offense' },
    { name: 'Defensive Coordinator', title: 'Defensive Coordinator / LBs', role: 'Defense' },
    { name: 'Special Teams Coordinator', title: 'Special Teams / Safeties', role: 'Special Teams' },
  ];

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-white mb-2">Coaching Staff</h1>
      <p className="text-slate-400 mb-8">Directory of team leadership and assistant coaches.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {staff.map((member, i) => (
          <div key={i} className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center text-xl font-bold text-blue-400 mb-4">
              {member.name.charAt(0)}
            </div>
            <h2 className="text-lg font-bold text-white">{member.name}</h2>
            <p className="text-sm text-slate-400">{member.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}