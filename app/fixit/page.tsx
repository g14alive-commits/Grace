"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getOrCreateUser } from "../../lib/db";
import ReactMarkdown from "react-markdown";

export default function Fixit() {
  const [receivedMessage, setReceivedMessage] = useState("");
  const [message, setMessage] = useState("");
  const [receiverPattern, setReceiverPattern] = useState<"A" | "B" | "C">("C");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [vh, setVh] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [senderPattern, setSenderPattern] = useState<string>("");
  const router = useRouter();
  const resultRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const setHeight = () => setVh(window.innerHeight);
    setHeight();
    window.addEventListener("resize", setHeight);
    return () => window.removeEventListener("resize", setHeight);
  }, []);

  useEffect(() => {
    const prev = parseInt(localStorage.getItem("fixit_visit_count") || "0", 10);
    localStorage.setItem("fixit_visit_count", String(prev + 1));
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const user = data.session.user;
      setUserId(user.id);
      const dbUser = await getOrCreateUser(user.id, user.email || "");
      if (dbUser?.user_pattern) {
        setSenderPattern(dbUser.user_pattern);
      }
    });
  }, []);

  // Scroll to result after it renders and loading is done
  useEffect(() => {
    if (!result || loading) return;
    const timer = setTimeout(() => {
      const el = document.querySelector(".scroll-area") as HTMLElement;
      const card = resultRef.current;
      if (el && card) {
      el.scrollTop = card.offsetTop - 20;
    }
    }, 100);
    return () => clearTimeout(timer);
  }, [result, loading]);

  const handleScan = async () => {
    if (!message.trim() || loading) return;
    setLoading(true);
    setResult("");
    try {
      const response = await fetch("/api/fixit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, receivedMessage, receiverPattern, senderPattern }),
      });
      const data = await response.json();
      if (data.result) {
        setResult(data.result);
      }
      if (userId) {
        const { data: userData } = await supabase
          .from("users")
          .select("fixit_count")
          .eq("id", userId)
          .single();
        await supabase
          .from("users")
          .update({ fixit_count: (userData?.fixit_count || 0) + 1 })
          .eq("id", userId);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text.replace(/^[""]|[""]$/g, "").trim()).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const extractSuggestions = (text: string) => {
  const suggestions: { label: string; content: string }[] = [];
  const lines = text.split("\n");
  let current: { label: string; content: string } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isOption = line.match(/\*{0,2}Option\s+\d+\s*[—–\-]\s*(\w+)\*{0,2}/i);
    if (isOption) {
      if (current) suggestions.push(current);
      const cleanLabel = line.replace(/\*\*/g, "").trim();
      current = { label: cleanLabel, content: "" };
    } else if (current) {
      if (line.match(/\*{0,2}Advice/i)) {
        suggestions.push(current);
        current = null;
        break;
      }
      const cleaned = line.replace(/\*\*/g, "").trim();
      if (cleaned) current.content += (current.content ? " " : "") + cleaned;
    }
  }
  if (current && current.content) suggestions.push(current);
  return suggestions.filter(s => s.content.length > 0);
};

  const suggestions = result ? extractSuggestions(result) : [];
  const isReplyMode = receivedMessage.trim().length > 0;
  const appHeight = vh > 0 ? `${vh}px` : "100vh";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');

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
          --bg: #0d0e1a;
          --surface: rgba(255,255,255,0.05);
          --border: rgba(255,255,255,0.10);
          --border-focus: rgba(150,100,255,0.65);
          --border-received: rgba(80,200,180,0.30);
          --border-send: rgba(80,200,120,0.40);
          --text-primary: rgba(240,235,255,0.95);
          --text-secondary: rgba(180,170,220,0.75);
          --text-muted: rgba(140,130,180,0.55);
          --accent: rgba(160,120,240,0.90);
          --accent-soft: rgba(160,120,240,0.15);
          --teal: rgba(80,200,180,0.85);
          --teal-soft: rgba(80,200,180,0.10);
          --green: rgba(80,200,120,0.90);
          --divider: rgba(255,255,255,0.07);
          --header-bg: rgba(13,14,26,0.85);
          --tab-bg: rgba(13,14,26,0.90);
        }

        .page {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: var(--bg);
          color: var(--text-primary);
          font-family: 'DM Sans', sans-serif;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .bg-orbs {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none;
          z-index: 0;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
        }

        .orb1 {
          width: 392px; height: 392px;
          bottom: -80px; right: -60px;
          background: radial-gradient(circle, rgba(150,80,220,0.09) 0%, transparent 70%);
          animation: drift1 20s ease-in-out infinite;
        }

        .orb2 {
          width: 308px; height: 308px;
          bottom: 20%; left: -80px;
          background: radial-gradient(circle, rgba(80,100,240,0.08) 0%, transparent 70%);
          animation: drift2 25s ease-in-out infinite;
        }

        .orb3 {
          width: 224px; height: 224px;
          top: 60%; right: 15%;
          background: radial-gradient(circle, rgba(200,80,160,0.06) 0%, transparent 70%);
          animation: drift3 18s ease-in-out infinite;
        }

        @keyframes drift1 {
          0%, 100% { transform: translate(0,0); }
          50% { transform: translate(20px,30px); }
        }

        @keyframes drift2 {
          0%, 100% { transform: translate(0,0); }
          50% { transform: translate(-20px,-25px); }
        }

        @keyframes drift3 {
          0%, 100% { transform: translate(0,0); }
          50% { transform: translate(14px,-18px); }
        }

        .header {
          flex-shrink: 0;
          position: relative;
          z-index: 2;
          background: var(--header-bg);
          border-bottom: 1px solid var(--divider);
          padding: 8px 16px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .header-left {}

        .header-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px;
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1.2;
          position: relative;
          display: inline-flex;
          align-items: flex-start;
        }

        .info-btn {
          width: 12px; height: 12px;
          border-radius: 50%;
          background: rgba(80,200,140,0.12);
          border: 1px solid rgba(80,200,140,0.35);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: rgba(80,220,150,0.90);
          font-family: 'Georgia', serif;
          font-size: 8px;
          font-weight: 400;
          font-style: italic;
          vertical-align: super;
          margin-left: 3px;
          position: relative;
          top: -6px;
          transition: all 0.2s;
          line-height: 1;
        }

        .info-btn:active { background: rgba(255,255,255,0.14); }

        .header-sub {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 300;
          margin-top: 2px;
        }

        .reply-badge {
          font-size: 11px;
          font-weight: 400;
          letter-spacing: 0.04em;
          color: var(--teal);
          background: var(--teal-soft);
          border: 1px solid rgba(80,200,180,0.20);
          border-radius: 20px;
          padding: 4px 12px;
          transition: opacity 0.3s;
        }

        .reply-badge.hidden { opacity: 0; pointer-events: none; }

        .scroll-area {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          position: relative;
          z-index: 1;
          padding: 12px 16px 12px;
          -webkit-overflow-scrolling: touch;
        }

        .scroll-area::-webkit-scrollbar { width: 0; }

        .section-label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 10px;
        }

        .receiver-row {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
        }

        .receiver-btn {
          flex: 1;
          padding: 10px 6px;
          border-radius: 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 300;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
          line-height: 1.3;
        }

        .receiver-btn.active {
  background: rgba(150,100,255,0.20);
  border-color: rgba(150,100,255,0.55);
  color: rgba(220,200,255,1.0);
}

        .receiver-btn:active { transform: scale(0.97); }

        .message-box {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 16px;
  padding: 14px 16px;
  margin-bottom: 10px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

        .message-box.send:focus-within {
          border-color: rgba(80,200,120,0.45);
          box-shadow: 0 0 12px rgba(80,200,120,0.06);
        }

        .box-label { color: var(--text-muted); }
        .box-label.send { color: rgba(80,200,120,0.65); }

        textarea {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 300;
          color: var(--text-primary);
          resize: none;
          line-height: 1.6;
          overflow-y: auto;
        }

        textarea::placeholder { color: var(--text-muted); }
        textarea::-webkit-scrollbar { display: none; }

        .connector {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 4px;
          margin-bottom: 10px;
        }

        .connector-line {
  flex: 1;
  height: 1px;
  background: rgba(150,100,255,0.30);
}

        .connector-label {
          font-size: 10px;
          color: var(--text-muted);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .scan-btn {
          width: 100%;
          padding: 12px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(150,100,255,0.35) 0%, rgba(110,60,220,0.28) 100%);
          border: 1px solid rgba(150,100,255,0.45);
          color: rgba(210,190,255,0.95);
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 400;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.02em;
          margin-top: 14px;
          margin-bottom: 24px;
        }

        .scan-btn:disabled { opacity: 0.35; cursor: default; }
        .scan-btn:not(:disabled):active { transform: scale(0.98); }

        .loading-text {
          text-align: center;
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 300;
          padding: 20px 0;
          font-style: italic;
        }

        .result-card {
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.16);
  border-radius: 18px;
  padding: 20px;
  margin-bottom: 20px;
}

        .result-card .prose {
          font-size: 15px;
          font-weight: 300;
          line-height: 1.70;
          color: var(--text-secondary);
        }

        .result-card .prose strong {
          font-weight: 500;
          color: var(--text-primary);
          display: block;
          margin-top: 16px;
          margin-bottom: 6px;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .result-card .prose strong:first-child { margin-top: 0; }
        .result-card .prose p { margin: 0 0 8px; }
        .result-card .prose p:last-child { margin: 0; }

        .suggestions-section {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .suggestion-card {
  background: rgba(150,100,255,0.08);
  border: 1px solid rgba(150,100,255,0.25);
  border-radius: 14px;
  padding: 14px 16px;
}

        .suggestion-label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .suggestion-text {
          font-size: 15px;
          font-weight: 300;
          line-height: 1.60;
          color: var(--text-primary);
          margin-bottom: 12px;
        }

        .copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  background: rgba(80,200,180,0.15);
  border: 1px solid rgba(80,200,180,0.40);
  color: rgba(80,220,180,0.95);
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 400;
          cursor: pointer;
          transition: all 0.2s;
        }

        .copy-btn.copied {
          background: rgba(80,200,120,0.12);
          border-color: rgba(80,200,120,0.25);
          color: var(--green);
        }

        .copy-btn:active { transform: scale(0.96); }

        .advice-block {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--divider);
        }

        .advice-text {
  font-size: 15px;
  font-weight: 300;
  line-height: 1.65;
  color: rgba(200,185,255,0.90);
  font-style: italic;
}

        .tab-bar {
          flex-shrink: 0;
          position: relative;
          z-index: 3;
          background: var(--tab-bg);
          border-top: 1px solid var(--divider);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          display: flex;
          padding: 2px 0 4px;
        }

        .tab {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          cursor: pointer;
          padding: 4px 0;
        }

        .tab-icon {
          width: 20px; height: 20px;
          opacity: 0.40;
          transition: opacity 0.2s;
        }

        .tab.active .tab-icon { opacity: 1; }

        .tab-label {
          font-size: 9px;
          font-weight: 400;
          letter-spacing: 0.04em;
          color: rgba(140,130,180,0.50);
          transition: color 0.2s;
        }

        .tab.active .tab-label { color: rgba(200,180,255,0.90); }

        .overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(10,10,20,0.88);
          z-index: 10;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .overlay-sheet {
          background: #16142a;
          border-top: 1px solid rgba(255,255,255,0.10);
          border-radius: 24px 24px 0 0;
          padding: 28px 24px 40px;
          max-height: 85vh;
          overflow-y: auto;
          animation: slideUp 0.25s ease;
        }

        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .overlay-sheet::-webkit-scrollbar { width: 0; }

        .overlay-handle {
          width: 36px; height: 4px;
          border-radius: 2px;
          background: rgba(255,255,255,0.15);
          margin: 0 auto 24px;
        }

        .overlay-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          font-weight: 500;
          color: rgba(240,235,255,0.95);
          margin-bottom: 20px;
        }

        .overlay-section { margin-bottom: 22px; }

        .overlay-section-title {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: rgba(160,140,220,0.55);
          margin-bottom: 8px;
        }

        .overlay-text {
          font-size: 15px;
          font-weight: 300;
          line-height: 1.70;
          color: rgba(180,170,220,0.75);
        }

        .overlay-item {
          display: flex;
          gap: 12px;
          margin-bottom: 10px;
          align-items: flex-start;
        }

        .overlay-item-label {
          font-size: 12px;
          font-weight: 500;
          color: rgba(200,180,255,0.80);
          background: rgba(160,120,240,0.12);
          border: 1px solid rgba(160,120,240,0.20);
          border-radius: 6px;
          padding: 2px 8px;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .overlay-item-text {
          font-size: 14px;
          font-weight: 300;
          line-height: 1.60;
          color: rgba(180,170,220,0.70);
        }

        .overlay-close {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          background: rgba(160,120,240,0.12);
          border: 1px solid rgba(160,120,240,0.25);
          color: rgba(210,190,255,0.90);
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 400;
          cursor: pointer;
          margin-top: 8px;
          transition: all 0.2s;
        }

        .overlay-close:active { transform: scale(0.98); }

        @media (max-width: 480px) {
          .receiver-btn { font-size: 11px; padding: 9px 6px; }
          .scan-btn { font-size: 14px; padding: 14px; }
        }
      `}</style>

      <div className="page" style={{ height: appHeight }}>
        <div className="bg-orbs">
          <div className="orb orb1" />
          <div className="orb orb2" />
          <div className="orb orb3" />
        </div>

        <div className="header">
          <div className="header-left">
<div className="header-name">
  <svg width="160" height="32" viewBox="0 0 160 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Message envelope - left half */}
    <path d="M4 8 L4 24 L28 24 L28 8 Z" stroke="rgba(180,140,255,0.75)" strokeWidth="1.5" fill="rgba(150,100,255,0.08)" strokeLinejoin="round"/>
    <path d="M4 8 L16 17 L28 8" stroke="rgba(180,140,255,0.75)" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
    {/* Crack/split line through message */}
    <path d="M16 6 L13 13 L17 16 L14 26" stroke="rgba(255,180,80,0.90)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Axe head */}
    <path d="M19 2 L26 6 L22 12 L17 10 Z" fill="rgba(200,160,255,0.85)" stroke="rgba(180,140,255,0.9)" strokeWidth="0.75" strokeLinejoin="round"/>
    {/* Axe blade edge */}
    <path d="M22 12 L26 6" stroke="rgba(255,255,255,0.5)" strokeWidth="0.75" strokeLinecap="round"/>
    {/* Axe handle */}
    <path d="M19 2 L11 18" stroke="rgba(180,140,200,0.60)" strokeWidth="1.5" strokeLinecap="round"/>
    {/* Title text */}
    <text x="34" y="20" fontFamily="Cormorant Garamond, serif" fontSize="16" fontWeight="400" fill="rgba(240,235,255,0.95)">
      Fix the <tspan fill="rgba(170,120,255,1.0)" fontWeight="600">MESS</tspan>age!
    </text>
  </svg>
  <button className="info-btn" onClick={() => setShowInfo(true)}>i</button>
</div>
            <div className="header-sub">Fix your message before you send it</div>
          </div>
          <div className={`reply-badge${isReplyMode ? "" : " hidden"}`}>
            reply mode
          </div>
        </div>

        {showInfo && (
          <div className="overlay" onClick={() => setShowInfo(false)}>
            <div className="overlay-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="overlay-handle" />
              <div className="overlay-title">How FixtheMESSage! works</div>
              <div className="overlay-section">
                <div className="overlay-section-title">What it does</div>
                <div className="overlay-text">
                  Paste what you're about to send. FixtheMESSage! reads the tone, tells you the risk level, and gives you cleaner versions that say the same thing without the damage.
                </div>
              </div>
              <div className="overlay-section">
                <div className="overlay-section-title">Who are you sending to?</div>
                <div className="overlay-item">
                  <span className="overlay-item-label">pulls away</span>
                  <span className="overlay-item-text">Someone who tends to go quiet or need space when things get hard.</span>
                </div>
                <div className="overlay-item">
                  <span className="overlay-item-label">reaches hard</span>
                  <span className="overlay-item-text">Someone who tends to follow up, get anxious, or push for connection when uncertain.</span>
                </div>
                <div className="overlay-item">
                  <span className="overlay-item-label">🤷 not sure</span>
                  <span className="overlay-item-text">Not sure — FixtheMESSage! gives you a middle-ground version.</span>
                </div>
              </div>
              <div className="overlay-section">
                <div className="overlay-section-title">The received message box</div>
                <div className="overlay-text">
                  Optional. Paste what they sent you and FixtheMESSage! switches to reply mode — it reads what they actually said and helps you reply to their actual need.
                </div>
              </div>
              <button className="overlay-close" onClick={() => setShowInfo(false)}>
                Got it
              </button>
            </div>
          </div>
        )}

        <div className="scroll-area">
          <div className="section-label">Who are you sending this to?</div>
          <div className="receiver-row">
            <button
              className={`receiver-btn${receiverPattern === "A" ? " active" : ""}`}
              onClick={() => setReceiverPattern("A")}
            >
              someone who pulls away
            </button>
            <button
              className={`receiver-btn${receiverPattern === "B" ? " active" : ""}`}
              onClick={() => setReceiverPattern("B")}
            >
              someone who reaches hard
            </button>
            <button
              className={`receiver-btn${receiverPattern === "C" ? " active" : ""}`}
              onClick={() => setReceiverPattern("C")}
            >
              🤷 not sure
            </button>
          </div>

          <div className="message-box received">
            <div className="box-label">Message you received (optional)</div>
            <textarea
  value={receivedMessage}
  onChange={(e) => {
    setReceivedMessage(e.target.value);
    e.target.style.height = "24px";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  }}
  onFocus={(e) => {
    if (!receivedMessage) e.target.style.height = "44px";
  }}
  onBlur={(e) => {
    if (!receivedMessage) e.target.style.height = "20px";
  }}
  placeholder="Paste what they sent you..."
  rows={1}
  style={{ height: receivedMessage ? "auto" : "20px", minHeight: "20px", maxHeight: "120px" }}
/>
          </div>

          <div className="connector">
            <div className="connector-line" />
            <div className="connector-label">your reply</div>
            <div className="connector-line" />
          </div>

          <div className="message-box send">
            <div className="box-label send">Message you want to send</div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Paste the message you're about to send..."
              rows={4}
              style={{ minHeight: "80px", maxHeight: "160px" }}
            />
          </div>

          <button
            className="scan-btn"
            onClick={handleScan}
            disabled={loading || !message.trim()}
          >
            {loading ? "Fixing..." : isReplyMode ? "Fix reply" : "Fix it"}
          </button>

          {loading && (
            <div className="loading-text">Reading the mess...</div>
          )}

          {result && !loading && (
            <div className="result-card" ref={resultRef}>
              <div className="prose">
                <ReactMarkdown>
                  {result.split("**Suggestions**")[0].split("Option 1")[0]}
                </ReactMarkdown>
              </div>

              {suggestions.length > 0 && (
                <div className="suggestions-section">
                  <div className="section-label" style={{ marginBottom: 0 }}>
                    {isReplyMode ? "Reply options" : "Better versions"}
                  </div>
                  {suggestions.map((s, i) => (
                    <div key={i} className="suggestion-card">
                      <div className="suggestion-label">{s.label}</div>
                      <div className="suggestion-text">{s.content}</div>
                      <button
                        className={`copy-btn${copied === `s-${i}` ? " copied" : ""}`}
                        onClick={() => handleCopy(s.content, `s-${i}`)}
                      >
                        {copied === `s-${i}` ? (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M20 6L9 17l-5-5"/>
                            </svg>
                            Copied
                          </>
                        ) : (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                            </svg>
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {result.includes("**Advice") && (
                <div className="advice-block">
                  <div className="section-label">Advice</div>
                  <div className="advice-text">
                    {result.split("**Advice**")[1]?.replace(/\n/g, " ").trim()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="tab-bar">
          <div className="tab" onClick={() => router.push("/chat")}>
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="rgba(200,180,255,0.90)" strokeWidth="1.5">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <span className="tab-label">Grace</span>
          </div>
          <div className="tab active">
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
              {/* Message bubble left half */}
              <path d="M2 5a2 2 0 012-2h7v2H4v10l3-2h4v-3" stroke="rgba(200,180,255,0.90)" strokeWidth="1.4"/>
              {/* Message bubble right half (cracked) */}
              <path d="M13 13h3l3 2V8a2 2 0 00-2-2h-5" stroke="rgba(200,180,255,0.90)" strokeWidth="1.4"/>
              {/* Crack/split line */}
              <path d="M11 3l-1 4 2 1-2 5" stroke="rgba(200,180,255,0.90)" strokeWidth="1.2" strokeDasharray="1.5 0.8"/>
              {/* Axe handle */}
              <line x1="17" y1="11" x2="21.5" y2="15.5" stroke="rgba(200,180,255,0.90)" strokeWidth="1.5"/>
              {/* Axe head */}
              <path d="M19 9.5 Q22 9 21.5 12 L19 11 Z" fill="rgba(200,180,255,0.70)" stroke="rgba(200,180,255,0.90)" strokeWidth="1"/>
            </svg>
            <span className="tab-label">Fix It!</span>
          </div>
          <div className="tab" onClick={() => router.push("/profile")}>
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="rgba(200,180,255,0.90)" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <span className="tab-label">Profile</span>
          </div>
        </div>
      </div>
    </>
  );
}