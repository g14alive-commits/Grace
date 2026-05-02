"use client";

import { supabase } from "../lib/supabase";
import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function RippleCanvas({ orbs }: { orbs: { x: number; y: number; r: number; c: string }[] }) {
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

    const draw = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      orbs.forEach(o => {
        const grd = ctx.createRadialGradient(
          o.x * canvas.width, o.y * canvas.height, 0,
          o.x * canvas.width, o.y * canvas.height, o.r
        );
        grd.addColorStop(0, o.c);
        grd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(o.x * canvas.width, o.y * canvas.height, o.r, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      });

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
  }, [orbs]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        width: "100%", height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}

const ORB_SETS = [
  [
    { x: 0.10, y: 0.05, r: 280, c: "rgba(150,80,220,0.45)" },
    { x: 0.88, y: 0.82, r: 220, c: "rgba(80,100,240,0.38)" },
    { x: 0.22, y: 0.55, r: 160, c: "rgba(200,80,160,0.28)" },
  ],
  [
    { x: 0.84, y: 0.14, r: 260, c: "rgba(80,20,180,0.40)" },
    { x: 0.12, y: 0.84, r: 210, c: "rgba(120,50,210,0.30)" },
  ],
  [
    { x: 0.50, y: 0.50, r: 320, c: "rgba(100,40,200,0.30)" },
    { x: 0.10, y: 0.10, r: 170, c: "rgba(140,60,240,0.22)" },
    { x: 0.90, y: 0.90, r: 170, c: "rgba(80,30,180,0.20)" },
  ],
];

const TOTAL = 3;

export default function Home() {
  const [current, setCurrent] = useState(0);
  const [redirecting, setRedirecting] = useState(true);
  const [animKey, setAnimKey] = useState(0);
  const [dir, setDir] = useState(1);
  const router = useRouter();
  const touchStartX = useRef<number | null>(null);
  const mouseStartX = useRef<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { setRedirecting(false); return; }
      router.replace("/profile");
    });
  }, []);

  const goTo = (idx: number, direction: number) => {
    if (idx < 0 || idx >= TOTAL) return;
    setDir(direction);
    setAnimKey(k => k + 1);
    setCurrent(idx);
  };

  const goNext = () => goTo(current + 1, 1);
  const goPrev = () => goTo(current - 1, -1);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? goNext() : goPrev(); }
    touchStartX.current = null;
  };
  const onMouseDown = (e: React.MouseEvent) => { mouseStartX.current = e.clientX; };
  const onMouseUp = (e: React.MouseEvent) => {
    if (mouseStartX.current === null) return;
    const diff = mouseStartX.current - e.clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? goNext() : goPrev(); }
    mouseStartX.current = null;
  };

  if (redirecting) {
    return <div style={{ position: "fixed", inset: 0, background: "#0d0e1a" }} />;
  }

  const slideAnim = dir >= 0
    ? "lp-slide-in 0.45s cubic-bezier(0.22,1,0.36,1) both"
    : "lp-slide-back 0.45s cubic-bezier(0.22,1,0.36,1) both";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400&display=swap');

        *, *::before, *::after {
          box-sizing: border-box; margin: 0; padding: 0;
          -webkit-tap-highlight-color: transparent;
        }

        html, body {
          height: 100%; overflow: hidden;
          background: #0d0e1a;
          -webkit-font-smoothing: antialiased;
        }

        .lp-home {
          position: fixed; inset: 0;
          background: #0d0e1a;
          color: rgba(245,238,255,0.95);
          overflow: hidden;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          user-select: none;
        }

        .lp-card {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 48px 40px 72px;
          text-align: center;
        }

        @keyframes lp-fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lp-slide-in {
          from { opacity: 0; transform: translateX(48px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes lp-slide-back {
          from { opacity: 0; transform: translateX(-48px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes lp-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        .lp-a1 { animation: lp-fadeIn 0.5s 0.05s both; }
        .lp-a2 { animation: lp-fadeIn 0.6s 0.25s both; }
        .lp-a3 { animation: lp-fadeIn 0.55s 0.50s both; }
        .lp-a4 { animation: lp-fadeIn 0.5s 0.75s both; }
        .lp-a5 { animation: lp-fadeIn 0.5s 1.00s both; }

        .lp-logo {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px; font-weight: 400; letter-spacing: 0.12em;
          background: linear-gradient(145deg, #b070ff 0%, #7040e0 50%, #4020c0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          display: inline-block;
          position: relative; top: -6px;
        }

        .lp-headline {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 300;
          font-size: clamp(34px, 8vw, 60px);
          line-height: 1.08; letter-spacing: -0.02em;
          color: rgba(245,238,255,0.97);
        }

        .lp-headline em {
          font-style: italic;
          color: rgba(180,140,255,0.95);
        }

        .lp-body {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(16px, 3.8vw, 20px);
          font-weight: 300; font-style: italic;
          line-height: 1.65;
          color: rgba(200,185,230,0.75);
        }

        .lp-prose {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 300;
          font-size: clamp(22px, 5.5vw, 38px);
          line-height: 1.28; letter-spacing: -0.01em;
          color: rgba(245,238,255,0.96);
          text-align: center;
        }

        .lp-caption {
          font-family: 'Cormorant Garamond', serif;
          font-size: 19px; font-weight: 300; font-style: italic;
          line-height: 1.75;
          color: rgba(200,185,230,0.75);
          text-align: center;
        }

        .lp-attune-inline {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic; font-weight: 600;
          color: rgba(150,100,255,0.80);
        }

        .lp-btn-primary {
          display: inline-flex; align-items: center; gap: 10px;
          background: linear-gradient(145deg, #b070ff 0%, #7040e0 50%, #4020c0 100%);
          border: none; border-radius: 14px;
          padding: 16px 32px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px; font-weight: 400;
          color: #fff; cursor: pointer;
          letter-spacing: 0.02em;
          box-shadow: 0 0 16px rgba(160,120,240,0.25);
          transition: opacity 0.2s, transform 0.15s;
        }
        .lp-btn-primary:active { opacity: 0.85; transform: scale(0.98); }

        .lp-btn-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          background: linear-gradient(145deg, #b070ff 0%, #7040e0 50%, #4020c0 100%);
          border: none;
          border-radius: 14px; padding: 16px 32px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px; font-weight: 400;
          color: #fff; cursor: pointer;
          letter-spacing: 0.02em;
          box-shadow: 0 0 16px rgba(160,120,240,0.25);
          transition: opacity 0.2s, transform 0.15s;
        }
        .lp-btn-ghost:active { opacity: 0.85; transform: scale(0.98); }

        .lp-btn-cta {
          display: inline-flex; align-items: center; justify-content: center; gap: 12px;
          width: 100%; max-width: 280px;
          background: linear-gradient(145deg, #b070ff 0%, #7040e0 50%, #4020c0 100%);
          border: none;
          border-radius: 14px;
          padding: 16px 44px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px; font-weight: 400;
          color: #fff; cursor: pointer;
          letter-spacing: 0.02em;
          box-shadow: 0 0 16px rgba(160,120,240,0.25);
          transition: opacity 0.2s, transform 0.15s;
        }
        .lp-btn-cta:active { opacity: 0.85; transform: scale(0.98); }

        .lp-dots {
          position: absolute; bottom: 40px; left: 50%;
          transform: translateX(-50%);
          display: flex; gap: 7px; align-items: center;
          z-index: 2;
        }

        .lp-dot {
          height: 6px; border-radius: 3px;
          border: none; cursor: pointer; padding: 0;
          transition: all 0.3s ease;
        }

        .lp-chevron {
          position: absolute; top: 50%; transform: translateY(-50%);
          z-index: 10;
          background: rgba(20,15,40,0.55);
          border: 1px solid rgba(120,80,200,0.22);
          border-radius: 50%; width: 36px; height: 36px;
          cursor: pointer; color: rgba(180,160,240,0.6);
          display: flex; align-items: center; justify-content: center;
        }

        @media (max-width: 480px) {
          .lp-card { padding: 40px 28px 72px; }
        }
      `}</style>

      <div
        className="lp-home"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
      >
        {/* Background canvas — changes per card */}
        <RippleCanvas key={`canvas-${current}`} orbs={ORB_SETS[current]} />

        {/* Cards */}
        <div key={`card-${current}-${animKey}`} style={{ position: "absolute", inset: 0, animation: slideAnim }}>

          {/* ── CARD 1: BRAND ── */}
          {current === 0 && (
            <div className="lp-card">
              <div className="lp-a1" style={{ marginBottom: 26 }}>
                <span className="lp-logo">attune</span>
              </div>
              <div className="lp-a2" style={{ marginBottom: 28 }}>
                <h1 className="lp-headline">
                  Stop reacting.<br />
                  <em>Start choosing.</em>
                </h1>
              </div>
              <div className="lp-a3" style={{ marginBottom: 34 }}>
                <p className="lp-body">
                  Every dynamic starts with one person. You.<br />
                  Attune is a relationship app that focuses on you.
                </p>
              </div>
              <div className="lp-a4" style={{ marginBottom: 14 }}>
                <button className="lp-btn-primary" onClick={goNext}>
                  See how it works
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="lp-a5" style={{ display: "flex", alignItems: "center", gap: 7, justifyContent: "center" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(150,100,255,0.5)", animation: "lp-pulse 2s infinite" }} />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(160,140,220,0.40)", letterSpacing: "0.06em" }}>
                  Beta · Free to try
                </span>
              </div>
            </div>
          )}

          {/* ── CARD 2: PROBLEM ── */}
          {current === 1 && (
            <div className="lp-card">
              <div className="lp-a1" style={{ marginBottom: 32, width: "100%" }}>
                <p className="lp-prose">
                  You keep replaying the same fight.<br />
                  Different words. Same spiral.<br />
                  <br />
                  You know what you should do.<br />
                  Yet you can&apos;t make yourself do it.
                </p>
              </div>
              <div className="lp-a2" style={{ marginBottom: 28, width: "100%" }}>
                <p className="lp-caption">
                  That gap between knowing and doing —<br />
                  that&apos;s exactly where{" "}
                  <span className="lp-attune-inline">attune</span> works.
                </p>
              </div>
              <div className="lp-a3">
                <button className="lp-btn-ghost" onClick={goNext}>
                  What can I do about it
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ── CARD 3: CTA ── */}
          {current === 2 && (
            <div className="lp-card">
              <div className="lp-a1" style={{ marginBottom: 24 }}>
                <span className="lp-logo">attune</span>
              </div>
              <div className="lp-a2" style={{ marginBottom: 18 }}>
                <h2 className="lp-headline">
                  Don&apos;t react.<br />
                  <em>Get it right.</em>
                </h2>
              </div>
              <div className="lp-a3" style={{ marginBottom: 32 }}>
                <p className="lp-body" style={{ fontSize: "clamp(15px, 3.5vw, 18px)" }}>
                  Show up a tiny bit better.<br />
                  It&apos;s more than enough than you imagine.
                </p>
              </div>
              <div className="lp-a4" style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                <button
                  className="lp-btn-cta"
                  onClick={() => router.push("/waitlist")}
                >
                  Get early access
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Chevron prev */}
        {current > 0 && (
          <button className="lp-chevron" onClick={goPrev} style={{ left: 16 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}

        {/* Chevron next */}
        {current < TOTAL - 1 && (
          <button className="lp-chevron" onClick={goNext} style={{ right: 16 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}

        {/* Dot indicators */}
        <div className="lp-dots">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <button
              key={i}
              className="lp-dot"
              onClick={() => goTo(i, i > current ? 1 : -1)}
              style={{
                width: i === current ? 20 : 5,
                background: i === current ? "rgba(180,160,240,0.75)" : "rgba(160,140,220,0.22)",
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}