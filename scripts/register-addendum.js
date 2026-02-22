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

const PAPERS = [
    {
        file: "UHF_Defense_Addendum.md",
        version: "8.5.1-Addendum",
        label: "UHF Defense Addendum (Markdown) — with author/date header",
        expectedHash: "f1d8eb722508326ba08255438d762efab453c73e782a5e05f9bd6aa70688e355"
    },
    {
        file: "UHF_Defense_Addendum.pdf",
        version: "8.5.1-Addendum-PDF",
        label: "UHF Defense Addendum (PDF) — with author/date header",
        expectedHash: "e5740f8ad393449e9a1548d4e1b059cd7663ca7fd23e759a60850786058187b2"
    }
];

async function main() {
    // 1. Verify SHA-256 hashes
    console.log("Verifying SHA-256 hashes...\n");
    for (const p of PAPERS) {
        const actual = execSync(`shasum -a 256 ${p.file}`).toString().split(" ")[0];
        if (actual !== p.expectedHash) {
            console.error(`HASH MISMATCH for ${p.file}!`);
            console.error(`  Expected: ${p.expectedHash}`);
            console.error(`  Actual:   ${actual}`);
            process.exit(1);
        }
        console.log(`  ✓ ${p.file}  ${actual}`);
    }

    // 2. Connect to Polygon
    const provider = new ethers.JsonRpcProvider("https://polygon-bor-rpc.publicnode.com", 137);
    const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    console.log(`\nWallet: ${wallet.address}`);
    const balance = await provider.getBalance(wallet.address);
    console.log(`Balance: ${ethers.formatEther(balance)} MATIC\n`);

    // 3. Register each on Polygon
    const results = [];
    for (const p of PAPERS) {
        console.log(`Registering ${p.label} (${p.version})...`);
        const tx = await contract.registerPaper(p.expectedHash, "Amir Benjamin Amitay", p.version);
        console.log(`  TX sent: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`  Confirmed in block ${receipt.blockNumber}`);
        results.push({ ...p, txHash: tx.hash, block: receipt.blockNumber });
    }

    console.log("\n" + "=".repeat(70));
    console.log("SUCCESS — UHF DEFENSE ADDENDUM REGISTERED ON POLYGON MAINNET");
    console.log("=".repeat(70));
    for (const r of results) {
        console.log(`\n  ${r.label} (${r.version})`);
        console.log(`    SHA-256:     ${r.expectedHash}`);
        console.log(`    TX Hash:     ${r.txHash}`);
        console.log(`    Block:       ${r.block}`);
        console.log(`    PolygonScan: https://polygonscan.com/tx/${r.txHash}`);
    }
    console.log("=".repeat(70));

    for (const r of results) {
        const logEntry = `\n${r.version} | ${new Date().toISOString()} | Block: ${r.block} | TX: ${r.txHash} | Hash: ${r.expectedHash}`;
        fs.appendFileSync("./scripts/on-chain-log.txt", logEntry);
    }
    console.log("\nAppended to on-chain-log.txt");
}

main().catch(e => { console.error(e); process.exit(1); });
