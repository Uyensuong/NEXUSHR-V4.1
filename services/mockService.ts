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
// UPDATE TO 4.8.0 TO FORCE FULL DATA RESTORE & LOGIC SYNC
const SYSTEM_VERSION = '4.8.0'; 

// --- 1. USER DATA ---
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

// --- WORKFLOWS (SOP) - RESTORED FULL SET (21 SOPs) ---
const DEFAULT_WORKFLOWS: Workflow[] = [
  // 1. Ticketing Dept
  {
    id: 'wf_tk_1', department: 'Phòng Vé (Ticketing)', title: 'SOP 01: Quy trình Xuất vé Quốc tế', lastUpdated: new Date().toISOString(),
    description: 'Quy trình chuẩn từ khi nhận yêu cầu đến khi xuất vé.',
    steps: [
      { id: 's1', order: 1, name: 'Tiếp nhận Yêu cầu', description: 'Nhận thông tin hành trình, passport, visa.', roleResponsible: 'STAFF', estimatedTime: '15 mins', approvalRequired: false },
      { id: 's2', order: 2, name: 'Báo giá & Giữ chỗ', description: 'Check giá Sabre/Amadeus, báo khách.', roleResponsible: 'STAFF', estimatedTime: '30 mins', approvalRequired: false },
      { id: 's3', order: 3, name: 'Xác nhận Thanh toán', description: 'Kế toán confirm tiền nổi.', roleResponsible: 'ACCOUNTANT', estimatedTime: '10 mins', approvalRequired: true },
      { id: 's4', order: 4, name: 'Xuất vé (Issue)', description: 'Thực hiện lệnh xuất vé.', roleResponsible: 'STAFF', estimatedTime: '10 mins', approvalRequired: false }
    ]
  },
  {
    id: 'wf_tk_2', department: 'Phòng Vé (Ticketing)', title: 'SOP 02: Quy trình Hoàn/Hủy vé', lastUpdated: new Date().toISOString(),
    description: 'Xử lý yêu cầu hoàn vé tự nguyện hoặc do hãng.',
    steps: [
      { id: 's1', order: 1, name: 'Check điều kiện', description: 'Kiểm tra Fare Basis, phí hoàn.', roleResponsible: 'STAFF', estimatedTime: '20 mins', approvalRequired: false },
      { id: 's2', order: 2, name: 'Gửi Request Hãng', description: 'Thao tác Refund trên hệ thống.', roleResponsible: 'HEAD_OF_DEPT', estimatedTime: '24 hours', approvalRequired: true },
      { id: 's3', order: 3, name: 'Chi tiền khách', description: 'Kế toán chi tiền sau khi hãng trả.', roleResponsible: 'ACCOUNTANT', estimatedTime: '7-30 days', approvalRequired: true }
    ]
  },
  {
    id: 'wf_tk_3', department: 'Phòng Vé (Ticketing)', title: 'SOP 03: Xử lý Đổi ngày/Đổi hành trình', lastUpdated: new Date().toISOString(),
    description: 'Quy trình Reissue/Exchange vé.',
    steps: [
      { id: 's1', order: 1, name: 'Tính phí đổi', description: 'Tính chênh lệch giá + phí đổi.', roleResponsible: 'STAFF', estimatedTime: '15 mins', approvalRequired: false },
      { id: 's2', order: 2, name: 'Thu tiền', description: 'Khách thanh toán phí đổi.', roleResponsible: 'STAFF', estimatedTime: '10 mins', approvalRequired: true },
      { id: 's3', order: 3, name: 'Reissue Ticket', description: 'Thao tác đổi vé trên GDS.', roleResponsible: 'STAFF', estimatedTime: '10 mins', approvalRequired: false }
    ]
  },

  // 2. Sales Dept
  {
    id: 'wf_sale_1', department: 'Phòng Kinh doanh (Sales)', title: 'SOP 04: Tìm kiếm Đại lý F2 mới', lastUpdated: new Date().toISOString(),
    description: 'Quy trình phát triển mạng lưới đại lý.',
    steps: [
      { id: 's1', order: 1, name: 'Tiếp cận', description: 'Sale call, Email marketing.', roleResponsible: 'STAFF', estimatedTime: 'Daily', approvalRequired: false },
      { id: 's2', order: 2, name: 'Gửi Chính sách', description: 'Gửi bảng hoa hồng, điều kiện.', roleResponsible: 'STAFF', estimatedTime: '1 day', approvalRequired: false },
      { id: 's3', order: 3, name: 'Ký Hợp đồng', description: 'Ký hợp đồng đại lý.', roleResponsible: 'HEAD_OF_DEPT', estimatedTime: '3 days', approvalRequired: true }
    ]
  },
  {
    id: 'wf_sale_2', department: 'Phòng Kinh doanh (Sales)', title: 'SOP 05: Chăm sóc Đại lý định kỳ', lastUpdated: new Date().toISOString(),
    description: 'Duy trì quan hệ và thúc đẩy doanh số.',
    steps: [
      { id: 's1', order: 1, name: 'Phân loại', description: 'Phân nhóm Vàng/Bạc/Đồng.', roleResponsible: 'STAFF', estimatedTime: 'Monthly', approvalRequired: false },
      { id: 's2', order: 2, name: 'Thăm hỏi', description: 'Gặp mặt hoặc gọi điện hỗ trợ.', roleResponsible: 'STAFF', estimatedTime: 'Weekly', approvalRequired: false }
    ]
  },
  {
    id: 'wf_sale_3', department: 'Phòng Kinh doanh (Sales)', title: 'SOP 06: Thu hồi công nợ', lastUpdated: new Date().toISOString(),
    description: 'Quy trình nhắc nợ và thu hồi.',
    steps: [
      { id: 's1', order: 1, name: 'Đối chiếu', description: 'Gửi bảng kê công nợ ngày 1-5.', roleResponsible: 'ACCOUNTANT', estimatedTime: '5 days', approvalRequired: false },
      { id: 's2', order: 2, name: 'Đôn đốc', description: 'Sale nhắc đại lý thanh toán.', roleResponsible: 'STAFF', estimatedTime: '3 days', approvalRequired: false },
      { id: 's3', order: 3, name: 'Khóa code', description: 'Khóa xuất vé nếu quá hạn.', roleResponsible: 'DIRECTOR', estimatedTime: 'Immediate', approvalRequired: true }
    ]
  },

  // 3. Accounting Dept
  {
    id: 'wf_acc_1', department: 'Phòng Kế toán Vé (BSP)', title: 'SOP 07: Báo cáo BSP định kỳ', lastUpdated: new Date().toISOString(),
    description: 'Quy trình báo cáo bán cho IATA.',
    steps: [
      { id: 's1', order: 1, name: 'Tải báo cáo GDS', description: 'Lấy số liệu từ Sabre/Amadeus.', roleResponsible: 'STAFF', estimatedTime: '2 hours', approvalRequired: false },
      { id: 's2', order: 2, name: 'Đối chiếu', description: 'So khớp với phần mềm kế toán.', roleResponsible: 'ACCOUNTANT', estimatedTime: '4 hours', approvalRequired: true },
      { id: 's3', order: 3, name: 'Nộp tiền', description: 'Thanh toán cho IATA.', roleResponsible: 'DIRECTOR', estimatedTime: '1 day', approvalRequired: true }
    ]
  },
  {
    id: 'wf_acc_2', department: 'Phòng Kế toán Vé (BSP)', title: 'SOP 08: Xuất hóa đơn GTGT', lastUpdated: new Date().toISOString(),
    description: 'Quy trình xuất hóa đơn điện tử cho khách.',
    steps: [
      { id: 's1', order: 1, name: 'Nhận yêu cầu', description: 'Thông tin xuất hóa đơn từ Sale.', roleResponsible: 'STAFF', estimatedTime: '10 mins', approvalRequired: false },
      { id: 's2', order: 2, name: 'Kiểm tra', description: 'Check mã số thuế, địa chỉ.', roleResponsible: 'ACCOUNTANT', estimatedTime: '5 mins', approvalRequired: false },
      { id: 's3', order: 3, name: 'Phát hành', description: 'Ký số và gửi email cho khách.', roleResponsible: 'ACCOUNTANT', estimatedTime: '5 mins', approvalRequired: false }
    ]
  },
  {
    id: 'wf_acc_3', department: 'Phòng Kế toán Vé (BSP)', title: 'SOP 09: Thanh toán Lương', lastUpdated: new Date().toISOString(),
    description: 'Quy trình tính và chi lương.',
    steps: [
      { id: 's1', order: 1, name: 'Chốt công', description: 'Chốt bảng chấm công ngày 26.', roleResponsible: 'HEAD_OF_DEPT', estimatedTime: '1 day', approvalRequired: true },
      { id: 's2', order: 2, name: 'Tính lương', description: 'Chạy bảng lương trên hệ thống.', roleResponsible: 'ACCOUNTANT', estimatedTime: '2 days', approvalRequired: false },
      { id: 's3', order: 3, name: 'Duyệt chi', description: 'Giám đốc ký duyệt.', roleResponsible: 'DIRECTOR', estimatedTime: '1 day', approvalRequired: true },
      { id: 's4', order: 4, name: 'Bank Transfer', description: 'Chuyển khoản.', roleResponsible: 'ACCOUNTANT', estimatedTime: '4 hours', approvalRequired: false }
    ]
  },

  // 4. HR Dept
  {
    id: 'wf_hr_1', department: 'Phòng Nhân sự', title: 'SOP 10: Tuyển dụng Nhân sự', lastUpdated: new Date().toISOString(),
    description: 'Quy trình từ đăng tuyển đến nhận việc.',
    steps: [
      { id: 's1', order: 1, name: 'Đăng tuyển', description: 'Đăng tin các kênh.', roleResponsible: 'STAFF', estimatedTime: '1 week', approvalRequired: false },
      { id: 's2', order: 2, name: 'Phỏng vấn', description: 'Sơ vấn và chuyên môn.', roleResponsible: 'HEAD_OF_DEPT', estimatedTime: '3 days', approvalRequired: false },
      { id: 's3', order: 3, name: 'Offer', description: 'Gửi thư mời nhận việc.', roleResponsible: 'HEAD_OF_DEPT', estimatedTime: '1 day', approvalRequired: true }
    ]
  },
  {
    id: 'wf_hr_2', department: 'Phòng Nhân sự', title: 'SOP 11: Đào tạo Hội nhập', lastUpdated: new Date().toISOString(),
    description: 'Quy trình onboarding nhân viên mới.',
    steps: [
      { id: 's1', order: 1, name: 'Chuẩn bị', description: 'Email, chỗ ngồi, máy tính.', roleResponsible: 'STAFF', estimatedTime: '1 day', approvalRequired: false },
      { id: 's2', order: 2, name: 'Giới thiệu', description: 'Giới thiệu công ty, quy định.', roleResponsible: 'STAFF', estimatedTime: '2 hours', approvalRequired: false },
      { id: 's3', order: 3, name: 'Đào tạo nghiệp vụ', description: 'Trưởng bộ phận hướng dẫn.', roleResponsible: 'HEAD_OF_DEPT', estimatedTime: '1 week', approvalRequired: false }
    ]
  },
  {
    id: 'wf_hr_3', department: 'Phòng Nhân sự', title: 'SOP 12: Thôi việc / Nghỉ việc', lastUpdated: new Date().toISOString(),
    description: 'Quy trình offboarding.',
    steps: [
      { id: 's1', order: 1, name: 'Nhận đơn', description: 'Nhận đơn xin nghỉ.', roleResponsible: 'HEAD_OF_DEPT', estimatedTime: '1 day', approvalRequired: true },
      { id: 's2', order: 2, name: 'Bàn giao', description: 'Bàn giao tài sản, công việc.', roleResponsible: 'STAFF', estimatedTime: 'Var', approvalRequired: true },
      { id: 's3', order: 3, name: 'Chốt lương', description: 'Thanh toán lương ngày cuối.', roleResponsible: 'ACCOUNTANT', estimatedTime: 'Next Cycle', approvalRequired: false }
    ]
  },

  // 5. Customer Care
  {
    id: 'wf_cs_1', department: 'Phòng Chăm sóc Khách hàng', title: 'SOP 13: Xử lý Khiếu nại', lastUpdated: new Date().toISOString(),
    description: 'Giải quyết phàn nàn của khách hàng.',
    steps: [
      { id: 's1', order: 1, name: 'Tiếp nhận', description: 'Ghi nhận thông tin.', roleResponsible: 'STAFF', estimatedTime: '10 mins', approvalRequired: false },
      { id: 's2', order: 2, name: 'Xác minh', description: 'Làm việc với các bộ phận liên quan.', roleResponsible: 'TEAM_LEAD', estimatedTime: '4 hours', approvalRequired: false },
      { id: 's3', order: 3, name: 'Phản hồi', description: 'Trả lời và đền bù (nếu có).', roleResponsible: 'HEAD_OF_DEPT', estimatedTime: '24 hours', approvalRequired: true }
    ]
  },
  {
    id: 'wf_cs_2', department: 'Phòng Chăm sóc Khách hàng', title: 'SOP 14: Khảo sát Hài lòng', lastUpdated: new Date().toISOString(),
    description: 'Đánh giá chất lượng dịch vụ sau bán.',
    steps: [
      { id: 's1', order: 1, name: 'Gửi mẫu', description: 'Gửi form khảo sát sau khi bay.', roleResponsible: 'STAFF', estimatedTime: 'Weekly', approvalRequired: false },
      { id: 's2', order: 2, name: 'Tổng hợp', description: 'Báo cáo kết quả.', roleResponsible: 'TEAM_LEAD', estimatedTime: 'Monthly', approvalRequired: false }
    ]
  },
  {
    id: 'wf_cs_3', department: 'Phòng Chăm sóc Khách hàng', title: 'SOP 15: Chăm sóc Khách VIP', lastUpdated: new Date().toISOString(),
    description: 'Quy trình đặc biệt cho khách hàng lớn.',
    steps: [
      { id: 's1', order: 1, name: 'Nhận diện', description: 'Xác định khách VIP.', roleResponsible: 'STAFF', estimatedTime: 'Immediate', approvalRequired: false },
      { id: 's2', order: 2, name: 'Theo dõi chuyến bay', description: 'Check-in online, theo dõi delay.', roleResponsible: 'STAFF', estimatedTime: 'Flight Day', approvalRequired: false },
      { id: 's3', order: 3, name: 'Quà tặng', description: 'Gửi quà dịp sinh nhật/lễ.', roleResponsible: 'HEAD_OF_DEPT', estimatedTime: 'Event', approvalRequired: true }
    ]
  },

  // 6. IT Dept
  {
    id: 'wf_it_1', department: 'Phòng Kỹ thuật', title: 'SOP 16: Cấp tài khoản mới', lastUpdated: new Date().toISOString(),
    description: 'Tạo email, tài khoản hệ thống cho nhân viên mới.',
    steps: [
      { id: 's1', order: 1, name: 'Nhận yêu cầu', description: 'Nhận thông tin từ HR.', roleResponsible: 'STAFF', estimatedTime: '1 hour', approvalRequired: true },
      { id: 's2', order: 2, name: 'Tạo tài khoản', description: 'Setup Email, Nexus HRIS, GDS.', roleResponsible: 'STAFF', estimatedTime: '2 hours', approvalRequired: false },
      { id: 's3', order: 3, name: 'Bàn giao', description: 'Gửi thông tin đăng nhập.', roleResponsible: 'STAFF', estimatedTime: '30 mins', approvalRequired: false }
    ]
  },
  {
    id: 'wf_it_2', department: 'Phòng Kỹ thuật', title: 'SOP 17: Backup Dữ liệu', lastUpdated: new Date().toISOString(),
    description: 'Sao lưu định kỳ hệ thống.',
    steps: [
      { id: 's1', order: 1, name: 'Backup', description: 'Chạy script sao lưu.', roleResponsible: 'STAFF', estimatedTime: 'Daily', approvalRequired: false },
      { id: 's2', order: 2, name: 'Kiểm tra', description: 'Verify file backup.', roleResponsible: 'TEAM_LEAD', estimatedTime: 'Weekly', approvalRequired: false }
    ]
  },
  {
    id: 'wf_it_3', department: 'Phòng Kỹ thuật', title: 'SOP 18: Xử lý sự cố mạng', lastUpdated: new Date().toISOString(),
    description: 'Quy trình fix lỗi internet/wifi.',
    steps: [
      { id: 's1', order: 1, name: 'Tiếp nhận', description: 'Nhận báo lỗi.', roleResponsible: 'STAFF', estimatedTime: '15 mins', approvalRequired: false },
      { id: 's2', order: 2, name: 'Chẩn đoán', description: 'Kiểm tra Router/Line.', roleResponsible: 'STAFF', estimatedTime: '30 mins', approvalRequired: false },
      { id: 's3', order: 3, name: 'Khắc phục', description: 'Liên hệ ISP hoặc reset.', roleResponsible: 'STAFF', estimatedTime: 'Var', approvalRequired: false }
    ]
  },

  // 7. Director Board
  {
    id: 'wf_dir_1', department: 'Ban Giám đốc', title: 'SOP 19: Duyệt chi Ngân sách', lastUpdated: new Date().toISOString(),
    description: 'Quy trình phê duyệt các khoản chi lớn.',
    steps: [
      { id: 's1', order: 1, name: 'Trình ký', description: 'Bộ phận gửi tờ trình.', roleResponsible: 'HEAD_OF_DEPT', estimatedTime: '1 day', approvalRequired: false },
      { id: 's2', order: 2, name: 'Thẩm định', description: 'Kế toán trưởng xem xét.', roleResponsible: 'ACCOUNTANT', estimatedTime: '1 day', approvalRequired: true },
      { id: 's3', order: 3, name: 'Phê duyệt', description: 'Giám đốc ký.', roleResponsible: 'DIRECTOR', estimatedTime: '2 days', approvalRequired: true }
    ]
  },
  {
    id: 'wf_dir_2', department: 'Ban Giám đốc', title: 'SOP 20: Họp Giao ban Tuần', lastUpdated: new Date().toISOString(),
    description: 'Quy định về họp đầu tuần.',
    steps: [
      { id: 's1', order: 1, name: 'Báo cáo', description: 'Các phòng gửi báo cáo trước 10h Thứ 2.', roleResponsible: 'HEAD_OF_DEPT', estimatedTime: 'Weekly', approvalRequired: false },
      { id: 's2', order: 2, name: 'Họp', description: 'Họp lúc 14h Thứ 2.', roleResponsible: 'ALL', estimatedTime: '2 hours', approvalRequired: false },
      { id: 's3', order: 3, name: 'Biên bản', description: 'Thư ký gửi biên bản họp.', roleResponsible: 'STAFF', estimatedTime: '1 day', approvalRequired: false }
    ]
  },
  {
    id: 'wf_dir_3', department: 'Ban Giám đốc', title: 'SOP 21: Đánh giá KPI Quý', lastUpdated: new Date().toISOString(),
    description: 'Quy trình xét duyệt KPI toàn công ty.',
    steps: [
      { id: 's1', order: 1, name: 'Tổng hợp', description: 'HR tổng hợp điểm.', roleResponsible: 'STAFF', estimatedTime: '3 days', approvalRequired: false },
      { id: 's2', order: 2, name: 'Xét duyệt', description: 'Giám đốc duyệt thưởng.', roleResponsible: 'DIRECTOR', estimatedTime: '2 days', approvalRequired: true },
      { id: 's3', order: 3, name: 'Công bố', description: 'Thông báo kết quả.', roleResponsible: 'HEAD_OF_DEPT', estimatedTime: '1 day', approvalRequired: false }
    ]
  }
];

// --- REGULATIONS (8 Full Entries) ---
const DEFAULT_REGULATIONS: Regulation[] = [
  {
    id: 'reg1', title: 'Quy định Thời gian làm việc & Chấm công', category: 'Chấm công',
    content: '1. Giờ làm việc hành chính:\n- Sáng: 08:00 - 12:00\n- Chiều: 13:30 - 17:30\n- Thứ 7 làm việc buổi sáng (08:00 - 12:00).\n\n2. Quy định Check-in/Check-out:\n- Check-in vân tay/FaceID bắt buộc.\n- Cho phép đi muộn tối đa 15 phút (có lý do). Quá 15 phút phạt 50.000đ/lần.\n- Quên chấm công phải giải trình với trưởng bộ phận.',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'reg2', title: 'Quy định Nghỉ phép & Lễ tết', category: 'Hành chính',
    content: '- Nhân viên chính thức có 12 ngày phép năm. Thử việc không có phép năm.\n- Nghỉ phép phải làm đơn trên hệ thống trước ít nhất 1 ngày.\n- Nghỉ ốm cần có giấy xác nhận của cơ sở y tế trong vòng 48h.\n- Các ngày lễ tết nghỉ theo quy định nhà nước (hưởng 100% lương).',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'reg3', title: 'Quy chế Lương & Thưởng', category: 'Phúc lợi',
    content: '- Lương được trả vào ngày 05 hàng tháng qua tài khoản ngân hàng.\n- Lương bao gồm: Lương cơ bản + Phụ cấp + Hoa hồng (nếu có).\n- Thưởng doanh số (Incentive) chi trả cùng kỳ lương.\n- Lương tháng 13 phụ thuộc vào kết quả kinh doanh.\n- Thưởng các dịp lễ 30/4, 2/9, Tết Dương lịch (500k - 1tr).',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'reg4', title: 'Quy định Trang phục (Dress Code)', category: 'Văn hóa',
    content: '- Thứ 2: Đồng phục công ty (Áo dài nữ, Vest nam/Sơ mi trắng).\n- Thứ 3 - Thứ 6: Trang phục công sở lịch sự (Sơ mi, quần âu, váy công sở dài quá gối).\n- Thứ 7: Trang phục tự do (nghiêm túc, không mặc quần short/dép lê).',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'reg5', title: 'Bảo mật Thông tin & Dữ liệu', category: 'Bảo mật',
    content: '- Tuyệt đối không chia sẻ tài khoản đăng nhập (GDS, Email, Nexus HRIS).\n- Không tiết lộ thông tin khách hàng, giá Net vé máy bay ra bên ngoài.\n- Dữ liệu công ty là tài sản, nghiêm cấm sao chép trái phép.\n- Vi phạm sẽ bị sa thải và bồi thường thiệt hại.',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'reg6', title: 'Quy tắc Ứng xử & Giao tiếp', category: 'Văn hóa',
    content: '- Giao tiếp lịch sự, tôn trọng đồng nghiệp và khách hàng.\n- Không gây gổ, mất trật tự nơi làm việc.\n- Hỗ trợ lẫn nhau trong công việc chung.\n- Giữ gìn vệ sinh chung tại khu vực làm việc.',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'reg7', title: 'Quy định Sử dụng Tài sản', category: 'Hành chính',
    content: '- Máy tính, điện thoại công ty chỉ dùng cho mục đích công việc.\n- Có trách nhiệm bảo quản tài sản được giao.\n- Mất mát, hư hỏng do chủ quan phải bồi thường 100% giá trị.\n- Bàn giao đầy đủ khi nghỉ việc.',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'reg8', title: 'Chế độ Công tác phí', category: 'Phúc lợi',
    content: '- Đi công tác được phụ cấp ăn trưa 50.000đ/ngày, đi lại theo thực tế.\n- Vé máy bay, khách sạn công ty chi trả theo định mức (Khách sạn 3 sao).\n- Thanh toán dựa trên hóa đơn thực tế hợp lệ (Hóa đơn đỏ).',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
];

// --- QUIZZES (4 Entries) ---
const DEFAULT_QUIZZES: Quiz[] = [
  {
    id: 'qz1', title: 'Nghiệp vụ Vé Máy Bay Cơ Bản', description: 'Kiểm tra kiến thức về mã sân bay, quy định hành lý VNA/VJ/QH.',
    departmentTarget: 'Phòng Vé (Ticketing)', timeLimitMinutes: 20, createdAt: new Date().toISOString(),
    questions: [
      { id: 'q1', text: 'Mã sân bay quốc tế Nội Bài là gì?', options: ['HAN', 'SGN', 'DAD', 'HPH'], correctIndex: 0 },
      { id: 'q2', text: 'Hành lý xách tay tiêu chuẩn của VNA hạng Phổ thông là bao nhiêu?', options: ['7kg', '10kg', '12kg', '18kg'], correctIndex: 2 },
      { id: 'q3', text: 'Trẻ em dưới 2 tuổi (INF) tính giá vé như thế nào với VNA?', options: ['Miễn phí', '10% giá vé người lớn', '75% giá vé người lớn', 'Bằng giá người lớn'], correctIndex: 1 },
      { id: 'q4', text: 'Quy định đổi tên của Vietjet Air?', options: ['Không được phép', 'Được phép, mất phí + chênh lệch', 'Miễn phí', 'Chỉ hạng SkyBoss mới được'], correctIndex: 1 }
    ]
  },
  {
    id: 'qz2', title: 'Kỹ năng Bán hàng & Chăm sóc Khách hàng', description: 'Xử lý tình huống, khiếu nại và kỹ năng chốt sale.',
    departmentTarget: 'Phòng Kinh doanh (Sales)', timeLimitMinutes: 15, createdAt: new Date().toISOString(),
    questions: [
      { id: 'q1', text: 'Khi khách hàng phàn nàn về giá vé cao, bạn nên làm gì?', options: ['Tranh luận với khách', 'Lắng nghe và giải thích về giá trị dịch vụ', 'Giảm giá ngay lập tức', 'Im lặng'], correctIndex: 1 },
      { id: 'q2', text: 'Yếu tố nào quan trọng nhất để giữ chân đại lý F2?', options: ['Hoa hồng cao nhất', 'Hỗ trợ nghiệp vụ 24/7', 'Tặng quà cá nhân', 'Không thu công nợ'], correctIndex: 1 },
      { id: 'q3', text: 'Thời điểm vàng để gọi điện chăm sóc khách hàng là khi nào?', options: ['Sáng sớm', 'Giờ nghỉ trưa', 'Giờ hành chính (9h-11h, 14h-16h)', 'Đêm khuya'], correctIndex: 2 }
    ]
  },
  {
    id: 'qz3', title: 'Tiếng Anh Chuyên ngành Hàng không', description: 'Từ vựng và mẫu câu giao tiếp cơ bản.',
    departmentTarget: 'Phòng Vé (Ticketing)', timeLimitMinutes: 20, createdAt: new Date().toISOString(),
    questions: [
      { id: 'q1', text: 'What does "OW" stand for in ticketing?', options: ['One Way', 'On Wait', 'Open Window', 'Over Weight'], correctIndex: 0 },
      { id: 'q2', text: '"Baggage Allowance" nghĩa là gì?', options: ['Hành lý thất lạc', 'Tiêu chuẩn hành lý miễn cước', 'Mua thêm hành lý', 'Ký gửi hành lý'], correctIndex: 1 },
      { id: 'q3', text: 'Translate: "Flight delayed due to bad weather."', options: ['Chuyến bay bị hủy do bão', 'Chuyến bay bị hoãn do thời tiết xấu', 'Chuyến bay đúng giờ', 'Chuyến bay đổi giờ'], correctIndex: 1 }
    ]
  },
  {
    id: 'qz4', title: 'Văn hóa & Nội quy Công ty', description: 'Kiểm tra hiểu biết về quy định chung.',
    departmentTarget: 'Tất cả', timeLimitMinutes: 10, createdAt: new Date().toISOString(),
    questions: [
      { id: 'q1', text: 'Thời gian làm việc buổi sáng bắt đầu từ mấy giờ?', options: ['7:30', '8:00', '8:30', '9:00'], correctIndex: 1 },
      { id: 'q2', text: 'Mức phạt đi muộn quá 15 phút là bao nhiêu?', options: ['20.000đ', '50.000đ', '100.000đ', 'Không phạt'], correctIndex: 1 },
      { id: 'q3', text: 'Giá trị cốt lõi nào KHÔNG phải của công ty?', options: ['Tận tâm', 'Trung thực', 'Tốc độ', 'Lười biếng'], correctIndex: 3 }
    ]
  }
];

// --- JOB DESCRIPTIONS (JD) ---
const DEFAULT_JDS: JobDescription[] = [
  {
    id: 'jd1', departmentName: 'Phòng Vé (Ticketing)', position: 'Nhân viên Ticketing', baseSalaryRange: '8.000.000 - 12.000.000',
    description: 'Chịu trách nhiệm tư vấn, đặt giữ chỗ, xuất vé máy bay.',
    responsibilities: '- Tư vấn hành trình bay.\n- Đặt chỗ, xuất vé trên Sabre/Amadeus.\n- Xử lý hoàn/hủy/đổi vé.\n- Hỗ trợ đại lý cấp 2.',
    requirements: '- Có chứng chỉ nghiệp vụ vé.\n- Cẩn thận, chịu áp lực.',
    benefits: '- Thưởng hoa hồng.\n- Vé máy bay ID.',
    tasks: [
        { id: 't_tk_1', content: 'Kiểm tra Email đặt vé', frequency: 'DAILY', salaryWeight: 10 }, 
        { id: 't_tk_2', content: 'Xử lý Queue (Vé đổi giờ)', frequency: 'DAILY', salaryWeight: 20 }, 
        { id: 't_tk_3', content: 'Xuất vé chính xác', frequency: 'DAILY', salaryWeight: 40 }
    ]
  },
  {
    id: 'jd2', departmentName: 'Phòng Vé (Ticketing)', position: 'Trưởng phòng Vé', baseSalaryRange: '15.000.000 - 25.000.000',
    description: 'Quản lý điều hành phòng vé.',
    responsibilities: '- Quản lý đội ngũ nhân viên ticketing.\n- Xử lý các ca khó, khiếu nại.\n- Đào tạo nhân viên mới.',
    requirements: '- 3 năm kinh nghiệm quản lý.\n- Thành thạo mọi hệ thống GDS.',
    benefits: '- Thưởng quý, năm.\n- Du lịch nước ngoài.',
    tasks: [
        { id: 't_tk_mgr_1', content: 'Kiểm tra báo cáo ngày', frequency: 'DAILY', salaryWeight: 30 }, 
        { id: 't_tk_mgr_2', content: 'Đào tạo nghiệp vụ', frequency: 'WEEKLY', salaryWeight: 30 }
    ]
  },
  {
    id: 'jd3', departmentName: 'Phòng Kinh doanh (Sales)', position: 'Nhân viên Kinh doanh', baseSalaryRange: '10.000.000 - 15.000.000',
    description: 'Tìm kiếm và chăm sóc khách hàng đại lý/doanh nghiệp.',
    responsibilities: '- Tìm kiếm đại lý F2 mới.\n- Chăm sóc đại lý hiện hữu.\n- Đẩy doanh số theo chỉ tiêu.',
    requirements: '- Kỹ năng giao tiếp tốt.\n- Có kinh nghiệm sales B2B.',
    benefits: '- Hoa hồng doanh số cao.',
    tasks: [
        { id: 't_sale_1', content: 'Gọi điện chăm sóc đại lý', frequency: 'DAILY', salaryWeight: 30 }, 
        { id: 't_sale_2', content: 'Tìm khách hàng mới', frequency: 'WEEKLY', salaryWeight: 40 }
    ]
  },
  {
    id: 'jd4', departmentName: 'Phòng Kế toán Vé (BSP)', position: 'Kế toán Vé (BSP)', baseSalaryRange: '12.000.000 - 18.000.000',
    description: 'Kiểm soát số liệu vé và báo cáo BSP.',
    responsibilities: '- Đối soát vé xuất hàng ngày.\n- Lập báo cáo BSP.\n- Theo dõi công nợ.',
    requirements: '- Tốt nghiệp Kế toán.\n- Cẩn thận, trung thực.',
    benefits: '- Thưởng lễ tết.',
    tasks: [
        { id: 't_acc_1', content: 'Đối soát vé ngày', frequency: 'DAILY', salaryWeight: 40 }, 
        { id: 't_acc_2', content: 'Báo cáo BSP', frequency: 'WEEKLY', salaryWeight: 30 }
    ]
  },
  {
    id: 'jd5', departmentName: 'Phòng Nhân sự', position: 'Chuyên viên Nhân sự', baseSalaryRange: '10.000.000 - 15.000.000',
    description: 'Phụ trách tuyển dụng và C&B.',
    responsibilities: '- Tuyển dụng nhân sự.\n- Chấm công, tính lương.\n- Quản lý hồ sơ nhân viên.',
    requirements: '- Tốt nghiệp QTNS/Luật.\n- Am hiểu luật lao động.',
    benefits: '- Môi trường chuyên nghiệp.',
    tasks: [
        { id: 't_hr_1', content: 'Kiểm tra chấm công', frequency: 'DAILY', salaryWeight: 30 }, 
        { id: 't_hr_2', content: 'Lọc CV tuyển dụng', frequency: 'WEEKLY', salaryWeight: 30 }
    ]
  },
  {
    id: 'jd6', departmentName: 'Phòng Chăm sóc Khách hàng', position: 'Chuyên viên CSKH', baseSalaryRange: '8.000.000 - 12.000.000',
    description: 'Hỗ trợ khách hàng sau bán.',
    responsibilities: '- Tiếp nhận hotline/email khiếu nại.\n- Hỗ trợ đổi trả vé ca khó.\n- Khảo sát hài lòng.',
    requirements: '- Giọng nói dễ nghe.\n- Kiên nhẫn.',
    benefits: '- Thưởng chất lượng dịch vụ.',
    tasks: [
        { id: 't_cs_1', content: 'Trả lời Hotline', frequency: 'DAILY', salaryWeight: 50 }, 
        { id: 't_cs_2', content: 'Báo cáo khiếu nại', frequency: 'WEEKLY', salaryWeight: 30 }
    ]
  },
  {
    id: 'jd7', departmentName: 'Phòng Kỹ thuật', position: 'IT Support', baseSalaryRange: '10.000.000 - 15.000.000',
    description: 'Hỗ trợ kỹ thuật văn phòng.',
    responsibilities: '- Cài đặt máy tính, phần mềm.\n- Xử lý sự cố mạng.\n- Quản trị website cơ bản.',
    requirements: '- Tốt nghiệp CNTT.\n- Nhiệt tình.',
    benefits: '- Phụ cấp thiết bị.',
    tasks: [
        { id: 't_it_1', content: 'Check server/mạng', frequency: 'DAILY', salaryWeight: 40 }, 
        { id: 't_it_2', content: 'Support user', frequency: 'DAILY', salaryWeight: 30 }
    ]
  },
  {
    id: 'jd8', departmentName: 'Ban Giám đốc', position: 'Giám đốc Điều hành', baseSalaryRange: 'Thỏa thuận',
    description: 'Điều hành công ty.',
    responsibilities: '- Xây dựng chiến lược.\n- Quản lý trưởng bộ phận.\n- Đối ngoại.',
    requirements: '- Kinh nghiệm quản lý cấp cao.',
    benefits: '- Cổ phần.',
    tasks: [
        { id: 't_dir_1', content: 'Họp giao ban', frequency: 'WEEKLY', salaryWeight: 50 }
    ]
  }
];

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
let MOCK_WORKFLOWS: Workflow[] = [...DEFAULT_WORKFLOWS];
let MOCK_REGULATIONS: Regulation[] = [...DEFAULT_REGULATIONS];
let MOCK_JDS: JobDescription[] = [...DEFAULT_JDS];
let MOCK_QUIZZES: Quiz[] = [...DEFAULT_QUIZZES];
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
    'DIRECTOR': 3.5,
    'HEAD_OF_DEPT': 2.0,
    'TEAM_LEAD': 1.5,
    'ACCOUNTANT': 1.4,
    'STAFF': 1.0
  },
  commissionTiers: [
    { minPercent: 0.8, commissionRate: 0.02 }, // 80% đạt 2%
    { minPercent: 1.0, commissionRate: 0.04 }, // 100% đạt 4%
    { minPercent: 1.2, commissionRate: 0.06 }  // 120% đạt 6%
  ],
  shifts: [
    { name: 'SANG', startTime: '08:00', endTime: '12:00', graceLate: 15, graceEarlyLeave: 0 },
    { name: 'CHIEU', startTime: '13:30', endTime: '17:30', graceLate: 15, graceEarlyLeave: 0 }
  ],
  insuranceConfig: {
    socialInsurancePercent: 8,   // BHXH
    healthInsurancePercent: 1.5, // BHYT
    unemploymentInsurancePercent: 1 // BHTN
  },
  kpiIncreaseRules: [
    { minScore: 95, maxScore: 100, percentIncrease: 12 },
    { minScore: 90, maxScore: 94, percentIncrease: 8 },
    { minScore: 80, maxScore: 89, percentIncrease: 5 }
  ],
  kpiWeights: { p1: 40, p2: 30, p3: 30 },
  departmentKPIs: [
    {
      departmentName: 'Phòng Vé (Ticketing)',
      criteria: [
        { id: 'cr1', name: 'Số lượng vé xuất (Ticket Volume)', weight: 30 },
        { id: 'cr2', name: 'Tỷ lệ sai sót (Error Rate)', weight: 20 },
        { id: 'cr3', name: 'Tốc độ phản hồi (Response Time)', weight: 20 },
        { id: 'cr4', name: 'Kỹ năng xử lý hoàn đổi', weight: 15 },
        { id: 'cr5', name: 'Tuân thủ quy trình', weight: 15 }
      ],
      goals: [
        { id: 'g1', name: 'Vé quốc tế', target: 500, unit: 'Vé', weight: 60 },
        { id: 'g2', name: 'Vé nội địa', target: 1500, unit: 'Vé', weight: 40 }
      ]
    },
    {
      departmentName: 'Phòng Kinh doanh (Sales)',
      criteria: [
        { id: 'cr_s1', name: 'Doanh số cá nhân', weight: 40 },
        { id: 'cr_s2', name: 'Phát triển khách hàng mới', weight: 20 },
        { id: 'cr_s3', name: 'Thu hồi công nợ đúng hạn', weight: 20 },
        { id: 'cr_s4', name: 'Chăm sóc khách hàng hiện hữu', weight: 20 }
      ],
      goals: [
        { id: 'g3', name: 'Doanh số tháng', target: 2000000000, unit: 'VND', weight: 100 }
      ]
    },
    {
      departmentName: 'Phòng Chăm sóc Khách hàng',
      criteria: [
        { id: 'cr_cs1', name: 'Tỷ lệ giải quyết khiếu nại', weight: 40 },
        { id: 'cr_cs2', name: 'Đánh giá hài lòng (CSAT)', weight: 30 },
        { id: 'cr_cs3', name: 'Thời gian phản hồi', weight: 30 }
      ],
      goals: [
        { id: 'g_cs1', name: 'Tỷ lệ hài lòng', target: 95, unit: '%', weight: 100 }
      ]
    },
    {
      departmentName: 'Phòng Kế toán Vé (BSP)',
      criteria: [
        { id: 'cr_acc1', name: 'Chính xác số liệu', weight: 50 },
        { id: 'cr_acc2', name: 'Báo cáo đúng hạn', weight: 30 },
        { id: 'cr_acc3', name: 'Kiểm soát công nợ', weight: 20 }
      ],
      goals: []
    }
  ],
  revenueConfig: { year: 2024, annualTarget: 24000000000, months: Array.from({length: 12}, (_, i) => ({ month: i+1, target: 2000000000, actual: 0 })) },
  companyLocation: { lat: 21.0285, lng: 105.8542, radiusMeters: 100, addressName: 'Hanoi Office' },
  attendanceConfig: { requireGPS: true, requireFaceID: false, requireWifi: false, allowedIPs: [] }
};

export const CONTRACT_TEMPLATES = { EMPLOYMENT: '', UNION: '', PARTNERSHIP: '', CTV: '', AGENCY_F2: '', SUPPLIER: '' }; 
export const DEFAULT_CONTRACT_TEMPLATE = '';

// --- 6. SELF-HEALING PERSISTENCE ---
const loadFromStorage = () => {
    // ... (Standard loading logic) ...
    const storedVersion = localStorage.getItem('nexus_version');
    // If version mismatch, we treat it as outdated and force refresh of default data
    const isOutdated = storedVersion !== SYSTEM_VERSION;

    if (localStorage.getItem('nexus_users')) MOCK_USERS = JSON.parse(localStorage.getItem('nexus_users')!);
    
    if (localStorage.getItem('nexus_employees')) MOCK_EMPLOYEES = JSON.parse(localStorage.getItem('nexus_employees')!);
    if (localStorage.getItem('nexus_attendance')) MOCK_ATTENDANCE = JSON.parse(localStorage.getItem('nexus_attendance')!);
    if (localStorage.getItem('nexus_payroll')) MOCK_PAYROLL = JSON.parse(localStorage.getItem('nexus_payroll')!);
    
    // Load others if they exist
    if (localStorage.getItem('nexus_config')) MOCK_CONFIG = JSON.parse(localStorage.getItem('nexus_config')!);
    if (localStorage.getItem('nexus_regulations')) MOCK_REGULATIONS = JSON.parse(localStorage.getItem('nexus_regulations')!);
    if (localStorage.getItem('nexus_jds')) MOCK_JDS = JSON.parse(localStorage.getItem('nexus_jds')!);
    if (localStorage.getItem('nexus_workflows')) MOCK_WORKFLOWS = JSON.parse(localStorage.getItem('nexus_workflows')!);
    if (localStorage.getItem('nexus_candidates')) MOCK_CANDIDATES = JSON.parse(localStorage.getItem('nexus_candidates')!);
    if (localStorage.getItem('nexus_quizzes')) MOCK_QUIZZES = JSON.parse(localStorage.getItem('nexus_quizzes')!);

    // FORCE UPDATE Defaults if version changed
    if (isOutdated) {
        console.log("System updated to version " + SYSTEM_VERSION + ". Resetting core configurations.");
        MOCK_CONFIG = { ...MOCK_CONFIG, ...{ 
            // Ensure new structure is applied even if we keep some old data
            kpiWeights: { p1: 40, p2: 30, p3: 30 },
            commissionTiers: [
              { minPercent: 0.8, commissionRate: 0.02 }, 
              { minPercent: 1.0, commissionRate: 0.04 }, 
              { minPercent: 1.2, commissionRate: 0.06 }
            ],
            // Update Salary Config Defaults for Airline
            roleCoefficients: {
              'DIRECTOR': 3.5,
              'HEAD_OF_DEPT': 2.0,
              'TEAM_LEAD': 1.5,
              'ACCOUNTANT': 1.4,
              'STAFF': 1.0
            },
            // Reset Department KPIs to ensure we get the 7+ new criteria
            departmentKPIs: [
                {
                  departmentName: 'Phòng Vé (Ticketing)',
                  criteria: [
                    { id: 'cr1', name: 'Số lượng vé xuất (Ticket Volume)', weight: 30 },
                    { id: 'cr2', name: 'Tỷ lệ sai sót (Error Rate)', weight: 20 },
                    { id: 'cr3', name: 'Tốc độ phản hồi (Response Time)', weight: 20 },
                    { id: 'cr4', name: 'Kỹ năng xử lý hoàn đổi', weight: 15 },
                    { id: 'cr5', name: 'Tuân thủ quy trình', weight: 15 }
                  ],
                  goals: [
                    { id: 'g1', name: 'Vé quốc tế', target: 500, unit: 'Vé', weight: 60 },
                    { id: 'g2', name: 'Vé nội địa', target: 1500, unit: 'Vé', weight: 40 }
                  ]
                },
                {
                  departmentName: 'Phòng Kinh doanh (Sales)',
                  criteria: [
                    { id: 'cr_s1', name: 'Doanh số cá nhân', weight: 40 },
                    { id: 'cr_s2', name: 'Phát triển khách hàng mới', weight: 20 },
                    { id: 'cr_s3', name: 'Thu hồi công nợ đúng hạn', weight: 20 },
                    { id: 'cr_s4', name: 'Chăm sóc khách hàng hiện hữu', weight: 20 }
                  ],
                  goals: [
                    { id: 'g3', name: 'Doanh số tháng', target: 2000000000, unit: 'VND', weight: 100 }
                  ]
                },
                {
                  departmentName: 'Phòng Chăm sóc Khách hàng',
                  criteria: [
                    { id: 'cr_cs1', name: 'Tỷ lệ giải quyết khiếu nại', weight: 40 },
                    { id: 'cr_cs2', name: 'Đánh giá hài lòng (CSAT)', weight: 30 },
                    { id: 'cr_cs3', name: 'Thời gian phản hồi', weight: 30 }
                  ],
                  goals: [
                    { id: 'g_cs1', name: 'Tỷ lệ hài lòng', target: 95, unit: '%', weight: 100 }
                  ]
                },
                {
                  departmentName: 'Phòng Kế toán Vé (BSP)',
                  criteria: [
                    { id: 'cr_acc1', name: 'Chính xác số liệu', weight: 50 },
                    { id: 'cr_acc2', name: 'Báo cáo đúng hạn', weight: 30 },
                    { id: 'cr_acc3', name: 'Kiểm soát công nợ', weight: 20 }
                  ],
                  goals: []
                }
            ]
        }};
        
        // Reset these to ensure SOPs/JDs/Regulations show up
        MOCK_REGULATIONS = [...DEFAULT_REGULATIONS];
        MOCK_JDS = [...DEFAULT_JDS];
        MOCK_WORKFLOWS = [...DEFAULT_WORKFLOWS];
        MOCK_QUIZZES = [...DEFAULT_QUIZZES];

        localStorage.setItem('nexus_version', SYSTEM_VERSION);
        saveToStorage();
    }
};

const saveToStorage = () => {
    localStorage.setItem('nexus_users', JSON.stringify(MOCK_USERS));
    localStorage.setItem('nexus_employees', JSON.stringify(MOCK_EMPLOYEES));
    localStorage.setItem('nexus_attendance', JSON.stringify(MOCK_ATTENDANCE));
    localStorage.setItem('nexus_payroll', JSON.stringify(MOCK_PAYROLL));
    localStorage.setItem('nexus_config', JSON.stringify(MOCK_CONFIG));
    localStorage.setItem('nexus_regulations', JSON.stringify(MOCK_REGULATIONS));
    localStorage.setItem('nexus_jds', JSON.stringify(MOCK_JDS));
    localStorage.setItem('nexus_workflows', JSON.stringify(MOCK_WORKFLOWS));
    localStorage.setItem('nexus_candidates', JSON.stringify(MOCK_CANDIDATES));
    localStorage.setItem('nexus_quizzes', JSON.stringify(MOCK_QUIZZES));
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
  
  // Updated getDefaultPermissions to include USE_AI_ASSISTANT
  getDefaultPermissions: (role: Role): Permission[] => {
      const common: Permission[] = ['VIEW_DASHBOARD', 'VIEW_ALL_ATTENDANCE', 'MANAGE_TASKS', 'USE_AI_ASSISTANT'];
      switch(role) {
          case Role.ADMIN: return [...common, 'MANAGE_EMPLOYEES', 'VIEW_ALL_EMPLOYEES', 'MANAGE_ATTENDANCE', 'MANAGE_PAYROLL', 'VIEW_ALL_PAYROLL', 'SYSTEM_CONFIG', 'MANAGE_WORKFLOWS', 'VIEW_REPORTS', 'MANAGE_KPI', 'MANAGE_CONTRACTS', 'MANAGE_JDS', 'MANAGE_REGULATIONS', 'MANAGE_RECRUITMENT', 'MANAGE_ASSESSMENTS', 'FACTORY_RESET'];
          case Role.MANAGER: return [...common, 'VIEW_ALL_EMPLOYEES', 'MANAGE_LEAVES', 'MANAGE_KPI', 'VIEW_REPORTS', 'MANAGE_RECRUITMENT', 'MANAGE_WORKFLOWS', 'MANAGE_JDS', 'MANAGE_REGULATIONS'];
          case Role.HR: return [...common, 'MANAGE_EMPLOYEES', 'VIEW_ALL_EMPLOYEES', 'MANAGE_CONTRACTS', 'MANAGE_LEAVES', 'MANAGE_RECRUITMENT', 'VIEW_ALL_PAYROLL'];
          default: return common; // Employee
      }
  },
  
  getEmployees: async () => MOCK_EMPLOYEES,
  getEmployeeById: async (id: string) => MOCK_EMPLOYEES.find(e => e.id === id),
  getEmployeeByUserId: async (userId: string) => MOCK_EMPLOYEES.find(e => e.userId === userId),
  createEmployee: async (data: any) => {},
  updateEmployee: async (id: string, data: any) => { const e = MOCK_EMPLOYEES.find(x => x.id === id); if(e) Object.assign(e, data); saveToStorage(); },
  deleteEmployee: async (id: string) => {},

  // --- UPDATED: Get Attendance with Merged Leaves ---
  getAttendance: async (empId?: string) => {
      // 1. Get raw attendance records
      let records = empId ? MOCK_ATTENDANCE.filter(a => a.employeeId === empId) : MOCK_ATTENDANCE;
      
      // 2. Get approved leaves
      const approvedLeaves = MOCK_LEAVES.filter(l => l.status === 'APPROVED');
      
      // 3. Convert leaves into attendance records visually
      const leaveRecords: Attendance[] = [];
      
      for (const leave of approvedLeaves) {
          // If filtering by empId, skip other employees' leaves
          if (empId && leave.employeeId !== empId) continue;

          const start = new Date(leave.startDate);
          const end = new Date(leave.endDate);
          
          // Loop through each day of the leave
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              const dateStr = d.toISOString().split('T')[0];
              
              // Check if a real check-in exists for this day
              const existingRecord = records.find(r => r.employeeId === leave.employeeId && r.date.startsWith(dateStr));
              
              // Only create a virtual "Leave" record if no real work record exists
              if (!existingRecord) {
                  leaveRecords.push({
                      id: `leave_${leave.id}_${dateStr}`,
                      employeeId: leave.employeeId,
                      date: dateStr,
                      type: AttendanceType.REGULAR,
                      status: 'LEAVE', // New Status
                      hours: 0, 
                      overtimeHours: 0,
                      isExcused: true,
                      lateReason: `On Leave: ${leave.reason} (${leave.type})`
                  });
              }
          }
      }
      
      // Combine and sort
      return [...records, ...leaveRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },
  
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
  
  // --- UPDATED: Calculate Payroll with Leave Counting ---
  calculatePayrollForCycle: async (cycleId: string) => {
      const records = MOCK_PAYROLL.filter(p => p.cycleId === cycleId);
      
      // Get all attendance and leaves for this cycle context
      // Note: In a real DB we would query by date range. 
      // For mock, we iterate all and filter.
      
      records.forEach(p => {
          // 1. Calculate Valid Work Days
          // validWorkDays = (Days with 'COMPLETED' status) + (Days with Approved Paid Leave)
          
          const attendanceForEmp = MOCK_ATTENDANCE.filter(a => 
              a.employeeId === p.employeeId && 
              a.date.startsWith(cycleId) && 
              a.status === 'COMPLETED'
          );
          
          // Determine Paid Leave days in this month
          const paidLeaves = MOCK_LEAVES.filter(l => 
              l.employeeId === p.employeeId && 
              l.status === 'APPROVED' && 
              (l.type === 'ANNUAL' || l.type === 'SICK')
          );
          
          let leaveDaysCount = 0;
          const [year, month] = cycleId.split('-').map(Number);
          const startOfMonth = new Date(year, month - 1, 1);
          const endOfMonth = new Date(year, month, 0);

          paidLeaves.forEach(l => {
              const start = new Date(l.startDate);
              const end = new Date(l.endDate);
              
              // Intersection of Leave Range and Current Month
              const effectiveStart = start < startOfMonth ? startOfMonth : start;
              const effectiveEnd = end > endOfMonth ? endOfMonth : end;
              
              if (effectiveStart <= effectiveEnd) {
                  const diffTime = Math.abs(effectiveEnd.getTime() - effectiveStart.getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
                  leaveDaysCount += diffDays;
              }
          });

          // Work days (Completed Attendance) + Paid Leave Days
          // Note: This logic assumes no overlap between attendance and leave, which `getAttendance` handles visually but here we count raw data.
          // In production, intersection check is needed to avoid double counting if someone checks in on a leave day.
          const actualWorkDays = attendanceForEmp.length;
          const totalValidDays = actualWorkDays + leaveDaysCount;

          p.validWorkDays = totalValidDays;

          // 2. Recalculate Net Pay
          // Basic calc logic
          const emp = MOCK_EMPLOYEES.find(e => e.id === p.employeeId);
          if (emp) {
              const calc = calcSalary({
                  baseSalary: emp.baseSalary,
                  insuranceSalary: emp.insuranceSalary,
                  roleTitle: emp.roleTitle,
                  proRateByAttendance: true,
                  validWorkDays: totalValidDays,
                  standardWorkDays: p.standardWorkDays || 26,
                  salesAchieved: p.salesAchieved || 0,
                  salesTarget: p.salesTarget || 0,
                  roleCoefficients: MOCK_CONFIG.roleCoefficients,
                  commissionTiers: MOCK_CONFIG.commissionTiers,
                  insuranceConfig: MOCK_CONFIG.insuranceConfig,
                  manualOtherAllowance: p.allowance,
                  manualOtherDeduction: p.deduction,
                  kpiBonus: p.kpiBonus
              });
              p.netPay = calc.total + p.overtimeAmount + p.bonus;
          }

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
  getLeaves: async () => MOCK_LEAVES,
  createLeave: async (data: any) => { MOCK_LEAVES.push({ id: `l${Date.now()}`, status: 'PENDING', ...data }); saveToStorage(); },
  updateLeaveStatus: async (id: string, status: 'APPROVED' | 'REJECTED') => { const l = MOCK_LEAVES.find(l => l.id === id); if (l) l.status = status; saveToStorage(); },
  getKPIReviews: async (userId: string, role: Role) => MOCK_REVIEWS, // Simplified
  createKPIReview: async (data: any) => { MOCK_REVIEWS.push({ id: `rev_${Date.now()}`, status: 'PENDING_REVIEW', evaluatedAt: new Date().toISOString(), ...data }); saveToStorage(); },
  submitCrossCheck: async (id: string, data: any) => {
      const r = MOCK_REVIEWS.find(x => x.id === id);
      if (r) {
          r.scoreP1 = data.scoreP1;
          r.scoreP2 = data.scoreP2;
          r.scoreP3 = data.scoreP3;
          r.notes = data.notes;
          r.status = 'COMPLETED';
          // Calculate Total Score (Weighted)
          r.totalScore = Math.round((r.scoreP1 * 40 + r.scoreP2 * 30 + r.scoreP3 * 30) / 100);
          saveToStorage();
      }
  },
  getSuggestedSalaryIncrease: async (empId: string) => ({ suggestedIncreasePercent: 0, suggestedSalary: 0, currentSalary: 0, avgScore: 0 }),
  getEmployeeTaskCompletionRate: async (empId: string, cycle: string) => 90,
  getDepartmentResults: async (dept: string, cycle: string) => [],
  saveDepartmentDraft: async (dept: string, cycle: string, goals: any[]) => {},
  generateDepartmentKPIs: async (dept: string, cycle: string, goals: any[]) => 0,
  getBusinessReports: async (userId: string, role: Role) => MOCK_BUSINESS_REPORTS,
  createBusinessReport: async (data: any) => { MOCK_BUSINESS_REPORTS.push({ id: `br_${Date.now()}`, createdAt: new Date().toISOString(), ...data }); saveToStorage(); },
  getRegulations: async () => MOCK_REGULATIONS,
  createRegulation: async (data: any) => { MOCK_REGULATIONS.push({id: `reg_${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...data}); saveToStorage(); },
  updateRegulation: async (id: string, data: any) => { const r = MOCK_REGULATIONS.find(x => x.id === id); if(r) { Object.assign(r, data); r.updatedAt = new Date().toISOString(); } saveToStorage(); },
  deleteRegulation: async (id: string) => { MOCK_REGULATIONS = MOCK_REGULATIONS.filter(x => x.id !== id); saveToStorage(); },
  getJDs: async () => MOCK_JDS,
  createJD: async (data: any) => { MOCK_JDS.push({id: `jd_${Date.now()}`, ...data}); saveToStorage(); },
  updateJD: async (id: string, data: any) => { const j = MOCK_JDS.find(x => x.id === id); if(j) Object.assign(j, data); saveToStorage(); return j as any; },
  registerEmployeeTasks: async (empId: string, taskIds: string[]) => {
      const emp = MOCK_EMPLOYEES.find(e => e.id === empId);
      if (emp) {
          emp.registeredTaskIds = taskIds;
          saveToStorage();
      }
  },
  getQuizzes: async () => MOCK_QUIZZES,
  createQuiz: async (data: any) => { MOCK_QUIZZES.push({id: `qz_${Date.now()}`, createdAt: new Date().toISOString(), ...data}); saveToStorage(); },
  deleteQuiz: async (id: string) => { MOCK_QUIZZES = MOCK_QUIZZES.filter(q => q.id !== id); saveToStorage(); },
  getQuizResults: async () => MOCK_QUIZ_RESULTS,
  submitQuiz: async (quizId: string, userId: string, answers: any) => {
      const quiz = MOCK_QUIZZES.find(q => q.id === quizId);
      let correct = 0;
      if (quiz) {
          quiz.questions.forEach((q, idx) => {
              if (answers[q.id] === q.correctIndex) correct++;
          });
      }
      // Check if user is employee or candidate
      let name = "Candidate";
      const emp = MOCK_EMPLOYEES.find(e => e.userId === userId || e.id === userId); // Handle both for now
      if (emp) name = emp.fullName;
      else {
          const cand = MOCK_CANDIDATES.find(c => c.id === userId);
          if (cand) name = cand.fullName;
      }

      const result: QuizResult = {
          id: `res_${Date.now()}`,
          quizId,
          quizTitle: quiz?.title || 'Quiz',
          employeeId: userId,
          employeeName: name,
          score: Math.round((correct / (quiz?.questions.length || 1)) * 100),
          totalQuestions: quiz?.questions.length || 0,
          correctAnswers: correct,
          takenAt: new Date().toISOString()
      };
      MOCK_QUIZ_RESULTS.push(result);
      saveToStorage();
      return result;
  },
  generateAIQuiz: async (topic: string) => {},
  getCandidates: async () => MOCK_CANDIDATES,
  createCandidate: async (data: any) => { MOCK_CANDIDATES.push({id: `cand_${Date.now()}`, status: 'APPLIED', appliedDate: new Date().toISOString(), ...data}); saveToStorage(); },
  updateCandidate: async (id: string, data: any) => { const c = MOCK_CANDIDATES.find(x => x.id === id); if(c) Object.assign(c, data); saveToStorage(); },
  rejectCandidate: async (id: string) => { const c = MOCK_CANDIDATES.find(x => x.id === id); if(c) c.status = 'REJECTED'; saveToStorage(); },
  
  // --- UPGRADED: Promote Candidate Logic ---
  promoteCandidateToEmployee: async (candId: string, salary: number, probSalary: number) => {
      const cand = MOCK_CANDIDATES.find(c => c.id === candId);
      if (!cand) throw new Error("Candidate not found");

      // 1. Create User Account (To allow login)
      const userId = `u_${Date.now()}`;
      const newUser: User = {
          id: userId,
          email: cand.email,
          password: '123', // Default Password
          fullName: cand.fullName,
          role: Role.EMPLOYEE,
          isApproved: true, // Auto-approve
          permissions: ['VIEW_DASHBOARD', 'VIEW_ALL_ATTENDANCE', 'MANAGE_TASKS', 'USE_AI_ASSISTANT']
      };
      MOCK_USERS.push(newUser);

      // 2. Create Employee Record
      const empId = `e_${Date.now()}`;
      const newEmp: Employee = {
          id: empId,
          userId: userId,
          code: `EMP${MOCK_EMPLOYEES.length + 1}`.padStart(6, '0'),
          fullName: cand.fullName,
          position: cand.positionApplied,
          departmentName: cand.departmentApplied,
          roleTitle: 'STAFF',
          baseSalary: salary,
          insuranceSalary: 4960000, // Default Region I
          status: EmploymentStatus.PROBATION,
          hireDate: new Date().toISOString()
      };
      MOCK_EMPLOYEES.push(newEmp);

      // 3. Update Candidate Status
      cand.status = 'HIRED';
      
      saveToStorage();
  },

  getTasks: async (userId: string, date: string) => MOCK_TASKS,
  getTeamTasks: async (userId: string, role: Role) => MOCK_TASKS,
  createTask: async (task: any) => { MOCK_TASKS.push({id: `t_${Date.now()}`, createdAt: new Date().toISOString(), ...task}); saveToStorage(); },
  updateTask: async (id: string, data: any) => { const t = MOCK_TASKS.find(x => x.id === id); if(t) Object.assign(t, data); saveToStorage(); },
  deleteTask: async (id: string) => { MOCK_TASKS = MOCK_TASKS.filter(x => x.id !== id); saveToStorage(); },
  generateTaskSuggestions: async (input: string) => ({ priority: 'MEDIUM' as TaskPriority, minutes: 30 }),
  analyzeDailyPerformance: async (userId: string, date: string) => {
      // Mock logic to calculate completion rate
      const dayTasks = MOCK_TASKS.filter(t => t.userId === userId && t.date === date);
      const total = dayTasks.length;
      const completed = dayTasks.filter(t => t.status === 'DONE').length;
      return {
          date,
          totalTasks: total,
          completedTasks: completed,
          completionRate: total > 0 ? Math.round((completed/total)*100) : 0,
          totalTimeScheduled: dayTasks.reduce((acc, t) => acc + t.estimatedMinutes, 0),
          efficiencyScore: total > 0 ? Math.round((completed/total)*100) : 0,
          feedback: "Great work today! Keep it up."
      } as DailyTaskAnalysis;
  },
  getSalaryConfig: async () => MOCK_CONFIG,
  updateSalaryConfig: async (newConfig: SalaryConfig) => { MOCK_CONFIG = newConfig; saveToStorage(); },
  updateMonthlyActualRevenue: async (year: number, month: number, actual: number) => {
      const target = MOCK_CONFIG.revenueConfig.months.find(m => m.month === month);
      if (target) target.actual = actual;
      saveToStorage();
  },
  getCurrentIP: async () => '1.1.1.1',
  getNotes: async (userId: string) => MOCK_NOTES.filter(n => n.userId === userId),
  getNotesForDate: async (userId: string, date: string) => MOCK_NOTES.filter(n => n.userId === userId && n.date === date),
  addNote: async (userId: string, date: string, content: string) => { MOCK_NOTES.push({id: `n_${Date.now()}`, userId, date, content, isRead: false, createdAt: new Date().toISOString()}); saveToStorage(); },
  deleteNote: async (id: string) => { MOCK_NOTES = MOCK_NOTES.filter(n => n.id !== id); saveToStorage(); },
  askSystemAI: async (question: string) => "AI Response",
  getActivities: async () => MOCK_ACTIVITIES,
  factoryReset: async () => {
      localStorage.clear();
      window.location.reload();
  },
  getWorkflows: async () => MOCK_WORKFLOWS,
  createWorkflow: async (data: any) => { MOCK_WORKFLOWS.push({id: `wf_${Date.now()}`, lastUpdated: new Date().toISOString(), ...data}); saveToStorage(); },
  updateWorkflow: async (id: string, data: any) => { const w = MOCK_WORKFLOWS.find(x => x.id === id); if(w) { Object.assign(w, data); w.lastUpdated = new Date().toISOString(); } saveToStorage(); },
  deleteWorkflow: async (id: string) => { MOCK_WORKFLOWS = MOCK_WORKFLOWS.filter(x => x.id !== id); saveToStorage(); },
  getContracts: async (userId: string, role: Role) => {
      if (role === Role.ADMIN || role === Role.HR) return MOCK_CONTRACTS;
      return MOCK_CONTRACTS.filter(c => c.employeeId === MOCK_EMPLOYEES.find(e => e.userId === userId)?.id);
  },
  createContract: async (data: any) => { MOCK_CONTRACTS.push({id: `ct_${Date.now()}`, status: 'PENDING', ...data}); saveToStorage(); },
  updateContract: async (id: string, data: any) => {},
  signContract: async (id: string) => { const c = MOCK_CONTRACTS.find(x => x.id === id); if(c) { c.status = 'SIGNED'; c.signedAt = new Date().toISOString(); } saveToStorage(); },
  getCounterparties: async () => MOCK_COUNTERPARTIES,
  createCounterparty: async (data: any) => { MOCK_COUNTERPARTIES.push({id: `cp_${Date.now()}`, ...data}); saveToStorage(); },
  updateCounterparty: async (id: string, data: any) => {},
  deleteCounterparty: async (id: string) => {},
};