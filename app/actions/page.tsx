"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

interface Action {
  id: string;
  text: string;
  sessionNumber: number;
  date: string;
}

export default function Commitments() {
  const [actions, setActions] = useState<Action[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
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
      const user = data.session.user;
      setUserId(user.id);

      const { data: sessions } = await supabase
        .from("sessions")
        .select("id, session_number, action_taken, started_at")
        .eq("user_id", user.id)
        .not("action_taken", "is", null)
        .neq("action_taken", "")
        .order("started_at", { ascending: false });

      if (sessions) {
        setActions(sessions
          .filter(s => s.action_taken?.trim())
          .map(s => ({
            id: s.id,
            text: s.action_taken,
            sessionNumber: s.session_number,
            date: new Date(s.started_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
          }))
        );
      }

      const { data: userData } = await supabase
        .from("users")
        .select("completed_actions")
        .eq("id", user.id)
        .single();

      if (userData?.completed_actions) setCompleted(userData.completed_actions);
      setLoading(false);
    });
  }, []);

  const toggleAction = async (id: string) => {
    if (!userId) return;
    const newCompleted = completed.includes(id)
      ? completed.filter(c => c !== id)
      : [...completed, id];
    setCompleted(newCompleted);
    await supabase.from("users").update({ completed_actions: newCompleted }).eq("id", userId);
  };

  const appHeight = vh > 0 ? `${vh}px` : "100vh";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        html, body { height: 100%; overflow: hidden; background: #0d0e1a; -webkit-font-smoothing: antialiased; }

        .page {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: #0d0e1a; color: rgba(240,235,255,0.95);
          font-family: 'DM Sans', sans-serif;
          display: flex; flex-direction: column; overflow: hidden;
        }

        .bg-orbs { position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .orb { position: absolute; border-radius: 50%; filter: blur(60px); }
        .orb1 { width: 340px; height: 340px; top: -80px; right: -60px; background: radial-gradient(circle, rgba(120,80,200,0.18) 0%, transparent 70%); animation: drift1 18s ease-in-out infinite; }
        .orb2 { width: 280px; height: 280px; bottom: 20%; left: -80px; background: radial-gradient(circle, rgba(60,120,220,0.14) 0%, transparent 70%); animation: drift2 22s ease-in-out infinite; }
        @keyframes drift1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-20px,30px); } }
        @keyframes drift2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(25px,-20px); } }

        .header {
          flex-shrink: 0; position: relative; z-index: 2;
          background: rgba(13,14,26,0.80); border-bottom: 1px solid rgba(255,255,255,0.07);
          padding: 8px 16px; display: flex; align-items: center; gap: 12px;
          backdrop-filter: blur(20px);
        }

        .back-btn {
          background: none; border: none; cursor: pointer;
          color: rgba(160,140,220,0.70); font-size: 14px;
          font-family: 'DM Sans', sans-serif; font-weight: 300;
          padding: 4px 0; display: flex; align-items: center; gap: 4px;
        }

        .header-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px; font-weight: 600;
          color: rgba(240,235,255,0.95);
        }

        .header-sub {
          font-size: 11px; color: rgba(140,130,180,0.60);
          font-weight: 300; margin-top: 1px;
        }

        .scroll-area {
          flex: 1; overflow-y: auto; overflow-x: hidden;
          position: relative; z-index: 1;
          padding: 20px 16px 32px;
          -webkit-overflow-scrolling: touch;
        }
        .scroll-area::-webkit-scrollbar { width: 0; }

        .empty-state {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          height: 60%; gap: 12px;
          color: rgba(140,130,180,0.45);
          font-size: 14px; font-weight: 300;
          font-style: italic; text-align: center; line-height: 1.6;
        }

        .action-item {
          display: flex; align-items: flex-start; gap: 14px;
          padding: 14px 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px; margin-bottom: 10px;
          cursor: pointer; transition: all 0.2s;
        }

        .action-item.done {
          background: rgba(160,120,240,0.06);
          border-color: rgba(160,120,240,0.18);
        }

        .action-item:active { transform: scale(0.99); }

        .checkbox {
          width: 20px; height: 20px; border-radius: 50%;
          border: 1.5px solid rgba(160,120,240,0.35);
          flex-shrink: 0; margin-top: 2px;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.25s;
        }

        .action-item.done .checkbox {
          background: rgba(160,120,240,0.25);
          border-color: rgba(160,120,240,0.55);
        }

        .action-content { flex: 1; }

        .action-text {
          font-size: 14px; font-weight: 300;
          color: rgba(220,210,255,0.85); line-height: 1.55;
        }

        .action-meta {
          font-size: 10px; font-weight: 400;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: rgba(140,130,180,0.35); margin-top: 5px;
        }
      `}</style>

      <div className="page" style={{ height: appHeight }}>
        <div className="bg-orbs">
          <div className="orb orb1" />
          <div className="orb orb2" />
        </div>

        <div className="header">
          <button className="back-btn" onClick={() => router.push("/profile")}>← Back</button>
          <div>
            <div className="header-name">Commitments</div>
            <div className="header-sub">what you said you'd do</div>
          </div>
        </div>

        <div className="scroll-area">
          {loading ? null : actions.length === 0 ? (
            <div className="empty-state">
              <div>No commitments yet.</div>
              <div>When Grace and you agree on something,<br />it'll show up here.</div>
            </div>
          ) : (
            actions.map(action => {
              const isDone = completed.includes(action.id);
              return (
                <div
                  key={action.id}
                  className={`action-item${isDone ? " done" : ""}`}
                  onClick={() => toggleAction(action.id)}
                >
                  <div className="checkbox">
                    {isDone && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="rgba(200,180,255,0.90)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <div className="action-content">
                    <div className="action-text">{action.text}</div>
                    <div className="action-meta">Session {action.sessionNumber} · {action.date}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}