
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { useLanguage, useAuth } from '../contexts/AppContext';
import { api } from '../services/mockService';
import { JobDescription, JDTask, Employee } from '../types';
import { FileBadge, Edit, Plus, Briefcase, CheckCircle, Star, Save, CheckSquare, Trash2, RefreshCw, Layers, DollarSign } from 'lucide-react';

export default function JobDescriptionsPage() {
  const { t } = useLanguage();
  const { user, hasPermission } = useAuth();
  
  const [jds, setJDs] = useState<JobDescription[]>([]);
  const [selectedJD, setSelectedJD] = useState<JobDescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [myEmployee, setMyEmployee] = useState<Employee | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    departmentName: '',
    position: '',
    baseSalaryRange: '',
    description: '',
    responsibilities: '',
    requirements: '',
    benefits: '',
    tasks: [] as JDTask[]
  });

  // Task Registry State
  // Holds ALL registered tasks across ALL departments/JDs
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [totalSalaryModifier, setTotalSalaryModifier] = useState(0);

  const isEditing = !!selectedJD && showModal;
  const isAdmin = hasPermission('MANAGE_JDS');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getJDs();
      setJDs(data);
      if (data.length > 0 && !selectedJD) {
        setSelectedJD(data[0]);
      }
      
      // If logged in, check if employee data exists for registration
      if (user) {
          const emp = await api.getEmployeeByUserId(user.id);
          setMyEmployee(emp || null);
          // Initialize selectedTaskIds with what's in the DB
          if (emp && emp.registeredTaskIds) {
              setSelectedTaskIds(emp.registeredTaskIds);
          }
      }
    } finally {
      setLoading(false);
    }
  };

  // Recalculate TOTAL salary modifier across ALL selected tasks (cross-dept)
  useEffect(() => {
      let total = 0;
      // Iterate through all JDs to find weights of selected tasks
      jds.forEach(jd => {
          if (jd.tasks) {
              jd.tasks.forEach(task => {
                  if (selectedTaskIds.includes(task.id)) {
                      total += task.salaryWeight;
                  }
              });
          }
      });
      setTotalSalaryModifier(total);
  }, [selectedTaskIds, jds]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createJD(formData);
      setShowModal(false);
      resetForm();
      loadData();
    } catch (e) {
      alert('Error creating JD');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJD) return;
    try {
      const updated = await api.updateJD(selectedJD.id, formData);
      setSelectedJD(updated);
      setShowModal(false);
      resetForm();
      loadData();
    } catch (e) {
      alert('Error updating JD');
    }
  };

  const handleRegisterTasks = async () => {
      if (!myEmployee) return;
      try {
          await api.registerEmployeeTasks(myEmployee.id, selectedTaskIds);
          alert('Task registration saved successfully!');
          // No need to reload data fully, local state is valid
      } catch (e) {
          alert('Failed to register tasks');
      }
  };

  const openCreate = () => {
    setSelectedJD(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (jd: JobDescription) => {
    setSelectedJD(jd);
    setFormData({
      departmentName: jd.departmentName,
      position: jd.position,
      baseSalaryRange: jd.baseSalaryRange || '',
      description: jd.description,
      responsibilities: jd.responsibilities,
      requirements: jd.requirements,
      benefits: jd.benefits,
      tasks: jd.tasks || []
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      departmentName: '',
      position: '',
      baseSalaryRange: '',
      description: '',
      responsibilities: '',
      requirements: '',
      benefits: '',
      tasks: []
    });
  };

  // Task Helper for Edit Modal
  const addTaskToForm = () => {
      setFormData(prev => ({
          ...prev,
          tasks: [...prev.tasks, { id: `new-${Date.now()}`, content: '', frequency: 'DAILY', salaryWeight: 1.0 }]
      }));
  };

  const updateTaskInForm = (idx: number, field: keyof JDTask, value: any) => {
      const newTasks = [...formData.tasks];
      (newTasks[idx] as any)[field] = value;
      setFormData({ ...formData, tasks: newTasks });
  };

  const removeTaskFromForm = (idx: number) => {
      const newTasks = [...formData.tasks];
      newTasks.splice(idx, 1);
      setFormData({ ...formData, tasks: newTasks });
  };

  const toggleTaskSelection = (taskId: string) => {
      if (selectedTaskIds.includes(taskId)) {
          setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
      } else {
          setSelectedTaskIds(prev => [...prev, taskId]);
      }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileBadge className="text-indigo-600" />
            {t('jdTitle')}
          </h1>
          <p className="text-slate-500">{t('jdSubtitle')}</p>
        </div>
        {isAdmin && (
          <button 
            onClick={openCreate}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-sm"
          >
            <Plus size={18} />
            {t('addJD')}
          </button>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
        {/* Sidebar List */}
        <Card className="lg:col-span-1 flex flex-col h-full overflow-hidden border-r">
          <div className="p-4 bg-slate-50 border-b border-slate-100">
            <h3 className="font-bold text-slate-700 text-sm uppercase">{t('selectPosition')}</h3>
          </div>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-slate-500">{t('loading')}</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {jds.map(jd => (
                  <div 
                    key={jd.id}
                    onClick={() => setSelectedJD(jd)}
                    className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${selectedJD?.id === jd.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'border-l-4 border-transparent'}`}
                  >
                    <h4 className={`font-semibold text-sm ${selectedJD?.id === jd.id ? 'text-indigo-800' : 'text-slate-700'}`}>
                      {jd.position}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">{jd.departmentName}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details View */}
        <Card className="lg:col-span-3 flex flex-col h-full overflow-hidden">
          {selectedJD ? (
            <>
              <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-white">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-1">{selectedJD.position}</h2>
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-medium">
                    {selectedJD.departmentName}
                  </span>
                </div>
                {isAdmin && (
                  <button onClick={() => openEdit(selectedJD)} className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg">
                    <Edit size={20} />
                  </button>
                )}
              </div>
              
              <CardContent className="p-6 overflow-y-auto flex-1 space-y-8 bg-white">
                {/* Base Salary Range Badge */}
                {selectedJD.baseSalaryRange && (
                    <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-lg flex items-center gap-3">
                        <div className="p-2 bg-white rounded-full text-emerald-600 shadow-sm">
                            <DollarSign size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase text-emerald-600 mb-0.5">{t('baseSalaryRange')}</p>
                            <p className="text-lg font-bold">{selectedJD.baseSalaryRange} VND</p>
                        </div>
                    </div>
                )}

                {/* Task Registry Section */}
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                            <CheckSquare className="text-indigo-600" size={20} />
                            {t('taskRegistry')}
                        </h3>
                        <div className="text-right">
                            <p className="text-xs text-indigo-600 font-semibold uppercase">{t('salaryImpact')} (Total)</p>
                            <p className="text-2xl font-bold text-indigo-800">+{totalSalaryModifier.toFixed(1)}%</p>
                        </div>
                    </div>
                    
                    <p className="text-sm text-slate-500 mb-3 italic">
                        Select the tasks you commit to performing. You can register for tasks across different departments to increase your base salary score.
                    </p>

                    <div className="space-y-2 mb-4">
                        {selectedJD.tasks && selectedJD.tasks.length > 0 ? (
                            selectedJD.tasks.map(task => (
                                <label key={task.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-indigo-100 hover:shadow-md cursor-pointer transition-all">
                                    <input 
                                        type="checkbox" 
                                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                        checked={selectedTaskIds.includes(task.id)}
                                        onChange={() => toggleTaskSelection(task.id)}
                                    />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-slate-800">{task.content}</p>
                                        <p className="text-xs text-slate-500">{task.frequency}</p>
                                    </div>
                                    <div className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold">
                                        +{task.salaryWeight}%
                                    </div>
                                </label>
                            ))
                        ) : (
                            <p className="text-sm text-slate-500 italic">No checklist tasks defined for this position.</p>
                        )}
                    </div>

                    <div className="flex justify-end">
                        <button 
                            onClick={handleRegisterTasks}
                            disabled={!myEmployee}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            <Save size={16} />
                            {t('saveRegistration')}
                        </button>
                    </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                    <Briefcase size={16} /> {t('jdDescription')}
                  </h3>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line">{selectedJD.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-800 uppercase mb-3 flex items-center gap-2">
                      <CheckCircle size={16} /> {t('responsibilities')}
                    </h3>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line text-sm">{selectedJD.responsibilities}</p>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-800 uppercase mb-3 flex items-center gap-2">
                      <Star size={16} /> {t('requirements')}
                    </h3>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line text-sm">{selectedJD.requirements}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">{t('benefits')}</h3>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line">{selectedJD.benefits}</p>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              Select a position to view details
            </div>
          )}
        </Card>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">{selectedJD ? t('edit') : t('addJD')}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <form onSubmit={selectedJD ? handleUpdate : handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('position')}</label>
                  <input type="text" required className="w-full border px-3 py-2 rounded" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('department')}</label>
                  <input type="text" required className="w-full border px-3 py-2 rounded" value={formData.departmentName} onChange={e => setFormData({...formData, departmentName: e.target.value})} />
                </div>
              </div>

              <div>
                  <label className="block text-sm font-medium mb-1 text-emerald-700">{t('baseSalaryRange')}</label>
                  <input 
                    type="text" 
                    className="w-full border border-emerald-200 px-3 py-2 rounded focus:ring-emerald-500" 
                    placeholder="e.g. 8.000.000 - 12.000.000"
                    value={formData.baseSalaryRange} 
                    onChange={e => setFormData({...formData, baseSalaryRange: e.target.value})} 
                  />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">{t('jdDescription')}</label>
                <textarea required rows={3} className="w-full border px-3 py-2 rounded" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              {/* Task Editor */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium">{t('taskRegistry')}</label>
                      <button type="button" onClick={addTaskToForm} className="text-xs text-indigo-600 font-bold flex items-center gap-1">
                          <Plus size={12} /> Add Task
                      </button>
                  </div>
                  <div className="space-y-2">
                      {formData.tasks.map((task, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                              <input 
                                type="text" className="flex-1 border rounded px-2 py-1 text-sm" placeholder="Task content"
                                value={task.content} onChange={e => updateTaskInForm(idx, 'content', e.target.value)}
                              />
                              <select 
                                className="border rounded px-2 py-1 text-sm w-24"
                                value={task.frequency} onChange={e => updateTaskInForm(idx, 'frequency', e.target.value)}
                              >
                                  <option value="DAILY">Daily</option>
                                  <option value="WEEKLY">Weekly</option>
                                  <option value="MONTHLY">Monthly</option>
                              </select>
                              <div className="flex items-center gap-1">
                                  <input 
                                    type="number" step="0.5" className="w-16 border rounded px-2 py-1 text-sm text-right"
                                    value={task.salaryWeight} onChange={e => updateTaskInForm(idx, 'salaryWeight', Number(e.target.value))}
                                  />
                                  <span className="text-xs text-slate-500">%</span>
                              </div>
                              <button type="button" onClick={() => removeTaskFromForm(idx)} className="text-red-500 p-1"><Trash2 size={16}/></button>
                          </div>
                      ))}
                  </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('responsibilities')}</label>
                <textarea required rows={3} className="w-full border px-3 py-2 rounded font-mono text-sm" value={formData.responsibilities} onChange={e => setFormData({...formData, responsibilities: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('requirements')}</label>
                <textarea required rows={3} className="w-full border px-3 py-2 rounded font-mono text-sm" value={formData.requirements} onChange={e => setFormData({...formData, requirements: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('benefits')}</label>
                <textarea rows={3} className="w-full border px-3 py-2 rounded" value={formData.benefits} onChange={e => setFormData({...formData, benefits: e.target.value})} />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border py-2 rounded hover:bg-slate-50">{t('cancel')}</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">{t('save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
