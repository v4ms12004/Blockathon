import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { processCheckIn } from "../utils/checkin";
import { getTokenBalance } from "../utils/xrpl";
import { getWallet } from "../utils/wallet";
import "./CheckIn.css";

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
    <div className="checkin-container">
      {status === "loading" && (
        <div className="checkin-card">
          <div className="checkin-spinner">⏳</div>
          <h2 className="checkin-title">Processing Check-in...</h2>
          <p className="checkin-sub">Connecting to XRPL Testnet</p>
        </div>
      )}

      {status === "success" && (
        <div className="checkin-card checkin-card--success">
          <div className="checkin-emoji">🎉</div>
          <h2 className="checkin-title checkin-title--success">Checked In!</h2>
          <p className="checkin-sub">{message}</p>
          {balance !== null && (
            <div className="checkin-balance">
              <span className="checkin-balance-label">Total Balance</span>
              <span className="checkin-balance-value">{balance} BLKPT</span>
            </div>
          )}
          {txHash && (
            <p className="checkin-hash">
              TX: {txHash.slice(0, 8)}...{txHash.slice(-8)}
            </p>
          )}
        </div>
      )}

      {status === "already" && (
        <div className="checkin-card checkin-card--already">
          <div className="checkin-emoji">⚠️</div>
          <h2 className="checkin-title checkin-title--already">
            Already Checked In
          </h2>
          <p className="checkin-sub">{message}</p>
          {balance !== null && (
            <div className="checkin-balance">
              <span className="checkin-balance-label">Current Balance</span>
              <span className="checkin-balance-value">{balance} BLKPT</span>
            </div>
          )}
        </div>
      )}

      {status === "error" && (
        <div className="checkin-card checkin-card--error">
          <div className="checkin-emoji">❌</div>
          <h2 className="checkin-title checkin-title--error">Check-in Failed</h2>
          <p className="checkin-sub">{message}</p>
          <button
            className="checkin-retry-btn"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

