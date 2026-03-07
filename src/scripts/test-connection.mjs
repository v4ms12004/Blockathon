import xrpl from "xrpl";
import dotenv from "dotenv";
dotenv.config();

async function testConnection() {
  const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233");
  await client.connect();
  console.log("✅ Connected to XRPL Testnet successfully");

  // Test organizer wallet
  const orgResponse = await client.request({
    command: "account_info",
    account: process.env.VITE_ORGANIZER_ADDRESS,
    ledger_index: "validated"
  });
  console.log("✅ Organizer Balance:",
    xrpl.dropsToXrp(orgResponse.result.account_data.Balance), "XRP");

  // Test participant A wallet
  const pAResponse = await client.request({
    command: "account_info",
    account: process.env.VITE_PARTICIPANT_A_ADDRESS,
    ledger_index: "validated"
  });
  console.log("✅ Participant A Balance:",
    xrpl.dropsToXrp(pAResponse.result.account_data.Balance), "XRP");

  // Test participant B wallet
  const pBResponse = await client.request({
    command: "account_info",
    account: process.env.VITE_PARTICIPANT_B_ADDRESS,
    ledger_index: "validated"
  });
  console.log("✅ Participant B Balance:",
    xrpl.dropsToXrp(pBResponse.result.account_data.Balance), "XRP");

  await client.disconnect();
  console.log("\n🎉 All wallets verified — you're ready for the hackathon!");
}

testConnection().catch(console.error);