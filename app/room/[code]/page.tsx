"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "../../lib/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";

export default function RoomPage() {
  const params = useParams();
  const code = params?.code;
  const router = useRouter();
  const [room, setRoom] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    if (!code) return;
    
    // URL에서 파라미터 읽기
    const urlParams = new URLSearchParams(window.location.search);
    const nameFromUrl = urlParams.get("name") || "";
    const hostFromUrl = urlParams.get("host") === "true";
    
    setPlayerName(nameFromUrl);
    setIsHost(hostFromUrl);
    
    const unsub = onSnapshot(doc(db, "rooms", code), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRoom(data);
        if (data.status === "playing" && data.gameType) {
          window.location.href = `/game/${code}?type=${data.gameType}&name=${nameFromUrl}&host=${hostFromUrl}`;
        }
      }
    });
    return () => unsub();
  }, [code]);
  
async function startGame(gameType) {
    await updateDoc(doc(db, "rooms", code), {
      status: "playing",
      gameType,
    });
    window.location.href = `/game/${code}?type=${gameType}&name=${playerName}&host=true`;
  }

  if (!room) return (
    <div style={{ minHeight:"100vh", background:"#1a1a2e", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:"18px" }}>
      로딩 중...
    </div>
  );

  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Segoe UI', sans-serif",
      padding: "20px",
      color: "white",
    }}>
      <div style={{
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "24px",
        padding: "40px",
        width: "100%",
        maxWidth: "480px",
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", margin: 0 }}>방 코드</p>
          <h1 style={{ fontSize: "36px", fontWeight: "900", letterSpacing: "8px", margin: "8px 0" }}>
            {code}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
            친구에게 이 코드를 알려주세요
          </p>
        </div>

        <div style={{ marginBottom: "32px" }}>
          <h3 style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", marginBottom: "12px" }}>
            참가자 ({room.players?.length || 0}명)
          </h3>
          {room.players?.map((p, i) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 16px",
              background: "rgba(255,255,255,0.06)",
              borderRadius: "10px",
              marginBottom: "8px",
            }}>
              <span style={{ fontSize: "20px" }}>{p.isHost ? "👑" : "🎮"}</span>
              <span style={{ fontWeight: p.name === playerName ? "700" : "400" }}>
                {p.name} {p.name === playerName ? "(나)" : ""}
              </span>
              {p.isHost && (
                <span style={{
                  marginLeft: "auto",
                  fontSize: "11px",
                  background: "rgba(255,200,0,0.2)",
                  color: "#ffd700",
                  padding: "2px 8px",
                  borderRadius: "999px",
                }}>호스트</span>
              )}
            </div>
          ))}
        </div>

        {isHost ? (
          <div>
            <h3 style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", marginBottom: "12px" }}>
              게임 선택
            </h3>
            {[
              { type: "highcard", emoji: "🎴", name: "하이카드", desc: "가장 높은 카드가 이긴다" },
              { type: "poker", emoji: "♠️", name: "포커", desc: "5장으로 족보 대결" },
              { type: "blackjack", emoji: "🂡", name: "블랙잭", desc: "21에 가장 가까운 사람이 이긴다" },
            ].map(g => (
              <button key={g.type} onClick={() => startGame(g.type)} style={{
                width: "100%",
                padding: "16px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "12px",
                color: "white",
                marginBottom: "10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                textAlign: "left",
              }}>
                <span style={{ fontSize: "28px" }}>{g.emoji}</span>
                <div>
                  <div style={{ fontWeight: "700", fontSize: "16px" }}>{g.name}</div>
                  <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>{g.desc}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: "center",
            padding: "24px",
            background: "rgba(255,255,255,0.04)",
            borderRadius: "12px",
            color: "rgba(255,255,255,0.5)",
          }}>
            ⏳ 호스트가 게임을 선택할 때까지 기다려주세요...
          </div>
        )}
      </div>
    </main>
  );
}