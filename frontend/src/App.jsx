import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Send, User, Bot, Briefcase, Paperclip, Moon, Sun, MonitorDot, Bell, LayoutDashboard, MessageSquare, Users, CheckCircle, XCircle, Clock, FileText, Trash2, Check, X } from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState('Candidate');
  const [darkMode, setDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState('chat'); 
  const [dashboardData, setDashboardData] = useState(null);
  
  // Filtering, Tabs, and Popups
  const [candidateFilter, setCandidateFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('candidates'); // candidates, requests, jobs
  const [popup, setPopup] = useState({ isOpen: false, type: null, data: null });

  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hello! I am your HR Hiring Assistant. You are currently in **Candidate** mode. How can I help you today?' }
  ]);
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

  useEffect(() => {
    setSessionId(uuidv4());
    const isDark = localStorage.getItem('theme') === 'dark';
    if (isDark) { document.documentElement.classList.add('dark'); setDarkMode(true); }
  }, []);

  useEffect(() => {
    if (viewMode === 'chat') endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, viewMode]);

  const fetchNotifications = async () => {
    if (currentRole === 'Candidate' && !authEmail) return; 
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const res = await axios.get(`${apiUrl}/notifications`, { params: { role: currentRole, email: authEmail } });
      setNotifications(res.data.notifications);
    } catch (error) { console.error("Error fetching notifications"); }
  };

  const fetchDashboardData = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const res = await axios.get(`${apiUrl}/admin/dashboard`);
      setDashboardData(res.data);
    } catch (error) { console.error("Failed to load dashboard data"); }
  };

  useEffect(() => {
    fetchNotifications(); 
    const interval = setInterval(fetchNotifications, 10000); 
    return () => clearInterval(interval);
  }, [currentRole, authEmail]);

  useEffect(() => {
    if (viewMode === 'dashboard') fetchDashboardData();
  }, [viewMode]);

  // --- NEW: Action Handlers for Dashboard ---
  const handleApproveRequest = async (id, e) => {
    e.stopPropagation();
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      await axios.post(`${apiUrl}/admin/requests/${id}/approve`);
      fetchDashboardData(); 
    } catch (error) { console.error("Failed to approve"); }
  };

  const handleDeleteJob = async (id, e) => {
    e.stopPropagation();
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      await axios.delete(`${apiUrl}/admin/jobs/${id}`);
      fetchDashboardData();
    } catch (error) { console.error("Failed to delete"); }
  };

  const toggleDarkMode = () => {
    if (darkMode) { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); setDarkMode(false);
    } else { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); setDarkMode(true); }
  };

  const switchRole = (newRole) => {
    setCurrentRole(newRole); setViewMode('chat'); setSessionId(uuidv4()); 
    setMessages([{ role: 'bot', text: `Switched to **${newRole}** mode. How can I assist you today?` }]);
    setShowAuthModal(newRole === 'Candidate'); setAuthStep(1); setNotifications([]); setShowDropdown(false); setCandidateFilter('all');
  };

  const handleCandidateLogin = async (e) => {
    e.preventDefault(); setIsVerifying(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const res = await axios.post(`${apiUrl}/candidate/login`, { email: authEmail, phone: authPhone });
      if (res.data.history && res.data.history.length > 0) { setFetchedData({ history: res.data.history, session_id: res.data.session_id }); setAuthStep(2); 
      } else { setMessages([{ role: 'bot', text: `Welcome! I don't see any previous chats for that email, so let's start fresh.` }]); setShowAuthModal(false); }
      fetchNotifications();
    } catch (error) { console.error("Verification failed"); } finally { setIsVerifying(false); }
  };

  const sendMessage = async (e) => {
    e?.preventDefault(); if (!input.trim()) return;
    const userMessage = input.trim(); setMessages(prev => [...prev, { role: 'user', text: userMessage }]); setInput(''); setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const res = await axios.post(`${apiUrl}/chat`, { session_id: sessionId, message: userMessage, user_role: currentRole });
      setMessages(prev => [...prev, { role: 'bot', text: res.data.response }]);
    } catch (error) { setMessages(prev => [...prev, { role: 'bot', text: 'Server error.' }]); } finally { setIsLoading(false); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return; setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', text: `📎 Uploading: ${file.name}...` }]);
    const formData = new FormData(); formData.append('file', file);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const uploadRes = await axios.post(`${apiUrl}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const chatRes = await axios.post(`${apiUrl}/chat`, { session_id: sessionId, message: uploadRes.data.file_url, user_role: currentRole });
      setMessages(prev => { const newMsgs = [...prev]; newMsgs.pop(); return [...newMsgs, { role: 'user', text: `📎 Attached: ${file.name}` }, { role: 'bot', text: chatRes.data.response }]; });
    } catch (error) { setMessages(prev => { const newMsgs = [...prev]; newMsgs.pop(); return [...newMsgs, { role: 'bot', text: 'Sorry, upload failed.' }]; }); } finally { setIsLoading(false); e.target.value = null; }
  };

  const formatText = (text) => text?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/\n/g, '<br/>') || '';

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
      
      {/* POPUP MODAL (For Candidates, Requests, Jobs) */}
      {popup.isOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white capitalize">{popup.type} Details</h3>
              <button onClick={() => setPopup({ isOpen: false })} className="text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4 text-sm text-gray-700 dark:text-gray-300">
              {Object.entries(popup.data).map(([key, value]) => {
                if (key === '_id') return null;
                return (
                  <div key={key} className="flex flex-col border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{key.replace(/_/g, ' ')}</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {Array.isArray(value) ? value.join(', ') : (value || 'N/A').toString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="w-full bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 transition-colors duration-300">
        <div className="w-full flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-2xl text-blue-600 dark:text-blue-400 shadow-inner"><Briefcase size={26} /></div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-gray-950 dark:text-white tracking-tighter">HR-Chatbot-for-Internal-Hiring-Support</h1>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">Digital HR Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-4">
            {currentRole === 'HR Admin' && (
              <button onClick={() => setViewMode(viewMode === 'chat' ? 'dashboard' : 'chat')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                {viewMode === 'chat' ? <><LayoutDashboard size={18}/> <span className="hidden md:inline">Dashboard</span></> : <><MessageSquare size={18}/> <span className="hidden md:inline">Chat Mode</span></>}
              </button>
            )}
            <button onClick={toggleDarkMode} className="p-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 transition-all">{darkMode ? <Sun size={20}/> : <Moon size={20}/>}</button>
            <div className="relative hidden md:block">
              <select value={currentRole} onChange={handleRoleChange} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-semibold rounded-xl block p-3 pr-10 outline-none border-2 border-transparent focus:border-blue-400 appearance-none">
                <option value="Candidate">👤 Candidate</option><option value="Hiring Manager">🟣 Hiring Manager</option><option value="HR Admin">🟢 HR Admin</option>
              </select>
              <MonitorDot size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD MODE */}
      {viewMode === 'dashboard' ? (
        <div className="flex-1 overflow-y-auto p-6 md:p-10 transition-colors duration-300">
          <div className="max-w-6xl mx-auto space-y-8">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">HR Admin Dashboard</h2>
            
            {dashboardData && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div onClick={() => {setCandidateFilter('all'); setActiveTab('candidates');}} className={`cursor-pointer transition-all bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border ${candidateFilter === 'all' && activeTab === 'candidates' ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-gray-100 dark:border-gray-700 hover:border-blue-300'} flex items-center gap-4`}><div className="p-4 bg-blue-100 text-blue-600 rounded-2xl"><Users size={28} /></div><div><p className="text-sm text-gray-500 font-medium">Candidates</p><h3 className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardData.stats.total}</h3></div></div>
                <div onClick={() => {setCandidateFilter('hired'); setActiveTab('candidates');}} className={`cursor-pointer transition-all bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border ${candidateFilter === 'hired' && activeTab === 'candidates' ? 'border-green-500 ring-4 ring-green-500/20' : 'border-gray-100 dark:border-gray-700 hover:border-green-300'} flex items-center gap-4`}><div className="p-4 bg-green-100 text-green-600 rounded-2xl"><CheckCircle size={28} /></div><div><p className="text-sm text-gray-500 font-medium">Hired</p><h3 className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardData.stats.hired}</h3></div></div>
                <div onClick={() => {setCandidateFilter('pending'); setActiveTab('candidates');}} className={`cursor-pointer transition-all bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border ${candidateFilter === 'pending' && activeTab === 'candidates' ? 'border-orange-500 ring-4 ring-orange-500/20' : 'border-gray-100 dark:border-gray-700 hover:border-orange-300'} flex items-center gap-4`}><div className="p-4 bg-orange-100 text-orange-600 rounded-2xl"><Clock size={28} /></div><div><p className="text-sm text-gray-500 font-medium">Pending Review</p><h3 className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardData.stats.pending}</h3></div></div>
                <div onClick={() => {setCandidateFilter('rejected'); setActiveTab('candidates');}} className={`cursor-pointer transition-all bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border ${candidateFilter === 'rejected' && activeTab === 'candidates' ? 'border-red-500 ring-4 ring-red-500/20' : 'border-gray-100 dark:border-gray-700 hover:border-red-300'} flex items-center gap-4`}><div className="p-4 bg-red-100 text-red-600 rounded-2xl"><XCircle size={28} /></div><div><p className="text-sm text-gray-500 font-medium">Rejected</p><h3 className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardData.stats.rejected}</h3></div></div>
              </div>
            )}

            {/* TAB NAVIGATION */}
            <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-800">
              <button onClick={() => setActiveTab('candidates')} className={`pb-3 px-4 font-bold text-sm transition-colors ${activeTab === 'candidates' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}>Candidates</button>
              <button onClick={() => setActiveTab('requests')} className={`pb-3 px-4 font-bold text-sm transition-colors ${activeTab === 'requests' ? 'border-b-2 border-purple-600 text-purple-600 dark:text-purple-400' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}>Hiring Requests</button>
              <button onClick={() => setActiveTab('jobs')} className={`pb-3 px-4 font-bold text-sm transition-colors ${activeTab === 'jobs' ? 'border-b-2 border-green-600 text-green-600 dark:text-green-400' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}>Active Jobs</button>
            </div>

            {/* TAB CONTENT */}
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl shadow-sm overflow-hidden">
              
              {activeTab === 'candidates' && (
                <div className="p-0 overflow-x-auto min-h-[400px]">
                  <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                    <thead className="bg-gray-50 dark:bg-gray-800/80 text-xs uppercase font-semibold text-gray-500">
                      <tr><th className="px-6 py-4">Name</th><th className="px-6 py-4">Role</th><th className="px-6 py-4">Status</th></tr>
                    </thead>
                    <tbody>
                      {filteredCandidates?.map(c => (
                        <tr key={c._id} onClick={() => setPopup({ isOpen: true, type: 'Candidate', data: c })} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{c.full_name}</td><td className="px-6 py-4">{c.preferred_role}</td>
                          <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-md text-xs font-bold ${c.screening_status?.includes('Shortlisted') || c.screening_status?.includes('Hired') ? 'bg-green-100 text-green-700' : c.screening_status?.includes('Reject') || c.screening_status?.includes('Not suitable') ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{c.screening_status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'requests' && (
                <div className="p-0 overflow-x-auto min-h-[400px]">
                  <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                    <thead className="bg-gray-50 dark:bg-gray-800/80 text-xs uppercase font-semibold text-gray-500">
                      <tr><th className="px-6 py-4">Department</th><th className="px-6 py-4">Role Required</th><th className="px-6 py-4 text-center">Positions</th><th className="px-6 py-4 text-right">Action</th></tr>
                    </thead>
                    <tbody>
                      {dashboardData?.hiring_requests.map(r => (
                        <tr key={r._id} onClick={() => setPopup({ isOpen: true, type: 'Hiring Request', data: r })} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{r.department}</td><td className="px-6 py-4">{r.role_required}</td><td className="px-6 py-4 font-bold text-center">{r.positions}</td>
                          <td className="px-6 py-4 text-right"><button onClick={(e) => handleApproveRequest(r._id, e)} className="bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 inline-flex"><Check size={14}/> Approve</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'jobs' && (
                <div className="p-0 overflow-x-auto min-h-[400px]">
                  <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                    <thead className="bg-gray-50 dark:bg-gray-800/80 text-xs uppercase font-semibold text-gray-500">
                      <tr><th className="px-6 py-4">Job Title</th><th className="px-6 py-4">Location</th><th className="px-6 py-4">Experience</th><th className="px-6 py-4 text-right">Action</th></tr>
                    </thead>
                    <tbody>
                      {dashboardData?.jobs.map(j => (
                        <tr key={j._id} onClick={() => setPopup({ isOpen: true, type: 'Job Opening', data: j })} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{j.title}</td><td className="px-6 py-4">{j.location}</td><td className="px-6 py-4">{j.experience_required}+ yrs</td>
                          <td className="px-6 py-4 text-right"><button onClick={(e) => handleDeleteJob(j._id, e)} className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg transition inline-flex"><Trash2 size={16}/></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

      ) : (
        /* CHAT MODE VIEW (Same as before, hidden to save space in instruction block) */
        <div className="flex-1 overflow-y-auto bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-300">
          <div className="max-w-5xl mx-auto p-6 space-y-8">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end`}>
                  <div className={`flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center shadow ${msg.role === 'user' ? 'bg-blue-600 ml-3' : 'bg-green-500 mr-3'}`}>
                    {msg.role === 'user' ? <User size={18} className="text-white" /> : <Bot size={18} className="text-white" />}
                  </div>
                  <div className={`p-4 rounded-3xl leading-relaxed text-sm md:text-base shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-800 rounded-bl-none'}`}>
                    <div dangerouslySetInnerHTML={{ __html: formatText(msg.text) }} />
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (<div className="flex justify-start"><div className="bg-white dark:bg-gray-900 text-gray-500 px-6 py-4 rounded-full rounded-bl-none text-sm font-medium border animate-pulse">Processing...</div></div>)}
            <div ref={endOfMessagesRef} />
          </div>
          
          <div className="w-full bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 transition-colors absolute bottom-0">
            <form onSubmit={sendMessage} className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Ask anything as ${currentRole}...`} className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-full px-6 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full disabled:opacity-50"><Send size={24} className="ml-1 mt-1 -mr-1 -mb-1" /></button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}