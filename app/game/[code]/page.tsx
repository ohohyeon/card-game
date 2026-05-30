"use client";
import { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { db } from "../../lib/firebase";
import { doc, onSnapshot, updateDoc, getDoc } from "firebase/firestore";

// ... (createDeck, cardValue, suitValue, cardColor 함수들은 기존과 동일) ...
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

// ⭕ useSearchParams 에러 방지를 위한 내부 메인 컴포넌트 분리
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

  if (gameType === "highcard") return <HighCard gameState={gameState} playerName={playerName} players={room.players} />;
  if (gameType === "blackjack") return <Blackjack gameState={gameState} playerName={playerName} players={room.players} isHost={isHost} code={code} />;
  if (gameType === "poker") return <Poker gameState={gameState} playerName={playerName} players={room.players} isHost={isHost} code={code} />;
  return null;
}

// ⭕ Vercel 빌드 에러 방지를 위해 최종 export 대상을 Suspense로 감쌈
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

// ... (하위 HighCard, Blackjack, Poker 컴포넌트들은 그대로 유지) ...
// 기존 코드에 적어두신 주석대로 타입 가드 처리가 잘 되어 있어서 하위 컴포넌트는 유지하셔도 무방합니다.