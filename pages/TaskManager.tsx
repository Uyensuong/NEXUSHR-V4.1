
import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { useLanguage, useAuth } from '../contexts/AppContext';
import { api } from '../services/mockService';
import { SmartTask, TaskPriority, DailyTaskAnalysis, Role, Employee } from '../types';
import { CheckSquare, Plus, Clock, AlertTriangle, CheckCircle, X, Zap, BarChart2, ArrowRight, ClipboardList, ShieldCheck, DollarSign, RefreshCw, Workflow, Users, Filter, User } from 'lucide-react';
import { format } from 'date-fns';

export default function TaskManagerPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'MY_TASKS' | 'TEAM_TASKS'>('MY_TASKS');
  
  // My Tasks State
  const [tasks, setTasks] = useState<SmartTask[]>([]);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [suggestedPriority, setSuggestedPriority] = useState<TaskPriority>('MEDIUM');
  const [suggestedTime, setSuggestedTime] = useState<number>(30);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Team Tasks State
  const [teamTasks, setTeamTasks] = useState<SmartTask[]>([]);
  const [teamFilter, setTeamFilter] = useState('');
  const [teamMembers, setTeamMembers] = useState<Employee[]>([]);
  const [selectedMemberUserId, setSelectedMemberUserId] = useState<string>('');

  // End of Day Mode
  const [analysis, setAnalysis] = useState<DailyTaskAnalysis | null>(null);
  const [showEndDayModal, setShowEndDayModal] = useState(false);
  const [currentReviewTask, setCurrentReviewTask] = useState<SmartTask | null>(null);
  const [delayReason, setDelayReason] = useState('');

  // UseEffect for initial load
  useEffect(() => {
    if (activeTab === 'MY_TASKS') loadTasks();
    else loadTeamTasks();
  }, [activeTab]);

  // Smart Input Analysis
  useEffect(() => {
      const analyze = async () => {
          if (newTaskInput.length > 3 && !isAnalyzing) {
              const suggestion = await api.generateTaskSuggestions(newTaskInput);
              setSuggestedPriority(suggestion.priority);
              setSuggestedTime(suggestion.minutes);
          }
      };
      const debounce = setTimeout(analyze, 800);
      return () => clearTimeout(debounce);
  }, [newTaskInput]);

  const loadTasks = async () => {
      if (!user) return;
      setIsSyncing(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      const data = await api.getTasks(user.id, today);
      setTasks(data);
      setIsSyncing(false);
  };

  const loadTeamTasks = async () => {
      if (!user) return;
      setIsSyncing(true);
      try {
          const [data, allEmployees] = await Promise.all([
              api.getTeamTasks(user.id, user.role),
              api.getEmployees()
          ]);
          setTeamTasks(data);

          // Populate Team Members Dropdown
          if (user.role === Role.ADMIN) {
              setTeamMembers(allEmployees);
          } else if (user.role === Role.MANAGER) {
              const me = allEmployees.find(e => e.userId === user.id);
              if (me) {
                  setTeamMembers(allEmployees.filter(e => e.departmentName === me.departmentName));
              }
          }
      } finally {
          setIsSyncing(false);
      }
  };

  const handleAddTask = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !newTaskInput.trim()) return;
      
      setIsAnalyzing(true);
      try {
          await api.createTask({
              userId: user.id,
              title: newTaskInput,
              date: format(new Date(), 'yyyy-MM-dd'),
              priority: suggestedPriority,
              estimatedMinutes: suggestedTime,
              status: 'TODO'
          });
          setNewTaskInput('');
          setSuggestedPriority('MEDIUM');
          setSuggestedTime(30);
          loadTasks();
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleStatusChange = async (id: string, status: SmartTask['status']) => {
      await api.updateTask(id, { status });
      loadTasks();
  };

  const handleDelete = async (id: string) => {
      if (confirm("Delete task?")) {
          await api.deleteTask(id);
          loadTasks();
      }
  };

  const startEndOfDayReview = async () => {
      // Find first non-done task
      const pending = tasks.find(t => t.status === 'TODO' || t.status === 'IN_PROGRESS');
      if (pending) {
          setCurrentReviewTask(pending);
          setDelayReason('');
          setShowEndDayModal(true);
      } else {
          // All done, generate report
          await generateReport();
      }
  };

  const handleReviewTaskSubmit = async () => {
      if (!currentReviewTask) return;
      
      // If marking as postponed, save reason
      if (delayReason.trim()) {
          await api.updateTask(currentReviewTask.id, { status: 'POSTPONED', reasonForDelay: delayReason });
      } else {
          // Assuming user completed it now or just marked done
          await api.updateTask(currentReviewTask.id, { status: 'DONE' });
      }

      // Move to next
      const updatedTasks = await api.getTasks(user!.id, format(new Date(), 'yyyy-MM-dd'));
      setTasks(updatedTasks); // update local state
      const next = updatedTasks.find(t => t.status === 'TODO' || t.status === 'IN_PROGRESS');
      
      if (next) {
          setCurrentReviewTask(next);
          setDelayReason('');
      } else {
          setShowEndDayModal(false);
          await generateReport();
      }
  };

  const generateReport = async () => {
      if (!user) return;
      const report = await api.analyzeDailyPerformance(user.id, format(new Date(), 'yyyy-MM-dd'));
      setAnalysis(report);
  };

  const getPriorityColor = (p: TaskPriority) => {
      switch(p) {
          case 'HIGH': return 'bg-red-100 text-red-700 border-red-200';
          case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
          case 'LOW': return 'bg-blue-100 text-blue-700 border-blue-200';
      }
  };

  const getStatusIcon = (s: SmartTask['status']) => {
      switch(s) {
          case 'DONE': return <CheckCircle className="text-green-500" size={20} />;
          case 'POSTPONED': return <AlertTriangle className="text-orange-500" size={20} />;
          default: return <div className="w-5 h-5 border-2 border-slate-300 rounded-full"></div>;
      }
  };

  // Separate tasks
  const jdTasks = tasks.filter(t => t.jdTaskId);
  const otherTasks = tasks.filter(t => !t.jdTaskId);
  
  const jdCompletion = jdTasks.length > 0 
      ? Math.round((jdTasks.filter(t => t.status === 'DONE').length / jdTasks.length) * 100) 
      : 0;

  const canViewTeam = user?.role === Role.ADMIN || user?.role === Role.MANAGER;

  // Filter Team Tasks
  const filteredTeamTasks = teamTasks.filter(t => {
      const matchesFilter = t.title.toLowerCase().includes(teamFilter.toLowerCase());
      const matchesMember = selectedMemberUserId ? t.userId === selectedMemberUserId : true;
      return matchesFilter && matchesMember;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CheckSquare className="text-indigo-600" />
            {t('taskManagerTitle')}
          </h1>
          <div className="flex items-center gap-2 mt-1">
              <p className="text-slate-500">{t('taskManagerSubtitle')}</p>
              {isSyncing && (
                  <span className="flex items-center gap-1 text-xs text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full animate-pulse">
                      <RefreshCw size={10} className="animate-spin" />
                      Syncing workflow...
                  </span>
              )}
          </div>
        </div>
        
        {/* Tabs */}
        {canViewTeam && (
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTab('MY_TASKS')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'MY_TASKS' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    {t('myTasks')}
                </button>
                <button 
                    onClick={() => setActiveTab('TEAM_TASKS')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'TEAM_TASKS' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    {t('teamTasks')}
                </button>
            </div>
        )}

        {activeTab === 'MY_TASKS' && !analysis && tasks.length > 0 && (
            <button 
                onClick={startEndOfDayReview}
                className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 shadow-lg font-medium"
            >
                <Clock size={18} />
                {t('endOfDay')}
            </button>
        )}
      </div>

      {activeTab === 'MY_TASKS' ? (
        <>
            {/* JD Checklist Section - Salary Impacting */}
            {jdTasks.length > 0 && (
                <Card className="border-l-4 border-l-indigo-600 bg-gradient-to-r from-indigo-50 to-white">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-indigo-900 flex items-center gap-2">
                                    <ClipboardList size={20} />
                                    {t('dailyChecklist')}
                                </h3>
                                <p className="text-sm text-indigo-700">{t('checklistDesc')}</p>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm">
                                    <DollarSign size={16} className="text-green-600" />
                                    <span className="text-xs font-bold text-slate-600 uppercase">{t('salaryImpactLabel')}</span>
                                    <span className={`font-bold ${jdCompletion === 100 ? 'text-green-600' : 'text-slate-800'}`}>
                                        {jdCompletion === 100 ? 'MAX P1 SCORE' : `${jdCompletion}% Achieved`}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 rounded-full h-2.5 mb-6">
                            <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${jdCompletion}%` }}></div>
                        </div>

                        <div className="space-y-2">
                            {jdTasks.map(task => (
                                <div 
                                    key={task.id} 
                                    className={`flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm transition-all cursor-pointer ${task.status === 'DONE' ? 'opacity-75 bg-green-50 border-green-200' : 'hover:border-indigo-300'}`}
                                    onClick={() => handleStatusChange(task.id, task.status === 'DONE' ? 'TODO' : 'DONE')}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded flex items-center justify-center border ${task.status === 'DONE' ? 'bg-green-600 border-green-600' : 'border-slate-300'}`}>
                                            {task.status === 'DONE' && <CheckCircle size={14} className="text-white" />}
                                        </div>
                                        <span className={`text-sm font-medium ${task.status === 'DONE' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                            {task.title}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded flex items-center gap-1 border border-indigo-100">
                                            <Workflow size={10} /> Auto-Generated
                                        </span>
                                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold uppercase">JD Linked</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Smart Input */}
            <Card className="shadow-sm">
                <CardContent className="p-6">
                    <form onSubmit={handleAddTask}>
                        <div className="flex gap-4 items-start">
                            <div className="flex-1">
                                <input 
                                    type="text" 
                                    className="w-full text-lg font-medium placeholder:text-slate-300 border-b-2 border-slate-100 focus:border-indigo-500 outline-none py-2 transition-colors"
                                    placeholder={t('newTaskPlaceHolder')}
                                    value={newTaskInput}
                                    onChange={e => setNewTaskInput(e.target.value)}
                                />
                                {newTaskInput && (
                                    <div className="flex gap-4 mt-3 text-sm text-slate-500 animate-in fade-in slide-in-from-top-2">
                                        <span className="flex items-center gap-1">
                                            <Zap size={14} className="text-yellow-500" /> 
                                            {t('aiAutoSuggest')}:
                                        </span>
                                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 font-medium ${getPriorityColor(suggestedPriority)}`}>
                                            {t(suggestedPriority === 'HIGH' ? 'highPriority' : suggestedPriority === 'MEDIUM' ? 'mediumPriority' : 'lowPriority')}
                                        </span>
                                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100">
                                            <Clock size={14} /> {suggestedTime} min
                                        </span>
                                    </div>
                                )}
                            </div>
                            <button 
                                type="submit" 
                                disabled={!newTaskInput.trim()}
                                className="bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
                            >
                                <Plus size={24} />
                            </button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Analysis Report */}
            {analysis && (
                <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-xl">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <BarChart2 /> {t('dailyAnalysis')}
                                </h3>
                                <p className="opacity-90 mt-1 text-indigo-100">{t('tasksFor')} {format(new Date(analysis.date), 'MMM do, yyyy')}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-4xl font-bold">{analysis.efficiencyScore}</div>
                                <div className="text-xs uppercase tracking-wider opacity-75">{t('efficiencyScore')}</div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 my-6 bg-white/10 p-4 rounded-lg backdrop-blur-sm">
                            <div className="text-center border-r border-white/20">
                                <div className="text-2xl font-bold">{analysis.completionRate}%</div>
                                <div className="text-xs opacity-75">{t('completionRate')}</div>
                            </div>
                            <div className="text-center border-r border-white/20">
                                <div className="text-2xl font-bold">{analysis.completedTasks}/{analysis.totalTasks}</div>
                                <div className="text-xs opacity-75">Tasks Done</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold">{analysis.totalTimeScheduled}m</div>
                                <div className="text-xs opacity-75">{t('totalScheduled')}</div>
                            </div>
                        </div>

                        <div className="bg-white/20 p-4 rounded-lg text-sm leading-relaxed italic">
                            "{analysis.feedback}"
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Other Task List */}
            <div className="space-y-4">
                <h4 className="font-bold text-slate-500 uppercase text-sm border-b pb-2">{t('otherTasks')}</h4>
                {['HIGH', 'MEDIUM', 'LOW'].map(priority => {
                    const pTasks = otherTasks.filter(t => t.priority === priority);
                    if (pTasks.length === 0) return null;

                    return (
                        <div key={priority} className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-400 uppercase ml-1">
                                {t(priority === 'HIGH' ? 'highPriority' : priority === 'MEDIUM' ? 'mediumPriority' : 'lowPriority')}
                            </h4>
                            {pTasks.map(task => (
                                <div 
                                    key={task.id} 
                                    className={`group flex items-center justify-between p-4 bg-white border rounded-xl shadow-sm transition-all ${task.status === 'DONE' ? 'opacity-50 bg-slate-50' : 'hover:shadow-md hover:border-indigo-200'}`}
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        <button onClick={() => handleStatusChange(task.id, task.status === 'DONE' ? 'TODO' : 'DONE')}>
                                            {getStatusIcon(task.status)}
                                        </button>
                                        <div>
                                            <p className={`font-medium text-slate-800 ${task.status === 'DONE' ? 'line-through text-slate-500' : ''}`}>{task.title}</p>
                                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                                <span className="flex items-center gap-1"><Clock size={12} /> {task.estimatedMinutes} min</span>
                                                {task.status === 'POSTPONED' && (
                                                    <span className="text-orange-500 flex items-center gap-1">
                                                        <ArrowRight size={12} /> {task.reasonForDelay}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDelete(task.id)}
                                        className="text-slate-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    );
                })}
                
                {otherTasks.length === 0 && (
                    <div className="text-center py-12 text-slate-400 italic">
                        No additional tasks.
                    </div>
                )}
            </div>
        </>
      ) : (
        /* Team Tasks View */
        <Card>
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2"><Users size={20} /> Team Overview</h3>
                <div className="flex flex-1 w-full md:w-auto gap-4">
                    {/* Employee Filter */}
                    <div className="relative flex-1">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <select 
                            className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                            value={selectedMemberUserId}
                            onChange={e => setSelectedMemberUserId(e.target.value)}
                        >
                            <option value="">{t('allMembers')}</option>
                            {teamMembers.map(m => (
                                <option key={m.id} value={m.userId}>{m.fullName}</option>
                            ))}
                        </select>
                    </div>

                    {/* Text Filter */}
                    <div className="relative flex-1">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                            type="text" 
                            placeholder={t('search')} 
                            className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={teamFilter}
                            onChange={e => setTeamFilter(e.target.value)}
                        />
                    </div>
                </div>
            </div>
            <CardContent>
                {filteredTeamTasks.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">No team tasks found matching criteria.</div>
                ) : (
                    <div className="space-y-3">
                        {filteredTeamTasks.map(task => {
                            // Find user name if possible
                            const owner = teamMembers.find(m => m.userId === task.userId);
                            return (
                                <div key={task.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <User size={10} />
                                                {owner ? owner.fullName : task.userId}
                                            </span>
                                            <span className="text-xs text-slate-500">{task.date}</span>
                                        </div>
                                        <p className="font-medium text-slate-800">{task.title}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs px-2 py-1 rounded font-bold ${
                                            task.status === 'DONE' ? 'bg-green-100 text-green-700' :
                                            task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                            task.status === 'POSTPONED' ? 'bg-orange-100 text-orange-700' :
                                            'bg-slate-100 text-slate-600'
                                        }`}>
                                            {task.status}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
      )}

      {/* End of Day Modal */}
      {showEndDayModal && currentReviewTask && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center rounded-t-xl">
                      <h3 className="font-bold text-lg text-slate-800">{t('endOfDay')}</h3>
                      <button onClick={() => setShowEndDayModal(false)}><X size={20} className="text-slate-400" /></button>
                  </div>
                  <div className="p-6 space-y-6">
                      <div>
                          <p className="text-sm text-slate-500 uppercase tracking-wider font-bold mb-2">Pending Task</p>
                          <div className="text-xl font-medium text-slate-800 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                              {currentReviewTask.title}
                          </div>
                      </div>

                      <div className="space-y-3">
                          <p className="text-sm font-medium text-slate-700">{t('whyPostponed')}</p>
                          <textarea 
                              className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                              rows={3}
                              placeholder={t('reasonPlaceholder')}
                              value={delayReason}
                              onChange={e => setDelayReason(e.target.value)}
                          />
                          <p className="text-xs text-slate-400">Leave empty if you completed it just now.</p>
                      </div>

                      <div className="flex gap-3 pt-2">
                          <button 
                            onClick={() => { setDelayReason(''); handleReviewTaskSubmit(); }}
                            className="flex-1 py-3 border border-green-200 bg-green-50 text-green-700 rounded-lg font-bold hover:bg-green-100"
                          >
                              Mark Done
                          </button>
                          <button 
                            onClick={() => { if(!delayReason) setDelayReason('Postponed'); handleReviewTaskSubmit(); }}
                            className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-sm"
                          >
                              Next / Postpone
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
