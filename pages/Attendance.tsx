
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/mockService';
import { Attendance, AttendanceType, Role, Employee, Regulation } from '../types';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Clock, Play, Square, Sun, Moon, Sunset, CheckCircle, AlertTriangle, Calendar, MapPin, Camera, RefreshCw, X, ChevronLeft, ChevronRight, Book, Info } from 'lucide-react';
import { format, getDaysInMonth, startOfMonth, addMonths, parse, parseISO } from 'date-fns';
import { useLanguage, useAuth } from '../contexts/AppContext';
import Webcam from 'react-webcam';

export default function AttendancePage() {
  const { user, hasPermission } = useAuth();
  const { t, language } = useLanguage();
  
  // Time & Shift
  const [currentTime, setCurrentTime] = useState(new Date());

  // Personal Attendance (For Employee View)
  const [personalLogs, setPersonalLogs] = useState<Attendance[]>([]);
  const [currentSession, setCurrentSession] = useState<Attendance | null>(null);
  const [myEmployeeId, setMyEmployeeId] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [locationWarning, setLocationWarning] = useState('');

  // Monthly Grid (For Admin/All View)
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [monthlyLogs, setMonthlyLogs] = useState<Attendance[]>([]);
  const [gridLoading, setGridLoading] = useState(false);

  // Face ID State
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [faceStatus, setFaceStatus] = useState<'IDLE' | 'SCANNING' | 'VERIFIED' | 'FAILED'>('IDLE');
  const webcamRef = useRef<Webcam>(null);

  // History & Details State
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);
  const [historyDate, setHistoryDate] = useState(new Date());

  // Regulations
  const [attendanceRegulations, setAttendanceRegulations] = useState<Regulation[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initial Data Load
  useEffect(() => {
    const init = async () => {
      if (!user) return;
      
      // 1. Load Personal Employee Data
      const emp = await api.getEmployeeByUserId(user.id);
      if (emp) {
        setMyEmployeeId(emp.id);
        await fetchPersonalLogs(emp.id);
      }

      // 2. Load Grid Data if has permission
      if (hasPermission('VIEW_ALL_ATTENDANCE')) {
         await loadGridData(selectedMonth);
      }

      // 3. Load Regulations
      const regs = await api.getRegulations();
      setAttendanceRegulations(regs.filter(r => r.category === 'Chấm công' || r.title.toLowerCase().includes('quy định chung')));
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Reload grid when month changes
  useEffect(() => {
    if (hasPermission('VIEW_ALL_ATTENDANCE')) {
      loadGridData(selectedMonth);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const fetchPersonalLogs = async (empId: string) => {
    const data = await api.getAttendance(empId);
    setPersonalLogs(data);
    const active = data.find(l => l.checkIn && !l.checkOut);
    setCurrentSession(active || null);
  };

  const loadGridData = async (monthStr: string) => {
    setGridLoading(true);
    try {
       const [emps, allLogs] = await Promise.all([
         api.getEmployees(),
         api.getAttendance() // In real app, pass month filter
       ]);
       setAllEmployees(emps);
       
       // Filter logs for selected month locally
       const targetMonth = parse(monthStr, 'yyyy-MM', new Date());
       const filteredLogs = allLogs.filter(l => {
          const logDate = new Date(l.date);
          return logDate.getMonth() === targetMonth.getMonth() && 
                 logDate.getFullYear() === targetMonth.getFullYear();
       });
       setMonthlyLogs(filteredLogs);
    } finally {
      setGridLoading(false);
    }
  };

  // Helper to get current location
  const getPosition = (): Promise<{lat: number, lng: number} | undefined> => {
      return new Promise((resolve) => {
          if (!navigator.geolocation) {
              alert("Geolocation not supported");
              resolve(undefined);
              return;
          }
          navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              (err) => {
                  console.error(err);
                  alert("Unable to retrieve location. Check permissions.");
                  resolve(undefined);
              }
          );
      });
  };

  // Helper: Resize Image to save bandwidth/storage
  const resizeImage = (base64Str: string, maxWidth = 320): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scaleSize = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  // Step 1: Trigger Check In (Starts with Face ID check if configured)
  const initiateCheckIn = async () => {
      if (!myEmployeeId) return;
      const config = await api.getSalaryConfig();
      
      if (config.attendanceConfig?.requireFaceID) {
          setShowCamera(true);
          setCapturedImage(null);
          setFaceStatus('IDLE');
      } else {
          performCheckIn();
      }
  };

  // Step 2: Capture Face
  const handleCapture = useCallback(async () => {
      if (webcamRef.current) {
          const imageSrc = webcamRef.current.getScreenshot();
          if (imageSrc) {
              const resized = await resizeImage(imageSrc);
              setCapturedImage(resized);
              verifyFace(resized);
          }
      }
  }, [webcamRef]);

  // Step 3: Simulate Verification
  const verifyFace = async (imageSrc: string | null) => {
      if (!imageSrc) return;
      setFaceStatus('SCANNING');
      
      // Mock API verification delay
      setTimeout(() => {
          // Simulate success rate (random for mock) or always true
          setFaceStatus('VERIFIED');
          // Auto-proceed after success
          setTimeout(() => {
              performCheckIn(imageSrc);
              setShowCamera(false);
          }, 1000);
      }, 1500);
  };

  const performCheckIn = async (faceImage?: string) => {
    if (!myEmployeeId) return;
    setActionLoading(true);
    setLocationWarning('');
    try {
      const loc = await getPosition();
      const record = await api.checkIn(myEmployeeId, loc, faceImage);
      
      // Check for GPS warning from backend
      if (record.checkInLocation?.warning) {
          setLocationWarning(t('gpsWarning'));
      }

      await fetchPersonalLogs(myEmployeeId);
      if (hasPermission('VIEW_ALL_ATTENDANCE')) loadGridData(selectedMonth);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!myEmployeeId) return;
    setActionLoading(true);
    try {
      const loc = await getPosition();
      await api.checkOut(myEmployeeId, loc);
      await fetchPersonalLogs(myEmployeeId);
      if (hasPermission('VIEW_ALL_ATTENDANCE')) loadGridData(selectedMonth);
    } finally {
      setActionLoading(false);
    }
  };

  // UI Helpers
  const getShiftDisplay = () => {
    const h = currentTime.getHours();
    const m = currentTime.getMinutes();
    const mins = h * 60 + m;
    if (mins >= 450 && mins < 690) return { label: t('morningShift'), icon: Sun, color: 'text-orange-500' };
    if (mins >= 810 && mins < 1050) return { label: t('afternoonShift'), icon: Sunset, color: 'text-blue-500' };
    if (mins >= 1320 || mins < 360) return { label: t('nightShift'), icon: Moon, color: 'text-indigo-500' };
    return null;
  };

  const currentShift = getShiftDisplay();
  const isAdmin = hasPermission('VIEW_ALL_ATTENDANCE');
  const dateObj = parse(selectedMonth, 'yyyy-MM', new Date());
  const daysInMonth = getDaysInMonth(dateObj);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getStatusCell = (empId: string, day: number) => {
     const currentDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), day);
     const dayOfWeek = currentDate.getDay();
     // 0 = Sunday, 6 = Saturday
     const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

     const log = monthlyLogs.find(l => {
        const d = new Date(l.date);
        return l.employeeId === empId && d.getDate() === day;
     });

     // Case 1: No record found
     if (!log) {
         if (isWeekend) {
             // Red background for weekends (Visual distinction)
             return <div className="w-full h-full border-r border-b border-red-100 bg-red-50/70" title="Weekend"></div>;
         }
         // Regular workday empty
         return <div className="w-full h-full border-r border-b border-slate-100 bg-slate-50"></div>;
     }

     // Case 2: Has record (Status based logic)
     if (log.status === 'LATE') {
       return (
         <div className="w-full h-full flex items-center justify-center bg-red-100 text-red-600 relative group cursor-help border-r border-b border-red-200">
           <AlertTriangle size={14} />
           {/* Tooltip */}
           <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-800 text-white text-xs p-2 rounded shadow-lg z-10 whitespace-nowrap">
              {t('latePenalty')}
           </div>
         </div>
       );
     }
     if (log.status === 'PENDING') {
        return (
          <div className="w-full h-full flex items-center justify-center bg-yellow-100 text-yellow-600 border-r border-b border-yellow-200" title={t('status_PENDING')}>
            <Clock size={14} />
          </div>
        );
     }
     if (log.status === 'COMPLETED') {
       const isHalfDay = log.hours < 6; 
       return (
         <div 
           className={`w-full h-full flex items-center justify-center ${isHalfDay ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-green-100 text-green-600 border-green-200'} border-r border-b`} 
           title={`${isHalfDay ? t('halfDay') : t('fullDay')} (${log.hours}h)${log.isHoliday ? ' - Holiday (150%)' : ''}`}
         >
            {isHalfDay ? <span className="text-[10px] font-bold">1/2</span> : <CheckCircle size={14} />}
         </div>
       );
     }
     return null;
  };

  // Generate days for Personal Calendar
  const getPersonalCalendarDays = () => {
      const year = historyDate.getFullYear();
      const month = historyDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const days = [];
      
      const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
      for (let i = 0; i < startPadding; i++) days.push(null);
      
      for (let i = 1; i <= lastDay.getDate(); i++) {
          days.push(new Date(year, month, i));
      }
      return days;
  };

  const personalCalendarDays = getPersonalCalendarDays();
  const weekDays = language === 'vi' ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-8 relative">
      <h1 className="text-2xl font-bold text-slate-800">{t('attendance')}</h1>

      {/* Personal Time Clock Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-t-4 border-t-indigo-500">
          <CardContent className="flex flex-col items-center justify-center py-10 space-y-6 text-center">
            <div className="space-y-1">
              <p className="text-slate-500 font-medium uppercase tracking-wide text-xs">{t('currentTime')}</p>
              <div className="text-4xl font-bold text-slate-800 tabular-nums">
                {format(currentTime, 'HH:mm:ss')}
              </div>
              <p className="text-slate-400 text-sm">{format(currentTime, 'EEEE, MMMM do yyyy')}</p>
            </div>

            {currentShift && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-sm font-medium ${currentShift.color}`}>
                <currentShift.icon size={16} />
                {currentShift.label}
              </div>
            )}

            <div className="w-full max-w-xs">
              {!myEmployeeId ? (
                 <div className="p-4 bg-slate-100 rounded text-slate-500 text-sm">{t('loading')}</div>
              ) : currentSession ? (
                <button 
                  onClick={handleCheckOut}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-4 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50"
                >
                  <Square fill="currentColor" size={18} />
                  {t('checkOut')}
                </button>
              ) : (
                <button 
                  onClick={initiateCheckIn}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-semibold shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Play fill="currentColor" size={18} />
                  {t('checkIn')}
                </button>
              )}
            </div>

            {locationWarning && (
                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-2 rounded-lg text-xs flex items-center gap-2">
                    <AlertTriangle size={14} />
                    {locationWarning}
                </div>
            )}

            {currentSession && (
              <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 animate-pulse ${currentSession.status === 'LATE' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                <span className={`w-2 h-2 rounded-full ${currentSession.status === 'LATE' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                {currentSession.status === 'LATE' ? t('lateCheckIn') : t('working')} ({format(new Date(currentSession.checkIn!), 'HH:mm')})
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personal History & Calendar */}
        <div className="md:col-span-2 space-y-6">
           {/* Recent Activity List */}
           <Card>
            <CardHeader title={t('recentActivity')} />
            <CardContent>
               <div className="space-y-3 max-h-60 overflow-y-auto">
                  {personalLogs.slice(0, 5).map(log => (
                     <div 
                        key={log.id} 
                        onClick={() => setSelectedAttendance(log)}
                        className="flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                     >
                        <div className="flex items-center gap-3">
                           <div className={`p-2 rounded-lg ${log.status === 'LATE' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                              <Clock size={18} />
                           </div>
                           <div>
                             <div className="font-medium text-slate-900">{format(new Date(log.date), 'MMM do')}</div>
                             <div className="text-xs text-slate-500 flex items-center gap-2">
                               {log.checkIn ? format(new Date(log.checkIn), 'HH:mm') : '--'} - {log.checkOut ? format(new Date(log.checkOut), 'HH:mm') : '...'}
                               {log.checkInLocation?.warning && <span className="text-red-500 flex items-center gap-0.5"><MapPin size={10}/> GPS Warn</span>}
                               {log.faceImage && <span className="text-blue-500 flex items-center gap-0.5"><Camera size={10}/> FaceID</span>}
                             </div>
                           </div>
                        </div>
                        <div className="text-right">
                           {log.isHoliday && <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded font-bold block mb-1">HOLIDAY 150%</span>}
                           {log.status === 'LATE' && (
                              <span className="text-xs font-bold text-red-600 block">{t('status_LATE')}</span>
                           )}
                           {log.status === 'PENDING' && <span className="text-xs font-bold text-yellow-600 block">{t('status_PENDING')}</span>}
                           {log.status === 'COMPLETED' && <span className="text-xs font-bold text-green-600 block">{t('status_COMPLETED')}</span>}
                        </div>
                     </div>
                  ))}
                  {personalLogs.length === 0 && <p className="text-slate-500 italic text-sm">{t('noRecords')}</p>}
               </div>
            </CardContent>
           </Card>

           {/* Personal Calendar */}
           <Card>
               <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                   <h3 className="font-bold text-slate-700 flex items-center gap-2">
                       <Calendar size={18} className="text-indigo-600" />
                       {t('myCalendar')}
                   </h3>
                   <div className="flex items-center gap-2">
                       <button onClick={() => setHistoryDate(new Date(historyDate.getFullYear(), historyDate.getMonth() - 1, 1))} className="p-1 hover:bg-white rounded"><ChevronLeft size={16}/></button>
                       <span className="text-sm font-bold w-32 text-center">{format(historyDate, 'MMMM yyyy')}</span>
                       <button onClick={() => setHistoryDate(new Date(historyDate.getFullYear(), historyDate.getMonth() + 1, 1))} className="p-1 hover:bg-white rounded"><ChevronRight size={16}/></button>
                   </div>
               </div>
               <CardContent>
                   <div className="grid grid-cols-7 gap-1 mb-2 border-b border-slate-100 pb-2">
                       {weekDays.map(d => (
                           <div key={d} className="text-center text-xs font-bold text-slate-500 uppercase">{d}</div>
                       ))}
                   </div>
                   <div className="grid grid-cols-7 gap-1">
                       {personalCalendarDays.map((day, idx) => {
                           if (!day) return <div key={idx} className="h-16 bg-slate-50/50 rounded"></div>;
                           
                           const dateStr = format(day, 'yyyy-MM-dd');
                           const log = personalLogs.find(l => l.date.startsWith(dateStr));
                           const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
                           
                           return (
                               <div 
                                   key={idx}
                                   onClick={() => log && setSelectedAttendance(log)}
                                   className={`h-16 border rounded p-1 flex flex-col justify-between cursor-pointer hover:shadow-sm transition-all
                                       ${!log ? 'bg-white' : log.status === 'LATE' ? 'bg-red-50 border-red-200' : log.status === 'PENDING' ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}
                                       ${isToday ? 'ring-2 ring-indigo-500' : ''}
                                   `}
                               >
                                   <span className={`text-xs font-bold ${isToday ? 'text-indigo-600' : 'text-slate-600'}`}>{day.getDate()}</span>
                                   {log && (
                                       <div className="flex justify-end">
                                           {log.faceImage && <Camera size={10} className="text-slate-400 mb-0.5 mr-1" />}
                                           <div className={`w-2 h-2 rounded-full ${log.status === 'LATE' ? 'bg-red-500' : log.status === 'PENDING' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                                       </div>
                                   )}
                               </div>
                           );
                       })}
                   </div>
               </CardContent>
           </Card>
        </div>
      </div>

      {/* Monthly Grid View (Admin) */}
      {isAdmin && (
        <Card>
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
             <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
               <Calendar size={20} />
               {t('monthlyAttendanceGrid')}
             </h3>
             
             {/* Legend */}
             <div className="flex items-center gap-4 text-xs flex-wrap">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div> {t('fullDay')}</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div> {t('halfDay')}</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div> {t('status_PENDING')}</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div> {t('status_LATE')}</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-50 border border-red-100 rounded"></div> Weekend</div>
             </div>

             <input 
                type="month" 
                className="border rounded-lg px-3 py-2 bg-white text-sm"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
             />
          </div>
          <CardContent className="p-0 overflow-x-auto">
             {gridLoading ? (
                <div className="p-8 text-center text-slate-500">{t('loading')}</div>
             ) : (
                <table className="w-full text-xs border-collapse">
                   <thead>
                      <tr>
                         <th className="p-3 text-left font-medium text-slate-500 border-b border-r min-w-[150px] sticky left-0 bg-white z-10">{t('employees')}</th>
                         {daysArray.map(day => {
                            const currentDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), day);
                            const dayOfWeek = currentDate.getDay();
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                            const dayName = format(currentDate, 'EE'); // Mon, Tue...

                            return (
                              <th key={day} className={`p-2 text-center font-medium border-b border-r w-10 min-w-[45px] ${isWeekend ? 'text-red-600 font-bold bg-red-50' : 'text-slate-500'}`}>
                                 <div className="flex flex-col items-center">
                                    <span>{day}</span>
                                    <span className="text-[9px] uppercase opacity-75">{dayName}</span>
                                 </div>
                              </th>
                            );
                         })}
                      </tr>
                   </thead>
                   <tbody>
                      {allEmployees.map(emp => (
                         <tr key={emp.id} className="hover:bg-slate-50">
                            <td className="p-3 border-b border-r font-medium text-slate-700 sticky left-0 bg-white z-10 truncate max-w-[150px]">
                               {emp.fullName}
                            </td>
                            {daysArray.map(day => (
                               <td key={day} className="border-b border-r p-0 h-10 w-10 min-w-[45px]">
                                  {getStatusCell(emp.id, day)}
                               </td>
                            ))}
                         </tr>
                      ))}
                   </tbody>
                </table>
             )}
          </CardContent>
        </Card>
      )}
      
      {/* Attendance Regulations */}
      <Card>
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <Book size={20} className="text-indigo-600" />
                  {t('attendanceRegulations')}
              </h3>
          </div>
          <CardContent className="space-y-6">
              {attendanceRegulations.length === 0 ? (
                  <p className="text-center text-slate-500 italic">{t('noRecords')}</p>
              ) : (
                  attendanceRegulations.map(reg => (
                      <div key={reg.id} className="border-b border-slate-100 last:border-0 pb-4 last:pb-0">
                          <h4 className="font-bold text-slate-800 mb-2">{reg.title}</h4>
                          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                              {reg.content}
                          </div>
                      </div>
                  ))
              )}
          </CardContent>
      </Card>
      
      {/* Face Verification Modal */}
      {showCamera && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
                  <div className="p-6 text-center">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                              <Camera className="text-indigo-600" /> {t('faceVerification')}
                          </h3>
                          <button onClick={() => setShowCamera(false)} className="text-slate-400 hover:text-slate-600">
                              <X size={24} />
                          </button>
                      </div>

                      <div className="relative bg-black rounded-xl overflow-hidden aspect-[4/3] mb-4 group">
                          {!capturedImage ? (
                              <Webcam
                                  audio={false}
                                  ref={webcamRef}
                                  screenshotFormat="image/jpeg"
                                  className="w-full h-full object-cover"
                                  videoConstraints={{ facingMode: "user" }}
                              />
                          ) : (
                              <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                          )}
                          
                          {/* Scanning Overlay */}
                          {faceStatus === 'SCANNING' && (
                              <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                                  <div className="w-full h-1 bg-indigo-400 shadow-[0_0_15px_rgba(99,102,241,1)] animate-[scan_2s_ease-in-out_infinite]"></div>
                              </div>
                          )}

                          {/* Guides */}
                          {!capturedImage && (
                              <div className="absolute inset-0 border-2 border-dashed border-white/50 m-8 rounded-3xl pointer-events-none"></div>
                          )}
                      </div>

                      <div className="space-y-4">
                          {faceStatus === 'IDLE' && (
                              <>
                                  <p className="text-sm text-slate-600">{t('positionFace')}</p>
                                  <button 
                                      onClick={handleCapture}
                                      className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg transition-transform active:scale-95"
                                  >
                                      {t('captureFace')}
                                  </button>
                              </>
                          )}

                          {faceStatus === 'SCANNING' && (
                              <div className="flex flex-col items-center py-2">
                                  <RefreshCw className="animate-spin text-indigo-600 mb-2" />
                                  <p className="font-medium text-indigo-900">{t('verifying')}</p>
                              </div>
                          )}

                          {faceStatus === 'VERIFIED' && (
                              <div className="flex flex-col items-center py-2 animate-bounce">
                                  <CheckCircle className="text-green-500 mb-2" size={32} />
                                  <p className="font-bold text-green-700">{t('faceVerified')}</p>
                              </div>
                          )}

                          {faceStatus === 'FAILED' && (
                              <div>
                                  <div className="flex flex-col items-center py-2">
                                      <AlertTriangle className="text-red-500 mb-2" size={32} />
                                      <p className="font-bold text-red-700">{t('faceFailed')}</p>
                                  </div>
                                  <button 
                                      onClick={() => { setCapturedImage(null); setFaceStatus('IDLE'); }}
                                      className="w-full bg-slate-200 text-slate-700 py-2 rounded-lg font-medium mt-2 hover:bg-slate-300"
                                  >
                                      {t('retake')}
                                  </button>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Detailed Attendance Modal */}
      {selectedAttendance && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-lg text-slate-800">{t('attendanceDetails')}</h3>
                      <button onClick={() => setSelectedAttendance(null)} className="text-slate-400 hover:text-slate-600">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-6 space-y-6">
                      {/* Date & Status */}
                      <div className="text-center">
                          <h2 className="text-2xl font-bold text-slate-800">{format(new Date(selectedAttendance.date), 'EEEE, MMM do')}</h2>
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold mt-2 
                              ${selectedAttendance.status === 'LATE' ? 'bg-red-100 text-red-700' : selectedAttendance.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}
                          `}>
                              {t(`status_${selectedAttendance.status}`)}
                          </div>
                      </div>

                      {/* Times */}
                      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div>
                              <p className="text-xs text-slate-500 uppercase font-bold">{t('checkIn')}</p>
                              <p className="text-lg font-mono font-bold text-slate-800">
                                  {selectedAttendance.checkIn ? format(new Date(selectedAttendance.checkIn), 'HH:mm:ss') : '--:--'}
                              </p>
                          </div>
                          <div className="text-right">
                              <p className="text-xs text-slate-500 uppercase font-bold">{t('checkOut')}</p>
                              <p className="text-lg font-mono font-bold text-slate-800">
                                  {selectedAttendance.checkOut ? format(new Date(selectedAttendance.checkOut), 'HH:mm:ss') : '--:--'}
                              </p>
                          </div>
                      </div>

                      {/* Shift Breakdown */}
                      {selectedAttendance.shiftBreakdown && selectedAttendance.shiftBreakdown.length > 0 && (
                          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                              <p className="text-xs text-indigo-700 font-bold uppercase mb-2 flex items-center gap-1">
                                  <Info size={12} /> Shift Details
                              </p>
                              <div className="space-y-1">
                                  {selectedAttendance.shiftBreakdown.map((s, idx) => (
                                      <div key={idx} className="flex justify-between text-sm">
                                          <span className="text-indigo-900">{s.name}</span>
                                          <span className="font-bold text-indigo-600">{s.hours}h</span>
                                      </div>
                                  ))}
                                  <div className="border-t border-indigo-200 mt-2 pt-2 flex justify-between text-sm font-bold">
                                      <span>Total</span>
                                      <span>{selectedAttendance.hours}h</span>
                                  </div>
                              </div>
                          </div>
                      )}

                      {/* Proof Image */}
                      <div>
                          <p className="text-xs text-slate-500 uppercase font-bold mb-2">{t('proofImage')}</p>
                          <div className="bg-slate-100 rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-slate-200">
                              {selectedAttendance.faceImage ? (
                                  <img src={selectedAttendance.faceImage} alt="Face Proof" className="w-full h-full object-cover" />
                              ) : (
                                  <div className="text-slate-400 flex flex-col items-center">
                                      <Camera size={24} className="mb-1" />
                                      <span className="text-xs">{t('noImage')}</span>
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* Location Info */}
                      {selectedAttendance.checkInLocation && (
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm">
                              <p className="font-bold text-blue-800 flex items-center gap-1 mb-1">
                                  <MapPin size={14} /> {t('locationMap')}
                              </p>
                              <div className="flex justify-between">
                                  <span className="text-blue-600">Lat: {selectedAttendance.checkInLocation.lat.toFixed(5)}</span>
                                  <span className="text-blue-600">Lng: {selectedAttendance.checkInLocation.lng.toFixed(5)}</span>
                              </div>
                              {selectedAttendance.checkInLocation.warning && (
                                  <p className="text-red-600 text-xs font-bold mt-1 flex items-center gap-1">
                                      <AlertTriangle size={10} /> {t('gpsWarning')}
                                  </p>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
