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
          background: #0d0e1a;
          -webkit-font-smoothing: antialiased;
        }

        .page {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: #0d0e1a;
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
        }

        .orb1 {
          width: 392px; height: 392px;
          bottom: -80px; right: -60px;
          background: radial-gradient(circle, rgba(150,80,220,0.45) 0%, transparent 70%);
          animation: drift1 22s ease-in-out infinite;
        }

        .orb2 {
          width: 308px; height: 308px;
          bottom: 20%; left: -80px;
          background: radial-gradient(circle, rgba(80,100,240,0.38) 0%, transparent 70%);
          animation: drift2 26s ease-in-out infinite;
        }

        .orb3 {
          width: 224px; height: 224px;
          top: 60%; right: 15%;
          background: radial-gradient(circle, rgba(200,80,160,0.28) 0%, transparent 70%);
          animation: drift3 18s ease-in-out infinite;
        }

        @keyframes drift3 {
          0%, 100% { transform: translate(0,0); }
          50% { transform: translate(-14px, 18px); }
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
          background: linear-gradient(145deg, #b070ff 0%, #7040e0 50%, #4020c0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: 0.02em;
          margin-bottom: 10px;
          display: inline-block;
        }

        .tagline {
          font-size: 14px;
          font-weight: 300;
          color: rgba(200,185,230,0.75);
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
          color: rgba(200,185,230,0.80);
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
        }

        .login-btn:disabled {
          opacity: 0.35;
          cursor: default;
          box-shadow: none;
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
          <div className="orb orb3" />
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
                Can't find it? Check your spam or junk folder.
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
                No password needed — we'll send you a link.
                <br />
                Check spam if it doesn't arrive in a minute.
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}