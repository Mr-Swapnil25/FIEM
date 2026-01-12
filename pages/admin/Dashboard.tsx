import React, { useEffect, useState } from 'react';
import { backend } from '../../services/mockBackend';
import { DashboardStats } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Calendar, Users, DollarSign, Activity, TrendingUp, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    backend.getAdminStats().then(setStats);
  }, []);

  if (!stats) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;

  const chartData = [
    { name: 'Mon', active: 40 },
    { name: 'Tue', active: 30 },
    { name: 'Wed', active: 20 },
    { name: 'Thu', active: 27 },
    { name: 'Fri', active: 18 },
    { name: 'Sat', active: 23 },
    { name: 'Sun', active: 34 },
  ];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">Overview of platform activity</p>
        </div>
        <button 
          onClick={() => navigate('/admin/create-event')}
          className="bg-primary text-white px-4 py-2 rounded-xl shadow hover:bg-primaryLight flex items-center gap-2 font-medium transition-colors"
        >
          <Plus size={18} /> New Event
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Events" value={stats.totalEvents} icon={<Calendar className="text-blue-600" />} color="bg-blue-50" />
        <StatCard title="Active Events" value={stats.activeEvents} icon={<Activity className="text-green-600" />} color="bg-green-50" />
        <StatCard title="Registrations" value={stats.totalRegistrations} icon={<Users className="text-purple-600" />} color="bg-purple-50" />
        <StatCard title="Total Revenue" value={`$${stats.totalRevenue.toLocaleString()}`} icon={<DollarSign className="text-yellow-600" />} color="bg-yellow-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800 flex items-center">
              <TrendingUp size={18} className="mr-2 text-gray-400" />
              Registration Trends
            </h3>
            <select className="text-sm bg-gray-50 border border-gray-200 rounded-lg p-1 outline-none">
              <option>This Week</option>
              <option>Last Week</option>
            </select>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="#94a3b8" />
                <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="#94a3b8" />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                />
                <Bar dataKey="active" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions / Recent Activity Placeholder */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
           <h3 className="font-bold text-gray-800 mb-4">Quick Actions</h3>
           <div className="space-y-3">
             <button onClick={() => navigate('/admin/create-event')} className="w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition flex items-center">
               <div className="bg-blue-100 p-2 rounded-lg mr-3 text-blue-600"><Plus size={16} /></div>
               <span className="text-sm font-medium text-gray-700">Create New Event</span>
             </button>
             <button onClick={() => navigate('/admin/reports')} className="w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition flex items-center">
               <div className="bg-purple-100 p-2 rounded-lg mr-3 text-purple-600"><Users size={16} /></div>
               <span className="text-sm font-medium text-gray-700">View Attendee Lists</span>
             </button>
             <button className="w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition flex items-center">
               <div className="bg-green-100 p-2 rounded-lg mr-3 text-green-600"><Activity size={16} /></div>
               <span className="text-sm font-medium text-gray-700">System Status</span>
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}

const StatCard = ({ title, value, icon, color }: { title: string, value: string | number, icon: any, color: string }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center hover:shadow-md transition-shadow">
    <div className={`p-4 rounded-xl mr-4 ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-gray-500 text-xs font-bold uppercase tracking-wide">{title}</p>
      <h4 className="text-2xl font-bold text-gray-900 mt-1">{value}</h4>
    </div>
  </div>
);