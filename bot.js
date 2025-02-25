const axios = require("axios");
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { registerUser, completeRegistration, } = require("./callback/register");
const { handleDepositSelection, processBankDeposit, handleDepositAmount } = require("./callback/deposit");
const handleGames = require("./handlers/gamesHandler");
const handleProfile = require("./handlers/profileHandler");
const handleBalance = require("./handlers/balanceHandler");
const handleRegistration = require("./handlers/registrationHandler");
const handleCallbackQuery = require("./handlers/callbackHandlers");

const showMenu = require("./handlers/menuHandler");

const { getSupportMarkup } = require("./utils/supportUtils");

const { getSiteSetting, checkUserExist } = require("./api");
const { telegramToken, apiBaseUrl, telegramApiUrl, master_code, company_code, API_SECRET } = require("./config");
const bot = require("./botInstance"); // Import shared bot instance

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  
  await getSiteSetting(chatId);

  bot.sendMessage(
    chatId,
    `
    <b>🎰 Welcome Message!</b>

    Welcome to our <b>🎰 Telegram Casino</b>!  
    🎰 <i>PWCPLAY DEV</i> 🎰  
    <i>Best games from top providers directly in Telegram!</i>
  `,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "➡️ Continue", callback_data: "continue" }],
          [{ text: "⏳ I'll come back later", callback_data: "later" }],
        ],
      },
    }
  );
});

bot.onText(/\/menu/, async (msg) => {
  const chatId = msg.chat.id;
  await getSiteSetting(chatId);

  showMenu(chatId);
});

bot.onText(/\/chat/, async (msg) => {
  const chatId = msg.chat.id;
  ss = await getSiteSetting(chatId);
  bot.sendMessage(chatId, "Hubungi Admin Super Ramah kami dibawah ini:", await getSupportMarkup(ss.livechat, ss.whatsapp, ss.telegram));
});
const commandHandlers = {
  "🎮 Games": handleGames,
  "👤 Profile": handleProfile,
  "🏦 Balance": handleBalance,
  "📝 Registration": handleRegistration,
  // "ℹ️ Information": handleInformation,
  // "⬅️ Back": (chatId) => showMenu(chatId),
};
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  console.log(`User sent message: ${text}`);

  await getSiteSetting(chatId);
  if (commandHandlers[text]) {
    await commandHandlers[text](chatId);
  } else {
    console.log(`Unknown command: ${text}`);
  }
  await handleDepositAmount(bot, chatId, text, checkUserExist);
});

bot.on("callback_query", async (callbackQuery) => {
  await handleCallbackQuery(callbackQuery);
});

bot.on("contact", (msg) => {
  const chatId = msg.chat.id;
  const phoneNumber = msg.contact.phone_number;

  registerUser(bot, phoneNumber, chatId);
});

console.log("Bot is running...");
