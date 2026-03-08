const { ethers } = require("ethers");

async function fund() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545");

    // The Ganache account that has 100 ETH
    const accounts = await provider.listAccounts();
    const sender = accounts[0];
    console.log("Sender:", sender.address);

    const keys = [
        "0xc217ff92c4b6de7f3be12c8cfc0b395fc133679ab019571e2895d41252e0fe13",
        "0x5e5549c6ddb261bd61fc3680937a0884b2ca2f7a0df53676c0f1206b56fec6c5",
        "0xceacaa7c4a1f070c03f770c7d27b115bb1e4afa4abc08fc63265e5d6668063d2"
    ];

    for (const key of keys) {
        const wallet = new ethers.Wallet(key, provider);
        const address = wallet.address;
        console.log("Funding", address);

        const tx = await sender.sendTransaction({
            to: address,
            value: ethers.parseEther("10.0")
        });
        await tx.wait();
        console.log("Funded", address);
    }
}
fund().catch(console.error);
