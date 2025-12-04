
import React, { useEffect, useState } from 'react';
import { api } from '../services/mockService';
import { Employee, Payroll, Role } from '../types';
import { Card, CardContent } from '../components/ui/Card';
import { Download, DollarSign, FileText, Calculator, X, TrendingUp, Edit3, Calendar, CheckCircle, Lock, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { useLanguage, useAuth } from '../contexts/AppContext';
import { calcSalary } from '../lib/salaryLogic';
import { format } from 'date-fns';

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const { t } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Cycle Management
  const [availableCycles, setAvailableCycles] = useState<string[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<string>('');
  const [showCreateCycleModal, setShowCreateCycleModal] = useState(false);
  const [newCycleMonth, setNewCycleMonth] = useState(format(new Date(), 'yyyy-MM'));

  // State for viewing details (Salary Slip)
  const [viewingSlip, setViewingSlip] = useState<Payroll | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [slipConfig, setSlipConfig] = useState<any>(null);

  // State for Performance/Metrics Modal
  const [editingMetrics, setEditingMetrics] = useState<Payroll | null>(null);
  const [metricsForm, setMetricsForm] = useState({
    salesTarget: 0,
    salesAchieved: 0,
    validWorkDays: 22,
    allowance: 0,
    bonus: 0,
    kpiBonus: 0, // New Field
    deduction: 0
  });

  useEffect(() => {
    if (user) {
      init();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Refetch whenever cycle changes
  useEffect(() => {
    if (user && selectedCycle) {
      fetchPayroll(selectedCycle);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCycle]);

  const init = async () => {
    setLoading(true);
    try {
        // 1. Get available cycles
        const cycles = await api.getPayrollCycles();
        setAvailableCycles(cycles);
        
        // 2. Select the latest one by default
        if (cycles.length > 0) {
            setSelectedCycle(cycles[0]);
            // fetchPayroll(cycles[0]) happens via useEffect
        }
    } catch (e) {
        console.error(e);
        setLoading(false);
    }
  };

  const fetchPayroll = async (cycleId: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.getPayroll(user.id, user.role, cycleId);
      setPayrolls(data);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  // Helper for input fields to show commas
  const formatInputNumber = (value: number) => {
    return value !== undefined && value !== null ? new Intl.NumberFormat('en-US').format(value) : '';
  };

  const parseInputNumber = (value: string) => {
    return Number(value.replace(/,/g, ''));
  };

  const handleViewSlip = async (payroll: Payroll) => {
    const [emp, config] = await Promise.all([
      api.getEmployeeById(payroll.employeeId),
      api.getSalaryConfig()
    ]);
    setSelectedEmployee(emp || null);
    setSlipConfig(config);
    setViewingSlip(payroll);
  };

  const handleOpenMetricsModal = (payroll: Payroll) => {
    if (payroll.status === 'PAID') {
        alert('Cannot edit metrics for a finalized payroll.');
        return;
    }
    setEditingMetrics(payroll);
    setMetricsForm({
      salesTarget: payroll.salesTarget || 0,
      salesAchieved: payroll.salesAchieved || 0,
      validWorkDays: payroll.validWorkDays || 22,
      allowance: payroll.allowance || 0,
      bonus: payroll.bonus || 0,
      kpiBonus: payroll.kpiBonus || 0,
      deduction: payroll.deduction || 0
    });
  };

  const handleUpdateMetrics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMetrics) return;
    try {
      await api.updatePayroll(editingMetrics.id, {
        salesTarget: Number(metricsForm.salesTarget),
        salesAchieved: Number(metricsForm.salesAchieved),
        validWorkDays: Number(metricsForm.validWorkDays),
        allowance: Number(metricsForm.allowance),
        bonus: Number(metricsForm.bonus),
        kpiBonus: Number(metricsForm.kpiBonus),
        deduction: Number(metricsForm.deduction)
      });
      setEditingMetrics(null);
      await fetchPayroll(selectedCycle);
    } catch (err) {
      alert("Failed to update metrics");
    }
  };

  const handleCreateCycle = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
          await api.createPayrollCycle(newCycleMonth);
          alert(`Payroll cycle ${newCycleMonth} created/initialized.`);
          setShowCreateCycleModal(false);
          await init(); // Refresh cycles
          setSelectedCycle(newCycleMonth);
      } catch (e) {
          alert("Error creating cycle");
      } finally {
          setLoading(false);
      }
  };

  const handleBulkCalculate = async () => {
      if (!confirm(`Recalculate ALL payrolls for ${selectedCycle}? This will overwrite current calculations based on latest attendance.`)) return;
      setLoading(true);
      try {
          const count = await api.calculatePayrollForCycle(selectedCycle);
          alert(`Successfully recalculated ${count} records.`);
          await fetchPayroll(selectedCycle);
      } catch (e) {
          alert("Error during bulk calculation");
      } finally {
          setLoading(false);
      }
  };

  const handleLockCycle = async () => {
      if (!confirm(`Are you sure you want to LOCK cycle ${selectedCycle}? This prevents further editing and marks all records as PAID.`)) return;
      setLoading(true);
      try {
          await api.lockPayrollCycle(selectedCycle);
          alert(`Cycle ${selectedCycle} has been locked.`);
          await fetchPayroll(selectedCycle);
      } catch (e) {
          alert("Error locking cycle");
      } finally {
          setLoading(false);
      }
  };

  const handleExportCSV = () => {
    // Define headers
    const headers = [
      "Cycle",
      "Employee Name",
      "Base Salary",
      "Work Days",
      "Sales Achieved",
      "Sales Target",
      "Allowance",
      "KPI Bonus",
      "Overtime",
      "Bonus",
      "Deduction",
      "Net Pay",
      "Status"
    ];

    // Create CSV content
    const rows = payrolls.map(p => [
      p.cycleId,
      `"${p.employeeName}"`,
      p.baseAmount,
      p.validWorkDays || 22,
      p.salesAchieved || 0,
      p.salesTarget || 0,
      p.allowance,
      p.kpiBonus || 0,
      p.overtimeAmount,
      p.bonus,
      p.deduction,
      p.netPay,
      p.status
    ]);

    // Add BOM for UTF-8 support in Excel (Important for Vietnamese)
    const BOM = "\uFEFF";
    const csvContent = BOM + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `payroll_export_${selectedCycle}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.HR;
  const isCurrentCycleFinalized = payrolls.length > 0 && payrolls[0].status === 'PAID';

  // --- Helper to render the Salary Grid Row ---
  const SalaryRow = ({ label, formula, amount, isTotal = false, isSub = false, isRed = false, isGreen = false }: any) => (
    <tr className={`${isTotal ? 'bg-indigo-50 font-bold text-indigo-900' : 'hover:bg-slate-50'}`}>
      <td className={`px-4 py-3 border-b border-slate-200 ${isSub ? 'pl-8 text-slate-500 text-sm' : 'text-slate-700'}`}>
        {label}
      </td>
      <td className="px-4 py-3 border-b border-slate-200 text-sm text-slate-500 font-mono">
        {formula}
      </td>
      <td className={`px-4 py-3 border-b border-slate-200 text-right ${isTotal ? 'text-lg' : 'font-medium'} ${isRed ? 'text-red-600' : ''} ${isGreen ? 'text-green-600' : ''}`}>
        {formatCurrency(amount)}
      </td>
    </tr>
  );

  // --- Calculate details for the slip modal ---
  const getSlipDetails = () => {
    if (!viewingSlip || !selectedEmployee || !slipConfig) return null;

    // Re-run logic purely for display using the fetched config
    // Pass manual values from payroll record
    const calc = calcSalary({
      baseSalary: selectedEmployee.baseSalary,
      insuranceSalary: selectedEmployee.insuranceSalary, // Pass insurance salary
      roleTitle: selectedEmployee.roleTitle,
      proRateByAttendance: true,
      validWorkDays: viewingSlip.validWorkDays || 22,
      standardWorkDays: viewingSlip.standardWorkDays || 22,
      salesAchieved: viewingSlip.salesAchieved || 0,
      salesTarget: viewingSlip.salesTarget || 0,
      roleCoefficients: slipConfig.roleCoefficients,
      commissionTiers: slipConfig.commissionTiers,
      insuranceConfig: slipConfig.insuranceConfig,
      manualOtherAllowance: viewingSlip.allowance,
      manualOtherDeduction: viewingSlip.deduction,
      kpiBonus: viewingSlip.kpiBonus // Pass KPI bonus
    });

    const manualBonus = viewingSlip.bonus || 0;
    const overtime = viewingSlip.overtimeAmount || 0;
    
    // Total Income from all sources
    const finalNet = calc.total + overtime + manualBonus;

    return {
      base: selectedEmployee.baseSalary,
      days: viewingSlip.validWorkDays || 22,
      stdDays: viewingSlip.standardWorkDays || 22,
      effectiveBase: calc.lcbEffective,
      
      // Additions
      commission: calc.tds,
      salesAchieved: viewingSlip.salesAchieved || 0,
      salesRate: calc.meta.rate,
      
      roleAllowance: calc.pccv,
      roleTitle: selectedEmployee.roleTitle,
      roleCoeff: calc.meta.coeff,
      
      otherAllowance: viewingSlip.allowance,
      kpiBonus: viewingSlip.kpiBonus || 0,
      
      overtime: overtime,
      bonus: manualBonus,
      
      // Deductions
      insurance: calc.meta.insuranceDetails,
      insuranceBasis: calc.meta.insuranceBasis, // Display the basis
      otherDeduction: viewingSlip.deduction,
      
      netPay: finalNet
    };
  };

  const slipData = getSlipDetails();

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('payroll')}</h1>
          <div className="flex items-center gap-2 mt-1">
             <p className="text-slate-500">{t('dashboardSubtitle')}</p>
             {isCurrentCycleFinalized ? (
                 <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase">
                     <Lock size={10} /> {t('finalized')}
                 </span>
             ) : (
                 <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full uppercase">
                     <Edit3 size={10} /> Open
                 </span>
             )}
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex flex-wrap gap-2 items-center">
            {/* Cycle Selector */}
            <div className="flex items-center gap-2 bg-white border border-slate-300 px-3 py-2 rounded-lg shadow-sm">
                <Calendar size={18} className="text-slate-400" />
                <select 
                    className="bg-transparent outline-none text-sm font-medium text-slate-700 min-w-[100px]"
                    value={selectedCycle}
                    onChange={e => setSelectedCycle(e.target.value)}
                >
                    {availableCycles.map(cycle => (
                        <option key={cycle} value={cycle}>{cycle}</option>
                    ))}
                </select>
            </div>
            
            {isAdmin && (
                <button 
                    onClick={() => setShowCreateCycleModal(true)}
                    className="flex items-center gap-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors"
                    title="Create New Cycle"
                >
                    <Plus size={18} />
                </button>
            )}

          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 shadow-sm"
          >
            <Download size={18} />
            <span className="hidden sm:inline">{t('exportCSV')}</span>
          </button>
          
          {isAdmin && !isCurrentCycleFinalized && (
            <>
                <button 
                    onClick={handleBulkCalculate}
                    disabled={loading}
                    className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-100 shadow-sm disabled:opacity-50"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    <span className="hidden sm:inline">{t('runPayroll')}</span>
                </button>

                <button 
                    onClick={handleLockCycle}
                    disabled={loading}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-sm disabled:opacity-50 font-medium"
                >
                    <Lock size={18} />
                    <span className="hidden sm:inline">{t('finalizePayroll')}</span>
                </button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">{t('employees')}</th>
                <th className="px-6 py-4">{t('baseSalary')}</th>
                <th className="px-6 py-4 text-green-600">{t('earnings')}</th>
                <th className="px-6 py-4 text-red-600">{t('deductions')}</th>
                <th className="px-6 py-4 font-bold">{t('netPay')}</th>
                <th className="px-6 py-4 text-center">{t('status')}</th>
                <th className="px-6 py-4 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payrolls.map((p) => {
                const earnings = p.overtimeAmount + p.allowance + p.bonus + (p.kpiBonus || 0);
                const earningsTooltip = `OT: ${formatCurrency(p.overtimeAmount)} \nBonus: ${formatCurrency(p.bonus)} \nKPI: ${formatCurrency(p.kpiBonus || 0)} \nAllowance: ${formatCurrency(p.allowance)}`;
                
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{p.employeeName}</div>
                      <div className="text-xs text-slate-400">{p.validWorkDays} days work</div>
                    </td>
                    
                    <td className="px-6 py-4">
                        <div className="text-slate-700">{formatCurrency(p.baseAmount)}</div>
                        {/* Removed Insurance Salary from main view to keep table clean, visible in slip */}
                    </td>
                    <td className="px-6 py-4 text-green-700 cursor-help" title={earningsTooltip}>
                      <div className="flex items-center gap-1">
                          + {formatCurrency(earnings)}
                          <AlertCircle size={12} className="text-slate-300" />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-red-700">- {formatCurrency(p.deduction)}</td>

                    <td className="px-6 py-4 font-bold text-slate-800 text-base">
                        {formatCurrency(p.netPay)}
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${p.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                         {p.status === 'PAID' ? 'Paid' : 'Pending'}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      {isAdmin && !isCurrentCycleFinalized && (
                        <button
                          onClick={() => handleOpenMetricsModal(p)}
                          className="text-green-600 hover:text-green-800 hover:bg-green-50 p-2 rounded-md transition-colors"
                          title={t('inputPerformance')}
                        >
                          <TrendingUp size={18} />
                        </button>
                      )}
                      <button 
                         onClick={() => handleViewSlip(p)}
                         className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 p-2 rounded-md transition-colors"
                         title={t('viewSlip')}
                      >
                        <FileText size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {payrolls.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    {t('noRecords')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Create Cycle Modal */}
      {showCreateCycleModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl animate-in zoom-in duration-200">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-lg text-slate-800">New Payroll Cycle</h3>
                      <button onClick={() => setShowCreateCycleModal(false)}><X size={20} className="text-slate-400"/></button>
                  </div>
                  <form onSubmit={handleCreateCycle} className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Select Month</label>
                          <input 
                              type="month" 
                              required
                              className="w-full border rounded-lg px-3 py-2"
                              value={newCycleMonth}
                              onChange={e => setNewCycleMonth(e.target.value)}
                          />
                      </div>
                      <div className="flex gap-3 pt-2">
                          <button type="button" onClick={() => setShowCreateCycleModal(false)} className="flex-1 border rounded-lg py-2">{t('cancel')}</button>
                          <button type="submit" className="flex-1 bg-indigo-600 text-white rounded-lg py-2">Create</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Input Metrics Modal */}
      {editingMetrics && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <div>
                  <h3 className="font-bold text-lg text-slate-800">{t('inputPerformance')}</h3>
                  <p className="text-xs text-slate-500">{editingMetrics.employeeName}</p>
               </div>
               <button onClick={() => setEditingMetrics(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateMetrics} className="p-6 space-y-6">
               
               {/* Performance Data Section */}
               <div className="space-y-4">
                   <h4 className="text-xs font-bold text-slate-500 uppercase border-b pb-2">1. Performance Data</h4>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('salesTarget')} (VND)</label>
                        <input 
                          type="text"
                          className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                          value={formatInputNumber(metricsForm.salesTarget)}
                          onChange={e => setMetricsForm({...metricsForm, salesTarget: parseInputNumber(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('salesAchieved')} (VND)</label>
                        <input 
                          type="text"
                          className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                          value={formatInputNumber(metricsForm.salesAchieved)}
                          onChange={e => setMetricsForm({...metricsForm, salesAchieved: parseInputNumber(e.target.value)})}
                        />
                      </div>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">{t('validWorkDays')}</label>
                     <input 
                        type="number" step="0.5"
                        className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                        value={metricsForm.validWorkDays}
                        onChange={e => setMetricsForm({...metricsForm, validWorkDays: Number(e.target.value)})}
                     />
                     <p className="text-xs text-slate-400 mt-1">Used to calculate Pro-rated Base Salary & Allowances.</p>
                   </div>
               </div>

               {/* Manual Adjustments Section */}
               <div className="space-y-4">
                 <h4 className="text-xs font-bold text-slate-500 uppercase border-b pb-2">2. Manual Adjustments</h4>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-indigo-700 mb-1">{t('kpiBonus')}</label>
                      <input 
                        type="text"
                        className="w-full border-2 border-indigo-100 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700 bg-indigo-50/50"
                        value={formatInputNumber(metricsForm.kpiBonus)}
                        onChange={e => setMetricsForm({...metricsForm, kpiBonus: parseInputNumber(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">{t('bonus')} (Spot Award)</label>
                      <input 
                        type="text"
                        className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formatInputNumber(metricsForm.bonus)}
                        onChange={e => setMetricsForm({...metricsForm, bonus: parseInputNumber(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">{t('otherAllowance')}</label>
                      <input 
                        type="text"
                        className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formatInputNumber(metricsForm.allowance)}
                        onChange={e => setMetricsForm({...metricsForm, allowance: parseInputNumber(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-red-500 mb-1">{t('otherDeduction')} (Fine)</label>
                      <input 
                        type="text"
                        className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 text-red-600"
                        value={formatInputNumber(metricsForm.deduction)}
                        onChange={e => setMetricsForm({...metricsForm, deduction: parseInputNumber(e.target.value)})}
                      />
                    </div>
                 </div>
               </div>

               <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditingMetrics(null)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50">
                  {t('cancel')}
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm">
                  {t('update')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Slip Modal (View Only) */}
      {viewingSlip && slipData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-xl text-slate-800">{t('salarySlip')}</h3>
                <p className="text-sm text-slate-500">{viewingSlip.employeeName} • {selectedEmployee?.code} • {selectedCycle}</p>
              </div>
              <button onClick={() => setViewingSlip(null)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4 bg-blue-50 border border-blue-100 p-3 rounded text-sm text-blue-800 font-medium text-center">
                SALARY = BASE + COMMISSION + ALLOWANCES + KPI - INSURANCE - DEDUCTIONS
              </div>

              {/* Grid Table Structure */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-600 font-semibold text-sm uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 border-b border-slate-200 w-1/3">{t('item')}</th>
                      <th className="px-4 py-3 border-b border-slate-200 w-1/3">{t('calculationFormula')}</th>
                      <th className="px-4 py-3 border-b border-slate-200 w-1/3 text-right">{t('amount')}</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-slate-700">
                    
                    {/* 1. Base Salary Section */}
                    <SalaryRow 
                      label={t('sl_base')} 
                      formula={`${formatCurrency(slipData.base)} / month`}
                      amount={slipData.base} 
                      isSub
                    />
                     <SalaryRow 
                      label={t('sl_effective')} 
                      formula={`${formatCurrency(slipData.base)} × ${slipData.days}/${slipData.stdDays} days`} 
                      amount={slipData.effectiveBase} 
                      isGreen
                    />

                    {/* 2. Commission */}
                    <SalaryRow 
                      label={t('sl_sales')} 
                      formula={`Achieved: ${formatCurrency(slipData.salesAchieved)} (${(slipData.salesRate * 100)}%)`} 
                      amount={slipData.commission} 
                      isGreen
                    />

                    {/* 3. Allowances */}
                     <tr className="bg-slate-50">
                      <td colSpan={3} className="px-4 py-2 font-semibold text-slate-600 border-b border-slate-200 text-xs uppercase">
                        {t('allowance')} & KPI
                      </td>
                    </tr>
                    <SalaryRow 
                      label={`${t('sl_role')} (${slipData.roleTitle})`} 
                      formula={`${formatCurrency(slipData.effectiveBase)} × ${(slipData.roleCoeff * 100)}%`} 
                      amount={slipData.roleAllowance} 
                      isSub isGreen
                    />
                     <SalaryRow 
                      label={t('sl_allowance')} 
                      formula="Manual / Other" 
                      amount={slipData.otherAllowance} 
                      isSub isGreen
                    />
                    <SalaryRow 
                      label={t('kpiBonus')} 
                      formula="Performance Criteria Bonus" 
                      amount={slipData.kpiBonus} 
                      isSub isGreen
                    />
                    <SalaryRow 
                      label={t('sl_ot')} 
                      formula="Calculated from Attendance" 
                      amount={slipData.overtime} 
                      isSub isGreen
                    />
                    <SalaryRow 
                      label={t('bonus')} 
                      formula="Spot Award / Performance Bonus" 
                      amount={slipData.bonus} 
                      isSub isGreen
                    />

                    {/* 4. Insurance & Deductions */}
                    <tr className="bg-slate-50">
                      <td colSpan={3} className="px-4 py-2 font-semibold text-slate-600 border-b border-slate-200 text-xs uppercase">
                        {t('sl_deduction')}
                      </td>
                    </tr>
                    
                    {/* Show Insurance Basis */}
                    <tr className="bg-red-50/30">
                      <td className="px-4 py-2 border-b border-slate-100 text-xs text-slate-500 pl-8 italic" colSpan={3}>
                         {t('insuranceBasis')}: <span className="font-semibold">{formatCurrency(slipData.insuranceBasis)}</span>
                      </td>
                    </tr>

                    <SalaryRow 
                      label={t('socialInsurance')} 
                      formula={`${slipConfig.insuranceConfig.socialInsurancePercent}% of ${formatCurrency(slipData.insuranceBasis)}`} 
                      amount={-slipData.insurance.bhxh}
                      isSub isRed
                    />
                    <SalaryRow 
                      label={t('healthInsurance')} 
                      formula={`${slipConfig.insuranceConfig.healthInsurancePercent}% of ${formatCurrency(slipData.insuranceBasis)}`} 
                      amount={-slipData.insurance.bhyt}
                      isSub isRed
                    />
                    <SalaryRow 
                      label={t('unemploymentInsurance')} 
                      formula={`${slipConfig.insuranceConfig.unemploymentInsurancePercent}% of ${formatCurrency(slipData.insuranceBasis)}`} 
                      amount={-slipData.insurance.bhtn}
                      isSub isRed
                    />
                    <SalaryRow 
                      label={t('otherDeduction')} 
                      formula="Manual Deduction (Fines/Fees)" 
                      amount={-slipData.otherDeduction} 
                      isSub isRed
                    />

                    {/* Final Total */}
                    <SalaryRow 
                      label={t('sl_total')} 
                      formula="Base + Comm + KPI + Allowances - Insurance - Deductions" 
                      amount={slipData.netPay} 
                      isTotal
                    />
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6 text-right">
                 <button 
                  onClick={() => setViewingSlip(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
