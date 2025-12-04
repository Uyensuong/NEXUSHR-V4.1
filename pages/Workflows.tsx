
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { useLanguage, useAuth } from '../contexts/AppContext';
import { api } from '../services/mockService';
import { Workflow, WorkflowStep, RoleTitle, Role } from '../types';
import { GitPullRequest, Search, Clock, ShieldCheck, ArrowRight, BookOpen, ExternalLink, ChevronRight, Layers, Plus, Edit, Trash2, X, PlusCircle, Save } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function WorkflowsPage() {
  const { t } = useLanguage();
  const { user, hasPermission } = useAuth();
  
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [filterDept, setFilterDept] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [formData, setFormData] = useState({
      title: '',
      department: '',
      description: '',
      steps: [] as WorkflowStep[]
  });

  // Get unique departments for filter
  const departments = Array.from(new Set(workflows.map(w => w.department)));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
        setLoading(true);
        const data = await api.getWorkflows();
        setWorkflows(data);
        if (data.length > 0 && !selectedWorkflow) {
            setSelectedWorkflow(data[0]);
        }
        setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          await api.createWorkflow(formData);
          setShowModal(false);
          resetForm();
          loadData();
      } catch (e) {
          alert('Error creating workflow');
      }
  };

  const handleUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingWorkflow) return;
      try {
          await api.updateWorkflow(editingWorkflow.id, formData);
          setShowModal(false);
          setEditingWorkflow(null);
          resetForm();
          loadData();
          // Update selected if needed
          if (selectedWorkflow?.id === editingWorkflow.id) {
              setSelectedWorkflow({ ...editingWorkflow, ...formData, lastUpdated: new Date().toISOString() });
          }
      } catch (e) {
          alert('Error updating workflow');
      }
  };

  const handleDelete = async () => {
      if (!selectedWorkflow || !confirm(t('confirmDelete'))) return;
      try {
          await api.deleteWorkflow(selectedWorkflow.id);
          setSelectedWorkflow(null);
          loadData();
      } catch (e) {
          alert('Error deleting workflow');
      }
  };

  const openCreate = () => {
      setEditingWorkflow(null);
      resetForm();
      setShowModal(true);
  };

  const openEdit = (wf: Workflow) => {
      setEditingWorkflow(wf);
      setFormData({
          title: wf.title,
          department: wf.department,
          description: wf.description,
          steps: wf.steps || []
      });
      setShowModal(true);
  };

  const resetForm = () => {
      setFormData({
          title: '',
          department: '',
          description: '',
          steps: []
      });
  };

  // Step Helpers
  const addStep = () => {
      setFormData(prev => ({
          ...prev,
          steps: [...prev.steps, { 
              id: `s${Date.now()}`, 
              order: prev.steps.length + 1, 
              name: '', 
              description: '', 
              roleResponsible: 'STAFF', 
              estimatedTime: '', 
              approvalRequired: false 
          }]
      }));
  };

  const updateStep = (idx: number, field: keyof WorkflowStep, value: any) => {
      const newSteps = [...formData.steps];
      (newSteps[idx] as any)[field] = value;
      setFormData({ ...formData, steps: newSteps });
  };

  const removeStep = (idx: number) => {
      const newSteps = formData.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 }));
      setFormData({ ...formData, steps: newSteps });
  };

  const filteredWorkflows = workflows.filter(w => 
      filterDept ? w.department === filterDept : true
  );

  const canEdit = user?.role === Role.ADMIN || user?.role === Role.MANAGER;

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <GitPullRequest className="text-indigo-600" />
            {t('workflowTitle')}
          </h1>
          <p className="text-slate-500">{t('workflowSubtitle')}</p>
        </div>
        {canEdit && (
            <button 
                onClick={openCreate}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-sm"
            >
                <Plus size={18} />
                Create SOP
            </button>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
        {/* Sidebar List */}
        <Card className="lg:col-span-1 flex flex-col h-full overflow-hidden border-r">
          <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-3">
            <h3 className="font-bold text-slate-700 text-sm uppercase">{t('selectDeptFilter')}</h3>
            <select 
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                value={filterDept}
                onChange={e => setFilterDept(e.target.value)}
            >
                <option value="">{t('allDepts')}</option>
                {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                ))}
            </select>
          </div>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-slate-500">{t('loading')}</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredWorkflows.map(wf => (
                  <div 
                    key={wf.id}
                    onClick={() => setSelectedWorkflow(wf)}
                    className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${selectedWorkflow?.id === wf.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'border-l-4 border-transparent'}`}
                  >
                    <h4 className={`font-semibold text-sm ${selectedWorkflow?.id === wf.id ? 'text-indigo-800' : 'text-slate-700'}`}>
                      {wf.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Layers size={10} /> {wf.department}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workflow Visualization */}
        <Card className="lg:col-span-3 flex flex-col h-full overflow-hidden bg-slate-50/50">
          {selectedWorkflow ? (
            <>
              <div className="p-6 border-b border-slate-100 bg-white flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-1">{selectedWorkflow.title}</h2>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-600">
                      {selectedWorkflow.department}
                    </span>
                    <span>{t('lastUpdated')}: {format(new Date(selectedWorkflow.lastUpdated), 'MMM do, yyyy')}</span>
                  </div>
                  <p className="mt-3 text-slate-600 text-sm leading-relaxed max-w-2xl">{selectedWorkflow.description}</p>
                </div>
                {canEdit && (
                    <div className="flex gap-2">
                        <button onClick={() => openEdit(selectedWorkflow)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                            <Edit size={20} />
                        </button>
                        <button onClick={handleDelete} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                            <Trash2 size={20} />
                        </button>
                    </div>
                )}
              </div>
              
              <CardContent className="p-8 overflow-y-auto flex-1">
                <div className="max-w-3xl mx-auto relative">
                    {/* Vertical Line */}
                    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200"></div>

                    <div className="space-y-8">
                        {selectedWorkflow.steps.map((step, idx) => (
                            <div key={step.id} className="relative pl-20 group">
                                {/* Step Number Bubble */}
                                <div className={`absolute left-4 top-0 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-4 border-slate-50 z-10 
                                    ${idx === 0 ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white shadow-lg'}
                                `}>
                                    {step.order}
                                </div>

                                {/* Content Card */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow relative">
                                    {/* Connector Arrow */}
                                    <div className="absolute left-[-13px] top-4 w-3 h-3 bg-white border-l border-b border-slate-200 transform rotate-45"></div>

                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-lg text-slate-800">{step.name}</h3>
                                        <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded uppercase tracking-wider">
                                            {step.roleResponsible === 'ALL' ? 'Anyone' : step.roleResponsible}
                                        </span>
                                    </div>
                                    
                                    <p className="text-slate-600 text-sm mb-4">{step.description}</p>

                                    <div className="flex flex-wrap gap-2 text-xs">
                                        {step.estimatedTime && (
                                            <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">
                                                <Clock size={12} /> {t('estimatedTime')}: {step.estimatedTime}
                                            </span>
                                        )}
                                        {step.approvalRequired && (
                                            <span className="flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-1 rounded border border-orange-100">
                                                <ShieldCheck size={12} /> {t('approvalGate')}
                                            </span>
                                        )}
                                        {step.linkedModule && (
                                            <Link 
                                                to={step.linkedModule} 
                                                className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100 hover:bg-indigo-100 font-bold ml-auto"
                                            >
                                                {t('jumpToModule')} <ExternalLink size={12} />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {/* End Marker */}
                    <div className="relative pl-20 mt-8">
                        <div className="absolute left-8 top-0 -translate-x-1/2 w-4 h-4 bg-slate-300 rounded-full border-4 border-slate-50"></div>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Process End</p>
                    </div>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              Select a workflow to view details
            </div>
          )}
        </Card>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">{editingWorkflow ? 'Edit Workflow' : 'Create SOP'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={editingWorkflow ? handleUpdate : handleCreate} className="p-6 space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('workflowTitle')}</label>
                      <input 
                        type="text" required
                        className="w-full border rounded-lg px-3 py-2"
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('department')}</label>
                      <input 
                        type="text" required
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="e.g. Sales, HR"
                        value={formData.department}
                        onChange={e => setFormData({...formData, department: e.target.value})}
                      />
                  </div>
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea 
                    className="w-full border rounded-lg px-3 py-2"
                    rows={2}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
               </div>

               {/* Steps Editor */}
               <div className="border-t pt-4">
                   <div className="flex justify-between items-center mb-4">
                       <h4 className="font-bold text-slate-700">Workflow Steps</h4>
                       <button type="button" onClick={addStep} className="text-indigo-600 text-sm font-bold flex items-center gap-1">
                           <PlusCircle size={16} /> Add Step
                       </button>
                   </div>
                   <div className="space-y-4">
                       {formData.steps.map((step, idx) => (
                           <div key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-200 relative">
                               <div className="absolute -left-2 top-4 w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center font-bold text-xs border-2 border-white">
                                   {idx + 1}
                               </div>
                               <button type="button" onClick={() => removeStep(idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-600"><X size={16}/></button>
                               
                               <div className="grid grid-cols-2 gap-3 mb-2 pl-4">
                                   <input 
                                     type="text" placeholder="Step Name" className="border rounded px-2 py-1 text-sm font-medium"
                                     value={step.name} onChange={e => updateStep(idx, 'name', e.target.value)}
                                   />
                                   <select 
                                     className="border rounded px-2 py-1 text-sm bg-white"
                                     value={step.roleResponsible} onChange={e => updateStep(idx, 'roleResponsible', e.target.value)}
                                   >
                                       <option value="STAFF">Staff</option>
                                       <option value="TEAM_LEAD">Team Lead</option>
                                       <option value="HEAD_OF_DEPT">Head of Dept</option>
                                       <option value="ACCOUNTANT">Accountant</option>
                                       <option value="DIRECTOR">Director</option>
                                       <option value="ALL">Anyone</option>
                                   </select>
                               </div>
                               <div className="pl-4">
                                   <textarea 
                                     placeholder="Step Description" className="w-full border rounded px-2 py-1 text-sm mb-2" rows={2}
                                     value={step.description} onChange={e => updateStep(idx, 'description', e.target.value)}
                                   />
                                   <div className="flex gap-4">
                                       <input 
                                         type="text" placeholder="Est. Time (e.g. 2 hours)" className="border rounded px-2 py-1 text-xs w-32"
                                         value={step.estimatedTime} onChange={e => updateStep(idx, 'estimatedTime', e.target.value)}
                                       />
                                       <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                           <input 
                                             type="checkbox" 
                                             checked={step.approvalRequired}
                                             onChange={e => updateStep(idx, 'approvalRequired', e.target.checked)}
                                           />
                                           Requires Approval
                                       </label>
                                   </div>
                               </div>
                           </div>
                       ))}
                   </div>
               </div>

               <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50">
                  {t('cancel')}
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2">
                  <Save size={18} /> {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
