"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSending(true);
    setError(false);

    try {
      const res = await fetch("https://formspree.io/f/mkokboda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        setError(true);
      }
    } catch (e) {
      setError(true);
    }

    setSending(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:opsz,wght@9..40,300;9..40,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        html, body { height: 100%; overflow: hidden; background: #0d0e1a; -webkit-font-smoothing: antialiased; }

        .page {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: #0d0e1a; color: rgba(240,235,255,0.95);
          font-family: 'DM Sans', sans-serif;
          display: flex; flex-direction: column; overflow: hidden;
        }

        .bg-orbs { position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 0; }
        .orb { position: absolute; border-radius: 50%; }
        .orb1 { width: 392px; height: 392px; bottom: -80px; left: -60px; background: radial-gradient(circle, rgba(150,80,220,0.45) 0%, transparent 70%); animation: drift1 20s ease-in-out infinite; }
        .orb2 { width: 308px; height: 308px; bottom: 20%; right: -80px; background: radial-gradient(circle, rgba(80,100,240,0.38) 0%, transparent 70%); animation: drift2 24s ease-in-out infinite; }
        .orb3 { width: 224px; height: 224px; top: 58%; left: 20%; background: radial-gradient(circle, rgba(200,80,160,0.28) 0%, transparent 70%); animation: drift3 17s ease-in-out infinite; }
        @keyframes drift1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-15px,20px); } }
        @keyframes drift2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(20px,-15px); } }
        @keyframes drift3 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(14px,18px); } }

        .header {
          flex-shrink: 0; position: relative; z-index: 2;
          background: rgba(13,14,26,0.80); border-bottom: 1px solid rgba(255,255,255,0.07);
          padding: 8px 16px; display: flex; align-items: center; gap: 12px;
          backdrop-filter: blur(20px);
        }

        .back-btn {
          background: none; border: none; cursor: pointer;
          color: rgba(150,100,255,0.85); font-size: 14px;
          font-family: 'DM Sans', sans-serif; font-weight: 400;
          padding: 4px 0;
        }

        .header-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px; font-weight: 600;
          color: rgba(240,235,255,0.95);
        }

        .scroll {
          flex: 1; overflow-y: auto; padding: 32px 24px 40px;
          position: relative; z-index: 1;
        }
        .scroll::-webkit-scrollbar { width: 0; }

        .title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px; font-weight: 300;
          color: rgba(240,235,255,0.95);
          margin-bottom: 8px;
        }

        .subtitle {
          font-size: 14px; font-weight: 300;
          color: rgba(140,130,180,0.60);
          line-height: 1.6; margin-bottom: 32px;
        }

        .field-label {
          font-size: 10px; font-weight: 500;
          letter-spacing: 0.10em; text-transform: uppercase;
          color: rgba(140,130,180,0.55); margin-bottom: 8px;
        }

        .field {
          width: 100%;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px; padding: 13px 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px; font-weight: 300;
          color: rgba(240,235,255,0.95);
          outline: none; transition: border-color 0.2s;
          margin-bottom: 16px;
        }

        .field:focus { border-color: rgba(150,100,255,0.45); }
        .field::placeholder { color: rgba(140,130,180,0.45); }

        textarea.field {
          resize: none; min-height: 120px; line-height: 1.6;
        }

        .send-btn {
          width: 100%; padding: 16px; border-radius: 14px;
          background: linear-gradient(145deg, #b070ff 0%, #7040e0 50%, #4020c0 100%);
          border: none;
          color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px; font-weight: 400;
          cursor: pointer; transition: opacity 0.2s, transform 0.15s;
          letter-spacing: 0.02em;
          box-shadow: 0 0 16px rgba(160,120,240,0.25);
          margin-top: 8px;
        }

        .send-btn:disabled { opacity: 0.35; cursor: default; box-shadow: none; }
        .send-btn:not(:disabled):active { transform: scale(0.98); }

        .sent-state {
          text-align: center; padding: 40px 0;
        }

        .sent-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px; font-weight: 300;
          color: rgba(240,235,255,0.95);
          margin-bottom: 12px;
        }

        .sent-body {
          font-size: 14px; font-weight: 300;
          color: rgba(140,130,180,0.60);
          line-height: 1.7;
        }

        .error-text {
          font-size: 13px; color: rgba(240,100,100,0.80);
          margin-top: 8px; text-align: center;
        }
      `}</style>

      <div className="page">
        <div className="bg-orbs">
          <div className="orb orb1" />
          <div className="orb orb2" />
          <div className="orb orb3" />
        </div>

        <div className="header">
          <button className="back-btn" onClick={() => router.push("/profile")}>← </button>
          <div className="header-name">Contact Us</div>
        </div>

        <div className="scroll">
          {!sent ? (
            <>
              <div className="title">Get in touch.</div>
              <div className="subtitle">
                We're a small team building something we genuinely care about.{"\n"}
                Questions, feedback, or something Grace helped you with — we'd love to hear it.
              </div>

              <div className="field-label">Your name (optional)</div>
              <input
                className="field"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What should we call you?"
              />

              <div className="field-label">Your email (optional)</div>
              <input
                className="field"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="If you'd like a reply"
              />

              <div className="field-label">Message</div>
              <textarea
                className="field"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's on your mind?"
              />

              {error && (
                <div className="error-text">Something went wrong. Please try again.</div>
              )}

              <button
                className="send-btn"
                onClick={handleSubmit}
                disabled={sending || !message.trim()}
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </>
          ) : (
            <div className="sent-state">
              <div className="sent-title">Thank you.</div>
              <div className="sent-body">
                We got your message and we'll read every word.{"\n"}
                If you left an email, we'll get back to you.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}