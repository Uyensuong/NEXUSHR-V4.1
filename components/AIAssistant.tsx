
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, MessageSquare } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { useLanguage, useAuth } from '../contexts/AppContext';
import { AIChatMessage } from '../types';
import { useNavigate } from 'react-router-dom';

const SYSTEM_INSTRUCTION = `
You are the "Nexus System Assistant", an AI helper for the Nexus HRIS platform. 
Your goal is to assist users (Employees, Managers, Admins) in navigating and understanding the system.

**System Capabilities:**
- **Dashboard:** Overview of attendance and stats.
- **Employees:** Manage profiles, permissions.
- **Attendance:** Check-in/out, GPS/FaceID verification, History.
- **Payroll:** Salary slips, 3P calculation, Commission.
- **Leaves:** Leave requests (Annual, Sick).
- **Contracts:** Employment and Partner contracts.
- **KPI:** 3P Performance reviews, Self-assessment.
- **Tasks:** Task Manager for daily work.
- **Recruitment:** Manage candidates.
- **Workflows:** SOPs and Procedures.

**Navigation Commands:**
If the user asks to go to a specific page, you MUST include a phrase like "Navigating to [Page]" in your response.
- "Navigating to Payroll" -> /payroll
- "Navigating to Employees" -> /employees
- "Navigating to Attendance" -> /attendance
- "Navigating to Dashboard" -> /
- "Navigating to Config" -> /config
- "Navigating to Tasks" -> /tasks
- "Navigating to KPI" -> /kpi

**Tone:** Helpful, Professional, Concise.
`;

export const AIAssistant: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      role: 'ai',
      content: t('aiGreeting'),
      timestamp: new Date().toISOString()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: AIChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key not configured");

      const ai = new GoogleGenAI({ apiKey });
      
      // Prepare history for context
      const history = messages.map(m => ({
          role: m.role === 'ai' ? 'model' : 'user',
          parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            ...history,
            { role: 'user', parts: [{ text: userMsg.content }] }
        ],
        config: {
            systemInstruction: `${SYSTEM_INSTRUCTION}\nCurrent User Role: ${user?.role}\nUser Name: ${user?.fullName}`,
        }
      });

      const responseText = response.text || "I'm sorry, I couldn't process that.";
      
      // Check for navigation commands in response
      let actionLink = undefined;
      if (responseText.includes('Navigating to Payroll')) actionLink = '/payroll';
      if (responseText.includes('Navigating to Employees')) actionLink = '/employees';
      if (responseText.includes('Navigating to Config')) actionLink = '/config';
      if (responseText.includes('Navigating to Attendance')) actionLink = '/attendance';
      if (responseText.includes('Navigating to Dashboard')) actionLink = '/';
      if (responseText.includes('Navigating to Tasks')) actionLink = '/tasks';
      if (responseText.includes('Navigating to KPI')) actionLink = '/kpi';

      const aiMsg: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: responseText,
        timestamp: new Date().toISOString(),
        actionLink
      };
      setMessages(prev => [...prev, aiMsg]);
      
      if (actionLink) {
          setTimeout(() => {
              navigate(actionLink!);
              // Optional: Close on nav
              // setIsOpen(false); 
          }, 1000);
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: "I encountered an error connecting to the AI service. Please check your connection or API key.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-full">
                <Sparkles size={18} />
              </div>
              <h3 className="font-bold text-sm">{t('aiSystemAssistant')}</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div 
            ref={scrollRef}
            className="h-80 overflow-y-auto p-4 bg-slate-50 space-y-3"
          >
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
            <input
              type="text"
              className="flex-1 bg-slate-100 border-none outline-none px-4 py-2 rounded-full text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder={t('aiChatPlaceholder')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              autoFocus
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
          isOpen 
            ? 'bg-slate-700 text-white rotate-90' 
            : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white animate-bounce-slow'
        }`}
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </button>
    </div>
  );
};
