"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

interface UserProfile {
  userPattern?: string;
  partnerPattern?: string;
  relationshipFacts?: string[];
  recurringThemes?: string[];
  growthSignals?: string[];
  lastSessionSummary?: string;
  assessmentComplete?: boolean;
  sessionCount?: number;
}

export default function Home() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userID, setUserID] = useState("user-temp");
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [sessionNumber, setSessionNumber] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let id = localStorage.getItem("grace-user");
    if (!id) {
      id = "user-" + Math.random().toString(36).slice(2);
      localStorage.getItem("grace-user");
      localStorage.setItem("grace-user", id);
    }
    setUserID(id);

    const savedProfile = localStorage.getItem("grace-profile");
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      setUserProfile(profile);
      setSessionNumber((profile.sessionCount || 0) + 1);
    }

    const saved = localStorage.getItem("grace-messages");
    if (saved) {
      setMessages(JSON.parse(saved));
    } else {
      startConversation();
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("grace-messages", JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (Object.keys(userProfile).length > 0) {
      localStorage.setItem("grace-profile", JSON.stringify(userProfile));
    }
  }, [userProfile]);

  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
    return () => clearTimeout(timer);
  }, [messages, loading]);

  const toApiMessages = (msgs: string[]) => {
    return msgs.map((msg) => {
      if (msg.startsWith("You: ")) {
        return { role: "user", content: msg.replace("You: ", "") };
      } else {
        return { role: "assistant", content: msg.replace("Grace: ", "") };
      }
    });
  };

  const startConversation = async () => {
    setLoading(true);
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "begin" }],
        userProfile: {},
        sessionNumber: 1,
      }),
    });
    const data = await response.json();
    if (data.result) {
      setMessages(["Grace: " + data.result]);
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input;
    const updatedMessages = [...messages, "You: " + userMessage];
    setMessages(updatedMessages);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "44px";
    setLoading(true);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: toApiMessages(updatedMessages),
        userProfile,
        sessionNumber,
      }),
    });

    const data = await response.json();
    if (data.result) {
      setMessages((prev) => [...prev, "Grace: " + data.result]);
    }
    if (data.profileUpdates) {
      setUserProfile((prev) => ({ ...prev, ...data.profileUpdates }));
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "44px";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #fdf6f0;
          --bg-secondary: #fff8f3;
          --surface: #ffffff;
          --grace-bubble: #ffffff;
          --grace-border: #f0e6dc;
          --user-bubble: #e8d5c4;
          --user-border: #d4b99e;
          --text-primary: #2d1f17;
          --text-secondary: #7a5c4a;
          --text-muted: #b08070;
          --accent: #c4785a;
          --accent-soft: #f5e6dc;
          --header-bg: rgba(253, 246, 240, 0.92);
          --input-bg: #fff8f3;
          --input-border: #e8d5c4;
          --dot-color: #c4785a;
          --label-grace: #9e6b52;
          --label-you: #7a5c4a;
          --scrollbar: #e8d5c4;
        }

        @media (prefers-color-scheme: dark) {
          :root {
            --bg: #1a1210;
            --bg-secondary: #201715;
            --surface: #261e1b;
            --grace-bubble: #2e2320;
            --grace-border: #3d2e28;
            --user-bubble: #3d2e28;
            --user-border: #5a4038;
            --text-primary: #f5ede8;
            --text-secondary: #c4a090;
            --text-muted: #8a6a5a;
            --accent: #d4886a;
            --accent-soft: #2e2320;
            --header-bg: rgba(26, 18, 16, 0.92);
            --input-bg: #261e1b;
            --input-border: #3d2e28;
            --dot-color: #d4886a;
            --label-grace: #c4a090;
            --label-you: #a08070;
            --scrollbar: #3d2e28;
          }
        }

        html, body {
          height: 100%;
          background: var(--bg);
          color: var(--text-primary);
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          -webkit-font-smoothing: antialiased;
          overscroll-behavior: none;
        }

        .app {
          display: flex;
          flex-direction: column;
          height: 100dvh;
          height: 100vh;
          max-width: 680px;
          margin: 0 auto;
          background: var(--bg);
          position: relative;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 10;
          background: var(--header-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 16px 20px 14px;
          border-bottom: 1px solid var(--grace-border);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #d4886a, #c4785a);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Lora', serif;
          font-size: 16px;
          color: white;
          font-weight: 500;
          flex-shrink: 0;
        }

        .header-info { flex: 1; }

        .header-name {
          font-family: 'Lora', serif;
          font-size: 17px;
          font-weight: 500;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }

        .header-subtitle {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 300;
          margin-top: 1px;
        }

        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          scroll-behavior: smooth;
        }

        .messages::-webkit-scrollbar { width: 4px; }
        .messages::-webkit-scrollbar-track { background: transparent; }
        .messages::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }

        .message-group { display: flex; flex-direction: column; gap: 4px; }

        .message-label {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 0 4px;
        }

        .message-label.grace { color: var(--label-grace); }
        .message-label.you { color: var(--label-you); text-align: right; }

        .bubble {
          padding: 12px 16px;
          border-radius: 18px;
          font-size: 15px;
          line-height: 1.6;
          font-family: 'DM Sans', sans-serif;
          font-weight: 300;
          max-width: 88%;
          word-wrap: break-word;
        }

        .bubble.grace {
          background: var(--grace-bubble);
          border: 1px solid var(--grace-border);
          border-bottom-left-radius: 4px;
          align-self: flex-start;
          color: var(--text-primary);
          box-shadow: 0 1px 8px rgba(0,0,0,0.04);
        }

        .bubble.you {
          background: var(--user-bubble);
          border: 1px solid var(--user-border);
          border-bottom-right-radius: 4px;
          align-self: flex-end;
          color: var(--text-primary);
        }

        .bubble p { margin: 0 0 8px; }
        .bubble p:last-child { margin-bottom: 0; }
        .bubble strong { font-weight: 500; }

        .typing {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 14px 18px;
          background: var(--grace-bubble);
          border: 1px solid var(--grace-border);
          border-radius: 18px;
          border-bottom-left-radius: 4px;
          align-self: flex-start;
          box-shadow: 0 1px 8px rgba(0,0,0,0.04);
        }

        .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--dot-color);
          opacity: 0.4;
          animation: pulse 1.4s ease-in-out infinite;
        }

        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.4; transform: scale(1); }
          40% { opacity: 1; transform: scale(1.2); }
        }

        .input-area {
          padding: 12px 16px 20px;
          background: var(--bg);
          border-top: 1px solid var(--grace-border);
        }

        .input-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          background: var(--input-bg);
          border: 1.5px solid var(--input-border);
          border-radius: 24px;
          padding: 8px 8px 8px 16px;
          transition: border-color 0.2s;
        }

        .input-row:focus-within {
          border-color: var(--accent);
        }

        textarea {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 300;
          color: var(--text-primary);
          resize: none;
          line-height: 1.5;
          height: 44px;
          max-height: 120px;
          padding: 8px 0;
          overflow-y: auto;
        }

        textarea::placeholder { color: var(--text-muted); }

        textarea::-webkit-scrollbar { display: none; }

        .send-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: var(--accent);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
          opacity: 1;
        }

        .send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .send-btn:not(:disabled):active {
          transform: scale(0.93);
        }

        .send-btn svg {
          width: 18px;
          height: 18px;
          fill: white;
          margin-left: 2px;
        }

        .safe-bottom { height: env(safe-area-inset-bottom, 0px); }
      `}</style>

      <div className="app">
        <div className="header">
          <div className="header-avatar">G</div>
          <div className="header-info">
            <div className="header-name">Grace</div>
            <div className="header-subtitle">relationship companion</div>
          </div>
        </div>

        <div className="messages">
          {messages.map((msg, i) => {
            const isUser = msg.startsWith("You:");
            const content = msg
              .replace("You: ", "")
              .replace("Grace: ", "")
              .replace(/^AI:\s*/i, "");

            return (
              <div key={i} className="message-group">
                <div className={`message-label ${isUser ? "you" : "grace"}`}>
                  {isUser ? "You" : "Grace"}
                </div>
                <div className={`bubble ${isUser ? "you" : "grace"}`}>
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="message-group">
              <div className="message-label grace">Grace</div>
              <div className="typing">
                <div className="dot" />
                <div className="dot" />
                <div className="dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          <div className="input-row">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Share what's on your mind..."
              disabled={loading}
              rows={1}
            />
            <button
              className="send-btn"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
            >
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="safe-bottom" />
      </div>
    </>
  );
}