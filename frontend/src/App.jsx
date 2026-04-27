import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Send, User, Bot, Briefcase } from 'lucide-react';

export default function App() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hello! I am your HR Hiring Assistant. You can ask me to view jobs, apply for a job, or raise a hiring request.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const endOfMessagesRef = useRef(null);

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
      const res = await axios.post('http://127.0.0.1:8000/chat', {
        session_id: sessionId,
        message: userMessage
      });
      setMessages(prev => [...prev, { role: 'bot', text: res.data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', text: 'Sorry, the server is currently unreachable.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatText = (text) => {
    return text.split('\n').map((str, idx) => (
      <span key={idx}>
        {str.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}
        <br/>
      </span>
    ));
  };

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto shadow-2xl bg-white border border-gray-200 sm:rounded-xl sm:my-4">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-blue-600 text-white sm:rounded-t-xl">
        <div className="flex items-center space-x-3">
          <Briefcase size={28} />
          <h1 className="text-xl font-bold">HR Hiring Assistant</h1>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-500 ml-3' : 'bg-green-500 mr-3'}`}>
                {msg.role === 'user' ? <User size={18} className="text-white" /> : <Bot size={18} className="text-white" />}
              </div>
              <div className={`p-3 rounded-lg shadow-sm text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'}`}>
                <div dangerouslySetInnerHTML={{ __html: formatText(msg.text).map(el => el.props.children).join('') }} />
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg rounded-tl-none animate-pulse">
              Typing...
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Quick Replies */}
      <div className="px-4 pb-2 bg-gray-50 flex gap-2 overflow-x-auto">
        {['View Jobs', 'Apply for a job', 'Raise hiring request'].map((btnText) => (
          <button 
            key={btnText}
            onClick={() => { setInput(btnText); setTimeout(() => document.getElementById('submitBtn').click(), 50); }}
            className="whitespace-nowrap px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-200 transition-colors"
          >
            {btnText}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} className="p-4 bg-white border-t sm:rounded-b-xl flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-gray-100 text-gray-800 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />
        <button id="submitBtn" type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full flex-shrink-0 transition-colors disabled:opacity-50">
          <Send size={20} className="ml-1 mt-1 -mr-1 -mb-1" />
        </button>
      </form>
    </div>
  );
}