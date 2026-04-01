"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Profile() {
  const [dbUser, setDbUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
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
      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.session.user.id)
        .single();
      if (user) {
        setDbUser(user);
        setName(user.name || "");
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    await supabase
      .from("users")
      .update({ name: name.trim() })
      .eq("id", data.session.user.id);
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
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

        .orb {
          position: absolute; border-radius: 50%; filter: blur(60px);
        }

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

        @keyframes drift1 {
          0%,100% { transform: translate(0,0); }
          50% { transform: translate(-15px,20px); }
        }

        @keyframes drift2 {
          0%,100% { transform: translate(0,0); }
          50% { transform: translate(20px,-15px); }
        }

        .header {
          flex-shrink: 0; position: relative; z-index: 2;
          background: var(--header-bg);
          border-bottom: 1px solid var(--divider);
          padding: 16px 20px;
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
          color: var(--text-primary); margin-bottom: 6px;
          line-height: 1.2;
        }

        .greeting-sub {
          font-size: 14px; font-weight: 300;
          color: var(--text-muted); margin-bottom: 36px;
        }

        .name-section { margin-bottom: 32px; }

        .field-label {
          font-size: 10px; font-weight: 500; letter-spacing: 0.10em;
          text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;
        }

        .name-input {
          width: 100%;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 14px; padding: 14px 18px;
          font-family: 'DM Sans', sans-serif;
          font-size: 17px; font-weight: 300; color: var(--text-primary);
          outline: none; transition: border-color 0.2s;
        }

        .name-input:focus { border-color: rgba(160,120,240,0.45); }
        .name-input::placeholder { color: var(--text-muted); }

        .save-btn {
          margin-top: 10px;
          padding: 10px 24px; border-radius: 50px;
          background: rgba(160,120,240,0.12);
          border: 1px solid rgba(160,120,240,0.25);
          color: rgba(200,180,255,0.90);
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 400;
          cursor: pointer; transition: all 0.2s;
        }

        .save-btn:disabled { opacity: 0.35; cursor: default; }
        .save-btn:not(:disabled):active { transform: scale(0.97); }

        .stats-row {
          display: flex; gap: 12px; margin-bottom: 32px;
        }

        .stat-card {
          flex: 1; background: var(--surface);
          border: 1px solid var(--border); border-radius: 18px;
          padding: 18px 16px; text-align: center;
        }

        .stat-value {
          font-family: 'Cormorant Garamond', serif;
          font-size: 36px; font-weight: 300;
          color: var(--text-primary); line-height: 1; margin-bottom: 6px;
        }

        .stat-label {
          font-size: 11px; font-weight: 300; color: var(--text-muted);
          letter-spacing: 0.04em;
        }

        .action-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 18px; padding: 20px;
          margin-bottom: 32px;
        }

        .action-card-label {
          font-size: 10px; font-weight: 500; letter-spacing: 0.10em;
          text-transform: uppercase; color: rgba(160,140,220,0.55);
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

        .tab-bar {
          flex-shrink: 0; position: relative; z-index: 3;
          background: rgba(13,14,26,0.92);
          border-top: 1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          display: flex; padding: 4px 0 6px;
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

          <div className="name-section">
            <div className="field-label">Your name</div>
            <input
              className="name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should Grace call you?"
            />
            <div>
              <button
                className="save-btn"
                onClick={handleSave}
                disabled={saving || name.trim() === (dbUser?.name || "")}
              >
                {saved ? "Saved ✓" : saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-value">{dbUser?.session_count || 0}</div>
              <div className="stat-label">sessions</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {dbUser?.last_session_summary ? "✓" : "—"}
              </div>
              <div className="stat-label">last session</div>
            </div>
          </div>

          {dbUser?.last_session_action && (
            <div className="action-card">
              <div className="action-card-label">Your last action from Grace</div>
              <div className="action-text">"{dbUser.last_session_action}"</div>
            </div>
          )}

          {!dbUser?.last_session_action && (
            <div className="action-card">
              <div className="action-card-label">Your last action from Grace</div>
              <div className="action-empty">
                Complete a session with Grace and she'll leave you with something to work on.
              </div>
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