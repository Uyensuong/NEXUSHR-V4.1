
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  Banknote, 
  FileText, 
  CalendarOff,
  LogOut,
  Settings,
  TrendingUp,
  BarChart3,
  Book,
  FileBadge,
  ClipboardCheck,
  CheckSquare,
  Bot,
  UserPlus,
  GitPullRequest // Icon for Workflows
} from 'lucide-react';
import { useLanguage, useAuth } from '../contexts/AppContext';
import { Permission } from '../types';

export const Sidebar: React.FC<{ mobileOpen: boolean; setMobileOpen: (v: boolean) => void }> = ({ mobileOpen, setMobileOpen }) => {
  const location = useLocation();
  const { t } = useLanguage();
  const { logout, hasPermission } = useAuth();

  const allNavItems = [
    { icon: LayoutDashboard, label: t('dashboard'), path: '/', perm: 'VIEW_DASHBOARD' },
    { icon: CheckSquare, label: t('taskManager'), path: '/tasks', perm: 'MANAGE_TASKS' }, // Primary Item - Accessible to all
    { icon: Bot, label: t('aiAssistantNav'), path: '/ai-assistant', perm: 'USE_AI_ASSISTANT' }, 
    { icon: Users, label: t('employees'), path: '/employees', perm: 'VIEW_ALL_EMPLOYEES' },
    { icon: UserPlus, label: t('recruitmentNav'), path: '/recruitment', perm: 'MANAGE_RECRUITMENT' }, 
    { icon: Clock, label: t('attendance'), path: '/attendance', perm: 'VIEW_DASHBOARD' }, 
    { icon: Banknote, label: t('payroll'), path: '/payroll', perm: 'VIEW_DASHBOARD' }, 
    { icon: CalendarOff, label: t('leaves'), path: '/leaves', perm: 'VIEW_DASHBOARD' }, 
    { icon: FileText, label: t('contracts'), path: '/contracts', perm: 'VIEW_DASHBOARD' }, 
    { icon: TrendingUp, label: t('kpi'), path: '/kpi', perm: 'MANAGE_KPI' }, 
    { icon: FileBadge, label: t('jobDescriptions'), path: '/jds', perm: 'VIEW_DASHBOARD' },
    { icon: GitPullRequest, label: t('workflowsNav'), path: '/workflows', perm: 'VIEW_DASHBOARD' }, // New Item
    { icon: ClipboardCheck, label: t('assessments'), path: '/assessments', perm: 'VIEW_DASHBOARD' },
    { icon: BarChart3, label: t('reports'), path: '/reports', perm: 'VIEW_REPORTS' },
    { icon: Book, label: t('regulations'), path: '/regulations', perm: 'VIEW_DASHBOARD' }, 
    { icon: Settings, label: t('salaryConfig'), path: '/config', perm: 'SYSTEM_CONFIG' },
  ];

  const navItems = allNavItems.filter(item => hasPermission(item.perm as Permission));

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 z-30 h-full w-64 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:h-screen flex flex-col
      `}>
        <div className="flex items-center justify-center h-16 border-b border-slate-800 bg-slate-950 flex-shrink-0">
          <span className="text-xl font-bold text-white tracking-tight">
            NEXUS<span className="text-indigo-500">HR</span>
          </span>
        </div>

        <nav className="px-4 py-6 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive(item.path) 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 flex-shrink-0">
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-slate-800 w-full rounded-lg transition-colors"
          >
            <LogOut size={20} />
            {t('signOut')}
          </button>
        </div>
      </aside>
    </>
  );
};
