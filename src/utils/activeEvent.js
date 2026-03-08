let cachedEventId = null;

export async function getActiveEventId() {
  if (cachedEventId) return cachedEventId;

  // 1. Check localStorage first (set by browser create event flow)
  const localEventId = localStorage.getItem('blockbadge_active_event_id');
  if (localEventId) {
    cachedEventId = localEventId;
    return cachedEventId;
  }

  // 2. Try public/event-info.json (set by create-event.cjs)
  try {
    const response = await fetch("/event-info.json");
    if (response.ok) {
      const data = await response.json();
      if (data.eventId) {
        cachedEventId = data.eventId;
        return cachedEventId;
      }
    }
  } catch {}

  // 3. Fallback to .env
  const envEventId = import.meta.env.VITE_ACTIVE_EVENT_ID;
  if (envEventId) {
    cachedEventId = envEventId;
    return cachedEventId;
  }

  throw new Error("No active event ID found.");
}

export function setActiveEventId(id) {
  cachedEventId = id;
  localStorage.setItem('blockbadge_active_event_id', id);
}

export function clearCachedEventId() {
  cachedEventId = null;
}