"use client";
import { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { db } from "../../lib/firebase";
import { doc, onSnapshot, updateDoc, getDoc } from "firebase/firestore";

// ==========================================
// 1. 게임 엔진 및 유틸리티 함수들
// ==========================================
function createDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const values = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
  const deck = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

function cardValue(targetCard: any) {
  const order = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
  return order.indexOf(targetCard.value);
}

function suitValue(targetCard: any) {
  const order = ["♣","♥","♦","♠"];
  return order.indexOf(targetCard.suit);
}

function cardColor(suit: string) {
  return suit === "♥" || suit === "♦" ? "#ff4444" : "#1a1a2e";
}

// ==========================================
// 2. 메인 게임 콘텐츠 컴포넌트 (useSearchParams 안전 처리)
// ==========================================
function GameContent() {
  const params = useParams();
  const code = Array.isArray(params?.code) ? params.code[0] : params?.code;
  const searchParams = useSearchParams();
  const gameType = searchParams.get("type");
  
  const [room, setRoom] = useState<any>(null);
  const [playerName, setPlayerName] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [gameState, setGameState] = useState<any>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!code) return;
    const name = searchParams.get("name") || "";
    const host = searchParams.get("host") === "true";
    setPlayerName(name);
    setIsHost(host);

    const unsub = onSnapshot(doc(db, "rooms", code), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRoom(data);
        setGameState(data.gameState || null);
      }
    });
    return () => unsub();
  }, [code, searchParams]);

  useEffect(() => {
    if (isHost && room && !gameState && !initialized) {
      setInitialized(true);
      initGame();
    }
  }, [isHost, room, gameState, initialized]);

  async function initGame() {
    if (!code || !room) return;
    const snap = await getDoc(doc(db, "rooms", code));
    const data = snap.data();
    if (!data) return;
    
    const players = data.players;
    const deck = createDeck();
    let newGameState = {};

    if (gameType === "highcard") {
      const hands: any = {};
      players.forEach((p: any) => { hands[p.name] = [deck.pop()]; });
      newGameState = { phase: "reveal", hands, revealed: true };
    } else if (gameType === "blackjack") {
      const hands: any = {};
      players.forEach((p: any) => { hands[p.name] = [deck.pop(), deck.pop()]; });
      newGameState = { phase: "playing", hands, stood: {}, bust: {}, deck: deck.slice(0, 20), currentTurn: players[0].name };
    } else if (gameType === "poker") {
      const hands: any = {};
      players.forEach((p: any) => { hands[p.name] = [deck.pop(), deck.pop()]; });
      newGameState = { phase: "preflop", hands, community: [], deck: deck.slice(0, 20) };
    }

    await updateDoc(doc(db, "rooms", code), { gameState: newGameState });
  }

  if (!room || !gameState) return (
    <div style={{ minHeight:"100vh", background:"#1a1a2e", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:"18px" }}>
      로딩 중...
    </div>
  );

  // ⭕ 아래 하위 컴포넌트들이 정상적으로 로드되도록 완벽히 배치됨
  if (gameType === "highcard") return <HighCard gameState={gameState} playerName={playerName} players={room.players} />;
  if (gameType === "blackjack") return <Blackjack gameState={gameState} playerName={playerName} players={room.players} isHost={isHost} code={code} />;
  if (gameType === "poker") return <Poker gameState={gameState} playerName={playerName} players={room.players} isHost={isHost} code={code} />;
  return null;
}

// ==========================================
// 3. 빌드 에러 방지를 위한 최상단 배리어 컴포넌트
// ==========================================
export default function GamePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:"100vh", background:"#1a1a2e", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:"18px" }}>
        로딩 중...
      </div>
    }>
      <GameContent />
    </Suspense>
  );
}

// ==========================================
// 4. 개별 게임 서브 컴포넌트들 (기존 로직 유지)
// ==========================================
function HighCard({ gameState, playerName, players }: any) {
  const { hands } = gameState;
  const winner = players.reduce((best: any, p: any) => {
    const playerCard = hands[p.name]?.[0];
    if (!best) return p;
    const bestCard = hands[best.name]?.[0];
    if (cardValue(playerCard) > cardValue(bestCard)) return p;
    if (cardValue(playerCard) === cardValue(bestCard) && suitValue(playerCard) > suitValue(bestCard)) return p;
    return best;
  }, null);

  return (
    <GameLayout title="🎴 하이카드">
      <div style={{ display:"flex", flexWrap:"wrap", gap:"16px", justifyContent:"center", marginBottom:"32px" }}>
        {players.map((p: any) => {
          const playerCard = hands[p.name]?.[0];
          const isWinner = winner?.name === p.name;
          return (
            <div key={p.name} style={{
              background: isWinner ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.05)",
              border: `2px solid ${isWinner ? "#ffd700" : "rgba(255,255,255,0.1)"}`,
              borderRadius: "16px", padding: "20px", textAlign: "center", minWidth: "120px",
            }}>
              {isWinner && <div style={{ fontSize:"20px", marginBottom:"4px" }}>👑</div>}
              <div style={{ fontWeight:"700", marginBottom:"12px" }}>{p.name}{p.name === playerName ? " (나)" : ""}</div>
              {playerCard && <CardUI card={playerCard} />}
            </div>
          );
        })}
      </div>
      <ResultBanner winner={winner?.name} playerName={playerName} />
    </GameLayout>
  );
}

function Blackjack({ gameState, playerName, players, isHost, code }: any) {
  const { hands, stood, bust, currentTurn, phase, deck } = gameState;

  function calcScore(cards: any[]) {
    let score = 0, aces = 0;
    for (const c of cards) {
      if (["J","Q","K"].includes(c.value)) score += 10;
      else if (c.value === "A") { score += 11; aces++; }
      else score += parseInt(c.value);
    }
    while (score > 21 && aces > 0) { score -= 10; aces--; }
    return score;
  }

  function getNextTurn(newStood = stood) {
    const idx = players.findIndex((p: any) => p.name === currentTurn);
    for (let i = 1; i <= players.length; i++) {
      const next = players[(idx + i) % players.length];
      if (!newStood[next.name] && !bust[next.name]) return next.name;
    }
    return null;
  }

  function isGameOver(s: any, b: any) {
    return players.every((p: any) => s[p.name] || b[p.name]);
  }

  async function hit() {
    if (currentTurn !== playerName) return;
    const newCard = deck[0];
    const newDeck = deck.slice(1);
    const newHand = [...hands[playerName], newCard];
    const score = calcScore(newHand);
    const newBust = { ...bust };
    const newStood = { ...stood };
    let newPhase = phase;
    let nextTurn = currentTurn;
    if (score > 21) {
      newBust[playerName] = true;
      nextTurn = getNextTurn(newStood);
      if (isGameOver(newStood, newBust)) newPhase = "result";
    }
    await updateDoc(doc(db, "rooms", code), {
      gameState: { ...gameState, hands: { ...hands, [playerName]: newHand }, deck: newDeck, bust: newBust, currentTurn: nextTurn, phase: newPhase }
    });
  }

  async function stand() {
    if (currentTurn !== playerName) return;
    const newStood = { ...stood, [playerName]: true };
    const nextTurn = getNextTurn(newStood);
    let newPhase = phase;
    if (isGameOver(newStood, bust)) newPhase = "result";
    await updateDoc(doc(db, "rooms", code), {
      gameState: { ...gameState, stood: newStood, currentTurn: nextTurn, phase: newPhase }
    });
  }

  const scores: any = {};
  players.forEach((p: any) => { scores[p.name] = calcScore(hands[p.name] || []); });

  let winner: any = null;
  if (phase === "result") {
    winner = players.reduce((best: any, p: any) => {
      if (bust[p.name]) return best;
      if (!best || scores[p.name] > scores[best.name]) return p;
      return best;
    } , null);
  }

  return (
    <GameLayout title="🂡 블랙잭">
      {phase !== "result" && (
        <div style={{ textAlign:"center", marginBottom:"20px", color:"rgba(255,255,255,0.6)", fontSize:"14px" }}>
          {currentTurn === playerName ? "⚡ 당신의 차례입니다!" : `⏳ ${currentTurn}의 차례`}
        </div>
      )}
      <div style={{ display:"flex", flexWrap:"wrap", gap:"16px", justifyContent:"center", marginBottom:"24px" }}>
        {players.map((p: any) => {
          const isMe = p.name === playerName;
          const isBust = bust[p.name];
          const isStood = stood[p.name];
          const showCards = isMe || phase === "result";
          return (
            <div key={p.name} style={{
              background: winner?.name === p.name ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.05)",
              border: `2px solid ${winner?.name === p.name ? "#ffd700" : isBust ? "#ff4444" : "rgba(255,255,255,0.1)"}`,
              borderRadius: "16px", padding: "16px", textAlign: "center", minWidth: "130px",
            }}>
              <div style={{ fontWeight:"700", marginBottom:"8px" }}>{p.name}{isMe ? " (나)" : ""}</div>
              <div style={{ display:"flex", gap:"6px", justifyContent:"center", flexWrap:"wrap" }}>
                {(hands[p.name] || []).map((c: any, i: number) =>
                  showCards ? <CardUI key={i} card={c} small /> : <CardBack key={i} />
                )}
              </div>
              {showCards && (
                <div style={{ marginTop:"8px", fontSize:"18px", fontWeight:"800" }}>
                  {scores[p.name]}
                  {isBust && <span style={{ color:"#ff4444", fontSize:"13px", marginLeft:"6px" }}>버스트!</span>}
                  {isStood && !isBust && <span style={{ color:"#aaa", fontSize:"13px", marginLeft:"6px" }}>스탠드</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {currentTurn === playerName && phase !== "result" && (
        <div style={{ display:"flex", gap:"12px", justifyContent:"center" }}>
          <button onClick={hit} style={actionBtn("#667eea")}>카드 받기 (Hit)</button>
          <button onClick={stand} style={actionBtn("#e07b39")}>멈추기 (Stand)</button>
        </div>
      )}
      {phase === "result" && <ResultBanner winner={winner?.name} playerName={playerName} />}
    </GameLayout>
  );
}

function Poker({ gameState, playerName, players, isHost, code }: any) {
  const { hands, community, phase, deck } = gameState;
  const phaseNames: any = { preflop:"프리플랍", flop:"플랍 (3장)", turn:"턴 (4장)", river:"리버 (5장)", result:"최종 결과" };

  async function nextPhase() {
    if (!isHost) return;
    let newCommunity = [...community];
    let newDeck = [...deck];
    let newPhase = phase;
    if (phase === "preflop") { newCommunity = [newDeck.pop(), newDeck.pop(), newDeck.pop()]; newPhase = "flop"; }
    else if (phase === "flop") { newCommunity.push(newDeck.pop()); newPhase = "turn"; }
    else if (phase === "turn") { newCommunity.push(newDeck.pop()); newPhase = "river"; }
    else if (phase === "river") { newPhase = "result"; }
    await updateDoc(doc(db, "rooms", code), {
      gameState: { ...gameState, community: newCommunity, deck: newDeck, phase: newPhase }
    });
  }

  function getHandRank(cards: any[]) {
    const values = cards.map(c => ["2","3","4","5","6","7","8","9","10","J","Q","K","A"].indexOf(c.value));
    const suits = cards.map(c => c.suit);
    const valueCounts: any = {};
    values.forEach(v => valueCounts[v] = (valueCounts[v] || 0) + 1);
    const counts = Object.values(valueCounts).sort((a: any, b: any) => Number(b) - Number(a));
    const isFlush = suits.every(s => s === suits[0]);
    const sorted = [...values].sort((a, b) => Number(a) - Number(b));
    const isStraight = sorted[4] - sorted[0] === 4 && new Set(sorted).size === 5;
    if (isFlush && isStraight) return 8;
    if (counts[0] === 4) return 7;
    if (counts[0] === 3 && counts[1] === 2) return 6;
    if (isFlush) return 5;
    if (isStraight) return 4;
    if (counts[0] === 3) return 3;
    if (counts[0] === 2 && counts[1] === 2) return 2;
    if (counts[0] === 2) return 1;
    return 0;
  }

  const rankNames = ["하이카드","원페어","투페어","트리플","스트레이트","플러시","풀하우스","포카드","스트레이트 플러시"];

  let winner: any = null;
  if (phase === "result") {
    winner = players.reduce((best: any, p: any) => {
      const allCards = [...(hands[p.name] || []), ...community];
      if (allCards.length < 5) return best;
      const rank = getHandRank(allCards);
      if (!best) return { ...p, rank };
      return rank > best.rank ? { ...p, rank } : best;
    }, null);
  }

  return (
    <GameLayout title="♠️ 포커">
      <div style={{ textAlign:"center", marginBottom:"20px" }}>
        <span style={{ background:"rgba(102,126,234,0.2)", border:"1px solid rgba(102,126,234,0.4)", padding:"6px 16px", borderRadius:"999px", fontSize:"14px", color:"#a78bfa" }}>
          {phaseNames[phase]}
        </span>
      </div>
      {community && community.length > 0 && (
        <div style={{ marginBottom:"24px" }}>
          <p style={{ color:"rgba(255,255,255,0.5)", fontSize:"13px", textAlign:"center", marginBottom:"10px" }}>공개 카드</p>
          <div style={{ display:"flex", gap:"8px", justifyContent:"center" }}>
            {community.map((c: any, i: number) => <CardUI key={i} card={c} />)}
          </div>
        </div>
      )}
      <div style={{ display:"flex", flexWrap:"wrap", gap:"16px", justifyContent:"center", marginBottom:"24px" }}>
        {players.map((p: any) => {
          const isMe = p.name === playerName;
          const showCards = isMe || phase === "result";
          const allCards = [...(hands[p.name] || []), ...(community || [])];
          const rank = phase === "result" && allCards.length >= 5 ? getHandRank(allCards) : null;
          return (
            <div key={p.name} style={{
              background: winner?.name === p.name ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.05)",
              border: `2px solid ${winner?.name === p.name ? "#ffd700" : "rgba(255,255,255,0.1)"}`,
              borderRadius: "16px", padding: "16px", textAlign: "center",
            }}>
              {winner?.name === p.name && <div style={{ fontSize:"18px" }}>👑</div>}
              <div style={{ fontWeight:"700", marginBottom:"8px" }}>{p.name}{isMe ? " (나)" : ""}</div>
              <div style={{ display:"flex", gap:"6px", justifyContent:"center" }}>
                {(hands[p.name] || []).map((c: any, i: number) =>
                  showCards ? <CardUI key={i} card={c} /> : <CardBack key={i} />
                )}
              </div>
              {rank !== null && <div style={{ marginTop:"8px", fontSize:"13px", color:"#a78bfa" }}>{rankNames[rank]}</div>}
            </div>
          );
        })}
      </div>
      {isHost && phase !== "result" && (
        <div style={{ textAlign:"center" }}>
          <button onClick={nextPhase} style={actionBtn("#667eea")}>
            {phase === "river" ? "결과 보기" : "다음 단계 →"}
          </button>
        </div>
      )}
      {phase === "result" && <ResultBanner winner={winner?.name} playerName={playerName} />}
    </GameLayout>
  );
}

// ==========================================
// 5. 공통 UI 컴포넌트 및 유틸 스타일
// ==========================================
function CardUI({ card, small = false }: any) {
  const size = small ? { width:"44px", height:"64px", fontSize:"13px" } : { width:"56px", height:"80px", fontSize:"16px" }; // ⭕ 세미콜론 삭제!
  return (
    <div style={{ ...size, background:"white", borderRadius:"8px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:cardColor(card.suit), fontWeight:"800", boxShadow:"0 4px 12px rgba(0,0,0,0.3)" }}>
      <div>{card.value}</div>
      <div style={{ fontSize: small ? "16px" : "20px" }}>{card.suit}</div>
    </div>
  );
}

function CardBack() {
  return (
    <div style={{ width:"44px", height:"64px", background:"linear-gradient(135deg, #667eea, #764ba2)", borderRadius:"8px", boxShadow:"0 4px 12px rgba(0,0,0,0.3)" }} />
  );
}

function GameLayout({ title, children }: any) {
  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", fontFamily:"'Segoe UI', sans-serif", padding:"24px 20px", color:"white" }}>
      <h2 style={{ textAlign:"center", fontSize:"24px", fontWeight:"800", marginBottom:"24px" }}>{title}</h2>
      {children}
    </main>
  );
}

function ResultBanner({ winner, playerName }: any) {
  const isWinner = winner === playerName;
  return (
    <div style={{ textAlign:"center", padding:"24px", background: isWinner ? "rgba(255,215,0,0.1)" : "rgba(255,255,255,0.05)", border:`2px solid ${isWinner ? "#ffd700" : "rgba(255,255,255,0.1)"}`, borderRadius:"16px", marginTop:"16px" }}>
      <div style={{ fontSize:"36px", marginBottom:"8px" }}>{isWinner ? "🏆" : "😢"}</div>
      <div style={{ fontSize:"20px", fontWeight:"800" }}>{isWinner ? "승리!" : `${winner} 승리!`}</div>
    </div>
  );
}

function actionBtn(color: string) {
  return { padding:"12px 24px", background:color, border:"none", borderRadius:"12px", color:"white", fontSize:"15px", fontWeight:"700" as const, cursor:"pointer" };
}