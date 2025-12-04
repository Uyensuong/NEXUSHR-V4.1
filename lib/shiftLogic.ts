
export type Shift = {
  name: string;
  start: string; // 'HH:mm'
  end: string;   // 'HH:mm' (can be next day)
  standardMinutes: number;
  overtimeMultiplier: number;     // 1.0, 1.5, 2.0
  isNight?: boolean;
  nightShiftBonus?: number;       // VND/session
  graceLate?: number;             // minutes allowed late
  graceEarlyLeave?: number;       // minutes allowed early leave
  rounding?: { step: number; mode: 'up'|'down'|'nearest' };
  breakMinutes?: number;          // break time
};

// Default shifts for fallback
export const DEFAULT_SHIFTS: Shift[] = [
  { 
    name: 'SANG', 
    start: '07:30', 
    end: '11:30', 
    standardMinutes: 240, 
    overtimeMultiplier: 1.0, 
    graceLate: 15, 
    graceEarlyLeave: 5, 
    rounding: { step: 5, mode: 'nearest' }, 
    breakMinutes: 0 
  },
  { 
    name: 'CHIEU', 
    start: '13:30', 
    end: '17:30', 
    standardMinutes: 240, 
    overtimeMultiplier: 1.0, 
    graceLate: 15, 
    graceEarlyLeave: 5, 
    rounding: { step: 5, mode: 'nearest' }, 
    breakMinutes: 0 
  },
  { 
    name: 'DEM', 
    start: '22:00', 
    end: '06:00', 
    standardMinutes: 480, 
    overtimeMultiplier: 1.5, 
    isNight: true, 
    nightShiftBonus: 50000, 
    graceLate: 10, 
    graceEarlyLeave: 10, 
    rounding: { step: 15, mode: 'nearest' }, 
    breakMinutes: 30 
  },
];

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesOf(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function applyRounding(mins: number, step = 5, mode: 'up'|'down'|'nearest' = 'nearest') {
  const r = mins / step;
  if (mode === 'up') return Math.ceil(r) * step;
  if (mode === 'down') return Math.floor(r) * step;
  return Math.round(r) * step;
}

function shiftWindowForDate(shift: Shift, baseDate: Date): { start: Date; end: Date } {
  const startM = parseTimeToMinutes(shift.start);
  const endM = parseTimeToMinutes(shift.end);
  const start = new Date(baseDate);
  start.setHours(Math.floor(startM / 60), startM % 60, 0, 0);

  const end = new Date(baseDate);
  end.setHours(Math.floor(endM / 60), endM % 60, 0, 0);
  // If end time is less than start time, it means the shift ends the next day
  if (endM <= startM) {
    end.setDate(end.getDate() + 1);
  }
  return { start, end };
}

type BuoiCalcResult = {
  name: string;
  actualMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  nightBonus: number;
};

function intersectMinutes(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  const start = new Date(Math.max(aStart.getTime(), bStart.getTime()));
  const end = new Date(Math.min(aEnd.getTime(), bEnd.getTime()));
  const diff = (end.getTime() - start.getTime()) / 60000;
  return diff > 0 ? diff : 0;
}

// dayType: 'WORKDAY' | 'WEEKEND' | 'HOLIDAY'
export function calcByBuoi(checkIn: Date, checkOut: Date, baseDate: Date, dayType: string, hourlyRate: number, shifts: Shift[] = DEFAULT_SHIFTS) {
  const results: BuoiCalcResult[] = [];
  
  for (const shift of shifts) {
    const { start, end } = shiftWindowForDate(shift, baseDate);
    let mins = intersectMinutes(checkIn, checkOut, start, end);

    // subtract break
    if (shift.breakMinutes && mins > shift.breakMinutes) {
      mins -= shift.breakMinutes;
    }

    // apply grace period
    const inM = minutesOf(checkIn);
    const startM = minutesOf(start);
    const outM = minutesOf(checkOut);
    const endM = minutesOf(end);

    if (inM > startM && shift.graceLate) {
      const late = Math.min(inM - startM, shift.graceLate);
      mins = Math.max(0, mins - late);
    }
    if (outM < endM && shift.graceEarlyLeave) {
      const early = Math.min(endM - outM, shift.graceEarlyLeave);
      mins = Math.max(0, mins - early);
    }

    // rounding
    if (shift.rounding) {
      mins = applyRounding(mins, shift.rounding.step, shift.rounding.mode);
    }

    // distribute regular/OT
    let regularMinutes = Math.min(mins, shift.standardMinutes);
    let overtimeMinutes = Math.max(0, mins - shift.standardMinutes);

    // if holiday/weekend, all is OT
    if (dayType !== 'WORKDAY') {
      overtimeMinutes = mins;
      regularMinutes = 0;
    }

    const nightBonus = shift.isNight && mins > 0 ? (shift.nightShiftBonus || 0) : 0;

    results.push({ name: shift.name, actualMinutes: mins, regularMinutes, overtimeMinutes, nightBonus });
  }

  // calculate pay breakdown
  const payBreakdown = results.map(r => {
    const shift = shifts.find(s => s.name === r.name)!;
    const otMultiplier = dayType === 'WORKDAY' ? shift.overtimeMultiplier : (dayType === 'WEEKEND' ? 2.0 : 2.0);
    const regularPay = (r.regularMinutes / 60) * hourlyRate * (shift.isNight ? 1.0 : 1.0);
    const overtimePay = (r.overtimeMinutes / 60) * hourlyRate * otMultiplier;
    const totalPay = regularPay + overtimePay + r.nightBonus;
    return { name: r.name, ...r, regularPay, overtimePay, totalPay };
  });

  const totals = payBreakdown.reduce((acc, p) => {
    acc.totalMinutes += p.actualMinutes;
    acc.totalPay += p.totalPay;
    acc.nightBonus += p.nightBonus;
    acc.regularMinutes += p.regularMinutes;
    acc.overtimeMinutes += p.overtimeMinutes;
    return acc;
  }, { totalMinutes: 0, totalPay: 0, nightBonus: 0, regularMinutes: 0, overtimeMinutes: 0 });

  return { breakdown: payBreakdown, totals };
}
