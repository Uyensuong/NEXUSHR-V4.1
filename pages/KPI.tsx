
import React, { useEffect, useState } from 'react';
import { api } from '../services/mockService';
import { Employee, KPIEvaluation, KPIPeriod, Role, SalaryConfig, KPICriterion, DepartmentGoal, EmploymentStatus, KPIStatus } from '../types';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { TrendingUp, Plus, Search, CheckCircle, X, DollarSign, Calendar, Layers, Zap, Users, UserCheck, ClipboardList, CheckSquare, ArrowRight, AlertCircle, Activity, Save } from 'lucide-react';
import { useLanguage, useAuth } from '../contexts/AppContext';
import { format } from 'date-fns';

// ... (Rest of imports and component setup similar to previous, but highlighting changes below)

export default function KPIPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'MY_KPI' | 'TEAM_REVIEWS' | 'SALARY' | 'DEPARTMENT'>('MY_KPI');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [reviews, setReviews] = useState<KPIEvaluation[]>([]);
  const [config, setConfig] = useState<SalaryConfig | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Review Modal (Used for Create & Self Assessment)
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    employeeId: '',
    period: 'MONTH' as KPIPeriod,
    cycle: format(new Date(), 'yyyy-MM'),
    scoreP1: 80,
    scoreP2: 80,
    scoreP3: 80,
    notes: ''
  });
  
  // Smart Task Auto-Calc State
  const [taskCompletionRate, setTaskCompletionRate] = useState<number | null>(null);

  // Cross Check Modal
  const [showCrossCheckModal, setShowCrossCheckModal] = useState(false);
  const [crossCheckReview, setCrossCheckReview] = useState<KPIEvaluation | null>(null);
  const [crossCheckForm, setCrossCheckForm] = useState({
      scoreP1: 0,
      scoreP2: 0,
      scoreP3: 0,
      notes: '',
      criteriaScores: {} as Record<string, number>
  });

  // Salary Approval Modal
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryProposal, setSalaryProposal] = useState<any>(null);
  const [proposedSalary, setProposedSalary] = useState<number>(0);

  // Detailed Criteria State
  const [deptCriteria, setDeptCriteria] = useState<KPICriterion[]>([]);
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>({});

  // Salary Adjustment
  const [salarySuggestions, setSalarySuggestions] = useState<any[]>([]);

  // Department Automation
  const [selectedDeptForAuto, setSelectedDeptForAuto] = useState('');
  const [deptGoals, setDeptGoals] = useState<DepartmentGoal[]>([]);
  const [deptActuals, setDeptActuals] = useState<Record<string, number>>({});
  const [genCycle, setGenCycle] = useState(format(new Date(), 'yyyy-MM'));
  const [isGenerating, setIsGenerating] = useState(false);
  const [projectedScore, setProjectedScore] = useState(0);

  // ... (useEffect hooks same as before) ...
  useEffect(() => {
    if (user) {
        // Set initial tab based on role
        if (user.role === Role.EMPLOYEE && activeTab !== 'MY_KPI') {
            setActiveTab('MY_KPI');
        } else if ((user.role === Role.ADMIN || user.role === Role.MANAGER) && activeTab === 'MY_KPI') {
            // Default to TEAM_REVIEWS for admins initially if they prefer
            setActiveTab('TEAM_REVIEWS'); 
        }
        loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab]);

  const loadData = async () => {
    setLoading(true);
    if (!user) return;

    try {
      const [empData, reviewData, configData] = await Promise.all([
        api.getEmployees(),
        api.getKPIReviews(user.id, user.role),
        api.getSalaryConfig()
      ]);
      setEmployees(empData);
      setReviews(reviewData);
      setConfig(configData);

      if (activeTab === 'SALARY' && user.role === Role.ADMIN) {
         // Calculate suggestions for all employees
         const suggestions = await Promise.all(empData.map(async (emp) => {
            const result = await api.getSuggestedSalaryIncrease(emp.id);
            return {
               ...emp,
               ...result
            };
         }));
         setSalarySuggestions(suggestions);
      }

    } finally {
      setLoading(false);
    }
  };

  // When Employee is selected in modal, load their dept criteria and TASK PERFORMANCE
  // Triggered by setReviewForm({...employeeId})
  useEffect(() => {
     const fetchDetails = async () => {
         if (!config || !reviewForm.employeeId) {
             setDeptCriteria([]);
             setTaskCompletionRate(null);
             return;
         }
         const emp = employees.find(e => e.id === reviewForm.employeeId);
         
         // 1. Load Dept Criteria
         if (emp && emp.departmentName && config.departmentKPIs) {
             const deptConfig = config.departmentKPIs.find(d => d.departmentName === emp.departmentName);
             if (deptConfig && deptConfig.criteria.length > 0) {
                 setDeptCriteria(deptConfig.criteria);
                 // Initialize scores
                 const initialScores: Record<string, number> = {};
                 deptConfig.criteria.forEach(c => initialScores[c.id] = 80);
                 setCriteriaScores(initialScores);
             } else {
                 setDeptCriteria([]);
                 setCriteriaScores({});
             }
         }

         // 2. Load Task Performance (Daily Checklists)
         const rate = await api.getEmployeeTaskCompletionRate(reviewForm.employeeId, reviewForm.cycle);
         setTaskCompletionRate(rate);
         
         // Auto-set P1 based on task rate
         setReviewForm(prev => ({ ...prev, scoreP1: rate }));
     };
     fetchDetails();
  }, [reviewForm.employeeId, reviewForm.cycle, config, employees]);

  // Load Dept Goals for Automation
  useEffect(() => {
     const loadGoals = async () => {
        if (selectedDeptForAuto && config) {
            const deptConfig = config.departmentKPIs.find(d => d.departmentName === selectedDeptForAuto);
            if (deptConfig && deptConfig.goals) {
                setDeptGoals(deptConfig.goals);
                
                // Try to fetch existing actuals for this cycle to allow editing
                const existingResults = await api.getDepartmentResults(selectedDeptForAuto, genCycle);
                
                const initials: Record<string, number> = {};
                if (existingResults) {
                    // Pre-fill with existing data
                    existingResults.forEach((r: any) => {
                        initials[r.goalId] = r.actual;
                    });
                } else {
                    // Initialize to 0
                    deptConfig.goals.forEach(g => initials[g.id] = 0);
                }
                setDeptActuals(initials);
            } else {
                setDeptGoals([]);
                setDeptActuals({});
            }
        }
     };
     loadGoals();
  }, [selectedDeptForAuto, config, genCycle]);

  // Auto Calculate Projected Score for Department
  useEffect(() => {
     if (deptGoals.length > 0) {
        let totalWeightedScore = 0;
        let totalWeight = 0;

        deptGoals.forEach(g => {
            const actual = deptActuals[g.id] || 0;
            // Achievement % = (Actual / Target) * 100
            // Cap at 150%
            const rate = g.target > 0 ? (actual / g.target) * 100 : 0;
            const cappedRate = Math.min(rate, 150);
            
            totalWeightedScore += cappedRate * g.weight;
            totalWeight += g.weight;
        });
        
        const final = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
        // Cap overall score at 120
        setProjectedScore(Math.min(Math.round(final), 120));
     } else {
        setProjectedScore(0);
     }
  }, [deptActuals, deptGoals]);

  // Auto Calculate P3 when Criteria scores change (For Review Modal)
  useEffect(() => {
      if (deptCriteria.length > 0) {
          let totalWeightedScore = 0;
          let totalWeights = 0;
          
          deptCriteria.forEach(crit => {
              const score = criteriaScores[crit.id] || 0;
              totalWeightedScore += score * crit.weight;
              totalWeights += crit.weight;
          });

          if (totalWeights > 0) {
              // Normalize to 100 scale if weights don't sum to 100
              // Weighted Avg = Sum(Score * Weight) / Sum(Weight)
              const p3 = Math.round(totalWeightedScore / totalWeights);
              setReviewForm(prev => ({ ...prev, scoreP3: p3 }));
          }
      }
  }, [criteriaScores, deptCriteria]);

  // Helper to format numbers with commas
  const formatNumber = (value: number | string) => {
    if (value === undefined || value === null) return '';
    const clean = value.toString().replace(/,/g, '');
    if (!clean) return '';
    return new Intl.NumberFormat('en-US').format(Number(clean));
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      // Prepare detailed scores payload
      const details = deptCriteria.map(c => ({
          name: c.name,
          weight: c.weight,
          score: criteriaScores[c.id] || 0
      }));

      // Determine if self-assessment
      const isSelf = user.role === Role.EMPLOYEE || (user.role !== Role.EMPLOYEE && reviewForm.employeeId === employees.find(e => e.userId === user.id)?.id);

      await api.createKPIReview({
        ...reviewForm,
        evaluatorName: user.fullName,
        criteriaDetails: details.length > 0 ? details : undefined,
        isSelfAssessment: isSelf
      });
      setShowReviewModal(false);
      loadData();
    } catch (error) {
      alert("Error creating review");
    }
  };

  // ... (Other handlers same as before: openSelfAssessment, openCrossCheck, handleSubmitCrossCheck, openSalaryApproval, handleApproveRaise)
  const openSelfAssessment = () => {
      const myEmp = employees.find(e => e.userId === user?.id);
      if (!myEmp) {
          alert("Employee profile not found.");
          return;
      }
      // Important: This state update triggers the useEffect to load criteria
      setReviewForm({
          employeeId: myEmp.id,
          period: 'MONTH',
          cycle: format(new Date(), 'yyyy-MM'),
          scoreP1: 80,
          scoreP2: 80,
          scoreP3: 80,
          notes: ''
      });
      setShowReviewModal(true);
  };

  const openCrossCheck = (review: KPIEvaluation) => {
      const emp = employees.find(e => e.id === review.employeeId);
      if (!emp || !config) return;

      // Load criteria for this employee's dept to display
      const deptConfig = config.departmentKPIs?.find(d => d.departmentName === emp.departmentName);
      const criteria = deptConfig?.criteria || [];
      setDeptCriteria(criteria);

      // Init form with Self Scores or Defaults
      const selfP1 = review.selfAssessment?.scoreP1 || 0;
      const selfP2 = review.selfAssessment?.scoreP2 || 0;
      const selfP3 = review.selfAssessment?.scoreP3 || 0;

      setCrossCheckReview(review);
      setCrossCheckForm({
          scoreP1: selfP1,
          scoreP2: selfP2,
          scoreP3: selfP3,
          notes: '',
          criteriaScores: {} 
      });
      setShowCrossCheckModal(true);
  };

  const handleSubmitCrossCheck = async () => {
      if (!crossCheckReview || !user) return;
      try {
          await api.submitCrossCheck(crossCheckReview.id, {
              scoreP1: crossCheckForm.scoreP1,
              scoreP2: crossCheckForm.scoreP2,
              scoreP3: crossCheckForm.scoreP3,
              notes: crossCheckForm.notes,
              evaluatorName: user.fullName
          });
          setShowCrossCheckModal(false);
          loadData();
      } catch (e) {
          alert("Failed to submit check.");
      }
  };

  const openSalaryApproval = (item: any) => {
      setSalaryProposal(item);
      setProposedSalary(item.suggestedSalary);
      setShowSalaryModal(true);
  };

  const handleApproveRaise = async () => {
     if (!salaryProposal) return;
     try {
       await api.updateEmployee(salaryProposal.id, { baseSalary: proposedSalary });
       alert(t('updateSuccess'));
       setShowSalaryModal(false);
       loadData(); 
     } catch (err) {
       alert("Failed to update salary");
     }
  };

  const handleSaveDraft = async () => {
      if (!selectedDeptForAuto) return;
      try {
          const goalsPayload = deptGoals.map(g => ({
              goalId: g.id,
              actual: deptActuals[g.id] || 0
          }));
          await api.saveDepartmentDraft(selectedDeptForAuto, genCycle, goalsPayload);
          alert("Draft saved successfully.");
      } catch (e: any) {
          alert("Failed to save draft.");
      }
  };

  const handleGenerateDeptKPIs = async () => {
      if (!selectedDeptForAuto) return;
      if (!confirm(t('autoGenConfirm'))) return;
      
      setIsGenerating(true);
      try {
          const goalsPayload = deptGoals.map(g => ({
              goalId: g.id,
              actual: deptActuals[g.id] || 0
          }));

          const count = await api.generateDepartmentKPIs(selectedDeptForAuto, genCycle, goalsPayload);
          alert(`${t('generateSuccess')} (${count} ${t('employeesAffected')})`);
          loadData(); // Refresh reviews list
      } catch (e: any) {
          alert(e.message);
      } finally {
          setIsGenerating(false);
      }
  };

  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.HR;
  const isManager = user?.role === Role.MANAGER || isAdmin;

  // Filter employees for current selected department
  const affectedEmployees = employees.filter(e => e.departmentName === selectedDeptForAuto && e.status === EmploymentStatus.ACTIVE);

  // Filter Reviews based on Tab
  const myReviews = reviews.filter(r => r.employeeId === employees.find(e => e.userId === user?.id)?.id);
  
  return (
    <div className="space-y-6">
      {/* ... (Header and Tabs same as before) ... */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="text-indigo-600" />
            {t('kpiTitle')}
          </h1>
          <p className="text-slate-500">{t('kpiSubtitle')}</p>
        </div>
        {isManager && activeTab === 'TEAM_REVIEWS' && (
           <div className="flex gap-2">
              <button 
                onClick={() => {
                    setReviewForm({
                        employeeId: '',
                        period: 'MONTH',
                        cycle: format(new Date(), 'yyyy-MM'),
                        scoreP1: 80,
                        scoreP2: 80,
                        scoreP3: 80,
                        notes: ''
                    });
                    setShowReviewModal(true);
                }}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
              >
                <Plus size={18} />
                {t('createReview')}
              </button>
           </div>
        )}
        {!isAdmin && activeTab === 'MY_KPI' && (
            <button 
                onClick={openSelfAssessment}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
            >
                <ClipboardList size={18} />
                {t('startSelfAssessment')}
            </button>
        )}
      </div>

      <div className="flex gap-4 border-b border-slate-200 overflow-x-auto">
         <button 
           onClick={() => setActiveTab('MY_KPI')}
           className={`pb-3 px-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'MY_KPI' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
         >
            {t('mySelfAssessments')}
         </button>
         {isManager && (
             <button 
             onClick={() => setActiveTab('TEAM_REVIEWS')}
             className={`pb-3 px-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'TEAM_REVIEWS' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
           >
              {t('teamReviews')}
           </button>
         )}
         {isAdmin && (
           <>
            <button 
                onClick={() => setActiveTab('DEPARTMENT')}
                className={`pb-3 px-4 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'DEPARTMENT' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Layers size={16} />
                {t('deptPerformance')}
            </button>
            <button 
                onClick={() => setActiveTab('SALARY')}
                className={`pb-3 px-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'SALARY' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                {t('salaryAdjustment')}
            </button>
           </>
         )}
      </div>

      {activeTab === 'MY_KPI' && (
        <Card>
           <CardContent className="p-0 overflow-x-auto">
             {myReviews.length === 0 ? (
               <div className="p-8 text-center text-slate-500">{t('noRecords')}</div>
             ) : (
               <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 text-slate-500 font-medium">
                   <tr>
                     <th className="px-6 py-4">{t('period')}</th>
                     <th className="px-6 py-4">{t('status')}</th>
                     <th className="px-6 py-4 text-center">Self Score</th>
                     <th className="px-6 py-4 text-center">Final Score</th>
                     <th className="px-6 py-4">{t('evaluator')}</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {myReviews.map((rev) => (
                     <tr key={rev.id} className="hover:bg-slate-50">
                       <td className="px-6 py-4 text-slate-600">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold mr-2 ${rev.period === 'YEAR' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                             {t(rev.period.toLowerCase())}
                          </span>
                          {rev.cycle}
                       </td>
                       <td className="px-6 py-4">
                           <span className={`px-2 py-1 rounded-full text-xs font-bold ${rev.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                               {t(`status_${rev.status}`)}
                           </span>
                       </td>
                       <td className="px-6 py-4 text-center">
                           {rev.selfAssessment ? (
                               <div className="font-medium text-slate-600">
                                   {Math.round((rev.selfAssessment.scoreP1 + rev.selfAssessment.scoreP2 + rev.selfAssessment.scoreP3) / 3)} 
                                   <span className="text-[10px] text-slate-400 block">(Avg)</span>
                               </div>
                           ) : '--'}
                       </td>
                       <td className="px-6 py-4 text-center">
                          {rev.status === 'COMPLETED' ? (
                              <span className={`font-bold text-lg ${rev.totalScore >= 90 ? 'text-green-600' : rev.totalScore >= 70 ? 'text-blue-600' : 'text-red-600'}`}>
                                {rev.totalScore}
                              </span>
                          ) : (
                              <span className="text-xs text-slate-400 italic">Pending</span>
                          )}
                       </td>
                       <td className="px-6 py-4 text-slate-500">{rev.evaluatedBy}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             )}
           </CardContent>
        </Card>
      )}

      {activeTab === 'TEAM_REVIEWS' && isManager && (
        <Card>
           {/* ... Team Reviews Content Same as before ... */}
           <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
               <h3 className="font-bold text-slate-700">{t('teamReviews')}</h3>
               <div className="flex items-center gap-2 text-xs">
                   <span className="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-400"></span> {t('status_PENDING_REVIEW')}
                   <span className="w-3 h-3 rounded-full bg-green-100 border border-green-400 ml-2"></span> {t('status_COMPLETED')}
               </div>
           </div>
           <CardContent className="p-0 overflow-x-auto">
             {reviews.length === 0 ? (
               <div className="p-8 text-center text-slate-500">{t('noRecords')}</div>
             ) : (
               <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 text-slate-500 font-medium">
                   <tr>
                     <th className="px-6 py-4">{t('employees')}</th>
                     <th className="px-6 py-4">{t('period')}</th>
                     <th className="px-6 py-4">{t('status')}</th>
                     <th className="px-6 py-4 text-center">Self Score</th>
                     <th className="px-6 py-4 text-right">{t('score')}</th>
                     <th className="px-6 py-4 text-right">{t('actions')}</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {reviews.map((rev) => (
                     <tr key={rev.id} className={`hover:bg-slate-50 ${rev.status === 'PENDING_REVIEW' ? 'bg-yellow-50/50' : ''}`}>
                       <td className="px-6 py-4 font-medium text-slate-900">{rev.employeeName}</td>
                       <td className="px-6 py-4 text-slate-600">
                          {rev.cycle}
                       </td>
                       <td className="px-6 py-4">
                           <span className={`px-2 py-1 rounded-full text-xs font-bold ${rev.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                               {t(`status_${rev.status}`)}
                           </span>
                       </td>
                       <td className="px-6 py-4 text-center">
                           {rev.selfAssessment ? (
                               <span className="text-slate-600 font-medium">
                                   {Math.round((rev.selfAssessment.scoreP1 + rev.selfAssessment.scoreP2 + rev.selfAssessment.scoreP3) / 3)}
                               </span>
                           ) : '--'}
                       </td>
                       <td className="px-6 py-4 text-right">
                          {rev.status === 'COMPLETED' ? (
                              <span className="font-bold text-slate-800">{rev.totalScore}</span>
                          ) : '--'}
                       </td>
                       <td className="px-6 py-4 text-right">
                           {rev.status === 'PENDING_REVIEW' && (
                               <button 
                                 onClick={() => openCrossCheck(rev)}
                                 className="flex items-center gap-1 ml-auto bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-indigo-700"
                               >
                                   <UserCheck size={14} />
                                   {t('crossCheck')}
                               </button>
                           )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             )}
           </CardContent>
        </Card>
      )}

      {activeTab === 'DEPARTMENT' && isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                  <CardHeader title={t('selectDepartment')} />
                  <CardContent>
                      <div className="space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">{t('department')}</label>
                              <select 
                                className="w-full border rounded-lg px-3 py-2 bg-white"
                                value={selectedDeptForAuto}
                                onChange={e => setSelectedDeptForAuto(e.target.value)}
                              >
                                  <option value="">{t('selectDepartment')}...</option>
                                  {config?.departmentKPIs?.map(d => (
                                      <option key={d.departmentName} value={d.departmentName}>{d.departmentName}</option>
                                  ))}
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">{t('cycle')}</label>
                              <input 
                                type="text" 
                                className="w-full border rounded-lg px-3 py-2"
                                value={genCycle}
                                onChange={e => setGenCycle(e.target.value)}
                              />
                          </div>

                          {/* Employees List Preview */}
                          {selectedDeptForAuto && (
                              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                    <Users size={12} />
                                    {t('employeesAffected')} ({affectedEmployees.length})
                                  </h4>
                                  <ul className="text-xs text-slate-600 space-y-1 max-h-40 overflow-y-auto">
                                      {affectedEmployees.map(emp => (
                                          <li key={emp.id} className="flex justify-between">
                                              <span>{emp.fullName}</span>
                                              <span className="text-slate-400">{emp.code}</span>
                                          </li>
                                      ))}
                                      {affectedEmployees.length === 0 && <li className="italic text-slate-400">No active employees found.</li>}
                                  </ul>
                              </div>
                          )}
                      </div>
                  </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                  <CardHeader title={t('deptPerformance')} action={<Zap className="text-yellow-500" />} />
                  <CardContent>
                      {!selectedDeptForAuto ? (
                          <div className="text-center py-8 text-slate-500">Please select a department to input results.</div>
                      ) : deptGoals.length === 0 ? (
                          <div className="text-center py-8 text-slate-500">No goals configured for this department in Salary Config.</div>
                      ) : (
                          <div className="space-y-6">
                              <div className="overflow-x-auto">
                                  <table className="w-full text-sm text-left">
                                      <thead className="bg-slate-50 text-slate-500">
                                          <tr>
                                              <th className="px-4 py-2 w-1/3">{t('criteriaName')}</th>
                                              <th className="px-4 py-2 w-1/4">{t('targetValue')}</th>
                                              <th className="px-4 py-2 w-1/4">{t('actualValue')}</th>
                                              <th className="px-4 py-2 w-1/6 text-right">{t('achievementRate')}</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                          {deptGoals.map(goal => {
                                              const actual = deptActuals[goal.id] || 0;
                                              const rate = goal.target > 0 ? (actual / goal.target) * 100 : 0;
                                              
                                              return (
                                                  <tr key={goal.id}>
                                                      <td className="px-4 py-3 font-medium">
                                                          {goal.name}
                                                          <div className="text-xs text-slate-400 font-normal">{t('weight')}: {goal.weight}%</div>
                                                      </td>
                                                      <td className="px-4 py-3 text-slate-600">
                                                          {new Intl.NumberFormat().format(goal.target)} <span className="text-xs text-slate-400">{goal.unit}</span>
                                                      </td>
                                                      <td className="px-4 py-3">
                                                          <input 
                                                            type="text"
                                                            className="border rounded px-2 py-1 w-full bg-slate-50 focus:bg-white transition-colors"
                                                            value={formatNumber(actual)}
                                                            onChange={e => setDeptActuals(prev => ({ ...prev, [goal.id]: Number(e.target.value.replace(/,/g, '')) }))}
                                                          />
                                                      </td>
                                                      <td className="px-4 py-3 text-right font-bold">
                                                          <span className={rate >= 100 ? 'text-green-600' : rate >= 80 ? 'text-blue-600' : 'text-red-600'}>
                                                              {rate.toFixed(1)}%
                                                          </span>
                                                      </td>
                                                  </tr>
                                              );
                                          })}
                                      </tbody>
                                  </table>
                              </div>

                              <div className="flex flex-col md:flex-row gap-4 items-stretch">
                                   {/* Score Preview Card */}
                                  <div className="flex-1 bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-lg p-4 shadow-sm">
                                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{t('calcPreview')}</h4>
                                      <div className="flex justify-between items-end">
                                          <div>
                                              <div className="text-3xl font-bold text-indigo-600">{projectedScore}</div>
                                              <div className="text-sm font-medium text-indigo-900">{t('projectedScore')}</div>
                                          </div>
                                          <div className="text-right text-xs text-slate-400">
                                              Based on weighted goal achievement (Orders, Profit, etc).<br/>Capped at 120.
                                          </div>
                                      </div>
                                  </div>

                                  {/* Action Card */}
                                  <div className="flex-1 bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex flex-col justify-between">
                                      <div>
                                          <h4 className="font-bold text-indigo-900 text-sm">{t('autoGenKPI')}</h4>
                                          <p className="text-xs text-indigo-700 mt-1">Review metrics above before generating.</p>
                                      </div>
                                      <div className="flex gap-2 mt-3">
                                          <button 
                                            onClick={handleSaveDraft}
                                            className="flex-1 bg-white border border-indigo-200 text-indigo-700 px-3 py-2 rounded-lg font-bold shadow-sm hover:bg-indigo-50 flex items-center justify-center gap-1 text-sm"
                                          >
                                              <Save size={14} /> Draft
                                          </button>
                                          <button 
                                            onClick={handleGenerateDeptKPIs}
                                            disabled={isGenerating || projectedScore === 0}
                                            className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded-lg font-bold shadow hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1 text-sm"
                                          >
                                              {isGenerating ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <Zap size={14} />}
                                              Generate
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )}
                  </CardContent>
              </Card>
          </div>
      )}

      {/* ... (Salary Tab and Modals same as before) ... */}
      {activeTab === 'SALARY' && isAdmin && (
         <Card>
            <div className="p-4 bg-yellow-50 border-b border-yellow-100 text-sm text-yellow-800">
               Suggestions based on annual weighted average scores and configured Increase Rules.
            </div>
            <CardContent className="p-0 overflow-x-auto">
               <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 text-slate-500 font-medium">
                   <tr>
                     <th className="px-6 py-4">{t('employees')}</th>
                     <th className="px-6 py-4">{t('avgScore')}</th>
                     <th className="px-6 py-4">{t('currentSalary')}</th>
                     <th className="px-6 py-4 text-center">Proposal</th>
                     <th className="px-6 py-4">{t('newSalary')}</th>
                     <th className="px-6 py-4 text-right">{t('status')}</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {salarySuggestions.map(item => (
                       <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium text-slate-900">{item.fullName}</td>
                          <td className="px-6 py-4">
                             <span className="font-bold">{item.avgScore}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                             {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.currentSalary)}
                          </td>
                          <td className="px-6 py-4 text-center">
                             {item.suggestedIncreasePercent > 0 ? (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700">
                                    +{item.suggestedIncreasePercent}%
                                </span>
                             ) : (
                                <span className="text-slate-400 text-xs">-</span>
                             )}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800">
                             {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.suggestedSalary)}
                          </td>
                          <td className="px-6 py-4 text-right">
                             {item.suggestedIncreasePercent > 0 && (
                                <button 
                                  onClick={() => openSalaryApproval(item)}
                                  className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-indigo-700 shadow-sm ml-auto"
                                >
                                   <CheckCircle size={14} />
                                   {t('approve')}
                                </button>
                             )}
                          </td>
                       </tr>
                    ))}
                 </tbody>
               </table>
            </CardContent>
         </Card>
      )}

      {/* ... (Modals: Salary, Create Review, Cross Check same as previous file) ... */}
      {/* ... Salary Approval Modal ... */}
      {showSalaryModal && salaryProposal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                  {/* ... modal content ... */}
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-green-50">
                      <h3 className="font-bold text-lg text-green-800 flex items-center gap-2">
                          <DollarSign size={20} />
                          {t('salaryAdjustment')}
                      </h3>
                      <button onClick={() => setShowSalaryModal(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-6 space-y-6">
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                          <p className="text-sm text-slate-500">Employee</p>
                          <p className="text-lg font-bold text-slate-900">{salaryProposal.fullName}</p>
                          <p className="text-xs text-slate-500 mt-1">Avg Score: <span className="font-bold text-indigo-600">{salaryProposal.avgScore}</span></p>
                      </div>

                      <div className="space-y-4">
                          <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-500">Current Salary</span>
                              <span className="font-medium text-slate-700 line-through">
                                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(salaryProposal.currentSalary)}
                              </span>
                          </div>
                          
                          <div className="flex justify-center text-slate-400">
                              <ArrowRight size={20} className="transform rotate-90 md:rotate-0" />
                          </div>

                          <div>
                              <label className="block text-sm font-bold text-green-700 mb-2">Proposed New Salary</label>
                              <input 
                                  type="text" 
                                  className="w-full border-2 border-green-200 rounded-lg px-4 py-3 text-lg font-bold text-green-800 focus:ring-2 focus:ring-green-500 outline-none"
                                  value={formatNumber(proposedSalary)}
                                  onChange={e => setProposedSalary(Number(e.target.value.replace(/,/g, '')))}
                              />
                              <p className="text-xs text-slate-500 mt-1 text-right">
                                  Increase: {((proposedSalary - salaryProposal.currentSalary) / salaryProposal.currentSalary * 100).toFixed(1)}%
                              </p>
                          </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                          <button onClick={() => setShowSalaryModal(false)} className="flex-1 px-4 py-3 border rounded-lg hover:bg-slate-50">
                              {t('cancel')}
                          </button>
                          <button 
                              onClick={handleApproveRaise} 
                              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm font-bold flex items-center justify-center gap-2"
                          >
                              <CheckCircle size={18} />
                              Confirm
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* ... Review Modal ... */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">
                  {user?.role === Role.EMPLOYEE ? t('startSelfAssessment') : t('createReview')}
              </h3>
              <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateReview} className="p-6 space-y-4">
               {/* Employee Selection (Hidden or Disabled if Self) */}
               <div className={user?.role === Role.EMPLOYEE ? 'hidden' : ''}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('employees')}</label>
                  <select 
                     className="w-full border rounded-lg px-3 py-2 bg-white disabled:bg-slate-100"
                     required
                     value={reviewForm.employeeId}
                     onChange={e => setReviewForm({...reviewForm, employeeId: e.target.value})}
                     disabled={user?.role === Role.EMPLOYEE} // Employee locked to self
                  >
                     <option value="">{t('selectEmployee')}...</option>
                     {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.fullName} ({e.departmentName})</option>
                     ))}
                  </select>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">{t('period')}</label>
                     <select 
                        className="w-full border rounded-lg px-3 py-2 bg-white"
                        value={reviewForm.period}
                        onChange={e => setReviewForm({...reviewForm, period: e.target.value as KPIPeriod})}
                     >
                        <option value="MONTH">{t('month')}</option>
                        <option value="QUARTER">{t('quarter')}</option>
                        <option value="YEAR">{t('year')}</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">{t('cycle')}</label>
                     <input 
                        type="text" 
                        className="w-full border rounded-lg px-3 py-2"
                        value={reviewForm.cycle}
                        onChange={e => setReviewForm({...reviewForm, cycle: e.target.value})}
                        placeholder="e.g. 2023-11"
                     />
                  </div>
               </div>

               {/* 3P Scoring Inputs */}
               <div className="space-y-4 border-t pt-4">
                   <p className="text-xs font-bold text-slate-500 uppercase">{t('kpiTitle')} ({t('weights')})</p>
                   
                   <div>
                       <div className="flex justify-between mb-1">
                          <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                              {t('p1')}
                              {taskCompletionRate !== null && <Activity size={12} className="text-indigo-500" />}
                          </label>
                          <span className="text-xs text-slate-500 font-mono">{t('weight')}: {config?.kpiWeights.p1}%</span>
                       </div>
                       {taskCompletionRate !== null && (
                           <div className="text-xs text-indigo-600 bg-indigo-50 p-1 rounded mb-1 flex items-center gap-1">
                               <CheckSquare size={12} />
                               Auto-calculated from daily task completion ({taskCompletionRate}%)
                           </div>
                       )}
                       <input 
                          type="range" min="0" max="100" className="w-full"
                          value={reviewForm.scoreP1}
                          onChange={e => setReviewForm({...reviewForm, scoreP1: Number(e.target.value)})}
                       />
                       <div className="text-right font-bold text-slate-700">{reviewForm.scoreP1}</div>
                   </div>

                   <div>
                       <div className="flex justify-between mb-1">
                          <label className="text-sm font-medium text-slate-700">{t('p2')}</label>
                          <span className="text-xs text-slate-500 font-mono">{t('weight')}: {config?.kpiWeights.p2}%</span>
                       </div>
                       <input 
                          type="range" min="0" max="100" className="w-full"
                          value={reviewForm.scoreP2}
                          onChange={e => setReviewForm({...reviewForm, scoreP2: Number(e.target.value)})}
                       />
                       <div className="text-right font-bold text-slate-700">{reviewForm.scoreP2}</div>
                   </div>

                   <div className={deptCriteria.length > 0 ? "opacity-75 pointer-events-none" : ""}>
                       <div className="flex justify-between mb-1">
                          <label className="text-sm font-medium text-slate-700">{t('p3')}</label>
                          {deptCriteria.length > 0 && <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-1 rounded">{t('autoCalcP3')}</span>}
                          <span className="text-xs text-slate-500 font-mono">{t('weight')}: {config?.kpiWeights.p3}%</span>
                       </div>
                       <input 
                          type="range" min="0" max="100" className="w-full"
                          value={reviewForm.scoreP3}
                          onChange={e => setReviewForm({...reviewForm, scoreP3: Number(e.target.value)})}
                       />
                       <div className="text-right font-bold text-slate-700">{reviewForm.scoreP3}</div>
                   </div>
               </div>

               {/* Detailed Dept Criteria Section (For P3) */}
               {deptCriteria.length > 0 && (
                   <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
                       <h4 className="text-xs font-bold text-indigo-700 uppercase flex justify-between items-center">
                           {t('departmentCriteriaSetup')}
                           <span className="text-[10px] font-normal text-slate-500">Updates P3</span>
                       </h4>
                       {deptCriteria.map(crit => (
                           <div key={crit.id}>
                               <div className="flex justify-between mb-1">
                                  <label className="text-sm font-medium text-slate-700">{crit.name}</label>
                                  <span className="text-xs text-slate-500 font-mono">{t('weight')}: {crit.weight}%</span>
                                </div>
                               <div className="flex items-center gap-2">
                                  <input 
                                    type="range" min="0" max="100" className="flex-1"
                                    value={criteriaScores[crit.id] || 0}
                                    onChange={e => setCriteriaScores(prev => ({ ...prev, [crit.id]: Number(e.target.value) }))}
                                  />
                                  <span className="w-8 text-right font-bold text-sm text-indigo-600">{criteriaScores[crit.id] || 0}</span>
                                </div>
                           </div>
                       ))}
                   </div>
               )}

               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('kpiNotes')}</label>
                  <textarea 
                     className="w-full border rounded-lg px-3 py-2"
                     rows={3}
                     value={reviewForm.notes}
                     onChange={e => setReviewForm({...reviewForm, notes: e.target.value})}
                  />
               </div>

               <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowReviewModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50">
                  {t('cancel')}
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  {user?.role === Role.EMPLOYEE ? t('submitAssessment') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ... Cross Check Modal ... */}
      {showCrossCheckModal && crossCheckReview && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                          <UserCheck size={20} />
                          {t('crossCheckTitle')}
                      </h3>
                      <button onClick={() => setShowCrossCheckModal(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-6 space-y-6">
                      <div className="flex justify-between items-center bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                          <div>
                              <p className="text-sm font-bold text-indigo-900">{crossCheckReview.employeeName}</p>
                              <p className="text-xs text-indigo-600">{crossCheckReview.cycle} • Self-Assessment</p>
                          </div>
                      </div>

                      {/* Comparison Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Self Scores (Read Only) */}
                          <div className="space-y-4">
                              <h4 className="font-bold text-sm text-slate-500 uppercase border-b pb-2">{t('selfScore')}</h4>
                              
                              <div className="space-y-4">
                                  <div>
                                      <div className="flex justify-between text-sm mb-1">
                                          <span className="text-slate-600">{t('p1')}</span>
                                          <span className="font-bold">{crossCheckReview.selfAssessment?.scoreP1}</span>
                                      </div>
                                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                          <div className="h-full bg-slate-400" style={{width: `${crossCheckReview.selfAssessment?.scoreP1}%`}}></div>
                                      </div>
                                  </div>
                                  <div>
                                      <div className="flex justify-between text-sm mb-1">
                                          <span className="text-slate-600">{t('p2')}</span>
                                          <span className="font-bold">{crossCheckReview.selfAssessment?.scoreP2}</span>
                                      </div>
                                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                          <div className="h-full bg-slate-400" style={{width: `${crossCheckReview.selfAssessment?.scoreP2}%`}}></div>
                                      </div>
                                  </div>
                                  <div>
                                      <div className="flex justify-between text-sm mb-1">
                                          <span className="text-slate-600">{t('p3')}</span>
                                          <span className="font-bold">{crossCheckReview.selfAssessment?.scoreP3}</span>
                                      </div>
                                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                          <div className="h-full bg-slate-400" style={{width: `${crossCheckReview.selfAssessment?.scoreP3}%`}}></div>
                                      </div>
                                  </div>
                              </div>
                              
                              <div className="bg-slate-50 p-3 rounded border text-sm text-slate-600 italic">
                                  "{crossCheckReview.selfAssessment?.notes || 'No notes'}"
                              </div>
                          </div>

                          {/* Manager Scores (Editable) */}
                          <div className="space-y-4">
                              <h4 className="font-bold text-sm text-indigo-600 uppercase border-b pb-2">{t('finalScore')}</h4>
                              
                              <div className="space-y-3">
                                  <div>
                                      <label className="block text-xs font-medium text-slate-700 mb-1">{t('p1')}</label>
                                      <input 
                                          type="number" className="w-full border rounded px-2 py-1 text-sm font-bold text-indigo-700"
                                          value={crossCheckForm.scoreP1}
                                          onChange={e => setCrossCheckForm({...crossCheckForm, scoreP1: Number(e.target.value)})}
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-medium text-slate-700 mb-1">{t('p2')}</label>
                                      <input 
                                          type="number" className="w-full border rounded px-2 py-1 text-sm font-bold text-indigo-700"
                                          value={crossCheckForm.scoreP2}
                                          onChange={e => setCrossCheckForm({...crossCheckForm, scoreP2: Number(e.target.value)})}
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-medium text-slate-700 mb-1">{t('p3')}</label>
                                      <input 
                                          type="number" className="w-full border rounded px-2 py-1 text-sm font-bold text-indigo-700"
                                          value={crossCheckForm.scoreP3}
                                          onChange={e => setCrossCheckForm({...crossCheckForm, scoreP3: Number(e.target.value)})}
                                      />
                                  </div>
                              </div>

                              <div className="pt-2">
                                  <label className="block text-xs font-medium text-slate-700 mb-1">Manager Notes</label>
                                  <textarea 
                                      className="w-full border rounded px-2 py-1 text-sm"
                                      rows={2}
                                      value={crossCheckForm.notes}
                                      onChange={e => setCrossCheckForm({...crossCheckForm, notes: e.target.value})}
                                  />
                              </div>
                          </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t">
                          <button onClick={() => setShowCrossCheckModal(false)} className="px-4 py-2 border rounded hover:bg-slate-50">{t('cancel')}</button>
                          <button 
                              onClick={handleSubmitCrossCheck}
                              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 shadow-sm font-bold flex items-center gap-2"
                          >
                              <CheckSquare size={16} />
                              {t('submitFinal')}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
