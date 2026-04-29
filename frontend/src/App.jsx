import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Send, User, Bot, Briefcase, Paperclip, Moon, Sun, MonitorDot, Bell, LayoutDashboard, MessageSquare, Users, CheckCircle, XCircle, Clock, FileText, Trash2, Check, X, Download } from 'lucide-react';

export default function App() {
  
  const [currentRole, setCurrentRole] = useState('Candidate');
  const [darkMode, setDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState('chat'); 
  const [dashboardData, setDashboardData] = useState(null);
  
  const [candidateFilter, setCandidateFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('candidates');
  const [popup, setPopup] = useState({ isOpen: false, type: null, data: null });
  const [showExportModal, setShowExportModal] = useState(false);

  const [messages, setMessages] = useState([{ role: 'bot', text: 'Hello! I am your HR Hiring Assistant. You are currently in **Candidate** mode. How can I help you today?' }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  
  const [showAuthModal, setShowAuthModal] = useState(true);
  const [authStep, setAuthStep] = useState(1);
  const [fetchedData, setFetchedData] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const endOfMessagesRef = useRef(null);
  const fileInputRef = useRef(null);

  // --- HELPER: Bulletproof URL Construction ---
  const getApiUrl = (endpoint) => {
    const base = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const cleanEndpoint = endpoint.replace(/^\//, '');
    return `${base}/${cleanEndpoint}`;
  };

  useEffect(() => {
    setSessionId(uuidv4());
    if (localStorage.getItem('theme') === 'dark') { 
      document.documentElement.classList.add('dark'); 
      setDarkMode(true); 
    }
  }, []);

  useEffect(() => { 
    if (viewMode === 'chat') endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages, viewMode]);

  // --- API CALLS (Updated with getApiUrl) ---

  const fetchNotifications = async () => {
    if (currentRole === 'Candidate' && !authEmail) return; 
    try {
      const res = await axios.get(getApiUrl('notifications'), { 
        params: { role: currentRole, email: authEmail } 
      });
      setNotifications(res.data.notifications);
    } catch (error) { console.error("Error fetching notifications"); }
  };

  const fetchDashboardData = async () => {
    try {
      const res = await axios.get(getApiUrl('admin/dashboard'));
      setDashboardData(res.data);
    } catch (error) { console.error("Failed to load dashboard data"); }
  };

  useEffect(() => {
    fetchNotifications(); 
    const interval = setInterval(fetchNotifications, 10000); 
    return () => clearInterval(interval);
  }, [currentRole, authEmail]);

  useEffect(() => { if (viewMode === 'dashboard') fetchDashboardData(); }, [viewMode]);

  const handleApproveRequest = async (id, e) => {
    e.stopPropagation();
    try { 
      await axios.post(getApiUrl(`admin/requests/${id}/approve`)); 
      fetchDashboardData(); 
    } catch (error) { console.error("Failed to approve"); }
  };

  const handleDeleteJob = async (id, e) => {
    e.stopPropagation();
    try { 
      await axios.delete(getApiUrl(`admin/jobs/${id}`)); 
      fetchDashboardData(); 
    } catch (error) { console.error("Failed to delete"); }
  };

  const handleUpdateStatus = async (id, newStatus, e) => {
    e.stopPropagation();
    try {
      await axios.put(getApiUrl(`admin/candidates/${id}/status`), null, { 
        params: { status: newStatus } 
      });
      fetchDashboardData();
    } catch (error) { console.error("Failed to update status"); }
  };

  const handleLogin = async (e) => {
    e.preventDefault(); 
    setIsVerifying(true);
    try {
      const res = await axios.post(getApiUrl('login'), { 
        email: authEmail, 
        phone: authPhone, 
        role: currentRole 
      });
      if (res.data.history && res.data.history.length > 0) { 
        setFetchedData({ history: res.data.history, session_id: res.data.session_id }); 
        setAuthStep(2); 
      } else { 
        setMessages([{ role: 'bot', text: `Welcome! I don't see any previous chats for that email, so let's start fresh.` }]); 
        setShowAuthModal(false); 
      }
      fetchNotifications();
    } catch (error) { console.error("Verification failed"); } finally { setIsVerifying(false); }
  };

  const sendMessage = async (e) => {
    e?.preventDefault(); 
    if (!input.trim()) return;
    const userMessage = input.trim(); 
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]); 
    setInput(''); 
    setIsLoading(true);
    try {
      const res = await axios.post(getApiUrl('chat'), { 
        session_id: sessionId, 
        message: userMessage, 
        user_role: currentRole 
      });
      setMessages(prev => [...prev, { role: 'bot', text: res.data.response }]);
    } catch (error) { 
      setMessages(prev => [...prev, { role: 'bot', text: 'Server error.' }]); 
    } finally { setIsLoading(false); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; 
    if (!file) return; 
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', text: `📎 Uploading: ${file.name}...` }]);
    const formData = new FormData(); 
    formData.append('file', file);
    try {
      const uploadRes = await axios.post(getApiUrl('upload'), formData, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
      const chatRes = await axios.post(getApiUrl('chat'), { 
        session_id: sessionId, 
        message: uploadRes.data.file_url, 
        user_role: currentRole 
      });
      setMessages(prev => { 
        const newMsgs = [...prev]; 
        newMsgs.pop(); 
        return [...newMsgs, { role: 'user', text: `📎 Attached: ${file.name}` }, { role: 'bot', text: chatRes.data.response }]; 
      });
    } catch (error) { 
      setMessages(prev => { 
        const newMsgs = [...prev]; 
        newMsgs.pop(); 
        return [...newMsgs, { role: 'bot', text: 'Sorry, upload failed.' }]; 
      }); 
    } finally { setIsLoading(false); e.target.value = null; }
  };

  // --- UI HELPERS ---

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
    setCurrentRole(newRole); setViewMode('chat'); setSessionId(uuidv4()); 
    setMessages([{ role: 'bot', text: `Switched to **${newRole}** mode. How can I assist you today?` }]);
    if (newRole === 'HR Admin') { 
      setAuthEmail('hradmin@abc.com'); setAuthPhone('0000000000');
    } else if (newRole === 'Hiring Manager') { 
      setAuthEmail('hrm@abc.com'); setAuthPhone('1111111111');
    } else { 
      setAuthEmail(''); setAuthPhone(''); 
    }
    setShowAuthModal(true); setAuthStep(1); setNotifications([]); setShowDropdown(false); setCandidateFilter('all');
  };

  const handleRestoreChat = () => { 
    setMessages(fetchedData.history); 
    if (fetchedData.session_id) setSessionId(fetchedData.session_id); 
    setShowAuthModal(false); 
  };
  
  const handleStartNewChat = () => { 
    setMessages([{ role: 'bot', text: `Welcome back! Let's start a brand new conversation.` }]); 
    setShowAuthModal(false); 
  };

  const handleQuickReply = (text) => { 
    setInput(text); 
    setTimeout(() => document.getElementById('submitBtn').click(), 50); 
  };
  
  const formatText = (text) => text?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/\n/g, '<br/>') || '';

  const getQuickReplies = () => {
    if (currentRole === 'Candidate') return ['View job openings', 'Apply for a job', 'Check application status'];
    if (currentRole === 'Hiring Manager') return ['I want to raise a hiring request'];
    if (currentRole === 'HR Admin') return ['Pending hiring requests', 'Shortlisted candidates', 'Show rejected candidates', 'Generate job description'];
    return [];
  };

  const filteredCandidates = dashboardData?.candidates.filter(c => {
    if (candidateFilter === 'all') return true;
    const status = (c.screening_status || '').toLowerCase();
    if (candidateFilter === 'hired') return status.includes('hired');
    if (candidateFilter === 'pending') return status.includes('pending') || status.includes('awaiting');
    if (candidateFilter === 'rejected') return status.includes('reject') || status.includes('not suitable') || status.includes('missing');
    return true;
  });

  return (
    <div className="relative flex flex-col h-screen w-full font-sans overflow-hidden bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-300">
      
      {/* EXPORT MODAL */}
      {showExportModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-fade-in">
           <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Download size={20}/> Category Export</h3>
                 <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-800 dark:hover:text-white transition"><X size={24}/></button>
              </div>
              <div className="flex flex-col gap-3">
                 {[
                   {label: 'Pending Review Candidates', val: 'pending'}, 
                   {label: 'Rejected Candidates', val: 'rejected'},
                   {label: 'Shortlisted Candidates', val: 'shortlisted'}, 
                   {label: 'Interview Done Candidates', val: 'interview_done'}, 
                   {label: 'Hired Candidates', val: 'hired'},
                   {label: 'Pending Hiring Requests', val: 'hiring_requests'}
                 ].map(opt => (
                    <a key={opt.val} href={getApiUrl(`export?type=${opt.val}`)} onClick={() => setShowExportModal(false)} 
                       className="px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 transition text-center border border-gray-100 dark:border-gray-700">
                       {opt.label}
                    </a>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* POPUP MODAL */}
      {popup.isOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white capitalize">{popup.type} Details</h3>
              <button onClick={() => setPopup({ isOpen: false })} className="text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4 text-sm text-gray-700 dark:text-gray-300">
              {popup.data && Object.entries(popup.data).map(([key, value]) => {
                if (key === '_id') return null;
                return (
                  <div key={key} className="flex flex-col border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{key.replace(/_/g, ' ')}</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{Array.isArray(value) ? value.join(', ') : (value || 'N/A').toString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-opacity duration-300">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-2xl max-w-sm w-full border border-gray-100 dark:border-gray-800 scale-100">
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-6">{currentRole} Login</h2>
            {authStep === 1 ? (
              <>
                <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">Please enter your details to verify your identity.</p>
                <form onSubmit={handleLogin} className="space-y-5 mb-8">
                  <input type="email" required value={authEmail} onChange={e=>setAuthEmail(e.target.value)} className="w-full border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Email (john@example.com)" />
                  <input type="text" required value={authPhone} onChange={e=>setAuthPhone(e.target.value)} className="w-full border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Phone Number (9876543210)" />
                  <button type="submit" disabled={isVerifying || !authEmail || !authPhone} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-70 shadow-md">{isVerifying ? 'Checking...' : 'Continue'}</button>
                </form>
              </>
            ) : (
              <>
                <div className="mb-8 text-center"><div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mb-4"><User size={32} /></div><h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Welcome Back!</h3><p className="text-sm text-gray-500 dark:text-gray-400">Would you like to pick up your previous conversation, or start a new one?</p></div>
                <div className="flex flex-col gap-3 mb-6">
                  <button onClick={handleRestoreChat} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2">🕰️ Continue Older Chat</button>
                  <button onClick={handleStartNewChat} className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2">✨ Start New Chat</button>
                </div>
              </>
            )}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
              <p className="text-xs text-gray-400 mb-4 uppercase font-bold tracking-widest">Switch Account Type</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={() => switchRole('Candidate')} className="text-xs font-semibold px-4 py-1.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900 transition">👤 Candidate</button>
                <button onClick={() => switchRole('Hiring Manager')} className="text-xs font-semibold px-4 py-1.5 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900 transition">🟣 Hiring Manager</button>
                <button onClick={() => switchRole('HR Admin')} className="text-xs font-semibold px-4 py-1.5 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-full hover:bg-green-100 dark:hover:bg-green-900 transition">🟢 HR Admin</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="w-full bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="w-full flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-2xl text-blue-600 dark:text-blue-400 shadow-inner"><Briefcase size={26} /></div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-gray-950 dark:text-white tracking-tighter">HR Chatbot</h1>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">Digital HR Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-4">
            {currentRole === 'HR Admin' && (
              <button onClick={() => setViewMode(viewMode === 'chat' ? 'dashboard' : 'chat')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                {viewMode === 'chat' ? <><LayoutDashboard size={18}/> <span className="hidden md:inline">Dashboard</span></> : <><MessageSquare size={18}/> <span className="hidden md:inline">Chat Mode</span></>}
              </button>
            )}

            <div className="relative">
              <button onClick={() => setShowDropdown(!showDropdown)} className="relative p-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
                <Bell size={20}/>
                {notifications.length > 0 && (<span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></span>)}
              </button>
              {showDropdown && (
                <div className="absolute right-0 mt-3 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50"><h4 className="text-sm font-bold text-gray-900 dark:text-white">Alerts</h4></div>
                  <div className="max-h-60 overflow-y-auto p-2">
                    {notifications.length > 0 ? notifications.map((note, idx) => (
                        <div key={idx} onClick={() => { setShowDropdown(false); setViewMode('chat'); setMessages(prev => [...prev, { role: 'bot', text: note.details }]); }} className="p-3 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors cursor-pointer flex items-center justify-between group">
                          <span className="pr-2">{note.text}</span><span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold">View ➔</span>
                        </div>
                    )) : <div className="p-6 text-sm text-gray-500 text-center">No new notifications.</div>}
                  </div>
                </div>
              )}
            </div>

            <button onClick={toggleDarkMode} className="p-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 transition-all">{darkMode ? <Sun size={20}/> : <Moon size={20}/>}</button>
          </div>
        </div>
      </div>

      {/* VIEWPORT */}
      {viewMode === 'dashboard' ? (
        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-6xl mx-auto space-y-8">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">HR Dashboard</h2>
            
            {dashboardData && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div onClick={() => {setCandidateFilter('all'); setActiveTab('candidates');}} className={`cursor-pointer transition-all bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border ${candidateFilter === 'all' && activeTab === 'candidates' ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-gray-100 dark:border-gray-700'} flex items-center gap-4`}><div className="p-4 bg-blue-100 text-blue-600 rounded-2xl"><Users size={28} /></div><div><p className="text-sm text-gray-500 font-medium">Candidates</p><h3 className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardData.stats.total}</h3></div></div>
                <div onClick={() => {setCandidateFilter('hired'); setActiveTab('candidates');}} className={`cursor-pointer transition-all bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border ${candidateFilter === 'hired' && activeTab === 'candidates' ? 'border-green-500 ring-4 ring-green-500/20' : 'border-gray-100 dark:border-gray-700'} flex items-center gap-4`}><div className="p-4 bg-green-100 text-green-600 rounded-2xl"><CheckCircle size={28} /></div><div><p className="text-sm text-gray-500 font-medium">Hired</p><h3 className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardData.stats.hired}</h3></div></div>
                <div onClick={() => {setCandidateFilter('pending'); setActiveTab('candidates');}} className={`cursor-pointer transition-all bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border ${candidateFilter === 'pending' && activeTab === 'candidates' ? 'border-orange-500 ring-4 ring-orange-500/20' : 'border-gray-100 dark:border-gray-700'} flex items-center gap-4`}><div className="p-4 bg-orange-100 text-orange-600 rounded-2xl"><Clock size={28} /></div><div><p className="text-sm text-gray-500 font-medium">Pending</p><h3 className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardData.stats.pending}</h3></div></div>
                <div onClick={() => {setCandidateFilter('rejected'); setActiveTab('candidates');}} className={`cursor-pointer transition-all bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border ${candidateFilter === 'rejected' && activeTab === 'candidates' ? 'border-red-500 ring-4 ring-red-500/20' : 'border-gray-100 dark:border-gray-700'} flex items-center gap-4`}><div className="p-4 bg-red-100 text-red-600 rounded-2xl"><XCircle size={28} /></div><div><p className="text-sm text-gray-500 font-medium">Rejected</p><h3 className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardData.stats.rejected}</h3></div></div>
              </div>
            )}

            <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-800">
              {['candidates', 'requests', 'jobs'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 px-4 font-bold text-sm capitalize ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>{tab}</button>
              ))}
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl shadow-sm overflow-hidden min-h-[400px]">
              {activeTab === 'candidates' && (
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/80 text-xs font-bold text-gray-500 uppercase"><tr className="border-b dark:border-gray-700"><th className="px-6 py-4">Name</th><th className="px-6 py-4">Role</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
                  <tbody>
                    {filteredCandidates?.map(c => (
                      <tr key={c._id} onClick={() => setPopup({ isOpen: true, type: 'Candidate', data: c })} className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{c.full_name}</td><td className="px-6 py-4">{c.preferred_role}</td>
                        <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-md text-xs font-bold ${c.screening_status?.toLowerCase().includes('hired') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{c.screening_status}</span></td>
                        <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-2 justify-end">
                            <button onClick={e => handleUpdateStatus(c._id, 'Hired', e)} className="bg-green-100 text-green-700 px-2.5 py-1.5 rounded-lg text-xs font-bold">Hire</button>
                            <button onClick={e => handleUpdateStatus(c._id, 'Rejected', e)} className="bg-red-100 text-red-700 px-2.5 py-1.5 rounded-lg text-xs font-bold">Reject</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* CHAT VIEW */
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <div className="max-w-5xl mx-auto space-y-8">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end`}>
                    <div className={`flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center shadow ${msg.role === 'user' ? 'bg-blue-600 ml-3' : 'bg-green-500 mr-3'}`}>
                      {msg.role === 'user' ? <User size={18} className="text-white" /> : <Bot size={18} className="text-white" />}
                    </div>
                    <div className={`p-4 rounded-3xl text-sm md:text-base shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 border dark:border-gray-800 rounded-bl-none'}`}>
                      <div dangerouslySetInnerHTML={{ __html: formatText(msg.text) }} />
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (<div className="flex justify-start"><div className="bg-white dark:bg-gray-900 px-6 py-4 rounded-full border animate-pulse text-sm">Processing...</div></div>)}
              <div ref={endOfMessagesRef} />
            </div>
          </div>

          <div className="w-full bg-white dark:bg-gray-950 border-t dark:border-gray-800">
            <div className="max-w-5xl mx-auto px-6 py-3 flex gap-2.5 overflow-x-auto no-scrollbar">
              {getQuickReplies().map(btn => (
                <button key={btn} onClick={() => handleQuickReply(btn)} className="whitespace-nowrap px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-sm font-semibold border dark:border-gray-700">{btn}</button>
              ))}
              {currentRole === 'HR Admin' && (
                <button onClick={() => setShowExportModal(true)} className="whitespace-nowrap px-5 py-2 bg-green-600 text-white rounded-full text-sm font-bold ml-auto">📥 Export</button>
              )}
            </div>
            
            <form onSubmit={sendMessage} className="max-w-5xl mx-auto px-6 pb-6 pt-2 flex items-center gap-3">
              <button type="button" onClick={() => fileInputRef.current.click()} className="p-3.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-full hover:text-white"><Paperclip size={22} /></button>
              <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder={`Type message as ${currentRole}...`} className="flex-1 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 text-gray-900 dark:text-white rounded-full px-6 py-4 focus:ring-2 focus:ring-blue-500 outline-none" />
              <button id="submitBtn" type="submit" disabled={isLoading} className="bg-blue-600 text-white p-4 rounded-full shadow-md disabled:opacity-50"><Send size={24} /></button>
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx" />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}