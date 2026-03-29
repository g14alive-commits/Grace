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

  // Fix viewport height for mobile browsers
  useEffect(() => {
    const setHeight = () => {
      setVh(window.innerHeight);
    };
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
    if (inputRef.current) {
      inputRef.current.style.height = "24px";
    }
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
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-tap-highlight-color: transparent;
        }

        html, body {
          height: 100%;
          overflow: hidden;
          background: #fdf6f0;
          -webkit-font-smoothing: antialiased;
        }

        @media (prefers-color-scheme: dark) {
          html, body { background: #1a1210; }
        }

:root {
  --bg: #f0f2fa;
  --grace-bubble: #ffffff;
  --grace-border: #d0d8f0;
  --user-bubble: #e8e4f8;
  --user-border: #c8c0e8;
  --text-primary: #1a1e3a;
  --text-secondary: #5a6080;
  --text-muted: #9098c0;
  --accent: #5a6aaa;
  --header-bg: #f0f2fa;
  --input-bg: #f8f8ff;
  --input-border: #d0d8f0;
  --label: #7a80b0;
  --dot: #f5c06a;
  --divider: #d8dcf0;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #12141f;
    --grace-bubble: #1e2035;
    --grace-border: #2e3258;
    --user-bubble: #252840;
    --user-border: #383c60;
    --text-primary: #e8eaf8;
    --text-secondary: #9098c8;
    --text-muted: #606888;
    --accent: #8090cc;
    --header-bg: #12141f;
    --input-bg: #1a1c30;
    --input-border: #2e3258;
    --label: #8088b8;
    --dot: #f5c06a;
    --divider: #252840;
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
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        }

        .header {
          flex-shrink: 0;
          background: var(--header-bg);
          border-bottom: 1px solid var(--divider);
          padding: 14px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, #d4886a 0%, #b86040 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Lora', serif;
          font-size: 18px;
          color: white;
          font-weight: 500;
          flex-shrink: 0;
        }

        .header-text { flex: 1; }

        .header-name {
          font-family: 'Lora', serif;
          font-size: 19px;
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .header-sub {
          font-size: 13px;
          color: var(--text-muted);
          font-weight: 300;
          margin-top: 2px;
        }

        .messages {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 20px 16px 16px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          -webkit-overflow-scrolling: touch;
        }

        .msg-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
          max-width: 100%;
        }

        .msg-label {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.06em;
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
          border-radius: 20px;
          word-break: break-word;
          max-width: 90%;
        }

        .bubble.grace {
          background: var(--grace-bubble);
          border: 1px solid var(--grace-border);
          border-bottom-left-radius: 5px;
          align-self: flex-start;
          color: var(--text-primary);
        }

        .bubble.you {
          background: var(--user-bubble);
          border: 1px solid var(--user-border);
          border-bottom-right-radius: 5px;
          align-self: flex-end;
          color: var(--text-primary);
        }

        .bubble p { margin: 0 0 10px; }
        .bubble p:last-child { margin: 0; }
        .bubble strong { font-weight: 500; }

        .typing {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 15px 20px;
          background: var(--grace-bubble);
          border: 1px solid var(--grace-border);
          border-radius: 20px;
          border-bottom-left-radius: 5px;
          align-self: flex-start;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--dot);
          opacity: 0.35;
          animation: bounce 1.4s ease-in-out infinite;
        }

        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes bounce {
          0%, 80%, 100% { opacity: 0.35; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-4px); }
        }

        .input-area {
          flex-shrink: 0;
          background: var(--bg);
          border-top: 1px solid var(--divider);
          padding: 12px 16px 24px;
        }

        .input-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          background: var(--input-bg);
          border: 1.5px solid var(--input-border);
          border-radius: 26px;
          padding: 10px 10px 10px 18px;
          transition: border-color 0.2s;
        }

        .input-row:focus-within {
          border-color: var(--accent);
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

        .send-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: var(--accent);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.15s, opacity 0.15s;
        }

        .send-btn:disabled {
          opacity: 0.35;
          cursor: default;
        }

        .send-btn:not(:disabled):active {
          transform: scale(0.9);
        }

        .send-btn svg {
          width: 20px;
          height: 20px;
          fill: white;
          margin-left: 2px;
        }
      `}</style>

      <div className="app" style={{ height: appHeight }}>
        <div className="header">
          <div className="avatar">G</div>
          <div className="header-text">
            <div className="header-name">Grace</div>
            <div className="header-sub">relationship companion</div>
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
