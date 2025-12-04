
// Simplified Solar to Lunar conversion and Holiday Logic for Vietnam
// Note: A full lunar algorithm is complex. This uses a basic approximation and specific known holiday mappings for demo purposes.

export interface CalendarDay {
  date: Date;
  day: number;
  lunarDay: number;
  lunarMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  holiday?: string;
  isWeekend: boolean;
}

// Major Vietnamese Holidays (Solar)
const SOLAR_HOLIDAYS: Record<string, string> = {
  '1-1': 'Tết Dương Lịch',
  '30-4': 'Giải phóng MN',
  '1-5': 'Quốc tế Lao động',
  '2-9': 'Quốc khánh'
};

// Major Vietnamese Holidays (Lunar)
const LUNAR_HOLIDAYS: Record<string, string> = {
  '1-1': 'Tết Nguyên Đán',
  '2-1': 'Tết Nguyên Đán',
  '3-1': 'Tết Nguyên Đán',
  '15-1': 'Tết Nguyên Tiêu',
  '10-3': 'Giỗ tổ Hùng Vương',
  '15-4': 'Lễ Phật Đản',
  '5-5': 'Tết Đoan Ngọ',
  '15-7': 'Lễ Vu Lan',
  '15-8': 'Tết Trung Thu',
  '23-12': 'Ông Công Ông Táo'
};

// Helper to get basic Lunar Date (Approximation for UI demo)
// In a production app, use 'lunar-javascript' library
function getApproxLunar(date: Date) {
  // This is a dummy conversion for visual demonstration if library not available
  // It roughly subtracts ~1 month to simulate lunar
  const d = new Date(date);
  d.setDate(d.getDate() - 29); 
  return { day: d.getDate(), month: d.getMonth() + 1 };
}

export function getMonthDays(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const days: CalendarDay[] = [];
  
  // 1. Previous Month Padding
  const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Start Monday
  for (let i = 0; i < startPadding; i++) {
    const d = new Date(year, month, -i);
    const lunar = getApproxLunar(d);
    days.unshift({
      date: d,
      day: d.getDate(),
      lunarDay: lunar.day,
      lunarMonth: lunar.month,
      isCurrentMonth: false,
      isToday: false,
      isWeekend: d.getDay() === 0 || d.getDay() === 6
    });
  }

  // 2. Current Month
  const today = new Date();
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(year, month, i);
    const lunar = getApproxLunar(d);
    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    
    // Check Holidays
    let holiday = SOLAR_HOLIDAYS[`${d.getDate()}-${d.getMonth() + 1}`];
    if (!holiday) {
      holiday = LUNAR_HOLIDAYS[`${lunar.day}-${lunar.month}`];
    }

    days.push({
      date: d,
      day: i,
      lunarDay: lunar.day,
      lunarMonth: lunar.month,
      isCurrentMonth: true,
      isToday,
      holiday,
      isWeekend: d.getDay() === 0 || d.getDay() === 6
    });
  }

  // 3. Next Month Padding to fill grid (up to 35 or 42 cells)
  const TOTAL_SLOTS = days.length <= 35 ? 35 : 42;
  const remainingSlots = TOTAL_SLOTS - days.length;
  
  for (let i = 1; i <= remainingSlots; i++) {
    const d = new Date(year, month + 1, i);
    const lunar = getApproxLunar(d);
    days.push({
      date: d,
      day: d.getDate(),
      lunarDay: lunar.day,
      lunarMonth: lunar.month,
      isCurrentMonth: false,
      isToday: false,
      isWeekend: d.getDay() === 0 || d.getDay() === 6
    });
  }

  return days;
}
