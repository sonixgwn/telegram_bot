const bot = require("../botInstance"); // Import the bot instance
const { checkUserExist, getSiteSetting } = require("../api");
const { getSupportMarkup } = require("../utils/supportUtils");

async function handleProfile(chatId) {
  const user = await checkUserExist(chatId);
  if (!user) {
    return bot.sendMessage(chatId, "You are not registered. Please register first.");
  }

  const siteSettings = await getSiteSetting(chatId);
  bot.sendMessage(
    chatId,
    `Your profile details:
    - *Username:* ${user.username}
    - *Mata Uang:* IDR
    - *Bank:* ${user.bank}
    - *Rekening:* ${user.accNumber}

    Hubungi support jika Anda memerlukan bantuan.
    `,
    {
      parse_mode: "Markdown",
      ...await getSupportMarkup(siteSettings.livechat, siteSettings.whatsapp, siteSettings.telegram),
    }
  );
}

module.exports = handleProfile;
