
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Menu, Bell, Search, CheckSquare } from 'lucide-react';
import { AppProvider, useAuth, useLanguage } from './contexts/AppContext';
import { api } from './services/mockService';
import { format } from 'date-fns';
import { CalendarNote, Role } from './types';
import { AIAssistant } from './components/AIAssistant';

// Pages
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import AttendancePage from './pages/Attendance';
import PayrollPage from './pages/Payroll';
import LeavesPage from './pages/Leaves';
import ContractsPage from './pages/Contracts';
import SalaryConfigPage from './pages/SalaryConfig';
import KPIPage from './pages/KPI';
import Login from './pages/Login';
import ReportsPage from './pages/Reports';
import RegulationsPage from './pages/Regulations';
import JobDescriptionsPage from './pages/JobDescriptions';
import AssessmentsPage from './pages/Assessments';
import TaskManagerPage from './pages/TaskManager';
import AIChatbot from './pages/AIChatbot';
import RecruitmentPage from './pages/Recruitment';
import WorkflowsPage from './pages/Workflows'; // Import new page

const Header = ({ setMobileOpen }: { setMobileOpen: (v: boolean) => void }) => {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [todayNotes, setTodayNotes] = useState<CalendarNote[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check for notes every minute to keep updated
  useEffect(() => {
    if (user) {
        checkNotifications();
        const interval = setInterval(checkNotifications, 60000);
        return () => clearInterval(interval);
    }
  }, [user]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setShowNotifications(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const checkNotifications = async () => {
      if (!user) return;
      const today = format(new Date(), 'yyyy-MM-dd');
      const notes = await api.getNotesForDate(user.id, today);
      setTodayNotes(notes);
  };
  
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button onClick={() => setMobileOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-700">
          <Menu size={24} />
        </button>
        <div className="hidden md:flex items-center gap-2 text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 w-64">
          <Search size={18} />
          <input type="text" placeholder="Search..." className="bg-transparent border-none outline-none text-sm w-full text-slate-700" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        {/* Language Switcher */}
        <div className="flex items-center text-xs font-medium border rounded-lg overflow-hidden">
           <button 
             onClick={() => setLanguage('en')}
             className={`px-3 py-1.5 ${language === 'en' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
           >
             EN
           </button>
           <button 
             onClick={() => setLanguage('vi')}
             className={`px-3 py-1.5 ${language === 'vi' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
           >
             VN
           </button>
        </div>

        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative text-slate-500 hover:text-indigo-600 transition-colors p-1"
            >
            <Bell size={20} />
            {todayNotes.length > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                    {todayNotes.length}
                </span>
            )}
            </button>
            
            {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 shadow-xl rounded-lg z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                        <h4 className="font-bold text-slate-800 text-sm">{t('notifications')}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{t('todayTasks')}</p>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {todayNotes.length === 0 ? (
                            <div className="p-6 text-center text-slate-500 text-sm italic">
                                {t('noNotes')}
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {todayNotes.map(note => (
                                    <div key={note.id} className="p-3 hover:bg-slate-50 flex gap-3 items-start">
                                        <div className="mt-0.5 text-indigo-500"><CheckSquare size={16} /></div>
                                        <div>
                                            <p className="text-sm text-slate-800 leading-snug">{note.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-800">{user?.fullName}</p>
            <p className="text-xs text-slate-500">{user?.role}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold border border-indigo-200">
            {user?.fullName.charAt(0)}
          </div>
        </div>
      </div>
    </header>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isLoading, hasPermission } = useAuth();

  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  
  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header setMobileOpen={setMobileOpen} />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20">
          {children}
        </main>

        {/* AI Assistant - Enable for anyone with the permission (Admins & Staff with permission) */}
        {hasPermission('USE_AI_ASSISTANT') && <AIAssistant />}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/payroll" element={<PayrollPage />} />
            <Route path="/leaves" element={<LeavesPage />} />
            <Route path="/contracts" element={<ContractsPage />} />
            <Route path="/kpi" element={<KPIPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/regulations" element={<RegulationsPage />} />
            <Route path="/jds" element={<JobDescriptionsPage />} />
            <Route path="/assessments" element={<AssessmentsPage />} />
            <Route path="/tasks" element={<TaskManagerPage />} />
            <Route path="/config" element={<SalaryConfigPage />} />
            <Route path="/ai-assistant" element={<AIChatbot />} />
            <Route path="/recruitment" element={<RecruitmentPage />} />
            <Route path="/workflows" element={<WorkflowsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  );
};

export default App;
