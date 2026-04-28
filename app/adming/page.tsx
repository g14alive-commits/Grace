"use client";

import { useState } from "react";

const ADMIN_PASSWORD = "grace2024admin";

type User = {
  id: string;
  email: string;
  name: string | null;
  user_pattern: string | null;
  session_count: number | null;
  last_seen_at: string | null;
  last_checkin_response: string | null;
  recurring_themes_summary: string | null;
  recurring_themes: string[] | null;
  last_session_action: string | null;
  relationship_facts_summary: string | null;
};

type Log = {
  id: string;
  session_number: number;
  user_message: string | null;
  grace_response: string | null;
  created_at: string;
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [insightOpen, setInsightOpen] = useState(true);

  const handleLogin = async () => {
    if (password !== ADMIN_PASSWORD) { setPwError(true); return; }
    setAuthed(true);
    setPwError(false);
    setLoading(true);
    const res = await fetch("/api/admin");
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const handleSelectUser = async (user: User) => {
    setSelectedUser(user);
    setInsightOpen(true);
    setLogsLoading(true);
    const res = await fetch(`/api/admin?userId=${encodeURIComponent(user.id)}`);
    const data = await res.json();
    setLogs(Array.isArray(data) ? data : []);
    setLogsLoading(false);
  };

  const fmtDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  };

  const checkinLabel = (r: string | null) => {
    if (r === "yes") return { text: "✓ did it", cls: "ci-yes" };
    if (r === "tried") return { text: "~ tried", cls: "ci-tried" };
    if (r === "not_yet") return { text: "✗ not yet", cls: "ci-no" };
    return null;
  };

  const themesText = (user: User) => {
    if (user.recurring_themes_summary) return user.recurring_themes_summary;
    if (user.recurring_themes?.length) return user.recurring_themes.slice(0, 3).join(", ");
    return null;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        html, body { min-height: 100%; background: #0d0e1a; -webkit-font-smoothing: antialiased; }

        .adm-page { min-height: 100vh; background: #0d0e1a; font-family: 'DM Sans', sans-serif; color: rgba(245,238,255,0.95); }

        /* Gate */
        .gate { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 40px 24px; }
        .gate-title { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 300; color: rgba(245,238,255,0.90); margin-bottom: 6px; letter-spacing: 0.02em; }
        .gate-sub { font-size: 13px; color: rgba(160,150,200,0.50); margin-bottom: 36px; letter-spacing: 0.03em; }
        .gate-form { width: 100%; max-width: 340px; display: flex; flex-direction: column; gap: 12px; }
        .input-wrap { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.10); border-radius: 14px; padding: 14px 18px; transition: border-color 0.2s; }
        .input-wrap:focus-within { border-color: rgba(160,120,240,0.45); }
        .input-wrap.err { border-color: rgba(240,100,100,0.50); }
        input { width: 100%; background: transparent; border: none; outline: none; font-family: 'DM Sans', sans-serif; font-size: 16px; font-weight: 300; color: rgba(240,235,255,0.95); }
        input::placeholder { color: rgba(140,130,180,0.55); }
        .btn { width: 100%; padding: 15px; border-radius: 14px; background: linear-gradient(135deg, rgba(160,120,240,0.25) 0%, rgba(120,80,200,0.20) 100%); border: 1px solid rgba(160,120,240,0.30); color: rgba(210,190,255,0.95); font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 400; cursor: pointer; transition: all 0.2s; letter-spacing: 0.02em; }
        .btn:active { transform: scale(0.98); }
        .error-msg { font-size: 13px; color: rgba(255,130,130,0.80); text-align: center; margin-top: -4px; }

        /* Inner */
        .adm-inner { max-width: 720px; margin: 0 auto; padding: 36px 20px 80px; }
        .adm-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
        .adm-title { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 300; color: rgba(245,238,255,0.90); letter-spacing: 0.02em; }
        .back-btn { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 7px 14px; color: rgba(200,190,240,0.80); font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
        .back-btn:active { transform: scale(0.97); }

        /* User list */
        .user-list { display: flex; flex-direction: column; gap: 8px; }
        .user-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); border-radius: 14px; padding: 14px 16px; cursor: pointer; transition: background 0.18s, border-color 0.18s; }
        .user-card:hover { background: rgba(160,120,240,0.08); border-color: rgba(160,120,240,0.22); }
        .user-card:active { transform: scale(0.995); }
        .user-top { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
        .user-name { font-size: 15px; font-weight: 400; color: rgba(240,235,255,0.90); }
        .user-meta { display: flex; flex-wrap: wrap; gap: 6px; }
        .meta-pill { font-size: 11px; color: rgba(160,150,210,0.60); background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 7px; padding: 2px 9px; }
        .ci-yes { font-size: 11px; color: rgba(100,220,140,0.80); background: rgba(80,200,120,0.08); border: 1px solid rgba(80,200,120,0.20); border-radius: 7px; padding: 2px 9px; }
        .ci-tried { font-size: 11px; color: rgba(220,180,80,0.80); background: rgba(200,160,60,0.08); border: 1px solid rgba(200,160,60,0.20); border-radius: 7px; padding: 2px 9px; }
        .ci-no { font-size: 11px; color: rgba(200,90,90,0.70); background: rgba(200,80,80,0.06); border: 1px solid rgba(200,80,80,0.15); border-radius: 7px; padding: 2px 9px; }

        /* Insight panel */
        .insight-panel { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 12px 16px; margin-bottom: 20px; }
        .insight-toggle { width: 100%; display: flex; align-items: center; justify-content: space-between; background: none; border: none; cursor: pointer; padding: 0; }
        .insight-toggle-label { font-size: 10px; font-weight: 500; letter-spacing: 0.09em; text-transform: uppercase; color: rgba(160,140,220,0.50); }
        .insight-toggle-arrow { font-size: 11px; color: rgba(140,130,180,0.40); }
        .insight-body { margin-top: 12px; display: flex; flex-direction: column; gap: 7px; }
        .insight-row { display: flex; gap: 10px; align-items: baseline; }
        .insight-lbl { font-size: 9px; font-weight: 500; letter-spacing: 0.09em; text-transform: uppercase; color: rgba(140,130,180,0.45); flex-shrink: 0; width: 90px; }
        .insight-val { font-size: 12px; font-weight: 300; color: rgba(190,182,225,0.80); line-height: 1.5; }
        .insight-val.accent { color: rgba(200,175,255,0.85); }

        /* Chat thread */
        .chat-thread { display: flex; flex-direction: column; gap: 12px; }
        .sess-divider { display: flex; align-items: center; gap: 10px; margin: 6px 0; }
        .divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.07); }
        .sess-label { font-size: 10px; letter-spacing: 0.07em; text-transform: uppercase; color: rgba(150,140,195,0.40); white-space: nowrap; }
        .exchange { display: flex; flex-direction: column; gap: 6px; }
        .bubble-row { display: flex; flex-direction: column; }
        .bubble-row.user { align-items: flex-end; }
        .bubble-row.grace { align-items: flex-start; }
        .bubble { max-width: 80%; padding: 9px 13px; border-radius: 15px; font-size: 13.5px; font-weight: 300; line-height: 1.58; white-space: pre-wrap; word-break: break-word; }
        .bubble.grace { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.10); color: rgba(210,205,230,0.88); border-bottom-left-radius: 4px; }
        .bubble.user { background: rgba(110,80,200,0.32); border: 1px solid rgba(140,100,240,0.28); color: rgba(230,220,255,0.92); border-bottom-right-radius: 4px; }
        .bubble-ts { font-size: 10px; color: rgba(130,120,170,0.38); margin-top: 3px; padding: 0 4px; }

        .loading { text-align: center; padding: 60px 0; color: rgba(160,150,200,0.55); font-size: 14px; }
        .empty { text-align: center; padding: 60px 0; color: rgba(160,150,200,0.40); font-size: 14px; }

        @media (max-width: 480px) {
          .adm-inner { padding: 24px 14px 60px; }
          .bubble { max-width: 88%; font-size: 13px; }
          .adm-title { font-size: 19px; }
          .insight-lbl { width: 74px; }
        }
      `}</style>

      <div className="adm-page">
        {!authed ? (
          <div className="gate">
            <div className="gate-title">Admin</div>
            <div className="gate-sub">attune admin panel</div>
            <div className="gate-form">
              <div className={`input-wrap${pwError ? " err" : ""}`}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPwError(false); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
                  placeholder="Password"
                  autoFocus
                />
              </div>
              {pwError && <div className="error-msg">Incorrect password</div>}
              <button className="btn" onClick={handleLogin}>Enter</button>
            </div>
          </div>

        ) : selectedUser ? (
          // ── Conversation view ──
          <div className="adm-inner">
            <div className="adm-header">
              <button className="back-btn" onClick={() => { setSelectedUser(null); setLogs([]); }}>← Users</button>
              <div className="adm-title">{selectedUser.name || selectedUser.email}</div>
            </div>

            {/* Insight panel */}
            <div className="insight-panel">
              <button className="insight-toggle" onClick={() => setInsightOpen(o => !o)}>
                <span className="insight-toggle-label">User snapshot</span>
                <span className="insight-toggle-arrow">{insightOpen ? "▴" : "▾"}</span>
              </button>
              {insightOpen && (
                <div className="insight-body">
                  {selectedUser.user_pattern && (
                    <div className="insight-row">
                      <span className="insight-lbl">Pattern</span>
                      <span className="insight-val accent">{selectedUser.user_pattern}</span>
                    </div>
                  )}
                  <div className="insight-row">
                    <span className="insight-lbl">Sessions</span>
                    <span className="insight-val">{selectedUser.session_count ?? 0} completed</span>
                  </div>
                  {selectedUser.last_checkin_response && (
                    <div className="insight-row">
                      <span className="insight-lbl">Last check-in</span>
                      <span className="insight-val">
                        {selectedUser.last_checkin_response === "yes" ? "✓ did it"
                          : selectedUser.last_checkin_response === "tried" ? "~ tried"
                          : selectedUser.last_checkin_response === "not_yet" ? "✗ not yet"
                          : selectedUser.last_checkin_response}
                      </span>
                    </div>
                  )}
                  {themesText(selectedUser) && (
                    <div className="insight-row">
                      <span className="insight-lbl">Themes</span>
                      <span className="insight-val">{themesText(selectedUser)}</span>
                    </div>
                  )}
                  {selectedUser.last_session_action && selectedUser.last_session_action !== "none" && (
                    <div className="insight-row">
                      <span className="insight-lbl">Last action</span>
                      <span className="insight-val">{selectedUser.last_session_action}</span>
                    </div>
                  )}
                  {selectedUser.relationship_facts_summary && (
                    <div className="insight-row">
                      <span className="insight-lbl">Rel. facts</span>
                      <span className="insight-val">{selectedUser.relationship_facts_summary}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {logsLoading ? (
              <div className="loading">Loading conversation…</div>
            ) : logs.length === 0 ? (
              <div className="empty">No conversations logged yet for this user.</div>
            ) : (
              <div className="chat-thread">
                {(() => {
                  const nodes: React.ReactNode[] = [];
                  let lastSession: number | null = null;
                  logs.forEach((log, i) => {
                    if (log.session_number !== lastSession) {
                      nodes.push(
                        <div key={`div-${i}`} className="sess-divider">
                          <div className="divider-line" />
                          <span className="sess-label">Session {log.session_number}</span>
                          <div className="divider-line" />
                        </div>
                      );
                      lastSession = log.session_number;
                    }
                    nodes.push(
                      <div key={log.id ?? i} className="exchange">
                        {log.grace_response && (
                          <div className="bubble-row grace">
                            <div className="bubble grace">{log.grace_response}</div>
                            <span className="bubble-ts">{fmtTime(log.created_at)}</span>
                          </div>
                        )}
                        {log.user_message && (
                          <div className="bubble-row user">
                            <div className="bubble user">{log.user_message}</div>
                            <span className="bubble-ts">{fmtTime(log.created_at)}</span>
                          </div>
                        )}
                      </div>
                    );
                  });
                  return nodes;
                })()}
              </div>
            )}
          </div>

        ) : (
          // ── User list ──
          <div className="adm-inner">
            <div className="adm-header">
              <div className="adm-title">Users ({users.length})</div>
            </div>

            {loading ? (
              <div className="loading">Loading users…</div>
            ) : users.length === 0 ? (
              <div className="empty">No users found.</div>
            ) : (
              <div className="user-list">
                {users.map((user) => {
                  const ci = checkinLabel(user.last_checkin_response);
                  return (
                    <div key={user.id} className="user-card" onClick={() => handleSelectUser(user)}>
                      <div className="user-top">
                        <div className="user-name">{user.name || user.email}</div>
                        {ci && <span className={ci.cls}>{ci.text}</span>}
                      </div>
                      <div className="user-meta">
                        {user.user_pattern && <span className="meta-pill">{user.user_pattern}</span>}
                        <span className="meta-pill">{user.session_count ?? 0} sessions</span>
                        <span className="meta-pill">Last seen {fmtDate(user.last_seen_at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
