
import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { useLanguage, useAuth } from '../contexts/AppContext';
import { api } from '../services/mockService';
import { Regulation } from '../types';
import { Plus, Edit, Trash2, BookOpen, X, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function RegulationsPage() {
  const { t } = useLanguage();
  const { user, hasPermission } = useAuth();
  
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingReg, setEditingReg] = useState<Regulation | null>(null);
  const [formData, setFormData] = useState({ title: '', category: '', content: '' });

  // View Mode
  const [selectedReg, setSelectedReg] = useState<Regulation | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
        const data = await api.getRegulations();
        setRegulations(data);
        if (data.length > 0 && !selectedReg) {
            setSelectedReg(data[0]);
        }
    } finally {
        setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await api.createRegulation(formData);
        setShowModal(false);
        setFormData({ title: '', category: '', content: '' });
        loadData();
    } catch (e) {
        alert("Failed to create regulation");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReg) return;
    try {
        await api.updateRegulation(editingReg.id, formData);
        setShowModal(false);
        setEditingReg(null);
        setFormData({ title: '', category: '', content: '' });
        loadData();
        // If updating currently viewed, update view
        if (selectedReg?.id === editingReg.id) {
             setSelectedReg({ ...editingReg, ...formData, updatedAt: new Date().toISOString() });
        }
    } catch (e) {
        alert("Failed to update regulation");
    }
  };

  const handleDelete = async (id: string) => {
      if(!confirm("Are you sure?")) return;
      await api.deleteRegulation(id);
      loadData();
      if (selectedReg?.id === id) setSelectedReg(null);
  };

  const openEdit = (reg: Regulation) => {
      setEditingReg(reg);
      setFormData({ title: reg.title, category: reg.category, content: reg.content });
      setShowModal(true);
  };
  
  const openCreate = () => {
      setEditingReg(null);
      setFormData({ title: '', category: '', content: '' });
      setShowModal(true);
  };

  const canManage = hasPermission('MANAGE_REGULATIONS');

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
       <div className="flex justify-between items-center shrink-0">
         <div>
           <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <BookOpen className="text-indigo-600" />
             {t('regulationsTitle')}
           </h1>
           <p className="text-slate-500">{t('regulationsSubtitle')}</p>
         </div>
         {canManage && (
            <button 
                onClick={openCreate}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-sm"
            >
                <Plus size={18} />
                {t('addRegulation')}
            </button>
         )}
       </div>

       <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
           {/* List */}
           <Card className="lg:col-span-1 flex flex-col h-full overflow-hidden">
               <div className="p-4 border-b border-slate-100 bg-slate-50">
                   <h3 className="font-bold text-slate-700">{t('policiesList')}</h3>
               </div>
               <CardContent className="p-0 flex-1 overflow-y-auto">
                   {loading ? (
                       <div className="p-8 text-center text-slate-500">{t('loading')}</div>
                   ) : regulations.length === 0 ? (
                       <div className="p-8 text-center text-slate-500">No regulations found.</div>
                   ) : (
                       <div className="divide-y divide-slate-100">
                           {regulations.map(reg => (
                               <div 
                                 key={reg.id}
                                 onClick={() => setSelectedReg(reg)}
                                 className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors flex justify-between items-center ${selectedReg?.id === reg.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''}`}
                               >
                                   <div>
                                       <h4 className={`font-semibold text-sm ${selectedReg?.id === reg.id ? 'text-indigo-800' : 'text-slate-700'}`}>{reg.title}</h4>
                                       <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                                           {reg.category}
                                       </span>
                                   </div>
                                   <ChevronRight size={16} className="text-slate-300" />
                               </div>
                           ))}
                       </div>
                   )}
               </CardContent>
           </Card>

           {/* Detail View */}
           <Card className="lg:col-span-2 flex flex-col h-full overflow-hidden">
               {selectedReg ? (
                   <>
                       <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                           <div>
                               <h2 className="text-2xl font-bold text-slate-800 mb-1">{selectedReg.title}</h2>
                               <div className="flex items-center gap-3 text-sm text-slate-500">
                                   <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-medium">{selectedReg.category}</span>
                                   <span>{t('lastUpdated')}: {format(new Date(selectedReg.updatedAt), 'MMM do, yyyy')}</span>
                               </div>
                           </div>
                           {canManage && (
                               <div className="flex gap-2">
                                   <button onClick={() => openEdit(selectedReg)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                                       <Edit size={18} />
                                   </button>
                                   <button onClick={() => handleDelete(selectedReg.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                       <Trash2 size={18} />
                                   </button>
                               </div>
                           )}
                       </div>
                       <CardContent className="p-6 flex-1 overflow-y-auto bg-slate-50/30">
                           <div className="prose max-w-none text-slate-700 whitespace-pre-line leading-relaxed">
                               {selectedReg.content}
                           </div>
                       </CardContent>
                   </>
               ) : (
                   <div className="h-full flex items-center justify-center text-slate-400">
                       Select a regulation to view details.
                   </div>
               )}
           </Card>
       </div>

       {/* Modal */}
       {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">{editingReg ? t('editRegulation') : t('addRegulation')}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={editingReg ? handleUpdate : handleCreate} className="p-6 space-y-4">
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('regTitle')}</label>
                  <input 
                     type="text" required
                     className="w-full border rounded-lg px-3 py-2"
                     value={formData.title}
                     onChange={e => setFormData({...formData, title: e.target.value})}
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('regCategory')}</label>
                  <input 
                     type="text" required
                     className="w-full border rounded-lg px-3 py-2"
                     placeholder="e.g. General, Attendance, Benefits"
                     value={formData.category}
                     onChange={e => setFormData({...formData, category: e.target.value})}
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('regContent')}</label>
                  <textarea 
                     required rows={12}
                     className="w-full border rounded-lg px-3 py-2 font-sans"
                     value={formData.content}
                     onChange={e => setFormData({...formData, content: e.target.value})}
                  />
               </div>
               <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50">
                  {t('cancel')}
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
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
