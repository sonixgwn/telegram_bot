const bot = require("../botInstance"); // Import shared bot instance
const { checkUserExist } = require("../api");

async function handleBalance(chatId) {
  try {
    const user = await checkUserExist(chatId);
    
    if (!user) {
      bot.sendMessage(chatId, "Your user information is not found. Please contact support.");
      return;
    }

    if (user && user.login) return;

    const balance = user.saldo;
    const msgB = await bot.sendMessage(
      chatId,
      `Saldo anda IDR <span class="tg-spoiler">${balance}</span>. Silahkan pilih opsi dibawah ini:
      Pesan ini akan di hapus dalam 20 detik.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "➕ Deposit", callback_data: "deposit_to_account" }],
            [{ text: "➖ Withdraw", callback_data: "withdraw_funds" }],
          ],
        },
        parse_mode: "HTML",
      }
    );

    setTimeout(() => {
      bot.deleteMessage(chatId, msgB.message_id);
    }, 20000);
  } catch (error) {
    console.error("Error fetching balance:", error.message);
    bot.sendMessage(chatId, "Failed to retrieve balance. Please try again later.");
  }
}

module.exports = handleBalance;
