
import React, { useEffect, useState } from 'react';
import { api } from '../services/mockService';
import { SalaryConfig, Role, DepartmentKPIConfig, KPICriterion, RoleTitle } from '../types';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Save, Settings, Clock, DollarSign, Plus, Trash2, Shield, Calculator, Calendar, TrendingUp, PieChart, Briefcase, Target, RefreshCw, MapPin, Wifi, Camera, Percent } from 'lucide-react';
import { useLanguage, useAuth } from '../contexts/AppContext';

export default function SalaryConfigPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [config, setConfig] = useState<SalaryConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Department KPI State
  const [selectedDeptKPI, setSelectedDeptKPI] = useState<string>('');
  const [commonDepartments] = useState([
     "Phòng Kinh doanh (Sales)",
     "Phòng Vé (Ticketing)",
     "Phòng Kế toán Vé (BSP)",
     "Phòng Chăm sóc Khách hàng",
     "Phòng Nhân sự",
     "Phòng Kỹ thuật"
  ]);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await api.getSalaryConfig();
      setConfig(data);
      if (!data.departmentKPIs) {
          // Initialize if missing from old data
          data.departmentKPIs = [];
      }
      if (data.departmentKPIs.length > 0) {
          setSelectedDeptKPI(data.departmentKPIs[0].departmentName);
      } else {
          setSelectedDeptKPI(commonDepartments[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    try {
      // Validate weights
      const totalWeight = config.kpiWeights.p1 + config.kpiWeights.p2 + config.kpiWeights.p3;
      if (totalWeight !== 100) {
        alert(`${t('weightHint')} (Current: ${totalWeight}%)`);
        return;
      }
      await api.updateSalaryConfig(config);
      alert(t('updateConfigSuccess'));
    } catch (error) {
      alert('Failed to update configuration');
    }
  };

  const handleDistributeRevenue = () => {
      if (!config) return;
      const annual = config.revenueConfig.annualTarget;
      const monthly = Math.round(annual / 12);
      
      setConfig({
          ...config,
          revenueConfig: {
              ...config.revenueConfig,
              months: config.revenueConfig.months.map(m => ({ ...m, target: monthly }))
          }
      });
  };

  const handleAddCriterion = () => {
     if (!config || !selectedDeptKPI) return;
     
     const newConfig = { ...config };
     if (!newConfig.departmentKPIs) newConfig.departmentKPIs = [];

     let deptConfig = newConfig.departmentKPIs.find(d => d.departmentName === selectedDeptKPI);
     
     if (!deptConfig) {
        deptConfig = { departmentName: selectedDeptKPI, criteria: [], goals: [] };
        newConfig.departmentKPIs.push(deptConfig);
     }

     deptConfig.criteria.push({
        id: Math.random().toString(36).substr(2, 9),
        name: 'New Criterion',
        weight: 10
     });

     setConfig(newConfig);
  };

  const handleUpdateCriterion = (deptName: string, id: string, field: keyof KPICriterion, value: any) => {
      if (!config) return;
      const newConfig = { ...config };
      const dept = newConfig.departmentKPIs.find(d => d.departmentName === deptName);
      if (dept) {
         const crit = dept.criteria.find(c => c.id === id);
         if (crit) {
            (crit as any)[field] = value;
            setConfig(newConfig);
         }
      }
  };

  const handleDeleteCriterion = (deptName: string, id: string) => {
      if (!config) return;
      const newConfig = { ...config };
      const dept = newConfig.departmentKPIs.find(d => d.departmentName === deptName);
      if (dept) {
         dept.criteria = dept.criteria.filter(c => c.id !== id);
         setConfig(newConfig);
      }
  };

  // Helper to format numbers with commas
  const formatNumber = (value: number | string) => {
    if (value === undefined || value === null) return '';
    const clean = value.toString().replace(/,/g, '');
    if (!clean) return '';
    return new Intl.NumberFormat('en-US').format(Number(clean));
  };

  // New Helpers for Attendance Config
  const handleGetCurrentLocation = () => {
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
              (position) => {
                  if (config) {
                      setConfig({
                          ...config,
                          companyLocation: {
                              ...config.companyLocation,
                              lat: position.coords.latitude,
                              lng: position.coords.longitude
                          }
                      });
                  }
              },
              (error) => {
                  alert("Error getting location: " + error.message);
              }
          );
      } else {
          alert("Geolocation is not supported by this browser.");
      }
  };

  const handleAddCurrentIP = async () => {
      if (!config) return;
      const ip = await api.getCurrentIP();
      const currentIPs = config.attendanceConfig.allowedIPs;
      if (!currentIPs.includes(ip)) {
          setConfig({
              ...config,
              attendanceConfig: {
                  ...config.attendanceConfig,
                  allowedIPs: [...currentIPs, ip]
              }
          });
      }
  };

  const handleUpdateIPList = (val: string) => {
      if (!config) return;
      const ips = val.split(',').map(ip => ip.trim()).filter(ip => ip !== '');
      setConfig({
          ...config,
          attendanceConfig: {
              ...config.attendanceConfig,
              allowedIPs: ips
          }
      });
  };

  if (loading || !config) return <div className="p-8 text-center">{t('loading')}</div>;

  // Only Admin can access
  if (user?.role !== Role.ADMIN) {
      return <div className="p-8 text-center text-red-500">Access Denied</div>;
  }

  const currentDeptCriteria = config.departmentKPIs?.find(d => d.departmentName === selectedDeptKPI)?.criteria || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center sticky top-0 bg-slate-50 z-10 py-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="text-indigo-600" />
            {t('configSystemTitle')}
          </h1>
          <p className="text-slate-500">{t('configSubtitle')}</p>
        </div>
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 shadow-lg font-bold transition-transform active:scale-95"
        >
          <Save size={20} />
          {t('save')}
        </button>
      </div>

      {/* Formula Preview */}
      <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-none shadow-lg">
         <CardContent className="flex items-center justify-between py-6">
            <div>
               <h3 className="text-lg font-bold flex items-center gap-2 opacity-90 mb-1">
                 <Calculator size={20} />
                 {t('activeFormula')}
               </h3>
               <p className="font-mono text-lg md:text-xl font-semibold">
                 SALARY = BASE + COMMISSION + ALLOWANCES - INSURANCE - OTHER DEDUCTIONS
               </p>
            </div>
         </CardContent>
      </Card>

      {/* Probation Rules Config (New) */}
      <Card>
          <CardHeader title={t('probationSalaryConfig')} action={<Percent className="text-orange-500" />} />
          <CardContent>
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('probationPercent')}</label>
                  <div className="flex items-center gap-2">
                      <input 
                          type="number"
                          className="border rounded px-3 py-2 w-32 font-bold text-orange-700"
                          value={config.probationSalaryPercent || 85}
                          onChange={e => setConfig({...config, probationSalaryPercent: Number(e.target.value)})}
                      />
                      <span className="text-slate-500">%</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{t('probationPercentDesc')}</p>
              </div>
          </CardContent>
      </Card>

      {/* Attendance Verification Parameters */}
      <Card className="border border-slate-200 shadow-sm">
          <CardHeader title={t('attendanceParams')} action={<MapPin className="text-blue-500" />} />
          <CardContent className="space-y-6">
              
              {/* GPS Section */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase">
                          <MapPin size={16} /> {t('gpsConfig')}
                      </h4>
                      <button 
                          onClick={handleGetCurrentLocation}
                          className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1 hover:bg-blue-700"
                      >
                          <MapPin size={12} /> {t('getCurrentLocation')}
                      </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">{t('longitude')}</label>
                          <input 
                              type="number" step="0.000001"
                              className="w-full border rounded px-3 py-2 bg-white"
                              value={config.companyLocation.lng}
                              onChange={e => setConfig({...config, companyLocation: {...config.companyLocation, lng: Number(e.target.value)}})}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">{t('latitude')}</label>
                          <input 
                              type="number" step="0.000001"
                              className="w-full border rounded px-3 py-2 bg-white"
                              value={config.companyLocation.lat}
                              onChange={e => setConfig({...config, companyLocation: {...config.companyLocation, lat: Number(e.target.value)}})}
                          />
                      </div>
                  </div>
                  <div className="mt-4">
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t('radius')}</label>
                      <input 
                          type="number"
                          className="w-full border rounded px-3 py-2 bg-white"
                          value={config.companyLocation.radiusMeters}
                          onChange={e => setConfig({...config, companyLocation: {...config.companyLocation, radiusMeters: Number(e.target.value)}})}
                      />
                      <p className="text-xs text-slate-400 mt-1">{t('radiusHint')}</p>
                  </div>
              </div>

              {/* Verification Methods */}
              <div>
                  <h4 className="font-bold text-slate-700 mb-3 text-sm uppercase">{t('verificationMethods')}</h4>
                  <div className="space-y-3">
                      {/* GPS Checkbox */}
                      <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50">
                          <input 
                              type="checkbox" 
                              className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                              checked={config.attendanceConfig.requireGPS}
                              onChange={e => setConfig({...config, attendanceConfig: {...config.attendanceConfig, requireGPS: e.target.checked}})}
                          />
                          <div>
                              <p className="font-bold text-sm text-slate-800">{t('requireGPS')}</p>
                              <p className="text-xs text-slate-500">{t('requireGPSDesc')}</p>
                          </div>
                      </div>

                      {/* FaceID Checkbox */}
                      <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50">
                          <input 
                              type="checkbox" 
                              className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                              checked={config.attendanceConfig.requireFaceID}
                              onChange={e => setConfig({...config, attendanceConfig: {...config.attendanceConfig, requireFaceID: e.target.checked}})}
                          />
                          <div>
                              <p className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                  {t('requireFaceID')} <Camera size={14} className="text-slate-400"/>
                              </p>
                              <p className="text-xs text-slate-500">{t('requireFaceIDDesc')}</p>
                          </div>
                      </div>

                      {/* Wifi Checkbox & IP List */}
                      <div className="border rounded-lg p-3 bg-blue-50/30">
                          <div className="flex items-start gap-3 mb-4">
                              <input 
                                  type="checkbox" 
                                  className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                  checked={config.attendanceConfig.requireWifi}
                                  onChange={e => setConfig({...config, attendanceConfig: {...config.attendanceConfig, requireWifi: e.target.checked}})}
                              />
                              <div>
                                  <p className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                      {t('requireWifi')} <Wifi size={14} className="text-slate-400"/>
                                  </p>
                                  <p className="text-xs text-slate-500">{t('requireWifiDesc')}</p>
                              </div>
                          </div>
                          
                          {config.attendanceConfig.requireWifi && (
                              <div className="ml-8">
                                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">{t('allowedIPList')}</label>
                                  <div className="flex gap-2 mb-1">
                                      <input 
                                          type="text" 
                                          className="w-full border rounded px-3 py-2 text-sm font-mono"
                                          placeholder="192.168.1.1, 14.162.*"
                                          value={config.attendanceConfig.allowedIPs.join(', ')}
                                          onChange={e => handleUpdateIPList(e.target.value)}
                                      />
                                  </div>
                                  <div className="flex justify-between items-center">
                                      <p className="text-xs text-slate-400">{t('ipHint')}</p>
                                      <button 
                                          onClick={handleAddCurrentIP}
                                          className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1"
                                      >
                                          <Plus size={10} /> {t('addCurrentIP')}
                                      </button>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              </div>

          </CardContent>
      </Card>

      {/* Revenue Configuration */}
      <Card>
          <CardHeader title={t('revenueConfigTitle')} action={<Target className="text-slate-400" />} />
          <CardContent>
              <p className="text-sm text-slate-500 mb-4">{t('revenueConfigSubtitle')}</p>
              <div className="flex flex-col md:flex-row gap-6 items-end">
                  <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('year')}</label>
                      <input 
                          type="number"
                          className="border rounded px-3 py-2 w-full"
                          value={config.revenueConfig.year}
                          onChange={e => setConfig({...config, revenueConfig: {...config.revenueConfig, year: Number(e.target.value)}})}
                      />
                  </div>
                  <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('annualRevenueTarget')} (VND)</label>
                      <input 
                          type="text"
                          className="border rounded px-3 py-2 w-full font-bold text-indigo-700"
                          value={formatNumber(config.revenueConfig.annualTarget)}
                          onChange={e => setConfig({...config, revenueConfig: {...config.revenueConfig, annualTarget: Number(e.target.value.replace(/,/g, ''))}})}
                      />
                  </div>
                  <div>
                      <button 
                        onClick={handleDistributeRevenue}
                        className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 border border-slate-200 font-medium"
                        title={t('distributeHint')}
                      >
                          <RefreshCw size={16} />
                          {t('distribute')}
                      </button>
                  </div>
              </div>
              
              {/* Preview of monthly targets */}
              <div className="mt-6 border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Target Distribution Preview</h4>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                      {config.revenueConfig.months.map(m => (
                          <div key={m.month} className="p-2 bg-slate-50 rounded border border-slate-100 text-center">
                              <div className="text-xs text-slate-400 font-medium">Month {m.month}</div>
                              <div className="text-xs font-bold text-slate-700">
                                  {new Intl.NumberFormat('en-US', { notation: "compact" }).format(m.target)}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader title={t('generalSettings')} action={<Calendar className="text-slate-400" />} />
        <CardContent>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('stdWorkDays')}</label>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                className="border rounded px-3 py-2 w-32"
                value={config.standardWorkDays}
                onChange={(e) => setConfig({
                  ...config,
                  standardWorkDays: Number(e.target.value)
                })}
              />
              <span className="text-sm text-slate-500">{t('daysPerMonth')}</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Default: 26 days. Employees automatically get +1 paid leave day in calculations.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Attendance / Shifts */}
      <Card>
        <CardHeader title={t('attendanceSetup')} action={<Clock className="text-slate-400" />} />
        <CardContent>
          <div className="mb-6 pb-6 border-b border-slate-100">
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('latePenaltyAmount')}</label>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                className="border rounded px-3 py-2 w-40"
                value={formatNumber(config.latePenaltyAmount)}
                onChange={(e) => setConfig({
                  ...config,
                  latePenaltyAmount: Number(e.target.value.replace(/,/g, ''))
                })}
              />
              <span className="text-sm text-slate-500">VND</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Auto-deducted when status is LATE.</p>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">{t('shiftName')}</th>
                <th className="px-4 py-2 text-left">{t('startTime')}</th>
                <th className="px-4 py-2 text-left">{t('endTime')}</th>
                <th className="px-4 py-2 text-left">{t('graceLate')}</th>
                <th className="px-4 py-2 text-left">{t('graceEarly')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {config.shifts.map((shift, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-3 font-medium">{shift.name}</td>
                  <td className="px-4 py-3">
                    <input 
                      type="time"
                      className="border rounded px-2 py-1 w-28"
                      value={shift.startTime}
                      onChange={(e) => {
                        const newShifts = [...config.shifts];
                        newShifts[idx].startTime = e.target.value;
                        setConfig({ ...config, shifts: newShifts });
                      }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      type="time"
                      className="border rounded px-2 py-1 w-28"
                      value={shift.endTime}
                      onChange={(e) => {
                        const newShifts = [...config.shifts];
                        newShifts[idx].endTime = e.target.value;
                        setConfig({ ...config, shifts: newShifts });
                      }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      type="number"
                      className="border rounded px-2 py-1 w-20"
                      value={shift.graceLate}
                      onChange={(e) => {
                        const newShifts = [...config.shifts];
                        newShifts[idx].graceLate = Number(e.target.value);
                        setConfig({ ...config, shifts: newShifts });
                      }}
                    />
                  </td>
                   <td className="px-4 py-3">
                    <input 
                      type="number"
                      className="border rounded px-2 py-1 w-20"
                      value={shift.graceEarlyLeave}
                      onChange={(e) => {
                        const newShifts = [...config.shifts];
                        newShifts[idx].graceEarlyLeave = Number(e.target.value);
                        setConfig({ ...config, shifts: newShifts });
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Insurance & Deductions */}
      <Card>
        <CardHeader title={t('insuranceSetup')} action={<Shield className="text-slate-400" />} />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-slate-100">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">{t('regionIMinimumWage')}</label>
               <div className="flex items-center gap-2">
                 <input 
                   type="text" 
                   className="border rounded px-3 py-2 w-full"
                   value={formatNumber(config.regionIMinimumWage)}
                   onChange={(e) => setConfig({
                     ...config,
                     regionIMinimumWage: Number(e.target.value.replace(/,/g, ''))
                   })}
                 />
                 <span className="text-slate-500">VND</span>
               </div>
               <p className="text-xs text-slate-400 mt-1">Standard basis for Region I (Update per Gov regulation).</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">{t('socialInsurance')}</label>
               <div className="flex items-center gap-2">
                 <input 
                   type="number" step="0.1"
                   className="border rounded px-3 py-2 w-full"
                   value={config.insuranceConfig.socialInsurancePercent}
                   onChange={(e) => setConfig({
                     ...config,
                     insuranceConfig: { ...config.insuranceConfig, socialInsurancePercent: parseFloat(e.target.value) }
                   })}
                 />
                 <span className="text-slate-500">%</span>
               </div>
             </div>
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">{t('healthInsurance')}</label>
               <div className="flex items-center gap-2">
                 <input 
                   type="number" step="0.1"
                   className="border rounded px-3 py-2 w-full"
                   value={config.insuranceConfig.healthInsurancePercent}
                   onChange={(e) => setConfig({
                     ...config,
                     insuranceConfig: { ...config.insuranceConfig, healthInsurancePercent: parseFloat(e.target.value) }
                   })}
                 />
                 <span className="text-slate-500">%</span>
               </div>
             </div>
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">{t('unemploymentInsurance')}</label>
               <div className="flex items-center gap-2">
                 <input 
                   type="number" step="0.1"
                   className="border rounded px-3 py-2 w-full"
                   value={config.insuranceConfig.unemploymentInsurancePercent}
                   onChange={(e) => setConfig({
                     ...config,
                     insuranceConfig: { ...config.insuranceConfig, unemploymentInsurancePercent: parseFloat(e.target.value) }
                   })}
                 />
                 <span className="text-slate-500">%</span>
               </div>
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Salary Formulas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title={t('roleCoefficients')} action={<DollarSign className="text-slate-400" />} />
          <CardContent>
            <div className="space-y-4">
              {(Object.keys(config.roleCoefficients) as RoleTitle[]).map((role) => (
                <div key={role} className="flex items-center justify-between">
                   <span className="text-sm font-medium text-slate-700">{role}</span>
                   <div className="flex items-center gap-2">
                     <input 
                       type="number" 
                       step="0.01"
                       className="border rounded px-2 py-1 w-24 text-right"
                       value={config.roleCoefficients[role]}
                       onChange={(e) => {
                         const val = parseFloat(e.target.value);
                         setConfig({
                           ...config,
                           roleCoefficients: { ...config.roleCoefficients, [role]: val }
                         });
                       }}
                     />
                     <span className="text-xs text-slate-400 w-8">
                       ({Math.round((config.roleCoefficients[role] || 0) * 100)}%)
                     </span>
                   </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title={t('salesCommission')} action={<DollarSign className="text-slate-400" />} />
          <CardContent>
            <div className="space-y-2">
               <div className="grid grid-cols-3 text-xs font-bold text-slate-500 pb-2">
                  <span>{t('minAchievement')}</span>
                  <span>{t('commissionRate')}</span>
                  <span></span>
               </div>
               {config.commissionTiers.map((tier, idx) => (
                 <div key={idx} className="grid grid-cols-3 gap-2 items-center">
                    <div className="flex items-center gap-1">
                      <input 
                        type="number" step="0.1"
                        className="border rounded px-2 py-1 w-full"
                        value={tier.minPercent * 100}
                        onChange={(e) => {
                          const newTiers = [...config.commissionTiers];
                          newTiers[idx].minPercent = parseFloat(e.target.value) / 100;
                          setConfig({ ...config, commissionTiers: newTiers });
                        }}
                      />
                      %
                    </div>
                    <div className="flex items-center gap-1">
                      <input 
                        type="number" step="0.1"
                        className="border rounded px-2 py-1 w-full"
                        value={tier.commissionRate * 100}
                        onChange={(e) => {
                          const newTiers = [...config.commissionTiers];
                          newTiers[idx].commissionRate = parseFloat(e.target.value) / 100;
                          setConfig({ ...config, commissionTiers: newTiers });
                        }}
                      />
                      %
                    </div>
                    <button 
                      onClick={() => {
                         const newTiers = config.commissionTiers.filter((_, i) => i !== idx);
                         setConfig({ ...config, commissionTiers: newTiers });
                      }}
                      className="text-red-500 hover:bg-red-50 p-1 rounded justify-self-end"
                    >
                       <Trash2 size={16} />
                    </button>
                 </div>
               ))}
               <button 
                 onClick={() => {
                    setConfig({
                      ...config,
                      commissionTiers: [...config.commissionTiers, { minPercent: 0, commissionRate: 0 }]
                    });
                 }}
                 className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 mt-2"
               >
                 <Plus size={16} /> Add Tier
               </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI 3P Weights */}
      <Card>
        <CardHeader title={t('setup3P')} action={<PieChart className="text-slate-400" />} />
        <CardContent>
           <p className="text-sm text-slate-500 mb-4">{t('weightHint')}</p>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">{t('p1')} (%)</label>
                 <input 
                   type="number"
                   className="border rounded px-3 py-2 w-full"
                   value={config.kpiWeights.p1}
                   onChange={(e) => setConfig({
                     ...config,
                     kpiWeights: { ...config.kpiWeights, p1: Number(e.target.value) }
                   })}
                 />
                 <p className="text-xs text-slate-400 mt-1">{t('p1_desc')}</p>
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">{t('p2')} (%)</label>
                 <input 
                   type="number"
                   className="border rounded px-3 py-2 w-full"
                   value={config.kpiWeights.p2}
                   onChange={(e) => setConfig({
                     ...config,
                     kpiWeights: { ...config.kpiWeights, p2: Number(e.target.value) }
                   })}
                 />
                 <p className="text-xs text-slate-400 mt-1">{t('p2_desc')}</p>
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">{t('p3')} (%)</label>
                 <input 
                   type="number"
                   className="border rounded px-3 py-2 w-full"
                   value={config.kpiWeights.p3}
                   onChange={(e) => setConfig({
                     ...config,
                     kpiWeights: { ...config.kpiWeights, p3: Number(e.target.value) }
                   })}
                 />
                 <p className="text-xs text-slate-400 mt-1">{t('p3_desc')}</p>
              </div>
           </div>
        </CardContent>
      </Card>

      {/* Department Criteria Setup */}
      <Card>
          <CardHeader title={t('departmentCriteriaSetup')} action={<Briefcase className="text-slate-400" />} />
          <CardContent>
             <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('department')}</label>
                <div className="flex gap-2">
                    <select 
                        className="border rounded px-3 py-2 w-full md:w-1/2 bg-white"
                        value={selectedDeptKPI}
                        onChange={(e) => setSelectedDeptKPI(e.target.value)}
                    >
                        {commonDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
             </div>

             <div className="overflow-x-auto border rounded-lg">
                 <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 text-slate-500">
                         <tr>
                             <th className="px-4 py-2 w-2/3">{t('criteriaName')}</th>
                             <th className="px-4 py-2 w-1/4">{t('weight')} (%)</th>
                             <th className="px-4 py-2"></th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                         {currentDeptCriteria.map((crit) => (
                             <tr key={crit.id}>
                                 <td className="px-4 py-2">
                                     <input 
                                         type="text" 
                                         className="border rounded px-2 py-1 w-full"
                                         value={crit.name}
                                         onChange={e => handleUpdateCriterion(selectedDeptKPI, crit.id, 'name', e.target.value)}
                                     />
                                 </td>
                                 <td className="px-4 py-2">
                                     <input 
                                         type="number" 
                                         className="border rounded px-2 py-1 w-full"
                                         value={crit.weight}
                                         onChange={e => handleUpdateCriterion(selectedDeptKPI, crit.id, 'weight', Number(e.target.value))}
                                     />
                                 </td>
                                 <td className="px-4 py-2">
                                     <button 
                                         onClick={() => handleDeleteCriterion(selectedDeptKPI, crit.id)}
                                         className="text-red-400 hover:text-red-600"
                                     >
                                         <Trash2 size={16} />
                                     </button>
                                 </td>
                             </tr>
                         ))}
                         {currentDeptCriteria.length === 0 && (
                             <tr>
                                 <td colSpan={3} className="px-4 py-4 text-center text-slate-400 italic">No specific criteria configured for this department.</td>
                             </tr>
                         )}
                     </tbody>
                 </table>
             </div>
             <button 
                 onClick={handleAddCriterion}
                 className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 mt-4 font-medium"
               >
                 <Plus size={16} /> {t('addCriterion')}
               </button>
          </CardContent>
      </Card>

      {/* KPI Increase Rules */}
      <Card>
        <CardHeader title={t('kpiSetup')} action={<TrendingUp className="text-slate-400" />} />
        <CardContent>
           <p className="text-sm text-slate-500 mb-4">Define salary increase percentages based on Average Annual KPI Score.</p>
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
               <thead className="bg-slate-50 text-slate-500">
                 <tr>
                    <th className="px-4 py-2">{t('minScore')}</th>
                    <th className="px-4 py-2">{t('maxScore')}</th>
                    <th className="px-4 py-2">{t('percentIncrease')}</th>
                    <th className="px-4 py-2 w-10"></th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {config.kpiIncreaseRules.map((rule, idx) => (
                   <tr key={idx}>
                     <td className="px-4 py-2">
                       <input 
                          type="number"
                          className="border rounded px-2 py-1 w-20"
                          value={rule.minScore}
                          onChange={(e) => {
                             const newRules = [...config.kpiIncreaseRules];
                             newRules[idx].minScore = Number(e.target.value);
                             setConfig({ ...config, kpiIncreaseRules: newRules });
                          }}
                       />
                     </td>
                     <td className="px-4 py-2">
                       <input 
                          type="number"
                          className="border rounded px-2 py-1 w-20"
                          value={rule.maxScore}
                          onChange={(e) => {
                             const newRules = [...config.kpiIncreaseRules];
                             newRules[idx].maxScore = Number(e.target.value);
                             setConfig({ ...config, kpiIncreaseRules: newRules });
                          }}
                       />
                     </td>
                     <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <input 
                              type="number" step="0.5"
                              className="border rounded px-2 py-1 w-20"
                              value={rule.percentIncrease}
                              onChange={(e) => {
                                const newRules = [...config.kpiIncreaseRules];
                                newRules[idx].percentIncrease = Number(e.target.value);
                                setConfig({ ...config, kpiIncreaseRules: newRules });
                              }}
                          />
                          <span>%</span>
                        </div>
                     </td>
                     <td className="px-4 py-2">
                        <button 
                          onClick={() => {
                             const newRules = config.kpiIncreaseRules.filter((_, i) => i !== idx);
                             setConfig({ ...config, kpiIncreaseRules: newRules });
                          }}
                          className="text-red-400 hover:text-red-600"
                        >
                           <Trash2 size={16} />
                        </button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
             <button 
                 onClick={() => {
                    setConfig({
                      ...config,
                      kpiIncreaseRules: [...config.kpiIncreaseRules, { minScore: 0, maxScore: 0, percentIncrease: 0 }]
                    });
                 }}
                 className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 mt-4 font-medium"
               >
                 <Plus size={16} /> Add Rule
               </button>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
