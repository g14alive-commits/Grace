"use client";

import { useState } from "react";

export default function RewritePage() {

  const [message, setMessage] = useState("");
  const [style, setStyle] = useState("pulls away");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const rewriteMessage = async () => {

    if (!message) return;

    setLoading(true);

    const response = await fetch("/api/rewrite-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message,
        receiverStyle: style
      })
    });

    const data = await response.json();

    setResult(data.result);

    setLoading(false);
  };

  return (
    <div style={{maxWidth:"700px",margin:"80px auto",fontFamily:"Arial"}}>

      <h1>Fix My Message</h1>

      <p>Who are you sending this message to?</p>

      <select
        value={style}
        onChange={(e)=>setStyle(e.target.value)}
        style={{padding:"8px",marginBottom:"20px"}}
      >
        <option value="pulls away">Someone who tends to go quiet or pull away</option>
        <option value="reaches harder">Someone who tends to reach harder or get anxious</option>
        <option value="not sure">I'm not sure</option>
      </select>

      <textarea
        placeholder="Paste the message you want to send..."
        value={message}
        onChange={(e)=>setMessage(e.target.value)}
        style={{
          width:"100%",
          height:"120px",
          padding:"10px"
        }}
      />

      <button
        onClick={rewriteMessage}
        style={{
          marginTop:"15px",
          padding:"10px 16px",
          background:"#111",
          color:"#fff",
          border:"none",
          borderRadius:"6px"
        }}
      >
        {loading ? "Thinking..." : "Rewrite message"}
      </button>

      {result && (
        <div style={{
          marginTop:"30px",
          padding:"20px",
          border:"1px solid #ddd",
          borderRadius:"8px",
          whiteSpace:"pre-wrap"
        }}>
          {result}
        </div>
      )}

    </div>
  );
}