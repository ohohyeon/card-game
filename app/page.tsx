"use client";
console.log("PAGE LOADED");
import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "./lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function Home() {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function createRoom() {
    if (!name.trim()) return setError("이름을 입력해주세요");
    setLoading(true);
    const code = generateRoomCode();
    await setDoc(doc(db, "rooms", code), {
      host: name,
      players: [{ name, isHost: true }],
      status: "waiting",
      gameType: null,
      createdAt: Date.now(),
    });
    sessionStorage.setItem("playerName", name);
    sessionStorage.setItem("roomCode", code);
    sessionStorage.setItem("isHost", "true");
    window.location.href = `/room/${code}?name=${name}&host=true`;
  }

  async function joinRoom() {
    if (!name.trim()) return setError("이름을 입력해주세요");
    if (!roomCode.trim()) return setError("방 코드를 입력해주세요");
    setLoading(true);
    const ref = doc(db, "rooms", roomCode.toUpperCase());
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      setError("존재하지 않는 방입니다");
      setLoading(false);
      return;
    }
    const data = snap.data();
    if (data.status !== "waiting") {
      setError("이미 게임이 시작된 방입니다");
      setLoading(false);
      return;
    }
    const updatedPlayers = [...data.players, { name, isHost: false }];
    await setDoc(ref, { ...data, players: updatedPlayers });
    sessionStorage.setItem("playerName", name);
    sessionStorage.setItem("roomCode", roomCode.toUpperCase());
    sessionStorage.setItem("isHost", "false");
    window.location.href = `/room/${roomCode.toUpperCase()}?name=${name}&host=false`;
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      display: "flex",
      alignItems: "center",
      justify: "center",
      fontFamily: "'Segoe UI', sans-serif",
      padding: "20px",
    }}>
      <div style={{
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "24px",
        padding: "48px",
        width: "100%",
        maxWidth: "420px",
        color: "white",
      }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ fontSize: "48px", marginBottom: "8px" }}>🃏</div>
          <h1 style={{ fontSize: "28px", fontWeight: "800", margin: 0 }}>카드 게임</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", marginTop: "8px", fontSize: "14px" }}>
            사회자 없이 즐기는 실시간 멀티플레이
          </p>
        </div>

        {error && (
          <div style={{
            background: "rgba(255,80,80,0.2)",
            border: "1px solid rgba(255,80,80,0.4)",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "16px",
            fontSize: "14px",
            color: "#ff9090",
          }}>{error}</div>
        )}

        <input
          value={name}
          onChange={e => { setName(e.target.value); setError(""); }}
          placeholder="닉네임 입력"
          style={inputStyle}
        />

        <button onClick={createRoom} disabled={loading} style={primaryBtnStyle}>
          {loading ? "..." : "🚀 방 만들기"}
        </button>

        <div style={{ display: "flex", alignItems: "center", margin: "20px 0", gap: "12px" }}>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.15)" }} />
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>또는</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.15)" }} />
        </div>

        <input
          value={roomCode}
          onChange={e => { setRoomCode(e.target.value.toUpperCase()); setError(""); }}
          placeholder="방 코드 입력 (예: AB12CD)"
          style={inputStyle}
        />

        <button onClick={joinRoom} disabled={loading} style={secondaryBtnStyle}>
          {loading ? "..." : "🎮 방 참가하기"}
        </button>
      </div>
    </main>
  );
}

// ⭕ 이 스타일 뭉치들이 확실하게 고정된 CSS 속성임을 Vercel에게 선언합니다.
const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: "12px",
  color: "white",
  fontSize: "15px",
  marginBottom: "12px",
  outline: "none",
  boxSizing: "border-box" as const,
};

const primaryBtnStyle = {
  width: "100%",
  padding: "14px",
  background: "linear-gradient(135deg, #667eea, #764ba2)",
  border: "none" as const,
  borderRadius: "12px",
  color: "white",
  fontSize: "16px",
  fontWeight: "700" as const,
  cursor: "pointer" as const,
  marginBottom: "8px",
};

const secondaryBtnStyle = {
  width: "100%",
  padding: "14px",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "12px",
  color: "white",
  fontSize: "16px",
  fontWeight: "700" as const,
  cursor: "pointer" as const,
};