require('@nomicfoundation/hardhat-toolbox');

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.24",
    networks: {
        localhost: {
            url: "http://127.0.0.1:7545"
        },
        sepolia: {
            url: process.env.BLOCKCHAIN_RPC_URL || '',
            accounts: process.env.BLOCKCHAIN_PRIVATE_KEY ? [`0x${process.env.BLOCKCHAIN_PRIVATE_KEY.replace(/^0x/, '')}`] : []
        }
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    }
};

