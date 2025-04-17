const bot = require("../botInstance"); // Import shared bot instance
const { checkUserExist, getMenuKeyboard } = require("../api");
const {
  brand
} = require("../config");

async function showMenu(chatId, password = null, start = false) {
  if (start) {
    const welcomeMessage = `
    <b>Selamat Datang di “${brand}”, Telegram Casino.</b>

    Bermain Slot, Casino, Sepak Bola, dll Langsung di Telegram.`;
    bot.sendMessage(chatId, welcomeMessage,
      {
          parse_mode: "HTML"
      });
  }
  try {
    const user = await checkUserExist(chatId, password);
  
    if (user && user.login) return;
    const keyboard = getMenuKeyboard(user);
    
    bot.sendMessage(chatId, "Silakan pilih opsi berikut :", {
      reply_markup: {
        keyboard,
        resize_keyboard: true,
      },
    });
  } catch (error) {
    console.error("Error fetching menu:", error.message);
    bot.sendMessage(chatId, "Gagal mengambil data. Silakan coba lagi.");
  }
}

module.exports = showMenu;
