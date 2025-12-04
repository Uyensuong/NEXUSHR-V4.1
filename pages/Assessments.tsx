

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { useLanguage, useAuth } from '../contexts/AppContext';
import { api } from '../services/mockService';
import { Quiz, QuizResult, Role } from '../types';
import { ClipboardCheck, Plus, Play, Clock, CheckCircle, XCircle, Eye, Trash2, Check, Sparkles, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function AssessmentsPage() {
  const { t } = useLanguage();
  const { user, hasPermission } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'AVAILABLE' | 'MANAGE' | 'RESULTS'>('AVAILABLE');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Results Search
  const [resultSearch, setResultSearch] = useState('');

  // Taking Quiz State
  const [takingQuiz, setTakingQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null); // Immediate result after taking

  // Create Quiz State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newQuiz, setNewQuiz] = useState<Partial<Quiz>>({
    title: '',
    description: '',
    timeLimitMinutes: 15,
    questions: []
  });

  // AI Generation State
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [qData, rData] = await Promise.all([
        api.getQuizzes(),
        // Admin/HR sees all, Employee sees only theirs (filtered in mockService usually, but here explicit for safety)
        user?.role === Role.ADMIN || user?.role === Role.HR 
          ? api.getQuizResults() 
          : api.getQuizResults().then(res => res.filter(r => r.employeeId === user?.id || r.employeeName === user?.fullName))
      ]);
      setQuizzes(qData);
      setResults(rData);
    } finally {
      setLoading(false);
    }
  };

  // --- Quiz Taking Logic ---
  const startQuiz = (quiz: Quiz) => {
    setTakingQuiz(quiz);
    setAnswers({});
    setQuizResult(null);
  };

  const submitQuiz = async () => {
    if (!takingQuiz || !user) return;
    // Validate all answered?
    if (Object.keys(answers).length < takingQuiz.questions.length) {
      if (!confirm("You haven't answered all questions. Submit anyway?")) return;
    }

    try {
      const result = await api.submitQuiz(takingQuiz.id, user.id, answers);
      setQuizResult(result);
      setTakingQuiz(null);
      loadData();
    } catch (e) {
      alert("Error submitting quiz");
    }
  };

  // --- Quiz Creation Logic ---
  const addQuestion = () => {
    const qId = Math.random().toString(36).substr(2, 9);
    setNewQuiz(prev => ({
      ...prev,
      questions: [...(prev.questions || []), { id: qId, text: '', options: ['', '', '', ''], correctIndex: 0 }]
    }));
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    const updatedQs = [...(newQuiz.questions || [])];
    if (field === 'text') updatedQs[idx].text = value;
    if (field === 'correctIndex') updatedQs[idx].correctIndex = value;
    setNewQuiz({ ...newQuiz, questions: updatedQs });
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    const updatedQs = [...(newQuiz.questions || [])];
    updatedQs[qIdx].options[oIdx] = value;
    setNewQuiz({ ...newQuiz, questions: updatedQs });
  };

  const handleCreateQuiz = async () => {
    if (!newQuiz.title || !newQuiz.questions || newQuiz.questions.length === 0) {
      alert("Please fill title and add questions");
      return;
    }
    try {
      await api.createQuiz(newQuiz as any);
      setShowCreateModal(false);
      setNewQuiz({ title: '', description: '', timeLimitMinutes: 15, questions: [] });
      loadData();
    } catch (e) {
      alert("Error creating quiz");
    }
  };

  const handleDeleteQuiz = async (id: string) => {
      if (!confirm("Are you sure you want to delete this quiz?")) return;
      try {
          await api.deleteQuiz(id);
          loadData();
      } catch (e) {
          alert("Error deleting quiz");
      }
  };

  const handleAIGenerate = async () => {
      if (!aiTopic.trim()) return;
      setIsGenerating(true);
      try {
          await api.generateAIQuiz(aiTopic);
          alert(t('quizGeneratedSuccess'));
          setShowAIModal(false);
          setAiTopic('');
          loadData();
      } catch (e) {
          alert("AI Generation Failed");
      } finally {
          setIsGenerating(false);
      }
  };

  const isAdmin = hasPermission('MANAGE_ASSESSMENTS');

  const filteredResults = results.filter(r => 
    r.employeeName.toLowerCase().includes(resultSearch.toLowerCase()) || 
    r.quizTitle.toLowerCase().includes(resultSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardCheck className="text-indigo-600" />
            {t('assessmentTitle')}
          </h1>
          <p className="text-slate-500">{t('assessmentSubtitle')}</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
             <button 
                onClick={() => setShowAIModal(true)}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 shadow-sm font-medium animate-pulse"
             >
                <Sparkles size={18} />
                {t('generateAIQuiz')}
             </button>
             <button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-sm"
             >
                <Plus size={18} />
                {t('addQuiz')}
             </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button onClick={() => setActiveTab('AVAILABLE')} className={`pb-3 px-4 text-sm font-medium ${activeTab === 'AVAILABLE' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>{t('availableQuizzes')}</button>
        {isAdmin && <button onClick={() => setActiveTab('MANAGE')} className={`pb-3 px-4 text-sm font-medium ${activeTab === 'MANAGE' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>{t('manageQuizzes')}</button>}
        {isAdmin && <button onClick={() => setActiveTab('RESULTS')} className={`pb-3 px-4 text-sm font-medium ${activeTab === 'RESULTS' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>{t('quizResults')}</button>}
      </div>

      {/* Available Quizzes Tab */}
      {activeTab === 'AVAILABLE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map(quiz => (
            <Card key={quiz.id} className="hover:shadow-md transition-shadow border-l-4 border-l-indigo-500">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg text-slate-800 mb-2">{quiz.title}</h3>
                <p className="text-sm text-slate-600 mb-4 min-h-[3rem] line-clamp-3">{quiz.description}</p>
                
                <div className="flex items-center justify-between text-xs text-slate-500 mb-6">
                  <span className="flex items-center gap-1"><Clock size={14} /> {quiz.timeLimitMinutes} {t('minutes')}</span>
                  <span className="bg-slate-100 px-2 py-1 rounded">{quiz.questions.length} {t('questions')}</span>
                </div>

                <button 
                  onClick={() => startQuiz(quiz)}
                  className="w-full bg-indigo-50 text-indigo-700 py-2 rounded-lg font-medium hover:bg-indigo-100 flex items-center justify-center gap-2"
                >
                  <Play size={16} /> {t('takeQuiz')}
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results Tab (Admin) */}
      {activeTab === 'RESULTS' && (
        <Card>
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
             <h3 className="font-bold text-slate-700">{t('quizResults')}</h3>
             <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search employee or quiz..." 
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={resultSearch}
                  onChange={e => setResultSearch(e.target.value)}
                />
             </div>
          </div>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4">{t('employees')}</th>
                  <th className="px-6 py-4">{t('quizTitle')}</th>
                  <th className="px-6 py-4">{t('scoreResult')}</th>
                  <th className="px-6 py-4">{t('status')}</th>
                  <th className="px-6 py-4">{t('dates')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResults.map(res => (
                  <tr key={res.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium">{res.employeeName}</td>
                    <td className="px-6 py-4">{res.quizTitle}</td>
                    <td className="px-6 py-4 font-bold">
                      {res.score}% <span className="text-xs text-slate-400 font-normal">({res.correctAnswers}/{res.totalQuestions})</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${res.score >= 70 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {res.score >= 70 ? t('passed') : t('failed')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{format(new Date(res.takenAt), 'MMM do, HH:mm')}</td>
                  </tr>
                ))}
                {filteredResults.length === 0 && (
                   <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">{t('noRecords')}</td>
                   </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Manage Tab (Admin) */}
      {activeTab === 'MANAGE' && (
        <div className="grid grid-cols-1 gap-4">
           {quizzes.map(q => (
             <div key={q.id} className="bg-white border rounded-lg p-4 flex justify-between items-center">
                <div>
                   <h4 className="font-bold text-slate-800">{q.title}</h4>
                   <p className="text-xs text-slate-500">{q.questions.length} questions • {q.timeLimitMinutes} mins</p>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button className="text-indigo-600 p-2 hover:bg-indigo-50 rounded"><Eye size={18} /></button>
                    <button 
                        onClick={() => handleDeleteQuiz(q.id)}
                        className="text-red-600 p-2 hover:bg-red-50 rounded"
                        title={t('delete')}
                    >
                        <Trash2 size={18} />
                    </button>
                  </div>
                )}
             </div>
           ))}
        </div>
      )}

      {/* Quiz Taking Modal */}
      {takingQuiz && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-indigo-600 text-white">
            <div>
              <h2 className="font-bold text-lg">{takingQuiz.title}</h2>
              <div className="flex items-center gap-4 text-sm opacity-90">
                 <span><Clock size={14} className="inline" /> {takingQuiz.timeLimitMinutes} {t('minutes')}</span>
                 <span>{Object.keys(answers).length}/{takingQuiz.questions.length} Answered</span>
              </div>
            </div>
            <button onClick={() => setTakingQuiz(null)} className="text-white hover:text-indigo-200">
              <XCircle size={24} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
            <div className="max-w-3xl mx-auto space-y-6">
              {takingQuiz.questions.map((q, idx) => (
                <Card key={q.id} className="overflow-hidden">
                  <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 font-medium text-slate-700">
                    {t('questions')} {idx + 1}
                  </div>
                  <CardContent className="p-6">
                    <p className="text-lg font-medium text-slate-800 mb-4">{q.text}</p>
                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => (
                        <button
                          key={optIdx}
                          onClick={() => setAnswers(prev => ({...prev, [q.id]: optIdx}))}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            answers[q.id] === optIdx 
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-900' 
                              : 'border-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${answers[q.id] === optIdx ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300'}`}>
                              {answers[q.id] === optIdx && <div className="w-2 h-2 bg-white rounded-full"></div>}
                            </div>
                            {opt}
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-slate-200 bg-white flex justify-end">
             <button 
               onClick={submitQuiz}
               className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-lg"
             >
               {t('submitQuiz')}
             </button>
          </div>
        </div>
      )}

      {/* Quiz Result Modal */}
      {quizResult && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
           <div className="bg-white rounded-xl max-w-md w-full shadow-2xl p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
                 {quizResult.score >= 70 ? <CheckCircle size={40} className="text-green-600" /> : <XCircle size={40} className="text-red-600" />}
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">{quizResult.score >= 70 ? 'Great Job!' : 'Keep Practicing'}</h2>
              <p className="text-slate-500 mb-6">{t('scoreResult')}</p>
              
              <div className="text-5xl font-bold text-indigo-600 mb-6">
                 {quizResult.score}
                 <span className="text-xl text-slate-400">/100</span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                 <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                    <p className="text-xs text-green-600 font-bold uppercase">{t('correct')}</p>
                    <p className="text-xl font-bold text-green-800">{quizResult.correctAnswers}</p>
                 </div>
                 <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                    <p className="text-xs text-red-600 font-bold uppercase">{t('incorrect')}</p>
                    <p className="text-xl font-bold text-red-800">{quizResult.totalQuestions - quizResult.correctAnswers}</p>
                 </div>
              </div>

              <button onClick={() => setQuizResult(null)} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold">
                 {t('close')}
              </button>
           </div>
        </div>
      )}

      {/* AI Assistant Modal */}
      {showAIModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="p-6 text-center border-b border-slate-100 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-xl">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 text-purple-600">
                          <Sparkles size={24} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800">{t('aiAssistant')}</h3>
                      <p className="text-sm text-slate-500 mt-1">{t('generateAIQuiz')}</p>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      <p className="text-sm text-slate-600">{t('aiPromptDesc')}</p>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">{t('aiPromptTitle')}</label>
                          <input 
                              type="text"
                              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="e.g. Ticketing Knowledge"
                              value={aiTopic}
                              onChange={e => setAiTopic(e.target.value)}
                          />
                      </div>
                      
                      <button 
                          onClick={handleAIGenerate}
                          disabled={isGenerating || !aiTopic.trim()}
                          className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                          {isGenerating ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                {t('generating')}
                              </>
                          ) : (
                              <>
                                <Sparkles size={18} />
                                {t('generateAIQuiz')}
                              </>
                          )}
                      </button>
                      <button onClick={() => setShowAIModal(false)} className="w-full text-slate-500 py-2 hover:text-slate-700 text-sm">
                          {t('cancel')}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Create Quiz Modal (Manual) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h3 className="font-bold text-lg text-slate-800">{t('createReview')}</h3>
               <button onClick={() => setShowCreateModal(false)}><XCircle size={24} className="text-slate-400" /></button>
             </div>
             <div className="p-6 space-y-6">
                <div className="grid grid-cols-3 gap-4">
                   <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">{t('quizTitle')}</label>
                      <input 
                        type="text" className="w-full border px-3 py-2 rounded" 
                        value={newQuiz.title} onChange={e => setNewQuiz({...newQuiz, title: e.target.value})}
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-medium mb-1">{t('timeLimit')}</label>
                      <input 
                        type="number" className="w-full border px-3 py-2 rounded" 
                        value={newQuiz.timeLimitMinutes} onChange={e => setNewQuiz({...newQuiz, timeLimitMinutes: Number(e.target.value)})}
                      />
                   </div>
                </div>
                <div>
                   <label className="block text-sm font-medium mb-1">{t('quizDesc')}</label>
                   <textarea 
                     className="w-full border px-3 py-2 rounded" 
                     value={newQuiz.description} onChange={e => setNewQuiz({...newQuiz, description: e.target.value})}
                   />
                </div>

                {/* Question Editor */}
                <div className="space-y-6 border-t pt-4">
                   {newQuiz.questions?.map((q, qIdx) => (
                      <div key={q.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                         <div className="flex justify-between mb-2">
                            <label className="text-sm font-bold text-slate-700">{t('questions')} {qIdx + 1}</label>
                            <button className="text-red-500"><Trash2 size={16} /></button>
                         </div>
                         <input 
                           type="text" className="w-full border px-3 py-2 rounded mb-3" placeholder="Question Text"
                           value={q.text} onChange={e => updateQuestion(qIdx, 'text', e.target.value)}
                         />
                         <div className="grid grid-cols-2 gap-3">
                            {q.options.map((opt, oIdx) => (
                               <div key={oIdx} className="flex items-center gap-2">
                                  <input 
                                    type="radio" name={`correct-${q.id}`} 
                                    checked={q.correctIndex === oIdx}
                                    onChange={() => updateQuestion(qIdx, 'correctIndex', oIdx)}
                                  />
                                  <input 
                                    type="text" className="w-full border px-2 py-1 rounded text-sm" placeholder={`Option ${oIdx + 1}`}
                                    value={opt} onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                                  />
                               </div>
                            ))}
                         </div>
                      </div>
                   ))}
                   <button onClick={addQuestion} className="w-full border-2 border-dashed border-slate-300 text-slate-500 py-3 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2">
                      <Plus size={18} /> {t('addQuestion')}
                   </button>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                   <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded hover:bg-slate-50">{t('cancel')}</button>
                   <button onClick={handleCreateQuiz} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">{t('save')}</button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
