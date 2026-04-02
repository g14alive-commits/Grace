"use client";
import { useRouter } from "next/navigation";

export default function Privacy() {
  const router = useRouter();
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=DM+Sans:opsz,wght@9..40,300;9..40,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: #0d0e1a; -webkit-font-smoothing: antialiased; }
        .page { min-height: 100vh; background: #0d0e1a; color: rgba(240,235,255,0.95); font-family: 'DM Sans', sans-serif; padding: 0; }
        .header { padding: 52px 24px 20px; display: flex; align-items: center; gap: 16px; border-bottom: 1px solid rgba(255,255,255,0.07); }
        .back-btn { background: none; border: none; color: rgba(160,140,220,0.70); cursor: pointer; font-size: 20px; padding: 0; }
        .header-title { font-family: 'Cormorant Garamond', serif; font-size: 21px; font-weight: 400; color: rgba(240,235,255,0.95); }
        .content { padding: 28px 24px 60px; max-width: 600px; }
        h2 { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 400; color: rgba(240,235,255,0.90); margin: 24px 0 10px; }
        p { font-size: 15px; font-weight: 300; line-height: 1.75; color: rgba(180,170,220,0.70); margin-bottom: 12px; }
      `}</style>
      <div className="page">
        <div className="header">
          <button className="back-btn" onClick={() => router.back()}>←</button>
          <div className="header-title">Privacy Policy</div>
        </div>
        <div className="content">
          <p>Last updated: April 2026</p>
          <h2>What we collect</h2>
          <p>We collect your email address for login, and the conversations you have with Grace. We also collect basic profile information you choose to provide such as your name and relationship status.</p>
          <h2>How we use it</h2>
          <p>Your conversations are used only to power Grace's responses and build her memory of you across sessions. We do not sell your data. We do not share it with third parties.</p>
          <h2>Your data</h2>
          <p>You can remove all your history or delete your account at any time from your Profile page. Deletion is permanent and immediate.</p>
          <h2>AI and data</h2>
          <p>Conversations with Grace are processed by Anthropic's API. Anthropic's privacy policy applies to that processing. We do not use your conversations to train any AI models.</p>
          <h2>Contact</h2>
          <p>If you have any questions about your data, please reach out to us through the app.</p>
        </div>
      </div>
    </>
  );
}