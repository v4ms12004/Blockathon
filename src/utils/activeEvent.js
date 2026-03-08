// Automatically reads the active event ID from event-info.json
// Falls back to VITE_ACTIVE_EVENT_ID in .env if file not found

let cachedEventId = null;

export async function getActiveEventId() {
  if (cachedEventId) return cachedEventId;

  try {
    const response = await fetch("/event-info.json");
    if (response.ok) {
      const data = await response.json();
      if (data.eventId) {
        cachedEventId = data.eventId;
        return cachedEventId;
      }
    }
  } catch (err) {
    console.warn("Could not load event-info.json, falling back to .env");
  }

  // Fallback to .env
  const envEventId = import.meta.env.VITE_ACTIVE_EVENT_ID;
  if (envEventId) {
    cachedEventId = envEventId;
    return cachedEventId;
  }

  throw new Error("No active event ID found. Run create-event.cjs first.");
}

export function clearCachedEventId() {
  cachedEventId = null;
}

export function setActiveEventId(id) {
  cachedEventId = id;
}