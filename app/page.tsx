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
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400&display=swap');

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-tap-highlight-color: transparent;
        }

        html, body {
          height: 100%;
          overflow: hidden;
          background: #0d0e1a;
          -webkit-font-smoothing: antialiased;
        }

        :root {
          --bg-deep: #0d0e1a;
          --bg-mid: #12142a;
          --orb1: rgba(120, 80, 200, 0.18);
          --orb2: rgba(60, 120, 220, 0.14);
          --orb3: rgba(200, 100, 150, 0.10);
          --grace-bubble: rgba(255, 255, 255, 0.06);
          --grace-border: rgba(255, 255, 255, 0.12);
          --grace-text: rgba(240, 235, 255, 0.95);
          --user-bubble: rgba(100, 120, 220, 0.18);
          --user-border: rgba(120, 140, 240, 0.25);
          --user-text: rgba(220, 230, 255, 0.90);
          --text-primary: rgba(240, 235, 255, 0.95);
          --text-secondary: rgba(180, 170, 220, 0.80);
          --text-muted: rgba(140, 130, 180, 0.60);
          --accent: rgba(160, 120, 240, 0.90);
          --accent-glow: rgba(160, 120, 240, 0.30);
          --label-grace: rgba(160, 140, 220, 0.55);
          --label-you: rgba(120, 150, 220, 0.55);
          --divider: rgba(255, 255, 255, 0.07);
          --input-bg: rgba(255, 255, 255, 0.05);
          --input-border: rgba(255, 255, 255, 0.10);
          --input-focus: rgba(160, 120, 240, 0.40);
          --dot: rgba(200, 160, 255, 0.80);
        }

        .app {
          display: flex;
          flex-direction: column;
          background: var(--bg-deep);
          color: var(--text-primary);
          font-family: 'DM Sans', sans-serif;
          overflow: hidden;
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
        }

        .bg-orbs {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
        }

        .orb1 {
          width: 340px;
          height: 340px;
          top: -80px;
          right: -60px;
          background: radial-gradient(circle, rgba(120,80,200,0.22) 0%, transparent 70%);
          animation: drift1 18s ease-in-out infinite;
        }

        .orb2 {
          width: 280px;
          height: 280px;
          bottom: 20%;
          left: -80px;
          background: radial-gradient(circle, rgba(60,120,220,0.18) 0%, transparent 70%);
          animation: drift2 22s ease-in-out infinite;
        }

        .orb3 {
          width: 200px;
          height: 200px;
          bottom: 10%;
          right: 10%;
          background: radial-gradient(circle, rgba(200,100,150,0.14) 0%, transparent 70%);
          animation: drift3 16s ease-in-out infinite;
        }

        @keyframes drift1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-20px, 30px) scale(1.05); }
          66% { transform: translate(15px, -20px) scale(0.97); }
        }

        @keyframes drift2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40% { transform: translate(30px, -25px) scale(1.08); }
          70% { transform: translate(-10px, 20px) scale(0.95); }
        }

        @keyframes drift3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-25px, -30px) scale(1.1); }
        }

        .header {
          flex-shrink: 0;
          position: relative;
          z-index: 2;
          background: rgba(13, 14, 26, 0.80);
          border-bottom: 1px solid var(--divider);
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(160, 120, 240, 0.15);
          border: 1px solid rgba(160, 120, 240, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          font-weight: 600;
          color: rgba(200, 180, 255, 0.90);
          flex-shrink: 0;
        }

        .header-text { flex: 1; }

        .header-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 21px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.2;
          letter-spacing: 0.01em;
        }

        .header-sub {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 300;
          margin-top: 2px;
          letter-spacing: 0.03em;
        }

        .online-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: rgba(100, 220, 150, 0.90);
          box-shadow: 0 0 8px rgba(100, 220, 150, 0.50);
          flex-shrink: 0;
        }

        .messages {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 24px 16px 16px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          -webkit-overflow-scrolling: touch;
          position: relative;
          z-index: 1;
        }

        .messages::-webkit-scrollbar { width: 0; }

        .msg-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-width: 100%;
          animation: fadeUp 0.4s ease forwards;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .msg-label {
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          padding: 0 6px;
        }

        .msg-label.grace { color: var(--label-grace); }
        .msg-label.right {
          text-align: right;
          color: var(--label-you);
        }

        .bubble {
          font-size: 16px;
          line-height: 1.70;
          font-weight: 300;
          padding: 14px 18px;
          border-radius: 20px;
          word-break: break-word;
          max-width: 90%;
        }

        .bubble.grace {
          background: var(--grace-bubble);
          border: 1px solid var(--grace-border);
          border-bottom-left-radius: 4px;
          align-self: flex-start;
          color: var(--grace-text);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .bubble.you {
          background: var(--user-bubble);
          border: 1px solid var(--user-border);
          border-bottom-right-radius: 4px;
          align-self: flex-end;
          color: var(--user-text);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .bubble p { margin: 0 0 10px; }
        .bubble p:last-child { margin: 0; }
        .bubble strong { font-weight: 400; color: rgba(200, 180, 255, 0.95); }

        .typing {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 14px 18px;
          background: var(--grace-bubble);
          border: 1px solid var(--grace-border);
          border-radius: 20px;
          border-bottom-left-radius: 4px;
          align-self: flex-start;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--dot);
          opacity: 0.4;
          animation: bounce 1.6s ease-in-out infinite;
        }

        .dot:nth-child(2) { animation-delay: 0.25s; }
        .dot:nth-child(3) { animation-delay: 0.5s; }

        @keyframes bounce {
          0%, 80%, 100% { opacity: 0.4; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-4px); }
        }

        .input-area {
          flex-shrink: 0;
          position: relative;
          z-index: 2;
          background: rgba(13, 14, 26, 0.80);
          border-top: 1px solid var(--divider);
          padding: 12px 16px 28px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .input-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          border-radius: 24px;
          padding: 10px 10px 10px 18px;
          transition: border-color 0.3s;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }

        .input-row:focus-within {
          border-color: var(--input-focus);
          box-shadow: 0 0 20px rgba(160, 120, 240, 0.08);
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
          background: linear-gradient(145deg, #c090ff 0%, #8060d0 50%, #5040b0 100%);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.15s, opacity 0.15s;
          box-shadow: 0 0 16px rgba(160, 120, 240, 0.25);
        }

        .send-btn:disabled {
          opacity: 0.25;
          cursor: default;
          box-shadow: none;
        }

        .send-btn:not(:disabled):active {
          transform: scale(0.9);
        }

        .send-btn svg {
          width: 17px;
          height: 17px;
          fill: white;
          margin-left: 2px;
        }
      `}</style>

      <div className="app" style={{ height: appHeight }}>
        <div className="bg-orbs">
          <div className="orb orb1" />
          <div className="orb orb2" />
          <div className="orb orb3" />
        </div>

        <div className="header">
          <div className="avatar">G</div>
          <div className="header-text">
            <div className="header-name">Grace</div>
            <div className="header-sub">your relationship companion</div>
          </div>
          <div className="online-dot" />
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
                <div className={`msg-label${isUser ? " right" : " grace"}`}>
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
              <div className="msg-label grace">Grace</div>
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
