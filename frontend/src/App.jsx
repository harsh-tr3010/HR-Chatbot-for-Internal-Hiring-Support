import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Send, User, Bot, Briefcase, Users, FileText, Paperclip } from 'lucide-react';

export default function App() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hello! I am your HR Hiring Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  
  const endOfMessagesRef = useRef(null);
  const fileInputRef = useRef(null); 

  useEffect(() => {
    setSessionId(uuidv4());
  }, []);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const res = await axios.post(`${apiUrl}/chat`, {
        session_id: sessionId,
        message: userMessage
      });
      setMessages(prev => [...prev, { role: 'bot', text: res.data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', text: 'Server error. Please ensure the backend is running.' }]);
    } finally {
      setIsLoading(false);
    }
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

      const fileUrl = uploadRes.data.file_url;
      
      
      const chatRes = await axios.post(`${apiUrl}/chat`, {
        session_id: sessionId,
        message: fileUrl 
      });

      
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop(); 
        return [
            ...newMessages, 
            { role: 'user', text: `📎 Attached: ${file.name}` },
            { role: 'bot', text: chatRes.data.response }
        ];
      });
    } catch (error) {
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop(); 
        return [...newMessages, { role: 'bot', text: 'Sorry, the file upload failed. Please try providing a link instead.' }];
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
      // Replace **text** with bold styled tags
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>')
      // Replace *text* with italic styled tags
      .replace(/\*(.*?)\*/g, '<em class="text-gray-600 italic">$1</em>')
      // Replace line breaks with <br/>
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto shadow-2xl bg-white border border-gray-200 sm:rounded-xl sm:my-4 font-sans">
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-700 to-blue-500 text-white sm:rounded-t-xl">
        <div className="flex items-center space-x-3">
          <div className="bg-white p-2 rounded-full text-blue-600">
            <Briefcase size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold">HR Hiring Assistant</h1>
            <p className="text-xs text-blue-100">Candidate, Manager & Admin Portal</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-6 bg-[#f8fafc]">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center shadow-md ${msg.role === 'user' ? 'bg-blue-600 ml-3' : 'bg-green-500 mr-3'}`}>
                {msg.role === 'user' ? <User size={20} className="text-white" /> : <Bot size={20} className="text-white" />}
              </div>
              <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'}`}>
                <div dangerouslySetInnerHTML={{ __html: formatText(msg.text).map(el => el.props.children).join('') }} />
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-600 px-5 py-3 rounded-2xl rounded-tl-none animate-pulse text-sm font-medium">
              Processing...
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Action Chips */}
      <div className="px-4 py-3 bg-white border-t border-gray-100 space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide items-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-2 flex items-center gap-1"><User size={12}/> Candidate</span>
            {['View job openings', 'I want to apply for a job', 'What is the hiring process?'].map((btn) => (
            <button key={btn} onClick={() => handleQuickReply(btn)} className="whitespace-nowrap px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-full text-xs font-medium transition-colors">
                {btn}
            </button>
            ))}
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={sendMessage} className="p-4 bg-white border-t sm:rounded-b-xl flex items-center gap-3">
        
        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileUpload}
          accept=".pdf,.doc,.docx"
        />
        
        {/* Attachment Button */}
        <button 
          type="button" 
          onClick={() => fileInputRef.current.click()} 
          className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors flex-shrink-0"
          title="Upload Resume"
        >
          <Paperclip size={20} />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message here..."
          className="flex-1 bg-gray-50 border border-gray-300 text-gray-800 rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
        />
        <button id="submitBtn" type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full flex-shrink-0 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
          <Send size={22} className="ml-1 mt-1 -mr-1 -mb-1" />
        </button>
      </form>
    </div>
  );
}