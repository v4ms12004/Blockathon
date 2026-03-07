import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getClient } from "../utils/xrpl";
import { fetchFromIPFS, getIPFSImageUrl } from "../utils/pinata";
import "./Verify.css";

export default function Verify() {
  const { txHash } = useParams();
  const [step, setStep] = useState("loading");
  const [badgeData, setBadgeData] = useState(null);
  const [txData, setTxData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function verifyBadge() {
      try {
        const provider = getProvider();

        const receipt = await provider.getTransactionReceipt(txHash);
        if (!receipt) throw new Error("Transaction not found on Sepolia.");

        const block = await provider.getBlock(receipt.blockNumber);
        const timestamp = new Date(block.timestamp * 1000).toLocaleString();

        const iface = new ethers.Interface(ABI);
        let parsedEvent = null;

        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed?.name === "BadgeClaimed") parsedEvent = parsed;
          } catch {}
        }

        if (!parsedEvent) {
          throw new Error("No badge claim found in this transaction.");
        }

        const eventId = parsedEvent.args[0].toString();
        const participant = parsedEvent.args[1];
        const tier = parsedEvent.args[2];
        const cid = parsedEvent.args[3];

        setTxData({
          eventId,
          participant,
          tier,
          cid,
          timestamp,
          txHash,
          blockNumber: receipt.blockNumber,
          contractAddress: CONTRACT_ADDRESS,
        });

        if (cid) {
          const ipfsResult = await fetchFromIPFS(cid);
          if (ipfsResult.success) setBadgeData(ipfsResult.data);
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
            <div className="verify-chain-row">
              <span className="verify-chain-label">Contract</span>
              <span className="verify-chain-value">
                {txData.contractAddress.slice(0, 6)}...{txData.contractAddress.slice(-4)}
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

