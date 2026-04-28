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
          filter: blur(80px);
        }

        .orb1 {
          width: 380px; height: 380px;
          top: -100px; left: -60px;
          background: radial-gradient(circle, rgba(120,80,200,0.22) 0%, transparent 70%);
          animation: drift1 22s ease-in-out infinite;
        }

        .orb2 {
          width: 300px; height: 300px;
          bottom: 10%; right: -80px;
          background: radial-gradient(circle, rgba(80,100,220,0.18) 0%, transparent 70%);
          animation: drift2 26s ease-in-out infinite;
        }

        @keyframes drift1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(18px, 28px); }
        }

        @keyframes drift2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-18px, -22px); }
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
          color: rgba(240,235,255,0.92);
          margin-bottom: 18px;
          letter-spacing: 0.01em;
        }

        .sub-text {
          font-size: 15px;
          font-weight: 300;
          line-height: 1.70;
          color: rgba(160,150,200,0.60);
          max-width: 280px;
          text-align: center;
          white-space: normal;
          word-wrap: break-word;
        }
      `}</style>

      <div className="page">
        <div className="bg-orbs">
          <div className="orb orb1" />
          <div className="orb orb2" />
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
