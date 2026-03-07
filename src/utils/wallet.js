import { generateWallet } from "./xrpl";

const WALLET_KEY = "blockbadge_wallet";
const CHECKINS_KEY = "blockbadge_checkins";

// ─── Get existing wallet or create new one ─────────────────────
export function getOrCreateWallet() {
  const existing = localStorage.getItem(WALLET_KEY);
  if (existing) {
    return JSON.parse(existing);
  }
  const newWallet = generateWallet();
  localStorage.setItem(WALLET_KEY, JSON.stringify(newWallet));
  return newWallet;
}

// ─── Get wallet if it exists ───────────────────────────────────
export function getWallet() {
  const existing = localStorage.getItem(WALLET_KEY);
  return existing ? JSON.parse(existing) : null;
}

// ─── Clear wallet (for testing) ───────────────────────────────
export function clearWallet() {
  localStorage.removeItem(WALLET_KEY);
  localStorage.removeItem(CHECKINS_KEY);
}

// ─── Check if already checked in locally ──────────────────────
export function isCheckedInLocally(checkpointId) {
  const checkins = JSON.parse(localStorage.getItem(CHECKINS_KEY) || "[]");
  return checkins.includes(checkpointId);
}

// ─── Save check-in locally ─────────────────────────────────────
export function saveCheckinLocally(checkpointId) {
  const checkins = JSON.parse(localStorage.getItem(CHECKINS_KEY) || "[]");
  if (!checkins.includes(checkpointId)) {
    checkins.push(checkpointId);
    localStorage.setItem(CHECKINS_KEY, JSON.stringify(checkins));
  }
}

// ─── Get all local checkins ────────────────────────────────────
export function getLocalCheckins() {
  return JSON.parse(localStorage.getItem(CHECKINS_KEY) || "[]");
}

// ─── Determine badge tier based on token balance ───────────────
export function getBadgeTier(balance) {
  const gold = parseInt(import.meta.env.VITE_GOLD_THRESHOLD);
  const silver = parseInt(import.meta.env.VITE_SILVER_THRESHOLD);
  const bronze = parseInt(import.meta.env.VITE_BRONZE_THRESHOLD);

  if (balance >= gold) return { tier: "gold", label: "🥇 Gold", tokensRequired: gold };
  if (balance >= silver) return { tier: "silver", label: "🥈 Silver", tokensRequired: silver };
  if (balance >= bronze) return { tier: "bronze", label: "🥉 Bronze", tokensRequired: bronze };
  return null;
}