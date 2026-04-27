"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

type Status = "idle" | "submitting" | "success" | "duplicate" | "error";

export default function WaitlistPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || status === "submitting") return;
    setStatus("submitting");

    const { error } = await supabase.from("waitlist").insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      reason: reason.trim() || null,
    });

    if (!error) {
      setStatus("success");
      return;
    }

    if (error.code === "23505") {
      setStatus("duplicate");
      return;
    }

    setStatus("error");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400&display=swap');

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

        .page {
          min-height: 100vh;
          background: #0d0e1a;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 28px 80px;
          font-family: 'DM Sans', sans-serif;
          position: relative;
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
          filter: blur(80px);
        }

        .orb1 {
          width: 420px; height: 420px;
          top: -120px; right: -80px;
          background: radial-gradient(circle, rgba(120,80,200,0.28) 0%, transparent 70%);
          animation: drift1 20s ease-in-out infinite;
        }

        .orb2 {
          width: 320px; height: 320px;
          bottom: 5%; left: -100px;
          background: radial-gradient(circle, rgba(60,100,220,0.22) 0%, transparent 70%);
          animation: drift2 26s ease-in-out infinite;
        }

        .orb3 {
          width: 240px; height: 240px;
          bottom: 20%; right: 5%;
          background: radial-gradient(circle, rgba(200,90,150,0.16) 0%, transparent 70%);
          animation: drift3 18s ease-in-out infinite;
        }

        @keyframes drift1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-18px, 28px) scale(1.04); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(24px, -20px) scale(1.06); }
        }
        @keyframes drift3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, -28px) scale(1.08); }
        }

        .content {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .logo {
          font-family: 'Cormorant Garamond', serif;
          font-size: 44px;
          font-weight: 300;
          color: rgba(245,238,255,0.95);
          letter-spacing: 0.02em;
          margin-bottom: 6px;
        }

        .logo-sub {
          font-size: 13px;
          font-weight: 300;
          color: rgba(160,150,200,0.50);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 44px;
        }

        .headline {
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px;
          font-weight: 400;
          font-style: italic;
          color: rgba(235,228,255,0.92);
          line-height: 1.35;
          margin-bottom: 14px;
          letter-spacing: 0.01em;
        }

        .subtext {
          font-size: 15px;
          font-weight: 300;
          line-height: 1.70;
          color: rgba(170,160,210,0.65);
          margin-bottom: 44px;
          max-width: 360px;
        }

        .form {
          width: 100%;
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
          text-align: left;
        }

        .input-wrap:focus-within {
          border-color: rgba(150,100,255,0.65);
        }

        .input-label {
          display: block;
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(160,140,220,0.45);
          margin-bottom: 5px;
        }

        input, textarea {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 300;
          color: rgba(240,235,255,0.95);
          resize: none;
        }

        input::placeholder, textarea::placeholder {
          color: rgba(140,130,180,0.45);
        }

        textarea {
          min-height: 72px;
          line-height: 1.60;
        }

        .optional-tag {
          font-size: 10px;
          color: rgba(140,130,180,0.40);
          letter-spacing: 0.04em;
          margin-left: 6px;
          text-transform: none;
          font-weight: 300;
        }

        .submit-btn {
          width: 100%;
          padding: 16px;
          border-radius: 14px;
          background: linear-gradient(145deg, #b070ff 0%, #7040e0 50%, #4020c0 100%);
          border: none;
          color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 400;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          letter-spacing: 0.02em;
          box-shadow: 0 0 16px rgba(160,120,240,0.25);
          margin-top: 4px;
        }

        .submit-btn:disabled {
          opacity: 0.35;
          cursor: default;
          box-shadow: none;
        }

        .submit-btn:not(:disabled):active {
          transform: scale(0.98);
        }

        .confirmation {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          animation: fadeIn 0.4s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .confirmation-icon {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: rgba(150,100,255,0.18);
          border: 1px solid rgba(150,100,255,0.60);
          box-shadow: 0 0 20px rgba(160,120,240,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px;
          font-weight: 600;
          color: rgba(200,180,255,0.90);
          margin-bottom: 8px;
        }

        .confirmation-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          font-weight: 400;
          color: rgba(245,238,255,0.92);
          letter-spacing: 0.01em;
        }

        .confirmation-body {
          font-size: 15px;
          font-weight: 300;
          line-height: 1.70;
          color: rgba(170,160,210,0.70);
          max-width: 320px;
          text-align: center;
        }

        .already-msg {
          font-size: 15px;
          font-weight: 300;
          color: rgba(200,180,255,0.75);
          line-height: 1.65;
          text-align: center;
          margin-top: 8px;
        }

        .error-msg {
          font-size: 13px;
          color: rgba(255,130,130,0.75);
          text-align: center;
          margin-top: -4px;
        }

        @media (max-width: 480px) {
          .page { padding: 52px 20px 72px; }
          .logo { font-size: 36px; }
          .headline { font-size: 22px; }
        }
      `}</style>

      <div className="page">
        <div className="bg-orbs">
          <div className="orb orb1" />
          <div className="orb orb2" />
          <div className="orb orb3" />
        </div>

        <div className="content">
          <div className="logo">attune</div>
          <div className="logo-sub">powered by Grace</div>

          {status === "success" ? (
            <div className="confirmation">
              <div className="confirmation-icon">G</div>
              <div className="confirmation-title">You're on the list.</div>
              <div className="confirmation-body">
                We'll reach out personally when your spot opens.
              </div>
            </div>
          ) : status === "duplicate" ? (
            <div className="confirmation">
              <div className="confirmation-icon">G</div>
              <div className="confirmation-title">Already saved.</div>
              <div className="already-msg">
                You're already on the list.<br />We'll be in touch.
              </div>
            </div>
          ) : (
            <>
              <div className="headline">
                Grace is in early access.<br />Request your spot.
              </div>
              <div className="subtext">
                A small group of people are using Grace right now. We're opening spots carefully — one person at a time.
              </div>

              <div className="form">
                <div className="input-wrap">
                  <label className="input-label">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </div>

                <div className="input-wrap">
                  <label className="input-label">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>

                <div className="input-wrap">
                  <label className="input-label">
                    What's been hardest in your relationship lately?
                    <span className="optional-tag">optional</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Share as little or as much as you'd like…"
                  />
                </div>

                {status === "error" && (
                  <div className="error-msg">Something went wrong. Please try again.</div>
                )}

                <button
                  className="submit-btn"
                  onClick={handleSubmit}
                  disabled={!name.trim() || !email.trim() || status === "submitting"}
                >
                  {status === "submitting" ? "Saving your spot…" : "Request early access"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
