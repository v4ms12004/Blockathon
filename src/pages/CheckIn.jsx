import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { processCheckIn } from "../utils/checkin";
import { getTokenBalance } from "../utils/xrpl";
import { getWallet } from "../utils/wallet";

export default function CheckIn() {
  const { eventId, checkpointId } = useParams();
  const [status, setStatus] = useState("loading"); 
  // loading | success | already | error
  const [message, setMessage] = useState("");
  const [txHash, setTxHash] = useState("");
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    async function handleCheckIn() {
      setStatus("loading");
      const result = await processCheckIn(checkpointId, eventId);

      if (result.success) {
        setStatus("success");
        setMessage(result.message);
        setTxHash(result.txHash);

        // Fetch updated balance
        const wallet = getWallet();
        if (wallet) {
          const bal = await getTokenBalance(wallet.address);
          setBalance(bal);
        }
      } else if (result.reason === "ALREADY_CHECKED_IN") {
        setStatus("already");
        setMessage(result.message);

        // Still show balance
        const wallet = getWallet();
        if (wallet) {
          const bal = await getTokenBalance(wallet.address);
          setBalance(bal);
        }
      } else {
        setStatus("error");
        setMessage(result.message);
      }
    }

    handleCheckIn();
  }, [eventId, checkpointId]);

  return (
    <div style={styles.container}>
      {status === "loading" && (
        <div style={styles.card}>
          <div style={styles.spinner}>⏳</div>
          <h2 style={styles.title}>Processing Check-in...</h2>
          <p style={styles.sub}>Connecting to XRPL Testnet</p>
        </div>
      )}

      {status === "success" && (
        <div style={{ ...styles.card, borderColor: "#4ade80" }}>
          <div style={styles.emoji}>🎉</div>
          <h2 style={{ ...styles.title, color: "#4ade80" }}>Checked In!</h2>
          <p style={styles.sub}>{message}</p>
          {balance !== null && (
            <div style={styles.balance}>
              <span style={styles.balanceLabel}>Total Balance</span>
              <span style={styles.balanceValue}>{balance} BLKPT</span>
            </div>
          )}
          {txHash && (
            <p style={styles.hash}>
              TX: {txHash.slice(0, 8)}...{txHash.slice(-8)}
            </p>
          )}
        </div>
      )}

      {status === "already" && (
        <div style={{ ...styles.card, borderColor: "#f59e0b" }}>
          <div style={styles.emoji}>⚠️</div>
          <h2 style={{ ...styles.title, color: "#f59e0b" }}>
            Already Checked In
          </h2>
          <p style={styles.sub}>{message}</p>
          {balance !== null && (
            <div style={styles.balance}>
              <span style={styles.balanceLabel}>Current Balance</span>
              <span style={styles.balanceValue}>{balance} BLKPT</span>
            </div>
          )}
        </div>
      )}

      {status === "error" && (
        <div style={{ ...styles.card, borderColor: "#f87171" }}>
          <div style={styles.emoji}>❌</div>
          <h2 style={{ ...styles.title, color: "#f87171" }}>Check-in Failed</h2>
          <p style={styles.sub}>{message}</p>
          <button
            style={styles.retryBtn}
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
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
    maxWidth: "360px",
    width: "100%",
    textAlign: "center",
  },
  spinner: { fontSize: "48px", marginBottom: "16px" },
  emoji: { fontSize: "56px", marginBottom: "16px" },
  title: {
    color: "#e2e8f0",
    fontSize: "22px",
    fontWeight: "700",
    marginBottom: "8px",
  },
  sub: { color: "#64748b", fontSize: "14px", marginBottom: "20px" },
  balance: {
    background: "#161b27",
    borderRadius: "12px",
    padding: "16px",
    marginTop: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  balanceLabel: { color: "#64748b", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" },
  balanceValue: { color: "#00e5ff", fontSize: "28px", fontWeight: "700" },
  hash: { color: "#334155", fontSize: "11px", fontFamily: "monospace", marginTop: "12px" },
  retryBtn: {
    background: "#f87171",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px 24px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "8px",
  },
};