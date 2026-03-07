const EVENTS_KEY = "blockbadge_events";
const ACTIVE_EVENT_KEY = "blockbadge_active_event";

// ─── Generate simple unique ID ─────────────────────────────────
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ─── Get all events ────────────────────────────────────────────
export function getAllEvents() {
  return JSON.parse(localStorage.getItem(EVENTS_KEY) || "[]");
}

// ─── Get single event by ID ────────────────────────────────────
export function getEvent(eventId) {
  const events = getAllEvents();
  return events.find((e) => e.id === eventId) || null;
}

// ─── Create a new event ────────────────────────────────────────
export function createEvent({
  name,
  description,
  date,
  goldThreshold,
  silverThreshold,
  bronzeThreshold,
  goldCid,
  silverCid,
  bronzeCid,
  goldImageCid,
  silverImageCid,
  bronzeImageCid,
}) {
  const events = getAllEvents();
  const newEvent = {
    id: generateId(),
    name,
    description,
    date,
    createdAt: new Date().toISOString(),
    status: "active",
    thresholds: {
      gold: parseInt(goldThreshold),
      silver: parseInt(silverThreshold),
      bronze: parseInt(bronzeThreshold),
    },
    badgeCids: {
      gold: goldCid,
      silver: silverCid,
      bronze: bronzeCid,
    },
    badgeImageCids: {
      gold: goldImageCid,
      silver: silverImageCid,
      bronze: bronzeImageCid,
    },
    checkpoints: [],
  };
  events.push(newEvent);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  return newEvent;
}

// ─── Add checkpoint to event ───────────────────────────────────
export function addCheckpoint(eventId, checkpointName) {
  const events = getAllEvents();
  const idx = events.findIndex((e) => e.id === eventId);
  if (idx === -1) return null;

  const checkpoint = {
    id: generateId(),
    name: checkpointName,
    createdAt: new Date().toISOString(),
    tokensAwarded: 10,
  };

  events[idx].checkpoints.push(checkpoint);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  return checkpoint;
}

// ─── End an event ──────────────────────────────────────────────
export function endEvent(eventId) {
  const events = getAllEvents();
  const idx = events.findIndex((e) => e.id === eventId);
  if (idx === -1) return false;
  events[idx].status = "ended";
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  return true;
}

// ─── Set active event (for participant view) ───────────────────
export function setActiveEvent(eventId) {
  localStorage.setItem(ACTIVE_EVENT_KEY, eventId);
}

// ─── Get active event ──────────────────────────────────────────
export function getActiveEvent() {
  const eventId = localStorage.getItem(ACTIVE_EVENT_KEY);
  if (!eventId) return null;
  return getEvent(eventId);
}

// ─── Get badge tier for a balance ─────────────────────────────
export function getBadgeTierForEvent(eventId, balance) {
  const event = getEvent(eventId);
  if (!event) return null;

  const { gold, silver, bronze } = event.thresholds;

  if (balance >= gold)
    return {
      tier: "gold",
      label: "🥇 Gold",
      tokensRequired: gold,
      cid: event.badgeCids.gold,
      imageCid: event.badgeImageCids.gold,
    };
  if (balance >= silver)
    return {
      tier: "silver",
      label: "🥈 Silver",
      tokensRequired: silver,
      cid: event.badgeCids.silver,
      imageCid: event.badgeImageCids.silver,
    };
  if (balance >= bronze)
    return {
      tier: "bronze",
      label: "🥉 Bronze",
      tokensRequired: bronze,
      cid: event.badgeCids.bronze,
      imageCid: event.badgeImageCids.bronze,
    };

  return null;
}

// ─── Clear all data (for testing) ─────────────────────────────
export function clearAllEvents() {
  localStorage.removeItem(EVENTS_KEY);
  localStorage.removeItem(ACTIVE_EVENT_KEY);
}