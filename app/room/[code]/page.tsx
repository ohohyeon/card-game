"use client";
import { useState, useEffect, Suspense } from "react"; // ⭕ Suspense 추가
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { db } from "../../lib/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";

// ==========================================
// 1. 실시간 방 데이터 및 게임 선택 컴포넌트
// ==========================================
function RoomContent() {
  const params = useParams();
  const code = Array.isArray(params?.code) ? params.code[0] : params?.code;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [room, setRoom] = useState<any>(null);
  const [playerName, setPlayerName] = useState("");
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    if (!code) return;
    
    const nameFromUrl = searchParams.get("name") || "";
    const hostFromUrl = searchParams.get("host") === "true";
    
    setPlayerName(nameFromUrl);
    setIsHost(hostFromUrl);

    if (typeof code !== "string") return;
    
    const unsub = onSnapshot(doc(db, "rooms", code), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRoom(data);
        if (data.status === "playing" && data.gameType) {
          router.push(`/game/${code}?type=${data.gameType}&name=${encodeURIComponent(nameFromUrl)}&host=${hostFromUrl}`);
        }
      }
    });
    return () => unsub();
  }, [code, searchParams, router]);
  
  async function startGame(gameType: string) {
    if (typeof code !== "string") return;
    await updateDoc(doc(db, "rooms", code), {
      status: "playing",
      gameType,
    });
    router.push(`/game/${code}?type=${gameType}&name=${encodeURIComponent(playerName)}&host=true`);
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
          {room.players?.map((p: any, i: number) => (
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

// ==========================================
// 2. Vercel(Next.js) 빌드 에러 방지용 최상단 배리어
// ==========================================
export default function RoomPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:"100vh", background:"#1a1a2e", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:"18px" }}>
        로딩 중...
      </div>
    }>
      <RoomContent />
    </Suspense>
  );
}