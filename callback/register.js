const axios = require("axios");
const { getAccountListing } = require("../api");
const { API_SECRET, telegramApiUrl, master_code, company_code } = require("../config");

let userRegistrationData = {};
let userRegisterData = {};

// Function to register a new user
const registerUser = async (bot, phone, chat_id) => {
  console.log(`Registering user with userCode: ${phone} and chatId: ${chat_id}`);

  const r1 = await bot.sendMessage(chat_id, "Please enter your username:", {
    reply_markup: { force_reply: true },
  });

  userRegistrationData[chat_id] = r1.message_id;

  bot.onReplyToMessage(chat_id, r1.message_id, async (msg1) => {
    if (msg1.reply_to_message.message_id !== r1.message_id) return;

    const username = msg1.text;
    console.log(`Received username: ${username}`);

    const r2 = await bot.sendMessage(chat_id, "Please enter your Password:", {
      reply_markup: { force_reply: true },
    });

    userRegistrationData[chat_id] = r2.message_id;

    bot.onReplyToMessage(chat_id, r2.message_id, async (msg2) => {
      if (msg2.reply_to_message.message_id !== r2.message_id) return;

      const password = msg2.text;
      console.log(`Received password: ${password}`);

      const banks = await getAccountListing();

      if (banks) {
        userRegisterData[chat_id] = { username, password, phone, chat_id };

        const bankButtons = banks.map(bank => [{ text: bank.label, callback_data: `register_${bank.label}` }]);

        bot.sendMessage(chat_id, `Please Choose Your Bank:`, {
          reply_markup: { inline_keyboard: bankButtons },
        });
      } else {
        bot.sendMessage(chat_id, "No banks available at the moment.");
      }
    });
  });
};

// Function to complete user registration
const completeRegistration = async (bot, chatId, bankLabel) => {
  console.log(`Received bank: ${bankLabel}`);

  const r3 = await bot.sendMessage(chatId, "Please enter Account Number:", {
    reply_markup: { force_reply: true },
  });

  userRegistrationData[chatId] = r3.message_id;

  bot.onReplyToMessage(chatId, r3.message_id, async (msg4) => {
    if (msg4.reply_to_message.message_id !== r3.message_id) return;

    const accNumber = msg4.text;
    console.log(`Received Account Number: ${accNumber}`);

    const r4 = await bot.sendMessage(chatId, "Please enter Account Name:", {
      reply_markup: { force_reply: true },
    });

    userRegistrationData[chatId] = r4.message_id;

    bot.onReplyToMessage(chatId, r4.message_id, async (msg5) => {
      const accName = msg5.text;
      console.log(`Received Account Name: ${accName}`);

      const { username, password, phone } = userRegisterData[chatId];

      try {
        const data = await axios.post(telegramApiUrl, {
          method: "user_create",
          master_code,
          company_code,
          chat_id: chatId,
          data: {
            username,
            password,
            email: `${chatId}@placeholder.com`,
            phone,
            bank: bankLabel,
            accNumber,
            accName,
            country: "ID",
          },
        }, {
          headers: { "x-endpoint-secret": API_SECRET },
        });

        bot.sendMessage(chatId, data.data.msg);
        console.log(`User registered: ${username}, ${password}, ${phone}, ${bankLabel}, ${accNumber}, ${accName}`);
        bot.sendMessage(chatId, "Registration completed successfully.");
      } catch (error) {
        console.error("Error registering user:", error.message);
        bot.sendMessage(chatId, "Failed to register user. Please try again later.");
      }

      delete userRegistrationData[chatId];
      delete userRegisterData[chatId];
    });
  });
};

module.exports = {
  registerUser,
  completeRegistration,
};
