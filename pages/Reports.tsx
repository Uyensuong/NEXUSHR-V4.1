
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { useLanguage, useAuth } from '../contexts/AppContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { api } from '../services/mockService';
import { Role, MonthlyRevenueTarget, BusinessReport, ReportType } from '../types';
import { DollarSign, Save, FileText, Plus, X, List, Calendar, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

type TimeRange = 'WEEK' | 'MONTH' | 'YEAR';

export default function ReportsPage() {
  const { t } = useLanguage();
  const { user, hasPermission } = useAuth();
  
  // Tab State
  const [activeSubTab, setActiveSubTab] = useState<'ANALYTICS' | 'SUBMISSIONS'>('ANALYTICS');

  const [range, setRange] = useState<TimeRange>('MONTH');
  const [loading, setLoading] = useState(true);
  
  // Data for charts
  const [payrollTrend, setPayrollTrend] = useState<any[]>([]);
  const [deptStats, setDeptStats] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPayrollCost, setTotalPayrollCost] = useState(0);
  const [headcount, setHeadcount] = useState(0);

  // Revenue Input State
  const [revenueData, setRevenueData] = useState<MonthlyRevenueTarget[]>([]);
  const [configYear, setConfigYear] = useState(new Date().getFullYear());

  // Cost Optimization State
  const [operatingCosts, setOperatingCosts] = useState(0); // Input for other costs

  // Business Reports State
  const [reports, setReports] = useState<BusinessReport[]>([]);
  const [showCreateReportModal, setShowCreateReportModal] = useState(false);
  const [newReport, setNewReport] = useState({
      type: 'WEEK' as ReportType,
      period: '', // Week number or Month name
      title: '',
      content: ''
  });

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, activeSubTab]);

  const loadData = async () => {
    setLoading(true);
    try {
        if (activeSubTab === 'ANALYTICS') {
            // Fetch base data for Analytics
            const [employees, payrolls, salaryConfig] = await Promise.all([
                api.getEmployees(),
                api.getPayroll('admin', Role.ADMIN), // get all payrolls
                api.getSalaryConfig()
            ]);

            // 1. Headcount
            setHeadcount(employees.length);

            // 2. Department Stats (Headcount & Salary)
            const deptMap: Record<string, { count: number, cost: number }> = {};
            employees.forEach(e => {
                const dept = e.departmentName || 'Unknown';
                if (!deptMap[dept]) deptMap[dept] = { count: 0, cost: 0 };
                deptMap[dept].count += 1;
                deptMap[dept].cost += e.baseSalary;
            });

            const deptData = Object.keys(deptMap).map(key => ({
                name: key,
                employees: deptMap[key].count,
                salaryCost: deptMap[key].cost
            }));
            setDeptStats(deptData);

            // 3. Payroll Trend & Revenue (Using Revenue Config for Actuals)
            setRevenueData(salaryConfig.revenueConfig.months);
            setConfigYear(salaryConfig.revenueConfig.year);

            const annualRevenue = salaryConfig.revenueConfig.months.reduce((acc, m) => acc + m.actual, 0);
            setTotalRevenue(annualRevenue);

            // Calculate Payroll totals by cycle
            const cycleDataMap: Record<string, number> = {};
            payrolls.forEach(p => {
                if (!cycleDataMap[p.cycleId]) cycleDataMap[p.cycleId] = 0;
                cycleDataMap[p.cycleId] += p.netPay;
            });

            const trendData = Object.keys(cycleDataMap).sort().map(cycle => {
                // Try to map payroll cycle YYYY-MM to revenue month
                const [y, m] = cycle.split('-').map(Number);
                let rev = 0;
                if (y === salaryConfig.revenueConfig.year) {
                    const mData = salaryConfig.revenueConfig.months.find(month => month.month === m);
                    if (mData) rev = mData.actual;
                }
                
                return {
                    name: cycle,
                    payroll: cycleDataMap[cycle],
                    revenue: rev
                };
            });

            setPayrollTrend(trendData);

            const totalPay = trendData.reduce((acc, curr) => acc + curr.payroll, 0);
            setTotalPayrollCost(totalPay);
        } else {
            // Load Written Reports
            if (user) {
                const reportList = await api.getBusinessReports(user.id, user.role);
                setReports(reportList);
            }
        }

    } finally {
        setLoading(false);
    }
  };

  const handleRevenueUpdate = async (month: number, actual: number) => {
      try {
          await api.updateMonthlyActualRevenue(configYear, month, actual);
          // Optimistic update
          setRevenueData(prev => prev.map(m => m.month === month ? { ...m, actual } : m));
          setTotalRevenue(prev => {
              const oldVal = revenueData.find(m => m.month === month)?.actual || 0;
              return prev - oldVal + actual;
          });
      } catch (e) {
          alert("Failed to update revenue");
      }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      try {
          // Find user's department from employee record (mock logic)
          const emp = await api.getEmployeeByUserId(user.id);
          const dept = emp ? emp.departmentName || 'General' : 'General';

          await api.createBusinessReport({
              creatorId: user.id,
              creatorName: user.fullName,
              department: dept,
              type: newReport.type,
              period: newReport.period,
              title: newReport.title,
              content: newReport.content
          });
          
          alert('Report submitted successfully');
          setShowCreateReportModal(false);
          setNewReport({ type: 'WEEK', period: '', title: '', content: '' });
          loadData();
      } catch (e) {
          alert('Failed to submit report');
      }
  };

  // Helper for input formatting
  const formatInputNumber = (value: number) => {
    return value !== undefined && value !== null ? new Intl.NumberFormat('en-US').format(value) : '';
  };

  const parseInputNumber = (value: string) => {
    return Number(value.replace(/,/g, ''));
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const formatCurrency = (val: number) => {
      return new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(val);
  };
  
  const formatFullCurrency = (val: number) => {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  if (!user) return null;
  const isAdmin = hasPermission('MANAGE_PAYROLL'); // Or specific MANAGE_REVENUE if created

  // Cost Analysis Calcs
  const totalOperatingCosts = totalPayrollCost + operatingCosts;
  const costRevenueRatio = totalRevenue > 0 ? (totalOperatingCosts / totalRevenue) * 100 : 0;
  const isHealthy = costRevenueRatio <= 30;
  const maxBudget = totalRevenue * 0.3;
  const remainingBudget = maxBudget - totalOperatingCosts;

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
         <div>
           <h1 className="text-2xl font-bold text-slate-800">{t('reportsTitle')}</h1>
           <p className="text-slate-500">{t('reportsSubtitle')}</p>
         </div>
         
         <div className="flex bg-slate-100 p-1 rounded-lg">
             <button 
                onClick={() => setActiveSubTab('ANALYTICS')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeSubTab === 'ANALYTICS' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
             >
                 {t('analyticsTab')}
             </button>
             <button 
                onClick={() => setActiveSubTab('SUBMISSIONS')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeSubTab === 'SUBMISSIONS' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
             >
                 {t('writtenReportsTab')}
             </button>
         </div>
      </div>

      {loading ? (
          <div className="p-12 text-center text-slate-500">{t('loading')}</div>
      ) : activeSubTab === 'ANALYTICS' ? (
        <div className="space-y-6 overflow-y-auto pr-2 pb-10">
            {/* Range Toggle */}
            <div className="flex justify-end">
                <div className="flex bg-white rounded-lg border p-1 shadow-sm">
                    {(['WEEK', 'MONTH', 'YEAR'] as TimeRange[]).map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${range === r ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            {t(r.toLowerCase())}
                        </button>
                    ))}
                </div>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-slate-500">{t('totalRevenue')} (Actual)</p>
                        <h3 className="text-2xl font-bold text-indigo-600 mt-1">{formatCurrency(totalRevenue)}</h3>
                    </CardContent>
                </Card>
                 <Card>
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-slate-500">{t('payrollCost')}</p>
                        <h3 className="text-2xl font-bold text-pink-600 mt-1">{formatCurrency(totalPayrollCost)}</h3>
                    </CardContent>
                </Card>
                 <Card>
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-slate-500">{t('totalEmployees')}</p>
                        <h3 className="text-2xl font-bold text-slate-800 mt-1">{headcount}</h3>
                    </CardContent>
                </Card>
                 <Card>
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-slate-500">{t('avgKPI')}</p>
                        <h3 className="text-2xl font-bold text-green-600 mt-1">87.5</h3>
                    </CardContent>
                </Card>
            </div>

            {/* FINANCIAL HEALTH & COST OPTIMIZATION (NEW) */}
            <Card className={`border-l-4 ${isHealthy ? 'border-l-green-500' : 'border-l-red-500'}`}>
                <CardHeader title={t('financialHealth')} action={<TrendingUp className={isHealthy ? 'text-green-600' : 'text-red-600'} />} />
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Cost Input */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-700 uppercase">{t('costAnalysis')}</h4>
                            <div className="flex justify-between text-sm">
                                <span>{t('payrollCost')}</span>
                                <span className="font-bold">{formatCurrency(totalPayrollCost)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span>{t('operatingCosts')}</span>
                                <div className="flex items-center gap-1 w-32">
                                    <input 
                                        type="text" 
                                        className="w-full border rounded px-2 py-1 text-right text-xs"
                                        value={formatInputNumber(operatingCosts)}
                                        onChange={e => setOperatingCosts(parseInputNumber(e.target.value))}
                                    />
                                    <span className="text-xs text-slate-400">VND</span>
                                </div>
                            </div>
                            <div className="flex justify-between text-sm pt-2 border-t font-bold">
                                <span>Total Operating Costs</span>
                                <span>{formatCurrency(totalOperatingCosts)}</span>
                            </div>
                        </div>

                        {/* Ratio Display */}
                        <div className="flex flex-col items-center justify-center text-center">
                            <div className={`text-4xl font-bold mb-1 ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
                                {costRevenueRatio.toFixed(1)}%
                            </div>
                            <p className="text-xs text-slate-500 uppercase font-bold">{t('costRatio')}</p>
                            <div className="w-full bg-slate-200 rounded-full h-2 mt-2 max-w-[200px]">
                                <div 
                                    className={`h-2 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`} 
                                    style={{ width: `${Math.min(costRevenueRatio, 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-xs mt-2 text-slate-400">{t('optimalRatio')}</p>
                        </div>

                        {/* Analysis & Advice */}
                        <div className={`p-4 rounded-lg border ${isHealthy ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                {isHealthy ? <CheckCircle size={18} className="text-green-600"/> : <AlertTriangle size={18} className="text-red-600"/>}
                                <h4 className={`font-bold text-sm ${isHealthy ? 'text-green-800' : 'text-red-800'}`}>
                                    {isHealthy ? t('optimalRatio') : t('warningRatio')}
                                </h4>
                            </div>
                            <p className={`text-xs leading-relaxed ${isHealthy ? 'text-green-700' : 'text-red-700'}`}>
                                {isHealthy ? t('financialAlertGreen') : t('financialAlertRed')}
                            </p>
                            <div className="mt-4 pt-3 border-t border-black/5 text-xs">
                                <div className="flex justify-between mb-1">
                                    <span>{t('maxPayrollBudget')} (30%):</span>
                                    <span className="font-bold">{formatCurrency(maxBudget)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>{remainingBudget >= 0 ? t('budgetRemaining') : t('overBudget')}:</span>
                                    <span className={`font-bold ${remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(Math.abs(remainingBudget))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Revenue Input Section */}
            <Card>
                <CardHeader title={t('companyPerformance')} action={<DollarSign className="text-green-600" />} />
                <CardContent>
                   <p className="text-sm text-slate-500 mb-4">
                       Year {configYear}: Compare Actual Revenue vs Monthly Targets.
                   </p>
                   <div className="overflow-x-auto">
                       <table className="w-full text-sm text-left">
                           <thead className="bg-slate-50 text-slate-500">
                               <tr>
                                   <th className="px-4 py-3">{t('month')}</th>
                                   <th className="px-4 py-3">{t('revenueTarget')}</th>
                                   <th className="px-4 py-3">{t('revenueInput')}</th>
                                   <th className="px-4 py-3 text-right">{t('achievementRate')}</th>
                                   <th className="px-4 py-3 w-1/4">Progress</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                               {revenueData.map((m) => {
                                   const achievement = m.target > 0 ? (m.actual / m.target) * 100 : 0;
                                   return (
                                       <tr key={m.month}>
                                           <td className="px-4 py-3 font-medium text-slate-700">Month {m.month}</td>
                                           <td className="px-4 py-3 text-slate-500 font-mono">
                                               {formatFullCurrency(m.target)}
                                           </td>
                                           <td className="px-4 py-3">
                                               {isAdmin ? (
                                                   <div className="flex items-center gap-2">
                                                       <input 
                                                           type="text"
                                                           className="border rounded px-2 py-1 w-32 text-right font-medium"
                                                           value={formatInputNumber(m.actual)}
                                                           onChange={(e) => {
                                                               const newVal = parseInputNumber(e.target.value);
                                                               setRevenueData(prev => prev.map(mm => mm.month === m.month ? { ...mm, actual: newVal } : mm));
                                                           }}
                                                           onBlur={(e) => handleRevenueUpdate(m.month, parseInputNumber(e.target.value))}
                                                       />
                                                       <span className="text-xs text-slate-400">VND</span>
                                                   </div>
                                               ) : (
                                                   <span className="font-bold text-slate-700">{formatFullCurrency(m.actual)}</span>
                                               )}
                                           </td>
                                           <td className={`px-4 py-3 text-right font-bold ${achievement >= 100 ? 'text-green-600' : 'text-slate-600'}`}>
                                               {achievement.toFixed(1)}%
                                           </td>
                                           <td className="px-4 py-3">
                                               <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                   <div 
                                                     className={`h-2.5 rounded-full ${achievement >= 100 ? 'bg-green-500' : achievement >= 80 ? 'bg-blue-500' : 'bg-yellow-500'}`} 
                                                     style={{ width: `${Math.min(achievement, 100)}%` }}
                                                   ></div>
                                               </div>
                                           </td>
                                       </tr>
                                   );
                               })}
                           </tbody>
                       </table>
                   </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue vs Payroll Chart */}
                <Card className="h-96">
                    <CardHeader title={t('revenueVsPayroll')} />
                    <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={payrollTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={formatCurrency} />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend />
                                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} name={t('totalRevenue')} />
                                <Line type="monotone" dataKey="payroll" stroke="#ec4899" strokeWidth={3} name={t('payrollCost')} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Department Distribution */}
                <Card className="h-96">
                    <CardHeader title={t('departmentStats')} />
                    <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={deptStats} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12}} />
                                <Tooltip cursor={{fill: 'transparent'}} />
                                <Bar dataKey="employees" fill="#8884d8" radius={[0, 4, 4, 0]} name={t('totalEmployees')} barSize={20}>
                                    {deptStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
            
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cost Distribution Pie */}
                <Card className="h-96">
                    <CardHeader title={t('costDistribution')} />
                    <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={deptStats}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="salaryCost"
                                    nameKey="name"
                                >
                                    {deptStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
             </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">
            {/* WRITTEN REPORTS TAB */}
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                   <List size={20} />
                   {t('submissionHistory')}
               </h3>
               <button 
                  onClick={() => setShowCreateReportModal(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 shadow-sm flex items-center gap-2"
               >
                   <Plus size={18} /> {t('createReport')}
               </button>
            </div>

            <Card className="flex-1 overflow-hidden flex flex-col">
               <CardContent className="p-0 overflow-y-auto flex-1">
                   {reports.length === 0 ? (
                       <div className="p-12 text-center text-slate-500 italic">No reports submitted yet.</div>
                   ) : (
                       <table className="w-full text-left text-sm">
                           <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10">
                               <tr>
                                   <th className="px-6 py-4">{t('reportTitle')}</th>
                                   <th className="px-6 py-4">{t('reportType')}</th>
                                   <th className="px-6 py-4">{t('reportPeriod')}</th>
                                   <th className="px-6 py-4">{t('creator')}</th>
                                   <th className="px-6 py-4">{t('department')}</th>
                                   <th className="px-6 py-4">{t('createdAt')}</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                               {reports.map((report) => (
                                   <tr key={report.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => alert("Detailed view implementation pending.")}>
                                       <td className="px-6 py-4 font-bold text-slate-800">{report.title}</td>
                                       <td className="px-6 py-4">
                                           <span className={`px-2 py-1 rounded text-xs font-bold ${
                                               report.type === 'WEEK' ? 'bg-blue-100 text-blue-700' :
                                               report.type === 'MONTH' ? 'bg-green-100 text-green-700' :
                                               'bg-purple-100 text-purple-700'
                                           }`}>
                                               {t(report.type.toLowerCase())}ly
                                           </span>
                                       </td>
                                       <td className="px-6 py-4 text-slate-600">{report.period}</td>
                                       <td className="px-6 py-4">{report.creatorName}</td>
                                       <td className="px-6 py-4 text-slate-500">{report.department}</td>
                                       <td className="px-6 py-4 text-slate-400">{format(new Date(report.createdAt), 'MMM do, yyyy')}</td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   )}
               </CardContent>
            </Card>
        </div>
      )}

      {/* Create Report Modal */}
      {showCreateReportModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                          <FileText size={20} className="text-indigo-600" />
                          {t('createReport')}
                      </h3>
                      <button onClick={() => setShowCreateReportModal(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={20} />
                      </button>
                  </div>
                  <form onSubmit={handleCreateReport} className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">{t('reportType')}</label>
                              <select 
                                  className="w-full border rounded-lg px-3 py-2 bg-white"
                                  value={newReport.type}
                                  onChange={e => setNewReport({ ...newReport, type: e.target.value as ReportType })}
                              >
                                  <option value="WEEK">{t('weekly')}</option>
                                  <option value="MONTH">{t('monthly')}</option>
                                  <option value="YEAR">{t('yearly')}</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">{t('reportPeriod')}</label>
                              <input 
                                  type="text" 
                                  className="w-full border rounded-lg px-3 py-2"
                                  placeholder="e.g. Week 42, Oct 2024"
                                  required
                                  value={newReport.period}
                                  onChange={e => setNewReport({ ...newReport, period: e.target.value })}
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">{t('reportTitle')}</label>
                          <input 
                              type="text" 
                              className="w-full border rounded-lg px-3 py-2"
                              placeholder="e.g. Sales Report Week 42"
                              required
                              value={newReport.title}
                              onChange={e => setNewReport({ ...newReport, title: e.target.value })}
                          />
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">{t('reportContent')}</label>
                          <textarea 
                              className="w-full border rounded-lg px-3 py-2 h-48 font-sans"
                              placeholder="Enter report details here... (Achievements, Issues, Next Steps)"
                              required
                              value={newReport.content}
                              onChange={e => setNewReport({ ...newReport, content: e.target.value })}
                          />
                      </div>

                      <div className="flex gap-3 pt-2">
                          <button type="button" onClick={() => setShowCreateReportModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50">
                              {t('cancel')}
                          </button>
                          <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold">
                              {t('save')}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}
