
export type RoleTitle = 'STAFF' | 'TEAM_LEAD' | 'HEAD_OF_DEPT' | 'DIRECTOR' | 'ACCOUNTANT';

export enum Role {
  ADMIN = 'ADMIN',
  HR = 'HR',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE'
}

export enum EmploymentStatus {
  ACTIVE = 'ACTIVE',
  PROBATION = 'PROBATION',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING' // New status for awaiting approval
}

export enum AttendanceType {
  REGULAR = 'REGULAR',
  WFH = 'WFH',
  OVERTIME = 'OVERTIME'
}

export type AttendanceStatus = 'PENDING' | 'COMPLETED' | 'LATE' | 'ABSENT' | 'LEAVE';

export enum LeaveType {
  ANNUAL = 'ANNUAL',
  SICK = 'SICK',
  UNPAID = 'UNPAID'
}

// Granular Permissions
export type Permission = 
  | 'VIEW_DASHBOARD'
  | 'MANAGE_EMPLOYEES' // Add, Edit, Delete
  | 'VIEW_ALL_EMPLOYEES'
  | 'MANAGE_ATTENDANCE' // Check in/out for others
  | 'VIEW_ALL_ATTENDANCE'
  | 'MANAGE_PAYROLL' // Calculate, Finalize, Edit
  | 'VIEW_ALL_PAYROLL'
  | 'MANAGE_LEAVES' // Approve/Reject
  | 'MANAGE_CONTRACTS'
  | 'MANAGE_KPI' // New permission
  | 'VIEW_REPORTS' // New: Access Overview Reports
  | 'MANAGE_REGULATIONS' // New: Add/Edit Company Rules
  | 'MANAGE_JDS' // New: Manage Job Descriptions
  | 'MANAGE_ASSESSMENTS' // New: Create Quizzes
  | 'MANAGE_TASKS' // New: Personal Smart Tasks
  | 'USE_AI_ASSISTANT' // New: Access specialized Airline Chatbot
  | 'MANAGE_RECRUITMENT' // New: Manage Candidates & Hiring
  | 'MANAGE_WORKFLOWS' // New: Manage SOPs
  | 'SYSTEM_CONFIG' // Access Settings
  | 'FACTORY_RESET';

export interface User {
  id: string;
  email: string;
  role: Role;
  fullName: string;
  password?: string;
  isApproved: boolean;
  permissions: Permission[]; // List of active permissions
}

export type Language = 'en' | 'vi';

export interface Department {
  id: string;
  name: string;
}

export interface Employee {
  id: string;
  userId?: string; // Link to User
  code: string;
  fullName: string;
  
  // Personal Info
  birthDate?: string; // ISO Date
  citizenId?: string; // CCCD
  address?: string;

  position: string;
  roleTitle: RoleTitle;
  departmentId?: string;
  departmentName?: string;
  baseSalary: number;     // Lương thực nhận/thỏa thuận
  insuranceSalary: number; // Lương đóng bảo hiểm (Theo quy định)
  status: EmploymentStatus;
  hireDate: string; // ISO Date
  contractId?: string;
  
  // Task Registry
  registeredTaskIds?: string[]; // IDs of JDTasks selected
}

// --- Recruitment ---
export type CandidateStatus = 'APPLIED' | 'TESTING' | 'INTERVIEW' | 'HIRED' | 'REJECTED';

export interface Candidate {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  positionApplied: string;
  departmentApplied: string;
  status: CandidateStatus;
  quizScore?: number; // Result from assessment
  quizId?: string;
  interviewScore?: number;
  notes?: string;
  appliedDate: string;
}

export interface ShiftBreakdownItem {
  name: string; // 'SANG', 'CHIEU'
  hours: number;
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string; // ISO Date string
  checkOut?: string; // ISO Date string
  type: AttendanceType;
  status: AttendanceStatus;
  hours: number;
  shiftBreakdown?: ShiftBreakdownItem[]; // Details of hours per shift
  overtimeHours: number;
  penalty?: number; // Fine amount if late
  
  // GPS Data
  checkInLocation?: { lat: number; lng: number; address?: string; warning?: boolean };
  checkOutLocation?: { lat: number; lng: number };
  
  // Face ID Data
  faceImage?: string; // Base64 string of the capture
  
  isHoliday?: boolean; // 150% Rate
  
  // Excuses
  lateReason?: string;
  earlyReason?: string;
  isExcused?: boolean;
}

// --- Payroll Enhanced Types ---
export type PayrollStatus = 'PENDING_CALC' | 'WAITING_CONFIRMATION' | 'CONFIRMED' | 'DISPUTED' | 'PAID';

export interface PayrollFeedback {
  id: string;
  content: string; // Employee question
  response?: string; // HR Response
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
  resolvedAt?: string;
}

export interface Payroll {
  id: string;
  employeeId: string;
  employeeName: string;
  cycleId: string;
  baseAmount: number;
  overtimeAmount: number;
  allowance: number;
  bonus: number;
  kpiBonus: number;
  deduction: number;
  netPay: number;
  currency: string;
  
  status: PayrollStatus; // Updated Enum
  confirmedAt?: string; // Timestamp when employee clicked confirm
  feedbacks?: PayrollFeedback[]; // List of disputes/questions

  // New fields for calculation
  salesTarget?: number;
  salesAchieved?: number;
  validWorkDays?: number;
  standardWorkDays?: number;
}

// --- Contracts Management ---

export type ContractCategory = 'INTERNAL' | 'EXTERNAL';
export type CounterpartyType = 'INDIVIDUAL' | 'BUSINESS';

export interface Counterparty {
  id: string;
  type: CounterpartyType;
  name: string; // Company Name or Full Name
  taxId?: string; // MST (For Business)
  representative?: string; // Representative Name (For Business)
  citizenId?: string; // CCCD (For Individual)
  address: string;
  phone?: string;
  email?: string;
}

export interface Contract {
  id: string;
  category: ContractCategory; // INTERNAL (Employee) or EXTERNAL (Partner)
  
  // For Internal
  employeeId?: string;
  employeeName?: string;
  
  // For External
  counterpartyId?: string;
  counterpartyName?: string;

  type: string; // e.g., "HĐ Lao động", "HĐ Đối tác"
  startDate: string;
  endDate?: string;
  status: 'PENDING' | 'SIGNED' | 'EXPIRED' | 'TERMINATED';
  content: string; // HTML/Markdown content
  signedAt?: string;
}

export interface Leave {
  id: string;
  employeeId: string;
  employeeName: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string;
}

// --- Company Regulations ---
export interface Regulation {
  id: string;
  title: string;
  content: string;
  category: string; // e.g., "General", "Attendance", "Benefits"
  createdAt: string;
  updatedAt: string;
}

// --- Job Descriptions ---
export interface JDTask {
  id: string;
  content: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  salaryWeight: number; // Impact on salary increase potential (%)
}

export interface JobDescription {
  id: string;
  departmentName: string;
  position: string; // e.g., "Nhân viên Ticketing"
  baseSalaryRange?: string; // NEW: Recommended Salary Range (e.g. "8.000.000 - 12.000.000")
  description: string; // HTML/Text
  responsibilities: string;
  requirements: string; // Skills required
  benefits: string;
  tasks?: JDTask[]; // Specific checklist items
}

// --- Competency Assessments (Quizzes) ---
export interface QuizQuestion {
  id: string;
  text: string;
  options: string[]; // Array of 4 options
  correctIndex: number; // 0-3
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  departmentTarget?: string; // e.g., "Phòng Vé" or null for all
  questions: QuizQuestion[];
  timeLimitMinutes: number;
  createdAt: string;
}

export interface QuizResult {
  id: string;
  quizId: string;
  quizTitle: string;
  employeeId: string; // Can be employee ID or Candidate ID
  employeeName: string;
  score: number; // 0-100
  totalQuestions: number;
  correctAnswers: number;
  takenAt: string;
}

// --- Calendar Notes ---
export interface CalendarNote {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  content: string;
  isRead: boolean;
  createdAt: string;
}

// --- Smart Task Management ---
export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'POSTPONED';

export interface SmartTask {
  id: string;
  userId: string;
  title: string;
  date: string; // YYYY-MM-DD
  priority: TaskPriority;
  estimatedMinutes: number; // AI Suggested or User set
  status: TaskStatus;
  reasonForDelay?: string; // For end of day analysis
  createdAt: string;
  jdTaskId?: string; // Link to a registered JD Task
}

export interface DailyTaskAnalysis {
  date: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  totalTimeScheduled: number;
  efficiencyScore: number; // 0-100
  feedback: string; // AI Generated feedback
}

// --- Workflows (New) ---
export interface WorkflowStep {
  id: string;
  order: number;
  name: string;
  description: string;
  roleResponsible: RoleTitle | 'ALL';
  estimatedTime?: string; // e.g. "2 hours", "1 day"
  approvalRequired: boolean; // Is this a gate?
  linkedModule?: string; // URL path for integration e.g. "/payroll"
}

export interface Workflow {
  id: string;
  department: string; // Target Dept
  title: string;
  description: string;
  steps: WorkflowStep[];
  lastUpdated: string;
}

// --- Activity Log (For Dashboard) ---
export interface ActivityLog {
  id: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  content: string; // e.g., "John checked in", "Payroll finalized"
  timestamp: string;
  actorName?: string; // Who did it
}

// --- Business Reports (New) ---
export type ReportType = 'WEEK' | 'MONTH' | 'YEAR';

export interface BusinessReport {
  id: string;
  creatorId: string;
  creatorName: string;
  department: string;
  type: ReportType;
  period: string; // e.g. "Week 42 - 2024", "October 2024", "2024"
  title: string;
  content: string; // Main report content
  achievements?: string;
  issues?: string;
  nextPlan?: string;
  createdAt: string;
}

// --- KPI Types ---

export type KPIPeriod = 'MONTH' | 'QUARTER' | 'YEAR';
export type KPIStatus = 'PENDING_REVIEW' | 'COMPLETED';

export interface KPICriterion {
  id: string;
  name: string; // e.g., "Total Revenue", "Bug Rate"
  weight: number; // Percentage 0-100
}

export interface DepartmentGoal {
  id: string;
  name: string; // e.g., "Monthly Revenue Target"
  target: number; 
  unit: string; // e.g., "VND", "Clients", "%", "Orders"
  weight: number; // Weight in the P3 score calculation (0-100)
}

export interface DepartmentKPIConfig {
  departmentName: string;
  criteria: KPICriterion[]; // Individual criteria
  goals: DepartmentGoal[]; // New: Department level goals for automation
}

export interface KPIEvaluation {
  id: string;
  employeeId: string;
  employeeName: string;
  period: KPIPeriod;
  cycle: string; // e.g. "2023-11" for month, "2023-Q4" for quarter, "2023" for year
  status: KPIStatus; // Self-Assessment vs Final

  // Final Scoring (Approved by Manager)
  scoreP1: number; // Position (Task Completion - derived from Smart Tasks)
  scoreP2: number; // Person (Competency/Attitude)
  scoreP3: number; // Performance (Results/Sales/Profit)
  
  // Self Assessment Data (Employee Input)
  selfAssessment?: {
    scoreP1: number;
    scoreP2: number;
    scoreP3: number;
    criteriaDetails?: {
        name: string;
        weight: number;
        score: number; // Employee's self score
    }[];
    notes: string;
  };

  // Detailed Criteria Scores (Final/Manager Snapshot)
  criteriaDetails?: {
    name: string;
    weight: number;
    score: number; // Manager's score
  }[];

  totalScore: number; // Weighted Average
  
  notes: string; // Manager notes
  evaluatedBy: string; // User Name (Manager)
  evaluatedAt: string;
  
  taskCompletionRate?: number; // Store the connected task rate
}

export interface KPIIncreaseRule {
  minScore: number;
  maxScore: number;
  percentIncrease: number; // e.g., 0.10 for 10%
}

export interface KPIWeights {
  p1: number; // Weight % for P1
  p2: number; // Weight % for P2
  p3: number; // Weight % for P3
}

// --- Configuration Types ---

export interface ShiftConfig {
  name: string;
  startTime: string; // "07:30"
  endTime: string;   // "11:30"
  graceLate: number; // Minutes
  graceEarlyLeave: number; // Minutes
  breakMinutes?: number;
}

export interface CommissionTier {
  minPercent: number; // e.g., 0.8 (80%)
  commissionRate: number; // e.g., 0.03 (3%)
}

export interface InsuranceConfig {
  socialInsurancePercent: number; // BHXH (e.g. 8%)
  healthInsurancePercent: number; // BHYT (e.g. 1.5%)
  unemploymentInsurancePercent: number; // BHTN (e.g. 1.5%)
}

// New: Company Revenue Configuration
export interface MonthlyRevenueTarget {
  month: number; // 1-12
  target: number;
  actual: number;
}

export interface CompanyRevenueConfig {
  year: number;
  annualTarget: number;
  months: MonthlyRevenueTarget[];
}

export interface CompanyLocationConfig {
  lat: number;
  lng: number;
  radiusMeters: number; // Allowed radius
  addressName: string;
}

// New: Attendance Verification Configuration
export interface AttendanceConfig {
  requireGPS: boolean;
  requireFaceID: boolean;
  requireWifi: boolean;
  allowedIPs: string[];
}

export interface SalaryConfig {
  standardWorkDays: number; // Default 26
  latePenaltyAmount: number; // Configurable fine for late check-in
  regionIMinimumWage: number; // Configurable Region I Minimum Wage
  probationSalaryPercent: number; // NEW: % of official salary for probation (e.g. 85)
  roleCoefficients: Record<RoleTitle, number>;
  commissionTiers: CommissionTier[];
  shifts: ShiftConfig[];
  insuranceConfig: InsuranceConfig;
  kpiIncreaseRules: KPIIncreaseRule[];
  kpiWeights: KPIWeights; // New 3P Weights
  departmentKPIs: DepartmentKPIConfig[]; // Department Specific Criteria & Goals
  revenueConfig: CompanyRevenueConfig; // New: Company Revenue Targets
  companyLocation: CompanyLocationConfig; // New: GPS Config
  attendanceConfig: AttendanceConfig; // New: Smart Attendance Config
}

// --- AI Assistant ---
export interface AIChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
  actionLink?: string; // URL path to redirect if needed
}
