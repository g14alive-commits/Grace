"use client";

import { supabase } from "../lib/supabase";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

function RippleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripplesRef = useRef<{ x: number; y: number; r: number; alpha: number; speed: number }[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const seeds = [
      { x: 0.3, y: 0.55 },
      { x: 0.65, y: 0.45 },
      { x: 0.5, y: 0.70 },
    ];

    let lastSpawn = 0;
    let seedIndex = 0;

    const spawn = (time: number) => {
      if (time - lastSpawn > 1800) {
        const s = seeds[seedIndex % seeds.length];
        ripplesRef.current.push({
          x: s.x * canvas.width,
          y: s.y * canvas.height,
          r: 0,
          alpha: 0.35,
          speed: 0.6 + Math.random() * 0.4,
        });
        seedIndex++;
        lastSpawn = time;
      }
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      spawn(time);
      ripplesRef.current = ripplesRef.current.filter(rip => rip.alpha > 0.005);
      ripplesRef.current.forEach(rip => {
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(180, 150, 240, ${rip.alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.r * 0.65, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(180, 150, 240, ${rip.alpha * 0.5})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
        rip.r += rip.speed * 1.4;
        rip.alpha *= 0.985;
      });
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        width: "100%", height: "100%",
        opacity: 0.6,
        pointerEvents: "none",
      }}
    />
  );
}

const CARDS = [
  "You keep replaying the same fight.\nDifferent day, same spiral.\n\nYou know what you should do.\nYou can't make yourself do it.",
];
export default function Home() {
  const [cardIndex, setCardIndex] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const [showFinal, setShowFinal] = useState(false);
  const [bodyVisible, setBodyVisible] = useState(false);
  const [taglineVisible, setTaglineVisible] = useState(false);
  const [btnVisible, setBtnVisible] = useState(false);
  const [vh, setVh] = useState(0);
  const router = useRouter();

  const touchStartX = useRef<number | null>(null);
const mouseStartX = useRef<number | null>(null);

const handleTouchStart = (e: React.TouchEvent) => {
  touchStartX.current = e.touches[0].clientX;
};

const handleTouchEnd = (e: React.TouchEvent) => {
  if (touchStartX.current === null) return;
  const diff = touchStartX.current - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) {
    if (diff > 0) handleNext();
    else if (showFinal) {
      setShowFinal(false);
      setBodyVisible(false);
      setTaglineVisible(false);
      setBtnVisible(false);
      setCardIndex(0);
    }
  }
  touchStartX.current = null;
};

const onMouseDown = (e: React.MouseEvent) => {
  mouseStartX.current = e.clientX;
};

const onMouseUp = (e: React.MouseEvent) => {
  if (mouseStartX.current === null) return;
  const diff = mouseStartX.current - e.clientX;
  if (Math.abs(diff) > 50) {
    if (diff > 0) handleNext();
    else if (showFinal) {
      setShowFinal(false);
      setBodyVisible(false);
      setTaglineVisible(false);
      setBtnVisible(false);
      setCardIndex(0);
    }
  }
  mouseStartX.current = null;
};

  const handleNext = () => {
    if (flipping) return;

    if (cardIndex < CARDS.length - 1) {
      setFlipping(true);
      setTimeout(() => {
        setCardIndex(cardIndex + 1);
        setFlipping(false);
      }, 400);
    } else {
      setFlipping(true);
      setTimeout(() => {
        setShowFinal(true);
        setFlipping(false);
        setTimeout(() => setBodyVisible(true), 100);
        setTimeout(() => setTaglineVisible(true), 400);
        setTimeout(() => setBtnVisible(true), 700);
      }, 400);
    }
  };

  const appHeight = vh > 0 ? `${vh}px` : "100vh";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400&display=swap');

        *, *::before, *::after {
          box-sizing: border-box; margin: 0; padding: 0;
          -webkit-tap-highlight-color: transparent;
        }

        html, body {
          height: 100%; overflow: hidden;
          background: #0d0e1a;
          -webkit-font-smoothing: antialiased;
        }

        .home {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: #0d0e1a;
          color: rgba(245,238,255,0.95);
          font-family: 'Cormorant Garamond', serif;
          overflow: hidden;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          user-select: none;
        }

        .bg-orbs {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none; z-index: 0;
        }

        .orb {
          position: absolute; border-radius: 50%; filter: blur(80px);
        }

        .orb1 {
          width: 420px; height: 420px; top: -120px; left: -60px;
          background: radial-gradient(circle, rgba(150,80,200,0.22) 0%, transparent 70%);
          animation: drift1 22s ease-in-out infinite;
        }

        .orb2 {
          width: 320px; height: 320px; bottom: 10%; right: -80px;
          background: radial-gradient(circle, rgba(80,100,220,0.18) 0%, transparent 70%);
          animation: drift2 28s ease-in-out infinite;
        }

        .orb3 {
          width: 240px; height: 240px; top: 40%; left: 20%;
          background: radial-gradient(circle, rgba(180,80,150,0.14) 0%, transparent 70%);
          animation: drift3 20s ease-in-out infinite;
        }

        @keyframes drift1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(-20px,30px) scale(1.05); }
          66% { transform: translate(15px,-20px) scale(0.97); }
        }

        @keyframes drift2 {
          0%,100% { transform: translate(0,0) scale(1); }
          40% { transform: translate(30px,-25px) scale(1.08); }
          70% { transform: translate(-10px,20px) scale(0.95); }
        }

        @keyframes drift3 {
          0%,100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(-25px,-30px) scale(1.1); }
        }

        .ripple-layer {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          z-index: 0; pointer-events: none;
        }

        .brand {
          position: absolute; top: 32px; left: 36px;
          font-family: 'Cormorant Garamond', serif;
          font-size: 15px; font-weight: 400; letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(200,180,255,0.40);
          z-index: 2;
        }

        .centre {
  position: relative; z-index: 2;
  width: 100%; max-width: 480px;
  padding: 0 36px;
  display: flex; flex-direction: column;
  align-items: center;
  text-align: center;
}

        .card-scene {
          width: 100%;
          perspective: 900px;
          cursor: pointer;
        }

        .card-inner {
          position: relative;
          width: 100%;
          transform-style: preserve-3d;
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .card-inner.flipping {
          transform: rotateY(-90deg);
        }

        .card-face {
          width: 100%;
          backface-visibility: hidden;
        }

        .card-text {
          font-family: 'Cormorant Garamond', serif;
          font-size: 32px;
          font-weight: 300;
          line-height: 1.22;
          color: rgba(245,238,255,0.96);
          letter-spacing: -0.01em;
          white-space: pre-line;
          margin-bottom: 24px;
          text-align: center;
        }

        .tap-hint {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 300;
          letter-spacing: 0.08em;
          color: rgba(160,140,220,0.40);
          margin-top: 8px;
          text-align: center;
        }

        .final-wrap {
          width: 100%;
        }

        .final-body {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          font-weight: 300;
          font-style: italic;
          line-height: 1.70;
          color: rgba(200,185,230,0.75);
          white-space: pre-line;
          margin-bottom: 32px;
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }

        .final-body.visible {
          opacity: 1; transform: translateY(0);
        }

        .final-tagline {
          font-family: 'Cormorant Garamond', serif;
          font-size: 30px;
          font-weight: 400;
          line-height: 1.2;
          color: rgba(230,215,255,1.0);
          margin-bottom: 44px;
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s;
        }

        .final-tagline.visible {
          opacity: 1; transform: translateY(0);
        }

        .cta-btn {
          display: inline-flex; align-items: center; gap: 12px;
          background: rgba(150,100,255,0.15);
          border: 1px solid rgba(150,100,255,0.40);
          border-radius: 50px;
          padding: 16px 32px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px; font-weight: 400;
          color: rgba(210,190,255,0.95);
          cursor: pointer;
          letter-spacing: 0.02em;
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s, background 0.2s;
        }

        .cta-btn.visible {
          opacity: 1; transform: translateY(0);
        }

        .cta-btn:active {
          background: rgba(150,100,255,0.28);
          transform: scale(0.98);
        }

        .dots {
          position: absolute; bottom: 40px; left: 50%;
          transform: translateX(-50%);
          display: flex; gap: 7px; align-items: center;
          z-index: 2;
        }

        .dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: rgba(160,140,220,0.22);
          transition: all 0.3s ease;
        }

        .dot.active {
          background: rgba(180,160,240,0.75);
          width: 20px; border-radius: 3px;
        }

        @media (max-width: 480px) {
          .card-text { font-size: 26px; }
          .final-body { font-size: 17px; }
          .final-tagline { font-size: 26px; }
          .centre { padding: 0 28px; }
          .brand { left: 28px; }
        }
      `}</style>

      <div
  className="home"
  style={{ height: appHeight }}
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
  onMouseDown={onMouseDown}
  onMouseUp={onMouseUp}
>
        <div className="bg-orbs">
          <div className="orb orb1" />
          <div className="orb orb2" />
          <div className="orb orb3" />
        </div>

        <div className="ripple-layer">
          <RippleCanvas />
        </div>

        <div className="brand">Attune</div>

        <div className="centre">
          {!showFinal ? (
            <div className="card-scene" onClick={handleNext} style={{ cursor: "default" }}>
              <div className={`card-inner${flipping ? " flipping" : ""}`}>
                <div className="card-face">
                  <div className="card-text">{CARDS[cardIndex]}</div>
                  <div className="tap-hint">tap to continue →</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="final-wrap">
              <div className={`final-body${bodyVisible ? " visible" : ""}`}>
                {"The gap between knowing and doing —\nthat's where relationships break.\nAnd where they can be rebuilt."}
              </div>
              <div className={`final-tagline${taglineVisible ? " visible" : ""}`}>
                {"Don't react.\nGet it right."}
              </div>
              <button
                className={`cta-btn${btnVisible ? " visible" : ""}`}
                onClick={async () => {
                  const { data } = await supabase.auth.getSession();
                  if (data.session) {
                    router.push("/chat");
                  } else {
                    router.push("/login");
                  }
                }}
              >

<div
  onClick={() => {
    setShowFinal(false);
    setBodyVisible(false);
    setTaglineVisible(false);
    setBtnVisible(false);
    setCardIndex(0);
  }}
  style={{
    marginTop: "20px",
    fontSize: "11px",
    fontFamily: "DM Sans, sans-serif",
    color: "rgba(160,140,220,0.35)",
    cursor: "pointer",
    letterSpacing: "0.06em",
  }}
>
  ← back
</div>
                Talk to Grace
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          )}
        </div>

        {!showFinal && (
          <div className="dots">
            {[...Array(CARDS.length + 1)].map((_, i) => (
              <div key={i} className={`dot${i === cardIndex ? " active" : ""}`} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}