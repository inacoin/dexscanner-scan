import dotenv from "dotenv";
import { ethers } from "ethers";
import fetch from "node-fetch";
import cfonts from "cfonts";
import chalk from "chalk";
import TelegramBot from "node-telegram-bot-api";

// Load environment variables
dotenv.config();

// Helper function to add delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Initialize Telegram Bot
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.TELEGRAM_CHAT_ID;
const bot = new TelegramBot(telegramBotToken, { polling: true });

// Global variable to control bot state
let isBotRunning = false;

// List of RPC URLs
const rpcUrls = [
  process.env.RPC_URL_1,
  process.env.RPC_URL_2,
  process.env.RPC_URL_3,
];

// Variable to track the current RPC index
let currentRpcIndex = 0;

// Function to get the next RPC URL
function getNextRpcUrl() {
  const rpcUrl = rpcUrls[currentRpcIndex];
  currentRpcIndex = (currentRpcIndex + 1) % rpcUrls.length; // Move to the next RPC
  return rpcUrl;
}

// Helper function to send messages to Telegram
async function sendToTelegram(message) {
  try {
    await bot.sendMessage(telegramChatId, message);
    console.log(chalk.green(`?? Message sent to Telegram: ${message}`));
  } catch (error) {
    console.error(chalk.red(`❌ Failed to send message to Telegram: ${error.message}`));
  }
}

// Handle /start_bot command
bot.onText(/\/start_bot/, async (msg) => {
  if (isBotRunning) {
    await sendToTelegram("?? Bot is already running.");
    return;
  }

  isBotRunning = true;
  await sendToTelegram("?? Bot started successfully!");
  main(); // Start the main loop
});

// Handle /stop_bot command
bot.onText(/\/stop_bot/, async (msg) => {
  if (!isBotRunning) {
    await sendToTelegram("?? Bot is not running.");
    return;
  }

  isBotRunning = false;
  await sendToTelegram("?? Bot stopped successfully!");
});

// Handle /wallet command
bot.onText(/\/wallet/, async (msg) => {
  try {
    // Load 10 private keys from .env
    const privateKeys = [
      process.env.PRIVATE_KEY_1,
      process.env.PRIVATE_KEY_2,
      process.env.PRIVATE_KEY_3,
      process.env.PRIVATE_KEY_4,
      //process.env.PRIVATE_KEY_5,
      //process.env.PRIVATE_KEY_6,
      //process.env.PRIVATE_KEY_7,
      //process.env.PRIVATE_KEY_8,
      //process.env.PRIVATE_KEY_9,
      //process.env.PRIVATE_KEY_10,
    ];

    const rpcUrl = getNextRpcUrl(); // Get the next RPC URL
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Initialize wallets
    const wallets = privateKeys.map(privateKey => new ethers.Wallet(privateKey, provider));

    // Prepare message with wallet addresses
    let message = "?? Wallet Addresses:\n";
    wallets.forEach((wallet, index) => {
      message += `Wallet ${index + 1}: ${wallet.address}\n`;
    });

    // Send message to Telegram
    await sendToTelegram(message);
  } catch (error) {
    console.error("❌ Error fetching wallet addresses:", error.message);
    await sendToTelegram(`❌ Error fetching wallet addresses: ${error.message}`);
  }
});

async function main() {
  try {
    cfonts.say('NT Exhaust', {
      font: 'block',        // Options: 'block', 'simple', '3d', etc.
      align: 'center',
      colors: ['cyan', 'magenta'],
      background: 'black',
      letterSpacing: 1,
      lineHeight: 1,
      space: true,
      maxLength: '0',
    });
    console.log(chalk.green("=== Telegram Channel : NT Exhaust ( @NTExhaust ) ==="));

    // Load 10 private keys from .env
    const privateKeys = [
      process.env.PRIVATE_KEY_1,
      process.env.PRIVATE_KEY_2,
      process.env.PRIVATE_KEY_3,
      process.env.PRIVATE_KEY_4,
      //process.env.PRIVATE_KEY_5,
      //process.env.PRIVATE_KEY_6,
      //process.env.PRIVATE_KEY_7,
      //process.env.PRIVATE_KEY_8,
      //process.env.PRIVATE_KEY_9,
      //process.env.PRIVATE_KEY_10,
    ];

    const API_URL = process.env.API_URL;
    const HEADERS = {
      "Accept": "application/json, text/plain, */*",
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0",
      "Origin": "https://app.tea-fi.com", // Spoofing Origin to match allowed
      "Referer": "https://app.tea-fi.com/",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
    };

    if (!privateKeys.every(key => key) || !API_URL || !telegramBotToken || !telegramChatId) {
      throw new Error("One or more private keys, API_URL, TELEGRAM_BOT_TOKEN, or TELEGRAM_CHAT_ID is missing in the .env file.");
    }

    // Initialize wallets with the first RPC
    const rpcUrl = getNextRpcUrl();
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallets = privateKeys.map(privateKey => new ethers.Wallet(privateKey, provider));

    // Log wallet addresses
    wallets.forEach((wallet, index) => {
      console.log(`Wallet ${index + 1} address:`, wallet.address);
    });

    // WMATIC contract details
    const wmaticAbi = ["function deposit() public payable"];
    const wmaticAddress = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
    const wmaticContracts = wallets.map(wallet => new ethers.Contract(wmaticAddress, wmaticAbi, wallet));

    const amountToWrap = ethers.parseEther("0.00015");

    // Main loop
    let loopCount = 0;
    while (isBotRunning) { // Loop only runs if isBotRunning is true
      loopCount++;
      console.log(`\n?? Loop ${loopCount}`);
      await sendToTelegram(`?? Loop ${loopCount}`); // Send loop count to Telegram

      // Process each wallet sequentially with a 10-second delay
      for (let i = 0; i < wallets.length; i++) {
        console.log(chalk.blue(`\nProcessing Wallet ${i + 1}...`));
        await sendToTelegram(`Processing Wallet ${i + 1}...`); // Send wallet processing status to Telegram

        try {
          await processWallet(wallets[i], wmaticContracts[i], amountToWrap, API_URL, HEADERS);
        } catch (error) {
          console.error(`❌ Error in Wallet ${i + 1}:`, error.message);
          console.log("⏩ Continuing to the next wallet...");
        }

        // Wait for 10 seconds before processing the next wallet
        if (i < wallets.length - 1) {
          console.log("?? Waiting 1 seconds before processing the next wallet...");
          await delay(100); // 10 seconds
        }
      }

      // Wait for 10 seconds before the next loop
      console.log("?? Waiting 1 seconds before the next loop...");
      await delay(100); // 10 seconds
    }
  } catch (error) {
    console.error("Fatal error occurred:", error.reason || error.message);
    await sendToTelegram(`?? Fatal error occurred: ${error.reason || error.message}`); // Send fatal error to Telegram
    console.log("?? Restarting the script...");
    main(); // Restart the script if a fatal error occurs
  }
}

// Helper function to process a wallet
async function processWallet(wallet, wmaticContract, amountToWrap, API_URL, HEADERS) {
  const provider = wallet.provider;

  // Check wallet balance
  const balance = await provider.getBalance(wallet.address);
  console.log("Wallet Balance (in MATIC):", ethers.formatUnits(balance, "ether"));
  await sendToTelegram(`?? Wallet Balance (in MATIC): ${ethers.formatUnits(balance, "ether")}`); // Send balance to Telegram

  // Ensure balance is sufficient
  if (balance < amountToWrap) {
    throw new Error("Insufficient MATIC balance for the transaction.");
  }

  // Get current gas fee data
  const feeData = await provider.getFeeData();
  console.log("Current Gas Fee Data:", feeData);

  // Set priority gas fee (you can adjust the multiplier to increase priority)
  const priorityMultiplier = 2; // Adjust this multiplier to increase priority
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas * BigInt(priorityMultiplier);
  const maxFeePerGas = feeData.maxFeePerGas * BigInt(priorityMultiplier);

  console.log("Using Priority Gas Fee - maxPriorityFeePerGas:", maxPriorityFeePerGas.toString());
  console.log("Using Priority Gas Fee - maxFeePerGas:", maxFeePerGas.toString());

  // Wrap MATIC to WMATIC with priority gas fee
  console.log("Wrapping MATIC to WMATIC with priority gas fee...");
  let txResponse;
  try {
    txResponse = await wmaticContract.deposit({
      value: amountToWrap,
      maxPriorityFeePerGas: maxPriorityFeePerGas,
      maxFeePerGas: maxFeePerGas,
    });
    console.log("✅ Transaction sent! Hash:", txResponse.hash);
  } catch (error) {
    console.error("❌ Failed to send transaction:", error.message);
    await sendToTelegram(`❌ Failed to send transaction: ${error.message}`);
    throw error; // Re-throw the error to be handled by the main loop
  }

  // Wait for transaction confirmation with a timeout
  try {
    const receipt = await Promise.race([
      txResponse.wait(),
      delay(10000).then(() => {
        throw new Error("Transaction confirmation timeout after 30 seconds.");
      }),
    ]);
    console.log("✅ WMATIC wrapped successfully! Transaction Hash:", txResponse.hash);
    await sendToTelegram(`✅ WMATIC wrapped successfully! Transaction Hash: ${txResponse.hash}`); // Send success message to Telegram
  } catch (error) {
    console.error("❌ Failed to confirm transaction:", error.message);
    await sendToTelegram(`❌ Failed to confirm transaction: ${error.message}`);
    throw error; // Re-throw the error to be handled by the main loop
  }

  // Prepare API payload
  const payload = {
    blockchainId: 137,
    type: 2,
    walletAddress: wallet.address,
    hash: txResponse.hash,
    toTokenAddress: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    fromTokenAddress: "0x1Cd0cd01c8C902AdAb3430ae04b9ea32CB309CF1",
    toTokenSymbol: "WPOL",
    fromTokenSymbol: "tPOL",
    fromAmount: "150000000000000",
    toAmount: "150000000000000",
    gasFeeTokenAddress: "0x0000000000000000000000000000000000000000",
    gasFeeTokenSymbol: "POL",
    gasFeeAmount: "8055000012888000",
  };

  // Send API request
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(payload),
    });

    // Check if the response is OK (status code 200)
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} - ${errorText}`);
    } else {
      const result = await response.json();
      console.log("✅ API Response:", result);
    }
  } catch (error) {
    console.error("❌ Failed to send API request:", error.message);
  }
}

// Start the bot
console.log("?? Bot is ready. Use /start_bot to start and /stop_bot to stop.");
                            
