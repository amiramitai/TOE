/**
 * register-v801.js — UHF Paper Registry v8.0.1
 *
 * Ultimate QFT-level integration (Proofs J, K, L):
 *   • Part II  — §9.3.5 III-E: Haag-Ruelle Asymptotic Decoupling (Proof K)
 *                 Møller wave operators Ω± via Cook's criterion + Markovian gap Γ_M > 0
 *                 Asymptotic states factorize: |in⟩_phys ⊗ |ρ_ss⟩_bath
 *   • Part II  — §9.3.5 III-F: Schwinger-Keldysh CTP Functional (Proof L)
 *                 Z[J+,J-] CTP path integral, BV master equation (W,W)=0,
 *                 ST identities ⇒ m² = Π_L(0) = 0 to all loop orders
 *   • Part III — §9.3.25: Cartan Uniqueness Theorem (Proof J)
 *                 rank 2, dim 8, κ_ab = -3δ_ab < 0 ⇒ uniquely su(3)
 *                 sl(3,R) and su(2,1) eliminated by signature analysis
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
        file: "UHF_Part_I_Core.md",
        version: "8.0.1-Part-I",
        label: "UHF Part I — Physical Core",
        expectedHash: "18454ef4e5cd27eee16ae68c09d0eaad48ffd94136d6b3540c61019840a54c82"
    },
    {
        file: "UHF_Part_II_Mathematical_Foundations.md",
        version: "8.0.1-Part-II",
        label: "UHF Part II — Mathematical Foundations",
        expectedHash: "5e8269348fa54e54c4a45b58498305f5ec10fec572e719ac8246096c44d82b22"
    },
    {
        file: "UHF_Part_III_Standard_Model.md",
        version: "8.0.1-Part-III",
        label: "UHF Part III — Standard Model Extension",
        expectedHash: "75647d4df9bd833c004a796ab88b9a8b4338796e9b9a6b38fc6be0108ed9e836"
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

    // 3. Register each paper
    const results = [];
    for (const p of PAPERS) {
        console.log(`Registering ${p.label} (${p.version})...`);
        const tx = await contract.registerPaper(p.expectedHash, "Amir Benjamin Amitay", p.version);
        console.log(`  TX sent: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`  Confirmed in block ${receipt.blockNumber}`);
        results.push({
            label: p.label,
            version: p.version,
            hash: p.expectedHash,
            txHash: tx.hash,
            block: receipt.blockNumber
        });
    }

    console.log("\n" + "=".repeat(70));
    console.log("SUCCESS — UHF v8.0.1 (ALL 3 PARTS) REGISTERED ON POLYGON MAINNET");
    console.log("=".repeat(70));
    for (const r of results) {
        console.log(`\n  ${r.label} (${r.version})`);
        console.log(`    SHA-256:     ${r.hash}`);
        console.log(`    TX Hash:     ${r.txHash}`);
        console.log(`    Block:       ${r.block}`);
        console.log(`    PolygonScan: https://polygonscan.com/tx/${r.txHash}`);
    }
    console.log("=".repeat(70));

    for (const r of results) {
        const logEntry = `\n${r.version} | ${new Date().toISOString()} | Block: ${r.block} | TX: ${r.txHash} | Hash: ${r.hash}`;
        fs.appendFileSync("./scripts/on-chain-log.txt", logEntry);
    }
    console.log("\nAppended to on-chain-log.txt");
}

main().catch(e => { console.error(e); process.exit(1); });
