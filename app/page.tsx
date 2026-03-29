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
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [sessionNumber, setSessionNumber] = useState(1);
  const [vh, setVh] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    const setHeight = () => setVh(window.innerHeight);
    setHeight();
    window.addEventListener("resize", setHeight);
    return () => window.removeEventListener("resize", setHeight);
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let id = localStorage.getItem("grace-user");
    if (!id) {
      id = "user-" + Math.random().toString(36).slice(2);
      localStorage.setItem("grace-user", id);
    }

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
    }, 100);
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
    try {
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
      if (data.result) setMessages(["Grace: " + data.result]);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input;
    const updatedMessages = [...messages, "You: " + userMessage];
    setMessages(updatedMessages);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "24px";
    setLoading(true);
    try {
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
    } catch (e) {
      console.error(e);
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
    e.target.style.height = "24px";
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
  };

  const appHeight = vh > 0 ? `${vh}px` : "100vh";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-tap-highlight-color: transparent;
        }

        html, body {
          height: 100%;
          overflow: hidden;
          background: #e8ecf8;
          -webkit-font-smoothing: antialiased;
        }

        @media (prefers-color-scheme: dark) {
          html, body { background: #0e1020; }
        }

        :root {
          --bg: #e8ecf8;
          --grace-bubble: #ffffff;
          --grace-border: #d0d8f0;
          --user-bubble: #d8e0f5;
          --user-border: #b0c0e8;
          --text-primary: #14183a;
          --text-secondary: #484e80;
          --text-muted: #8890c0;
          --accent-blue: #4a5ca8;
          --accent-gold: #e0a838;
          --header-bg: #ffffff;
          --input-bg: #f8f9fe;
          --input-border: #c8d0ec;
          --label: #8088b8;
          --dot: #4a5ca8;
          --divider: #d4daf0;
          --online: #3ec878;
          --shadow: 0 1px 12px rgba(74, 92, 168, 0.10);
        }

        @media (prefers-color-scheme: dark) {
          :root {
            --bg: #0e1020;
            --grace-bubble: #181c34;
            --grace-border: #252d50;
            --user-bubble: #1c2240;
            --user-border: #2c3860;
            --text-primary: #e8ecff;
            --text-secondary: #8898d0;
            --text-muted: #585e90;
            --accent-blue: #7888d0;
            --accent-gold: #e8b84a;
            --header-bg: #080c1c;
            --input-bg: #141828;
            --input-border: #252d50;
            --label: #6068a0;
            --dot: #7888d0;
            --divider: #1a2040;
            --online: #3ec878;
            --shadow: 0 1px 12px rgba(0,0,0,0.3);
          }
        }

        .app {
          display: flex;
          flex-direction: column;
          background: var(--bg);
          color: var(--text-primary);
          font-family: 'DM Sans', sans-serif;
          overflow: hidden;
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
        }

        .header {
          flex-shrink: 0;
          background: var(--header-bg);
          border-bottom: 1px solid var(--divider);
          padding: 14px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: var(--shadow);
        }

        .avatar {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          background: linear-gradient(145deg, #6878c8 0%, #4a5ca8 55%, #3a4c98 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Fraunces', serif;
          font-size: 28px;
          font-weight: 700;
          color: #ffffff;
          flex-shrink: 0;
          letter-spacing: -0.02em;
          line-height: 1;
        }

        .header-text { flex: 1; }

        .header-name {
          font-family: 'Fraunces', serif;
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.15;
          letter-spacing: -0.02em;
        }

        .header-sub {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 300;
          margin-top: 2px;
          letter-spacing: 0.01em;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .online-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--online);
          flex-shrink: 0;
        }

        .online-label {
          font-size: 11px;
          color: var(--online);
          font-weight: 400;
        }

        .messages {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 20px 16px 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          -webkit-overflow-scrolling: touch;
        }

        .messages::-webkit-scrollbar { width: 3px; }
        .messages::-webkit-scrollbar-track { background: transparent; }
        .messages::-webkit-scrollbar-thumb { background: var(--divider); border-radius: 3px; }

        .msg-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-width: 100%;
        }

        .msg-label {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--label);
          padding: 0 6px;
        }

        .msg-label.right { text-align: right; }

        .bubble {
          font-size: 16px;
          line-height: 1.65;
          font-weight: 300;
          padding: 13px 17px;
          border-radius: 18px;
          word-break: break-word;
          max-width: 88%;
        }

        .bubble.grace {
          background: var(--grace-bubble);
          border: 1px solid var(--grace-border);
          border-bottom-left-radius: 4px;
          align-self: flex-start;
          color: var(--text-primary);
          box-shadow: var(--shadow);
        }

        .bubble.you {
          background: var(--user-bubble);
          border: 1px solid var(--user-border);
          border-bottom-right-radius: 4px;
          align-self: flex-end;
          color: var(--text-primary);
        }

        .bubble p { margin: 0 0 10px; }
        .bubble p:last-child { margin: 0; }
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
          box-shadow: var(--shadow);
        }

        .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--dot);
          opacity: 0.4;
          animation: bounce 1.4s ease-in-out infinite;
        }

        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes bounce {
          0%, 80%, 100% { opacity: 0.4; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-3px); }
        }

        .input-area {
          flex-shrink: 0;
          background: var(--header-bg);
          border-top: 1px solid var(--divider);
          padding: 12px 16px 24px;
        }

        .input-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          background: var(--input-bg);
          border: 1.5px solid var(--input-border);
          border-radius: 24px;
          padding: 10px 10px 10px 18px;
          transition: border-color 0.2s;
        }

        .input-row:focus-within {
          border-color: var(--accent-blue);
        }

        textarea {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          font-weight: 300;
          color: var(--text-primary);
          resize: none;
          height: 24px;
          max-height: 100px;
          line-height: 1.5;
          overflow-y: auto;
        }

        textarea::placeholder { color: var(--text-muted); }
        textarea::-webkit-scrollbar { display: none; }

        .send-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(145deg, #6878c8 0%, #4a5ca8 55%, #e0a838 100%);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.15s, opacity 0.15s;
        }

        .send-btn:disabled {
          opacity: 0.3;
          cursor: default;
        }

        .send-btn:not(:disabled):active {
          transform: scale(0.9);
        }

        .send-btn svg {
          width: 18px;
          height: 18px;
          fill: white;
          margin-left: 2px;
        }
      `}</style>

      <div className="app" style={{ height: appHeight }}>
        <div className="header">
          <div className="avatar">g</div>
          <div className="header-text">
            <div className="header-name">Grace</div>
            <div className="header-sub">your relationship companion</div>
          </div>
          <div className="header-right">
            <div className="online-dot" />
            <span className="online-label">here</span>
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
              <div key={i} className="msg-group">
                <div className={`msg-label${isUser ? " right" : ""}`}>
                  {isUser ? "You" : "Grace"}
                </div>
                <div className={`bubble ${isUser ? "you" : "grace"}`}>
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="msg-group">
              <div className="msg-label">Grace</div>
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
              <svg viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}