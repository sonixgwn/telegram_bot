require("dotenv").config();
const {
    userDepositData,
    handleDepositAmount,
    processDepositWithProof,
} = require("./callback/deposit");
const handleGames = require("./handlers/gamesHandler");
const handleProfile = require("./handlers/profileHandler");
const handleBalance = require("./handlers/balanceHandler");
const { handleRegistration, handleSyncAccount } = require("./handlers/registrationHandler");
const handleCallbackQuery = require("./handlers/callbackHandlers");
const handleBonuses = require("./handlers/bonusesHandler");

const showMenu = require("./handlers/menuHandler");

const { getSupportMarkup } = require("./utils/supportUtils");

const { getSiteSetting, checkUserExist, getDepositOptions } = require("./api");
const bot = require("./botInstance"); // Import shared bot instance

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    await getSiteSetting(chatId);
    showMenu(chatId, null, true);
});

bot.onText(/\/menu/, async (msg) => {
    const chatId = msg.chat.id;
    await getSiteSetting(chatId);

    showMenu(chatId);
});

bot.onText(/\/chat/, async (msg) => {
    const chatId = msg.chat.id;
    await getSupportMarkup(chatId);
});
const commandHandlers = {
    "🎮 Permainan": handleGames,
    "👤 Profil": handleProfile,
    "🏦 Informasi Saldo": handleBalance,
    "🔄 Hubungkan Akun": handleSyncAccount,
    "📝 Halaman Registrasi": handleRegistration,
    "🎁 Bonus & Promosi": handleBonuses,
    "ℹ️ Bantuan": async (chatId) => await getSupportMarkup(chatId),
    "➕ Deposit": (chatId) => getDepositOptions(chatId),
    "⬅️ Back": (chatId) => showMenu(chatId),
};
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    console.log(`User sent message: ${text}`);

    // 1) Fetch site settings (if needed)
    await getSiteSetting(chatId);

    // 2) Check if the text matches any known commands
    if (commandHandlers[text]) {
        await commandHandlers[text](chatId);
    } else {
        if (!msg.reply_to_message && text && !text.startsWith("/")) {
            await bot.sendMessage(chatId, "Mohon Maaf, Permintaan Anda tidak dapat diproses. Hubungi Livechat untuk bantuan lebih lanjut.");
            await getSupportMarkup(chatId);
            return;
        }
    }

    // 3) Only call handleDepositAmount if we are expecting the user to enter an amount
    const userData = userDepositData[chatId];
    if (userData && userData.currentStep === "WAITING_FOR_AMOUNT") {
        await handleDepositAmount(bot, chatId, text, checkUserExist);
    }
});

bot.on("callback_query", async (callbackQuery) => {
    await handleCallbackQuery(callbackQuery);
});

// In your main bot file where you set up the bot listeners:
bot.on("photo", async (msg) => {
    await processDepositWithProof(bot, msg, checkUserExist);
});

bot.on("polling_error", (error) => {
    console.log(`[polling_error] ${error.code}: ${error.message}`);
});

console.log("Bot is running...");
