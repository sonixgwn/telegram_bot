const bot = require("../botInstance"); // Import shared bot instance
const { registerUser } = require("../callback/register");

async function handleRegistration(chatId) {
  bot.sendMessage(
    chatId,
    `
    To complete the registration, share your phone number by clicking on the "Share phone number" button. 
    (If this button is not available, click on the ⚃ icon in the lower right corner of the screen).

    For privacy, we will be deleting all your information during the registration process.
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
bot.on("contact", (msg) => {
  const chatId = msg.chat.id;
  const phoneNumber = msg.contact.phone_number;

  registerUser(bot, phoneNumber, chatId);
});

module.exports = handleRegistration;
