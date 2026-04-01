"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vh, setVh] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const setHeight = () => setVh(window.innerHeight);
    setHeight();
    window.addEventListener("resize", setHeight);
    return () => window.removeEventListener("resize", setHeight);
  }, []);

  useEffect(() => {
    // If already logged in, go straight to chat
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/chat");
    });
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || loading) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (!error) setSent(true);
    setLoading(false);
  };

  const appHeight = vh > 0 ? `${vh}px` : "100vh";

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
          height: 100%;
          overflow: hidden;
          background: #110f1e;
          -webkit-font-smoothing: antialiased;
        }

        .page {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: #110f1e;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 32px;
          font-family: 'DM Sans', sans-serif;
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
          width: 380px; height: 380px;
          top: -100px; left: -60px;
          background: radial-gradient(circle, rgba(180,100,120,0.16) 0%, transparent 70%);
          animation: drift1 22s ease-in-out infinite;
        }

        .orb2 {
          width: 300px; height: 300px;
          bottom: 10%; right: -80px;
          background: radial-gradient(circle, rgba(120,80,200,0.14) 0%, transparent 70%);
          animation: drift2 26s ease-in-out infinite;
        }

        @keyframes drift1 {
          0%, 100% { transform: translate(0,0); }
          50% { transform: translate(20px,30px); }
        }

        @keyframes drift2 {
          0%, 100% { transform: translate(0,0); }
          50% { transform: translate(-20px,-25px); }
        }

        .content {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 380px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .logo {
          font-family: 'Cormorant Garamond', serif;
          font-size: 42px;
          font-weight: 300;
          color: rgba(245,238,255,0.95);
          letter-spacing: 0.02em;
          margin-bottom: 10px;
        }

        .tagline {
          font-size: 14px;
          font-weight: 300;
          color: rgba(180,170,220,0.55);
          margin-bottom: 52px;
          letter-spacing: 0.03em;
        }

        .sent-message {
          text-align: center;
        }

        .sent-icon {
          font-size: 36px;
          margin-bottom: 20px;
        }

        .sent-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px;
          font-weight: 300;
          color: rgba(245,238,255,0.95);
          margin-bottom: 12px;
        }

        .sent-body {
          font-size: 15px;
          font-weight: 300;
          color: rgba(180,170,220,0.65);
          line-height: 1.65;
        }

        .sent-email {
          color: rgba(200,180,255,0.85);
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
        }

        .input-wrap:focus-within {
          border-color: rgba(160,120,240,0.45);
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

        .login-btn {
          width: 100%;
          padding: 16px;
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

        .login-btn:disabled {
          opacity: 0.35;
          cursor: default;
        }

        .login-btn:not(:disabled):active {
          transform: scale(0.98);
        }

        .privacy {
          margin-top: 20px;
          font-size: 12px;
          font-weight: 300;
          color: rgba(140,130,180,0.40);
          line-height: 1.5;
          text-align: center;
        }
      `}</style>

      <div className="page" style={{ height: appHeight }}>
        <div className="bg-orbs">
          <div className="orb orb1" />
          <div className="orb orb2" />
        </div>

        <div className="content">
          <div className="logo">attune</div>
          <div className="tagline">Feel steadier. Connect better.</div>

          {sent ? (
            <div className="sent-message">
              <div className="sent-icon">✉️</div>
              <div className="sent-title">Check your email</div>
              <div className="sent-body">
                We sent a login link to{" "}
                <span className="sent-email">{email}</span>.
                <br /><br />
                Tap the link in the email to enter Attune.
                <br />
                The link expires in 24 hours.
              </div>
            </div>
          ) : (
            <>
              <div className="form">
                <div className="input-wrap">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
                    placeholder="Enter your email"
                    autoComplete="email"
                  />
                </div>
                <button
                  className="login-btn"
                  onClick={handleLogin}
                  disabled={loading || !email.trim()}
                >
                  {loading ? "Sending..." : "Send login link"}
                </button>
              </div>
              <div className="privacy">
                No password needed. We'll send you a secure link.
                <br />
                Your data is private and never shared.
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}