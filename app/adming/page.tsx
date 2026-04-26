"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

const ADMIN_PASSWORD = "grace2024admin";

type User = {
  id: string;
  email: string;
  name: string | null;
  user_pattern: string | null;
  session_count: number | null;
  last_seen_at: string | null;
};

type Log = {
  id: string;
  session_number: number;
  user_message: string;
  grace_response: string;
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

  const handleLogin = async () => {
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
      setPwError(false);
      setLoading(true);
      const res = await fetch("/api/admin");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
      setLoading(false);
    } else {
      setPwError(true);
    }
  };

  const handleSelectUser = async (user: User) => {
    setSelectedUser(user);
    setLogsLoading(true);
    const res = await fetch(`/api/admin?userId=${encodeURIComponent(user.id)}`);
    const data = await res.json();
    setLogs(Array.isArray(data) ? data : []);
    setLogsLoading(false);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:opsz,wght@9..40,300;9..40,400&display=swap');

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-tap-highlight-color: transparent;
        }

        html, body {
          min-height: 100%;
          background: #0d0e1a;
          -webkit-font-smoothing: antialiased;
        }

        .adm-page {
          min-height: 100vh;
          background: #0d0e1a;
          font-family: 'DM Sans', sans-serif;
          color: rgba(245,238,255,0.95);
        }

        /* ── Password gate ── */
        .gate {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 40px 24px;
        }

        .gate-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 32px;
          font-weight: 300;
          color: rgba(245,238,255,0.90);
          margin-bottom: 6px;
          letter-spacing: 0.02em;
        }

        .gate-sub {
          font-size: 13px;
          color: rgba(160,150,200,0.50);
          margin-bottom: 36px;
          letter-spacing: 0.03em;
        }

        .gate-form {
          width: 100%;
          max-width: 340px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .input-wrap {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 14px;
          padding: 14px 18px;
          transition: border-color 0.2s;
        }

        .input-wrap:focus-within {
          border-color: rgba(160,120,240,0.45);
        }

        .input-wrap.err {
          border-color: rgba(240,100,100,0.50);
        }

        input {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          font-weight: 300;
          color: rgba(240,235,255,0.95);
        }

        input::placeholder {
          color: rgba(140,130,180,0.55);
        }

        .btn {
          width: 100%;
          padding: 15px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(160,120,240,0.25) 0%, rgba(120,80,200,0.20) 100%);
          border: 1px solid rgba(160,120,240,0.30);
          color: rgba(210,190,255,0.95);
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 400;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.02em;
        }

        .btn:active { transform: scale(0.98); }

        .error-msg {
          font-size: 13px;
          color: rgba(255,130,130,0.80);
          text-align: center;
          margin-top: -4px;
        }

        /* ── Admin inner ── */
        .adm-inner {
          max-width: 720px;
          margin: 0 auto;
          padding: 40px 20px 80px;
        }

        .adm-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 28px;
        }

        .adm-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px;
          font-weight: 300;
          color: rgba(245,238,255,0.90);
          letter-spacing: 0.02em;
        }

        .back-btn {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          padding: 8px 16px;
          color: rgba(200,190,240,0.80);
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.18s;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .back-btn:active { transform: scale(0.97); }

        /* ── User list ── */
        .user-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .user-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 14px;
          padding: 16px 18px;
          cursor: pointer;
          transition: background 0.18s, border-color 0.18s;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .user-card:hover {
          background: rgba(160,120,240,0.08);
          border-color: rgba(160,120,240,0.25);
        }

        .user-card:active { transform: scale(0.995); }

        .user-name {
          font-size: 15px;
          font-weight: 400;
          color: rgba(240,235,255,0.90);
        }

        .user-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .meta-pill {
          font-size: 12px;
          color: rgba(160,150,210,0.65);
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          padding: 3px 10px;
        }

        /* ── Chat thread ── */
        .chat-thread {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .session-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 6px 0;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.08);
        }

        .session-label {
          font-size: 11px;
          color: rgba(160,150,200,0.45);
          letter-spacing: 0.06em;
          white-space: nowrap;
        }

        .exchange {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .bubble-row { display: flex; }
        .bubble-row.user { justify-content: flex-end; }
        .bubble-row.grace { justify-content: flex-start; }

        .bubble {
          max-width: 78%;
          padding: 10px 14px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 300;
          line-height: 1.58;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .bubble.user {
          background: rgba(110,80,200,0.35);
          border: 1px solid rgba(140,100,240,0.28);
          color: rgba(230,220,255,0.92);
          border-bottom-right-radius: 4px;
        }

        .bubble.grace {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.10);
          color: rgba(210,205,230,0.88);
          border-bottom-left-radius: 4px;
        }

        .loading {
          text-align: center;
          padding: 60px 0;
          color: rgba(160,150,200,0.55);
          font-size: 14px;
        }

        .empty {
          text-align: center;
          padding: 60px 0;
          color: rgba(160,150,200,0.40);
          font-size: 14px;
        }

        @media (max-width: 480px) {
          .adm-inner { padding: 24px 16px 80px; }
          .bubble { max-width: 88%; font-size: 13.5px; }
          .adm-title { font-size: 20px; }
        }
      `}</style>

      <div className="adm-page">
        {!authed ? (
          // ── Password gate ──
          <div className="gate">
            <div className="gate-title">Admin</div>
            <div className="gate-sub">attune admin panel</div>
            <div className="gate-form">
              <div className={`input-wrap${pwError ? " err" : ""}`}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPwError(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLogin();
                  }}
                  placeholder="Password"
                  autoFocus
                />
              </div>
              {pwError && <div className="error-msg">Incorrect password</div>}
              <button className="btn" onClick={handleLogin}>
                Enter
              </button>
            </div>
          </div>
        ) : selectedUser ? (
          // ── Conversation view ──
          <div className="adm-inner">
            <div className="adm-header">
              <button
                className="back-btn"
                onClick={() => {
                  setSelectedUser(null);
                  setLogs([]);
                }}
              >
                ← Back
              </button>
              <div className="adm-title">
                {selectedUser.name || selectedUser.email}
              </div>
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
                        <div key={`div-${i}`} className="session-divider">
                          <div className="divider-line" />
                          <div className="session-label">
                            SESSION {log.session_number}
                          </div>
                          <div className="divider-line" />
                        </div>
                      );
                      lastSession = log.session_number;
                    }
                    nodes.push(
                      <div key={log.id ?? i} className="exchange">
                        {log.user_message && (
                          <div className="bubble-row user">
                            <div className="bubble user">{log.user_message}</div>
                          </div>
                        )}
                        {log.grace_response && (
                          <div className="bubble-row grace">
                            <div className="bubble grace">
                              {log.grace_response}
                            </div>
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
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="user-card"
                    onClick={() => handleSelectUser(user)}
                  >
                    <div className="user-name">
                      {user.name || user.email}
                    </div>
                    <div className="user-meta">
                      {user.user_pattern && (
                        <span className="meta-pill">{user.user_pattern}</span>
                      )}
                      <span className="meta-pill">
                        {user.session_count ?? 0} sessions
                      </span>
                      <span className="meta-pill">
                        Last seen {formatDate(user.last_seen_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
