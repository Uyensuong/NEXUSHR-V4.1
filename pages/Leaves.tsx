import React, { useEffect, useState } from 'react';
import { api } from '../services/mockService';
import { Leave, LeaveType, Role } from '../types';
import { Card, CardContent } from '../components/ui/Card';
import { CheckCircle, XCircle, Clock, PlusCircle, X, Check } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage, useAuth } from '../contexts/AppContext';

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const { t } = useLanguage();
  const { user, hasPermission } = useAuth();
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [newLeave, setNewLeave] = useState({
    type: LeaveType.ANNUAL,
    startDate: '',
    endDate: '',
    reason: ''
  });

  useEffect(() => {
    loadLeaves();
  }, []);

  const loadLeaves = () => {
    api.getLeaves().then(setLeaves);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await api.createLeave({
        userId: user.id,
        type: newLeave.type,
        startDate: newLeave.startDate,
        endDate: newLeave.endDate,
        reason: newLeave.reason
      });
      setShowModal(false);
      setNewLeave({ type: LeaveType.ANNUAL, startDate: '', endDate: '', reason: '' });
      loadLeaves();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleStatusUpdate = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.updateLeaveStatus(id, status);
      loadLeaves();
    } catch (error) {
      console.error(error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-700 border-green-200';
      case 'REJECTED': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle size={16} />;
      case 'REJECTED': return <XCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const canManageLeaves = hasPermission('MANAGE_LEAVES');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('leaveRequests')}</h1>
          <p className="text-slate-500">{t('manageTimeOff')}</p>
        </div>
        {/* Allow all logged-in users to create requests */}
        {user && (
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-sm"
          >
            <PlusCircle size={18} />
            {t('newRequest')}
          </button>
        )}
      </div>

      <div className="grid gap-4">
        {leaves.length === 0 ? (
          <div className="text-center py-10 text-slate-500">{t('noRecords')}</div>
        ) : (
          leaves.map(leave => (
            <Card key={leave.id}>
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg
                    ${leave.type === LeaveType.SICK ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}
                  `}>
                    {leave.type.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800">{leave.employeeName}</h3>
                      <span className="text-xs text-slate-400">• {t(`leave_${leave.type}`)}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{leave.reason}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      {format(new Date(leave.startDate), 'MMM do')} - {format(new Date(leave.endDate), 'MMM do, yyyy')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className={`px-4 py-2 rounded-full border flex items-center gap-2 text-sm font-medium ${getStatusColor(leave.status)}`}>
                    {getStatusIcon(leave.status)}
                    {leave.status}
                  </div>
                  
                  {canManageLeaves && leave.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleStatusUpdate(leave.id, 'APPROVED')}
                        className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                        title={t('approve')}
                      >
                        <Check size={18} />
                      </button>
                      <button 
                        onClick={() => handleStatusUpdate(leave.id, 'REJECTED')}
                        className="p-2 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors"
                        title={t('reject')}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h3 className="font-bold text-lg text-slate-800">{t('newRequest')}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('leaveType')}</label>
                <select 
                  className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  value={newLeave.type}
                  onChange={e => setNewLeave({...newLeave, type: e.target.value as LeaveType})}
                >
                  <option value={LeaveType.ANNUAL}>{t('leave_ANNUAL')}</option>
                  <option value={LeaveType.SICK}>{t('leave_SICK')}</option>
                  <option value={LeaveType.UNPAID}>{t('leave_UNPAID')}</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">{t('startDate')}</label>
                   <input 
                      type="date" required
                      className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                      value={newLeave.startDate}
                      onChange={e => setNewLeave({...newLeave, startDate: e.target.value})}
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">{t('endDate')}</label>
                   <input 
                      type="date" required
                      className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                      value={newLeave.endDate}
                      onChange={e => setNewLeave({...newLeave, endDate: e.target.value})}
                   />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('reason')}</label>
                <textarea 
                  required
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newLeave.reason}
                  onChange={e => setNewLeave({...newLeave, reason: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50">
                  {t('cancel')}</button>
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