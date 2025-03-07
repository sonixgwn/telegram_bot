const bot = require("../botInstance");

async function handleGames(chatId) {
  const gamesKeyboard = [
    [
      { text: "🎰 Slots", callback_data: "providers_slots" },
      { text: "🎲 Live Casino", callback_data: "categories_LC_Casino" },
    ],
    [
      { text: "⚽ Sports", callback_data: "categories_SB_SportsBook" },
      { text: "🕹️ Arcade", callback_data: "providers_arcade" },
    ],
    [
      { text: "🐔 Sabung Ayam", callback_data: "categories_LG_SeamlessGame" },
    ],
  ];

  bot.sendMessage(chatId, "Select Game Category:", {
    reply_markup: { inline_keyboard: gamesKeyboard },
  });
}

module.exports = handleGames;
