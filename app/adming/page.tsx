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
};

type Session = {
  id: string;
  session_number: number;
  headline: string | null;
  summary: string | null;
  action_taken: string | null;
  key_insight: string | null;
  growth_signals: string[] | null;
  is_complete: boolean;
  completed_at: string | null;
  action_completed: boolean;
  started_at: string | null;
};

type Stats = {
  totalUsers: number;
  totalCompleted: number;
  totalCheckins: number;
  yes: number;
  tried: number;
  notYet: number;
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const handleLogin = async () => {
    if (password !== ADMIN_PASSWORD) { setPwError(true); return; }
    setAuthed(true);
    setPwError(false);
    setLoading(true);
    const [usersRes, statsRes] = await Promise.all([
      fetch("/api/admin"),
      fetch("/api/admin?stats=true"),
    ]);
    const [usersData, statsData] = await Promise.all([usersRes.json(), statsRes.json()]);
    setUsers(Array.isArray(usersData) ? usersData : []);
    setStats(statsData);
    setLoading(false);
  };

  const handleSelectUser = async (user: User) => {
    setSelectedUser(user);
    setSessionsLoading(true);
    const res = await fetch(`/api/admin?userId=${encodeURIComponent(user.id)}`);
    const data = await res.json();
    setSessions(Array.isArray(data) ? data : []);
    setSessionsLoading(false);
  };

  const fmtDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const checkinLabel = (r: string | null) => {
    if (r === "yes") return { text: "✓ did it", cls: "ci-yes" };
    if (r === "tried") return { text: "~ tried", cls: "ci-tried" };
    if (r === "not_yet") return { text: "✗ not yet", cls: "ci-no" };
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
        .adm-inner { max-width: 760px; margin: 0 auto; padding: 36px 20px 80px; }
        .adm-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
        .adm-title { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 300; color: rgba(245,238,255,0.90); letter-spacing: 0.02em; }
        .back-btn { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 7px 14px; color: rgba(200,190,240,0.80); font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer; transition: all 0.18s; white-space: nowrap; flex-shrink: 0; }
        .back-btn:active { transform: scale(0.97); }

        /* Stats bar */
        .stats-bar { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 28px; }
        .stat-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px 10px; text-align: center; }
        .stat-num { font-size: 22px; font-weight: 400; color: rgba(220,210,255,0.92); line-height: 1; margin-bottom: 4px; }
        .stat-lbl { font-size: 9px; font-weight: 400; letter-spacing: 0.07em; text-transform: uppercase; color: rgba(140,130,180,0.50); }
        .stat-card.yes .stat-num { color: rgba(100,220,140,0.85); }
        .stat-card.tried .stat-num { color: rgba(220,180,80,0.85); }
        .stat-card.no .stat-num { color: rgba(220,100,100,0.75); }

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

        /* Session cards */
        .session-list { display: flex; flex-direction: column; gap: 12px; }
        .sess-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); border-radius: 14px; padding: 16px 18px; }
        .sess-card.complete-action { background: rgba(60,180,100,0.05); border-color: rgba(80,200,120,0.18); }
        .sess-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; gap: 10px; }
        .sess-num { font-size: 10px; font-weight: 500; letter-spacing: 0.09em; text-transform: uppercase; color: rgba(160,140,220,0.45); white-space: nowrap; }
        .sess-date { font-size: 11px; color: rgba(140,130,180,0.40); white-space: nowrap; }
        .sess-badges { display: flex; gap: 6px; align-items: center; }
        .badge-done { font-size: 10px; color: rgba(100,220,140,0.80); background: rgba(80,200,120,0.10); border: 1px solid rgba(80,200,120,0.22); border-radius: 6px; padding: 1px 7px; }
        .badge-incomplete { font-size: 10px; color: rgba(160,150,200,0.45); background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 1px 7px; }
        .sess-headline { font-family: 'Cormorant Garamond', serif; font-size: 17px; font-weight: 400; font-style: italic; color: rgba(225,215,255,0.88); line-height: 1.3; margin-bottom: 12px; }
        .sess-field { margin-bottom: 9px; }
        .sess-field-label { font-size: 9px; font-weight: 500; letter-spacing: 0.09em; text-transform: uppercase; color: rgba(160,140,220,0.40); margin-bottom: 3px; }
        .sess-field-value { font-size: 13px; font-weight: 300; line-height: 1.60; color: rgba(190,182,220,0.80); }
        .action-row { display: flex; align-items: flex-start; gap: 8px; }
        .action-tick { font-size: 14px; color: rgba(100,220,140,0.90); flex-shrink: 0; margin-top: 1px; }
        .action-cross { font-size: 14px; color: rgba(200,90,90,0.70); flex-shrink: 0; margin-top: 1px; }
        .growth-pills { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 3px; }
        .growth-pill { font-size: 11px; color: rgba(140,210,160,0.75); background: rgba(80,180,110,0.08); border: 1px solid rgba(80,180,110,0.18); border-radius: 6px; padding: 2px 8px; }

        .loading { text-align: center; padding: 60px 0; color: rgba(160,150,200,0.55); font-size: 14px; }
        .empty { text-align: center; padding: 60px 0; color: rgba(160,150,200,0.40); font-size: 14px; }

        @media (max-width: 560px) {
          .adm-inner { padding: 24px 14px 60px; }
          .stats-bar { grid-template-columns: repeat(3, 1fr); }
          .adm-title { font-size: 19px; }
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
          // ── Session detail view ──
          <div className="adm-inner">
            <div className="adm-header">
              <button className="back-btn" onClick={() => { setSelectedUser(null); setSessions([]); }}>← Users</button>
              <div className="adm-title">{selectedUser.name || selectedUser.email}</div>
            </div>

            {sessionsLoading ? (
              <div className="loading">Loading sessions…</div>
            ) : sessions.length === 0 ? (
              <div className="empty">No sessions yet for this user.</div>
            ) : (
              <div className="session-list">
                {sessions.map((s) => (
                  <div key={s.id} className={`sess-card${s.action_completed ? " complete-action" : ""}`}>
                    <div className="sess-head">
                      <span className="sess-num">Session #{s.session_number}</span>
                      <div className="sess-badges">
                        <span className="sess-date">{fmtDate(s.started_at)}</span>
                        <span className={s.is_complete ? "badge-done" : "badge-incomplete"}>
                          {s.is_complete ? "complete" : "incomplete"}
                        </span>
                      </div>
                    </div>

                    {s.headline && (
                      <div className="sess-headline">{s.headline}</div>
                    )}

                    {s.summary && (
                      <div className="sess-field">
                        <div className="sess-field-label">Summary</div>
                        <div className="sess-field-value">{s.summary}</div>
                      </div>
                    )}

                    {s.key_insight && s.key_insight !== "none" && (
                      <div className="sess-field">
                        <div className="sess-field-label">Key insight</div>
                        <div className="sess-field-value">{s.key_insight}</div>
                      </div>
                    )}

                    {s.action_taken && s.action_taken !== "none" && (
                      <div className="sess-field">
                        <div className="sess-field-label">Action taken</div>
                        <div className="action-row">
                          <span className={s.action_completed ? "action-tick" : "action-cross"}>
                            {s.action_completed ? "✓" : "✗"}
                          </span>
                          <div className="sess-field-value">{s.action_taken}</div>
                        </div>
                      </div>
                    )}

                    {s.growth_signals && s.growth_signals.length > 0 && (
                      <div className="sess-field">
                        <div className="sess-field-label">Growth signals</div>
                        <div className="growth-pills">
                          {s.growth_signals.map((g, i) => (
                            <span key={i} className="growth-pill">{g}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        ) : (
          // ── User list ──
          <div className="adm-inner">
            <div className="adm-header">
              <div className="adm-title">Users ({users.length})</div>
            </div>

            {stats && (
              <div className="stats-bar">
                <div className="stat-card">
                  <div className="stat-num">{stats.totalUsers}</div>
                  <div className="stat-lbl">Users</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num">{stats.totalCompleted}</div>
                  <div className="stat-lbl">Sessions</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num">{stats.totalCheckins}</div>
                  <div className="stat-lbl">Checkins</div>
                </div>
                <div className="stat-card yes">
                  <div className="stat-num">{stats.yes}</div>
                  <div className="stat-lbl">Did it</div>
                </div>
                <div className="stat-card tried">
                  <div className="stat-num">{stats.tried}</div>
                  <div className="stat-lbl">Tried</div>
                </div>
                <div className="stat-card no">
                  <div className="stat-num">{stats.notYet}</div>
                  <div className="stat-lbl">Not yet</div>
                </div>
              </div>
            )}

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
                        {user.user_pattern && (
                          <span className="meta-pill">{user.user_pattern}</span>
                        )}
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
