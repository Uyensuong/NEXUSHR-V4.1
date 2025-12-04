
import React, { useEffect, useState } from 'react';
import { api } from '../services/mockService';
import { Employee, Payroll, Role, PayrollStatus } from '../types';
import { Card, CardContent } from '../components/ui/Card';
import { Download, DollarSign, FileText, Calculator, X, TrendingUp, Edit3, Calendar, CheckCircle, Lock, Plus, RefreshCw, AlertCircle, Info, Shield, MessageCircle, Send, Check } from 'lucide-react';
import { useLanguage, useAuth } from '../contexts/AppContext';
import { calcSalary } from '../lib/salaryLogic';
import { format } from 'date-fns';

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [employeesMap, setEmployeesMap] = useState<Record<string, Employee>>({});
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
  const [feedbackInput, setFeedbackInput] = useState('');
  const [replyInput, setReplyInput] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

  // State for Performance/Metrics Modal
  const [editingMetrics, setEditingMetrics] = useState<Payroll | null>(null);
  const [metricsForm, setMetricsForm] = useState({
    salesTarget: 0,
    salesAchieved: 0,
    validWorkDays: 22,
    allowance: 0,
    bonus: 0,
    kpiBonus: 0,
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
        
        // 2. Fetch Employees for reference (Insurance Salary)
        const emps = await api.getEmployees();
        const map: Record<string, Employee> = {};
        emps.forEach(e => map[e.id] = e);
        setEmployeesMap(map);

        // 3. Select the latest one by default
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
    setFeedbackInput(''); // Reset feedback form
    setReplyInput('');
    setReplyingToId(null);
  };

  // --- Confirmation & Feedback Handlers ---
  const handleConfirmPayroll = async () => {
      if (!viewingSlip) return;
      if (!confirm("Confirm that this payslip is correct? This action will lock your payslip.")) return;
      try {
          await api.confirmPayroll(viewingSlip.id);
          alert("Confirmed successfully!");
          // Refresh data
          setViewingSlip(null);
          await fetchPayroll(selectedCycle);
      } catch (e) {
          alert("Error confirming payroll.");
      }
  };

  const handleSendFeedback = async () => {
      if (!viewingSlip || !feedbackInput.trim()) return;
      try {
          await api.sendPayrollFeedback(viewingSlip.id, feedbackInput);
          alert("Feedback sent. Status updated to Disputed.");
          setFeedbackInput('');
          setViewingSlip(null);
          await fetchPayroll(selectedCycle);
      } catch (e) {
          alert("Error sending feedback.");
      }
  };

  const handleResolveFeedback = async (feedbackId: string) => {
      if (!viewingSlip || !replyInput.trim()) return;
      try {
          await api.resolvePayrollFeedback(viewingSlip.id, feedbackId, replyInput);
          alert("Response sent. Status updated to Waiting Confirmation.");
          setReplyInput('');
          setReplyingToId(null);
          setViewingSlip(null);
          await fetchPayroll(selectedCycle);
      } catch (e) {
          alert("Error resolving feedback.");
      }
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
          alert(`Successfully recalculated ${count} records. Status updated to WAITING_CONFIRMATION.`);
          await fetchPayroll(selectedCycle);
      } catch (e) {
          alert("Error during bulk calculation");
      } finally {
          setLoading(false);
      }
  };

  const handleLockCycle = async () => {
      if (!confirm(`Are you sure you want to LOCK cycle ${selectedCycle}? This requires ALL slips to be CONFIRMED by employees.`)) return;
      setLoading(true);
      try {
          await api.lockPayrollCycle(selectedCycle);
          alert(`Cycle ${selectedCycle} has been locked.`);
          await fetchPayroll(selectedCycle);
      } catch (e: any) {
          alert("Error locking cycle: " + e.message);
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
      "Insurance Salary",
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
    const rows = payrolls.map(p => {
      const emp = employeesMap[p.employeeId];
      return [
        p.cycleId,
        `"${p.employeeName}"`,
        p.baseAmount,
        emp ? emp.insuranceSalary : 0,
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
      ];
    });

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

  const getStatusBadge = (status: PayrollStatus) => {
      switch(status) {
          case 'PAID': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">PAID</span>;
          case 'CONFIRMED': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">CONFIRMED</span>;
          case 'DISPUTED': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">DISPUTED</span>;
          case 'WAITING_CONFIRMATION': return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-bold">WAITING</span>;
          default: return <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-full text-xs font-bold">PENDING</span>;
      }
  };

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
                const emp = employeesMap[p.employeeId];
                const earnings = p.overtimeAmount + p.allowance + p.bonus + (p.kpiBonus || 0);
                const earningsTooltip = `OT: ${formatCurrency(p.overtimeAmount)} \nBonus: ${formatCurrency(p.bonus)} \nKPI: ${formatCurrency(p.kpiBonus || 0)} \nAllowance: ${formatCurrency(p.allowance)}`;
                const isPending = p.status === 'PENDING_CALC' || p.status === 'WAITING_CONFIRMATION';

                return (
                  <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${isPending ? 'bg-yellow-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{p.employeeName}</div>
                      <div className="text-xs text-slate-400">{p.validWorkDays} days work</div>
                    </td>
                    
                    <td className="px-6 py-4">
                        <div className="text-slate-700 font-medium">{formatCurrency(p.baseAmount)}</div>
                        {/* Insurance Salary Display */}
                        {emp && emp.insuranceSalary > 0 && (
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1" title={t('insuranceSalaryHint')}>
                                <Shield size={10} /> BH: {new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short", currency: 'VND' }).format(emp.insuranceSalary)}
                            </div>
                        )}
                    </td>
                    <td className="px-6 py-4 text-green-700 cursor-help" title={earningsTooltip}>
                      <div className="flex items-center gap-1 font-medium group">
                          + {formatCurrency(earnings)}
                          <Info size={12} className="text-slate-300 group-hover:text-green-500" />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-red-700">- {formatCurrency(p.deduction)}</td>

                    <td className="px-6 py-4 font-bold text-slate-800 text-base">
                        {formatCurrency(p.netPay)}
                    </td>
                    <td className="px-6 py-4 text-center">
                       {getStatusBadge(p.status)}
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

      {/* Input Metrics Modal - Redesigned */}
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
               {/* Same form as before */}
               <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                   <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                       <TrendingUp size={14} /> 1. Performance Data
                   </h4>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">{t('salesTarget')} (VND)</label>
                        <input 
                          type="text"
                          className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                          value={formatInputNumber(metricsForm.salesTarget)}
                          onChange={e => setMetricsForm({...metricsForm, salesTarget: parseInputNumber(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">{t('salesAchieved')} (VND)</label>
                        <input 
                          type="text"
                          className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold"
                          value={formatInputNumber(metricsForm.salesAchieved)}
                          onChange={e => setMetricsForm({...metricsForm, salesAchieved: parseInputNumber(e.target.value)})}
                        />
                      </div>
                   </div>

                   <div>
                     <label className="block text-xs font-medium text-slate-700 mb-1">{t('validWorkDays')}</label>
                     <div className="flex gap-2 items-center">
                         <input 
                            type="number" step="0.5"
                            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            value={metricsForm.validWorkDays}
                            onChange={e => setMetricsForm({...metricsForm, validWorkDays: Number(e.target.value)})}
                         />
                         <span className="text-xs text-slate-400 whitespace-nowrap">/ 22-26 days</span>
                     </div>
                   </div>
               </div>

               <div className="space-y-4">
                 <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                     <Edit3 size={14} /> 2. Manual Adjustments
                 </h4>
                 
                 <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 flex items-center gap-4">
                    <div className="p-2 bg-indigo-100 rounded-full text-indigo-600">
                        <DollarSign size={18} />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-indigo-800 mb-1">{t('kpiBonus')}</label>
                        <input 
                            type="text"
                            className="w-full border-2 border-indigo-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700 bg-white"
                            placeholder="Input 3P Bonus"
                            value={formatInputNumber(metricsForm.kpiBonus)}
                            onChange={e => setMetricsForm({...metricsForm, kpiBonus: parseInputNumber(e.target.value)})}
                        />
                    </div>
                 </div>

                 <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">{t('bonus')} (Spot)</label>
                      <input 
                        type="text"
                        className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        value={formatInputNumber(metricsForm.bonus)}
                        onChange={e => setMetricsForm({...metricsForm, bonus: parseInputNumber(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">{t('otherAllowance')}</label>
                      <input 
                        type="text"
                        className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        value={formatInputNumber(metricsForm.allowance)}
                        onChange={e => setMetricsForm({...metricsForm, allowance: parseInputNumber(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-red-500 mb-1">{t('otherDeduction')}</label>
                      <input 
                        type="text"
                        className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 text-red-600 text-sm"
                        value={formatInputNumber(metricsForm.deduction)}
                        onChange={e => setMetricsForm({...metricsForm, deduction: parseInputNumber(e.target.value)})}
                      />
                    </div>
                 </div>
               </div>

               <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setEditingMetrics(null)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-600">
                  {t('cancel')}
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm text-sm">
                  {t('update')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Slip Modal (View Only + Feedback) */}
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
              {/* Slip Content */}
              <div className="mb-6 border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-600 font-semibold text-sm uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 border-b border-slate-200 w-1/3">{t('item')}</th>
                      <th className="px-4 py-3 border-b border-slate-200 w-1/3">{t('calculationFormula')}</th>
                      <th className="px-4 py-3 border-b border-slate-200 w-1/3 text-right">{t('amount')}</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-slate-700">
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
                    <SalaryRow 
                      label={t('sl_sales')} 
                      formula={`Achieved: ${formatCurrency(slipData.salesAchieved)} (${(slipData.salesRate * 100)}%)`} 
                      amount={slipData.commission} 
                      isGreen
                    />
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
                      formula="Performance Criteria Bonus (3P)" 
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
                    <tr className="bg-slate-50">
                      <td colSpan={3} className="px-4 py-2 font-semibold text-slate-600 border-b border-slate-200 text-xs uppercase">
                        {t('sl_deduction')}
                      </td>
                    </tr>
                    <tr className="bg-red-50/30">
                      <td className="px-4 py-2 border-b border-slate-100 text-xs text-slate-500 pl-8 italic" colSpan={3}>
                         {t('insuranceBasis')}: <span className="font-semibold">{formatCurrency(slipData.insuranceBasis)}</span>
                      </td>
                    </tr>
                    <SalaryRow 
                      label={t('socialInsurance')} 
                      formula={`${slipConfig.insuranceConfig.socialInsurancePercent}%`} 
                      amount={-slipData.insurance.bhxh}
                      isSub isRed
                    />
                    <SalaryRow 
                      label={t('healthInsurance')} 
                      formula={`${slipConfig.insuranceConfig.healthInsurancePercent}%`} 
                      amount={-slipData.insurance.bhyt}
                      isSub isRed
                    />
                    <SalaryRow 
                      label={t('unemploymentInsurance')} 
                      formula={`${slipConfig.insuranceConfig.unemploymentInsurancePercent}%`} 
                      amount={-slipData.insurance.bhtn}
                      isSub isRed
                    />
                    <SalaryRow 
                      label={t('otherDeduction')} 
                      formula="Manual Deduction" 
                      amount={-slipData.otherDeduction} 
                      isSub isRed
                    />
                    <SalaryRow 
                      label={t('sl_total')} 
                      formula="Base + Comm + KPI + Allowances - Insurance - Deductions" 
                      amount={slipData.netPay} 
                      isTotal
                    />
                  </tbody>
                </table>
              </div>

              {/* Feedback & Confirmation Section */}
              <div className="border-t pt-4">
                  <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-3">
                      <MessageCircle size={18} /> Confirmation & Feedback
                  </h4>
                  
                  {/* Feedback History */}
                  {viewingSlip.feedbacks && viewingSlip.feedbacks.length > 0 && (
                      <div className="mb-4 space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                          {viewingSlip.feedbacks.map(fb => (
                              <div key={fb.id} className="text-sm">
                                  <div className="flex gap-2 items-start">
                                      <span className="font-bold text-slate-700">You:</span>
                                      <p className="text-slate-600">{fb.content}</p>
                                  </div>
                                  {fb.response ? (
                                      <div className="flex gap-2 items-start ml-4 mt-1 bg-green-50 p-2 rounded">
                                          <span className="font-bold text-green-700">HR:</span>
                                          <p className="text-green-800">{fb.response}</p>
                                      </div>
                                  ) : isAdmin && (
                                      <div className="mt-1 ml-8">
                                          {replyingToId === fb.id ? (
                                              <div className="flex gap-2">
                                                  <input 
                                                      className="flex-1 border rounded px-2 py-1 text-xs" 
                                                      placeholder="Reply..."
                                                      value={replyInput}
                                                      onChange={e => setReplyInput(e.target.value)}
                                                  />
                                                  <button onClick={() => handleResolveFeedback(fb.id)} className="bg-green-600 text-white px-2 py-1 rounded text-xs">Send</button>
                                              </div>
                                          ) : (
                                              <button onClick={() => setReplyingToId(fb.id)} className="text-indigo-600 text-xs hover:underline">Reply</button>
                                          )}
                                      </div>
                                  )}
                              </div>
                          ))}
                      </div>
                  )}

                  {/* Actions Area */}
                  {user?.role === Role.EMPLOYEE && viewingSlip.status !== 'PAID' && (
                      <div className="flex gap-4 items-start">
                          {viewingSlip.status === 'CONFIRMED' ? (
                              <div className="flex-1 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
                                  <CheckCircle size={20} />
                                  <div>
                                      <span className="font-bold">Confirmed</span> at {viewingSlip.confirmedAt ? format(new Date(viewingSlip.confirmedAt), 'PP HH:mm') : ''}
                                  </div>
                              </div>
                          ) : (
                              <div className="flex-1 flex gap-3">
                                  <button 
                                      onClick={handleConfirmPayroll}
                                      className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-green-700 shadow-sm flex items-center justify-center gap-2"
                                  >
                                      <Check size={20} /> I Agree
                                  </button>
                                  <div className="flex-[1.5] relative">
                                      <input 
                                          className="w-full border rounded-lg pl-3 pr-10 py-3"
                                          placeholder="Have questions? Type here..."
                                          value={feedbackInput}
                                          onChange={e => setFeedbackInput(e.target.value)}
                                      />
                                      <button 
                                          onClick={handleSendFeedback}
                                          disabled={!feedbackInput.trim()}
                                          className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                                      >
                                          <Send size={18} />
                                      </button>
                                  </div>
                              </div>
                          )}
                      </div>
                  )}
              </div>
              
              <div className="mt-4 text-right">
                 <button onClick={() => setViewingSlip(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors">
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
