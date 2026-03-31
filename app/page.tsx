"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const slides = [
  {
    id: 1,
    headline: "Relational hurt heals through relationship.",
    body: "Healing takes time. But friction reduces, joy finds its way back in, and showing up better — even a little — changes everything.",
    ripple: true,
  },
  {
    id: 2,
    headline: "Understand yourself better.\nNavigate your relationship with clarity.\nRespond from a steadier place.",
    body: "When you understand your own patterns and needs, you show up differently for the people you love.",
    ripple: false,
  },
  {
    id: 3,
    headline: "Attune is for people who want to strengthen what they have.",
    body: "Not for managing crisis or abuse. If you're in an unsafe situation, please reach out to a professional.\n\nIf something between you and your partner isn't working — you're in the right place.",
    ripple: false,
  },
  {
    id: 4,
    headline: "Start with Grace.",
    body: "Your AI relationship companion.\n\nShe'll help you understand your patterns, see your relationship more clearly, and find one small thing to do differently.",
    cta: true,
    ripple: true,
  },
];

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

    // Seed a few ripples at calm positions
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
        width: "100%",
        height: "100%",
        opacity: 0.7,
        pointerEvents: "none",
      }}
    />
  );
}

export default function Home() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const [vh, setVh] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const mouseStartX = useRef<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const setHeight = () => setVh(window.innerHeight);
    setHeight();
    window.addEventListener("resize", setHeight);
    return () => window.removeEventListener("resize", setHeight);
  }, []);

  // Returning users skip to last slide
  useEffect(() => {
    const hasMessages = localStorage.getItem("grace-messages");
    if (hasMessages) {
      setCurrent(slides.length - 1);
    }
  }, []);

  const goTo = (index: number, dir: "left" | "right") => {
    if (animating || index < 0 || index >= slides.length) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setCurrent(index);
      setDirection(null);
      setAnimating(false);
    }, 320);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && current < slides.length - 1) goTo(current + 1, "left");
      else if (diff < 0 && current > 0) goTo(current - 1, "right");
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
      if (diff > 0 && current < slides.length - 1) goTo(current + 1, "left");
      else if (diff < 0 && current > 0) goTo(current - 1, "right");
    }
    mouseStartX.current = null;
  };

  const slide = slides[current];
  const appHeight = vh > 0 ? `${vh}px` : "100vh";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400&display=swap');

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

        .home {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: #110f1e;
          color: rgba(245, 238, 255, 0.95);
          font-family: 'Cormorant Garamond', serif;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          user-select: none;
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
          width: 420px;
          height: 420px;
          top: -120px;
          left: -60px;
          background: radial-gradient(circle, rgba(180,100,120,0.18) 0%, transparent 70%);
          animation: drift1 22s ease-in-out infinite;
        }

        .orb2 {
          width: 320px;
          height: 320px;
          bottom: 10%;
          right: -80px;
          background: radial-gradient(circle, rgba(140,80,200,0.16) 0%, transparent 70%);
          animation: drift2 28s ease-in-out infinite;
        }

        .orb3 {
          width: 240px;
          height: 240px;
          top: 40%;
          left: 20%;
          background: radial-gradient(circle, rgba(80,100,200,0.12) 0%, transparent 70%);
          animation: drift3 20s ease-in-out infinite;
        }

        @keyframes drift1 {
          0%, 100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(-20px,30px) scale(1.05); }
          66% { transform: translate(15px,-20px) scale(0.97); }
        }

        @keyframes drift2 {
          0%, 100% { transform: translate(0,0) scale(1); }
          40% { transform: translate(30px,-25px) scale(1.08); }
          70% { transform: translate(-10px,20px) scale(0.95); }
        }

        @keyframes drift3 {
          0%, 100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(-25px,-30px) scale(1.1); }
        }

        .ripple-layer {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 0;
          pointer-events: none;
        }

        .slide-area {
          position: relative;
          z-index: 1;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 0 36px;
          overflow: hidden;
        }

        .slide-content {
          transition: opacity 0.32s ease, transform 0.32s ease;
        }

        .slide-content.exit-left {
          opacity: 0;
          transform: translateX(-40px);
        }

        .slide-content.exit-right {
          opacity: 0;
          transform: translateX(40px);
        }

        .headline {
          font-family: 'Cormorant Garamond', serif;
          font-size: 32px;
          font-weight: 300;
          line-height: 1.18;
          color: rgba(245, 238, 255, 0.96);
          margin-bottom: 22px;
          letter-spacing: -0.01em;
          white-space: pre-line;
        }

        .body {
          font-family: 'Cormorant Garamond', serif;
          font-size: 17px;
          font-weight: 300;
          line-height: 1.75;
          color: rgba(200, 185, 230, 0.65);
          white-space: pre-line;
          font-style: italic;
        }

        @media (max-width: 480px) {
          .headline { font-size: 26px; margin-bottom: 18px; }
          .body { font-size: 15px; line-height: 1.70; }
          .slide-area { padding: 0 28px; }
        }

        .cta-btn {
          margin-top: 40px;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: rgba(160, 120, 240, 0.12);
          border: 1px solid rgba(160, 120, 240, 0.28);
          border-radius: 50px;
          padding: 18px 36px;
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          font-weight: 400;
          color: rgba(210, 190, 255, 0.90);
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.02em;
        }

        .cta-btn:active {
          background: rgba(160, 120, 240, 0.22);
          transform: scale(0.98);
        }

        .cta-arrow {
          width: 18px;
          height: 18px;
          opacity: 0.65;
          flex-shrink: 0;
        }

        .bottom-bar {
          position: relative;
          z-index: 2;
          padding: 0 36px 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .dots {
          display: flex;
          gap: 7px;
          align-items: center;
        }

        .dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: rgba(160, 140, 220, 0.22);
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .dot.active {
          background: rgba(180, 160, 240, 0.75);
          width: 20px;
          border-radius: 3px;
        }

        .swipe-hint {
          font-size: 11px;
          color: rgba(140, 130, 180, 0.35);
          font-weight: 300;
          letter-spacing: 0.05em;
          font-family: 'DM Sans', sans-serif;
          transition: opacity 0.3s;
        }

        .swipe-hint.hidden {
          opacity: 0;
          pointer-events: none;
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

        {slide.ripple && (
          <div className="ripple-layer">
            <RippleCanvas />
          </div>
        )}

        <div className="slide-area">
          <div
            className={`slide-content ${
              animating && direction === "left" ? "exit-left" :
              animating && direction === "right" ? "exit-right" : ""
            }`}
          >
            <div className="headline">{slide.headline}</div>
            <div className="body">{slide.body}</div>

            {slide.cta && (
              <button
                className="cta-btn"
                onClick={() => router.push("/chat")}
              >
                Talk to Grace
                <svg className="cta-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="bottom-bar">
          <div className="dots">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`dot${i === current ? " active" : ""}`}
                onClick={() => goTo(i, i > current ? "left" : "right")}
              />
            ))}
          </div>
          <div className={`swipe-hint${current === slides.length - 1 ? " hidden" : ""}`}>
            swipe to continue
          </div>
        </div>
      </div>
    </>
  );
}