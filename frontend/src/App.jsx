import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Send, User, Bot, Briefcase, Paperclip, X, Moon, Sun, MonitorDot } from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState('Candidate');
  const [darkMode, setDarkMode] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hello! I am your HR Hiring Assistant. You are currently in **Candidate** mode. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  
  // --- MODAL STATES ---
  const [showAuthModal, setShowAuthModal] = useState(true);
  const [authStep, setAuthStep] = useState(1); // 1 = Login Form, 2 = Choose Chat Path
  const [fetchedData, setFetchedData] = useState(null); // Temporarily hold history
  const [authEmail, setAuthEmail] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const endOfMessagesRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setSessionId(uuidv4());
    const isDark = localStorage.getItem('theme') === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleDarkMode = () => {
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setDarkMode(true);
    }
  };

  const switchRole = (newRole) => {
    setCurrentRole(newRole);
    setSessionId(uuidv4()); 
    setMessages([
      { role: 'bot', text: `Switched to **${newRole}** mode. How can I assist you today?` }
    ]);
    setShowAuthModal(newRole === 'Candidate');
    setAuthStep(1); // Always reset modal to step 1 when switching
  };

  const handleRoleChange = (e) => switchRole(e.target.value);

  // --- STEP 1: VERIFY LOGIN ---
  const handleCandidateLogin = async (e) => {
    e.preventDefault();
    setIsVerifying(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const res = await axios.post(`${apiUrl}/candidate/login`, {
        email: authEmail,
        phone: authPhone
      });
      
      if (res.data.history && res.data.history.length > 0) {
        // History found! Move to Step 2 to ask them what they want to do.
        setFetchedData({ history: res.data.history, session_id: res.data.session_id });
        setAuthStep(2); 
      } else {
        // No history found. Start fresh automatically.
        setMessages([{ role: 'bot', text: `Welcome! I don't see any previous chats for that email, so let's start fresh. How can I help you today?` }]);
        setShowAuthModal(false);
      }
    } catch (error) { 
      console.error("Verification failed", error); 
    } finally { 
      setIsVerifying(false); 
    }
  };

  // --- STEP 2: HANDLE CHAT CHOICE ---
  const handleRestoreChat = () => {
    setMessages(fetchedData.history);
    if (fetchedData.session_id) setSessionId(fetchedData.session_id);
    setShowAuthModal(false);
  };

  const handleStartNewChat = () => {
    // Keep the brand new session ID generated on load
    setMessages([{ role: 'bot', text: `Welcome back! Let's start a brand new conversation. How can I assist you today?` }]);
    setShowAuthModal(false);
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;
    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const res = await axios.post(`${apiUrl}/chat`, { session_id: sessionId, message: userMessage, user_role: currentRole });
      setMessages(prev => [...prev, { role: 'bot', text: res.data.response }]);
    } catch (error) { setMessages(prev => [...prev, { role: 'bot', text: 'Server error.' }]); } finally { setIsLoading(false); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', text: `📎 Uploading: ${file.name}...` }]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const uploadRes = await axios.post(`${apiUrl}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const chatRes = await axios.post(`${apiUrl}/chat`, {
        session_id: sessionId,
        message: uploadRes.data.file_url,
        user_role: currentRole 
      });

      setMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop(); 
        return [...newMessages, { role: 'user', text: `📎 Attached: ${file.name}` }, { role: 'bot', text: chatRes.data.response }];
      });
    } catch (error) {
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop(); 
        return [...newMessages, { role: 'bot', text: 'Sorry, the file upload failed.' }];
      });
    } finally {
      setIsLoading(false);
      e.target.value = null; 
    }
  };

  const handleQuickReply = (text) => {
    setInput(text);
    setTimeout(() => document.getElementById('submitBtn').click(), 50);
  };

  const formatText = (text) => {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900 dark:text-gray-100">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-gray-600 dark:text-gray-400 italic">$1</em>')
      .replace(/\n/g, '<br/>');
  };

  const getQuickReplies = () => {
    if (currentRole === 'Candidate') return ['View job openings', 'Apply for a job', 'Check application status'];
    if (currentRole === 'Hiring Manager') return ['I want to raise a hiring request'];
    if (currentRole === 'HR Admin') return ['Pending hiring requests', 'Pending candidate requests', 'Shortlisted candidates', 'Show rejected candidates', 'Find candidate details', 'Update candidate status', 'Generate job description'];
    return [];
  };

  return (
    <div className="relative flex flex-col h-screen w-full font-sans overflow-hidden bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-300">
      
      {/* VERIFICATION MODAL OVERLAY (UNSKIPPABLE) */}
      {showAuthModal && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-opacity duration-300">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-2xl max-w-sm w-full border border-gray-100 dark:border-gray-800 scale-100">
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Candidate Login</h2>
            </div>
            
            {authStep === 1 ? (
              // --- STEP 1: LOGIN FORM ---
              <>
                <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                  Please enter your details to verify your identity before proceeding.
                </p>
                <form onSubmit={handleCandidateLogin} className="space-y-5 mb-8">
                  <input 
                    type="email" required value={authEmail} onChange={e=>setAuthEmail(e.target.value)} 
                    className="w-full border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition" 
                    placeholder="Email (john@example.com)" 
                  />
                  <input 
                    type="text" required value={authPhone} onChange={e=>setAuthPhone(e.target.value)} 
                    className="w-full border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition" 
                    placeholder="Phone Number (9876543210)" 
                  />
                  <div className="flex gap-4 pt-3">
                    <button type="submit" disabled={isVerifying || !authEmail || !authPhone} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-70 shadow-md">
                      {isVerifying ? 'Checking...' : 'Continue'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              // --- STEP 2: CHOOSE CHAT PATH ---
              <>
                <div className="mb-8 text-center animate-fade-in-up">
                  <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4">
                    <User size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Welcome Back!</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    We securely located your profile. Would you like to pick up your previous conversation, or start a new one?
                  </p>
                </div>

                <div className="flex flex-col gap-3 mb-6">
                  <button onClick={handleRestoreChat} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-semibold transition shadow-md flex items-center justify-center gap-2">
                    🕰️ Continue Older Chat
                  </button>
                  <button onClick={handleStartNewChat} className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 py-3.5 rounded-xl font-semibold transition flex items-center justify-center gap-2">
                    ✨ Start New Chat
                  </button>
                </div>
              </>
            )}

            {/* INTERNAL ROLE SWITCHER */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
              <p className="text-xs text-gray-400 mb-4 uppercase font-bold tracking-widest">Internal Employee Access</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => switchRole('Hiring Manager')} className="text-xs font-semibold px-4 py-1.5 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900 transition">Hiring Manager</button>
                <button onClick={() => switchRole('HR Admin')} className="text-xs font-semibold px-4 py-1.5 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-full hover:bg-green-100 dark:hover:bg-green-900 transition">HR Admin</button>
              </div>
            </div>
            
          </div>
        </div>
      )}

      {/* FULL WIDTH HEADER */}
      <div className="w-full bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 transition-colors duration-300">
        <div className="w-full flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-2xl text-blue-600 dark:text-blue-400 shadow-inner"><Briefcase size={26} /></div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-gray-950 dark:text-white tracking-tighter">HR-Chatbot-for-Internal-Hiring-Support</h1>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">Digital HR Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={toggleDarkMode} className="p-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
              {darkMode ? <Sun size={20}/> : <Moon size={20}/>}
            </button>
            
            <div className="relative hidden md:block">
              <select 
                value={currentRole} onChange={handleRoleChange} 
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-semibold rounded-xl block p-3 pr-10 cursor-pointer outline-none border-2 border-transparent focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-950 transition-all duration-300 shadow-lg shadow-blue-500/10 dark:shadow-blue-900/30 appearance-none"
              >
                <option value="Candidate">👤 Candidate</option>
                <option value="Hiring Manager">🟣 Hiring Manager</option>
                <option value="HR Admin">🟢 HR Admin</option>
              </select>
              <MonitorDot size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-300">
        <div className="max-w-5xl mx-auto p-6 space-y-8">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end`}>
                <div className={`flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center shadow ${msg.role === 'user' ? 'bg-blue-600 dark:bg-blue-500 ml-3' : 'bg-green-500 mr-3'}`}>
                  {msg.role === 'user' ? <User size={18} className="text-white" /> : <Bot size={18} className="text-white" />}
                </div>
                <div className={`p-4 rounded-3xl leading-relaxed text-sm md:text-base shadow-sm ${msg.role === 'user' ? 'bg-blue-600 dark:bg-blue-500 text-white rounded-br-none' : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-800 rounded-bl-none'}`}>
                  <div dangerouslySetInnerHTML={{ __html: formatText(msg.text) }} />
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 px-6 py-4 rounded-full rounded-bl-none text-sm font-medium border dark:border-gray-800 animate-pulse">Processing...</div>
            </div>
          )}
          <div ref={endOfMessagesRef} />
        </div>
      </div>

      {/* BOTTOM ACTIONS */}
      <div className="w-full bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2.5 items-center w-full">
              {getQuickReplies().map((btn) => (
              <button key={btn} onClick={() => handleQuickReply(btn)} className="whitespace-nowrap px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm font-semibold border dark:border-gray-700 transition">
                  {btn}
              </button>
              ))}
          </div>
          {currentRole === 'HR Admin' && (
            <a href={`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/export/candidates`} download className="flex-shrink-0 whitespace-nowrap px-6 py-2.5 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-xl text-sm font-bold transition shadow-md w-full md:w-auto text-center mt-2 md:mt-0">
              📥 Export Excel
            </a>
          )}
        </div>
        
        {/* INPUT FORM */}
        <form onSubmit={sendMessage} className="max-w-5xl mx-auto px-6 pb-6 pt-2 flex items-center gap-3 md:gap-4">
          <button type="button" onClick={() => fileInputRef.current.click()} className="p-3.5 md:p-4 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full transition hover:text-gray-800 dark:hover:text-white flex-shrink-0">
            <Paperclip size={22} />
          </button>
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Type as ${currentRole}...`} className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-full px-6 py-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner" />
          <button id="submitBtn" type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white p-4 md:p-5 rounded-full transition shadow-md disabled:opacity-50">
            <Send size={24} className="ml-1 mt-1 -mr-1 -mb-1" />
          </button>
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx" />
        </form>
      </div>
    </div>
  );
}