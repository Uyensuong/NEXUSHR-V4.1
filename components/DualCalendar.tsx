
import React, { useState, useEffect } from 'react';
import { getMonthDays } from '../lib/lunar';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Plus, Trash2, X } from 'lucide-react';
import { useLanguage, useAuth } from '../contexts/AppContext';
import { Card, CardContent, CardHeader } from './ui/Card';
import { api } from '../services/mockService';
import { CalendarNote } from '../types';
import { format } from 'date-fns';

export const DualCalendar = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [notes, setNotes] = useState<CalendarNote[]>([]);
  
  // Modal State
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteInput, setNoteInput] = useState('');

  useEffect(() => {
    if (user) {
        loadNotes();
    }
  }, [user]);

  const loadNotes = async () => {
      if (!user) return;
      const data = await api.getNotes(user.id);
      setNotes(data);
  };

  const days = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
  
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDayClick = (date: Date) => {
      setSelectedDate(date);
      setNoteInput('');
      setShowNoteModal(true);
  };

  const handleAddNote = async () => {
      if (!user || !selectedDate || !noteInput.trim()) return;
      try {
          const dateStr = format(selectedDate, 'yyyy-MM-dd');
          await api.addNote(user.id, dateStr, noteInput);
          setNoteInput('');
          await loadNotes();
      } catch (e) {
          console.error(e);
      }
  };

  const handleDeleteNote = async (id: string) => {
      try {
          await api.deleteNote(id);
          await loadNotes();
      } catch (e) {
          console.error(e);
      }
  };

  const weekDays = language === 'vi' 
    ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Filter notes for selected date in modal
  const selectedDateNotes = selectedDate 
    ? notes.filter(n => n.date === format(selectedDate, 'yyyy-MM-dd'))
    : [];

  return (
    <>
    <Card className="h-full shadow-md">
      <CardHeader 
        title={t('calendar')} 
        action={
          <div className="flex items-center gap-2">
             <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft size={20}/></button>
             <span className="text-base font-bold w-28 text-center">
               {currentDate.getMonth() + 1}/{currentDate.getFullYear()}
             </span>
             <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight size={20}/></button>
          </div>
        }
      />
      <CardContent>
        {/* Weekday Header */}
        <div className="grid grid-cols-7 gap-1 mb-2 border-b border-slate-100 pb-2">
          {weekDays.map(d => (
            <div key={d} className="text-center text-sm font-bold text-slate-500 uppercase py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, idx) => {
            const dateStr = format(day.date, 'yyyy-MM-dd');
            const hasNotes = notes.some(n => n.date === dateStr);

            return (
                <div 
                key={idx}
                onClick={() => handleDayClick(day.date)}
                className={`
                    relative min-h-[100px] p-2 rounded-lg border transition-all flex flex-col justify-between cursor-pointer
                    ${!day.isCurrentMonth ? 'opacity-40 bg-slate-50 border-transparent' : 'bg-white border-slate-100 hover:border-indigo-300 hover:shadow-md'}
                    ${day.isToday ? 'ring-2 ring-indigo-500 bg-indigo-50/30' : ''}
                    ${day.holiday ? 'bg-red-50 border-red-100' : ''}
                `}
                >
                <div className="flex justify-between items-start">
                    <span className={`text-lg font-semibold ${day.holiday || day.isWeekend ? 'text-red-600' : 'text-slate-700'}`}>
                    {day.day}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{day.lunarDay}/{day.lunarMonth}</span>
                </div>
                
                <div className="flex-1 flex flex-col justify-end gap-1">
                    {day.holiday && (
                        <div className="mt-1 text-xs leading-tight text-red-600 font-bold break-words bg-red-100/50 p-1 rounded">
                        {day.holiday}
                        </div>
                    )}
                    {hasNotes && (
                        <div className="flex items-center gap-1 mt-1">
                            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                            <span className="text-[10px] text-indigo-600 font-medium hidden sm:inline">{t('todoNotes')}</span>
                        </div>
                    )}
                </div>
                </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
           <div className="flex items-center gap-2">
             <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
             <span>{t('holiday')}</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-4 h-4 border-2 border-indigo-500 rounded"></div>
             <span>{t('today')}</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
             <span>{t('todoNotes')}</span>
           </div>
        </div>
      </CardContent>
    </Card>

    {/* Note Modal */}
    {showNoteModal && selectedDate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
                    <h3 className="font-bold text-lg text-indigo-900 flex items-center gap-2">
                        {format(selectedDate, 'EEEE, d MMMM yyyy')}
                    </h3>
                    <button onClick={() => setShowNoteModal(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6">
                    {/* Add Note Input */}
                    <div className="flex gap-2 mb-6">
                        <input 
                            type="text" 
                            className="flex-1 border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder={t('enterNote')}
                            value={noteInput}
                            onChange={(e) => setNoteInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                        />
                        <button 
                            onClick={handleAddNote}
                            disabled={!noteInput.trim()}
                            className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    {/* Notes List */}
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                        {selectedDateNotes.length === 0 ? (
                            <p className="text-center text-slate-400 text-sm italic">{t('noNotes')}</p>
                        ) : (
                            selectedDateNotes.map(note => (
                                <div key={note.id} className="flex justify-between items-start p-3 bg-slate-50 border border-slate-100 rounded-lg group">
                                    <p className="text-sm text-slate-700 leading-snug">{note.content}</p>
                                    <button 
                                        onClick={() => handleDeleteNote(note.id)}
                                        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )}
    </>
  );
};
