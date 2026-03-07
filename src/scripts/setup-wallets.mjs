import xrpl from "xrpl";

async function setupWallets() {
  const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233");
  await client.connect();
  console.log("✅ Connected to XRPL Testnet");

  console.log("\n--- Creating Organizer Wallet ---");
  const organizerFund = await client.fundWallet();
  const organizer = organizerFund.wallet;
  console.log("Organizer Address:", organizer.address);
  console.log("Organizer Seed:", organizer.seed);

  console.log("\n--- Creating Participant A Wallet ---");
  const participantAFund = await client.fundWallet();
  const participantA = participantAFund.wallet;
  console.log("Participant A Address:", participantA.address);
  console.log("Participant A Seed:", participantA.seed);

  console.log("\n--- Creating Participant B Wallet ---");
  const participantBFund = await client.fundWallet();
  const participantB = participantBFund.wallet;
  console.log("Participant B Address:", participantB.address);
  console.log("Participant B Seed:", participantB.seed);

  await client.disconnect();
  console.log("\n✅ All wallets created! Save the seeds above somewhere safe.");
}

setupWallets().catch(console.error);