const bot = require("../botInstance"); // Import shared bot instance
const { registerUser } = require("../callback/register");

async function handleRegistration(chatId) {
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

// Handling contact share event for registration
bot.once("contact", (msg) => {
  const chatId = msg.chat.id;
  console.log(msg.chat);
  const phoneNumber = msg.contact.phone_number;

  registerUser(bot, phoneNumber, chatId);
});

module.exports = handleRegistration;
