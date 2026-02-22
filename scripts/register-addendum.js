/**
 * register-addendum.js — UHF Defense Addendum v8.5-Addendum
 *
 * Registers the SHA-256 of UHF_Defense_Addendum.md on Polygon Mainnet.
 * The addendum provides empirical rebuttals to 9 categories of criticism,
 * including NANOGrav ΔAIC≈37.69, LIGO SNR mismatch 4.46×10⁻⁸, JWST
 * halo enhancement 6.01×, Core-Cusp α=-0.00, and muon g-2 Δaμ=1.58×10⁻⁹.
 *
 * Contract: 0xe0bB4bC3116e19F2c0c183eFf8802C4F707B0054  (Polygon Mainnet)
 */

import { ethers } from "ethers";
import { execSync } from "child_process";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

const CONTRACT_ADDRESS = "0xe0bB4bC3116e19F2c0c183eFf8802C4F707B0054";
const ABI = [
    "function registerPaper(string _hash, string _author, string _version) public"
];

const FILE = "UHF_Defense_Addendum.md";
const VERSION = "8.5-Addendum";
const LABEL = "UHF Defense Addendum — Empirical Rebuttals to 9 Objection Categories";
const EXPECTED_HASH = "9cc42b74340abfd987f5153d8ebfcff9cdea2bec2896ab18cfe95937d7d5094d";

async function main() {
    // 1. Verify SHA-256 hash
    console.log("Verifying SHA-256 hash...\n");
    const actual = execSync(`shasum -a 256 ${FILE}`).toString().split(" ")[0];
    if (actual !== EXPECTED_HASH) {
        console.error(`HASH MISMATCH for ${FILE}!`);
        console.error(`  Expected: ${EXPECTED_HASH}`);
        console.error(`  Actual:   ${actual}`);
        process.exit(1);
    }
    console.log(`  ✓ ${FILE}  ${actual}`);

    // 2. Connect to Polygon
    const provider = new ethers.JsonRpcProvider("https://polygon-bor-rpc.publicnode.com", 137);
    const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    console.log(`\nWallet: ${wallet.address}`);
    const balance = await provider.getBalance(wallet.address);
    console.log(`Balance: ${ethers.formatEther(balance)} MATIC\n`);

    // 3. Register on Polygon
    console.log(`Registering ${LABEL} (${VERSION})...`);
    const tx = await contract.registerPaper(EXPECTED_HASH, "Amir Benjamin Amitay", VERSION);
    console.log(`  TX sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`  Confirmed in block ${receipt.blockNumber}`);

    console.log("\n" + "=".repeat(70));
    console.log("SUCCESS — UHF DEFENSE ADDENDUM REGISTERED ON POLYGON MAINNET");
    console.log("=".repeat(70));
    console.log(`\n  ${LABEL} (${VERSION})`);
    console.log(`    SHA-256:     ${EXPECTED_HASH}`);
    console.log(`    TX Hash:     ${tx.hash}`);
    console.log(`    Block:       ${receipt.blockNumber}`);
    console.log(`    PolygonScan: https://polygonscan.com/tx/${tx.hash}`);
    console.log("=".repeat(70));

    const logEntry = `\n${VERSION} | ${new Date().toISOString()} | Block: ${receipt.blockNumber} | TX: ${tx.hash} | Hash: ${EXPECTED_HASH}`;
    fs.appendFileSync("./scripts/on-chain-log.txt", logEntry);
    console.log("\nAppended to on-chain-log.txt");
}

main().catch(e => { console.error(e); process.exit(1); });
