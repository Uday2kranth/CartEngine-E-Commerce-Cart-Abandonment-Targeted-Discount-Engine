import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Settings, Send, Trash2, Key } from 'lucide-react';
import { API_URL } from '../config';

const ChatDrawer = ({ serverKeys = {} }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);

  // Settings state (hydrated from localStorage)
  const [provider, setProvider] = useState(() => localStorage.getItem('chat_provider') || 'gemini');
  const [model, setModel] = useState(() => localStorage.getItem('chat_model') || 'gemini-1.5-flash');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('chat_api_key') || '');
  const hasServerKey = serverKeys[provider] || false;

  const messagesEndRef = useRef(null);

  // Load greeting on mount
  useEffect(() => {
    fetch(`${API_URL}/api/chat/greeting`)
      .then((res) => res.json())
      .then((data) => {
        if (data.greeting) {
          setMessages([{ role: 'model', content: data.greeting }]);
        }
      })
      .catch((err) => console.error('Error fetching greeting:', err));
  }, []);

  // Save settings when they change
  useEffect(() => {
    localStorage.setItem('chat_provider', provider);
    localStorage.setItem('chat_model', model);
    localStorage.setItem('chat_api_key', apiKey);
  }, [provider, model, apiKey]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Clean Markdown Parser
  const parseMarkdown = (text) => {
    if (!text) return '';
    let html = text;

    // Handle Tables
    const tableRegex = /\|(.+)\|/g;
    const lines = html.split('\n');
    let inTable = false;
    let tableHtml = '';
    
    const parsedLines = lines.map((line) => {
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        // Skip separator line |---|---|
        if (line.includes('---') || line.includes('-:-')) {
          return '';
        }
        
        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        const tag = !inTable ? 'th' : 'td';
        let rowHtml = '<tr>' + cells.map(c => `<${tag}>${c}</${tag}>`).join('') + '</tr>';
        
        if (!inTable) {
          inTable = true;
          tableHtml = '<div class="table-container"><table><thead>' + rowHtml + '</thead><tbody>';
          return '';
        } else {
          tableHtml += rowHtml;
          return '';
        }
      } else {
        if (inTable) {
          inTable = false;
          const closedTable = tableHtml + '</tbody></table></div>';
          tableHtml = '';
          return closedTable + '\n' + parseLineMarkdown(line);
        }
        return parseLineMarkdown(line);
      }
    });

    return parsedLines.join('\n');
  };

  const parseLineMarkdown = (line) => {
    let l = line;
    
    // Headers
    if (l.startsWith('### ')) {
      l = `<h3>${l.substring(4)}</h3>`;
    } else if (l.startsWith('#### ')) {
      l = `<h4>${l.substring(5)}</h4>`;
    } else if (l.startsWith('## ')) {
      l = `<h2>${l.substring(3)}</h2>`;
    }
    
    // Bold
    l = l.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Inline code
    l = l.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Unordered lists
    if (l.trim().startsWith('- ') || l.trim().startsWith('* ')) {
      l = `<li>${l.trim().substring(2)}</li>`;
    }
    
    return l;
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMsg = message;
    setMessage('');
    
    // Add user message to state
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setIsThinking(true);

    const sessionId = localStorage.getItem('chat_session_id') || 'session_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('chat_session_id', sessionId);

    let activeInputs = null;
    let activeResult = null;
    try {
      const storedInputs = localStorage.getItem('active_simulator_inputs');
      const storedResult = localStorage.getItem('active_simulator_result');
      if (storedInputs) activeInputs = JSON.parse(storedInputs);
      if (storedResult) activeResult = JSON.parse(storedResult);
    } catch (e) {
      console.error('Error parsing simulator state from localStorage:', e);
    }

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          session_id: sessionId,
          chat_provider: provider,
          chat_model: model,
          chat_api_key: apiKey || "dummy",
          active_inputs: activeInputs,
          active_result: activeResult
        })
      });

      const data = await response.json();
      setIsThinking(false);

      if (response.ok) {
        setMessages((prev) => [...prev, { role: 'model', content: data.response }]);
      } else {
        setMessages((prev) => [
          ...prev, 
          { role: 'model', content: `⚠️ **Error:** ${data.detail || 'Could not fetch response.'}` }
        ]);
      }
    } catch (err) {
      setIsThinking(false);
      setMessages((prev) => [
        ...prev,
        { role: 'model', content: '⚠️ **Connection Error:** Failed to reach backend API.' }
      ]);
    }
  };

  const handleClearHistory = async () => {
    const sessionId = localStorage.getItem('chat_session_id');
    if (!sessionId) return;
    
    try {
      await fetch(`${API_URL}/api/chat/${sessionId}`, { method: 'DELETE' });
      setMessages([{ role: 'model', content: 'Chat history cleared. How can I help you today?' }]);
    } catch (err) {
      console.error('Error clearing chat:', err);
    }
  };

  return (
    <>
      {/* Floating Action Trigger Button */}
      <button 
        className={`chat-fab ${isOpen ? 'active' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
        title="Open AI Copilot"
      >
        <Sparkles size={22} className="fab-icon" />
      </button>

      {/* Slide-In Drawer Backdrop */}
      {isOpen && <div className="chat-backdrop" onClick={() => setIsOpen(false)} />}

      {/* Chat Drawer container */}
      <aside className={`chat-drawer ${isOpen ? 'open' : ''}`}>
        <div className="chat-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="header-icon" size={18} />
            <h4>AI Copilot Assistant</h4>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              className={`header-btn ${showSettings ? 'active' : ''}`}
              onClick={() => setShowSettings(!showSettings)}
              title="Assistant Settings"
            >
              <Settings size={18} />
            </button>
            <button 
              className="header-btn" 
              onClick={handleClearHistory}
              title="Clear History"
            >
              <Trash2 size={18} />
            </button>
            <button 
              className="header-btn close-btn" 
              onClick={() => setIsOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings ? (
          <div className="settings-panel flex flex-col gap-4">
            <h5>LLM CONFIGURATION</h5>
            
            <div className="flex flex-col gap-1">
              <label>Provider</label>
              <select value={provider} onChange={(e) => {
                const val = e.target.value;
                setProvider(val);
                if (val === 'gemini') setModel('gemini-1.5-flash');
                else if (val === 'openrouter') setModel('openrouter/owl-alpha');
                else if (val === 'nvidia') setModel('nvidia/nemotron-3-ultra-550b-a55b:free');
              }}>
                <option value="gemini">Google Gemini</option>
                <option value="openrouter">OpenRouter (Free)</option>
                <option value="nvidia">NVIDIA NIM</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label>Model</label>
              <select value={model} onChange={(e) => setModel(e.target.value)}>
                {provider === 'gemini' && (
                  <>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    <option value="gemini-2.0-flash-001">Gemini 2.0 Flash (Stable)</option>
                    <option value="gemini-1.5-flash-002">Gemini 1.5 Flash (Stable)</option>
                    <option value="gemini-1.5-pro-002">Gemini 1.5 Pro (Stable)</option>
                  </>
                )}
                {provider === 'openrouter' && (
                  <>
                    <option value="openrouter/owl-alpha">Owl Alpha</option>
                    <option value="nvidia/nemotron-3-ultra-550b-a55b:free">NVIDIA: Nemotron 3 Ultra (free)</option>
                    <option value="google/gemma-4-31b-it:free">Google: Gemma 4 31B (free)</option>
                    <option value="poolside/laguna-m.1:free">Poolside: Laguna M.1 (free)</option>
                    <option value="nvidia/nemotron-3-super-120b-a12b:free">NVIDIA: Nemotron 3 Super (free) (agentic)</option>
                    <option value="openai/gpt-oss-120b:free">OpenAI: gpt-oss-120b (free)</option>
                    <option value="poolside/laguna-xs.2:free">Poolside: Laguna XS.2 (free)</option>
                    <option value="cohere/north-mini-code:free">Cohere: North Mini Code (free)</option>
                    <option value="openrouter/free">randome free model roulette (agentic)</option>
                    <option value="cognitivecomputations/dolphin-mistral-24b-venice-edition:free">Venice: Uncensored (free) (agentic)</option>
                    <option value="openai/gpt-oss-20b:free">OpenAI: gpt-oss-20b (free)</option>
                    <option value="nvidia/nemotron-3-nano-30b-a3b:free">NVIDIA: Nemotron 3 Nano 30B A3B (free)</option>
                    <option value="google/gemma-4-26b-a4b-it:free">Google: Gemma 4 26B A4B (free)</option>
                    <option value="nvidia/nemotron-nano-9b-v2:free">NVIDIA: Nemotron Nano 9B V2 (free)</option>
                    <option value="nousresearch/hermes-3-llama-3.1-405b:free">Nous Research: Hermes 3 Llama 3.1 405B (free) (agentic)</option>
                    <option value="qwen/qwen3-coder:free">Qwen: Qwen3 Coder 480B A35B (free) (agentic)</option>
                    <option value="meta-llama/llama-3.3-70b-instruct:free">Meta: Llama 3.3 70B Instruct (free) (agentic)</option>
                  </>
                )}
                {provider === 'nvidia' && (
                  <>
                    <option value="nvidia/nemotron-3-ultra-550b-a55b:free">NVIDIA: Nemotron 3 Ultra (free)</option>
                    <option value="nvidia/nemotron-3-super-120b-a12b:free">NVIDIA: Nemotron 3 Super (free) (agentic)</option>
                    <option value="nvidia/nemotron-3-nano-30b-a3b:free">NVIDIA: Nemotron 3 Nano 30B A3B (free)</option>
                    <option value="nvidia/nemotron-nano-9b-v2:free">NVIDIA: Nemotron Nano 9B V2 (free)</option>
                  </>
                )}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1" style={{ color: hasServerKey ? '#10b981' : 'inherit' }}>
                <Key size={12} /> API Key {hasServerKey ? <span style={{ fontSize: '10px', opacity: 0.9 }}>✓ Server Key Active</span> : <span style={{ fontSize: '10px', opacity: 0.6 }}>(Optional if set on server)</span>}
              </label>
              <input 
                type="password" 
                placeholder={hasServerKey ? "Using server default key" : "Enter custom API Key..."} 
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)} 
                style={{
                  borderColor: apiKey.trim() ? 'rgba(16, 185, 129, 0.3)' : (hasServerKey ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.2)')
                }}
              />
              <span className="api-hint">API keys are stored securely in your browser's local cache.</span>
            </div>
            
            <button className="btn-primary" onClick={() => setShowSettings(false)}>
              Save & Back to Chat
            </button>
          </div>
        ) : (
          /* Chat Feed Panel */
          <div className="chat-container">
            <div className="chat-log">
              {messages.map((msg, i) => (
                <div key={i} className={`chat-bubble ${msg.role}`}>
                  <div 
                    className="bubble-content"
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
                  />
                </div>
              ))}
              {isThinking && (
                <div className="chat-bubble model thinking">
                  <div className="thinking-dots flex items-center">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input form */}
            <form onSubmit={handleSend} className="chat-input-wrapper flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask about cart abandonment features..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button type="submit" className="send-btn flex items-center justify-center">
                <Send size={16} />
              </button>
            </form>
          </div>
        )}
      </aside>

      <style>{`
        /* Floating Action Trigger */
        .chat-fab {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, var(--secondary), var(--primary));
          box-shadow: 0 4px 20px rgba(189, 0, 255, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          z-index: 999;
          transition: var(--transition);
          animation: pulseGlow 3s infinite ease-in-out;
        }

        .chat-fab:hover {
          transform: scale(1.08) rotate(15deg);
          box-shadow: 0 4px 25px rgba(0, 242, 254, 0.6);
        }

        /* Scrim backdrop */
        .chat-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 900;
        }

        /* Slide drawer container */
        .chat-drawer {
          position: fixed;
          top: 0;
          right: 0;
          width: 440px;
          height: 100vh;
          background: rgba(8, 12, 25, 0.95);
          backdrop-filter: blur(20px);
          border-left: 1px solid var(--border-color);
          box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
          z-index: 950;
          display: flex;
          flex-direction: column;
          transform: translateX(100%);
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .chat-drawer.open {
          transform: translateX(0);
        }

        @media (max-width: 480px) {
          .chat-drawer {
            width: 100%;
          }
        }

        .chat-header {
          padding: 1.2rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }

        .header-icon {
          color: var(--primary);
        }

        .header-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition);
        }

        .header-btn:hover, .header-btn.active {
          color: var(--primary);
          background: rgba(0, 242, 254, 0.05);
        }

        .close-btn:hover {
          color: var(--danger) !important;
          background: rgba(239, 68, 68, 0.05) !important;
        }

        /* Settings View */
        .settings-panel {
          padding: 2rem 1.5rem;
          height: 100%;
          overflow-y: auto;
        }

        .settings-panel h5 {
          font-size: 0.8rem;
          color: var(--text-secondary);
          letter-spacing: 1px;
          margin-bottom: 0.5rem;
        }

        .settings-panel label {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .settings-panel select, .settings-panel input {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-primary);
        }

        .settings-panel select option {
          background-color: #080c19;
          color: var(--text-primary);
        }

        .api-hint {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.25rem;
        }

        /* Chat Log */
        .chat-container {
          display: flex;
          flex-direction: column;
          height: calc(100vh - var(--header-height));
          overflow: hidden;
        }

        .chat-log {
          flex-grow: 1;
          padding: 1.5rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }

        .chat-bubble {
          display: flex;
          max-width: 85%;
          border-radius: 12px;
          padding: 0.8rem 1.1rem;
          line-height: 1.45;
          font-size: 0.92rem;
        }

        .chat-bubble.user {
          align-self: flex-end;
          background: linear-gradient(135deg, var(--secondary-glow), rgba(189, 0, 255, 0.05));
          border: 1px solid rgba(189, 0, 255, 0.2);
          color: #f3f4f6;
          border-bottom-right-radius: 2px;
        }

        .chat-bubble.model {
          align-self: flex-start;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          color: #e5e7eb;
          border-bottom-left-radius: 2px;
        }

        .chat-bubble.thinking {
          background: transparent;
          border: none;
          padding: 0.5rem;
        }

        .bubble-content h3 {
          font-size: 1.05rem;
          font-weight: 600;
          color: var(--primary);
          margin: 0.8rem 0 0.4rem 0;
        }

        .bubble-content h4 {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--primary-hover);
          margin: 0.6rem 0 0.3rem 0;
        }

        .bubble-content p {
          margin-bottom: 0.6rem;
        }
        
        .bubble-content li {
          margin-left: 1.2rem;
          margin-bottom: 0.3rem;
        }

        .bubble-content code {
          background: rgba(255, 255, 255, 0.08);
          padding: 0.15rem 0.3rem;
          border-radius: 4px;
          font-size: 0.85rem;
          font-family: monospace;
          color: #ff9cf0;
        }

        /* Tables style in chat */
        .table-container {
          width: 100%;
          overflow-x: auto;
          margin: 0.8rem 0;
          border-radius: 8px;
          border: 1px solid var(--border-color);
        }

        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.8rem;
        }

        th {
          background: rgba(255, 255, 255, 0.05);
          color: var(--primary);
          font-weight: 600;
          padding: 0.5rem 0.75rem;
          border-bottom: 1px solid var(--border-color);
        }

        td {
          padding: 0.5rem 0.75rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.02);
        }

        /* Input area */
        .chat-input-wrapper {
          padding: 1.2rem 1.5rem;
          border-top: 1px solid var(--border-color);
          background: rgba(8, 12, 25, 0.98);
        }

        .chat-input-wrapper input {
          flex-grow: 1;
          border-radius: 20px;
          padding: 0.7rem 1.2rem;
        }

        .send-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: var(--primary);
          color: #02050b;
          transition: var(--transition);
        }

        .send-btn:hover {
          background: var(--primary-hover);
          transform: scale(1.05);
        }
      `}</style>
    </>
  );
};

export default ChatDrawer;
