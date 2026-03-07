require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: process.env.VITE_SEPOLIA_RPC_URL || "",
      accounts: process.env.VITE_DEPLOYER_PRIVATE_KEY
        ? [process.env.VITE_DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
};