"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

interface UserProfile {
  userPattern?: string;
  partnerPattern?: string;
  relationshipFacts?: string[];
  recurringThemes?: string[];
  growthSignals?: string[];
  lastSessionSummary?: string;
  assessmentComplete?: boolean;
  sessionCount?: number;
}

export default function Home() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userID, setUserID] = useState("user-temp");
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [sessionNumber, setSessionNumber] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const initialized = useRef(false);

  // Load everything from localStorage after mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // User ID
    let id = localStorage.getItem("grace-user");
    if (!id) {
      id = "user-" + Math.random().toString(36).slice(2);
      localStorage.setItem("grace-user", id);
    }
    setUserID(id);

    // User profile
    const savedProfile = localStorage.getItem("grace-profile");
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      setUserProfile(profile);
      setSessionNumber((profile.sessionCount || 0) + 1);
    }

    // Messages
    const saved = localStorage.getItem("grace-messages");
    if (saved) {
      setMessages(JSON.parse(saved));
    } else {
      startConversation();
    }
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("grace-messages", JSON.stringify(messages));
    }
  }, [messages]);

  // Save profile to localStorage
  useEffect(() => {
    if (Object.keys(userProfile).length > 0) {
      localStorage.setItem("grace-profile", JSON.stringify(userProfile));
    }
  }, [userProfile]);

  // Auto scroll
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
    return () => clearTimeout(timer);
  }, [messages, loading]);

  const toApiMessages = (msgs: string[]) => {
    return msgs.map((msg) => {
      if (msg.startsWith("You: ")) {
        return { role: "user", content: msg.replace("You: ", "") };
      } else {
        return { role: "assistant", content: msg.replace("Grace: ", "") };
      }
    });
  };

  const startConversation = async () => {
    setLoading(true);
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "begin" }],
        userProfile,
        sessionNumber,
      }),
    });
    const data = await response.json();
    if (data.result) {
      setMessages(["Grace: " + data.result]);
    }
    setLoading(false);
  };

  const mergeProfileUpdates = (existing: UserProfile, updates: any): UserProfile => {
    if (!updates) return existing;

    return {
      ...existing,
      userPattern: updates.userPattern || existing.userPattern,
      partnerPattern: updates.partnerPattern || existing.partnerPattern,
      assessmentComplete: updates.assessmentComplete ?? existing.assessmentComplete,
      relationshipFacts: [
        ...new Set([
          ...(existing.relationshipFacts || []),
          ...(updates.relationshipFacts || []),
        ]),
      ],
      recurringThemes: [
        ...new Set([
          ...(existing.recurringThemes || []),
          ...(updates.recurringThemes || []),
        ]),
      ],
      growthSignals: [
        ...new Set([
          ...(existing.growthSignals || []),
          ...(updates.growthSignals || []),
        ]),
      ],
    };
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input;
    const updatedMessages = [...messages, "You: " + userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: toApiMessages(updatedMessages),
        userProfile,
        sessionNumber,
      }),
    });

    const data = await response.json();

    if (data.result) {
      setMessages((prev) => [...prev, "Grace: " + data.result]);
    }

    // Update profile if new information was extracted
    if (data.profileUpdates) {
      setUserProfile((prev) => mergeProfileUpdates(prev, data.profileUpdates));
    }

    setLoading(false);
  };

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "#f7f7f8",
      fontFamily: "Arial",
    }}>

      {/* CHAT AREA */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        maxWidth: "800px",
        width: "100%",
        margin: "0 auto",
        padding: "30px",
      }}>

        {messages.map((msg, i) => {
          const isUser = msg.startsWith("You:");
          return (
            <div key={i} style={{ marginBottom: "24px" }}>
              <div style={{ fontWeight: "600", marginBottom: "6px" }}>
                {isUser ? "You" : "Grace"}
              </div>
              <div style={{
                background: isUser ? "#e9eef6" : "#ffffff",
                border: "1px solid #e5e5e5",
                borderRadius: "10px",
                padding: "14px 16px",
                lineHeight: "1.5",
                whiteSpace: "pre-wrap",
              }}>
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

        {loading && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontWeight: "600", marginBottom: "6px" }}>Grace</div>
            <div style={{
              background: "#ffffff",
              border: "1px solid #e5e5e5",
              borderRadius: "10px",
              padding: "14px 16px",
              color: "#999",
            }}>...</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <div style={{
        borderTop: "1px solid #e5e5e5",
        padding: "16px",
        background: "#fff",
      }}>
        <div style={{
          maxWidth: "800px",
          margin: "0 auto",
          display: "flex",
          gap: "10px",
        }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
            placeholder="Send a message..."
            disabled={loading}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              opacity: loading ? 0.6 : 1,
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            style={{
              padding: "12px 18px",
              background: "#111",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
