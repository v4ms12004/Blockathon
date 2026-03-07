// ─── Pinata IPFS Utility Functions ──────────────────────────────
//THE FILE RESPONSIBLE FOR INTERACTING WITH PINATA API TO UPLOAD BADGE IMAGES AND METADATA TO IPFS, AND FETCHING DATA FROM IPFS USING CIDs.

import axios from "axios";

const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET = import.meta.env.VITE_PINATA_SECRET;
const PINATA_BASE = "https://api.pinata.cloud";
const GATEWAY = "https://gateway.pinata.cloud/ipfs";

// ─── Pin JSON metadata to IPFS ─────────────────────────────────
export async function pinBadgeMetadata(metadata) {
  try {
    const response = await axios.post(
      `${PINATA_BASE}/pinning/pinJSONToIPFS`,
      metadata,
      {
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET,
        },
      }
    );
    return { success: true, cid: response.data.IpfsHash };
  } catch (err) {
    console.error("Pinata JSON error:", err);
    return { success: false, error: err.message };
  }
}

// ─── Pin badge image to IPFS ───────────────────────────────────
export async function pinBadgeImage(file) {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axios.post(
      `${PINATA_BASE}/pinning/pinFileToIPFS`,
      formData,
      {
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET,
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return { success: true, cid: response.data.IpfsHash };
  } catch (err) {
    console.error("Pinata file error:", err);
    return { success: false, error: err.message };
  }
}

// ─── Fetch badge metadata from IPFS ───────────────────────────
export async function fetchFromIPFS(cid) {
  try {
    const response = await axios.get(`${GATEWAY}/${cid}`);
    return { success: true, data: response.data };
  } catch (err) {
    console.error("IPFS fetch error:", err);
    return { success: false, error: err.message };
  }
}

// ─── Get image URL from CID ────────────────────────────────────
export function getIPFSImageUrl(cid) {
  return `${GATEWAY}/${cid}`;
}