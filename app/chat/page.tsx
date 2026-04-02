"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { supabase } from "../../lib/supabase";
import {
  getOrCreateUser,
  updateUserProfile,
  profileFromDb,
  getActiveSession,
  createSession,
  updateSessionMessages,
  closeSession,
  buildSessionMemoryBlock,
} from "../../lib/db";

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

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export default function Chat() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [sessionNumber, setSessionNumber] = useState(1);
  const [vh, setVh] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [activeMessageCount, setActiveMessageCount] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);
  const [dbUser, setDbUser] = useState<any>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [showEndSession, setShowEndSession] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const initialized = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const setHeight = () => setVh(window.innerHeight);
    setHeight();
    window.addEventListener("resize", setHeight);
    return () => window.removeEventListener("resize", setHeight);
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace("/login");
        return;
      }

      const user = data.session.user;
      setUserId(user.id);

      const dbUserData = await getOrCreateUser(user.id, user.email || "");
      setDbUser(dbUserData);
      const profile = profileFromDb(dbUserData);
      setUserProfile(profile);

      loadPastSessions(user.id);

      const activeSession = await getActiveSession(user.id);

      if (activeSession) {
        setSessionId(activeSession.id);
        setSessionNumber(activeSession.session_number);
        setSessionStartTime(new Date(activeSession.started_at).getTime());
        setActiveMessageCount(activeSession.user_message_count || 0);

        const saved = localStorage.getItem(`grace-session-${activeSession.id}`);
        if (saved) {
          setMessages(JSON.parse(saved));
        } else {
          startConversation(profile, dbUserData, activeSession.session_number, false);
        }
      } else {
        const newSessionNumber = (dbUserData?.session_count || 0) + 1;
        setSessionNumber(newSessionNumber);
        const newSession = await createSession(user.id, newSessionNumber);
        if (newSession) {
          setSessionId(newSession.id);
          setSessionStartTime(Date.now());
        }
        startConversation(profile, dbUserData, newSessionNumber, true);
      }

      setAuthLoading(false);
    });
  }, []);

  const loadPastSessions = async (uId: string) => {
  const { data } = await supabase
    .from("sessions")
    .select("id, session_number, summary, themes, action_taken, growth_signals, key_words, started_at, is_complete, user_message_count")
    .eq("user_id", uId)
    .gte("user_message_count", 5)
    .order("started_at", { ascending: false });
  if (data) setPastSessions(data);
};

  useEffect(() => {
    if (!sessionId || messages.length === 0) return;
    localStorage.setItem(`grace-session-${sessionId}`, JSON.stringify(messages));
  }, [messages, sessionId]);

  useEffect(() => {
    if (!userId || Object.keys(userProfile).length === 0) return;
    updateUserProfile(userId, userProfile);
  }, [userProfile, userId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, loading]);

  useEffect(() => {
    if (messages.length === 0) return;
    const keepAlive = setInterval(async () => {
      if (document.hidden || loading) return;
      try {
        await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: "__ping__" }],
            userProfile,
            sessionNumber,
          }),
        });
      } catch (e) {}
    }, 4 * 60 * 1000);
    return () => clearInterval(keepAlive);
  }, [messages.length, loading, userProfile, sessionNumber]);

  const checkSessionTime = (msgCount: number) => {
    if (!sessionStartTime) return false;
    const elapsed = Date.now() - sessionStartTime;
    return elapsed >= TWO_HOURS_MS && msgCount > 10;
  };

  const toApiMessages = (msgs: string[]) => {
    return msgs.map((msg) => {
      if (msg.startsWith("You: ")) {
        return { role: "user", content: msg.replace("You: ", "") };
      } else {
        return { role: "assistant", content: msg.replace("Grace: ", "") };
      }
    });
  };

  const startConversation = async (
    profile: UserProfile,
    dbUserData: any,
    sessNum: number,
    isNewSession: boolean
  ) => {
    setLoading(true);
    try {
      const sessionMemory = isNewSession ? buildSessionMemoryBlock(dbUserData) : "";
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "begin" }],
          userProfile: profile,
          sessionNumber: sessNum,
          sessionMemory,
          isNewSession,
        }),
      });
      const data = await response.json();
      if (data.result) setMessages(["Grace: " + data.result]);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSessionClose = async (msgs: string[], uId: string, sId: string) => {
  console.log("handleSessionClose called", { sId, uId, msgCount: msgs.length });
  try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: msgs,
          userName: dbUser?.name || "",
        }),
      });
      const data = await response.json();

      if (data.closing_message) {
        setMessages((prev) => [
          ...prev,
          `__SESSION_END__`,
          `Grace: ${data.closing_message}`,
        ]);
      }

      await closeSession(
        sId, uId,
        data.summary || "",
        data.themes || [],
        data.key_words || [],
        data.action_taken || "",
        data.growth_signals || []
      );

      localStorage.removeItem(`grace-session-${sId}`);
      setSessionId(null);
      setActiveMessageCount(0);
      if (uId) loadPastSessions(uId);
    } catch (e) {
      console.error("Session close failed:", e);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input;
    const updatedMessages = [...messages, "You: " + userMessage];
    setMessages(updatedMessages);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "24px";
    setLoading(true);

    const newCount = activeMessageCount + 1;
    setActiveMessageCount(newCount);

    if (sessionId) {
      await updateSessionMessages(sessionId, newCount, updatedMessages.length);
    }

    const twoHourReached = checkSessionTime(newCount);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: toApiMessages(updatedMessages),
          userProfile,
          sessionNumber,
          twoHourWarning: twoHourReached,
          userId,
        }),
      });
      const data = await response.json();

      if (data.result) {
        const newMessages = [...updatedMessages, "Grace: " + data.result];
        setMessages(newMessages);

        if (data.sessionComplete && sessionId && userId) {
          await handleSessionClose(newMessages, userId, sessionId);
        }
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
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) return;
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

  const downloadPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    doc.setFontSize(20);
    doc.setTextColor(60, 40, 120);
    doc.text("Grace", margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(140, 120, 180);
    doc.text("your relationship companion", margin, y);
    y += 6;

    doc.setFontSize(9);
    doc.setTextColor(160, 150, 180);
    doc.text(new Date().toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric"
    }), margin, y);
    y += 10;

    doc.setDrawColor(200, 180, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    messages.forEach((msg) => {
      const isUser = msg.startsWith("You:");
      const content = msg
        .replace("You: ", "")
        .replace("Grace: ", "")
        .replace(/^AI:\s*/i, "");
      const sender = isUser ? "You" : "Grace";

      doc.setFontSize(8);
      doc.setTextColor(isUser ? 100 : 140, isUser ? 120 : 100, isUser ? 200 : 180);
      doc.text(sender.toUpperCase(), margin, y);
      y += 5;

      doc.setFontSize(11);
      doc.setTextColor(30, 20, 50);
      const lines = doc.splitTextToSize(content, maxWidth);
      lines.forEach((line: string) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += 6;
      });
      y += 6;
    });

    doc.setFontSize(8);
    doc.setTextColor(180, 170, 200);
    doc.text("Generated by Grace · attuneai.vercel.app", margin, 287);
    doc.save(`grace-chat-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const appHeight = vh > 0 ? `${vh}px` : "100vh";

  if (authLoading) {
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "#0d0e1a",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "DM Sans, sans-serif",
        color: "rgba(200,180,255,0.60)",
        fontSize: "14px", fontWeight: 300,
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="app" style={{ height: appHeight }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        html, body { height: 100%; overflow: hidden; background: #0d0e1a; -webkit-font-smoothing: antialiased; }

        :root {
          --bg-deep: #0d0e1a;
          --grace-bubble: rgba(255,255,255,0.06);
          --grace-border: rgba(255,255,255,0.12);
          --grace-text: rgba(240,235,255,0.95);
          --user-bubble: rgba(100,120,220,0.18);
          --user-border: rgba(120,140,240,0.25);
          --user-text: rgba(220,230,255,0.90);
          --text-primary: rgba(240,235,255,0.95);
          --text-muted: rgba(140,130,180,0.60);
          --label-grace: rgba(160,140,220,0.55);
          --label-you: rgba(120,150,220,0.55);
          --divider: rgba(255,255,255,0.07);
          --input-bg: rgba(255,255,255,0.05);
          --input-border: rgba(255,255,255,0.10);
          --input-focus: rgba(160,120,240,0.40);
          --dot: rgba(200,160,255,0.80);
        }

        .app {
          display: flex; flex-direction: column;
          background: var(--bg-deep); color: var(--text-primary);
          font-family: 'DM Sans', sans-serif;
          overflow: hidden; position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
        }

        .bg-orbs { position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .orb { position: absolute; border-radius: 50%; filter: blur(60px); }
        .orb1 { width: 340px; height: 340px; top: -80px; right: -60px; background: radial-gradient(circle, rgba(120,80,200,0.22) 0%, transparent 70%); animation: drift1 18s ease-in-out infinite; }
        .orb2 { width: 280px; height: 280px; bottom: 20%; left: -80px; background: radial-gradient(circle, rgba(60,120,220,0.18) 0%, transparent 70%); animation: drift2 22s ease-in-out infinite; }
        .orb3 { width: 200px; height: 200px; bottom: 10%; right: 10%; background: radial-gradient(circle, rgba(200,100,150,0.14) 0%, transparent 70%); animation: drift3 16s ease-in-out infinite; }

        @keyframes drift1 { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(-20px,30px) scale(1.05); } 66% { transform: translate(15px,-20px) scale(0.97); } }
        @keyframes drift2 { 0%,100% { transform: translate(0,0) scale(1); } 40% { transform: translate(30px,-25px) scale(1.08); } 70% { transform: translate(-10px,20px) scale(0.95); } }
        @keyframes drift3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-25px,-30px) scale(1.1); } }

        .header {
          flex-shrink: 0; position: relative; z-index: 2;
          background: rgba(13,14,26,0.80); border-bottom: 1px solid var(--divider);
          padding: 14px 20px; display: flex; align-items: center; gap: 14px;
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
        }

        .avatar {
          width: 44px; height: 44px; border-radius: 50%;
          background: rgba(160,120,240,0.15); border: 1px solid rgba(160,120,240,0.35);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 600;
          color: rgba(200,180,255,0.90); flex-shrink: 0;
        }

        .header-text { flex: 1; }
        .header-name { font-family: 'Cormorant Garamond', serif; font-size: 21px; font-weight: 600; color: var(--text-primary); line-height: 1.2; letter-spacing: 0.01em; }
        .header-sub { font-size: 12px; color: var(--text-muted); font-weight: 300; margin-top: 2px; letter-spacing: 0.03em; }

        .download-btn {
          width: 32px; height: 32px; border-radius: 50%;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; color: rgba(200,180,255,0.70); transition: all 0.2s; margin-right: 4px;
        }
        .download-btn:disabled { opacity: 0.25; cursor: default; }
        .download-btn:not(:disabled):active { transform: scale(0.9); }

        .online-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(100,220,150,0.90); box-shadow: 0 0 8px rgba(100,220,150,0.50); flex-shrink: 0; }

        .hamburger-bar {
          flex-shrink: 0; position: relative; z-index: 2;
          padding: 6px 16px;
          background: rgba(13,14,26,0.60);
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }

        .hamburger-btn {
          background: none; border: none; cursor: pointer; padding: 4px;
          display: flex; flex-direction: column; gap: 4px; opacity: 0.40;
          transition: opacity 0.2s;
        }
        .hamburger-btn:active { opacity: 0.70; }
        .hamburger-line { height: 1.5px; background: rgba(200,180,255,0.90); border-radius: 2px; }

        .messages {
          flex: 1; overflow-y: auto; overflow-x: hidden;
          padding: 20px 16px 16px; display: flex; flex-direction: column; gap: 20px;
          -webkit-overflow-scrolling: touch; position: relative; z-index: 1;
        }
        .messages::-webkit-scrollbar { width: 0; }

        .msg-group { display: flex; flex-direction: column; gap: 6px; max-width: 100%; animation: fadeUp 0.4s ease forwards; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        .msg-label { font-size: 10px; font-weight: 400; letter-spacing: 0.10em; text-transform: uppercase; padding: 0 6px; }
        .msg-label.grace { color: var(--label-grace); }
        .msg-label.right { text-align: right; color: var(--label-you); }

        .bubble { font-size: 16px; line-height: 1.70; font-weight: 300; padding: 14px 18px; border-radius: 20px; word-break: break-word; max-width: 90%; }
        .bubble.grace { background: var(--grace-bubble); border: 1px solid var(--grace-border); border-bottom-left-radius: 4px; align-self: flex-start; color: var(--grace-text); backdrop-filter: blur(12px); }
        .bubble.you { background: var(--user-bubble); border: 1px solid var(--user-border); border-bottom-right-radius: 4px; align-self: flex-end; color: var(--user-text); backdrop-filter: blur(12px); }
        .bubble p { margin: 0 0 10px; }
        .bubble p:last-child { margin: 0; }
        .bubble strong { font-weight: 400; color: rgba(200,180,255,0.95); }

        .typing { display: flex; align-items: center; gap: 5px; padding: 14px 18px; background: var(--grace-bubble); border: 1px solid var(--grace-border); border-radius: 20px; border-bottom-left-radius: 4px; align-self: flex-start; backdrop-filter: blur(12px); }
        .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--dot); opacity: 0.4; animation: bounce 1.6s ease-in-out infinite; }
        .dot:nth-child(2) { animation-delay: 0.25s; }
        .dot:nth-child(3) { animation-delay: 0.5s; }
        @keyframes bounce { 0%,80%,100% { opacity: 0.4; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-4px); } }

        .input-area {
          flex-shrink: 0; position: relative; z-index: 2;
          background: rgba(13,14,26,0.80); border-top: 1px solid var(--divider);
          padding: 12px 16px; backdrop-filter: blur(20px);
        }

        .input-row {
          display: flex; align-items: flex-end; gap: 10px;
          background: var(--input-bg); border: 1px solid var(--input-border);
          border-radius: 24px; padding: 10px 10px 10px 18px; transition: border-color 0.3s;
        }
        .input-row:focus-within { border-color: var(--input-focus); box-shadow: 0 0 20px rgba(160,120,240,0.08); }

        textarea { flex: 1; border: none; outline: none; background: transparent; font-family: 'DM Sans', sans-serif; font-size: 16px; font-weight: 300; color: var(--text-primary); resize: none; height: 24px; max-height: 100px; line-height: 1.5; overflow-y: auto; }
        textarea::placeholder { color: var(--text-muted); }
        textarea::-webkit-scrollbar { display: none; }

        .send-btn { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(145deg, #c090ff 0%, #8060d0 50%, #5040b0 100%); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: transform 0.15s, opacity 0.15s; box-shadow: 0 0 16px rgba(160,120,240,0.25); }
        .send-btn:disabled { opacity: 0.25; cursor: default; box-shadow: none; }
        .send-btn:not(:disabled):active { transform: scale(0.9); }
        .send-btn svg { width: 17px; height: 17px; fill: white; margin-left: 2px; }

        .tab-bar { flex-shrink: 0; position: relative; z-index: 3; background: rgba(13,14,26,0.92); border-top: 1px solid rgba(255,255,255,0.07); backdrop-filter: blur(20px); display: flex; padding: 4px 0 6px; }
        .tab { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; padding: 4px 0; }
        .tab-icon { width: 20px; height: 20px; opacity: 0.40; transition: opacity 0.2s; }
        .tab.active .tab-icon { opacity: 1; }
        .tab-label { font-size: 9px; font-weight: 400; letter-spacing: 0.04em; color: rgba(140,130,180,0.50); transition: color 0.2s; }
        .tab.active .tab-label { color: rgba(200,180,255,0.90); }

        .drawer-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(8,8,18,0.70); z-index: 10; backdrop-filter: blur(4px); animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .drawer { position: fixed; top: 0; left: 0; bottom: 0; width: 82%; max-width: 340px; background: #0f0e1f; border-right: 1px solid rgba(255,255,255,0.08); z-index: 11; display: flex; flex-direction: column; animation: slideIn 0.25s ease; }
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }

        .drawer-header { padding: 52px 20px 16px; border-bottom: 1px solid rgba(255,255,255,0.07); display: flex; align-items: center; justify-content: space-between; }
        .drawer-title { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 400; color: rgba(240,235,255,0.90); }
        .drawer-close { background: none; border: none; color: rgba(160,140,220,0.55); font-size: 20px; cursor: pointer; padding: 4px; }

        .drawer-scroll { flex: 1; overflow-y: auto; padding: 12px 0; }
        .drawer-scroll::-webkit-scrollbar { width: 0; }

        .session-item { padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; transition: background 0.2s; }
        .session-item:active { background: rgba(255,255,255,0.03); }
        .session-item-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
        .session-number { font-size: 10px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(160,140,220,0.45); }
        .session-date { font-size: 11px; font-weight: 300; color: rgba(140,130,180,0.45); }
        .session-headline { font-family: 'Cormorant Garamond', serif; font-size: 17px; font-weight: 400; font-style: italic; color: rgba(220,210,255,0.85); line-height: 1.3; margin-bottom: 4px; }
        .session-expand-arrow { font-size: 10px; color: rgba(160,140,220,0.35); margin-top: 2px; }

        .session-detail { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.06); }
        .session-detail-section { margin-bottom: 10px; }
        .session-detail-label { font-size: 9px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(160,140,220,0.40); margin-bottom: 4px; }
        .session-detail-text { font-size: 13px; font-weight: 300; line-height: 1.55; color: rgba(180,170,220,0.65); }

        .drawer-empty { padding: 40px 20px; text-align: center; font-size: 14px; font-weight: 300; color: rgba(140,130,180,0.45); font-style: italic; line-height: 1.6; }
      `}</style>

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
        <button
          className="download-btn"
          onClick={downloadPDF}
          title="Download conversation"
          disabled={messages.length === 0}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17"/>
          </svg>
        </button>
        <div className="online-dot" />
      </div>

      {pastSessions.length > 0 && (
        <div className="hamburger-bar">
          <button
            className="hamburger-btn"
            onClick={() => setShowDrawer(true)}
          >
            <div className="hamburger-line" style={{ width: "18px" }} />
            <div className="hamburger-line" style={{ width: "14px" }} />
            <div className="hamburger-line" style={{ width: "18px" }} />
          </button>
        </div>
      )}

      {showDrawer && (
        <>
          <div className="drawer-overlay" onClick={() => setShowDrawer(false)} />
          <div className="drawer">
            <div className="drawer-header">
              <div className="drawer-title">Your sessions</div>
              <button className="drawer-close" onClick={() => setShowDrawer(false)}>×</button>
            </div>
            <div className="drawer-scroll">
              {pastSessions.length === 0 ? (
                <div className="drawer-empty">
                  Your session summaries will appear here after you complete a session with Grace.
                </div>
              ) : (
                pastSessions.map((s) => {
                  const isExpanded = expandedSession === s.id;
                  const date = new Date(s.started_at).toLocaleDateString("en-GB", {
                    day: "numeric", month: "short"
                  });
                  return (
                    <div
                      key={s.id}
                      className="session-item"
                      onClick={() => setExpandedSession(isExpanded ? null : s.id)}
                    >
                      <div className="session-item-header">
                        <span className="session-number">Session {s.session_number}</span>
                        <span className="session-date">{date}</span>
                      </div>
                      <div className="session-headline">
  {s.action_taken || (s.is_complete ? "Session summary" : "Incomplete session")}
</div>
{!s.is_complete && (
  <div style={{ fontSize: "10px", color: "rgba(160,140,220,0.35)", marginBottom: "4px" }}>
    session ended without summary
  </div>
)}

                      <div className="session-expand-arrow">{isExpanded ? "▴" : "▾"}</div>
                      {isExpanded && (
                        <div className="session-detail">
                          {s.summary && (
                            <div className="session-detail-section">
                              <div className="session-detail-label">What you worked through</div>
                              <div className="session-detail-text">{s.summary}</div>
                            </div>
                          )}
                          {s.action_taken && (
                            <div className="session-detail-section">
                              <div className="session-detail-label">What you decided</div>
                              <div className="session-detail-text">{s.action_taken}</div>
                            </div>
                          )}
                          {s.growth_signals?.length > 0 && (
                            <div className="session-detail-section">
                              <div className="session-detail-label">Growth signals</div>
                              <div className="session-detail-text">{s.growth_signals.join(" · ")}</div>
                            </div>
                          )}
                          {s.themes?.length > 0 && (
                            <div className="session-detail-section">
                              <div className="session-detail-label">Themes</div>
                              <div className="session-detail-text">{s.themes.join(", ")}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      <div className="messages">
        {messages.map((msg, i) => {
          if (msg === "__SESSION_END__") {
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0" }}>
                <div style={{ flex: 1, height: "1px", background: "rgba(160,140,220,0.20)" }} />
                <div style={{ fontSize: "10px", fontWeight: 400, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(160,140,220,0.40)" }}>session complete</div>
                <div style={{ flex: 1, height: "1px", background: "rgba(160,140,220,0.20)" }} />
              </div>
            );
          }

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

      {messages.length >= 5 && (
        <div style={{ textAlign: "center", padding: "4px 0 2px", background: "rgba(13,14,26,0.80)" }}>
          <button
            onClick={async () => {
              setShowEndSession(true);
              if (sessionId && userId) {
                await handleSessionClose(messages, userId, sessionId);
              }
              setShowEndSession(false);
            }}
            style={{
              background: "none", border: "none",
              fontSize: "11px",
              color: showEndSession ? "rgba(160,140,220,0.60)" : "rgba(140,130,180,0.35)",
              cursor: showEndSession ? "default" : "pointer",
              padding: "4px 12px",
              fontFamily: "DM Sans, sans-serif", letterSpacing: "0.04em",
            }}
          >
            {showEndSession ? "closing session..." : "end session"}
          </button>
        </div>
      )}

      <div className="tab-bar">
        <div className="tab active">
          <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="rgba(200,180,255,0.90)" strokeWidth="1.5">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          <span className="tab-label">Grace</span>
        </div>
        <div className="tab" onClick={() => router.push("/rewrite")}>
          <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="rgba(200,180,255,0.90)" strokeWidth="1.5">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <span className="tab-label">Rewrite</span>
        </div>
        <div className="tab" onClick={() => router.push("/profile")}>
          <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="rgba(200,180,255,0.90)" strokeWidth="1.5">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <span className="tab-label">Profile</span>
        </div>
      </div>
    </div>
  );
}