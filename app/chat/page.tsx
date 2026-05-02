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
  relationship_facts_summary?: string;
  recurring_themes_summary?: string;
  growth_summary?: string;
}

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
  const [lastMessageTime, setLastMessageTime] = useState<number | null>(null);
  const [activeMessageCount, setActiveMessageCount] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);
  const [dbUser, setDbUser] = useState<any>(null);
  const [showEndSession, setShowEndSession] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [checkinSubmitting, setCheckinSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const initialized = useRef(false);
  const pendingSessionRef = useRef<{ uid: string; profile: UserProfile; dbUserData: any; sessionNumber: number } | null>(null);
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
      if (!data.session) { router.replace("/login"); return; }

      const user = data.session.user;
      setUserId(user.id);

      const dbUserData = await getOrCreateUser(user.id, user.email || "");
      setDbUser(dbUserData);
      const profile = profileFromDb(dbUserData);
      setUserProfile(profile);

      const activeSession = await getActiveSession(user.id);

      if (activeSession) {
        const lastMsgTime = activeSession.last_message_at
          ? new Date(activeSession.last_message_at).getTime()
          : new Date(activeSession.started_at).getTime();
        const hourSinceLastMessage = Date.now() - lastMsgTime > 60 * 60 * 1000;

        if (hourSinceLastMessage && (activeSession.user_message_count || 0) > 3) {
          const saved = localStorage.getItem(`grace-session-${activeSession.id}`);
          const msgs = saved ? JSON.parse(saved) : [];
          if (msgs.length > 0) {
            try {
              const res = await fetch("/api/session", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: msgs,
    userName: dbUserData?.name || "",
    isAbrupt: true,
    closingOverride: "Session ended after an hour of quiet.",
    userId: user.id,
    sessionNumber: activeSession.session_number,
    userProfile: profile,
  }),
});

              const sessionData = await res.json();
          await closeSession(
  activeSession.id, user.id,
  sessionData.summary || "", sessionData.themes || [],
  sessionData.key_words || [], sessionData.action_taken || "",
  sessionData.growth_signals || [], sessionData.headline || "", [],
  activeSession.session_number,
  sessionData.key_insight || "",
  sessionData.new_relationship_facts || [],
  sessionData.new_recurring_themes || [],
  sessionData.new_growth_signals || []
);
            } catch (e) { console.error("Silent close failed:", e); }
          }
          localStorage.removeItem(`grace-session-${activeSession.id}`);
          await startFreshSession(user.id, profile, dbUserData);
        } else {
          setSessionId(activeSession.id);
          setSessionNumber(activeSession.session_number);
          setSessionStartTime(new Date(activeSession.started_at).getTime());
          setActiveMessageCount(activeSession.user_message_count || 0);
          setLastMessageTime(activeSession.last_message_at ? new Date(activeSession.last_message_at).getTime() : Date.now());
          const saved = localStorage.getItem(`grace-session-${activeSession.id}`);
          if (saved) { setMessages(JSON.parse(saved)); }
          else { startConversation(profile, dbUserData, activeSession.session_number, false); }
        }
      } else {
        await startFreshSession(user.id, profile, dbUserData);
      }
      setAuthLoading(false);
    });
  }, []);

  const startFreshSession = async (uid: string, profile: UserProfile, dbUserData: any) => {
    const { data: lastSession } = await supabase
      .from("sessions").select("session_number").eq("user_id", uid)
      .order("session_number", { ascending: false }).limit(1).single();
    const newSessionNumber = (lastSession?.session_number || 0) + 1;
    setSessionNumber(newSessionNumber);
    setSessionStartTime(Date.now());
    setLastMessageTime(null);
    setActiveMessageCount(0);
    setSessionId(null);
    setMessages([]);
    setSessionEnded(false);

    const action = dbUserData?.last_session_action;
    if (action && action !== "none" && action.trim()) {
      // Only show check-in if the action hasn't already been ticked as complete
      const { data: lastCompletedSession } = await supabase
        .from("sessions")
        .select("id")
        .eq("user_id", uid)
        .eq("is_complete", true)
        .order("session_number", { ascending: false })
        .limit(1)
        .single();

      const completedActions: string[] = dbUserData?.completed_actions || [];
      const alreadyTicked = lastCompletedSession && completedActions.includes(lastCompletedSession.id);

      if (!alreadyTicked) {
        pendingSessionRef.current = { uid, profile, dbUserData, sessionNumber: newSessionNumber };
        setShowCheckin(true);
        return;
      }
    }

    startConversation(profile, dbUserData, newSessionNumber, true);
  };

  const handleCheckin = async (response: "yes" | "tried" | "not_yet") => {
    if (!userId || !dbUser) return;
    setCheckinSubmitting(true);
    const pending = pendingSessionRef.current;
    const action = dbUser.last_session_action;
    const sessNum = pending?.sessionNumber ?? sessionNumber;

    await supabase.from("checkins").insert({
      user_id: userId,
      session_number: sessNum,
      action_text: action,
      response,
      created_at: new Date().toISOString(),
    });

    await supabase.from("users").update({ last_checkin_response: response }).eq("id", userId);

    if (response === "yes") {
  const { data: lastCompleted } = await supabase
    .from("sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("is_complete", true)
    .order("session_number", { ascending: false })
    .limit(1)
    .single();
  if (lastCompleted) {
    // Mark session action complete
    await supabase
      .from("sessions")
      .update({ action_completed: true })
      .eq("id", lastCompleted.id);

    // Tick it in commitments page
    const { data: userData } = await supabase
      .from("users")
      .select("completed_actions")
      .eq("id", userId)
      .single();

    const existing = userData?.completed_actions || [];
    if (!existing.includes(lastCompleted.id)) {
      await supabase
        .from("users")
        .update({ completed_actions: [...existing, lastCompleted.id] })
        .eq("id", userId);
    }
  }
}

    setShowCheckin(false);
    setCheckinSubmitting(false);
    pendingSessionRef.current = null;

    if (pending) {
      startConversation(pending.profile, pending.dbUserData, pending.sessionNumber, true);
    }
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
    const timer = setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, 100);
    return () => clearTimeout(timer);
  }, [messages, loading]);


  const sessionStateRef = useRef<any>({});
  useEffect(() => {
    sessionStateRef.current = { lastMessageTime, sessionId, userId, sessionEnded, activeMessageCount, messages, userProfile, dbUser, sessionNumber };
  }, [lastMessageTime, sessionId, userId, sessionEnded, activeMessageCount, messages, userProfile, dbUser, sessionNumber]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const state = sessionStateRef.current;
      if (!state.lastMessageTime || !state.sessionId || !state.userId || state.sessionEnded) return;
      const elapsed = Date.now() - state.lastMessageTime;
      if (elapsed >= 60 * 60 * 1000 && state.activeMessageCount > 3) {
        await handleSessionClose(state.messages, state.userId, state.sessionId, true);
        const { data: lastSess } = await supabase
          .from("sessions").select("session_number").eq("user_id", state.userId)
          .order("session_number", { ascending: false }).limit(1).single();
        const newSessionNumber = (lastSess?.session_number || 0) + 1;
        const newSession = await createSession(state.userId, newSessionNumber);
        if (newSession) {
          setSessionId(newSession.id); setSessionNumber(newSessionNumber);
          setSessionStartTime(Date.now()); setLastMessageTime(null);
          setActiveMessageCount(0); setSessionEnded(false); setMessages([]);
          startConversation(state.userProfile, state.dbUser, newSessionNumber, true);
        }
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const toApiMessages = (msgs: string[]) => msgs.map((msg) => {
    if (msg.startsWith("You: ")) return { role: "user", content: msg.replace("You: ", "") };
    else return { role: "assistant", content: msg.replace("Grace: ", "") };
  });

  const startConversation = async (profile: UserProfile, dbUserData: any, sessNum: number, isNewSession: boolean) => {
    setLoading(true);
    try {
      const sessionMemory = isNewSession ? buildSessionMemoryBlock(dbUserData) : "";
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "begin" }],
          userProfile: profile, sessionNumber: sessNum, sessionMemory, isNewSession,
          lastSessionDate: dbUserData?.last_seen_at || null,
          clientTime: new Date().toLocaleString("en-GB", { weekday: "long", hour: "2-digit", minute: "2-digit", hour12: true, timeZoneName: "short" }),
        }),
      });
      const text = await response.text();
      if (!text) throw new Error("Empty response");
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error("Invalid response from chat API"); }
      if (data.result) setMessages(["Grace: " + data.result]);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSessionClose = async (msgs: string[], uId: string, sId: string, isAbrupt = false) => {
    try {
      const response = await fetch("/api/session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
  messages: msgs, 
  userName: dbUser?.name || "", 
  isAbrupt,
  userId: uId,
  sessionNumber: sessionNumber,
  userProfile: userProfile,
}),
      });
      const data = await response.json();

      if (!isAbrupt && data.closing_message) {
        setMessages((prev) => [...prev, `__SESSION_END__`, `Grace: ${data.closing_message}`]);
        setSessionEnded(true);
      }

      await closeSession(
  sId, uId, data.summary || "", data.themes || [], data.key_words || [],
  data.action_taken || "", data.growth_signals || [], data.headline || "",
  data.last_ten_messages || [], sessionNumber, data.key_insight || "",
  data.new_relationship_facts || [],
  data.new_recurring_themes || [],
  data.new_growth_signals || []
);

      if (data.action_taken && data.action_taken !== "none" && uId) {
        await supabase.from("users").update({ last_session_action: data.action_taken }).eq("id", uId);
      }

      localStorage.removeItem(`grace-session-${sId}`);
      setSessionId(null);
      setActiveMessageCount(0);
    } catch (e) { console.error("Session close failed:", e); }
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
    setLastMessageTime(Date.now());

    let currentSessionId = sessionId;
    if (!sessionId && userId) {
      const newSession = await createSession(userId, sessionNumber);
      if (newSession) { setSessionId(newSession.id); currentSessionId = newSession.id; }
    }
    if (!sessionId && userId && currentSessionId) {
  // First message — also save Grace's opening
  const graceOpening = messages[0]; // Grace's first message
  if (graceOpening) {
    await supabase.from('grace_logs').insert({
      user_id: userId,
      session_number: sessionNumber,
      user_message: null,
      grace_response: graceOpening.replace('Grace: ', ''),
    });
  }
}

    if (currentSessionId) await updateSessionMessages(currentSessionId, newCount, updatedMessages.length);

    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: toApiMessages(updatedMessages), userProfile, sessionNumber, userId,
          clientTime: new Date().toLocaleString("en-GB", { weekday: "long", hour: "2-digit", minute: "2-digit", hour12: true, timeZoneName: "short" }),
        }),
      });
      const data = await response.json();

      if (data.result) {
        const newMessages = [...updatedMessages, "Grace: " + data.result];
        setMessages(newMessages);
        if (data.sessionComplete && currentSessionId && userId) {
          await handleSessionClose(newMessages, userId, currentSessionId, false);
        }
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) return;
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
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
    const margin = 20; const maxWidth = pageWidth - margin * 2; let y = 20;
    doc.setFontSize(20); doc.setTextColor(60, 40, 120); doc.text("Grace", margin, y); y += 8;
    doc.setFontSize(10); doc.setTextColor(140, 120, 180); doc.text("your relationship companion", margin, y); y += 6;
    doc.setFontSize(9); doc.setTextColor(160, 150, 180);
    doc.text(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), margin, y); y += 10;
    doc.setDrawColor(200, 180, 240); doc.line(margin, y, pageWidth - margin, y); y += 10;
    messages.forEach((msg) => {
      const isUser = msg.startsWith("You:");
      const content = msg.replace("You: ", "").replace("Grace: ", "").replace(/^AI:\s*/i, "");
      doc.setFontSize(8); doc.setTextColor(isUser ? 100 : 140, isUser ? 120 : 100, isUser ? 200 : 180);
      doc.text((isUser ? "You" : "Grace").toUpperCase(), margin, y); y += 5;
      doc.setFontSize(11); doc.setTextColor(30, 20, 50);
      doc.splitTextToSize(content, maxWidth).forEach((line: string) => { if (y > 270) { doc.addPage(); y = 20; } doc.text(line, margin, y); y += 6; });
      y += 6;
    });
    doc.setFontSize(8); doc.setTextColor(180, 170, 200);
    doc.text("Generated by Grace · attuneai.vercel.app", margin, 287);
    doc.save(`grace-chat-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const appHeight = vh > 0 ? `${vh}px` : "100vh";

  if (authLoading) {
    return (
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "#0d0e1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "DM Sans, sans-serif", color: "rgba(200,180,255,0.60)", fontSize: "14px", fontWeight: 300 }}>
        Loading...
      </div>
    );
  }

  if (showCheckin && dbUser?.last_session_action) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
          html, body { height: 100%; background: #0d0e1a; -webkit-font-smoothing: antialiased; }
          @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .checkin-screen { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #0d0e1a; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 28px; animation: fadeUp 0.35s ease; }
          .checkin-avatar { width: 52px; height: 52px; border-radius: 50%; background: rgba(150,100,255,0.20); border: 1px solid rgba(150,100,255,0.70); display: flex; align-items: center; justify-content: center; font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 600; color: rgba(200,180,255,0.90); margin-bottom: 10px; }
          .checkin-name { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 400; color: rgba(245,238,255,0.85); margin-bottom: 36px; }
          .checkin-card { width: 100%; max-width: 360px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.10); border-radius: 18px; padding: 22px 24px; margin-bottom: 28px; }
          .checkin-card-label { font-size: 11px; font-weight: 400; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(160,140,220,0.50); margin-bottom: 10px; }
          .checkin-card-action { font-size: 17px; font-weight: 300; line-height: 1.60; color: rgba(230,222,255,0.90); font-family: 'Cormorant Garamond', serif; font-style: italic; }
          .checkin-buttons { width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: 10px; }
          .checkin-btn { width: 100%; padding: 15px 20px; border-radius: 14px; font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 300; cursor: pointer; transition: all 0.18s; border: 1px solid rgba(150,100,255,0.85); background: rgba(255,255,255,0.04); color: rgba(150,100,255,0.85); letter-spacing: 0.01em; }
          .checkin-btn:not(:disabled):active { transform: scale(0.98); }
          .checkin-btn.yes { background: linear-gradient(145deg, #b070ff 0%, #7040e0 50%, #4020c0 100%); border-color: transparent; color: white; box-shadow: 0 0 16px rgba(160,120,240,0.25); }
          .checkin-btn:disabled { opacity: 0.40; cursor: default; }
        `}</style>
        <div className="checkin-screen">
          <div className="checkin-avatar">G</div>
          <div className="checkin-name">Grace</div>
          <div className="checkin-card">
            <div className="checkin-card-label">Last time you decided to</div>
            <div className="checkin-card-action">{dbUser.last_session_action}</div>
          </div>
          <div className="checkin-buttons">
            <button className="checkin-btn yes" disabled={checkinSubmitting} onClick={() => handleCheckin("yes")}>
              Yes, I did it
            </button>
            <button className="checkin-btn" disabled={checkinSubmitting} onClick={() => handleCheckin("tried")}>
              I tried
            </button>
            <button className="checkin-btn" disabled={checkinSubmitting} onClick={() => handleCheckin("not_yet")}>
              Not yet
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="app" style={{ height: appHeight }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        html, body { height: 100%; overflow: hidden; background: #0d0e1a; -webkit-font-smoothing: antialiased; }
        :root {
          --bg-deep: #0d0e1a; --grace-bubble: rgba(255,255,255,0.06); --grace-border: rgba(255,255,255,0.20);
          --grace-text: rgba(240,235,255,0.95); --user-bubble: rgba(100,120,255,0.24); --user-border: rgba(120,140,255,0.40);
          --user-text: rgba(220,230,255,0.90); --text-primary: rgba(240,235,255,0.95); --text-muted: rgba(140,130,180,0.60);
          --label-grace: rgba(160,140,220,0.55); --label-you: rgba(120,150,220,0.55); --divider: rgba(255,255,255,0.07);
          --input-bg: rgba(255,255,255,0.05); --input-border: rgba(255,255,255,0.10); --input-focus: rgba(150,100,255,0.65);
          --dot: rgba(180,130,255,1.0);
        }
        .app { display: flex; flex-direction: column; background: var(--bg-deep); color: var(--text-primary); font-family: 'DM Sans', sans-serif; overflow: hidden; position: fixed; top: 0; left: 0; right: 0; bottom: 0; }
        .bg-orbs { position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .orb { position: absolute; border-radius: 50%; }
        .orb1 { width: 392px; height: 392px; bottom: -80px; left: -60px; background: radial-gradient(circle, rgba(150,80,220,0.45) 0%, transparent 70%); animation: drift1 18s ease-in-out infinite; }
        .orb2 { width: 308px; height: 308px; bottom: 15%; right: -80px; background: radial-gradient(circle, rgba(80,100,240,0.38) 0%, transparent 70%); animation: drift2 22s ease-in-out infinite; }
        .orb3 { width: 224px; height: 224px; top: 60%; left: 20%; background: radial-gradient(circle, rgba(200,80,160,0.28) 0%, transparent 70%); animation: drift3 16s ease-in-out infinite; }
        @keyframes drift1 { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(-20px,30px) scale(1.05); } 66% { transform: translate(15px,-20px) scale(0.97); } }
        @keyframes drift2 { 0%,100% { transform: translate(0,0) scale(1); } 40% { transform: translate(30px,-25px) scale(1.08); } 70% { transform: translate(-10px,20px) scale(0.95); } }
        @keyframes drift3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-25px,-30px) scale(1.1); } }
        .header { flex-shrink: 0; position: relative; z-index: 2; background: rgba(13,14,26,0.80); border-bottom: 1px solid var(--divider); padding: 8px 16px; display: flex; align-items: center; gap: 10px; backdrop-filter: blur(20px); }
        .avatar { width: 32px; height: 32px; border-radius: 50%; background: rgba(150,100,255,0.25); border: 1px solid rgba(150,100,255,0.60); display: flex; align-items: center; justify-content: center; font-family: 'Cormorant Garamond', serif; font-size: 16px; font-weight: 600; color: rgba(200,180,255,0.90); flex-shrink: 0; }
        .header-text { flex: 1; }
        .header-name { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 600; color: var(--text-primary); line-height: 1.2; }
        .header-sub { font-size: 11px; color: var(--text-muted); font-weight: 300; margin-top: 1px; letter-spacing: 0.03em; }
        .download-btn { width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: rgba(200,180,255,0.70); transition: all 0.2s; margin-right: 4px; }
        .download-btn:disabled { opacity: 0.25; cursor: default; }
        .download-btn:not(:disabled):active { transform: scale(0.9); }
        .online-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(80,220,140,1.0); box-shadow: 0 0 12px rgba(80,220,140,0.70); flex-shrink: 0; }
        .new-session-bar { flex-shrink: 0; position: relative; z-index: 2; padding: 5px 16px; background: rgba(13,14,26,0.80); border-top: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(20px); }
        .new-session-btn { background: rgba(120,80,200,0.18); border: 1px solid rgba(150,100,255,0.30); border-radius: 16px; font-size: 11px; color: rgba(180,150,255,0.65); cursor: pointer; padding: 5px 18px; font-family: 'DM Sans', sans-serif; letter-spacing: 0.04em; box-shadow: none; transition: opacity 0.2s, color 0.2s; }
        .new-session-btn:active { opacity: 0.80; }
        .messages { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 20px 16px 16px; display: flex; flex-direction: column; gap: 20px; -webkit-overflow-scrolling: touch; position: relative; z-index: 1; }
        .messages::-webkit-scrollbar { width: 0; }
        .msg-group { display: flex; flex-direction: column; gap: 6px; max-width: 100%; animation: fadeUp 0.4s ease forwards; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .msg-label { font-size: 10px; font-weight: 400; letter-spacing: 0.10em; text-transform: uppercase; padding: 0 6px; }
        .msg-label.grace { color: var(--label-grace); }
        .msg-label.right { text-align: right; color: var(--label-you); }
        .bubble { font-size: 16px; line-height: 1.70; font-weight: 300; padding: 14px 18px; border-radius: 20px; word-break: break-word; max-width: 90%; }
        .bubble.grace { background: var(--grace-bubble); border: 1px solid var(--grace-border); border-bottom-left-radius: 4px; align-self: flex-start; color: var(--grace-text); backdrop-filter: blur(12px); }
        .bubble.you { background: var(--user-bubble); border: 1px solid var(--user-border); border-bottom-right-radius: 4px; align-self: flex-end; color: var(--user-text); backdrop-filter: blur(12px); }
        .bubble p { margin: 0 0 10px; } .bubble p:last-child { margin: 0; }
        .bubble strong { font-weight: 400; color: rgba(200,180,255,0.95); }
        .typing { display: flex; align-items: center; gap: 5px; padding: 14px 18px; background: var(--grace-bubble); border: 1px solid var(--grace-border); border-radius: 20px; border-bottom-left-radius: 4px; align-self: flex-start; backdrop-filter: blur(12px); }
        .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--dot); opacity: 0.4; animation: bounce 1.6s ease-in-out infinite; }
        .dot:nth-child(2) { animation-delay: 0.25s; } .dot:nth-child(3) { animation-delay: 0.5s; }
        @keyframes bounce { 0%,80%,100% { opacity: 0.4; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-4px); } }
        .input-area { flex-shrink: 0; position: relative; z-index: 2; background: rgba(13,14,26,0.80); border-top: 1px solid var(--divider); padding: 8px 12px; backdrop-filter: blur(20px); }
        .input-row { display: flex; align-items: flex-end; gap: 8px; background: var(--input-bg); border: 1px solid var(--input-border); border-radius: 20px; padding: 6px 6px 6px 14px; transition: border-color 0.3s; }
        .input-row:focus-within { border-color: var(--input-focus); box-shadow: 0 0 20px rgba(160,120,240,0.08); }
        textarea { flex: 1; border: none; outline: none; background: transparent; font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 300; color: var(--text-primary); resize: none; height: 22px; max-height: 100px; line-height: 1.5; overflow-y: auto; }
        textarea::placeholder { color: var(--text-muted); } textarea::-webkit-scrollbar { display: none; }
        .send-btn { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(145deg, #b070ff 0%, #7040e0 50%, #4020c0 100%); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: transform 0.15s, opacity 0.15s; box-shadow: 0 0 16px rgba(160,120,240,0.25); }
        .send-btn:disabled { opacity: 0.25; cursor: default; box-shadow: none; } .send-btn:not(:disabled):active { transform: scale(0.9); }
        .send-btn svg { width: 17px; height: 17px; fill: white; margin-left: 2px; }
        .tab-bar { flex-shrink: 0; position: relative; z-index: 3; background: rgba(13,14,26,0.92); border-top: 1px solid rgba(255,255,255,0.07); backdrop-filter: blur(20px); display: flex; padding: 4px 0 6px; }
        .tab { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; padding: 4px 0; }
        .tab-icon { width: 20px; height: 20px; opacity: 0.40; transition: opacity 0.2s; } .tab.active .tab-icon { opacity: 1; }
        .tab-label { font-size: 9px; font-weight: 400; letter-spacing: 0.04em; color: rgba(140,130,180,0.50); transition: color 0.2s; } .tab.active .tab-label { color: rgba(200,180,255,0.90); }


        /* CHECK-IN SCREEN */
        .checkin-screen { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #0d0e1a; z-index: 20; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 28px; animation: fadeUp 0.35s ease; }
        .checkin-avatar { width: 52px; height: 52px; border-radius: 50%; background: rgba(150,100,255,0.20); border: 1px solid rgba(150,100,255,0.50); display: flex; align-items: center; justify-content: center; font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 600; color: rgba(200,180,255,0.90); margin-bottom: 10px; }
        .checkin-name { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 400; color: rgba(245,238,255,0.85); margin-bottom: 36px; }
        .checkin-card { width: 100%; max-width: 360px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.10); border-radius: 18px; padding: 22px 24px; margin-bottom: 28px; }
        .checkin-card-label { font-size: 11px; font-weight: 400; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(160,140,220,0.50); margin-bottom: 10px; }
        .checkin-card-action { font-size: 17px; font-weight: 300; line-height: 1.60; color: rgba(230,222,255,0.90); font-family: 'Cormorant Garamond', serif; font-style: italic; }
        .checkin-buttons { width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: 10px; }
        .checkin-btn { width: 100%; padding: 15px 20px; border-radius: 14px; font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 300; cursor: pointer; transition: all 0.18s; text-align: center; border: 1px solid rgba(150,100,255,0.85); background: rgba(255,255,255,0.04); color: rgba(150,100,255,0.85); letter-spacing: 0.01em; }
        .checkin-btn:not(:disabled):active { transform: scale(0.98); }
        .checkin-btn.yes { background: linear-gradient(145deg, #b070ff 0%, #7040e0 50%, #4020c0 100%); border-color: transparent; color: white; box-shadow: 0 0 16px rgba(160,120,240,0.25); }
        .checkin-btn:disabled { opacity: 0.40; cursor: default; }
      `}</style>

      <div className="bg-orbs">
        <div className="orb orb1" /><div className="orb orb2" /><div className="orb orb3" />
      </div>

      <div className="header">
        <div className="avatar">G</div>
        <div className="header-text">
          <div className="header-name">Grace</div>
          <div className="header-sub">your relationship companion</div>
        </div>
        <button className="download-btn" onClick={downloadPDF} title="Download conversation" disabled={messages.length === 0}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17"/>
          </svg>
        </button>
        <div className="online-dot" />
      </div>

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
          const content = msg.replace("You: ", "").replace("Grace: ", "").replace(/^AI:\s*/i, "");
          return (
            <div key={i} className="msg-group">
              <div className={`msg-label${isUser ? " right" : " grace"}`}>{isUser ? "You" : "Grace"}</div>
              <div className={`bubble ${isUser ? "you" : "grace"}`}>
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="msg-group">
            <div className="msg-label grace">Grace</div>
            <div className="typing"><div className="dot" /><div className="dot" /><div className="dot" /></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {sessionEnded && (
        <div className="new-session-bar">
          <button className="new-session-btn" onClick={() => { window.location.href = "/chat"; }}>
            new session
          </button>
        </div>
      )}

      <div className="input-area">
        <div className="input-row">
          <textarea ref={inputRef} value={input} onChange={handleInput} onKeyDown={handleKeyDown}
            placeholder={sessionEnded ? "Session complete" : "Figuring out what happened?"}
            disabled={loading || sessionEnded} rows={1} />
          <button className="send-btn" onClick={sendMessage} disabled={loading || !input.trim() || sessionEnded}>
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
          </button>
        </div>
      </div>

      {messages.length >= 5 && !sessionEnded && (
        <div style={{ textAlign: "center", padding: "2px 0 1px", background: "rgba(13,14,26,0.80)" }}>
          <button
            onClick={async () => {
              setShowEndSession(true);
              if (sessionId && userId) await handleSessionClose(messages, userId, sessionId, false);
              setShowEndSession(false);
            }}
            style={{ background: "none", border: "none", fontSize: "10px", color: showEndSession ? "rgba(160,140,220,0.60)" : "rgba(140,130,180,0.35)", cursor: showEndSession ? "default" : "pointer", padding: "4px 12px", fontFamily: "DM Sans, sans-serif", letterSpacing: "0.04em" }}>
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
        <div className="tab" onClick={() => router.push("/fixit")}>
          <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="rgba(200,180,255,0.90)" strokeWidth="1.5">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <span className="tab-label">Fix it</span>
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