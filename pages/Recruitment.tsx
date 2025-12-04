
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { useLanguage, useAuth } from '../contexts/AppContext';
import { api } from '../services/mockService';
import { Candidate, CandidateStatus, SalaryConfig, Quiz, QuizResult } from '../types';
import { UserPlus, Search, CheckCircle, XCircle, Edit3, FileText, ClipboardCheck, DollarSign, Play, Clock, Check, X } from 'lucide-react';
import { format } from 'date-fns';

export default function RecruitmentPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [config, setConfig] = useState<SalaryConfig | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHireModal, setShowHireModal] = useState(false);
  
  // Test/Quiz Modal State
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  // Selection
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // Forms
  const [newCandidate, setNewCandidate] = useState({
      fullName: '',
      email: '',
      phone: '',
      positionApplied: '',
      departmentApplied: ''
  });

  const [hireForm, setHireForm] = useState({
      officialSalary: 0,
      probationSalary: 0
  });

  const commonDepts = [
     "Phòng Vé (Ticketing)",
     "Phòng Kinh doanh (Sales)",
     "Phòng Kế toán Vé (BSP)",
     "Phòng Chăm sóc Khách hàng",
     "Phòng Nhân sự",
     "Phòng Kỹ thuật"
  ];

  useEffect(() => {
      loadData();
  }, []);

  const loadData = async () => {
      setLoading(true);
      try {
          const [cands, conf, quizList] = await Promise.all([
              api.getCandidates(),
              api.getSalaryConfig(),
              api.getQuizzes()
          ]);
          setCandidates(cands);
          setConfig(conf);
          setQuizzes(quizList);
      } finally {
          setLoading(false);
      }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          await api.createCandidate(newCandidate);
          setShowAddModal(false);
          setNewCandidate({ fullName: '', email: '', phone: '', positionApplied: '', departmentApplied: '' });
          loadData();
      } catch (e) {
          alert("Error adding candidate");
      }
  };

  // Helper to format currency display
  const formatSalaryDisplay = (val: number) => {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const openHireModal = (c: Candidate) => {
      setSelectedCandidate(c);
      const defaultSalary = 10000000;
      const probationPercent = config?.probationSalaryPercent || 85;
      const probation = Math.round(defaultSalary * (probationPercent / 100));
      
      setHireForm({
          officialSalary: defaultSalary,
          probationSalary: probation
      });
      setShowHireModal(true);
  };

  const handleOfficialSalaryChange = (val: number) => {
      const probationPercent = config?.probationSalaryPercent || 85;
      const probation = Math.round(val * (probationPercent / 100));
      setHireForm({
          officialSalary: val,
          probationSalary: probation
      });
  };

  const handleHire = async () => {
      if (!selectedCandidate) return;
      try {
          await api.promoteCandidateToEmployee(selectedCandidate.id, hireForm.officialSalary, hireForm.probationSalary);
          alert(t('deleteSuccess').replace('Employee deleted', 'Candidate hired'));
          setShowHireModal(false);
          loadData();
      } catch (e) {
          alert("Failed to hire");
      }
  };

  const handleReject = async (id: string) => {
      if (!confirm("Reject this candidate?")) return;
      await api.rejectCandidate(id);
      loadData();
  };

  // --- Quiz Logic ---
  const openQuizModal = (c: Candidate) => {
      setSelectedCandidate(c);
      setActiveQuiz(null);
      setQuizAnswers({});
      setQuizResult(null);
      setShowQuizModal(true);
  };

  const startQuiz = (quiz: Quiz) => {
      setActiveQuiz(quiz);
      setQuizAnswers({});
  };

  const submitQuiz = async () => {
      if (!selectedCandidate || !activeQuiz) return;
      try {
          // Use the candidate ID as the "userId" for the mock service to link it
          const result = await api.submitQuiz(activeQuiz.id, selectedCandidate.id, quizAnswers);
          setQuizResult(result);
          
          // Update candidate status
          await api.updateCandidate(selectedCandidate.id, { 
              quizScore: result.score, 
              quizId: activeQuiz.id,
              status: result.score >= 50 ? 'INTERVIEW' : 'REJECTED' 
          });
          
          loadData(); // Refresh list
      } catch (e) {
          alert("Error submitting quiz");
      }
  };

  const filtered = candidates.filter(c => 
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.positionApplied.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (s: CandidateStatus) => {
      switch(s) {
          case 'APPLIED': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Applied</span>;
          case 'TESTING': return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">Testing</span>;
          case 'INTERVIEW': return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">Interview</span>;
          case 'HIRED': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Hired</span>;
          case 'REJECTED': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">Rejected</span>;
      }
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <UserPlus className="text-indigo-600" />
                    {t('recruitmentTitle')}
                </h1>
                <p className="text-slate-500">{t('recruitmentSubtitle')}</p>
            </div>
            <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-sm font-medium"
            >
                <UserPlus size={18} />
                {t('addCandidate')}
            </button>
        </div>

        <Card>
            <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder={t('search')}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-4">{t('candidateName')}</th>
                            <th className="px-6 py-4">{t('appliedPosition')}</th>
                            <th className="px-6 py-4">{t('status')}</th>
                            <th className="px-6 py-4">{t('quizScore')}</th>
                            <th className="px-6 py-4 text-right">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-slate-900">{c.fullName}</div>
                                    <div className="text-xs text-slate-500">{c.email} • {c.phone}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-slate-700">{c.positionApplied}</div>
                                    <div className="text-xs text-slate-400">{c.departmentApplied}</div>
                                </td>
                                <td className="px-6 py-4">{getStatusBadge(c.status)}</td>
                                <td className="px-6 py-4">
                                    {c.quizScore !== undefined && c.quizScore > 0 ? (
                                        <span className={`font-bold ${c.quizScore >= 50 ? 'text-green-600' : 'text-red-600'}`}>{c.quizScore}</span>
                                    ) : '--'}
                                </td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    {c.status !== 'HIRED' && c.status !== 'REJECTED' && (
                                        <>
                                            <button 
                                                onClick={() => openQuizModal(c)}
                                                className="text-indigo-600 bg-indigo-50 p-2 rounded hover:bg-indigo-100"
                                                title={t('takeQuiz')}
                                            >
                                                <ClipboardCheck size={16} />
                                            </button>
                                            <button 
                                                onClick={() => openHireModal(c)}
                                                className="text-green-600 bg-green-50 p-2 rounded hover:bg-green-100"
                                                title={t('hire')}
                                            >
                                                <CheckCircle size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleReject(c.id)}
                                                className="text-red-600 bg-red-50 p-2 rounded hover:bg-red-100"
                                                title={t('reject')}
                                            >
                                                <XCircle size={16} />
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">{t('noRecords')}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </CardContent>
        </Card>

        {/* Add Modal */}
        {showAddModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                        <h3 className="font-bold text-lg text-slate-800">{t('addCandidate')}</h3>
                    </div>
                    <form onSubmit={handleAddCandidate} className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('fullName')}</label>
                            <input type="text" required className="w-full border rounded px-3 py-2" value={newCandidate.fullName} onChange={e => setNewCandidate({...newCandidate, fullName: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('email')}</label>
                                <input type="email" required className="w-full border rounded px-3 py-2" value={newCandidate.email} onChange={e => setNewCandidate({...newCandidate, email: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('phone')}</label>
                                <input type="text" required className="w-full border rounded px-3 py-2" value={newCandidate.phone} onChange={e => setNewCandidate({...newCandidate, phone: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('department')}</label>
                            <select className="w-full border rounded px-3 py-2 bg-white" value={newCandidate.departmentApplied} onChange={e => setNewCandidate({...newCandidate, departmentApplied: e.target.value})}>
                                <option value="">Select Dept</option>
                                {commonDepts.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('appliedPosition')}</label>
                            <input type="text" required className="w-full border rounded px-3 py-2" value={newCandidate.positionApplied} onChange={e => setNewCandidate({...newCandidate, positionApplied: e.target.value})} />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 border py-2 rounded">{t('cancel')}</button>
                            <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded">{t('save')}</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Hire Modal - Enhanced for Clarity */}
        {showHireModal && selectedCandidate && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl max-w-md w-full shadow-2xl animate-in zoom-in duration-200">
                    <div className="px-6 py-4 border-b border-slate-100 bg-green-50 rounded-t-xl flex items-center gap-2">
                        <CheckCircle className="text-green-700" size={20} />
                        <div>
                            <h3 className="font-bold text-lg text-green-800">{t('hiringCandidate')}</h3>
                            <p className="text-xs text-green-600">Finalize offer details</p>
                        </div>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="bg-slate-50 p-3 rounded border text-sm flex justify-between items-center">
                            <div>
                                <p className="font-bold text-slate-800">{selectedCandidate.fullName}</p>
                                <p className="text-slate-500">{selectedCandidate.positionApplied}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">READY TO HIRE</span>
                            </div>
                        </div>

                        {/* Official Salary Input */}
                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-slate-700">{t('officialSalary')} (Gross)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    className="w-full border-2 border-slate-200 rounded-lg px-3 py-2.5 font-bold text-slate-800 focus:border-indigo-500 focus:ring-0 outline-none"
                                    value={hireForm.officialSalary}
                                    onChange={e => handleOfficialSalaryChange(Number(e.target.value))}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">VND</div>
                            </div>
                            <p className="text-xs text-slate-500">
                                Negotiated monthly salary. {formatSalaryDisplay(hireForm.officialSalary)}
                            </p>
                        </div>

                        {/* Probation Salary Read-only */}
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-bold text-orange-800 flex items-center gap-1">
                                    <Clock size={14} /> {t('probationSalary')}
                                </label>
                                <span className="text-[10px] bg-white px-2 py-1 rounded border border-orange-200 text-orange-600 font-bold uppercase tracking-wider">
                                    {config?.probationSalaryPercent}% Rule
                                </span>
                            </div>
                            <div className="text-xl font-bold text-orange-700">
                                {formatSalaryDisplay(hireForm.probationSalary)}
                            </div>
                            <p className="text-xs text-orange-600/80 italic border-t border-orange-200/50 pt-2 mt-1">
                                This amount will be applied during the probation period (usually 2 months).
                            </p>
                        </div>
                        
                        {/* Insurance Note */}
                        <div className="text-xs text-slate-400 bg-slate-50 p-2 rounded text-center">
                            Insurance salary will be auto-set to Region I Minimum Wage. You can adjust it later in Employee Profile.
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setShowHireModal(false)} className="flex-1 border py-3 rounded-lg hover:bg-slate-50 font-medium text-slate-600">{t('cancel')}</button>
                            <button onClick={handleHire} className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-bold shadow-lg shadow-green-200 transition-transform active:scale-95">
                                {t('confirmHire')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Quiz / Assessment Modal */}
        {showQuizModal && selectedCandidate && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 bg-indigo-50 flex justify-between items-center shrink-0">
                        <div>
                            <h3 className="font-bold text-lg text-indigo-900 flex items-center gap-2">
                                <ClipboardCheck size={20} />
                                {t('assessmentTitle')}
                            </h3>
                            <p className="text-xs text-indigo-700">Candidate: {selectedCandidate.fullName}</p>
                        </div>
                        <button onClick={() => setShowQuizModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {!activeQuiz ? (
                            /* Select Quiz View */
                            <div className="space-y-4">
                                <h4 className="font-medium text-slate-700 mb-2">{t('availableQuizzes')}</h4>
                                {quizzes.length === 0 ? (
                                    <p className="text-slate-500 italic">No quizzes found. Please create one in Assessments module.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {quizzes.map(q => (
                                            <button 
                                                key={q.id}
                                                onClick={() => startQuiz(q)}
                                                className="p-4 border rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-all text-left"
                                            >
                                                <h5 className="font-bold text-slate-800 mb-1">{q.title}</h5>
                                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1"><Clock size={12} /> {q.timeLimitMinutes}m</span>
                                                    <span className="flex items-center gap-1">{q.questions.length} Qs</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : !quizResult ? (
                            /* Taking Quiz View */
                            <div className="space-y-6">
                                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                                    <h4 className="font-bold text-lg">{activeQuiz.title}</h4>
                                    <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                                        {Object.keys(quizAnswers).length} / {activeQuiz.questions.length} Answered
                                    </div>
                                </div>
                                
                                <div className="space-y-6">
                                    {activeQuiz.questions.map((q, qIdx) => (
                                        <div key={q.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                            <p className="font-medium text-slate-800 mb-3">{qIdx + 1}. {q.text}</p>
                                            <div className="space-y-2">
                                                {q.options.map((opt, oIdx) => (
                                                    <label key={oIdx} className="flex items-center gap-3 p-3 bg-white rounded border border-slate-100 cursor-pointer hover:border-indigo-300">
                                                        <input 
                                                            type="radio" 
                                                            name={`q-${q.id}`}
                                                            className="w-4 h-4 text-indigo-600"
                                                            checked={quizAnswers[q.id] === oIdx}
                                                            onChange={() => setQuizAnswers(prev => ({ ...prev, [q.id]: oIdx }))}
                                                        />
                                                        <span className="text-sm text-slate-700">{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* Result View */
                            <div className="text-center py-8">
                                <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                                    {quizResult.score >= 50 ? <CheckCircle size={40} className="text-green-500" /> : <XCircle size={40} className="text-red-500" />}
                                </div>
                                <h2 className="text-3xl font-bold text-slate-800 mb-2">{quizResult.score}%</h2>
                                <p className="text-slate-500 mb-6">Correct: {quizResult.correctAnswers} / {quizResult.totalQuestions}</p>
                                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded inline-block">
                                    Status updated to: <strong>{quizResult.score >= 50 ? 'INTERVIEW' : 'REJECTED'}</strong>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0">
                        {!activeQuiz ? (
                            <button onClick={() => setShowQuizModal(false)} className="px-4 py-2 border rounded hover:bg-slate-50">{t('close')}</button>
                        ) : !quizResult ? (
                            <>
                                <button onClick={() => setActiveQuiz(null)} className="px-4 py-2 border rounded hover:bg-slate-50">{t('cancel')}</button>
                                <button 
                                    onClick={submitQuiz}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow-sm font-bold"
                                >
                                    {t('submitQuiz')}
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setShowQuizModal(false)} className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow-sm font-bold">
                                {t('close')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
