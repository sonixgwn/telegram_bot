const bot = require("../botInstance"); // Import shared bot instance
const { checkUserExist } = require("../api");

async function showMenu(chatId, password = null) {
  try {
    const user = await checkUserExist(chatId, password);
  
    if (user && user.login) return;

    let keyboard;
    if (user) {
      keyboard = [
        [{ text: "🎮 Games" }, { text: "👤 Informasi Akun" }],
        [{ text: "🏦 Saldo" }, { text: "🎁 Bonus & Promosi" }],
        //[{ text: "ℹ️ Information" }],
      ];
    } else {
      keyboard = [
        // [{ text: "🎮 Games" }, { text: "🎁 Bonus & Promosi" }],
        // [{ text: "📝 Registration" }],
        // [{ text: "ℹ️ Information" }],
        [{ text: "📝 Registration" }, { text: "🎮 Games" }],
      ];
    }
    
    bot.sendMessage(chatId, "Silakan pilih opsi berikut :", {
      reply_markup: {
        keyboard,
        resize_keyboard: true,
      },
    });
  } catch (error) {
    console.error("Error fetching menu:", error.message);
    bot.sendMessage(chatId, "Failed to fetch data. Please try again later.");
  }
}

module.exports = showMenu;
