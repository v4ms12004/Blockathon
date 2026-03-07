import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getClient } from "../utils/xrpl";
import { fetchFromIPFS, getIPFSImageUrl } from "../utils/pinata";
import "./Verify.css";

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

  return (
    <div className="verify-container">
      {step === "loading" && (
        <div className="verify-card">
          <div className="verify-emoji">⏳</div>
          <h2 className="verify-title">Verifying Badge...</h2>
          <p className="verify-sub">Reading transaction from XRPL</p>
        </div>
      )}

      {step === "verified" && txData && (
        <div className="verify-card verify-card--verified">
          {/* Verified header */}
          <div className="verify-verified-badge">
            <span className="verify-checkmark">✓</span>
            <span className="verify-verified-text">Verified on XRPL</span>
          </div>

          {/* Badge image */}
          {badgeData?.imageCid && (
            <img
              src={getIPFSImageUrl(badgeData.imageCid)}
              alt="badge"
              className="verify-badge-image"
            />
          )}

          {/* Tier */}
          {txData.tier && (
            <div
              className={`verify-tier-badge verify-tier-badge--${txData.tier}`}
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
            <div className="verify-meta-box">
              <p className="verify-badge-name">{badgeData.name}</p>
              <p className="verify-badge-event">{badgeData.eventName}</p>
              {badgeData.description && (
                <p className="verify-badge-desc">{badgeData.description}</p>
              )}
            </div>
          )}

          {/* On-chain details */}
          <div className="verify-chain-box">
            <div className="verify-chain-row">
              <span className="verify-chain-label">Issued By</span>
              <span className="verify-chain-value">
                {txData.issuer.slice(0, 6)}...{txData.issuer.slice(-6)}
              </span>
            </div>
            <div className="verify-chain-row">
              <span className="verify-chain-label">Recipient</span>
              <span className="verify-chain-value">
                {txData.recipient.slice(0, 6)}...{txData.recipient.slice(-6)}
              </span>
            </div>
            <div className="verify-chain-row">
              <span className="verify-chain-label">Timestamp</span>
              <span className="verify-chain-value">{txData.timestamp}</span>
            </div>
            <div className="verify-chain-row">
              <span className="verify-chain-label">TX Hash</span>
              <span className="verify-chain-value">
                {txData.txHash.slice(0, 8)}...{txData.txHash.slice(-8)}
              </span>
            </div>
          </div>

          <p className="verify-footer">
            This badge is permanently recorded on the XRP Ledger and cannot
            be tampered with.
          </p>
        </div>
      )}

      {step === "error" && (
        <div className="verify-card verify-card--error">
          <div className="verify-emoji">❌</div>
          <h2 className="verify-title verify-title--error">
            Verification Failed
          </h2>
          <p className="verify-sub">{error}</p>
        </div>
      )}
    </div>
  );
}

