
import React, { useEffect, useState } from 'react';
import { api } from '../services/mockService';
import { Employee, EmploymentStatus, Role, User, Permission, RoleTitle } from '../types';
import { Card, CardContent } from '../components/ui/Card';
import { Search, Plus, Edit, X, Key, Eye, EyeOff, CheckCircle, Shield, Trash2, Lock, RefreshCw } from 'lucide-react';
import { useLanguage, useAuth } from '../contexts/AppContext';

interface PermissionCheckboxProps {
  perm: Permission;
  checked: boolean;
  onChange: () => void;
  label: string;
}

// Permission Checkbox Component
const PermissionCheckbox: React.FC<PermissionCheckboxProps> = ({ 
  checked, 
  onChange, 
  label 
}) => (
   <label className="flex items-center gap-2 p-2 border rounded-md bg-white hover:bg-slate-50 cursor-pointer">
      <input 
        type="checkbox" 
        className="rounded text-indigo-600 focus:ring-indigo-500"
        checked={checked}
        onChange={onChange}
      />
      <span className="text-sm text-slate-700">{label}</span>
   </label>
);

// Constants for Airline Ticketing Categories
const COMMON_DEPARTMENTS = [
  "Ban Giám đốc",
  "Phòng Vé (Ticketing)",
  "Phòng Kinh doanh (Sales)",
  "Phòng Kế toán Vé (BSP)",
  "Phòng Chăm sóc Khách hàng",
  "Phòng Nhân sự",
  "Phòng Kỹ thuật"
];

const COMMON_POSITIONS = [
  "Giám đốc",
  "Phó Giám đốc",
  "Trưởng phòng",
  "Trưởng nhóm Kinh doanh",
  "Trưởng nhóm Ticketing",
  "Nhân viên Ticketing",
  "Nhân viên Sales",
  "Kế toán trưởng",
  "Kế toán Vé (BSP)",
  "Thực tập sinh"
];

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [minWage, setMinWage] = useState<number>(0);

  const { t } = useLanguage();
  const { user, hasPermission } = useAuth();
  
  // Create Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpPosition, setNewEmpPosition] = useState(COMMON_POSITIONS[5]); // Default to Staff
  const [newEmpDept, setNewEmpDept] = useState(COMMON_DEPARTMENTS[1]); // Default to Ticketing
  const [newEmpSalary, setNewEmpSalary] = useState('');
  const [newEmpInsuranceSalary, setNewEmpInsuranceSalary] = useState('');
  const [newEmpRoleTitle, setNewEmpRoleTitle] = useState<RoleTitle>('STAFF');
  const [newEmpBirthDate, setNewEmpBirthDate] = useState('');
  const [newEmpCitizenId, setNewEmpCitizenId] = useState('');
  const [newEmpAddress, setNewEmpAddress] = useState('');

  // Edit Modal state (Expanded)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState({
    code: '',
    email: '', // Syncs to User
    fullName: '',
    hireDate: '',
    birthDate: '',
    citizenId: '',
    address: '',
    position: '',
    roleTitle: 'STAFF' as RoleTitle,
    departmentName: '',
    baseSalary: 0,
    insuranceSalary: 0,
    status: EmploymentStatus.ACTIVE
  });

  // Approval Modal state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvingEmp, setApprovingEmp] = useState<Employee | null>(null);
  const [approveRole, setApproveRole] = useState<Role>(Role.EMPLOYEE);
  const [approveRoleTitle, setApproveRoleTitle] = useState<RoleTitle>('STAFF');
  const [approveSalary, setApproveSalary] = useState<string>('10000000');
  const [approveInsuranceSalary, setApproveInsuranceSalary] = useState<string>('5000000');
  const [approvePermissions, setApprovePermissions] = useState<Permission[]>([]);

  // Manage Permissions Modal state
  const [showPermsModal, setShowPermsModal] = useState(false);
  const [permUser, setPermUser] = useState<User | null>(null);
  const [permList, setPermList] = useState<Permission[]>([]);

  // Password Reset Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordResetEmp, setPasswordResetEmp] = useState<Employee | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (user) {
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // When changing role in Approve Modal, reset default permissions
  useEffect(() => {
    if (approvingEmp) {
       setApprovePermissions(api.getDefaultPermissions(approveRole));
    }
  }, [approveRole, approvingEmp]);

  const loadData = async () => {
    setLoading(true);
    if (!user) return;

    const empData = await api.getEmployees();
    setEmployees(empData);

    if (user.role === Role.ADMIN) {
      const userData = await api.getAllUsers(user.role);
      setUsers(userData);
      
      // Get Config for Min Wage
      const config = await api.getSalaryConfig();
      setMinWage(config.regionIMinimumWage || 4960000);
    }
    setLoading(false);
  };

  const filteredEmployees = employees.filter(emp => 
    emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort Pending to Top
  filteredEmployees.sort((a, b) => {
    if (a.status === EmploymentStatus.PENDING && b.status !== EmploymentStatus.PENDING) return -1;
    if (a.status !== EmploymentStatus.PENDING && b.status === EmploymentStatus.PENDING) return 1;
    return 0;
  });

  const getStatusBadge = (status: EmploymentStatus) => {
    switch(status) {
      case EmploymentStatus.ACTIVE:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>;
      case EmploymentStatus.PROBATION:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Probation</span>;
      case EmploymentStatus.PENDING:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 animate-pulse">Pending Approval</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">Inactive</span>;
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createEmployee({
        fullName: newEmpName,
        email: newEmpEmail,
        position: newEmpPosition,
        departmentName: newEmpDept,
        roleTitle: newEmpRoleTitle,
        baseSalary: Number(newEmpSalary.replace(/,/g, '')),
        insuranceSalary: Number(newEmpInsuranceSalary.replace(/,/g, '')) || undefined,
        birthDate: newEmpBirthDate,
        citizenId: newEmpCitizenId,
        address: newEmpAddress
      } as any);
      setShowAddModal(false);
      // Reset form
      setNewEmpName('');
      setNewEmpEmail('');
      setNewEmpPosition(COMMON_POSITIONS[5]);
      setNewEmpDept(COMMON_DEPARTMENTS[1]);
      setNewEmpSalary('');
      setNewEmpInsuranceSalary('');
      setNewEmpRoleTitle('STAFF');
      setNewEmpBirthDate('');
      setNewEmpCitizenId('');
      setNewEmpAddress('');
      loadData();
    } catch (err) {
      alert(err);
    }
  };

  const handleDeleteEmployee = async (emp: Employee) => {
     // Security: Prevent deleting own active account if linked
     if (user && emp.userId === user.id) {
        alert('Bạn không thể xóa tài khoản đang đăng nhập.');
        return;
     }

     if (!confirm(t('confirmDelete'))) return;
     
     try {
       await api.deleteEmployee(emp.id);
       alert(t('deleteSuccess'));
       loadData();
     } catch (err) {
       alert('Failed to delete employee');
       console.error(err);
     }
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    // Find user email
    const u = users.find(u => u.id === emp.userId);
    
    setEditForm({
      code: emp.code,
      email: u ? u.email : '',
      fullName: emp.fullName,
      hireDate: emp.hireDate ? emp.hireDate.split('T')[0] : '',
      birthDate: emp.birthDate ? emp.birthDate.split('T')[0] : '',
      citizenId: emp.citizenId || '',
      address: emp.address || '',
      position: emp.position,
      roleTitle: emp.roleTitle,
      departmentName: emp.departmentName || '',
      baseSalary: emp.baseSalary,
      insuranceSalary: emp.insuranceSalary || 0,
      status: emp.status
    });
    setShowEditModal(true);
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    try {
      await api.updateEmployee(editingEmployee.id, {
        code: editForm.code,
        email: editForm.email, // Special handling in mockService to update User
        fullName: editForm.fullName,
        hireDate: new Date(editForm.hireDate).toISOString(),
        birthDate: editForm.birthDate ? new Date(editForm.birthDate).toISOString() : undefined,
        citizenId: editForm.citizenId,
        address: editForm.address,
        position: editForm.position,
        roleTitle: editForm.roleTitle,
        departmentName: editForm.departmentName,
        baseSalary: Number(editForm.baseSalary),
        insuranceSalary: Number(editForm.insuranceSalary),
        status: editForm.status
      } as any);
      setShowEditModal(false);
      setEditingEmployee(null);
      loadData();
    } catch (err) {
      alert(err);
    }
  };

  const openPasswordModal = (emp: Employee) => {
    setPasswordResetEmp(emp);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordResetEmp?.userId) return;
    try {
        await api.resetUserPassword(passwordResetEmp.userId, newPassword);
        alert(t('passwordResetSuccess'));
        setShowPasswordModal(false);
        setPasswordResetEmp(null);
        loadData(); // Reload to update the displayed password if necessary
    } catch (err: any) {
        alert(err.message);
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const openApproveModal = (emp: Employee) => {
    setApprovingEmp(emp);
    setApproveRole(Role.EMPLOYEE);
    setApproveRoleTitle('STAFF');
    setApproveSalary('10000000');
    setApproveInsuranceSalary('4960000'); // 2024 Region 1 Min Wage
    // Init permissions
    setApprovePermissions(api.getDefaultPermissions(Role.EMPLOYEE));
    setShowApproveModal(true);
  };

  const handleApproveUser = async () => {
    if (!approvingEmp || !approvingEmp.userId) return;
    try {
      await api.approveUser(approvingEmp.userId, approveRole, {
        roleTitle: approveRoleTitle,
        baseSalary: Number(approveSalary),
        insuranceSalary: Number(approveInsuranceSalary)
      }, approvePermissions);
      setShowApproveModal(false);
      setApprovingEmp(null);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to approve user");
    }
  };

  const openPermsModal = (emp: Employee) => {
    const u = users.find(u => u.id === emp.userId);
    if (!u) return;
    setPermUser(u);
    setPermList(u.permissions || api.getDefaultPermissions(u.role));
    setShowPermsModal(true);
  };

  const handleSavePerms = async () => {
    if (!permUser) return;
    try {
      await api.updateUserPermissions(permUser.id, permList);
      alert('Permissions updated');
      setShowPermsModal(false);
      setPermUser(null);
      loadData();
    } catch (e) {
       alert('Error updating permissions');
    }
  };

  const togglePerm = (perm: Permission, isApproveMode: boolean = false) => {
     if (isApproveMode) {
        if (approvePermissions.includes(perm)) {
          setApprovePermissions(approvePermissions.filter(p => p !== perm));
        } else {
          setApprovePermissions([...approvePermissions, perm]);
        }
     } else {
        if (permList.includes(perm)) {
          setPermList(permList.filter(p => p !== perm));
        } else {
          setPermList([...permList, perm]);
        }
     }
  };

  // Helper to format numbers with commas
  const formatNumber = (value: number | string) => {
    if (value === undefined || value === null) return '';
    const clean = value.toString().replace(/,/g, '');
    if (!clean) return '';
    return new Intl.NumberFormat('en-US').format(Number(clean));
  };

  // Ensure this list matches the Permission type in types.ts
  const ALL_PERMISSIONS: Permission[] = [
    'VIEW_DASHBOARD',
    'MANAGE_EMPLOYEES',
    'VIEW_ALL_EMPLOYEES',
    'MANAGE_ATTENDANCE',
    'VIEW_ALL_ATTENDANCE',
    'MANAGE_PAYROLL',
    'VIEW_ALL_PAYROLL',
    'MANAGE_LEAVES',
    'MANAGE_CONTRACTS',
    'MANAGE_KPI',
    'VIEW_REPORTS',
    'MANAGE_REGULATIONS',
    'MANAGE_JDS',
    'MANAGE_ASSESSMENTS',
    'SYSTEM_CONFIG',
    'FACTORY_RESET'
  ];

  // Only ADMIN can edit or add
  const isAdmin = hasPermission('MANAGE_EMPLOYEES');
  const canViewSalary = hasPermission('VIEW_ALL_PAYROLL');
  const { language } = useLanguage();

  // Helper to render role options with translations
  const RoleOptions = () => (
    <>
      <option value="DIRECTOR">{t('ROLE_DIRECTOR')}</option>
      <option value="HEAD_OF_DEPT">{t('ROLE_HEAD_OF_DEPT')}</option>
      <option value="TEAM_LEAD">{t('ROLE_TEAM_LEAD')}</option>
      <option value="ACCOUNTANT">{t('ROLE_ACCOUNTANT')}</option>
      <option value="STAFF">{t('ROLE_STAFF')}</option>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('employees')}</h1>
          <p className="text-slate-500">{t('manageWorkforce')}</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            {t('addEmployee')}
          </button>
        )}
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
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
          {loading ? (
            <div className="p-8 text-center text-slate-500">{t('loading')}</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-4">{t('employees')}</th>
                  {isAdmin && <th className="px-6 py-4">{t('credentials')}</th>}
                  <th className="px-6 py-4">{t('position')} / {t('department')}</th>
                  <th className="px-6 py-4">{t('roleTitle')}</th>
                  <th className="px-6 py-4">{t('status')}</th>
                  <th className="px-6 py-4">{t('salary')} (VND)</th>
                  {isAdmin && <th className="px-6 py-4 text-right">{t('actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => {
                  const userAccount = users.find(u => u.id === emp.userId);
                  const isPassVisible = userAccount ? visiblePasswords[userAccount.id] : false;
                  const isPending = emp.status === EmploymentStatus.PENDING;

                  return (
                    <tr key={emp.id} className={`hover:bg-slate-50 transition-colors ${isPending ? 'bg-orange-50/50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isPending ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>
                            {emp.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{emp.fullName}</p>
                            <p className="text-xs text-slate-500">{emp.code}</p>
                            {emp.citizenId && <p className="text-xs text-slate-400 mt-0.5">ID: {emp.citizenId}</p>}
                          </div>
                        </div>
                      </td>
                      
                      {isAdmin && (
                        <td className="px-6 py-4">
                          {userAccount ? (
                            <div className="flex flex-col gap-1">
                              <div className="text-xs text-slate-500 flex items-center gap-1">
                                <span className="font-semibold text-slate-700">{t('username')}:</span> {userAccount.email}
                              </div>
                              <div className="text-xs text-slate-500 flex items-center gap-1">
                                <span className="font-semibold text-slate-700">{t('password')}:</span> 
                                <span className="font-mono bg-slate-100 px-1 rounded">
                                  {isPassVisible ? userAccount.password : '••••••'}
                                </span>
                                <button 
                                  onClick={() => togglePasswordVisibility(userAccount.id)}
                                  className="ml-1 text-slate-400 hover:text-indigo-600"
                                  title={isPassVisible ? t('hidePass') : t('showPass')}
                                >
                                  {isPassVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No account linked</span>
                          )}
                        </td>
                      )}

                      <td className="px-6 py-4 text-slate-600">
                        <div className="font-medium text-slate-700">{emp.position}</div>
                        <div className="text-xs text-slate-500">{emp.departmentName}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">
                          {t(`ROLE_${emp.roleTitle}`)}
                        </span>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(emp.status)}</td>
                      <td className="px-6 py-4 font-medium text-slate-700">
                        {canViewSalary ? (
                          <div>
                            <div>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(emp.baseSalary)}</div>
                            {emp.insuranceSalary > 0 && (
                                <div className="text-xs text-slate-400 mt-1" title={t('insuranceSalary')}>
                                   BH: {new Intl.NumberFormat('vi-VN', { compactDisplay: "short", notation: "compact", style: 'currency', currency: 'VND' }).format(emp.insuranceSalary)}
                                </div>
                            )}
                          </div>
                        ) : '****'}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          {isPending ? (
                             <button 
                              onClick={() => openApproveModal(emp)}
                              className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded-md text-xs font-medium hover:bg-green-700 shadow-sm"
                            >
                              <CheckCircle size={14} />
                              {t('approve')}
                            </button>
                          ) : (
                            <>
                              <button 
                                onClick={() => openPermsModal(emp)}
                                className="text-slate-400 hover:text-teal-600 p-2 rounded-full hover:bg-teal-50 transition-colors"
                                title={t('managePermissions')}
                              >
                                <Shield size={18} />
                              </button>
                              <button 
                                onClick={() => openEditModal(emp)}
                                className="text-slate-400 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50 transition-colors"
                                title={t('edit')}
                              >
                                <Edit size={18} />
                              </button>
                              <button 
                                onClick={() => openPasswordModal(emp)}
                                className="text-slate-400 hover:text-orange-600 p-2 rounded-full hover:bg-orange-50 transition-colors"
                                title={t('resetPassword')}
                              >
                                <Key size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteEmployee(emp)}
                                className="text-slate-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                                title={t('delete')}
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">{t('modalCreateEmployee')}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateEmployee} className="p-6 space-y-4">
              {/* Personal Info */}
              <div className="space-y-3 border-b border-slate-100 pb-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('personalInfo')}</h4>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('fullName')}</label>
                  <input type="text" required className="w-full border rounded-lg px-3 py-2" value={newEmpName} onChange={e => setNewEmpName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('birthDate')}</label>
                      <input type="date" className="w-full border rounded-lg px-3 py-2" value={newEmpBirthDate} onChange={e => setNewEmpBirthDate(e.target.value)} />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('citizenId')}</label>
                      <input type="text" className="w-full border rounded-lg px-3 py-2" value={newEmpCitizenId} onChange={e => setNewEmpCitizenId(e.target.value)} />
                   </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('address')}</label>
                  <input type="text" className="w-full border rounded-lg px-3 py-2" value={newEmpAddress} onChange={e => setNewEmpAddress(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('email')}</label>
                  <input type="email" required className="w-full border rounded-lg px-3 py-2" value={newEmpEmail} onChange={e => setNewEmpEmail(e.target.value)} />
                </div>
              </div>
              
              {/* Work Info */}
              <div className="space-y-3">
                 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('workInfo')}</h4>
                 <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('department')}</label>
                    <select 
                       required 
                       className="w-full border rounded-lg px-3 py-2 bg-white"
                       value={newEmpDept} onChange={e => setNewEmpDept(e.target.value)} 
                    >
                      {COMMON_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('position')}</label>
                    <select
                      required 
                      className="w-full border rounded-lg px-3 py-2 bg-white"
                      value={newEmpPosition} onChange={e => setNewEmpPosition(e.target.value)} 
                    >
                      {COMMON_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('roleTitle')}</label>
                    <select className="w-full border rounded-lg px-3 py-2 bg-white" value={newEmpRoleTitle} onChange={e => setNewEmpRoleTitle(e.target.value as RoleTitle)}>
                      <RoleOptions />
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('salary')} (VND)</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full border rounded-lg px-3 py-2" 
                      value={formatNumber(newEmpSalary)} 
                      onChange={e => setNewEmpSalary(e.target.value.replace(/,/g, ''))} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between">
                        {t('insuranceSalary')}
                        {minWage > 0 && (
                            <button 
                                type="button" 
                                onClick={() => setNewEmpInsuranceSalary(minWage.toString())}
                                className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1 bg-indigo-50 px-2 rounded border border-indigo-100"
                                title={`${t('applyMinWage')} (${formatNumber(minWage)})`}
                            >
                                <RefreshCw size={10} /> Auto
                            </button>
                        )}
                    </label>
                    <input 
                      type="text" 
                      className="w-full border rounded-lg px-3 py-2" 
                      value={formatNumber(newEmpInsuranceSalary)} 
                      onChange={e => setNewEmpInsuranceSalary(e.target.value.replace(/,/g, ''))} 
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border rounded-lg">{t('cancel')}</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg">{t('save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal (Fully Expanded) */}
      {showEditModal && editingEmployee && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">{t('editEmployee')}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdateEmployee} className="p-6 space-y-4">
              
              {/* Personal Info */}
              <div className="space-y-4 border-b border-slate-100 pb-6">
                 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('personalInfo')}</h4>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('employeeCode')}</label>
                        <input type="text" className="w-full border px-3 py-2 rounded bg-slate-50" value={editForm.code} onChange={e => setEditForm({...editForm, code: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('fullName')}</label>
                        <input type="text" className="w-full border px-3 py-2 rounded" value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('birthDate')}</label>
                        <input type="date" className="w-full border px-3 py-2 rounded" value={editForm.birthDate} onChange={e => setEditForm({...editForm, birthDate: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('citizenId')}</label>
                        <input type="text" className="w-full border px-3 py-2 rounded" value={editForm.citizenId} onChange={e => setEditForm({...editForm, citizenId: e.target.value})} />
                    </div>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('address')}</label>
                    <input type="text" className="w-full border px-3 py-2 rounded" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} />
                 </div>
                 <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">{t('email')} (Update Login)</label>
                     <input type="text" className="w-full border px-3 py-2 rounded" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                  </div>
              </div>

              {/* Work Info */}
              <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('workInfo')}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('hireDate')}</label>
                      <input type="date" className="w-full border px-3 py-2 rounded" value={editForm.hireDate} onChange={e => setEditForm({...editForm, hireDate: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('status')}</label>
                      <select className="w-full border px-3 py-2 rounded bg-white" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value as EmploymentStatus})}>
                        <option value={EmploymentStatus.ACTIVE}>Active</option>
                        <option value={EmploymentStatus.PROBATION}>Probation</option>
                        <option value={EmploymentStatus.INACTIVE}>Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('department')}</label>
                      <select 
                        className="w-full border px-3 py-2 rounded bg-white" 
                        value={editForm.departmentName} onChange={e => setEditForm({...editForm, departmentName: e.target.value})} 
                      >
                        {COMMON_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('position')}</label>
                      <select 
                        className="w-full border px-3 py-2 rounded bg-white" 
                        value={editForm.position} onChange={e => setEditForm({...editForm, position: e.target.value})} 
                      >
                        {COMMON_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">{t('roleTitle')}</label>
                     <select className="w-full border px-3 py-2 rounded bg-white" value={editForm.roleTitle} onChange={e => setEditForm({...editForm, roleTitle: e.target.value as RoleTitle})}>
                       <RoleOptions />
                     </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-100">
                     <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">{t('salary')}</label>
                       <input 
                          type="text" 
                          className="w-full border px-3 py-2 rounded" 
                          value={formatNumber(editForm.baseSalary)} 
                          onChange={e => setEditForm({...editForm, baseSalary: Number(e.target.value.replace(/,/g, ''))})} 
                        />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between">
                           {t('insuranceSalary')}
                           {minWage > 0 && (
                                <button 
                                    type="button" 
                                    onClick={() => setEditForm({...editForm, insuranceSalary: minWage})}
                                    className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1 bg-indigo-50 px-2 rounded border border-indigo-100"
                                    title={`${t('applyMinWage')} (${formatNumber(minWage)})`}
                                >
                                    <RefreshCw size={10} /> Auto
                                </button>
                            )}
                       </label>
                       <input 
                          type="text" 
                          className="w-full border px-3 py-2 rounded" 
                          value={formatNumber(editForm.insuranceSalary)} 
                          onChange={e => setEditForm({...editForm, insuranceSalary: Number(e.target.value.replace(/,/g, ''))})} 
                        />
                     </div>
                  </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 border rounded-lg">{t('cancel')}</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg">{t('update')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve Account Modal (Permissions) */}
      {showApproveModal && approvingEmp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-green-50">
              <h3 className="font-bold text-lg text-green-800 flex items-center gap-2">
                <Shield size={20} />
                {t('approveAccount')}
              </h3>
              <button onClick={() => setShowApproveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                 <p className="text-sm text-slate-600">
                   Approving: <span className="font-bold text-slate-900">{approvingEmp.fullName}</span>
                 </p>
              </div>

              <div className="space-y-4">
                 <h4 className="font-semibold text-slate-800">{t('assignRole')}</h4>
                 
                 {/* Role Selection */}
                 <div className="grid grid-cols-2 gap-3">
                    {[Role.EMPLOYEE, Role.MANAGER, Role.HR, Role.ADMIN].map((r) => (
                      <button
                        key={r}
                        onClick={() => setApproveRole(r)}
                        className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                          approveRole === r 
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                 </div>

                 {/* Role Title & Salary */}
                 <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">{t('roleTitle')}</label>
                      <select className="w-full border rounded-lg px-3 py-2 bg-white" value={approveRoleTitle} onChange={e => setApproveRoleTitle(e.target.value as RoleTitle)}>
                        <RoleOptions />
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">{t('baseSalary')}</label>
                        <input 
                          type="text" 
                          className="w-full border rounded-lg px-3 py-2" 
                          value={formatNumber(approveSalary)} 
                          onChange={e => setApproveSalary(e.target.value.replace(/,/g, ''))} 
                        />
                      </div>
                      <div>
                         <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">{t('insuranceSalary')}</label>
                         <input 
                          type="text" 
                          className="w-full border rounded-lg px-3 py-2" 
                          value={formatNumber(approveInsuranceSalary)} 
                          onChange={e => setApproveInsuranceSalary(e.target.value.replace(/,/g, ''))} 
                        />
                      </div>
                    </div>
                 </div>

                 {/* Permissions Checkboxes */}
                 <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-4">
                    <p className="text-xs font-bold text-indigo-800 mb-2 uppercase">{t('grantPermissions')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                       {ALL_PERMISSIONS.map((perm) => (
                         <PermissionCheckbox 
                            key={perm} 
                            perm={perm} 
                            checked={approvePermissions.includes(perm)}
                            onChange={() => togglePerm(perm, true)}
                            label={t(`perm_${perm}`)}
                         />
                       ))}
                    </div>
                 </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowApproveModal(false)} className="flex-1 px-4 py-3 border rounded-lg hover:bg-slate-50 font-medium">
                  {t('cancel')}
                </button>
                <button 
                  onClick={handleApproveUser} 
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm font-medium flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} />
                  {t('grantPermissions')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Permissions Modal (For Existing Users) */}
      {showPermsModal && permUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-teal-50">
              <h3 className="font-bold text-lg text-teal-800 flex items-center gap-2">
                <Shield size={20} />
                {t('managePermissions')}
              </h3>
              <button onClick={() => setShowPermsModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
               <p className="text-sm text-slate-600">
                 Editing access rights for: <span className="font-bold text-slate-900">{permUser.email}</span> ({permUser.role})
               </p>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto border p-2 rounded-lg bg-slate-50">
                   {ALL_PERMISSIONS.map((perm) => (
                     <PermissionCheckbox 
                        key={perm} 
                        perm={perm} 
                        checked={permList.includes(perm)}
                        onChange={() => togglePerm(perm, false)}
                        label={t(`perm_${perm}`)}
                     />
                   ))}
               </div>

               <div className="flex gap-3 pt-2">
                <button onClick={() => setShowPermsModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50">
                  {t('cancel')}
                </button>
                <button 
                  onClick={handleSavePerms} 
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 shadow-sm"
                >
                  {t('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal - Same as before */}
      {showPasswordModal && passwordResetEmp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">{t('setPassword')}</h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSavePassword} className="p-6 space-y-4">
              <div><label className="block text-sm mb-1">{t('enterNewPassword')}</label><input type="text" className="w-full border px-3 py-2 rounded" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 border rounded-lg py-2">{t('cancel')}</button>
                <button type="submit" className="flex-1 bg-orange-600 text-white rounded-lg py-2">{t('save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
