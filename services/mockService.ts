
import { 
  User, Role, Employee, Attendance, Payroll, Contract, Leave, 
  LeaveType, EmploymentStatus, AttendanceType, KPIEvaluation, 
  SalaryConfig, RoleTitle, KPIPeriod, DepartmentKPIConfig, 
  Regulation, JobDescription, JDTask, Quiz, QuizResult, QuizQuestion, 
  SmartTask, TaskPriority, DailyTaskAnalysis, CalendarNote, ActivityLog, 
  CompanyRevenueConfig, DepartmentGoal, Permission, Candidate, BusinessReport, Workflow, Counterparty 
} from '../types';
import { calcByBuoi, Shift as LogicShift } from '../lib/shiftLogic';
import { calcSalary } from '../lib/salaryLogic';

// --- Helpers ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
function getCurrentCycleId(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

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

// --- 2. COMPREHENSIVE SEED DATA ---

const DEFAULT_WORKFLOWS: Workflow[] = [
  // 1. Phòng Kinh doanh (Sales)
  {
    id: 'wf_sales_1', department: 'Phòng Kinh doanh (Sales)', title: 'Quy trình Tiếp nhận và Xử lý Yêu cầu Đặt vé', description: 'Từ khi nhận yêu cầu (trực tiếp/online) đến khi xác nhận thông tin cơ bản.', lastUpdated: new Date().toISOString(),
    steps: [
      { id: 's1', order: 1, name: 'Tiếp nhận thông tin', description: 'Ghi nhận hành trình, ngày bay, số lượng khách qua Zalo/Email/Phone.', roleResponsible: 'STAFF', estimatedTime: '10 mins', approvalRequired: false },
      { id: 's2', order: 2, name: 'Kiểm tra & Báo giá', description: 'Check giá trên hệ thống, gửi 3 option tốt nhất cho khách.', roleResponsible: 'STAFF', estimatedTime: '30 mins', approvalRequired: false },
      { id: 's3', order: 3, name: 'Chốt hành trình', description: 'Xác nhận thông tin hành khách (Họ tên, ngày sinh) và tạo Booking (PNR).', roleResponsible: 'STAFF', estimatedTime: '15 mins', approvalRequired: false }
    ]
  },
  {
    id: 'wf_sales_2', department: 'Phòng Kinh doanh (Sales)', title: 'Quy trình Ký Hợp đồng Khách đoàn/Đại lý', description: 'Quy trình đàm phán, chốt điều khoản và ký hợp đồng cung cấp dịch vụ.', lastUpdated: new Date().toISOString(),
    steps: [
      { id: 's1', order: 1, name: 'Đàm phán thương mại', description: 'Thỏa thuận chiết khấu, công nợ và điều kiện hoàn hủy.', roleResponsible: 'HEAD_OF_DEPT', estimatedTime: '2 days', approvalRequired: false },
      { id: 's2', order: 2, name: 'Soạn thảo hợp đồng', description: 'Lên dự thảo hợp đồng theo mẫu công ty.', roleResponsible: 'STAFF', estimatedTime: '4 hours', approvalRequired: false },
      { id: 's3', order: 3, name: 'Duyệt hợp đồng', description: 'Giám đốc xem xét các điều khoản rủi ro.', roleResponsible: 'DIRECTOR', estimatedTime: '1 day', approvalRequired: true },
      { id: 's4', order: 4, name: 'Ký kết & Lưu trữ', description: 'Ký đóng dấu và lưu hồ sơ bản cứng/mềm.', roleResponsible: 'STAFF', estimatedTime: '1 hour', approvalRequired: false }
    ]
  },
  {
    id: 'wf_sales_3', department: 'Phòng Kinh doanh (Sales)', title: 'Quy trình Báo giá và Tư vấn Lộ trình', description: 'Hướng dẫn cách thức tra cứu, so sánh giá vé và tư vấn tối ưu.', lastUpdated: new Date().toISOString(),
    steps: [
      { id: 's1', order: 1, name: 'Phân tích nhu cầu', description: 'Xác định ngân sách và ưu tiên của khách (giá rẻ hay giờ đẹp).', roleResponsible: 'STAFF', estimatedTime: '5 mins', approvalRequired: false },
      { id: 's2', order: 2, name: 'Tra cứu so sánh', description: 'So sánh giá giữa VNA, Vietjet, Bamboo và các hãng quốc tế.', roleResponsible: 'STAFF', estimatedTime: '15 mins', approvalRequired: false },
      { id: 's3', order: 3, name: 'Gửi báo giá mẫu', description: 'Gửi file báo giá theo form chuẩn của công ty.', roleResponsible: 'STAFF', estimatedTime: '10 mins', approvalRequired: false }
    ]
  },
  {
    id: 'wf_sales_4', department: 'Phòng Kinh doanh (Sales)', title: 'Quy trình Chăm sóc Khách hàng Tiềm năng', description: 'Các bước theo dõi, tương tác leads để chuyển đổi thành giao dịch.', lastUpdated: new Date().toISOString(),
    steps: [
      { id: 's1', order: 1, name: 'Phân loại Lead', description: 'Đánh giá mức độ tiềm năng (Hot/Warm/Cold).', roleResponsible: 'STAFF', estimatedTime: '1 hour', approvalRequired: false },
      { id: 's2', order: 2, name: 'Tương tác định kỳ', description: 'Gửi email/tin nhắn khuyến mãi phù hợp nhu cầu.', roleResponsible: 'STAFF', estimatedTime: 'Weekly', approvalRequired: false },
      { id: 's3', order: 3, name: 'Chốt sale', description: 'Gọi điện thuyết phục khi có giá tốt.', roleResponsible: 'STAFF', estimatedTime: '15 mins', approvalRequired: false }
    ]
  },

  // 2. Phòng Vé (Ticketing)
  {
    id: 'wf_ticket_1', department: 'Phòng Vé (Ticketing)', title: 'Quy trình Xuất vé và Gửi Xác nhận', description: 'Thao tác trên GDS để xuất vé, kiểm tra thông tin và gửi mặt vé.', lastUpdated: new Date().toISOString(),
    steps: [
      { id: 's1', order: 1, name: 'Kiểm tra thanh toán', description: 'Xác nhận khách đã chuyển khoản hoặc có hạn mức công nợ.', roleResponsible: 'STAFF', estimatedTime: '5 mins', approvalRequired: false },
      { id: 's2', order: 2, name: 'Kiểm tra thông tin lần cuối', description: 'Đối chiếu tên khách với hộ chiếu/CCCD.', roleResponsible: 'STAFF', estimatedTime: '5 mins', approvalRequired: false },
      { id: 's3', order: 3, name: 'Xuất vé (Issue)', description: 'Thực hiện lệnh xuất vé trên Sabre/Amadeus.', roleResponsible: 'STAFF', estimatedTime: '5 mins', approvalRequired: true },
      { id: 's4', order: 4, name: 'Gửi mặt vé', description: 'Gửi vé điện tử qua Email/Zalo cho khách.', roleResponsible: 'STAFF', estimatedTime: '2 mins', approvalRequired: false }
    ]
  },
  {
    id: 'wf_ticket_2', department: 'Phòng Vé (Ticketing)', title: 'Quy trình Xử lý Thay đổi Vé (Reissue)', description: 'Tính toán phí đổi, chênh lệch giá và thao tác đổi vé.', lastUpdated: new Date().toISOString(),
    steps: [
      { id: 's1', order: 1, name: 'Kiểm tra điều kiện vé', description: 'Xem hạng vé có được phép đổi hay không.', roleResponsible: 'STAFF', estimatedTime: '5 mins', approvalRequired: false },
      { id: 's2', order: 2, name: 'Tính phí đổi', description: 'Tính Phí cố định + Chênh lệch giá (Fare Diff) + Thuế phí.', roleResponsible: 'STAFF', estimatedTime: '15 mins', approvalRequired: false },
      { id: 's3', order: 3, name: 'Thực hiện Reissue', description: 'Thao tác đổi vé trên hệ thống sau khi khách xác nhận.', roleResponsible: 'STAFF', estimatedTime: '20 mins', approvalRequired: true }
    ]
  },
  {
    id: 'wf_ticket_3', department: 'Phòng Vé (Ticketing)', title: 'Quy trình Xử lý Hoàn vé (Refund)', description: 'Tiếp nhận, kiểm tra điều kiện và xử lý hoàn tiền.', lastUpdated: new Date().toISOString(),
    steps: [
      { id: 's1', order: 1, name: 'Tiếp nhận yêu cầu', description: 'Nhận thông tin vé cần hoàn.', roleResponsible: 'STAFF', estimatedTime: '5 mins', approvalRequired: false },
      { id: 's2', order: 2, name: 'Tính toán hoàn tiền', description: 'Trừ phí hoàn theo quy định hãng.', roleResponsible: 'STAFF', estimatedTime: '20 mins', approvalRequired: false },
      { id: 's3', order: 3, name: 'Thao tác Refund', description: 'Thực hiện lệnh hoàn trên BSP hoặc web hãng.', roleResponsible: 'HEAD_OF_DEPT', estimatedTime: '30 mins', approvalRequired: true },
      { id: 's4', order: 4, name: 'Hoàn tiền cho khách', description: 'Chuyển khoản lại cho khách sau khi hãng xác nhận.', roleResponsible: 'ACCOUNTANT', estimatedTime: '1 day', approvalRequired: false }
    ]
  },
  {
    id: 'wf_ticket_4', department: 'Phòng Vé (Ticketing)', title: 'Quy trình Kiểm tra/Duyệt chỗ Nguy cơ', description: 'Theo dõi Time Limit để tránh bị hủy chỗ tự động.', lastUpdated: new Date().toISOString(),
    steps: [
      { id: 's1', order: 1, name: 'Check Queue sáng', description: 'Kiểm tra danh sách Booking sắp hết hạn (TL).', roleResponsible: 'STAFF', estimatedTime: '30 mins', approvalRequired: false },
      { id: 's2', order: 2, name: 'Nhắc khách hàng', description: 'Liên hệ khách xuất vé hoặc gia hạn (nếu được).', roleResponsible: 'STAFF', estimatedTime: '1 hour', approvalRequired: false },
      { id: 's3', order: 3, name: 'Hủy chỗ ảo', description: 'Hủy các booking không tiềm năng để tránh phí phạt hãng.', roleResponsible: 'STAFF', estimatedTime: '15 mins', approvalRequired: false }
    ]
  },

  // 3. Phòng Kế toán Vé (BSP/Finance)
  {
    id: 'wf_acc_1', department: 'Phòng Kế toán Vé (BSP)', title: 'Quy trình Báo cáo BSP Kỹ thuật và Tài chính', description: 'Đối soát dữ liệu bán vé hàng kỳ với BSP.', lastUpdated: new Date().toISOString(),
    steps: [
      { id: 's1', order: 1, name: 'Xuất báo cáo GDS', description: 'Lấy dữ liệu từ Sabre/Amadeus.', roleResponsible: 'STAFF', estimatedTime: '30 mins', approvalRequired: false },
      { id: 's2', order: 2, name: 'Đối chiếu BSP Link', description: 'So khớp số liệu GDS với báo cáo của IATA.', roleResponsible: 'ACCOUNTANT', estimatedTime: '2 hours', approvalRequired: false },
      { id: 's3', order: 3, name: 'Xử lý lệch (ADM/ACM)', description: 'Kiểm tra các khoản phạt hoặc hoàn trả.', roleResponsible: 'ACCOUNTANT', estimatedTime: '1 hour', approvalRequired: true },
      { id: 's4', order: 4, name: 'Thanh toán', description: 'Duyệt lệnh chi trả BSP.', roleResponsible: 'DIRECTOR', estimatedTime: '15 mins', approvalRequired: true }
    ]
  },
  {
    id: 'wf_acc_2', department: 'Phòng Kế toán Vé (BSP)', title: 'Quy trình Thu – Chi và Đối soát Công nợ', description: 'Quản lý dòng tiền và công nợ đại lý.', lastUpdated: new Date().toISOString(),
    steps: [
      { id: 's1', order: 1, name: 'Ghi nhận thu chi', description: 'Cập nhật sổ quỹ hàng ngày.', roleResponsible: 'ACCOUNTANT', estimatedTime: 'Daily', approvalRequired: false },
      { id: 's2', order: 2, name: 'Chốt công nợ tuần', description: 'Gửi bảng kê công nợ cho khách hàng/đại lý.', roleResponsible: 'ACCOUNTANT', estimatedTime: 'Weekly', approvalRequired: false },
      { id: 's3', order: 3, name: 'Thu hồi nợ', description: 'Đôn đốc các khoản nợ quá hạn.', roleResponsible: 'STAFF', estimatedTime: 'Daily', approvalRequired: false }
    ]
  },
  {
    id: 'wf_acc_3', department: 'Phòng Kế toán Vé (BSP)', title: 'Quy trình Quản lý và Hạch toán Hoa hồng', description: 'Tính toán incentive từ hãng.', lastUpdated: new Date().toISOString(),
    steps: [
      { id: 's1', order: 1, name: 'Tổng hợp doanh số', description: 'Tính tổng doanh số theo hãng.', roleResponsible: 'ACCOUNTANT', estimatedTime: 'Monthly', approvalRequired: false },
      { id: 's2', order: 2, name: 'Tính hoa hồng', description: 'Áp dụng công thức incentive của từng hãng.', roleResponsible: 'ACCOUNTANT', estimatedTime: '4 hours', approvalRequired: false },
      { id: 's3', order: 3, name: 'Đối chiếu hãng', description: 'Xác nhận số liệu với kế toán hãng.', roleResponsible: 'HEAD_OF_DEPT', estimatedTime: '2 days', approvalRequired: true }
    ]
  },
  {
    id: 'wf_acc_4', department: 'Phòng Kế toán Vé (BSP)', title: 'Quy trình Xử lý Thanh toán qua Cổng (POS/Gateway)', description: 'Đảm bảo tính bảo mật và chính xác khi xử lý thanh toán thẻ.', lastUpdated: new Date().toISOString(),
    steps: [
      { id: 's1', order: 1, name: 'Tiếp nhận thông tin thẻ', description: 'Nhận link thanh toán hoặc cà thẻ tại quầy.', roleResponsible: 'STAFF', estimatedTime: '5 mins', approvalRequired: false },
      { id: 's2', order: 2, name: 'Xử lý giao dịch', description: 'Thực hiện cà thẻ/nhập liệu trên cổng OnePay/VNPAY.', roleResponsible: 'ACCOUNTANT', estimatedTime: '5 mins', approvalRequired: false },
      { id: 's3', order: 3, name: 'Kiểm tra xác thực', description: 'Xác nhận tiền đã vào tài khoản trung gian.', roleResponsible: 'ACCOUNTANT', estimatedTime: 'Immediate', approvalRequired: true },
      { id: 's4', order: 4, name: 'Phát hành biên lai', description: 'Gửi biên lai thanh toán cho khách.', roleResponsible: 'ACCOUNTANT', estimatedTime: '5 mins', approvalRequired: false }
    ]
  },

  // 4. Phòng Chăm sóc Khách hàng
  {
    id: 'wf_cs_1', department: 'Phòng Chăm sóc Khách hàng', title: 'Quy trình Xử lý Khiếu nại và Tranh chấp', description: 'Giải quyết các phàn nàn về dịch vụ, giá vé.', lastUpdated: new Date().toISOString(),
    steps: [
      { id: 's1', order: 1, name: 'Tiếp nhận phản hồi', description: 'Lắng nghe và ghi nhận nội dung khiếu nại.', roleResponsible: 'STAFF', estimatedTime: '15 mins', approvalRequired: false },
      { id: 's2', order: 2, name: 'Điều tra nguyên nhân', description: 'Kiểm tra lịch sử cuộc gọi, log hệ thống.', roleResponsible: 'HEAD_OF_DEPT', estimatedTime: '4 hours', approvalRequired: false },
      { id: 's3', order: 3, name: 'Đề xuất giải pháp', description: 'Đưa ra phương án đền bù hoặc giải thích.', roleResponsible: 'HEAD_OF_DEPT', estimatedTime: '2 hours', approvalRequired: true },
      { id: 's4', order: 4, name: 'Phản hồi khách', description: 'Liên hệ khách hàng để chốt phương án.', roleResponsible: 'STAFF', estimatedTime: '30 mins', approvalRequired: false }
    ]
  },
  {
    id: 'wf_cs_2', department: 'Phòng Chăm sóc Khách hàng', title: 'Quy trình Hỗ trợ Khách hàng Khẩn cấp 24/7', description: 'Xử lý sự cố sân bay, delay, hủy chuyến gấp.', lastUpdated: new Date().toISOString(),
    steps: [
      { id: 's1', order: 1, name: 'Tiếp nhận hotline', description: 'Nhận cuộc gọi khẩn cấp ngoài giờ.', roleResponsible: 'STAFF', estimatedTime: 'Immed', approvalRequired: false },
      { id: 's2', order: 2, name: 'Kiểm tra PNR', description: 'Xác định tình trạng vé và chuyến bay.', roleResponsible: 'STAFF', estimatedTime: '2 mins', approvalRequired: false },
      { id: 's3', order: 3, name: 'Xử lý tại chỗ', description: 'Đổi vé gấp hoặc hướng dẫn khách làm thủ tục.', roleResponsible: 'STAFF', estimatedTime: '15 mins', approvalRequired: false }
    ]
  },
  {
    id: 'wf_cs_3', department: 'Phòng Chăm sóc Khách hàng', title: 'Quy trình Thu thập Phản hồi (Feedback)', description: 'Gửi khảo sát và phân tích mức độ hài lòng sau dịch vụ.', lastUpdated: new Date().toISOString(),
    steps: [
      { id: 's1', order: 1, name: 'Gửi khảo sát', description: 'Gửi email/Zalo form đánh giá sau khi khách hoàn thành chuyến bay.', roleResponsible: 'STAFF', estimatedTime: 'Daily', approvalRequired: false },
      { id: 's2', order: 2, name: 'Tổng hợp dữ liệu', description: 'Ghi nhận điểm CSAT và NPS.', roleResponsible: 'STAFF', estimatedTime: 'Weekly', approvalRequired: false },
      { id: 's3', order: 3, name: 'Phân tích & Báo cáo', description: 'Đề xuất cải tiến dựa trên feedback xấu.', roleResponsible: 'HEAD_OF_DEPT', estimatedTime: 'Monthly', approvalRequired: true }
    ]
  },

  // 5. Phòng Nhân sự (HR)
  {
    id: 'wf_hr_1', department: 'Phòng Nhân sự', title: 'Quy trình Tuyển dụng & Onboarding', description: 'Tuyển dụng và đào tạo hội nhập nhân viên mới.', lastUpdated: new Date().toISOString(),
    steps: [
      { id: 's1', order: 1, name: 'Đăng tuyển', description: 'Đăng tin trên các kênh tuyển dụng.', roleResponsible: 'STAFF', estimatedTime: '1 week', approvalRequired: false },
      { id: 's2', order: 2, name: 'Phỏng vấn', description: 'Sơ tuyển và phỏng vấn chuyên môn GDS.', roleResponsible: 'HEAD_OF_DEPT', estimatedTime: '3 days', approvalRequired: false },
      { id: 's3', order: 3, name: 'Đào tạo hội nhập', description: 'Giới thiệu văn hóa, quy trình và hệ thống.', roleResponsible: 'STAFF', estimatedTime: '2 days', approvalRequired: false },
      { id: 's4', order: 4, name: 'Đánh giá thử việc', description: 'Đánh giá sau 2 tháng thử việc.', roleResponsible: 'DIRECTOR', estimatedTime: '1 hour', approvalRequired: true }
    ]
  },
  {
    id: 'wf_hr_2', department: 'Phòng Nhân sự', title: 'Quy trình Đánh giá Hiệu suất (KPI)', description: 'Thiết lập và đánh giá KPI định kỳ.', lastUpdated: new Date().toISOString(),
    steps: [
      { id: 's1', order: 1, name: 'Thiết lập mục tiêu', description: 'Giao chỉ tiêu doanh số/công việc đầu tháng.', roleResponsible: 'HEAD_OF_DEPT', estimatedTime: 'Monthly', approvalRequired: true },
      { id: 's2', order: 2, name: 'Theo dõi thực hiện', description: 'Cập nhật số liệu hàng tuần.', roleResponsible: 'STAFF', estimatedTime: 'Weekly', approvalRequired: false },
      { id: 's3', order: 3, name: 'Đánh giá cuối kỳ', description: 'Chấm điểm 3P và phản hồi 1-1.', roleResponsible: 'HEAD_OF_DEPT', estimatedTime: 'Monthly', approvalRequired: true }
    ]
  },

  // 6. Phòng Kỹ thuật (IT)
  {
    id: 'wf_it_1', department: 'Phòng Kỹ thuật', title: 'Quy trình Bảo trì và Nâng cấp Hệ thống', description: 'Đảm bảo phần mềm CRM, Web hoạt động ổn định.', lastUpdated: new Date().toISOString(),
    steps: [
      { id: 's1', order: 1, name: 'Sao lưu dữ liệu', description: 'Backup database hàng ngày.', roleResponsible: 'STAFF', estimatedTime: 'Daily', approvalRequired: false },
      { id: 's2', order: 2, name: 'Kiểm tra bảo mật', description: 'Quét lỗ hổng và cập nhật bản vá.', roleResponsible: 'STAFF', estimatedTime: 'Weekly', approvalRequired: false },
      { id: 's3', order: 3, name: 'Nâng cấp tính năng', description: 'Deploy code mới (nếu có).', roleResponsible: 'HEAD_OF_DEPT', estimatedTime: 'Adhoc', approvalRequired: true }
    ]
  },
  {
    id: 'wf_it_2', department: 'Phòng Kỹ thuật', title: 'Quy trình Xử lý Sự cố Kỹ thuật', description: 'Khắc phục lỗi kết nối GDS, mạng, phần cứng.', lastUpdated: new Date().toISOString(),
    steps: [
      { id: 's1', order: 1, name: 'Tiếp nhận báo lỗi', description: 'Nhận ticket từ các phòng ban.', roleResponsible: 'STAFF', estimatedTime: '15 mins', approvalRequired: false },
      { id: 's2', order: 2, name: 'Chẩn đoán & Sửa chữa', description: 'Xác định nguyên nhân và fix lỗi.', roleResponsible: 'STAFF', estimatedTime: 'Variable', approvalRequired: false },
      { id: 's3', order: 3, name: 'Báo cáo nguyên nhân', description: 'Ghi log và đề xuất giải pháp phòng ngừa.', roleResponsible: 'STAFF', estimatedTime: '1 hour', approvalRequired: false }
    ]
  },

  // 7. Ban Giám đốc (Management)
  {
    id: 'wf_mgmt_1', department: 'Ban Giám đốc', title: 'Quy trình Phê duyệt Chiến lược Kinh doanh', description: 'Xây dựng và duyệt kế hoạch năm.', lastUpdated: new Date().toISOString(),
    steps: [
      { id: 's1', order: 1, name: 'Tổng hợp báo cáo', description: 'Các phòng ban gửi số liệu quá khứ và dự báo.', roleResponsible: 'HEAD_OF_DEPT', estimatedTime: '1 week', approvalRequired: false },
      { id: 's2', order: 2, name: 'Lập kế hoạch', description: 'Xây dựng mục tiêu doanh thu, chi phí.', roleResponsible: 'DIRECTOR', estimatedTime: '3 days', approvalRequired: false },
      { id: 's3', order: 3, name: 'Phê duyệt', description: 'Chốt kế hoạch chính thức.', roleResponsible: 'DIRECTOR', estimatedTime: '1 day', approvalRequired: true }
    ]
  },
  {
    id: 'wf_mgmt_2', department: 'Ban Giám đốc', title: 'Quy trình Quản lý Rủi ro', description: 'Nhận diện và xử lý rủi ro tài chính/vận hành.', lastUpdated: new Date().toISOString(),
    steps: [
      { id: 's1', order: 1, name: 'Nhận diện rủi ro', description: 'Phát hiện rủi ro (tỷ giá, công nợ xấu...).', roleResponsible: 'ALL', estimatedTime: 'Continuous', approvalRequired: false },
      { id: 's2', order: 2, name: 'Đánh giá tác động', description: 'Phân tích mức độ ảnh hưởng.', roleResponsible: 'HEAD_OF_DEPT', estimatedTime: '4 hours', approvalRequired: false },
      { id: 's3', order: 3, name: 'Ra quyết định', description: 'Đưa ra biện pháp xử lý kịp thời.', roleResponsible: 'DIRECTOR', estimatedTime: 'Immed', approvalRequired: true }
    ]
  }
];

const DEFAULT_REGULATIONS: Regulation[] = [
  { id: 'reg1', title: 'Nội quy Lao động Chung', category: 'Hành chính', content: '1. Thời gian làm việc: 8h00 - 17h30.\n2. Trang phục: Lịch sự, chuyên nghiệp (Đồng phục vào T2, T6).\n3. Đi trễ: Phạt 50k/lần nếu không có lý do chính đáng.\n4. Nghỉ phép: Xin trước 24h.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'reg2', title: 'Quy định Bảo mật Thông tin', category: 'Bảo mật', content: '1. Không tiết lộ thông tin khách hàng (SDT, Hộ chiếu, Hành trình) cho bên thứ 3.\n2. Không mang dữ liệu công ty ra ngoài thiết bị cá nhân.\n3. Các tài khoản GDS phải được bảo mật tuyệt đối, không chia sẻ password.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'reg3', title: 'Quy trình Xuất Hóa Đơn', category: 'Kế toán', content: '1. Yêu cầu xuất hóa đơn phải có đầy đủ thông tin: Tên cty, MST, Địa chỉ chính xác.\n2. Hóa đơn trên 20 triệu phải chuyển khoản từ tài khoản công ty.\n3. Gửi hóa đơn điện tử cho khách trong ngày xuất vé.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'reg4', title: 'Chính sách Lương & Hoa hồng', category: 'Phúc lợi', content: '1. Lương cứng trả vào ngày 05 hàng tháng.\n2. Hoa hồng doanh số trả vào ngày 15.\n3. Thưởng KPI dựa trên đánh giá cuối tháng.\n4. Phụ cấp ăn trưa: 730.000 VNĐ/tháng.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'reg5', title: 'Quy tắc Ứng xử Khách hàng', category: 'CSKH', content: '1. Luôn chào hỏi khách hàng niềm nở.\n2. Phản hồi tin nhắn/email trong vòng 15 phút.\n3. Không tranh cãi với khách hàng, báo cáo cấp trên khi có sự cố.\n4. Xin lỗi chân thành khi có sai sót.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];

// --- 8 DETAILED JOB DESCRIPTIONS ---
const DEFAULT_JDS: JobDescription[] = [
  // 1. BAN GIÁM ĐỐC
  {
    id: 'jd_ceo', departmentName: 'Ban Giám đốc', position: 'Giám đốc Điều hành (CEO)', baseSalaryRange: 'Thỏa thuận',
    description: 'Chịu trách nhiệm cao nhất về kết quả hoạt động kinh doanh, định hướng chiến lược và quản lý tổng thể công ty.',
    responsibilities: '- Xây dựng chiến lược kinh doanh ngắn hạn và dài hạn.\n- Quản lý dòng tiền, phê duyệt ngân sách và chi phí vận hành.\n- Đại diện công ty làm việc với các đối tác chiến lược (Hãng hàng không, IATA, Ngân hàng).\n- Phê duyệt các quy trình, quy chế và tuyển dụng nhân sự cấp cao.',
    requirements: '- Tốt nghiệp Đại học/Thạc sĩ Quản trị Kinh doanh.\n- Kinh nghiệm > 5 năm quản lý trong ngành Du lịch/Hàng không.\n- Tư duy chiến lược, lãnh đạo và quyết đoán.\n- Tiếng Anh lưu loát.',
    benefits: '- Cổ phần ưu đãi.\n- Xe đưa đón, chế độ công tác phí đặc biệt.',
    tasks: [
      { id: 't_ceo_1', content: 'Duyệt báo cáo tài chính tuần', frequency: 'WEEKLY', salaryWeight: 0 },
      { id: 't_ceo_2', content: 'Họp giao ban toàn công ty', frequency: 'WEEKLY', salaryWeight: 0 },
      { id: 't_ceo_3', content: 'Đánh giá KPI Trưởng phòng', frequency: 'MONTHLY', salaryWeight: 0 }
    ]
  },

  // 2. PHÒNG VÉ (2 vị trí)
  {
    id: 'jd_head_ticketing', departmentName: 'Phòng Vé (Ticketing)', position: 'Trưởng phòng Vé', baseSalaryRange: '20.000.000 - 30.000.000',
    description: 'Quản lý, điều hành hoạt động của phòng vé, đảm bảo doanh số và chất lượng dịch vụ, giảm thiểu sai sót nghiệp vụ.',
    responsibilities: '- Phân công ca trực, giám sát hiệu quả làm việc của nhân viên ticketing.\n- Xử lý các ca vé khó, vé đoàn phức tạp mà nhân viên không xử lý được.\n- Kiểm soát ADM (phạt từ hãng), tìm nguyên nhân và đào tạo lại nhân viên.\n- Cập nhật chính sách hãng bay mới nhất cho toàn bộ đội ngũ.',
    requirements: '- Chứng chỉ nghiệp vụ bán vé Quốc tế (IATA).\n- Thành thạo 3 hệ thống GDS: Sabre, Amadeus, Galileo.\n- Kỹ năng quản lý đội nhóm, chịu áp lực cao.\n- Kinh nghiệm > 3 năm ở vị trí tương đương.',
    benefits: '- Thưởng doanh số phòng.\n- Vé FOC đi công tác/đào tạo nước ngoài.',
    tasks: [
      { id: 't_head_1', content: 'Kiểm tra báo cáo xuất vé ngày hôm trước', frequency: 'DAILY', salaryWeight: 5 },
      { id: 't_head_2', content: 'Rà soát các booking sắp hết hạn (Queue Check)', frequency: 'DAILY', salaryWeight: 5 },
      { id: 't_head_3', content: 'Đào tạo nghiệp vụ cho nhân viên mới', frequency: 'WEEKLY', salaryWeight: 10 }
    ]
  },
  {
    id: 'jd_ticketer', departmentName: 'Phòng Vé (Ticketing)', position: 'Nhân viên Ticketing (Booker)', baseSalaryRange: '8.000.000 - 15.000.000',
    description: 'Trực tiếp thực hiện các nghiệp vụ đặt giữ chỗ, báo giá, xuất vé, hoàn hủy đổi vé cho khách hàng và đại lý.',
    responsibilities: '- Tiếp nhận yêu cầu, tư vấn hành trình bay tối ưu cho khách.\n- Đặt giữ chỗ (Booking), báo giá và theo dõi Time Limit.\n- Xuất vé, thực hiện các nghiệp vụ Reissue (đổi vé), Refund (hoàn vé) chính xác.\n- Hỗ trợ check-in online, mua hành lý, chỗ ngồi.',
    requirements: '- Có chứng chỉ nghiệp vụ vé cơ bản.\n- Cẩn thận, tỉ mỉ, trung thực (tránh sai sót tên/ngày giờ).\n- Sử dụng được ít nhất 1 hệ thống GDS (Sabre/Amadeus).',
    benefits: '- Hoa hồng trên mỗi đầu vé.\n- Thưởng KPI không để xảy ra ADM.',
    tasks: [
      { id: 't_tkt_1', content: 'Kiểm tra và xử lý Queue vé (HX, UN, TK)', frequency: 'DAILY', salaryWeight: 10 },
      { id: 't_tkt_2', content: 'Gửi báo cáo vé xuất trong ca', frequency: 'DAILY', salaryWeight: 5 },
      { id: 't_tkt_3', content: 'Cập nhật bảng giá vé đoàn/khuyến mãi', frequency: 'WEEKLY', salaryWeight: 5 }
    ]
  },

  // 3. PHÒNG KINH DOANH
  {
    id: 'jd_sales', departmentName: 'Phòng Kinh doanh (Sales)', position: 'Nhân viên Kinh doanh', baseSalaryRange: '7.000.000 - 12.000.000 + Comm',
    description: 'Tìm kiếm, phát triển mạng lưới khách hàng doanh nghiệp (Corporate) và Đại lý cấp 2 (F2).',
    responsibilities: '- Tìm kiếm khách hàng mới (Telesales, Email Marketing, Networking).\n- Tư vấn ký kết hợp đồng cung cấp vé máy bay cho doanh nghiệp.\n- Chăm sóc khách hàng cũ, duy trì doanh số.\n- Phối hợp với phòng vé để xử lý yêu cầu của khách hàng mình phụ trách.',
    requirements: '- Kỹ năng giao tiếp, đàm phán tốt.\n- Ngoại hình ưa nhìn, tác phong chuyên nghiệp.\n- Chịu được áp lực doanh số.\n- Có laptop và phương tiện đi lại.',
    benefits: '- % Hoa hồng cao theo doanh số mang về.\n- Phụ cấp điện thoại, xăng xe, tiếp khách.',
    tasks: [
      { id: 't_sale_1', content: 'Thực hiện 20 cuộc gọi/email chào hàng', frequency: 'DAILY', salaryWeight: 10 },
      { id: 't_sale_2', content: 'Đăng bài marketing trên Zalo/Facebook', frequency: 'DAILY', salaryWeight: 5 },
      { id: 't_sale_3', content: 'Báo cáo danh sách khách hàng tiềm năng', frequency: 'WEEKLY', salaryWeight: 5 }
    ]
  },

  // 4. PHÒNG KẾ TOÁN VÉ
  {
    id: 'jd_accountant', departmentName: 'Phòng Kế toán Vé (BSP)', position: 'Kế toán Vé (BSP)', baseSalaryRange: '10.000.000 - 15.000.000',
    description: 'Kiểm soát dòng tiền, công nợ đại lý và đối chiếu báo cáo BSP với IATA/Hãng hàng không.',
    responsibilities: '- Đối chiếu báo cáo bán (Sales Report) từ phòng vé với tiền về ngân hàng.\n- Theo dõi và thu hồi công nợ đại lý/khách hàng doanh nghiệp.\n- Kiểm tra báo cáo BSP theo kỳ (Billing Analysis) để phát hiện sai lệch.\n- Xuất hóa đơn GTGT cho khách hàng.',
    requirements: '- Tốt nghiệp Đại học chuyên ngành Tài chính - Kế toán.\n- Thành thạo Excel (Vlookup, Pivot Table) và phần mềm kế toán.\n- Trung thực, cẩn trọng số liệu.',
    benefits: '- Thưởng hoàn thành báo cáo đúng hạn.\n- Chế độ BHXH full lương.',
    tasks: [
      { id: 't_acc_1', content: 'Đối chiếu tiền về tài khoản ngân hàng', frequency: 'DAILY', salaryWeight: 8 },
      { id: 't_acc_2', content: 'Gửi thông báo nhắc nợ quá hạn', frequency: 'WEEKLY', salaryWeight: 5 },
      { id: 't_acc_3', content: 'Chốt số liệu báo cáo BSP', frequency: 'WEEKLY', salaryWeight: 10 }
    ]
  },

  // 5. PHÒNG CSKH
  {
    id: 'jd_cs', departmentName: 'Phòng Chăm sóc Khách hàng', position: 'Nhân viên CSKH', baseSalaryRange: '7.000.000 - 10.000.000',
    description: 'Tiếp nhận phản hồi, giải quyết khiếu nại và hỗ trợ khách hàng sau bán hàng.',
    responsibilities: '- Trực tổng đài/Hotline, Fanpage, Zalo OA.\n- Hỗ trợ khách hàng xử lý các sự cố sân bay (delay, hủy chuyến, thất lạc hành lý).\n- Tiếp nhận và xử lý khiếu nại về thái độ phục vụ hoặc sai sót vé.\n- Gọi điện chăm sóc khách hàng VIP dịp lễ tết.',
    requirements: '- Giọng nói chuẩn, nhẹ nhàng, không ngọng.\n- Kỹ năng lắng nghe và giải quyết vấn đề (EQ cao).\n- Kiên nhẫn, bình tĩnh xử lý tình huống khủng hoảng.',
    benefits: '- Thưởng theo đánh giá hài lòng của khách (CSAT).',
    tasks: [
      { id: 't_cs_1', content: 'Phản hồi tin nhắn Fanpage/Zalo (tồn < 15p)', frequency: 'DAILY', salaryWeight: 5 },
      { id: 't_cs_2', content: 'Gọi 10 cuộc khảo sát hài lòng sau bay', frequency: 'DAILY', salaryWeight: 8 },
      { id: 't_cs_3', content: 'Báo cáo tổng hợp khiếu nại tuần', frequency: 'WEEKLY', salaryWeight: 5 }
    ]
  },

  // 6. PHÒNG NHÂN SỰ
  {
    id: 'jd_hr', departmentName: 'Phòng Nhân sự', position: 'Chuyên viên Nhân sự', baseSalaryRange: '9.000.000 - 13.000.000',
    description: 'Thực hiện công tác tuyển dụng, tính lương, BHXH và xây dựng văn hóa doanh nghiệp.',
    responsibilities: '- Đăng tuyển, sàng lọc hồ sơ và tổ chức phỏng vấn.\n- Theo dõi chấm công, tính lương, thưởng hàng tháng.\n- Thực hiện các thủ tục BHXH, BHYT cho nhân viên.\n- Tổ chức các hoạt động nội bộ (Sinh nhật, Teambuilding).',
    requirements: '- Hiểu biết về Luật Lao động.\n- Kỹ năng giao tiếp, kết nối mọi người.\n- Bảo mật thông tin lương thưởng.',
    benefits: '- Môi trường làm việc ổn định.',
    tasks: [
      { id: 't_hr_1', content: 'Kiểm tra dữ liệu chấm công vân tay/FaceID', frequency: 'DAILY', salaryWeight: 5 },
      { id: 't_hr_2', content: 'Cập nhật hồ sơ nhân sự/ứng viên', frequency: 'WEEKLY', salaryWeight: 5 },
      { id: 't_hr_3', content: 'Tổ chức happy hour/sinh nhật tháng', frequency: 'MONTHLY', salaryWeight: 2 }
    ]
  },

  // 7. PHÒNG KỸ THUẬT
  {
    id: 'jd_it', departmentName: 'Phòng Kỹ thuật', position: 'IT Support', baseSalaryRange: '8.000.000 - 12.000.000',
    description: 'Đảm bảo hệ thống máy tính, mạng, phần mềm GDS hoạt động ổn định.',
    responsibilities: '- Cài đặt, bảo trì máy tính, máy in xuất vé.\n- Quản lý hệ thống mạng, Wifi, Server nội bộ.\n- Hỗ trợ nhân viên cài đặt phần mềm Sabre, Amadeus.\n- Bảo mật dữ liệu khách hàng.',
    requirements: '- Tốt nghiệp Cao đẳng/Đại học CNTT/Hệ thống mạng.\n- Hiểu biết về phần cứng và mạng LAN/WAN.\n- Nhiệt tình, hỗ trợ nhanh chóng.',
    benefits: '- Phụ cấp trực ngoài giờ khi có sự cố.',
    tasks: [
      { id: 't_it_1', content: 'Sao lưu dữ liệu hệ thống (Backup)', frequency: 'DAILY', salaryWeight: 5 },
      { id: 't_it_2', content: 'Kiểm tra an toàn bảo mật/Virus', frequency: 'WEEKLY', salaryWeight: 5 },
      { id: 't_it_3', content: 'Bảo trì định kỳ máy in vé', frequency: 'MONTHLY', salaryWeight: 5 }
    ]
  }
];

const DEFAULT_QUIZZES: Quiz[] = [
  {
    id: 'q1', title: 'Kiến thức Nghiệp vụ Ticketing Cơ bản', description: 'Bài kiểm tra đánh giá năng lực cơ bản cho nhân viên mới.', departmentTarget: 'Phòng Vé (Ticketing)', timeLimitMinutes: 20, createdAt: new Date().toISOString(),
    questions: [
      { id: 'qq1', text: 'Mã sân bay của Tuy Hòa là gì?', options: ['TBB', 'THD', 'UIH', 'VKG'], correctIndex: 0 },
      { id: 'qq2', text: 'Hạng vé nào thường không được hoàn hủy?', options: ['Thương gia', 'Phổ thông linh hoạt', 'Phổ thông tiết kiệm', 'Hạng nhất'], correctIndex: 2 },
      { id: 'qq3', text: 'Hệ thống GDS nào phổ biến nhất?', options: ['Sabre', 'Amadeus', 'Galileo', 'Cả 3'], correctIndex: 3 }
    ]
  },
  {
    id: 'q2', title: 'Văn hóa Doanh nghiệp & Quy định', description: 'Hiểu biết về quy định và văn hóa công ty.', departmentTarget: 'Phòng Nhân sự', timeLimitMinutes: 15, createdAt: new Date().toISOString(),
    questions: [
      { id: 'qq4', text: 'Giờ làm việc buổi sáng bắt đầu lúc mấy giờ?', options: ['7:30', '8:00', '8:30', '9:00'], correctIndex: 1 },
      { id: 'qq5', text: 'Slogan của công ty là gì?', options: ['Uy tín là vàng', 'Bay cùng cảm xúc', 'Tận tâm phục vụ', 'Nhanh chóng tiện lợi'], correctIndex: 2 },
      { id: 'qq6', text: 'Mức phạt đi trễ là bao nhiêu?', options: ['20k', '50k', '100k', 'Không phạt'], correctIndex: 1 }
    ]
  },
  {
    id: 'q3', title: 'Nghiệp vụ Kế toán Vé BSP', description: 'Kiểm tra kiến thức về báo cáo và công nợ.', departmentTarget: 'Phòng Kế toán Vé (BSP)', timeLimitMinutes: 30, createdAt: new Date().toISOString(),
    questions: [
      { id: 'qq7', text: 'Kỳ báo cáo BSP thường là bao lâu?', options: ['Hàng ngày', 'Hàng tuần', '1 kỳ/tháng', 'Theo quý'], correctIndex: 1 },
      { id: 'qq8', text: 'ADM là viết tắt của gì?', options: ['Admin Message', 'Agency Debit Memo', 'Airline Data Map', 'Automatic Debit Mode'], correctIndex: 1 }
    ]
  },
  {
    id: 'q4', title: 'Kỹ năng Xử lý Khiếu nại', description: 'Dành cho nhân viên CSKH.', departmentTarget: 'Phòng Chăm sóc Khách hàng', timeLimitMinutes: 20, createdAt: new Date().toISOString(),
    questions: [
      { id: 'qq9', text: 'Bước đầu tiên khi khách hàng tức giận là gì?', options: ['Giải thích ngay', 'Lắng nghe và xin lỗi', 'Chuyển máy cho quản lý', 'Cúp máy'], correctIndex: 1 },
      { id: 'qq10', text: 'Thời gian cam kết phản hồi khiếu nại là bao lâu?', options: ['24h', '48h', '1 tuần', 'Ngay lập tức'], correctIndex: 0 }
    ]
  }
];

const DEFAULT_REPORTS: BusinessReport[] = [
  { id: 'rpt1', creatorId: 'u5', creatorName: 'Nguyễn Thị Sương', department: 'Phòng Vé (Ticketing)', type: 'WEEK', period: 'Tuần 42 - 2024', title: 'Báo cáo doanh số vé tuần 42', content: 'Doanh số tăng 15% so với tuần trước do có đoàn khách đi Nhật Bản. Gặp khó khăn xử lý vé hoàn Vietnam Airlines do hệ thống lỗi.', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 'rpt2', creatorId: 'u3', creatorName: 'Thái Thị Trang', department: 'Phòng Kinh doanh (Sales)', type: 'MONTH', period: 'Tháng 10/2024', title: 'Tổng kết doanh số tháng 10', content: 'Đạt 95% chỉ tiêu tháng. Đã ký được 2 hợp đồng đoàn lớn cho dịp Tết.', createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
  { id: 'rpt3', creatorId: 'u4', creatorName: 'Lê Thị Trang', department: 'Phòng Kế toán Vé (BSP)', type: 'MONTH', period: 'Tháng 10/2024', title: 'Báo cáo Công nợ Quý 3', content: 'Đã thu hồi 80% công nợ quá hạn. Tỷ lệ sai sót ADM giảm xuống dưới 1%.', createdAt: new Date(Date.now() - 86400000 * 5).toISOString() }
];

const DEFAULT_REVIEWS: KPIEvaluation[] = [
  { id: 'rev1', employeeId: 'e5', employeeName: 'Nguyễn Thị Sương', period: 'MONTH', cycle: '2024-10', status: 'COMPLETED', scoreP1: 95, scoreP2: 90, scoreP3: 100, totalScore: 95, notes: 'Hoàn thành xuất sắc nhiệm vụ tháng 10. Xử lý vé khó rất tốt.', evaluatedBy: 'Dương Thị Hồng Hương', evaluatedAt: new Date().toISOString() },
  { id: 'rev2', employeeId: 'e3', employeeName: 'Thái Thị Trang', period: 'MONTH', cycle: '2024-10', status: 'COMPLETED', scoreP1: 90, scoreP2: 85, scoreP3: 95, totalScore: 90, notes: 'Doanh số tốt, cần cải thiện báo cáo đúng hạn.', evaluatedBy: 'Dương Thị Hồng Hương', evaluatedAt: new Date().toISOString() },
  { id: 'rev3', employeeId: 'e4', employeeName: 'Lê Thị Trang', period: 'MONTH', cycle: '2024-10', status: 'COMPLETED', scoreP1: 100, scoreP2: 95, scoreP3: 90, totalScore: 95, notes: 'Số liệu chính xác, không có sai sót.', evaluatedBy: 'Nguyễn Công Thắng', evaluatedAt: new Date().toISOString() },
  { id: 'rev4', employeeId: 'e2', employeeName: 'Dương Thị Hồng Hương', period: 'QUARTER', cycle: '2024-Q3', status: 'COMPLETED', scoreP1: 95, scoreP2: 98, scoreP3: 92, totalScore: 95, notes: 'Quản lý đội nhóm hiệu quả, đạt KPI phòng.', evaluatedBy: 'Nguyễn Công Thắng', evaluatedAt: new Date().toISOString() }
];

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
let MOCK_COUNTERPARTIES: Counterparty[] = [
    { id: 'cp1', type: 'BUSINESS', name: 'Công ty Du lịch Sao Mai', taxId: '0101234567', address: '123 Cầu Giấy, HN', representative: 'Nguyễn Văn A' },
    { id: 'cp2', type: 'INDIVIDUAL', name: 'Trần Thị B', citizenId: '001188000123', address: 'TP Vinh, Nghệ An', phone: '0912345678' }
];

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
  departmentKPIs: [
      { 
          departmentName: 'Phòng Vé (Ticketing)', 
          criteria: [{id: 'c1', name: 'Sai sót nghiệp vụ', weight: 40}, {id: 'c2', name: 'Tốc độ phản hồi (Response Time)', weight: 60}],
          goals: [{id: 'g1', name: 'Doanh số vé lẻ', target: 500000000, unit: 'VND', weight: 60}, {id: 'g1b', name: 'Số lượng vé xuất', target: 500, unit: 'Vé', weight: 40}]
      },
      { 
          departmentName: 'Phòng Kinh doanh (Sales)', 
          criteria: [{id: 'c3', name: 'Khách hàng mới (New Leads)', weight: 50}, {id: 'c4', name: 'Chăm sóc khách cũ', weight: 50}],
          goals: [{id: 'g2', name: 'Doanh số đoàn', target: 2000000000, unit: 'VND', weight: 100}]
      },
      { 
          departmentName: 'Phòng Kế toán Vé (BSP)', 
          criteria: [{id: 'c5', name: 'Chính xác số liệu', weight: 70}, {id: 'c6', name: 'Thu hồi công nợ', weight: 30}],
          goals: [{id: 'g3', name: 'Tỷ lệ ADM (Phạt)', target: 0, unit: 'ADM', weight: 100}]
      },
      { 
          departmentName: 'Phòng Chăm sóc Khách hàng', 
          criteria: [{id: 'c7', name: 'Thái độ phục vụ', weight: 60}, {id: 'c8', name: 'Thời gian xử lý khiếu nại', weight: 40}],
          goals: [{id: 'g4', name: 'Điểm hài lòng (CSAT)', target: 4.8, unit: 'Điểm', weight: 100}]
      },
      { 
          departmentName: 'Phòng Nhân sự', 
          criteria: [{id: 'c9', name: 'Tuyển dụng đúng hạn', weight: 50}, {id: 'c10', name: 'Tổ chức đào tạo', weight: 50}],
          goals: [{id: 'g5', name: 'Tỷ lệ nhân sự nghỉ việc', target: 5, unit: '%', weight: 100}]
      }
  ],
  revenueConfig: { year: 2024, annualTarget: 12000000000, months: Array.from({length: 12}, (_, i) => ({ month: i+1, target: 1000000000, actual: 0 })) },
  companyLocation: { lat: 21.0285, lng: 105.8542, radiusMeters: 100, addressName: 'Hanoi' },
  attendanceConfig: { requireGPS: true, requireFaceID: false, requireWifi: false, allowedIPs: [] }
};

// --- TEMPLATES ---
export const CONTRACT_TEMPLATES = {
    EMPLOYMENT: `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n----------------\n\nHỢP ĐỒNG LAO ĐỘNG\nSố: ......./HĐLĐ-2025/US\n\nBên A (Người sử dụng lao động): CÔNG TY TNHH TM & DV UYỂN SƯƠNG\nĐại diện: Ông Nguyễn Công Thắng - Chức vụ: Giám đốc\n\nBên B (Người lao động): {NAME}\nSinh ngày: {BIRTH_DATE}\nCCCD/CMND số: {ID_CARD}\nĐịa chỉ: {ADDRESS}\n\nHai bên thỏa thuận ký kết hợp đồng lao động với các điều khoản sau:\nĐiều 1: Vị trí và công việc\n- Vị trí: {POSITION}\n- Mức lương: {SALARY} VNĐ/tháng\n\nĐiều 2: Thời hạn hợp đồng\n- Từ ngày: {START_DATE} đến {END_DATE}\n\n(Các điều khoản khác về BHXH, Thưởng, Kỷ luật...)\n`,
    UNION: `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n----------------\n\nTHỎA ƯỚC LAO ĐỘNG TẬP THỂ\nSố: ......./TƯLĐTT-2025/US\n\nBên A: CÔNG TY TNHH TM & DV UYỂN SƯƠNG\nĐại diện: Ban Giám đốc\n\nBên B: TẬP THỂ NGƯỜI LAO ĐỘNG\nĐại diện: Ban chấp hành Công đoàn cơ sở\n\nHai bên thỏa thuận ký kết thỏa ước lao động tập thể với các nội dung sau:\n1. Thời giờ làm việc và nghỉ ngơi...\n2. Chế độ lương, thưởng, phụ cấp...\n3. An toàn vệ sinh lao động...\n4. Các chế độ phúc lợi khác...\n`,
    PARTNERSHIP: `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n----------------\n\nHỢP ĐỒNG HỢP TÁC KINH DOANH\nSố: ......./HĐHT-2025/US\n\nBên A: CÔNG TY TNHH TM & DV UYỂN SƯƠNG\nĐịa chỉ: ...\nMã số thuế: ...\n\nBên B (Đối tác): {NAME}\nMã số thuế / CCCD: {TAX_ID_OR_ID}\nĐại diện bởi: {REPRESENTATIVE}\nĐịa chỉ: {ADDRESS}\n\nHai bên thống nhất hợp tác trong lĩnh vực cung cấp vé máy bay và dịch vụ du lịch với các nội dung sau:\n1. Nguyên tắc hợp tác: ...\n2. Phân chia lợi nhuận: ...\n3. Trách nhiệm của các bên: ...\n`,
    CTV: `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n----------------\n\nHỢP ĐỒNG CỘNG TÁC VIÊN\nSố: ......./HĐCTV-2025/US\n\nBên A: CÔNG TY TNHH TM & DV UYỂN SƯƠNG\n\nBên B (Cộng tác viên): {NAME}\nCCCD: {ID_CARD}\nĐịa chỉ: {ADDRESS}\n\nHai bên thỏa thuận ký kết hợp đồng cộng tác viên bán vé máy bay:\n1. Chính sách hoa hồng: Theo quy định hiện hành của Công ty.\n2. Quyền lợi: Được hỗ trợ nghiệp vụ, xuất vé 24/7.\n3. Nghĩa vụ: Không bán phá giá, tuân thủ quy định hãng.\n`,
    AGENCY_F2: `HỢP ĐỒNG ĐẠI LÝ CẤP 2 (F2)\n...\nBên B (Đại lý F2): {NAME}\n...\nNội dung: Bên A cấp quyền xuất vé cho Bên B trên hệ thống...\nMức ký quỹ: ...\nChính sách phí: ...\n`,
    SUPPLIER: `HỢP ĐỒNG CUNG CẤP DỊCH VỤ (HÃNG/NCC)\n...\nBên B (Nhà cung cấp): {NAME}\n...\nNội dung: Bên B cung cấp dịch vụ vé máy bay/phần mềm cho Bên A...\n`
};

export const DEFAULT_CONTRACT_TEMPLATE = CONTRACT_TEMPLATES.EMPLOYMENT;

// --- 6. SELF-HEALING PERSISTENCE ---
const loadFromStorage = () => {
    if (localStorage.getItem('nexus_users')) MOCK_USERS = JSON.parse(localStorage.getItem('nexus_users')!);
    
    // Employees - preserve manual edits but ensure defaults exist
    if (localStorage.getItem('nexus_employees')) {
        MOCK_EMPLOYEES = JSON.parse(localStorage.getItem('nexus_employees')!);
    }
    
    if (localStorage.getItem('nexus_candidates')) MOCK_CANDIDATES = JSON.parse(localStorage.getItem('nexus_candidates')!);
    if (localStorage.getItem('nexus_attendance')) MOCK_ATTENDANCE = JSON.parse(localStorage.getItem('nexus_attendance')!);
    if (localStorage.getItem('nexus_payroll')) MOCK_PAYROLL = JSON.parse(localStorage.getItem('nexus_payroll')!);
    if (localStorage.getItem('nexus_leaves')) MOCK_LEAVES = JSON.parse(localStorage.getItem('nexus_leaves')!);
    
    if (localStorage.getItem('nexus_contracts')) {
        const storedContracts = JSON.parse(localStorage.getItem('nexus_contracts')!);
        MOCK_CONTRACTS = storedContracts.map((c: any) => ({
            ...c,
            category: c.category || 'INTERNAL'
        }));
    }
    
    // --- FORCE FILL EMPTY CATEGORIES WITH DEFAULTS ---
    // Always merge or fill defaults if empty to ensure comprehensive data
    if (localStorage.getItem('nexus_reviews')) {
        MOCK_REVIEWS = JSON.parse(localStorage.getItem('nexus_reviews')!);
        if (MOCK_REVIEWS.length === 0) MOCK_REVIEWS = [...DEFAULT_REVIEWS];
    } else {
        MOCK_REVIEWS = [...DEFAULT_REVIEWS];
    }

    if (localStorage.getItem('nexus_reports')) {
        MOCK_BUSINESS_REPORTS = JSON.parse(localStorage.getItem('nexus_reports')!);
        if (MOCK_BUSINESS_REPORTS.length === 0) MOCK_BUSINESS_REPORTS = [...DEFAULT_REPORTS];
    } else {
        MOCK_BUSINESS_REPORTS = [...DEFAULT_REPORTS];
    }

    if (localStorage.getItem('nexus_counterparties')) {
        MOCK_COUNTERPARTIES = JSON.parse(localStorage.getItem('nexus_counterparties')!);
    }

    if (localStorage.getItem('nexus_workflows')) {
        MOCK_WORKFLOWS = JSON.parse(localStorage.getItem('nexus_workflows')!);
        if (MOCK_WORKFLOWS.length === 0) MOCK_WORKFLOWS = [...DEFAULT_WORKFLOWS];
    } else {
        MOCK_WORKFLOWS = [...DEFAULT_WORKFLOWS];
    }

    if (localStorage.getItem('nexus_regulations')) {
        MOCK_REGULATIONS = JSON.parse(localStorage.getItem('nexus_regulations')!);
        if (MOCK_REGULATIONS.length === 0) MOCK_REGULATIONS = [...DEFAULT_REGULATIONS];
    } else {
        MOCK_REGULATIONS = [...DEFAULT_REGULATIONS];
    }

    if (localStorage.getItem('nexus_jds')) {
        MOCK_JDS = JSON.parse(localStorage.getItem('nexus_jds')!);
        if (MOCK_JDS.length === 0) MOCK_JDS = [...DEFAULT_JDS];
    } else {
        MOCK_JDS = [...DEFAULT_JDS];
    }

    if (localStorage.getItem('nexus_quizzes')) {
        MOCK_QUIZZES = JSON.parse(localStorage.getItem('nexus_quizzes')!);
        if (MOCK_QUIZZES.length === 0) MOCK_QUIZZES = [...DEFAULT_QUIZZES];
    } else {
        MOCK_QUIZZES = [...DEFAULT_QUIZZES];
    }

    if (localStorage.getItem('nexus_quiz_results')) MOCK_QUIZ_RESULTS = JSON.parse(localStorage.getItem('nexus_quiz_results')!);
    if (localStorage.getItem('nexus_tasks')) MOCK_TASKS = JSON.parse(localStorage.getItem('nexus_tasks')!);
    if (localStorage.getItem('nexus_notes')) MOCK_NOTES = JSON.parse(localStorage.getItem('nexus_notes')!);
    
    if (localStorage.getItem('nexus_config')) {
        MOCK_CONFIG = JSON.parse(localStorage.getItem('nexus_config')!);
        // Ensure Dept KPIs are fully populated if they were sparse
        if (!MOCK_CONFIG.departmentKPIs || MOCK_CONFIG.departmentKPIs.length < 5) {
            MOCK_CONFIG.departmentKPIs = [
                { 
                    departmentName: 'Phòng Vé (Ticketing)', 
                    criteria: [{id: 'c1', name: 'Sai sót nghiệp vụ', weight: 40}, {id: 'c2', name: 'Tốc độ phản hồi (Response Time)', weight: 60}],
                    goals: [{id: 'g1', name: 'Doanh số vé lẻ', target: 500000000, unit: 'VND', weight: 60}, {id: 'g1b', name: 'Số lượng vé xuất', target: 500, unit: 'Vé', weight: 40}]
                },
                { 
                    departmentName: 'Phòng Kinh doanh (Sales)', 
                    criteria: [{id: 'c3', name: 'Khách hàng mới (New Leads)', weight: 50}, {id: 'c4', name: 'Chăm sóc khách cũ', weight: 50}],
                    goals: [{id: 'g2', name: 'Doanh số đoàn', target: 2000000000, unit: 'VND', weight: 100}]
                },
                { 
                    departmentName: 'Phòng Kế toán Vé (BSP)', 
                    criteria: [{id: 'c5', name: 'Chính xác số liệu', weight: 70}, {id: 'c6', name: 'Thu hồi công nợ', weight: 30}],
                    goals: [{id: 'g3', name: 'Tỷ lệ ADM (Phạt)', target: 0, unit: 'ADM', weight: 100}]
                },
                { 
                    departmentName: 'Phòng Chăm sóc Khách hàng', 
                    criteria: [{id: 'c7', name: 'Thái độ phục vụ', weight: 60}, {id: 'c8', name: 'Thời gian xử lý khiếu nại', weight: 40}],
                    goals: [{id: 'g4', name: 'Điểm hài lòng (CSAT)', target: 4.8, unit: 'Điểm', weight: 100}]
                },
                { 
                    departmentName: 'Phòng Nhân sự', 
                    criteria: [{id: 'c9', name: 'Tuyển dụng đúng hạn', weight: 50}, {id: 'c10', name: 'Tổ chức đào tạo', weight: 50}],
                    goals: [{id: 'g5', name: 'Tỷ lệ nhân sự nghỉ việc', target: 5, unit: '%', weight: 100}]
                }
            ];
        }
    }
    
    saveToStorage();
};

const saveToStorage = () => {
    localStorage.setItem('nexus_users', JSON.stringify(MOCK_USERS));
    localStorage.setItem('nexus_employees', JSON.stringify(MOCK_EMPLOYEES));
    localStorage.setItem('nexus_candidates', JSON.stringify(MOCK_CANDIDATES));
    localStorage.setItem('nexus_attendance', JSON.stringify(MOCK_ATTENDANCE));
    localStorage.setItem('nexus_payroll', JSON.stringify(MOCK_PAYROLL));
    localStorage.setItem('nexus_leaves', JSON.stringify(MOCK_LEAVES));
    localStorage.setItem('nexus_contracts', JSON.stringify(MOCK_CONTRACTS));
    localStorage.setItem('nexus_reviews', JSON.stringify(MOCK_REVIEWS));
    localStorage.setItem('nexus_reports', JSON.stringify(MOCK_BUSINESS_REPORTS));
    localStorage.setItem('nexus_counterparties', JSON.stringify(MOCK_COUNTERPARTIES));
    localStorage.setItem('nexus_workflows', JSON.stringify(MOCK_WORKFLOWS));
    localStorage.setItem('nexus_regulations', JSON.stringify(MOCK_REGULATIONS));
    localStorage.setItem('nexus_jds', JSON.stringify(MOCK_JDS));
    localStorage.setItem('nexus_quizzes', JSON.stringify(MOCK_QUIZZES));
    localStorage.setItem('nexus_quiz_results', JSON.stringify(MOCK_QUIZ_RESULTS));
    localStorage.setItem('nexus_tasks', JSON.stringify(MOCK_TASKS));
    localStorage.setItem('nexus_notes', JSON.stringify(MOCK_NOTES));
    localStorage.setItem('nexus_config', JSON.stringify(MOCK_CONFIG));
};

loadFromStorage();

// --- API Exports ---
export const api = {
  // --- Auth & User ---
  login: async (email: string, pass: string) => {
    await delay(500);
    const user = MOCK_USERS.find(u => u.email === email && u.password === pass);
    if (!user) throw new Error('Invalid credentials');
    if (!user.isApproved) throw new Error('ACCOUNT_NOT_APPROVED');
    return user;
  },
  loginViaGmail: async (email: string) => {
    await delay(500);
    if (email === 'ADMIN') throw new Error('ADMIN_MUST_USE_PASS');
    const user = MOCK_USERS.find(u => u.email === email);
    if (!user) throw new Error('No account found');
    if (!user.isApproved) throw new Error('ACCOUNT_NOT_APPROVED');
    return user;
  },
  signup: async (email: string, pass: string, name: string) => {
    await delay(500);
    if (MOCK_USERS.find(u => u.email === email)) throw new Error('Email exists');
    const newUser: User = { 
      id: `u${Date.now()}`, 
      email, 
      password: pass, 
      fullName: name, 
      role: Role.EMPLOYEE, 
      isApproved: false, 
      permissions: [] 
    };
    MOCK_USERS.push(newUser);
    saveToStorage();
    return newUser;
  },
  forgotPassword: async (email: string) => { await delay(500); },
  verifyPassword: async (userId: string, pass: string) => { const user = MOCK_USERS.find(u => u.id === userId); return user?.password === pass; },
  getAllUsers: async (role: Role) => role === Role.ADMIN ? MOCK_USERS : [],
  resetUserPassword: async (userId: string, pass: string) => { const u = MOCK_USERS.find(u => u.id === userId); if(u) { u.password = pass; saveToStorage(); } },
  approveUser: async (userId: string, role: Role, empData: any, perms: Permission[]) => {
      const u = MOCK_USERS.find(u => u.id === userId);
      if (u) {
          u.role = role;
          u.isApproved = true;
          u.permissions = perms;
          // Also update linked employee or create if needed (omitted for brevity, assume exists)
          saveToStorage();
      }
  },
  updateUserPermissions: async (userId: string, perms: Permission[]) => { const u = MOCK_USERS.find(u => u.id === userId); if(u) { u.permissions = perms; saveToStorage(); } },
  getDefaultPermissions: (role: Role): Permission[] => {
      switch(role) {
          case Role.ADMIN: return ['VIEW_DASHBOARD', 'MANAGE_EMPLOYEES', 'VIEW_ALL_EMPLOYEES', 'MANAGE_ATTENDANCE', 'VIEW_ALL_ATTENDANCE', 'MANAGE_PAYROLL', 'VIEW_ALL_PAYROLL', 'MANAGE_LEAVES', 'MANAGE_CONTRACTS', 'MANAGE_KPI', 'VIEW_REPORTS', 'MANAGE_REGULATIONS', 'MANAGE_JDS', 'MANAGE_ASSESSMENTS', 'MANAGE_TASKS', 'USE_AI_ASSISTANT', 'MANAGE_RECRUITMENT', 'MANAGE_WORKFLOWS', 'SYSTEM_CONFIG', 'FACTORY_RESET'];
          case Role.MANAGER: return ['VIEW_DASHBOARD', 'VIEW_ALL_EMPLOYEES', 'MANAGE_ATTENDANCE', 'VIEW_ALL_ATTENDANCE', 'MANAGE_KPI', 'VIEW_REPORTS', 'MANAGE_JDS', 'MANAGE_ASSESSMENTS', 'MANAGE_TASKS', 'MANAGE_RECRUITMENT', 'MANAGE_WORKFLOWS'];
          case Role.HR: return ['VIEW_DASHBOARD', 'MANAGE_EMPLOYEES', 'VIEW_ALL_EMPLOYEES', 'MANAGE_ATTENDANCE', 'VIEW_ALL_ATTENDANCE', 'MANAGE_PAYROLL', 'VIEW_ALL_PAYROLL', 'MANAGE_LEAVES', 'MANAGE_CONTRACTS', 'MANAGE_RECRUITMENT', 'MANAGE_TASKS'];
          default: return ['VIEW_DASHBOARD', 'MANAGE_TASKS'];
      }
  },

  // --- Employees ---
  getEmployees: async () => { await delay(200); return MOCK_EMPLOYEES; },
  getEmployeeById: async (id: string) => MOCK_EMPLOYEES.find(e => e.id === id),
  getEmployeeByUserId: async (userId: string) => MOCK_EMPLOYEES.find(e => e.userId === userId),
  createEmployee: async (data: Partial<Employee> & { email?: string }) => {
      // Create User first if email provided
      const newUser: User = { 
          id: `u${Date.now()}`, 
          email: data.email || `emp${Date.now()}@test.com`, 
          password: '123', 
          role: Role.EMPLOYEE, 
          fullName: data.fullName || 'New Employee', 
          isApproved: true, 
          permissions: [] 
      };
      MOCK_USERS.push(newUser);
      
      const newEmp: Employee = { 
          id: `e${Date.now()}`, 
          userId: newUser.id,
          code: `EMP${MOCK_EMPLOYEES.length + 1}`,
          fullName: data.fullName!,
          position: data.position!,
          roleTitle: data.roleTitle || 'STAFF',
          departmentName: data.departmentName,
          baseSalary: data.baseSalary || 0,
          insuranceSalary: data.insuranceSalary || 0,
          status: EmploymentStatus.ACTIVE,
          hireDate: data.hireDate || new Date().toISOString(),
          ...data
      } as Employee;
      MOCK_EMPLOYEES.push(newEmp);
      saveToStorage();
  },
  updateEmployee: async (id: string, data: Partial<Employee> & { email?: string }) => {
      const idx = MOCK_EMPLOYEES.findIndex(e => e.id === id);
      if (idx !== -1) {
          MOCK_EMPLOYEES[idx] = { ...MOCK_EMPLOYEES[idx], ...data };
          // If email changed, update user
          if (data.email) {
              const u = MOCK_USERS.find(u => u.id === MOCK_EMPLOYEES[idx].userId);
              if (u) u.email = data.email;
          }
          saveToStorage();
      }
  },
  deleteEmployee: async (id: string) => {
      const emp = MOCK_EMPLOYEES.find(e => e.id === id);
      if (emp) {
          MOCK_USERS = MOCK_USERS.filter(u => u.id !== emp.userId);
          MOCK_EMPLOYEES = MOCK_EMPLOYEES.filter(e => e.id !== id);
          saveToStorage();
      }
  },

  // --- Counterparty Management ---
  getCounterparties: async () => { await delay(300); return MOCK_COUNTERPARTIES; },
  createCounterparty: async (data: any) => { 
      MOCK_COUNTERPARTIES.push({ id: `cp${Date.now()}`, ...data }); 
      saveToStorage(); 
  },
  updateCounterparty: async (id: string, data: any) => {
      const idx = MOCK_COUNTERPARTIES.findIndex(c => c.id === id);
      if (idx !== -1) {
          MOCK_COUNTERPARTIES[idx] = { ...MOCK_COUNTERPARTIES[idx], ...data };
          saveToStorage();
      }
  },
  deleteCounterparty: async (id: string) => {
      MOCK_COUNTERPARTIES = MOCK_COUNTERPARTIES.filter(c => c.id !== id);
      saveToStorage();
  },

  // --- Contract Management ---
  getContracts: async (userId: string, role: Role) => { 
      if (role === Role.ADMIN || role === Role.HR) return MOCK_CONTRACTS; 
      const emp = MOCK_EMPLOYEES.find(e => e.userId === userId); 
      return emp ? MOCK_CONTRACTS.filter(c => c.employeeId === emp.id) : []; 
  },
  createContract: async (data: any) => { 
      MOCK_CONTRACTS.push({ id: `c${Date.now()}`, status: 'PENDING', ...data }); 
      saveToStorage(); 
  },
  updateContract: async (id: string, data: any) => { 
      const c = MOCK_CONTRACTS.find(c => c.id === id); 
      if (c) Object.assign(c, data); 
      saveToStorage(); 
  },
  signContract: async (id: string) => { 
      const c = MOCK_CONTRACTS.find(c => c.id === id); 
      if (c) { c.status = 'SIGNED'; c.signedAt = new Date().toISOString(); } 
      saveToStorage(); 
  },

  // --- Attendance ---
  getAttendance: async (empId?: string) => empId ? MOCK_ATTENDANCE.filter(a => a.employeeId === empId) : MOCK_ATTENDANCE,
  checkIn: async (empId: string, location?: any, faceImage?: string) => {
      const today = new Date().toISOString();
      const rec: Attendance = {
          id: `att${Date.now()}`,
          employeeId: empId,
          date: today,
          checkIn: today,
          type: AttendanceType.REGULAR,
          status: 'PENDING',
          hours: 0,
          overtimeHours: 0,
          checkInLocation: location,
          faceImage
      };
      MOCK_ATTENDANCE.unshift(rec);
      saveToStorage();
      return rec;
  },
  checkOut: async (empId: string, location?: any) => {
      const rec = MOCK_ATTENDANCE.find(a => a.employeeId === empId && !a.checkOut);
      if (rec) {
          rec.checkOut = new Date().toISOString();
          rec.checkOutLocation = location;
          rec.status = 'COMPLETED';
          // Simple calc
          const diff = (new Date(rec.checkOut).getTime() - new Date(rec.checkIn!).getTime()) / 3600000;
          rec.hours = parseFloat(diff.toFixed(2));
          saveToStorage();
      }
  },

  // --- Payroll ---
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
      // Create empty records for all active employees
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
          status: 'PENDING',
          validWorkDays: 22,
          standardWorkDays: 26
      }));
      MOCK_PAYROLL.push(...newPayrolls);
      saveToStorage();
  },
  calculatePayrollForCycle: async (cycleId: string) => {
      const records = MOCK_PAYROLL.filter(p => p.cycleId === cycleId);
      records.forEach(p => {
          // Mock calculation logic
          p.netPay = p.baseAmount + p.allowance + p.bonus + p.overtimeAmount - p.deduction;
      });
      saveToStorage();
      return records.length;
  },
  lockPayrollCycle: async (cycleId: string) => {
      MOCK_PAYROLL.filter(p => p.cycleId === cycleId).forEach(p => p.status = 'PAID');
      saveToStorage();
  },

  // --- Leaves ---
  getLeaves: async () => MOCK_LEAVES,
  createLeave: async (data: any) => { MOCK_LEAVES.push({ id: `l${Date.now()}`, status: 'PENDING', ...data }); saveToStorage(); },
  updateLeaveStatus: async (id: string, status: 'APPROVED' | 'REJECTED') => { const l = MOCK_LEAVES.find(l => l.id === id); if (l) l.status = status; saveToStorage(); },
  
  // --- KPI ---
  getKPIReviews: async (userId: string, role: Role) => {
      if (role === Role.ADMIN || role === Role.HR) return MOCK_REVIEWS;
      if (role === Role.MANAGER) {
          // Manager logic: see own + team
          const me = MOCK_EMPLOYEES.find(e => e.userId === userId);
          if (!me) return [];
          const team = MOCK_EMPLOYEES.filter(e => e.departmentName === me.departmentName);
          const teamIds = team.map(e => e.id);
          return MOCK_REVIEWS.filter(r => teamIds.includes(r.employeeId));
      }
      const me = MOCK_EMPLOYEES.find(e => e.userId === userId);
      return me ? MOCK_REVIEWS.filter(r => r.employeeId === me.id) : [];
  },
  createKPIReview: async (data: any) => { MOCK_REVIEWS.push({ ...data, id: `kpi${Date.now()}`, status: 'PENDING_REVIEW', totalScore: 0 }); saveToStorage(); },
  submitCrossCheck: async (id: string, data: any) => {
      const r = MOCK_REVIEWS.find(r => r.id === id);
      if (r) {
          Object.assign(r, data);
          r.status = 'COMPLETED';
          // Calc total score
          r.totalScore = Math.round((data.scoreP1 * 0.4) + (data.scoreP2 * 0.3) + (data.scoreP3 * 0.3));
          saveToStorage();
      }
  },
  getSuggestedSalaryIncrease: async (empId: string) => {
      // Mock logic
      return { suggestedIncreasePercent: 5, suggestedSalary: 12000000, currentSalary: 10000000, avgScore: 85 };
  },
  getEmployeeTaskCompletionRate: async (empId: string, cycle: string) => { return 95; },
  getDepartmentResults: async (dept: string, cycle: string) => { return []; }, // Mock empty
  saveDepartmentDraft: async (dept: string, cycle: string, goals: any[]) => { /* Mock */ },
  generateDepartmentKPIs: async (dept: string, cycle: string, goals: any[]) => { return 5; }, // Mock count

  // --- Reports ---
  getBusinessReports: async (userId: string, role: Role) => MOCK_BUSINESS_REPORTS,
  createBusinessReport: async (data: any) => { MOCK_BUSINESS_REPORTS.push({ id: `rpt${Date.now()}`, createdAt: new Date().toISOString(), ...data }); saveToStorage(); },
  
  // --- Regulations ---
  getRegulations: async () => MOCK_REGULATIONS,
  createRegulation: async (data: any) => { MOCK_REGULATIONS.push({ ...data, id: `reg${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); saveToStorage(); },
  updateRegulation: async (id: string, data: any) => { const r = MOCK_REGULATIONS.find(r => r.id === id); if (r) Object.assign(r, { ...data, updatedAt: new Date().toISOString() }); saveToStorage(); },
  deleteRegulation: async (id: string) => { MOCK_REGULATIONS = MOCK_REGULATIONS.filter(r => r.id !== id); saveToStorage(); },
  
  // --- JDs ---
  getJDs: async () => MOCK_JDS,
  createJD: async (data: any) => { MOCK_JDS.push({ ...data, id: `jd${Date.now()}` }); saveToStorage(); },
  updateJD: async (id: string, data: any) => { const idx = MOCK_JDS.findIndex(j => j.id === id); if (idx !== -1) MOCK_JDS[idx] = { ...MOCK_JDS[idx], ...data }; saveToStorage(); },
  registerEmployeeTasks: async (empId: string, taskIds: string[]) => { const emp = MOCK_EMPLOYEES.find(e => e.id === empId); if (emp) emp.registeredTaskIds = taskIds; saveToStorage(); },
  
  // --- Quizzes ---
  getQuizzes: async () => MOCK_QUIZZES,
  createQuiz: async (data: any) => { MOCK_QUIZZES.push({ ...data, id: `qz${Date.now()}`, createdAt: new Date().toISOString() }); saveToStorage(); },
  deleteQuiz: async (id: string) => { MOCK_QUIZZES = MOCK_QUIZZES.filter(q => q.id !== id); saveToStorage(); },
  getQuizResults: async () => MOCK_QUIZ_RESULTS,
  submitQuiz: async (quizId: string, userId: string, answers: Record<string, number>) => { 
      const quiz = MOCK_QUIZZES.find(q => q.id === quizId);
      const score = Math.round((Object.values(answers).reduce((a,b)=>a+b,0) / (quiz?.questions.length || 1)) * 100); 
      const res: QuizResult = { id: `qr${Date.now()}`, quizId, quizTitle: quiz?.title || '', employeeId: userId, employeeName: 'Candidate', score, totalQuestions: quiz?.questions.length||0, correctAnswers: 5, takenAt: new Date().toISOString() };
      MOCK_QUIZ_RESULTS.push(res);
      saveToStorage();
      return res;
  },
  generateAIQuiz: async (topic: string) => { /* ... */ },
  
  // --- Recruitment ---
  getCandidates: async () => MOCK_CANDIDATES,
  createCandidate: async (data: any) => { MOCK_CANDIDATES.push({ id: `cand${Date.now()}`, status: 'APPLIED', appliedDate: new Date().toISOString(), ...data }); saveToStorage(); },
  updateCandidate: async (id: string, data: any) => { const c = MOCK_CANDIDATES.find(c => c.id === id); if(c) Object.assign(c, data); saveToStorage(); },
  rejectCandidate: async (id: string) => { const c = MOCK_CANDIDATES.find(c => c.id === id); if(c) c.status = 'REJECTED'; saveToStorage(); },
  promoteCandidateToEmployee: async (candId: string, salary: number, probSalary: number) => {
      const c = MOCK_CANDIDATES.find(c => c.id === candId);
      if (c) {
          c.status = 'HIRED';
          await api.createEmployee({
              fullName: c.fullName,
              email: c.email,
              position: c.positionApplied,
              departmentName: c.departmentApplied,
              baseSalary: salary,
              status: EmploymentStatus.PROBATION
          });
      }
  },

  // --- AUTOMATION WORKFLOW: SMART TASKS ENGINE ---
  getTasks: async (userId: string, date: string) => {
      // 1. Fetch existing tasks for the day
      let existingTasks = MOCK_TASKS.filter(t => t.userId === userId && t.date === date);
      const emp = MOCK_EMPLOYEES.find(e => e.userId === userId);

      // 2. Auto-generate daily tasks from JD (Automation Engine)
      if (emp && emp.registeredTaskIds && emp.registeredTaskIds.length > 0) {
          const newTasks: SmartTask[] = [];
          
          emp.registeredTaskIds.forEach(jdTaskId => {
              // Check if task already exists for today to prevent duplicates
              const exists = existingTasks.find(t => t.jdTaskId === jdTaskId);
              
              if (!exists) {
                  let taskDetail: JDTask | undefined;
                  // Look up task definition in JDs
                  for (const jd of MOCK_JDS) {
                      const found = jd.tasks?.find(t => t.id === jdTaskId);
                      if (found) { taskDetail = found; break; }
                  }

                  if (taskDetail) {
                      // Apply Frequency Logic (The Automation Rule)
                      const targetDate = new Date(date);
                      const dayOfWeek = targetDate.getDay(); 
                      const dayOfMonth = targetDate.getDate();
                      let shouldCreate = false;
                      // Support strict DAILY mapping from prompt "BẮT BUỘC HOÀN THÀNH HÀNG NGÀY"
                      // Also support generic frequency
                      if (taskDetail.frequency === 'DAILY') shouldCreate = true;
                      else if (taskDetail.frequency === 'WEEKLY' && dayOfWeek === 1) shouldCreate = true; // Every Monday
                      else if (taskDetail.frequency === 'MONTHLY' && dayOfMonth === 1) shouldCreate = true; // 1st of Month

                      if (shouldCreate) {
                          const newTask: SmartTask = { 
                              id: `auto_${date}_${jdTaskId}`, 
                              userId, 
                              title: taskDetail.content, 
                              date, 
                              priority: 'HIGH', // Registered tasks are high priority/mandatory
                              estimatedMinutes: 30, // Default estimate
                              status: 'TODO', 
                              createdAt: new Date().toISOString(), 
                              jdTaskId: jdTaskId 
                          };
                          newTasks.push(newTask);
                      }
                  }
              }
          });

          // Sync to storage immediately
          if (newTasks.length > 0) {
              MOCK_TASKS.push(...newTasks);
              saveToStorage();
              existingTasks = [...existingTasks, ...newTasks];
          }
      }
      return existingTasks;
  },
  
  getTeamTasks: async (userId: string, role: Role) => {
      await delay(500);
      if (role === Role.ADMIN) return MOCK_TASKS; // Admin sees all
      const userEmp = MOCK_EMPLOYEES.find(e => e.userId === userId);
      if (!userEmp) return [];
      
      // Manager sees their department's tasks
      if (role === Role.MANAGER) {
          const deptEmps = MOCK_EMPLOYEES.filter(e => e.departmentName === userEmp.departmentName);
          const deptUserIds = deptEmps.map(e => e.userId).filter(id => id !== undefined);
          // Return tasks from other users in same dept
          return MOCK_TASKS.filter(t => deptUserIds.includes(t.userId));
      }
      return [];
  },

  createTask: async (task: any) => { MOCK_TASKS.push({ ...task, id: `t${Date.now()}`, createdAt: new Date().toISOString() }); saveToStorage(); },
  updateTask: async (id: string, data: any) => { const t = MOCK_TASKS.find(t => t.id === id); if (t) Object.assign(t, data); saveToStorage(); },
  deleteTask: async (id: string) => { MOCK_TASKS = MOCK_TASKS.filter(t => t.id !== id); saveToStorage(); },
  generateTaskSuggestions: async (input: string) => { await delay(600); const isUrgent = input.toLowerCase().includes('gấp'); return { priority: isUrgent ? 'HIGH' : 'MEDIUM' as TaskPriority, minutes: isUrgent ? 60 : 30 }; },
  analyzeDailyPerformance: async (userId: string, date: string): Promise<DailyTaskAnalysis> => {
      const tasks = MOCK_TASKS.filter(t => t.userId === userId && t.date === date);
      const done = tasks.filter(t => t.status === 'DONE');
      const rate = tasks.length > 0 ? Math.round((done.length / tasks.length) * 100) : 0;
      return { date, totalTasks: tasks.length, completedTasks: done.length, completionRate: rate, totalTimeScheduled: 0, efficiencyScore: rate, feedback: rate > 80 ? "Great job!" : "Keep improving." };
  },
  getSalaryConfig: async () => { await delay(200); return MOCK_CONFIG; },
  updateSalaryConfig: async (newConfig: SalaryConfig) => { await delay(500); MOCK_CONFIG = newConfig; saveToStorage(); },
  updateMonthlyActualRevenue: async (year: number, month: number, actual: number) => { const m = MOCK_CONFIG.revenueConfig.months.find(m => m.month === month); if (m) m.actual = actual; saveToStorage(); },
  getCurrentIP: async () => '192.168.1.105',
  getNotes: async (userId: string) => MOCK_NOTES.filter(n => n.userId === userId),
  getNotesForDate: async (userId: string, date: string) => MOCK_NOTES.filter(n => n.userId === userId && n.date === date),
  addNote: async (userId: string, date: string, content: string) => { MOCK_NOTES.push({ id: `n${Date.now()}`, userId, date, content, isRead: false, createdAt: new Date().toISOString() }); saveToStorage(); },
  deleteNote: async (id: string) => { MOCK_NOTES = MOCK_NOTES.filter(n => n.id !== id); saveToStorage(); },
  askSystemAI: async (question: string) => { await delay(1000); return "System AI Assistant is ready."; },
  getActivities: async () => MOCK_ACTIVITIES,
  factoryReset: async () => { localStorage.clear(); window.location.reload(); },
  // ... (Existing Workflow methods) ...
  getWorkflows: async () => MOCK_WORKFLOWS,
  createWorkflow: async (data: any) => { MOCK_WORKFLOWS.push({ ...data, id: `wf${Date.now()}`, lastUpdated: new Date().toISOString() }); saveToStorage(); },
  updateWorkflow: async (id: string, data: any) => { const w = MOCK_WORKFLOWS.find(w => w.id === id); if (w) Object.assign(w, { ...data, lastUpdated: new Date().toISOString() }); saveToStorage(); },
  deleteWorkflow: async (id: string) => { MOCK_WORKFLOWS = MOCK_WORKFLOWS.filter(w => w.id !== id); saveToStorage(); },
};
