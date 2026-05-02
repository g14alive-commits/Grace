"use client";

export default function PendingPage() {
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
          bottom: -100px; left: -80px;
          background: radial-gradient(circle, rgba(150,80,220,0.45) 0%, transparent 70%);
          animation: drift1 22s ease-in-out infinite;
        }

        .orb2 {
          width: 308px; height: 308px;
          bottom: 15%; right: -60px;
          background: radial-gradient(circle, rgba(80,100,240,0.38) 0%, transparent 70%);
          animation: drift2 26s ease-in-out infinite;
        }

        .orb3 {
          width: 224px; height: 224px;
          top: 55%; left: 20%;
          background: radial-gradient(circle, rgba(200,80,160,0.28) 0%, transparent 70%);
          animation: drift3 18s ease-in-out infinite;
        }

        @keyframes drift1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(18px, 28px); }
        }

        @keyframes drift2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-18px, -22px); }
        }

        @keyframes drift3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-18px, -14px); }
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
          margin-bottom: 48px;
        }

        .main-text {
          font-family: 'Cormorant Garamond', serif;
          font-size: 30px;
          font-weight: 400;
          color: rgba(245,238,255,0.97);
          margin-bottom: 18px;
          letter-spacing: 0.01em;
        }

        .sub-text {
          font-size: 15px;
          font-weight: 300;
          line-height: 1.70;
          color: rgba(200,185,230,0.80);
          max-width: 280px;
          text-align: center;
          white-space: normal;
          word-wrap: break-word;
        }
      `}</style>

      <div className="page">
        <div className="bg-orbs" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", zIndex: 0 }}>
          <div className="orb orb1" />
          <div className="orb orb2" />
          <div className="orb orb3" />
        </div>

        <div className="content">
          <div className="logo">attune</div>
          <div className="main-text">You're on the list.</div>
          <div className="sub-text">
            We're opening spots carefully. We'll reach out personally when yours opens — it won't be long.
          </div>
        </div>
      </div>
    </>
  );
}