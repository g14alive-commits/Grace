"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Profile() {
  const [dbUser, setDbUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [actions, setActions] = useState<any[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [vh, setVh] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const setHeight = () => setVh(window.innerHeight);
    setHeight();
    window.addEventListener("resize", setHeight);
    return () => window.removeEventListener("resize", setHeight);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace("/login"); return; }
      setEmail(data.session.user.email || "");
      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.session.user.id)
        .single();
      if (user) {
        setDbUser(user);
        setName(user.name || "");
      }
  
      const { data: sessions } = await supabase
  .from("sessions")
  .select("id, session_number, action_taken, started_at")
  .eq("user_id", data.session.user.id)
  .not("action_taken", "is", null)
  .neq("action_taken", "")
  .order("started_at", { ascending: false });
if (sessions) {
  setActions(sessions.filter(s => s.action_taken?.trim()));
}
if (user?.completed_actions) {
  setCompleted(user.completed_actions);
}
      setLoading(false);
    });
  }, []);

  const handleSaveName = async () => {
    setSaving(true);
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    await supabase.from("users").update({ name: name.trim() }).eq("id", data.session.user.id);
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) return;
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (!error) {
      alert("Confirmation sent to your new email. Please check your inbox.");
      setShowChangeEmail(false);
      setNewEmail("");
    }
  };

  const handleRemoveHistory = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const userId = data.session.user.id;
    await supabase.from("conversations").delete().eq("user_id", userId);
    await supabase.from("sessions").delete().eq("user_id", userId);
    await supabase.from("users").update({
      user_pattern: null,
      partner_pattern: null,
      relationship_facts: [],
      recurring_themes: [],
      growth_signals: [],
      last_session_summary: null,
      last_session_action: null,
      last_session_themes: [],
      last_session_key_words: [],
      assessment_complete: false,
      session_count: 0,
    }).eq("id", userId);
    localStorage.clear();
    setShowRemoveConfirm(false);
    router.replace("/chat");
  };

  const handleDeleteAccount = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const userId = data.session.user.id;
    await supabase.from("users").delete().eq("id", userId);
    await supabase.auth.signOut();
    localStorage.clear();
    router.replace("/login");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const toggleAction = async (id: string) => {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  const newCompleted = completed.includes(id)
    ? completed.filter(c => c !== id)
    : [...completed, id];
  setCompleted(newCompleted);
  await supabase.from("users").update({ completed_actions: newCompleted }).eq("id", data.session.user.id);
};

  const appHeight = vh > 0 ? `${vh}px` : "100vh";

  if (loading) {
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "#0d0e1a", display: "flex", alignItems: "center",
        justifyContent: "center", color: "rgba(200,180,255,0.60)",
        fontFamily: "DM Sans, sans-serif", fontSize: "14px",
      }}>Loading...</div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        html, body { height: 100%; overflow: hidden; background: #0d0e1a; -webkit-font-smoothing: antialiased; }

        :root {
          --bg: #0d0e1a;
          --surface: rgba(255,255,255,0.05);
          --border: rgba(255,255,255,0.10);
          --text-primary: rgba(240,235,255,0.95);
          --text-secondary: rgba(180,170,220,0.75);
          --text-muted: rgba(140,130,180,0.55);
          --accent: rgba(160,120,240,0.90);
          --divider: rgba(255,255,255,0.07);
          --header-bg: rgba(13,14,26,0.85);
          --danger: rgba(240,80,80,0.80);
        }

        .page {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: var(--bg); color: var(--text-primary);
          font-family: 'DM Sans', sans-serif;
          display: flex; flex-direction: column; overflow: hidden;
        }

        .bg-orbs {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none; z-index: 0;
        }

        .orb { position: absolute; border-radius: 50%; filter: blur(60px); }

        .orb1 {
          width: 300px; height: 300px; top: -60px; right: -40px;
          background: radial-gradient(circle, rgba(120,80,200,0.18) 0%, transparent 70%);
          animation: drift1 20s ease-in-out infinite;
        }

        .orb2 {
          width: 250px; height: 250px; bottom: 15%; left: -60px;
          background: radial-gradient(circle, rgba(60,120,220,0.14) 0%, transparent 70%);
          animation: drift2 24s ease-in-out infinite;
        }

        @keyframes drift1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-15px,20px); } }
        @keyframes drift2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(20px,-15px); } }

        .header {
          flex-shrink: 0; position: relative; z-index: 2;
          background: var(--header-bg);
          border-bottom: 1px solid var(--divider);
          padding: 8px 16px;
          display: flex; align-items: center; justify-content: space-between;
          backdrop-filter: blur(20px);
        }

        .header-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 21px; font-weight: 500; color: var(--text-primary);
        }

        .signout-btn {
          font-size: 13px; font-weight: 300; color: var(--text-muted);
          background: none; border: none; cursor: pointer; padding: 6px 0;
        }

        .scroll {
          flex: 1; overflow-y: auto; padding: 32px 24px 24px;
          position: relative; z-index: 1;
        }

        .scroll::-webkit-scrollbar { width: 0; }

        .greeting {
          font-family: 'Cormorant Garamond', serif;
          font-size: 32px; font-weight: 300;
          color: var(--text-primary); margin-bottom: 6px; line-height: 1.2;
        }

        .greeting-sub {
          font-size: 14px; font-weight: 300;
          color: var(--text-muted); margin-bottom: 32px;
        }

        .field-label {
          font-size: 10px; font-weight: 500; letter-spacing: 0.10em;
          text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;
        }

        .name-row {
          display: flex; gap: 10px; align-items: center; margin-bottom: 28px;
        }

        .name-input {
          flex: 1;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 14px; padding: 13px 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 16px; font-weight: 300; color: var(--text-primary);
          outline: none; transition: border-color 0.2s;
        }

        .name-input:focus { border-color: rgba(160,120,240,0.45); }
        .name-input::placeholder { color: var(--text-muted); }

        .save-btn {
          padding: 13px 20px; border-radius: 14px;
          background: rgba(160,120,240,0.12);
          border: 1px solid rgba(160,120,240,0.25);
          color: rgba(200,180,255,0.90);
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 400;
          cursor: pointer; transition: all 0.2s; white-space: nowrap;
        }

        .save-btn:disabled { opacity: 0.30; cursor: default; }
        .save-btn:not(:disabled):active { transform: scale(0.97); }

        .action-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 18px; padding: 18px 20px; margin-bottom: 16px;
        }

        .action-label {
          font-size: 10px; font-weight: 500; letter-spacing: 0.10em;
          text-transform: uppercase; color: rgba(160,140,220,0.50);
          margin-bottom: 10px;
        }

        .action-text {
          font-family: 'Cormorant Garamond', serif;
          font-size: 19px; font-weight: 300; font-style: italic;
          line-height: 1.55; color: rgba(220,210,255,0.85);
        }

        .action-empty {
          font-size: 14px; font-weight: 300;
          color: var(--text-muted); font-style: italic;
        }

        .stat-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 18px; padding: 18px 20px;
          margin-bottom: 28px; display: flex; align-items: center;
          justify-content: space-between;
        }

        .stat-label-text {
          font-size: 14px; font-weight: 300; color: var(--text-secondary);
        }

        .stat-value {
          font-family: 'DM Sans', sans-serif;
          font-size: 24px; font-weight: 400; color: var(--text-primary);
        }

        .divider {
          height: 1px; background: var(--divider); margin: 4px 0 24px;
        }

        .section-title {
          font-size: 10px; font-weight: 500; letter-spacing: 0.10em;
          text-transform: uppercase; color: var(--text-muted); margin-bottom: 14px;
        }

        .about-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 18px; overflow: hidden; margin-bottom: 28px;
        }

        .about-row {
          padding: 16px 20px;
          display: flex; align-items: center; justify-content: space-between;
          cursor: pointer; transition: background 0.2s;
          border-bottom: 1px solid var(--divider);
        }

        .about-row:last-child { border-bottom: none; }
        .about-row:active { background: rgba(255,255,255,0.03); }

        .about-row-label {
          font-size: 15px; font-weight: 300; color: var(--text-primary);
        }

        .about-row-arrow {
          font-size: 12px; color: var(--text-muted);
        }

        .about-content {
          padding: 0 20px 20px;
          font-size: 14px; font-weight: 300; line-height: 1.70;
          color: var(--text-secondary);
        }

        .account-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 18px; overflow: hidden; margin-bottom: 12px;
        }

        .account-row {
          padding: 16px 20px;
          border-bottom: 1px solid var(--divider);
        }

        .account-row:last-child { border-bottom: none; }

        .account-row-label {
          font-size: 10px; font-weight: 500; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px;
        }

        .account-row-value {
          font-size: 15px; font-weight: 300; color: var(--text-secondary);
        }

        .change-link {
          font-size: 13px; font-weight: 300;
          color: rgba(160,140,220,0.70);
          background: none; border: none;
          cursor: pointer; padding: 0; margin-top: 4px;
          display: block;
        }

        .email-input {
          width: 100%; margin-top: 10px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px; padding: 10px 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 300; color: var(--text-primary);
          outline: none;
        }

        .email-input:focus { border-color: rgba(160,120,240,0.45); }

        .confirm-btn {
          margin-top: 8px; padding: 9px 18px; border-radius: 10px;
          background: rgba(160,120,240,0.12);
          border: 1px solid rgba(160,120,240,0.25);
          color: rgba(200,180,255,0.90);
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; cursor: pointer;
        }

        .danger-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 18px; overflow: hidden; margin-bottom: 40px;
        }

        .danger-row {
          padding: 16px 20px;
          border-bottom: 1px solid var(--divider);
          cursor: pointer; transition: background 0.2s;
        }

        .danger-row:last-child { border-bottom: none; }
        .danger-row:active { background: rgba(240,80,80,0.05); }

        .danger-label {
         font-size: 15px; font-weight: 300; color: rgba(180,170,220,0.55);
        }

        .danger-sub {
          font-size: 12px; font-weight: 300; color: var(--text-muted);
          margin-top: 3px;
        }

        .confirm-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(10,10,20,0.88); z-index: 10;
          display: flex; flex-direction: column;
          justify-content: flex-end;
          backdrop-filter: blur(8px);
        }

        .confirm-sheet {
          background: #16142a;
          border-top: 1px solid rgba(255,255,255,0.10);
          border-radius: 24px 24px 0 0;
          padding: 28px 24px 40px;
        }

        .confirm-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px; font-weight: 400;
          color: var(--text-primary); margin-bottom: 10px;
        }

        .confirm-body {
          font-size: 14px; font-weight: 300; line-height: 1.65;
          color: var(--text-muted); margin-bottom: 24px;
        }

        .confirm-btns { display: flex; gap: 10px; }

        .cancel-btn {
          flex: 1; padding: 14px; border-radius: 14px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          color: var(--text-secondary);
          font-family: 'DM Sans', sans-serif;
          font-size: 15px; cursor: pointer;
        }

        .danger-confirm-btn {
          flex: 1; padding: 14px; border-radius: 14px;
          background: rgba(240,80,80,0.12);
          border: 1px solid rgba(240,80,80,0.25);
          color: rgba(240,120,120,0.95);
          font-family: 'DM Sans', sans-serif;
          font-size: 15px; cursor: pointer;
        }

        .tab-bar {
          flex-shrink: 0; position: relative; z-index: 3;
          background: rgba(13,14,26,0.92);
          border-top: 1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(20px);
          display: flex; padding: 2px 0 4px;
        }

        .tab {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; gap: 3px; cursor: pointer; padding: 4px 0;
        }

        .tab-icon { width: 20px; height: 20px; opacity: 0.40; transition: opacity 0.2s; }
        .tab.active .tab-icon { opacity: 1; }

        .tab-label {
          font-size: 9px; font-weight: 400; letter-spacing: 0.04em;
          color: rgba(140,130,180,0.50); transition: color 0.2s;
        }

        .tab.active .tab-label { color: rgba(200,180,255,0.90); }
      `}</style>

      <div className="page" style={{ height: appHeight }}>
        <div className="bg-orbs">
          <div className="orb orb1" />
          <div className="orb orb2" />
        </div>

        <div className="header">
          <div className="header-name">Profile</div>
          <button className="signout-btn" onClick={handleSignOut}>Sign out</button>
        </div>

        <div className="scroll">
          <div className="greeting">
            {dbUser?.name ? `Hi, ${dbUser.name}.` : "Hi there."}
          </div>
          <div className="greeting-sub">
            {dbUser?.session_count > 0
              ? `You've had ${dbUser.session_count} session${dbUser.session_count === 1 ? "" : "s"} with Grace.`
              : "Your journey with Grace starts here."}
          </div>

          {/* Name */}
          <div className="field-label">Your name</div>
          <div className="name-row">
            <input
              className="name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should Grace call you?"
            />
            <button
              className="save-btn"
              onClick={handleSaveName}
              disabled={saving || name.trim() === (dbUser?.name || "")}
            >
              {saved ? "Saved ✓" : saving ? "..." : "Save"}
            </button>
          </div>

          {/* Last action */}
          <div className="action-card">
            <div className="action-label">Last action from Grace</div>
            {dbUser?.last_session_action ? (
              <div className="action-text">"{dbUser.last_session_action}"</div>
            ) : (
              <div className="action-empty">Complete a session with Grace and she'll leave you with something to work on.</div>
            )}
          </div>

          {/* Sessions */}
          {/* Actions */}
{actions.length > 0 && (
  <div style={{ marginBottom: "28px" }}>
    <div className="field-label" style={{ marginBottom: "12px" }}>
      Actions — {completed.length}/{actions.length} done
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {actions.map(action => {
        const isDone = completed.includes(action.id);
        return (
          <div
            key={action.id}
            onClick={() => toggleAction(action.id)}
            style={{
              display: "flex", alignItems: "flex-start", gap: "14px",
              padding: "14px 16px",
              background: isDone ? "rgba(160,120,240,0.06)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${isDone ? "rgba(160,120,240,0.20)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: "14px", cursor: "pointer", transition: "all 0.2s",
            }}
          >
            <div style={{
              width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0, marginTop: "1px",
              border: `1.5px solid ${isDone ? "rgba(160,120,240,0.60)" : "rgba(160,120,240,0.35)"}`,
              background: isDone ? "rgba(160,120,240,0.30)" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
            }}>
              {isDone && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="rgba(200,180,255,0.90)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: "14px", fontWeight: 300, lineHeight: 1.55,
                color: isDone ? "rgba(160,140,220,0.50)" : "rgba(220,210,255,0.85)",
                textDecoration: isDone ? "line-through" : "none",
                textDecorationColor: "rgba(160,120,240,0.30)",
                transition: "all 0.2s",
              }}>{action.action_taken}</div>
              <div style={{
                fontSize: "10px", fontWeight: 400, letterSpacing: "0.06em",
                textTransform: "uppercase", color: "rgba(140,130,180,0.35)", marginTop: "5px",
              }}>
                Session {action.session_number} · {new Date(action.started_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}
          <div className="stat-card">
            <div className="stat-label-text">Sessions with Grace</div>
            <div className="stat-value">{dbUser?.session_count || 0}</div>
          </div>

          <div className="divider" />

          {/* About Attune */}
          <div className="section-title">About Attune</div>
          <div className="about-card">
            <div className="about-row" onClick={() => setShowAbout(!showAbout)}>
              <span className="about-row-label">What is Attune?</span>
              <span className="about-row-arrow">{showAbout ? "▴" : "▾"}</span>
            </div>
            {showAbout && (
              <div className="about-content">
                Attune is a relationship intelligence platform built on the belief that relational hurt heals through relationship — not in isolation.<br /><br />
                Grace is your AI relationship companion. Rewrite helps you communicate better in difficult moments.<br /><br />
                Your conversations are private. We don't share your data with anyone.
              </div>
            )}
            <div className="about-row" onClick={() => router.push("/privacy")}>
              <span className="about-row-label">Privacy policy</span>
              <span className="about-row-arrow">›</span>
            </div>
            <div className="about-row">
              <span className="about-row-label">Version</span>
              <span className="about-row-arrow" style={{ fontSize: "13px" }}>1.0 beta</span>
            </div>
          </div>

          <div className="divider" />

          {/* Account */}
          <div className="section-title">Account</div>
          <div className="account-card">
            <div className="account-row">
              <div className="account-row-label">Email</div>
              <div className="account-row-value">{email}</div>
              <button className="change-link" onClick={() => setShowChangeEmail(!showChangeEmail)}>
                Change email
              </button>
              {showChangeEmail && (
                <>
                  <input
                    className="email-input"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="New email address"
                  />
                  <button className="confirm-btn" onClick={handleChangeEmail}>
                    Send confirmation
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="danger-card">
            <div className="danger-row" onClick={() => setShowRemoveConfirm(true)}>
              <div className="danger-label">Remove history</div>
              <div className="danger-sub">Clears all conversations and resets Grace's memory. Your account stays.</div>
            </div>
            <div className="danger-row" onClick={() => setShowDeleteConfirm(true)}>
              <div className="danger-label">Delete account</div>
              <div className="danger-sub">Permanently deletes your account and all data.</div>
            </div>
          </div>
        </div>

        {/* Remove history confirmation */}
        {showRemoveConfirm && (
          <div className="confirm-overlay" onClick={() => setShowRemoveConfirm(false)}>
            <div className="confirm-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-title">Remove all history?</div>
              <div className="confirm-body">
                This will delete all your conversations with Grace and reset her memory of you. Your account stays. This cannot be undone.
              </div>
              <div className="confirm-btns">
                <button className="cancel-btn" onClick={() => setShowRemoveConfirm(false)}>Cancel</button>
                <button className="danger-confirm-btn" onClick={handleRemoveHistory}>Remove history</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete account confirmation */}
        {showDeleteConfirm && (
          <div className="confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="confirm-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-title">Delete your account?</div>
              <div className="confirm-body">
                This will permanently delete your account, all conversations, and all data. This cannot be undone.
              </div>
              <div className="confirm-btns">
                <button className="cancel-btn" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                <button className="danger-confirm-btn" onClick={handleDeleteAccount}>Delete account</button>
              </div>
            </div>
          </div>
        )}

        <div className="tab-bar">
          <div className="tab" onClick={() => router.push("/chat")}>
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
          <div className="tab active">
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