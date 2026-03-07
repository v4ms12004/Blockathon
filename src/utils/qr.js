// ─── Generate QR code data for a checkpoint ────────────────────
export function generateQRData(eventId, checkpointId) {
  const baseUrl = window.location.origin;
  return `${baseUrl}/checkin/${eventId}/${checkpointId}`;
}

// ─── Parse QR data (used on checkin page) ─────────────────────
export function parseQRData(url) {
  try {
    const parts = url.split("/");
    const checkpointId = parts[parts.length - 1];
    const eventId = parts[parts.length - 2];
    return { eventId, checkpointId };
  } catch {
    return null;
  }
}