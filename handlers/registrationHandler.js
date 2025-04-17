const bot = require("../botInstance"); // Import shared bot instance
const { registerUser, syncAccount } = require("../callback/register");
const { brand } = require("../config");

// Store user states (in-memory for simplicity; consider using a database for production)
const userStates = {};

async function handleRegistration(chatId) {
  // Set user state to "registration"
  userStates[chatId] = "registration";

  bot.sendMessage(
    chatId,
    `
    Untuk menyelesaikan Registrasi Anda, Silahkan bagikan nomor telepon Telegram Anda dengan memilih tombol “Share”.

    Untuk keamanan Anda, Kami akan menghapus semua informasi registrasi Anda setelah proses ini selesai.
  `,
    {
      reply_markup: {
        keyboard: [
          [{ text: "Share phone number", request_contact: true }],
          [{ text: "⬅️ Back", callback_data: "continue" }],
        ],
        one_time_keyboard: true,
        resize_keyboard: true,
      },
    }
  );
}

async function handleSyncAccount(chatId) {
  // Set user state to "sync"
  userStates[chatId] = "sync";

  bot.sendMessage(
    chatId,
    `
    Untuk menyambungkan akun Anda dengan akun ${brand}, Silahkan bagikan nomor telepon Telegram Anda dengan memilih tombol “Share”.
  `,
    {
      reply_markup: {
        keyboard: [
          [{ text: "Share phone number", request_contact: true }],
          [{ text: "⬅️ Back", callback_data: "continue" }],
        ],
        one_time_keyboard: true,
        resize_keyboard: true,
      },
    }
  );
}

// Handling contact share event for registration or sync
bot.on("contact", (msg) => {
  const chatId = msg.chat.id;
  const phoneNumber = msg.contact.phone_number;

  // Check user state
  const userState = userStates[chatId];

  if (userState === "registration") {
    console.log("Handling registration...");
    registerUser(bot, phoneNumber, chatId);
  } else if (userState === "sync") {
    console.log("Handling account sync...");
    // Call a function to handle account sync (implement this function)
    syncAccount(bot, phoneNumber, chatId);
  } else {
    console.log("Unknown state. Ignoring contact share.");
  }

  // Clear user state after handling
  delete userStates[chatId];
});

module.exports = { handleRegistration, handleSyncAccount };