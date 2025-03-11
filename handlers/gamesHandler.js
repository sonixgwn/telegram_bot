const bot = require("../botInstance");

async function handleGames(chatId) {
  const gamesKeyboard = [
    [
      { text: "🎰 Slots", callback_data: "providers_slots_Slot" },
      { text: "🎲 Live Casino", callback_data: "categories_LC_SeamlessGame_Casino" },
    ],
    [
      { text: "⚽ Sports", callback_data: "categories_SB_SportsBook_Sepak Bola" },
      { text: "🕹️ Arcade", callback_data: "providers_arcade_Arcade" },
    ],
    [
      { text: "🐔 Sabung Ayam", callback_data: "categories_LG_SeamlessGame_Sabung Ayam" },
    ],
  ];

  bot.sendMessage(chatId, "Silahkan Pilih Kategori Permainan :", {
    reply_markup: { inline_keyboard: gamesKeyboard },
  });
}

module.exports = handleGames;
