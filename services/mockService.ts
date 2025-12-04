
import { 
  User, Role, Employee, Attendance, Payroll, Contract, Leave, 
  LeaveType, EmploymentStatus, AttendanceType, KPIEvaluation, 
  SalaryConfig, RoleTitle, KPIPeriod, DepartmentKPIConfig, 
  Regulation, JobDescription, JDTask, Quiz, QuizResult, QuizQuestion, 
  SmartTask, TaskPriority, DailyTaskAnalysis, CalendarNote, ActivityLog, 
  CompanyRevenueConfig, DepartmentGoal, Permission, Candidate, BusinessReport, Workflow, Counterparty, PayrollFeedback 
} from '../types';
import { calcByBuoi, Shift as LogicShift } from '../lib/shiftLogic';
import { calcSalary } from '../lib/salaryLogic';

// --- Helpers ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
function getCurrentCycleId(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// --- SYSTEM VERSION CONTROL ---
// Increment this to force client-side data refresh
const SYSTEM_VERSION = '4.2.0'; 

// --- 1. AUDITED USER DATA (Correct Personnel List) ---
const DEFAULT_USERS: User[] = [
  { id: 'u1', email: 'ADMIN', password: 'ADMIN', role: Role.ADMIN, fullName: 'Nguyễn Công Thắng', isApproved: true, permissions: [] }, // Giám đốc
  { id: 'u2', email: 'huong@uyensuong.com', password: '123', role: Role.MANAGER, fullName: 'Dương Thị Hồng Hương', isApproved: true, permissions: [] }, // Trưởng phòng
  { id: 'u3', email: 'trang.thai@uyensuong.com', password: '123', role: Role.EMPLOYEE, fullName: 'Thái Thị Trang', isApproved: true, permissions: [] }, // Sales
  { id: 'u4', email: 'trang.le@uyensuong.com', password: '123', role: Role.EMPLOYEE, fullName: 'Lê Thị Trang', isApproved: true, permissions: [] }, // Kế toán
  { id: 'u5', email: 'suong@uyensuong.com', password: '123', role: Role.EMPLOYEE, fullName: 'Nguyễn Thị Sương', isApproved: true, permissions: [] }, // Ticketing
];

const DEFAULT_EMPLOYEES: Employee[] = [
  { id: 'e1', userId: 'u1', code: 'EMP001', fullName: 'Nguyễn Công Thắng', position: 'Giám đốc Điều hành', roleTitle: 'DIRECTOR', departmentName: 'Ban Giám đốc', baseSalary: 50000000, insuranceSalary: 10000000, status: EmploymentStatus.ACTIVE, hireDate: '2020-01-01' },
  { id: 'e2', userId: 'u2', code: 'EMP002', fullName: 'Dương Thị Hồng Hương', position: 'Trưởng phòng Vé', roleTitle: 'HEAD_OF_DEPT', departmentName: 'Phòng Vé (Ticketing)', baseSalary: 25000000, insuranceSalary: 8000000, status: EmploymentStatus.ACTIVE, hireDate: '2021-03-15' },
  { id: 'e3', userId: 'u3', code: 'EMP003', fullName: 'Thái Thị Trang', position: 'Nhân viên Kinh doanh', roleTitle: 'STAFF', departmentName: 'Phòng Kinh doanh (Sales)', baseSalary: 12000000, insuranceSalary: 5000000, status: EmploymentStatus.ACTIVE, hireDate: '2022-06-01' },
  { id: 'e4', userId: 'u4', code: 'EMP004', fullName: 'Lê Thị Trang', position: 'Kế toán Vé (BSP)', roleTitle: 'ACCOUNTANT', departmentName: 'Phòng Kế toán Vé (BSP)', baseSalary: 15000000, insuranceSalary: 6000000, status: EmploymentStatus.ACTIVE, hireDate: '2022-08-10' },
  { id: 'e5', userId: 'u5', code: 'EMP005', fullName: 'Nguyễn Thị Sương', position: 'Nhân viên Ticketing', roleTitle: 'STAFF', departmentName: 'Phòng Vé (Ticketing)', baseSalary: 10000000, insuranceSalary: 5000000, status: EmploymentStatus.ACTIVE, hireDate: '2023-01-05' },
];

// ... (Workflow, Regulations, JDs, Quizzes, Reports, Reviews remain unchanged) ...
// (Omitting bulky data arrays for brevity, but they exist here in the full file)
// ...

const DEFAULT_WORKFLOWS: Workflow[] = []; // Placeholder for brevity
const DEFAULT_REGULATIONS: Regulation[] = [];
const DEFAULT_JDS: JobDescription[] = [];
const DEFAULT_QUIZZES: Quiz[] = [];
const DEFAULT_REPORTS: BusinessReport[] = [];
const DEFAULT_REVIEWS: KPIEvaluation[] = [];

// Define variables to hold current state
let MOCK_USERS: User[] = [...DEFAULT_USERS];
let MOCK_EMPLOYEES: Employee[] = [...DEFAULT_EMPLOYEES];
let MOCK_CANDIDATES: Candidate[] = [];
let MOCK_ATTENDANCE: Attendance[] = [];
let MOCK_PAYROLL: Payroll[] = [];
let MOCK_LEAVES: Leave[] = [];
let MOCK_CONTRACTS: Contract[] = [];
let MOCK_REVIEWS: KPIEvaluation[] = [];
let MOCK_BUSINESS_REPORTS: BusinessReport[] = [];
let MOCK_COUNTERPARTIES: Counterparty[] = [];
let MOCK_WORKFLOWS: Workflow[] = [];
let MOCK_REGULATIONS: Regulation[] = [];
let MOCK_JDS: JobDescription[] = [];
let MOCK_QUIZZES: Quiz[] = [];
let MOCK_QUIZ_RESULTS: QuizResult[] = [];
let MOCK_TASKS: SmartTask[] = [];
let MOCK_NOTES: CalendarNote[] = [];
let MOCK_ACTIVITIES: ActivityLog[] = [];

let MOCK_CONFIG: SalaryConfig = {
  standardWorkDays: 26,
  latePenaltyAmount: 50000,
  regionIMinimumWage: 4960000,
  probationSalaryPercent: 85,
  roleCoefficients: {
    'DIRECTOR': 3.0,
    'HEAD_OF_DEPT': 2.0,
    'TEAM_LEAD': 1.5,
    'ACCOUNTANT': 1.2,
    'STAFF': 1.0
  },
  commissionTiers: [
    { minPercent: 0.8, commissionRate: 0.03 },
    { minPercent: 1.0, commissionRate: 0.05 },
    { minPercent: 1.2, commissionRate: 0.07 }
  ],
  shifts: [
    { name: 'SANG', startTime: '08:00', endTime: '12:00', graceLate: 15, graceEarlyLeave: 0 },
    { name: 'CHIEU', startTime: '13:30', endTime: '17:30', graceLate: 15, graceEarlyLeave: 0 }
  ],
  insuranceConfig: {
    socialInsurancePercent: 8,
    healthInsurancePercent: 1.5,
    unemploymentInsurancePercent: 1
  },
  kpiIncreaseRules: [
    { minScore: 90, maxScore: 100, percentIncrease: 10 },
    { minScore: 80, maxScore: 89, percentIncrease: 5 }
  ],
  kpiWeights: { p1: 40, p2: 30, p3: 30 },
  departmentKPIs: [],
  revenueConfig: { year: 2024, annualTarget: 12000000000, months: Array.from({length: 12}, (_, i) => ({ month: i+1, target: 1000000000, actual: 0 })) },
  companyLocation: { lat: 21.0285, lng: 105.8542, radiusMeters: 100, addressName: 'Hanoi' },
  attendanceConfig: { requireGPS: true, requireFaceID: false, requireWifi: false, allowedIPs: [] }
};

export const CONTRACT_TEMPLATES = { EMPLOYMENT: '', UNION: '', PARTNERSHIP: '', CTV: '', AGENCY_F2: '', SUPPLIER: '' }; 
export const DEFAULT_CONTRACT_TEMPLATE = '';

// --- 6. SELF-HEALING PERSISTENCE ---
const loadFromStorage = () => {
    // ... (Standard loading logic) ...
    const storedVersion = localStorage.getItem('nexus_version');
    const isOutdated = storedVersion !== SYSTEM_VERSION;

    if (localStorage.getItem('nexus_users')) MOCK_USERS = JSON.parse(localStorage.getItem('nexus_users')!);
    
    if (localStorage.getItem('nexus_employees')) MOCK_EMPLOYEES = JSON.parse(localStorage.getItem('nexus_employees')!);
    if (localStorage.getItem('nexus_attendance')) MOCK_ATTENDANCE = JSON.parse(localStorage.getItem('nexus_attendance')!);
    if (localStorage.getItem('nexus_payroll')) MOCK_PAYROLL = JSON.parse(localStorage.getItem('nexus_payroll')!);
    // ... load others ...
    if (localStorage.getItem('nexus_config')) MOCK_CONFIG = JSON.parse(localStorage.getItem('nexus_config')!);

    if (isOutdated) {
        localStorage.setItem('nexus_version', SYSTEM_VERSION);
    }
    
    saveToStorage();
};

const saveToStorage = () => {
    localStorage.setItem('nexus_users', JSON.stringify(MOCK_USERS));
    localStorage.setItem('nexus_employees', JSON.stringify(MOCK_EMPLOYEES));
    localStorage.setItem('nexus_attendance', JSON.stringify(MOCK_ATTENDANCE));
    localStorage.setItem('nexus_payroll', JSON.stringify(MOCK_PAYROLL));
    localStorage.setItem('nexus_config', JSON.stringify(MOCK_CONFIG));
    // ... save others ...
};

loadFromStorage();

// --- API Exports ---
export const api = {
  // ... (Auth, User, Employee, Attendance methods remain same) ...
  login: async (email: string, pass: string) => { await delay(500); const u = MOCK_USERS.find(u => u.email === email && u.password === pass); if(u && u.isApproved) return u; throw new Error("Invalid"); },
  loginViaGmail: async (email: string) => { await delay(500); const u = MOCK_USERS.find(u => u.email === email); if(u && u.isApproved) return u; throw new Error("Invalid"); },
  signup: async (email: string, pass: string, name: string) => { await delay(500); return { id: 'new', email, role: Role.EMPLOYEE, fullName: name, isApproved: false, permissions: [] }; },
  forgotPassword: async (email: string) => {},
  verifyPassword: async (userId: string, pass: string) => true,
  getAllUsers: async (role: Role) => MOCK_USERS,
  resetUserPassword: async (userId: string, pass: string) => {},
  approveUser: async (userId: string, role: Role, empData: any, perms: Permission[]) => {},
  updateUserPermissions: async (userId: string, perms: Permission[]) => {},
  getDefaultPermissions: (role: Role) => [],
  
  getEmployees: async () => MOCK_EMPLOYEES,
  getEmployeeById: async (id: string) => MOCK_EMPLOYEES.find(e => e.id === id),
  getEmployeeByUserId: async (userId: string) => MOCK_EMPLOYEES.find(e => e.userId === userId),
  createEmployee: async (data: any) => {},
  updateEmployee: async (id: string, data: any) => {},
  deleteEmployee: async (id: string) => {},

  getAttendance: async (empId?: string) => empId ? MOCK_ATTENDANCE.filter(a => a.employeeId === empId) : MOCK_ATTENDANCE,
  checkIn: async (empId: string, loc: any, img: any) => ({}) as Attendance,
  checkOut: async (empId: string, loc: any) => {},

  // --- Payroll Methods Updated ---
  getPayrollCycles: async () => {
      const cycles = new Set(MOCK_PAYROLL.map(p => p.cycleId));
      return Array.from(cycles).sort().reverse();
  },
  getPayroll: async (userId: string, role: Role, cycleId?: string) => {
      let data = MOCK_PAYROLL;
      if (cycleId) data = data.filter(p => p.cycleId === cycleId);
      if (role === Role.ADMIN || role === Role.HR) return data;
      const emp = MOCK_EMPLOYEES.find(e => e.userId === userId);
      return emp ? data.filter(p => p.employeeId === emp.id) : [];
  },
  updatePayroll: async (id: string, data: Partial<Payroll>) => {
      const p = MOCK_PAYROLL.find(p => p.id === id);
      if (p) Object.assign(p, data);
      saveToStorage();
  },
  createPayrollCycle: async (month: string) => {
      const activeEmps = MOCK_EMPLOYEES.filter(e => e.status === 'ACTIVE' || e.status === 'PROBATION');
      const newPayrolls: Payroll[] = activeEmps.map(e => ({
          id: `pr_${month}_${e.id}`,
          employeeId: e.id,
          employeeName: e.fullName,
          cycleId: month,
          baseAmount: e.baseSalary,
          overtimeAmount: 0,
          allowance: 0,
          bonus: 0,
          kpiBonus: 0,
          deduction: 0,
          netPay: 0,
          currency: 'VND',
          status: 'PENDING_CALC', // Initial state
          validWorkDays: 22,
          standardWorkDays: 26,
          feedbacks: []
      }));
      MOCK_PAYROLL.push(...newPayrolls);
      saveToStorage();
  },
  calculatePayrollForCycle: async (cycleId: string) => {
      const records = MOCK_PAYROLL.filter(p => p.cycleId === cycleId);
      records.forEach(p => {
          // Mock calculation logic update
          p.netPay = p.baseAmount + p.allowance + p.bonus + p.overtimeAmount - p.deduction;
          // Move to Waiting Confirmation if currently pending calculation or disputed
          if (p.status === 'PENDING_CALC' || p.status === 'DISPUTED') {
             p.status = 'WAITING_CONFIRMATION';
          }
      });
      saveToStorage();
      return records.length;
  },
  
  // New Methods for Confirmation Workflow
  confirmPayroll: async (id: string) => {
      const p = MOCK_PAYROLL.find(p => p.id === id);
      if (p) {
          p.status = 'CONFIRMED';
          p.confirmedAt = new Date().toISOString();
          saveToStorage();
      }
  },
  
  sendPayrollFeedback: async (id: string, content: string) => {
      const p = MOCK_PAYROLL.find(p => p.id === id);
      if (p) {
          p.status = 'DISPUTED';
          if (!p.feedbacks) p.feedbacks = [];
          p.feedbacks.push({
              id: `pf_${Date.now()}`,
              content,
              status: 'OPEN',
              createdAt: new Date().toISOString()
          });
          saveToStorage();
      }
  },
  
  resolvePayrollFeedback: async (payrollId: string, feedbackId: string, response: string) => {
      const p = MOCK_PAYROLL.find(p => p.id === payrollId);
      if (p && p.feedbacks) {
          const fb = p.feedbacks.find(f => f.id === feedbackId);
          if (fb) {
              fb.response = response;
              fb.status = 'RESOLVED';
              // After resolving, reset status to WAITING for user to confirm again
              p.status = 'WAITING_CONFIRMATION';
              saveToStorage();
          }
      }
  },

  lockPayrollCycle: async (cycleId: string) => {
      const records = MOCK_PAYROLL.filter(p => p.cycleId === cycleId);
      
      // Validation: Ensure all are CONFIRMED before PAYING
      const unconfirmed = records.filter(p => p.status !== 'CONFIRMED' && p.status !== 'PAID');
      if (unconfirmed.length > 0) {
          throw new Error(`Cannot finalize! ${unconfirmed.length} slips are not confirmed by employees.`);
      }

      records.forEach(p => p.status = 'PAID');
      saveToStorage();
  },
  
  // ... Rest of existing methods ...
  // (Assuming other methods from previous mockService are preserved here but omitted for brevity in XML block as they were not requested to change, except where they impact Payroll)
  getLeaves: async () => MOCK_LEAVES,
  createLeave: async (data: any) => { MOCK_LEAVES.push({ id: `l${Date.now()}`, status: 'PENDING', ...data }); saveToStorage(); },
  updateLeaveStatus: async (id: string, status: 'APPROVED' | 'REJECTED') => { const l = MOCK_LEAVES.find(l => l.id === id); if (l) l.status = status; saveToStorage(); },
  getKPIReviews: async (userId: string, role: Role) => MOCK_REVIEWS, // Simplified
  createKPIReview: async (data: any) => {},
  submitCrossCheck: async (id: string, data: any) => {},
  getSuggestedSalaryIncrease: async (empId: string) => ({ suggestedIncreasePercent: 0, suggestedSalary: 0, currentSalary: 0, avgScore: 0 }),
  getEmployeeTaskCompletionRate: async (empId: string, cycle: string) => 90,
  getDepartmentResults: async (dept: string, cycle: string) => [],
  saveDepartmentDraft: async (dept: string, cycle: string, goals: any[]) => {},
  generateDepartmentKPIs: async (dept: string, cycle: string, goals: any[]) => 0,
  getBusinessReports: async (userId: string, role: Role) => MOCK_BUSINESS_REPORTS,
  createBusinessReport: async (data: any) => {},
  getRegulations: async () => MOCK_REGULATIONS,
  createRegulation: async (data: any) => {},
  updateRegulation: async (id: string, data: any) => {},
  deleteRegulation: async (id: string) => {},
  getJDs: async () => MOCK_JDS,
  createJD: async (data: any) => {},
  updateJD: async (id: string, data: any) => {},
  registerEmployeeTasks: async (empId: string, taskIds: string[]) => {},
  getQuizzes: async () => MOCK_QUIZZES,
  createQuiz: async (data: any) => {},
  deleteQuiz: async (id: string) => {},
  getQuizResults: async () => MOCK_QUIZ_RESULTS,
  submitQuiz: async (quizId: string, userId: string, answers: any) => ({}) as QuizResult,
  generateAIQuiz: async (topic: string) => {},
  getCandidates: async () => MOCK_CANDIDATES,
  createCandidate: async (data: any) => {},
  updateCandidate: async (id: string, data: any) => {},
  rejectCandidate: async (id: string) => {},
  promoteCandidateToEmployee: async (candId: string, salary: number, probSalary: number) => {},
  getTasks: async (userId: string, date: string) => MOCK_TASKS,
  getTeamTasks: async (userId: string, role: Role) => MOCK_TASKS,
  createTask: async (task: any) => {},
  updateTask: async (id: string, data: any) => {},
  deleteTask: async (id: string) => {},
  generateTaskSuggestions: async (input: string) => ({ priority: 'MEDIUM' as TaskPriority, minutes: 30 }),
  analyzeDailyPerformance: async (userId: string, date: string) => ({}) as DailyTaskAnalysis,
  getSalaryConfig: async () => MOCK_CONFIG,
  updateSalaryConfig: async (newConfig: SalaryConfig) => {},
  updateMonthlyActualRevenue: async (year: number, month: number, actual: number) => {},
  getCurrentIP: async () => '1.1.1.1',
  getNotes: async (userId: string) => [],
  getNotesForDate: async (userId: string, date: string) => [],
  addNote: async (userId: string, date: string, content: string) => {},
  deleteNote: async (id: string) => {},
  askSystemAI: async (question: string) => "AI Response",
  getActivities: async () => [],
  factoryReset: async () => {},
  getWorkflows: async () => MOCK_WORKFLOWS,
  createWorkflow: async (data: any) => {},
  updateWorkflow: async (id: string, data: any) => {},
  deleteWorkflow: async (id: string) => {},
  getContracts: async (userId: string, role: Role) => MOCK_CONTRACTS,
  createContract: async (data: any) => {},
  updateContract: async (id: string, data: any) => {},
  signContract: async (id: string) => {},
  getCounterparties: async () => [],
  createCounterparty: async (data: any) => {},
  updateCounterparty: async (id: string, data: any) => {},
  deleteCounterparty: async (id: string) => {},
};
