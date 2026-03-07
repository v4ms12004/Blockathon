import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getClient } from "../utils/xrpl";
import { fetchFromIPFS, getIPFSImageUrl } from "../utils/pinata";

export default function Verify() {
  const { txHash } = useParams();
  const [step, setStep] = useState("loading");
  // loading | verified | error
  const [badgeData, setBadgeData] = useState(null);
  const [txData, setTxData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function verifyBadge() {
      try {
        // Step 1 — Fetch transaction from XRPL
        const client = await getClient();
        const response = await client.request({
          command: "tx",
          transaction: txHash,
        });
        await client.disconnect();

        const tx = response.result;

        // Step 2 — Extract memo (CID)
        const memos = tx.Memos;
        if (!memos || memos.length === 0) {
          throw new Error("No memo found in transaction.");
        }

        const memoHex = memos[0].Memo.MemoData;
        const memoDecoded = JSON.parse(
          Buffer.from(memoHex, "hex").toString("utf8")
        );

        setTxData({
          issuer: tx.Account,
          recipient: tx.Destination,
          timestamp: new Date(
            (tx.date + 946684800) * 1000
          ).toLocaleString(),
          txHash: txHash,
          tier: memoDecoded.badgeTier,
          eventId: memoDecoded.eventId,
        });

        // Step 3 — Fetch badge metadata from IPFS if CID exists
        if (memoDecoded.cid) {
          const ipfsResult = await fetchFromIPFS(memoDecoded.cid);
          if (ipfsResult.success) {
            setBadgeData(ipfsResult.data);
          }
        }

        setStep("verified");
      } catch (err) {
        console.error("Verify error:", err);
        setError(err.message || "Could not verify this badge.");
        setStep("error");
      }
    }

    if (txHash) verifyBadge();
  }, [txHash]);

  const tierColor = {
    gold: "#f59e0b",
    silver: "#94a3b8",
    bronze: "#b45309",
  };

  return (
    <div style={styles.container}>
      {step === "loading" && (
        <div style={styles.card}>
          <div style={styles.emoji}>⏳</div>
          <h2 style={styles.title}>Verifying Badge...</h2>
          <p style={styles.sub}>Reading transaction from XRPL</p>
        </div>
      )}

      {step === "verified" && txData && (
        <div style={{ ...styles.card, borderColor: "#4ade80" }}>
          {/* Verified header */}
          <div style={styles.verifiedBadge}>
            <span style={styles.checkmark}>✓</span>
            <span style={styles.verifiedText}>Verified on XRPL</span>
          </div>

          {/* Badge image */}
          {badgeData?.imageCid && (
            <img
              src={getIPFSImageUrl(badgeData.imageCid)}
              alt="badge"
              style={styles.badgeImage}
            />
          )}

          {/* Tier */}
          {txData.tier && (
            <div
              style={{
                ...styles.tierBadge,
                background: `${tierColor[txData.tier]}22`,
                color: tierColor[txData.tier],
                borderColor: tierColor[txData.tier],
              }}
            >
              {txData.tier === "gold"
                ? "🥇 Gold Badge"
                : txData.tier === "silver"
                ? "🥈 Silver Badge"
                : "🥉 Bronze Badge"}
            </div>
          )}

          {/* Badge metadata */}
          {badgeData && (
            <div style={styles.metaBox}>
              <p style={styles.badgeName}>{badgeData.name}</p>
              <p style={styles.badgeEvent}>{badgeData.eventName}</p>
              {badgeData.description && (
                <p style={styles.badgeDesc}>{badgeData.description}</p>
              )}
            </div>
          )}

          {/* On-chain details */}
          <div style={styles.chainBox}>
            <div style={styles.chainRow}>
              <span style={styles.chainLabel}>Issued By</span>
              <span style={styles.chainValue}>
                {txData.issuer.slice(0, 6)}...{txData.issuer.slice(-6)}
              </span>
            </div>
            <div style={styles.chainRow}>
              <span style={styles.chainLabel}>Recipient</span>
              <span style={styles.chainValue}>
                {txData.recipient.slice(0, 6)}...{txData.recipient.slice(-6)}
              </span>
            </div>
            <div style={styles.chainRow}>
              <span style={styles.chainLabel}>Timestamp</span>
              <span style={styles.chainValue}>{txData.timestamp}</span>
            </div>
            <div style={styles.chainRow}>
              <span style={styles.chainLabel}>TX Hash</span>
              <span style={styles.chainValue}>
                {txData.txHash.slice(0, 8)}...{txData.txHash.slice(-8)}
              </span>
            </div>
          </div>

          <p style={styles.footer}>
            This badge is permanently recorded on the XRP Ledger and cannot
            be tampered with.
          </p>
        </div>
      )}

      {step === "error" && (
        <div style={{ ...styles.card, borderColor: "#f87171" }}>
          <div style={styles.emoji}>❌</div>
          <h2 style={{ ...styles.title, color: "#f87171" }}>
            Verification Failed
          </h2>
          <p style={styles.sub}>{error}</p>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#050810",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    fontFamily: "sans-serif",
  },
  card: {
    background: "#0d1117",
    border: "1px solid #1e2736",
    borderRadius: "20px",
    padding: "40px 32px",
    maxWidth: "400px",
    width: "100%",
    textAlign: "center",
  },
  emoji: { fontSize: "56px", marginBottom: "16px" },
  title: {
    color: "#e2e8f0",
    fontSize: "22px",
    fontWeight: "700",
    marginBottom: "8px",
  },
  sub: { color: "#64748b", fontSize: "14px", marginBottom: "20px" },
  verifiedBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(74,222,128,0.1)",
    border: "1px solid #4ade80",
    borderRadius: "20px",
    padding: "6px 16px",
    marginBottom: "24px",
  },
  checkmark: { color: "#4ade80", fontSize: "16px", fontWeight: "700" },
  verifiedText: { color: "#4ade80", fontSize: "13px", fontWeight: "600" },
  badgeImage: {
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    objectFit: "cover",
    marginBottom: "16px",
    border: "3px solid #1e2736",
  },
  tierBadge: {
    display: "inline-block",
    border: "1px solid",
    borderRadius: "20px",
    padding: "6px 16px",
    fontSize: "13px",
    fontWeight: "700",
    marginBottom: "20px",
  },
  metaBox: {
    background: "#161b27",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "16px",
  },
  badgeName: {
    color: "#e2e8f0",
    fontSize: "18px",
    fontWeight: "700",
    margin: "0 0 4px",
  },
  badgeEvent: { color: "#64748b", fontSize: "13px", margin: "0 0 8px" },
  badgeDesc: { color: "#94a3b8", fontSize: "12px", margin: 0 },
  chainBox: {
    background: "#161b27",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  chainRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chainLabel: {
    color: "#64748b",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  chainValue: {
    color: "#e2e8f0",
    fontSize: "12px",
    fontFamily: "monospace",
  },
  footer: {
    color: "#334155",
    fontSize: "11px",
    lineHeight: "1.5",
    margin: 0,
  },
};