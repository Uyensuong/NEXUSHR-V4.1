
import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { FileText, AlertCircle, CheckCircle, Clock, Plus, Eye, PenTool, X, Edit, Users, Building, Download, Save, User } from 'lucide-react';
import { useLanguage, useAuth } from '../contexts/AppContext';
import { Contract, Employee, Role, Counterparty, CounterpartyType } from '../types';
import { api, CONTRACT_TEMPLATES } from '../services/mockService';
import { format } from 'date-fns';

export default function ContractsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  
  // Data State
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  
  // Create Contract Form State
  const [contractForm, setContractForm] = useState({
    type: 'EMPLOYMENT', // Key of CONTRACT_TEMPLATES
    targetId: '', // Employee ID or Counterparty ID
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
    content: ''
  });

  // Partner Form State
  const [partnerForm, setPartnerForm] = useState<Partial<Counterparty>>({
      type: 'BUSINESS',
      name: '',
      taxId: '',
      representative: '',
      address: '',
      phone: '',
      email: ''
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    if (!user) return;
    try {
      const [conData, empData, partnerData] = await Promise.all([
        api.getContracts(user.id, user.role),
        user.role === Role.ADMIN ? api.getEmployees() : Promise.resolve([]),
        api.getCounterparties()
      ]);
      setContracts(conData);
      setEmployees(empData);
      setCounterparties(partnerData);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePartner = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          await api.createCounterparty(partnerForm);
          setShowPartnerModal(false);
          setPartnerForm({ type: 'BUSINESS', name: '', taxId: '', address: '' });
          loadData();
      } catch (e) {
          alert('Failed to add partner');
      }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isInternal = ['EMPLOYMENT', 'UNION'].includes(contractForm.type); // Simple logic for categorization
      
      const payload: any = {
          category: activeTab,
          type: t(contractForm.type === 'EMPLOYMENT' ? 'employmentContract' : 
                  contractForm.type === 'UNION' ? 'unionContract' :
                  contractForm.type === 'PARTNERSHIP' ? 'partnershipAgreement' : 
                  contractForm.type === 'CTV' ? 'ctvContract' :
                  contractForm.type === 'AGENCY_F2' ? 'agencyContract' : 'supplierContract'),
          startDate: contractForm.startDate,
          endDate: contractForm.endDate,
          content: contractForm.content
      };

      if (activeTab === 'INTERNAL') {
          const emp = employees.find(e => e.id === contractForm.targetId);
          if (emp) {
              payload.employeeId = emp.id;
              payload.employeeName = emp.fullName;
          }
      } else {
          const cp = counterparties.find(c => c.id === contractForm.targetId);
          if (cp) {
              payload.counterpartyId = cp.id;
              payload.counterpartyName = cp.name;
          }
      }

      await api.createContract(payload);
      setShowCreateModal(false);
      loadData();
    } catch (error) {
      alert('Error creating contract');
    }
  };

  // Logic to auto-fill the contract template
  const handleTemplateSelect = (type: string, targetId: string) => {
      let content = (CONTRACT_TEMPLATES as any)[type] || '';
      
      if (activeTab === 'INTERNAL') {
          const emp = employees.find(e => e.id === targetId);
          if (emp) {
              content = content.replace(/{NAME}/g, emp.fullName.toUpperCase());
              content = content.replace(/{BIRTH_DATE}/g, emp.birthDate ? format(new Date(emp.birthDate), 'dd/MM/yyyy') : '...');
              content = content.replace(/{ID_CARD}/g, emp.citizenId || '...');
              content = content.replace(/{ADDRESS}/g, emp.address || '...');
              content = content.replace(/{SALARY}/g, new Intl.NumberFormat('vi-VN').format(emp.baseSalary));
              content = content.replace(/{POSITION}/g, emp.position || '...');
              content = content.replace(/{START_DATE}/g, format(new Date(contractForm.startDate), 'dd/MM/yyyy'));
              content = content.replace(/{END_DATE}/g, contractForm.endDate ? format(new Date(contractForm.endDate), 'dd/MM/yyyy') : '...');
          }
      } else {
          const cp = counterparties.find(c => c.id === targetId);
          if (cp) {
              content = content.replace(/{NAME}/g, cp.name.toUpperCase());
              content = content.replace(/{TAX_ID_OR_ID}/g, cp.taxId || cp.citizenId || '...');
              content = content.replace(/{ADDRESS}/g, cp.address || '...');
              content = content.replace(/{REPRESENTATIVE}/g, cp.representative || '...');
              content = content.replace(/{ID_CARD}/g, cp.citizenId || '...');
          }
      }

      setContractForm(prev => ({ ...prev, type, targetId, content }));
  };

  const handleDownloadPDF = () => {
      if (!selectedContract) return;
      
      const printWindow = window.open('', '', 'width=800,height=600');
      if (printWindow) {
          printWindow.document.write(`
              <html>
                  <head>
                      <title>Print Contract - ${selectedContract.id}</title>
                      <style>
                          body { font-family: "Times New Roman", serif; padding: 40px; line-height: 1.6; white-space: pre-wrap; font-size: 14px; }
                          h1 { text-align: center; font-size: 18px; margin-bottom: 20px; }
                      </style>
                  </head>
                  <body>
                      ${selectedContract.content}
                  </body>
              </html>
          `);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
          // printWindow.close(); // Optional: Close automatically or let user close
      }
  };

  const handleSign = async () => {
    if (!selectedContract) return;
    try {
      await api.signContract(selectedContract.id);
      alert(t('signatureSuccess'));
      setSelectedContract(null);
      loadData();
    } catch (error) {
      alert('Error signing contract');
    }
  };

  const isAdmin = user?.role === Role.ADMIN;

  const filteredContracts = contracts.filter(c => c.category === activeTab || (!c.category && activeTab === 'INTERNAL'));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('contracts')}</h1>
          <p className="text-slate-500">{t('manageContracts')}</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
              <button 
                onClick={() => setShowPartnerModal(true)}
                className="flex items-center gap-2 bg-white text-indigo-600 border border-indigo-200 px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors shadow-sm font-medium"
              >
                <Users size={18} />
                {t('managePartners')}
              </button>
              <button 
                onClick={() => {
                    setShowCreateModal(true);
                    setContractForm({
                        type: activeTab === 'INTERNAL' ? 'EMPLOYMENT' : 'PARTNERSHIP',
                        targetId: '',
                        startDate: format(new Date(), 'yyyy-MM-dd'),
                        endDate: '',
                        content: ''
                    });
                }}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
              >
                <Plus size={18} />
                {t('createContract')}
              </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('INTERNAL')}
            className={`pb-3 px-4 text-sm font-medium transition-colors ${activeTab === 'INTERNAL' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
              {t('internalContracts')}
          </button>
          <button 
            onClick={() => setActiveTab('EXTERNAL')}
            className={`pb-3 px-4 text-sm font-medium transition-colors ${activeTab === 'EXTERNAL' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
              {t('externalContracts')}
          </button>
      </div>

      {/* Contract List */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500">{t('loading')}</div>
          ) : filteredContracts.length === 0 ? (
             <div className="p-8 text-center text-slate-500">{t('noContracts')}</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-4">{activeTab === 'INTERNAL' ? t('employees') : t('counterparty')}</th>
                  <th className="px-6 py-4">{t('contractType')}</th>
                  <th className="px-6 py-4">{t('startDate')}</th>
                  <th className="px-6 py-4">{t('endDate')}</th>
                  <th className="px-6 py-4">{t('status')}</th>
                  <th className="px-6 py-4 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContracts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                        {activeTab === 'INTERNAL' ? c.employeeName : c.counterpartyName}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{c.type}</td>
                    <td className="px-6 py-4 text-slate-600">{format(new Date(c.startDate), 'MMM do, yyyy')}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {c.endDate ? format(new Date(c.endDate), 'MMM do, yyyy') : 'Indefinite'}
                    </td>
                    <td className="px-6 py-4">
                      {c.status === 'SIGNED' ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 w-fit">
                          <CheckCircle size={12} /> {t('signed')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 w-fit">
                          <Clock size={12} /> {t('pendingSignature')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button 
                        onClick={() => setSelectedContract(c)}
                        className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 p-2 rounded-md transition-colors flex items-center gap-1"
                        title={t('view')}
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* View Contract Modal */}
      {selectedContract && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <div>
                <h3 className="font-bold text-lg text-slate-800">{t('viewContract')}</h3>
                <p className="text-xs text-slate-500">{selectedContract.type} • {activeTab === 'INTERNAL' ? selectedContract.employeeName : selectedContract.counterpartyName}</p>
              </div>
              <button onClick={() => setSelectedContract(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 bg-slate-50/30">
              <div className="bg-white border border-slate-200 p-10 shadow-sm min-h-[500px] whitespace-pre-wrap font-serif text-base text-slate-900 leading-relaxed">
                {selectedContract.content}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white rounded-b-xl flex justify-between items-center">
               <button 
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-medium px-4 py-2 hover:bg-slate-50 rounded-lg transition-colors"
                >
                   <Download size={18} /> {t('downloadPDF')}
               </button>

              {selectedContract.status === 'PENDING' ? (
                <div className="flex gap-3">
                  {user?.role === Role.EMPLOYEE && selectedContract.category === 'INTERNAL' && (
                      <button 
                        onClick={handleSign}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-medium transition-colors"
                      >
                        <PenTool size={18} />
                        {t('signContract')}
                      </button>
                  )}
                  {isAdmin && (
                      <button 
                        onClick={handleSign} // Admin forced sign
                        className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium transition-colors"
                      >
                        <CheckCircle size={18} />
                        Mark as Signed
                      </button>
                  )}
                </div>
              ) : (
                 <div className="flex items-center gap-2 text-green-600 font-medium bg-green-50 px-4 py-2 rounded-lg border border-green-100">
                    <CheckCircle size={20} />
                    {t('signed')} on {format(new Date(selectedContract.signedAt!), 'PPP')}
                 </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Contract Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full shadow-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
              <h3 className="font-bold text-lg text-slate-800">{t('createContract')} ({activeTab})</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateContract} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                {activeTab === 'INTERNAL' ? t('selectEmployee') : t('selectPartner')}
                            </label>
                            <select 
                                required
                                className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={contractForm.targetId}
                                onChange={e => handleTemplateSelect(contractForm.type, e.target.value)}
                            >
                                <option value="">Select...</option>
                                {activeTab === 'INTERNAL' 
                                    ? employees.map(e => <option key={e.id} value={e.id}>{e.fullName} ({e.code})</option>)
                                    : counterparties.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)
                                }
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('contractTemplate')}</label>
                            <select 
                                className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={contractForm.type}
                                onChange={e => handleTemplateSelect(e.target.value, contractForm.targetId)}
                            >
                                {activeTab === 'INTERNAL' ? (
                                    <>
                                        <option value="EMPLOYMENT">{t('employmentContract')}</option>
                                        <option value="UNION">{t('unionContract')}</option>
                                        <option value="CTV">{t('ctvContract')}</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="PARTNERSHIP">{t('partnershipAgreement')}</option>
                                        <option value="AGENCY_F2">{t('agencyContract')}</option>
                                        <option value="SUPPLIER">{t('supplierContract')}</option>
                                    </>
                                )}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('startDate')}</label>
                            <input 
                                type="date" required
                                className="w-full border rounded-lg px-3 py-2"
                                value={contractForm.startDate}
                                onChange={e => setContractForm({...contractForm, startDate: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('endDate')}</label>
                            <input 
                                type="date"
                                className="w-full border rounded-lg px-3 py-2"
                                value={contractForm.endDate}
                                onChange={e => setContractForm({...contractForm, endDate: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-slate-700">{t('contractContent')}</label>
                            <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{t('autoFillNotice')}</span>
                        </div>
                        <textarea 
                            required
                            className="w-full border rounded-lg p-4 font-serif text-sm leading-relaxed h-[300px] focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            value={contractForm.content}
                            onChange={e => setContractForm({...contractForm, content: e.target.value})}
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3 shrink-0">
                    <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded-lg hover:bg-white">{t('cancel')}</button>
                    <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-sm">{t('save')}</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Partner Modal */}
      {showPartnerModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex justify-between items-center">
                      <h3 className="font-bold text-lg text-slate-800">{t('addPartner')}</h3>
                      <button onClick={() => setShowPartnerModal(false)}><X size={20} className="text-slate-400" /></button>
                  </div>
                  <form onSubmit={handleCreatePartner} className="p-6 space-y-4">
                      <div className="flex gap-4 p-1 bg-slate-100 rounded-lg mb-2">
                          <button 
                            type="button"
                            onClick={() => setPartnerForm({...partnerForm, type: 'BUSINESS'})}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${partnerForm.type === 'BUSINESS' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                          >
                              <Building size={16} className="inline mr-2" /> {t('BUSINESS')}
                          </button>
                          <button 
                            type="button"
                            onClick={() => setPartnerForm({...partnerForm, type: 'INDIVIDUAL'})}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${partnerForm.type === 'INDIVIDUAL' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                          >
                              <User size={16} className="inline mr-2" /> {t('INDIVIDUAL')}
                          </button>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                              {partnerForm.type === 'BUSINESS' ? 'Company Name' : 'Full Name'}
                          </label>
                          <input required type="text" className="w-full border rounded-lg px-3 py-2" value={partnerForm.name} onChange={e => setPartnerForm({...partnerForm, name: e.target.value})} />
                      </div>

                      {partnerForm.type === 'BUSINESS' ? (
                          <>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('taxId')}</label>
                                <input required type="text" className="w-full border rounded-lg px-3 py-2" value={partnerForm.taxId} onChange={e => setPartnerForm({...partnerForm, taxId: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('representative')}</label>
                                <input type="text" className="w-full border rounded-lg px-3 py-2" value={partnerForm.representative} onChange={e => setPartnerForm({...partnerForm, representative: e.target.value})} />
                            </div>
                          </>
                      ) : (
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">{t('citizenId')}</label>
                              <input required type="text" className="w-full border rounded-lg px-3 py-2" value={partnerForm.citizenId} onChange={e => setPartnerForm({...partnerForm, citizenId: e.target.value})} />
                          </div>
                      )}

                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">{t('address')}</label>
                          <input required type="text" className="w-full border rounded-lg px-3 py-2" value={partnerForm.address} onChange={e => setPartnerForm({...partnerForm, address: e.target.value})} />
                      </div>

                      <div className="flex gap-3 pt-2">
                          <button type="button" onClick={() => setShowPartnerModal(false)} className="flex-1 px-4 py-2 border rounded-lg">{t('cancel')}</button>
                          <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg">{t('save')}</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}
