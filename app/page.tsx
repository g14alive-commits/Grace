"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

export default function Home() {

  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const userID = "user-" + Math.random().toString(36).slice(2);

  // Start conversation automatically
  useEffect(() => {

    const startConversation = async () => {

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userID,
          payload: {
            request: {
              type: "launch"
            }
          }
        })
      });

      const data = await response.json();

      const aiMessages = data
        .filter((t: any) => t.type === "text")
        .map((t: any) => t.payload.message);

      setMessages(aiMessages);
    };

    startConversation();

  }, []);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {

    if (!input) return;

    const userMessage = input;

    setMessages((prev) => [...prev, "You: " + userMessage]);
    setInput("");

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userID,
        payload: {
          request: {
            type: "text",
            payload: userMessage
          }
        }
      })
    });

    const data = await response.json();

    const aiMessages = data
      .filter((t: any) => t.type === "text")
      .map((t: any) => "Grace: " + t.payload.message);

    setMessages((prev) => [...prev, ...aiMessages]);

  };

  return (

    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#f7f7f8",
        fontFamily: "Arial",
      }}
    >

      {/* CHAT AREA */}

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          maxWidth: "800px",
          width: "100%",
          margin: "0 auto",
          padding: "30px",
        }}
      >

        {messages.map((msg, i) => {

          const isUser = msg.startsWith("You:");

          return (

            <div key={i} style={{ marginBottom: "24px" }}>

              <div style={{ fontWeight: "600", marginBottom: "6px" }}>
                {isUser ? "You" : "Grace"}
              </div>

              <div
                style={{
                  background: isUser ? "#e9eef6" : "#ffffff",
                  border: "1px solid #e5e5e5",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  lineHeight: "1.5",
                  whiteSpace: "pre-wrap"
                }}
              >

                <ReactMarkdown>
                  {msg
                    .replace("You: ", "")
                    .replace("Grace: ", "")
                    .replace(/^AI:\s*/i, "")
                    .replace(/\n\s*\n/g, "\n")}
                </ReactMarkdown>

              </div>

            </div>

          );

        })}

        <div ref={messagesEndRef} />

      </div>


      {/* INPUT */}

      <div
        style={{
          borderTop: "1px solid #e5e5e5",
          padding: "16px",
          background: "#fff",
        }}
      >

        <div
          style={{
            maxWidth: "800px",
            margin: "0 auto",
            display: "flex",
            gap: "10px",
          }}
        >

          <input
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
            placeholder="Send a message..."
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #ccc",
            }}
          />

          <button
            onClick={sendMessage}
            style={{
              padding: "12px 18px",
              background: "#111",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
            }}
          >
            Send
          </button>

        </div>

      </div>

    </div>

  );

}