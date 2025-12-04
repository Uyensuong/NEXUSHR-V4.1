
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { useLanguage } from '../contexts/AppContext';
import { Send, Bot, User, RotateCcw, Sparkles, AlertTriangle } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// Specialized Aviation Knowledge for System Instruction
const AIRLINE_SYSTEM_INSTRUCTION = `
You are the Senior AI Ticketing Expert for Uyển Sương Airline (a Ticket Agency).
Your goal is to assist staff with accurate, professional advice on airline rules, ticketing procedures, and company policies.

**Core Knowledge Base (Vietnam Market):**

1. **Vietnam Airlines (VNA):**
   - **Hand Baggage:** Economy usually 12kg (1 piece 10kg + 1 accessory 2kg).
   - **Checked Baggage:** Economy usually 23kg (1 piece).
   - **Name Change:** STRICTLY PROHIBITED for most ticket classes. Only minor spelling corrections allowed (fee applies).
   - **Refund:** Allowed for Flex/Standard classes (fee applies). Restricted for Lite/Super Lite.

2. **Vietjet Air (VJ):**
   - **Hand Baggage:** 7kg.
   - **Checked Baggage:** Must be purchased (15kg, 20kg, etc.). Eco class has NO checked bag by default.
   - **Name Change:** ALLOWED for all classes (fee + fare difference). Must be done 3h before departure.
   - **Refund:** Eco/Deluxe usually non-refundable (credit shell only in specific cases). SkyBoss is refundable (credit shell).

3. **Bamboo Airways (QH):**
   - **Hand Baggage:** 7kg (Eco), 2x10kg (Business).
   - **Name Change:** Allowed (fee + diff).
   - **Late/No-Show:** Ticket invalid if late.

**General Rules:**
- **Pregnant Passengers:** 
  - <32 weeks: Accepted with normal documents.
  - 32-36 weeks: MEDIF I required (valid 7 days). 
  - >36 weeks: Refused by most airlines.
- **Children:**
  - INF (<2 years): ~10% fare (VNA) or fixed fee (VJ/QH). Sit on lap.
  - CHD (2-12 years): 90% fare (VNA), 100% fare (VJ/QH but lower tax).
- **Identification:** Adults need CCCD/Passport. Children need Birth Certificate (Original or Red-stamp Copy).

**Tone & Style:**
- Language: Vietnamese (Default).
- Tone: Professional, Concise, Helpful.
- Format: Use bullet points for lists. Bold key fees or rules.
- If unsure, advise the staff to "Check the specific fare rules on the GDS/Airline Portal" as rules change often.
`;

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

export default function AIChatbot() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
        id: 'init',
        role: 'model',
        content: t('airlineExpertGreeting'),
        timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text: string = input) => {
    if (!text.trim()) return;

    // 1. Add User Message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // 2. Initialize Gemini
      // NOTE: This relies on process.env.API_KEY being injected by the build system/environment
      const apiKey = process.env.API_KEY; 
      
      if (!apiKey) {
          throw new Error("API Key missing. Please configure process.env.API_KEY.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // 3. Prepare History for Context
      // Map internal role 'model' to API role 'model' (or 'assistant' conceptually)
      // Gemini SDK expects specific history format if using chat, but for single generateContent, we format the prompt.
      // Let's use generateContentStream with system instruction.
      
      const response = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: [
            // History context (simplified last 5 turns for context window efficiency)
            ...messages.slice(-5).map(m => ({
                role: m.role,
                parts: [{ text: m.content }]
            })),
            // Current message
            { role: 'user', parts: [{ text: userMsg.content }] }
        ],
        config: {
            systemInstruction: AIRLINE_SYSTEM_INSTRUCTION,
        }
      });

      // 4. Handle Stream
      let fullText = '';
      const botMsgId = (Date.now() + 1).toString();
      
      // Add placeholder bot message
      setMessages(prev => [...prev, {
          id: botMsgId,
          role: 'model',
          content: '',
          timestamp: new Date()
      }]);

      for await (const chunk of response) {
          const chunkText = chunk.text;
          if (chunkText) {
              fullText += chunkText;
              // Update last message with accumulating text
              setMessages(prev => prev.map(m => 
                  m.id === botMsgId ? { ...m, content: fullText } : m
              ));
          }
      }

    } catch (error: any) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'model',
          content: `⚠️ Error: ${error.message || "Could not connect to AI service."}`,
          timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
      { id: 'vna', label: 'VNA Refund Rules', text: t('prompt_refundVNA') },
      { id: 'vj', label: 'Vietjet Baggage', text: t('prompt_baggageVJ') },
      { id: 'name', label: 'Change Name', text: t('prompt_changeName') },
      { id: 'preg', label: 'Pregnant Pax', text: t('prompt_pregnant') },
  ];

  return (
    <div className="h-[calc(100vh-140px)] flex gap-6">
        {/* Left Sidebar - Quick Actions */}
        <div className="hidden md:flex flex-col w-64 space-y-4">
            <Card className="flex-1 bg-gradient-to-b from-indigo-50 to-white border-indigo-100">
                <CardHeader title={t('quickPrompts')} action={<Sparkles size={16} className="text-indigo-500"/>} />
                <CardContent className="space-y-3">
                    {quickPrompts.map(p => (
                        <button
                            key={p.id}
                            onClick={() => handleSend(p.text)}
                            disabled={isLoading}
                            className="w-full text-left p-3 rounded-lg bg-white border border-indigo-100 hover:border-indigo-300 hover:shadow-sm transition-all text-sm text-slate-700"
                        >
                            {p.text}
                        </button>
                    ))}
                </CardContent>
            </Card>
            
            <button 
                onClick={() => setMessages([{ id: 'init', role: 'model', content: t('airlineExpertGreeting'), timestamp: new Date() }])}
                className="flex items-center justify-center gap-2 p-3 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
            >
                <RotateCcw size={16} />
                {t('clearHistory')}
            </button>
        </div>

        {/* Main Chat Area */}
        <Card className="flex-1 flex flex-col shadow-lg border-indigo-100 overflow-hidden">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Bot size={24} />
                </div>
                <div>
                    <h2 className="font-bold text-slate-800">{t('aiChatbotTitle')}</h2>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        {t('aiChatbotSubtitle')}
                    </p>
                </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50" ref={scrollRef}>
                {messages.map((msg) => {
                    const isBot = msg.role === 'model';
                    return (
                        <div key={msg.id} className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
                            <div className={`flex max-w-[80%] md:max-w-[70%] gap-3 ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${isBot ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                    {isBot ? <Bot size={16} /> : <User size={16} />}
                                </div>
                                <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                                    isBot 
                                        ? 'bg-white text-slate-800 rounded-tl-none border border-slate-200' 
                                        : 'bg-indigo-600 text-white rounded-tr-none'
                                }`}>
                                    {msg.content}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {isLoading && (
                    <div className="flex justify-start animate-pulse">
                        <div className="flex max-w-[80%] gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-1 text-white">
                                <Bot size={16} />
                            </div>
                            <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-slate-200 text-sm text-slate-500 italic">
                                {t('thinking')}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100">
                <div className="flex gap-3 relative">
                    <input
                        type="text"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        placeholder={t('aiChatInputPlaceholder')}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        disabled={isLoading}
                    />
                    <button 
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isLoading}
                        className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 shadow-md transition-all hover:scale-105 active:scale-95"
                    >
                        <Send size={20} />
                    </button>
                </div>
                <div className="text-center mt-2">
                    <p className="text-[10px] text-slate-400">
                        AI can make mistakes. Always verify critical flight rules with the airline.
                    </p>
                </div>
            </div>
        </Card>
    </div>
  );
}
