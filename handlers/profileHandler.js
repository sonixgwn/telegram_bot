const bot = require("../botInstance"); // Import the bot instance
const { checkUserExist, getSiteSetting } = require("../api");
const { getSupportMarkup } = require("../utils/supportUtils");

async function handleProfile(chatId) {
  const user = await checkUserExist(chatId);
  if (!user) {
    return bot.sendMessage(chatId, "Akun Anda belum terdaftar. Harap melakukan pendaftaran terlebih dahulu.");
  }
  
  if (user && user.login) return;

  const siteSettings = await getSiteSetting(chatId);
  bot.sendMessage(
    chatId,
    `Rincian Informasi Akun:
    - *User ID:* ${user.username.replace(/_/g, '\\_')}
    - *Mata Uang:* IDR
    - *Bank:* ${user.bank}
    - *Nama Rekening:* ${user.accName}
    - *Nomor Rekening:* ${user.accNumber}

    Hubungi Tim Support Kami jika Anda memerlukan bantuan.
    `,
    {
      parse_mode: "Markdown",
      ...await getSupportMarkup(siteSettings.livechat, siteSettings.whatsapp, siteSettings.telegram),
    }
  );
}

module.exports = handleProfile;
