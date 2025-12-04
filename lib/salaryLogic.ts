
import { CommissionTier, InsuranceConfig, RoleTitle } from "../types";

// Helper to find commission rate based on config
function getCommissionRate(achievePct: number, tiers: CommissionTier[]): number {
  // Sort tiers by minPercent descending to find the highest matching tier
  const sortedTiers = [...tiers].sort((a, b) => b.minPercent - a.minPercent);
  
  for (const tier of sortedTiers) {
    if (achievePct >= tier.minPercent) {
      return tier.commissionRate;
    }
  }
  return 0;
}

export function calcSalary({
  baseSalary,             // LCB (VND) - Thực nhận
  insuranceSalary,        // Lương đóng bảo hiểm (Theo quy định)
  roleTitle,              // chức danh
  proRateByAttendance,    // có pro-rate LCB theo ngày công không
  validWorkDays,          // ngày công hợp lệ trong kỳ
  standardWorkDays = 22,  // chuẩn ngày công
  salesAchieved,          // doanh số hợp lệ (VND)
  salesTarget,            // doanh số mục tiêu (VND)
  roleCoefficients,       // Dynamic config
  commissionTiers,        // Dynamic config
  insuranceConfig,        // New Insurance Config
  manualOtherAllowance = 0, // Phụ cấp khác (Manual)
  manualOtherDeduction = 0, // Khấu trừ khác (Manual)
  kpiBonus = 0,           // NEW: KPI Bonus
  tdsCapByLCB = 0.30,     // trần TDS theo % LCB
  tdsCapBySalesPct = 0.08 // trần TDS theo % doanh số
}: {
  baseSalary: number;
  insuranceSalary?: number;
  roleTitle: RoleTitle;
  proRateByAttendance?: boolean;
  validWorkDays?: number;
  standardWorkDays?: number;
  salesAchieved: number;
  salesTarget: number;
  roleCoefficients: Record<RoleTitle, number>;
  commissionTiers: CommissionTier[];
  insuranceConfig: InsuranceConfig;
  manualOtherAllowance?: number;
  manualOtherDeduction?: number;
  kpiBonus?: number;
  tdsCapByLCB?: number;
  tdsCapBySalesPct?: number;
}) {
  // 1) LCB thực (pro-rate nếu bật) - Tính trên lương thỏa thuận
  const lcbEffective = proRateByAttendance && validWorkDays != null
    ? Math.round(baseSalary * (validWorkDays / standardWorkDays))
    : baseSalary;

  // 2) Phụ cấp chức vụ (hệ số trên LCB)
  const coeff = roleCoefficients[roleTitle] ?? 0;
  const pccv = Math.round(lcbEffective * coeff);

  // 3) Thưởng doanh số theo bậc thang
  const achievePct = salesTarget > 0 ? salesAchieved / salesTarget : 0;
  const rate = getCommissionRate(achievePct, commissionTiers);
  let tds = Math.round(salesAchieved * rate);

  // Áp trần thưởng
  const capByLCB = Math.round(lcbEffective * tdsCapByLCB);
  const capBySales = Math.round(salesAchieved * tdsCapBySalesPct);
  const tdsCap = Math.min(capByLCB, capBySales);
  tds = Math.min(tds, tdsCap);

  // 4) Khấu trừ bảo hiểm (Theo mức lương đóng bảo hiểm quy định)
  // Nếu không có insuranceSalary thì dùng baseSalary làm fallback
  const salaryBasisForInsurance = (insuranceSalary && insuranceSalary > 0) ? insuranceSalary : baseSalary;
  
  const bhxh = Math.round(salaryBasisForInsurance * (insuranceConfig.socialInsurancePercent / 100));
  const bhyt = Math.round(salaryBasisForInsurance * (insuranceConfig.healthInsurancePercent / 100));
  const bhtn = Math.round(salaryBasisForInsurance * (insuranceConfig.unemploymentInsurancePercent / 100));
  const totalInsurance = bhxh + bhyt + bhtn;

  // FORMULA: TOTAL = BASE (Effective) + COMMISSION + ALLOWANCES (Role + Manual) + KPI BONUS - INSURANCE - OTHER DEDUCTIONS
  const totalAllowance = pccv + manualOtherAllowance + kpiBonus;
  const totalDeduction = totalInsurance + manualOtherDeduction;
  
  const totalIncome = lcbEffective + tds + totalAllowance - totalDeduction;
  
  return {
    lcbEffective,
    pccv, // Role Allowance
    tds,  // Commission
    totalInsurance,
    total: totalIncome,
    meta: {
      roleTitle,
      coeff,
      achievePct,
      rate,
      caps: { capByLCB, capBySales, appliedCap: tdsCap },
      insuranceDetails: { bhxh, bhyt, bhtn },
      insuranceBasis: salaryBasisForInsurance, // Return for UI display
      manualOtherAllowance,
      manualOtherDeduction,
      kpiBonus
    }
  };
}
