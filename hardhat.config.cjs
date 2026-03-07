require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const RPC_URL = process.env.VITE_SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.VITE_DEPLOYER_PRIVATE_KEY;

console.log("RPC URL loaded:", RPC_URL ? "✅ Yes" : "❌ Missing");
console.log("Private key loaded:", PRIVATE_KEY ? "✅ Yes" : "❌ Missing");

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun"
    }
  },
  networks: {
    sepolia: {
      url: RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};
