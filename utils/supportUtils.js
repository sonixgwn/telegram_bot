const { getSiteSetting } = require("../api");
const bot = require("../botInstance"); // Import shared bot instance

async function getSupportMarkup(chatId) {
  const ss = await getSiteSetting(chatId);
  
  bot.sendMessage(
    chatId,
    "Silahkan pilih sarana pelayanan Kami dibawah ini:",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Livechat", url: ss.livechat }],
          [{ text: "Whatsapp", url: `https://wa.me/${ss.whatsapp}` }],
          [{ text: "Telegram", url: `https://t.me/${ss.telegram}` }],
        ],
      },
    }
  );
}
  
  module.exports = { getSupportMarkup };
  