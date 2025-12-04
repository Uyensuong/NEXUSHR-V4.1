
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  Banknote, 
  TrendingUp,
  AlertTriangle,
  Trash2,
  Activity,
  CheckCircle,
  Info,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage, useAuth } from '../contexts/AppContext';
import { Role, EmploymentStatus, ActivityLog } from '../types';
import { api } from '../services/mockService';
import { DualCalendar } from '../components/DualCalendar';
import { format, isSameMonth, parseISO, subDays } from 'date-fns';

const StatCard = ({ icon: Icon, label, value, trend, color, loading }: any) => (
  <Card className="border-none shadow-md">
    <CardContent className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {loading ? (
           <div className="h-8 w-24 bg-slate-100 rounded animate-pulse mt-1"></div>
        ) : (
           <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
        )}
        {trend !== undefined && (
          <p className={`text-xs mt-1 font-medium ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-slate-500'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </p>
        )}
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  
  // Stats State
  const [stats, setStats] = useState({
    totalEmployees: 0,
    attendanceRate: 0,
    totalPayroll: 0,
    newHires: 0
  });
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Reset Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRealStats();
      const interval = setInterval(fetchRealStats, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchRealStats = async () => {
    if (activities.length === 0) setLoadingStats(true);
    try {
      const [employees, attendance, activityLogs] = await Promise.all([
        api.getEmployees(),
        api.getAttendance(),
        api.getActivities()
      ]);

      // 1. Total Employees (Active)
      const activeEmployees = employees.filter(e => e.status !== EmploymentStatus.INACTIVE && e.status !== EmploymentStatus.PENDING);
      const totalEmp = activeEmployees.length;

      // 2. Attendance Rate (Today)
      const todayStr = new Date().toISOString().split('T')[0];
      const todayAttendance = attendance.filter(a => a.date.startsWith(todayStr));
      const uniqueCheckIns = new Set(todayAttendance.map(a => a.employeeId)).size;
      const rate = totalEmp > 0 ? Math.round((uniqueCheckIns / totalEmp) * 100) : 0;

      // 3. Total Payroll (Estimated Monthly Base Salary)
      const totalSalary = activeEmployees.reduce((sum, emp) => sum + emp.baseSalary, 0);

      // 4. New Hires (This Month)
      const now = new Date();
      const newHiresCount = activeEmployees.filter(e => {
         if (!e.hireDate) return false;
         return isSameMonth(parseISO(e.hireDate), now);
      }).length;

      // 5. Chart Data (Last 5 Days) - Optimized for ISO string handling
      const last5Days = Array.from({length: 5}, (_, i) => {
          const d = subDays(new Date(), 4 - i);
          return format(d, 'yyyy-MM-dd');
      });

      const chart = last5Days.map(dateStr => {
          // Robust filter: check if the attendance date string starts with the target YYYY-MM-DD
          const dayLogs = attendance.filter(a => a.date.substring(0, 10) === dateStr);
          const totalHours = dayLogs.reduce((acc, log) => acc + log.hours, 0);
          return {
              name: format(parseISO(dateStr), 'EEE'),
              hours: parseFloat(totalHours.toFixed(1))
          };
      });

      setStats({
        totalEmployees: totalEmp,
        attendanceRate: rate,
        totalPayroll: totalSalary,
        newHires: newHiresCount
      });
      setChartData(chart);
      setActivities(activityLogs);

    } catch (error) {
      console.error("Failed to fetch dashboard stats", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const formatCurrencyCompact = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short", style: 'currency', currency: 'VND' }).format(val);
  };

  const handleFactoryReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setResetError('');
    setIsResetting(true);
    
    try {
      const isValid = await api.verifyPassword(user.id, adminPassword);
      if (!isValid) {
        setResetError(t('wrongPassword'));
        setIsResetting(false);
        return;
      }
      await api.factoryReset();
      alert(t('systemResetSuccess'));
      window.location.reload();
    } catch (err) {
      setResetError('An error occurred during reset.');
      setIsResetting(false);
    }
  };

  const getActivityIcon = (type: ActivityLog['type']) => {
      switch(type) {
          case 'SUCCESS': return <CheckCircle size={16} className="text-green-500" />;
          case 'WARNING': return <AlertTriangle size={16} className="text-orange-500" />;
          case 'ERROR': return <XCircle size={16} className="text-red-500" />;
          default: return <Info size={16} className="text-blue-500" />;
      }
  };

  const isAdmin = user?.role === Role.ADMIN;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('dashboard')}</h1>
          <p className="text-slate-500">{t('dashboardSubtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Users} label={t('totalEmployees')} value={stats.totalEmployees} trend={0} color="bg-blue-500" loading={loadingStats} />
        <StatCard icon={Clock} label={t('attendanceRate')} value={`${stats.attendanceRate}%`} trend={stats.attendanceRate > 90 ? 2.5 : -1.5} color="bg-green-500" loading={loadingStats} />
        <StatCard icon={Banknote} label={t('totalPayroll')} value={formatCurrencyCompact(stats.totalPayroll)} trend={0} color="bg-purple-500" loading={loadingStats} />
        <StatCard icon={TrendingUp} label={t('newHires')} value={stats.newHires} trend={stats.newHires > 0 ? 100 : 0} color="bg-orange-500" loading={loadingStats} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader title={t('weeklyAttendance')} />
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
           <Card className="h-full max-h-[450px] flex flex-col">
            <CardHeader title={t('recentActivity')} action={<Activity size={18} className="text-slate-400" />} />
            <CardContent className="flex-1 overflow-y-auto">
              <div className="space-y-4">
                {activities.slice(0, 8).map((act) => (
                  <div key={act.id} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0">
                    <div className="mt-1">{getActivityIcon(act.type)}</div>
                    <div>
                      <p className="text-sm text-slate-800 font-medium leading-tight">{act.content}</p>
                      <p className="text-xs text-slate-500 mt-1">{format(new Date(act.timestamp), 'HH:mm')} • {act.actorName || 'System'}</p>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && <p className="text-center text-slate-500 italic text-sm pt-4">No recent activity.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="w-full">
        <DualCalendar />
      </div>

      {isAdmin && (
        <div className="mt-8">
          <Card className="border-red-100 bg-red-50/30">
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 text-red-600 rounded-full"><AlertTriangle size={24} /></div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{t('dangerZone')}</h3>
                  <p className="text-sm text-slate-600 max-w-xl">{t('factoryResetDesc')}</p>
                </div>
              </div>
              <button onClick={() => setShowResetModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm font-medium transition-colors">
                <Trash2 size={18} /> {t('factoryReset')}
              </button>
            </div>
          </Card>
        </div>
      )}

      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-red-100 flex justify-between items-center bg-red-50">
              <h3 className="font-bold text-lg text-red-800 flex items-center gap-2"><AlertTriangle size={20} />{t('resetConfirmTitle')}</h3>
              <button onClick={() => setShowResetModal(false)} className="text-red-400 hover:text-red-600">×</button>
            </div>
            <form onSubmit={handleFactoryReset} className="p-6 space-y-4">
              <p className="text-slate-600 text-sm">{t('enterAdminPassToConfirm')}</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('password')}</label>
                <input type="password" required className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-500" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="Admin Password" />
              </div>
              {resetError && <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">{resetError}</div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowResetModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50" disabled={isResetting}>{t('cancel')}</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-70 flex justify-center" disabled={isResetting}>{isResetting ? t('loading') : t('factoryReset')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
