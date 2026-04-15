"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { updateUserBasicInfo } from "../../lib/db";

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria",
  "Azerbaijan", "Bangladesh", "Belarus", "Belgium", "Bolivia", "Brazil",
  "Bulgaria", "Cambodia", "Canada", "Chile", "China", "Colombia", "Croatia",
  "Czech Republic", "Denmark", "Ecuador", "Egypt", "Ethiopia", "Finland",
  "France", "Germany", "Ghana", "Greece", "Guatemala", "Hungary", "India",
  "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Japan",
  "Jordan", "Kazakhstan", "Kenya", "Kuwait", "Lebanon", "Libya", "Malaysia",
  "Mexico", "Morocco", "Myanmar", "Nepal", "Netherlands", "New Zealand",
  "Nigeria", "Norway", "Pakistan", "Palestine", "Peru", "Philippines",
  "Poland", "Portugal", "Qatar", "Romania", "Russia", "Saudi Arabia",
  "Serbia", "Singapore", "South Africa", "South Korea", "Spain", "Sri Lanka",
  "Sudan", "Sweden", "Switzerland", "Syria", "Taiwan", "Tanzania", "Thailand",
  "Tunisia", "Turkey", "UAE", "Uganda", "Ukraine", "United Kingdom",
  "United States", "Uruguay", "Uzbekistan", "Venezuela", "Vietnam", "Yemen",
  "Zimbabwe", "Other"
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [relationshipDuration, setRelationshipDuration] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [vh, setVh] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const setHeight = () => setVh(window.innerHeight);
    setHeight();
    window.addEventListener("resize", setHeight);
    return () => window.removeEventListener("resize", setHeight);
  }, []);

  const canProceed = () => {
    if (step === 1) return name.trim().length > 0 && gender.length > 0;
    if (step === 2) return relationshipStatus.length > 0;
    if (step === 3) return ageRange.length > 0;
    return false;
  };

  const handleFinish = async () => {
    setLoading(true);
    const { data } = await supabase.auth.getSession();
    if (!data.session) { router.replace("/login"); return; }

    await updateUserBasicInfo(data.session.user.id, {
      name: name.trim(),
      gender,
      relationshipStatus,
      relationshipDuration,
      ageRange,
      country,
    });

    router.replace("/chat");
  };

  const appHeight = vh > 0 ? `${vh}px` : "100vh";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');

        *, *::before, *::after {
          box-sizing: border-box; margin: 0; padding: 0;
          -webkit-tap-highlight-color: transparent;
        }

        html, body {
          height: 100%; overflow: hidden;
          background: #110f1e;
          -webkit-font-smoothing: antialiased;
        }

        .page {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: #110f1e;
          color: rgba(245,238,255,0.95);
          display: flex; flex-direction: column;
          font-family: 'DM Sans', sans-serif;
          overflow: hidden;
        }

        .bg-warm {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none; z-index: 0;
        }

        .warm-orb {
          position: absolute; border-radius: 50%; filter: blur(80px);
        }

        .warm-orb1 {
          width: 380px; height: 380px; top: -100px; left: -60px;
          background: radial-gradient(circle, rgba(180,100,120,0.18) 0%, transparent 70%);
          animation: wo1 22s ease-in-out infinite;
        }

        .warm-orb2 {
          width: 300px; height: 300px; bottom: 10%; right: -80px;
          background: radial-gradient(circle, rgba(120,80,200,0.16) 0%, transparent 70%);
          animation: wo2 26s ease-in-out infinite;
        }

        @keyframes wo1 {
          0%,100% { transform: translate(0,0); }
          50% { transform: translate(20px,30px); }
        }

        @keyframes wo2 {
          0%,100% { transform: translate(0,0); }
          50% { transform: translate(-20px,-25px); }
        }

        .progress-bar {
          position: relative; z-index: 2;
          padding: 52px 32px 0;
          display: flex; gap: 6px;
        }

        .progress-dot {
          height: 2px; border-radius: 2px; flex: 1;
          background: rgba(255,255,255,0.10); transition: background 0.3s;
        }

        .progress-dot.active { background: rgba(160,140,220,0.70); }
        .progress-dot.done { background: rgba(160,140,220,0.35); }

        .content {
          position: relative; z-index: 1;
          flex: 1; display: flex; flex-direction: column;
          justify-content: center; padding: 0 32px;
          overflow: hidden;
        }

        .step-label {
          font-size: 11px; font-weight: 400;
          letter-spacing: 0.10em; text-transform: uppercase;
          color: rgba(160,140,220,0.50); margin-bottom: 12px;
        }

        .question {
          font-family: 'Cormorant Garamond', serif;
          font-size: 30px; font-weight: 300;
          color: rgba(245,238,255,0.95); line-height: 1.25;
          margin-bottom: 28px; letter-spacing: -0.01em;
        }

        .name-input {
          width: 100%;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px; padding: 16px 18px;
          font-family: 'DM Sans', sans-serif;
          font-size: 17px; font-weight: 300;
          color: rgba(240,235,255,0.95);
          outline: none; transition: border-color 0.2s;
          margin-bottom: 20px;
        }

        .name-input:focus { border-color: rgba(160,120,240,0.45); }
        .name-input::placeholder { color: rgba(140,130,180,0.50); }

        .options-grid {
          display: flex; flex-wrap: wrap; gap: 10px;
          margin-bottom: 20px;
        }

        .option-btn {
          padding: 10px 18px; border-radius: 50px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 300;
          color: rgba(180,170,220,0.80);
          cursor: pointer; transition: all 0.2s;
        }

        .option-btn.selected {
          background: rgba(160,120,240,0.15);
          border-color: rgba(160,120,240,0.40);
          color: rgba(210,190,255,0.95);
        }

        .option-btn:active { transform: scale(0.97); }

        .select-wrap {
          position: relative; margin-bottom: 20px;
        }

        select {
          width: 100%;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px; padding: 14px 18px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px; font-weight: 300;
          color: rgba(240,235,255,0.90);
          outline: none; appearance: none;
          cursor: pointer;
        }

        select:focus { border-color: rgba(160,120,240,0.45); }
        select option { background: #1a1628; }

        .select-arrow {
          position: absolute; right: 16px; top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: rgba(160,140,220,0.50);
          font-size: 12px;
        }

        .optional-label {
          font-size: 11px; color: rgba(140,130,180,0.50);
          margin-bottom: 6px; font-weight: 300;
        }

        .bottom {
          position: relative; z-index: 2;
          padding: 0 32px 44px;
          display: flex; align-items: center; justify-content: space-between;
        }

        .skip-btn {
          font-size: 13px; font-weight: 300;
          color: rgba(140,130,180,0.45);
          background: none; border: none;
          cursor: pointer; padding: 8px 0;
        }

        .next-btn {
          padding: 14px 32px; border-radius: 50px;
          background: rgba(160,120,240,0.15);
          border: 1px solid rgba(160,120,240,0.30);
          color: rgba(210,190,255,0.95);
          font-family: 'DM Sans', sans-serif;
          font-size: 15px; font-weight: 400;
          cursor: pointer; transition: all 0.2s;
          letter-spacing: 0.02em;
        }

        .next-btn:disabled { opacity: 0.30; cursor: default; }
        .next-btn:not(:disabled):active { transform: scale(0.97); }
      `}</style>

      <div className="page" style={{ height: appHeight }}>
        <div className="bg-warm">
          <div className="warm-orb warm-orb1" />
          <div className="warm-orb warm-orb2" />
        </div>

        <div className="progress-bar">
          {[1,2,3].map(i => (
            <div key={i} className={`progress-dot${i === step ? " active" : i < step ? " done" : ""}`} />
          ))}
        </div>

        <div className="content">
          {step === 1 && (
            <>
              <div className="step-label">Welcome</div>
              <div className="question">What should Grace call you?</div>
              <input
                className="name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name or nickname"
                autoFocus
              />
              <div className="question" style={{ fontSize: "22px", marginBottom: "16px" }}>
  How do you identify?
             </div>
              <div className="options-grid">
                {["Woman", "Man", "Non-binary", "Prefer not to say"].map((g) => (
                  <button
                    key={g}
                    className={`option-btn${gender === g ? " selected" : ""}`}
                    onClick={() => setGender(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="step-label">Your relationship</div>
              <div className="question">What's your relationship status?</div>
              <div className="options-grid">
                {["In a relationship", "Married", "Long distance", "Separated / broken up"].map((s) => (
                  <button
                    key={s}
                    className={`option-btn${relationshipStatus === s ? " selected" : ""}`}
                    onClick={() => setRelationshipStatus(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="question" style={{ fontSize: "20px", marginBottom: "16px", marginTop: "8px" }}>
                How long have you been together?
              </div>
              <div className="options-grid">
                {["Less than 6 months", "6 months – 2 years", "2 – 5 years", "5 – 10 years", "10+ years"].map((d) => (
                  <button
                    key={d}
                    className={`option-btn${relationshipDuration === d ? " selected" : ""}`}
                    onClick={() => setRelationshipDuration(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="step-label">Almost there</div>
              <div className="question">How old are you?</div>
              <div className="options-grid">
                {["18–24", "25–34", "35–44", "45–54", "55+"].map((a) => (
                  <button
                    key={a}
                    className={`option-btn${ageRange === a ? " selected" : ""}`}
                    onClick={() => setAgeRange(a)}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <div className="optional-label" style={{ marginTop: "20px" }}>Where are you from? (optional)</div>
              <div className="select-wrap">
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  <option value="">Select your country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <span className="select-arrow">▾</span>
              </div>
            </>
          )}
        </div>

        <div className="bottom">
          {step > 1 ? (
            <button className="skip-btn" onClick={() => setStep(step - 1)}>
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              className="next-btn"
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
            >
              Continue
            </button>
          ) : (
            <button
              className="next-btn"
              onClick={handleFinish}
              disabled={loading || !canProceed()}
            >
              {loading ? "Starting..." : "Meet Grace"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}