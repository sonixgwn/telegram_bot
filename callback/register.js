const axios = require("axios");
const { getAccountListing } = require("../api");
const { API_SECRET, telegramApiUrl, master_code, company_code, brand } = require("../config");
const showMenu = require("../handlers/menuHandler");

let userRegistrationData = {};
let userRegisterData = {};

// Function to register a new user
const registerUser = async (bot, phone, chat_id) => {
  console.log(`Registering user with userCode: ${phone} and chatId: ${chat_id}`);

  const r1 = await bot.sendMessage(chat_id, "Silahkan Masukan User ID Anda:", {
    reply_markup: { force_reply: true },
  });

  userRegistrationData[chat_id] = r1.message_id;

  bot.onReplyToMessage(chat_id, r1.message_id, async (msg1) => {
    if (msg1.reply_to_message.message_id !== r1.message_id) return;

    const username = msg1.text;
    console.log(`Received username: ${username}`);
    bot.deleteMessage(chat_id, msg1.message_id);

    const r2 = await bot.sendMessage(chat_id, "Silahkan Masukan Kata Sandi Anda:", {
      reply_markup: { force_reply: true },
    });

    userRegistrationData[chat_id] = r2.message_id;

    bot.onReplyToMessage(chat_id, r2.message_id, async (msg2) => {
      if (msg2.reply_to_message.message_id !== r2.message_id) return;

      const password = msg2.text;
      console.log(`Received password: ${password}`);
      bot.deleteMessage(chat_id, msg2.message_id);

      const banks = await getAccountListing();

      if (banks) {
        userRegisterData[chat_id] = { username, password, phone, chat_id };

        const bankButtons = banks.map(bank => [{ text: bank.label, callback_data: `register_${bank.label}` }]);

        bot.sendMessage(chat_id, `Silahkan Pilih Penyedia Pembayaran Anda:`, {
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

  const r3 = await bot.sendMessage(chatId, "Silahkan Masukan Nomor Rekening Anda:", {
    reply_markup: { force_reply: true },
  });

  userRegistrationData[chatId] = r3.message_id;

  bot.onReplyToMessage(chatId, r3.message_id, async (msg4) => {
    if (msg4.reply_to_message.message_id !== r3.message_id) return;

    const accNumber = msg4.text;
    console.log(`Received Account Number: ${accNumber}`);
    bot.deleteMessage(chatId, msg4.message_id);

    const r4 = await bot.sendMessage(chatId, "Silahkan Masukan Nama Rekening Anda:", {
      reply_markup: { force_reply: true },
    });

    userRegistrationData[chatId] = r4.message_id;

    bot.onReplyToMessage(chatId, r4.message_id, async (msg5) => {
      const accName = msg5.text;
      console.log(`Received Account Name: ${accName}`);
      bot.deleteMessage(chatId, msg5.message_id);

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


        if (data.data.status === 1) {
          bot.sendMessage(chatId, data.data.msg);
          console.log(`User registered: ${username}, ${password}, ${phone}, ${bankLabel}, ${accNumber}, ${accName}`);
          bot.sendMessage(chatId, `Registrasi Berhasil, Selamat Bergabung di ${brand}` );
        } else {
          bot.sendMessage(chatId, `Registrasi Anda gagal, ${data.data.msg}. Hubungi Kami di Livechat untuk bantuan.`);
          console.log(`Registration failed: ${data.data.msg}`);
        }

        showMenu(chatId);
      } catch (error) {
        console.error("Error registering user:", error.message);
        bot.sendMessage(chatId, "Gagal mendaftarkan pengguna. Silakan coba lagi nanti.");
      }

      delete userRegistrationData[chatId];
      delete userRegisterData[chatId];
    });
  });
};

const syncAccount = async (bot, phone, chatId) => {
  console.log(`Syncing account with userCode: ${phone} and chatId: ${chatId}`);

  const loading = await bot.sendMessage(chatId, "🔍 Akun sedang dicari...");
  
  const data = await axios.post(telegramApiUrl, {
    method: "sync_account",
    chat_id: chatId,
    data: {
      phone,
    },
  }, {
    headers: { "x-endpoint-secret": API_SECRET },
  });

  if (data.data.status === 1) {
    bot.deleteMessage(chatId, loading.message_id);

    const response = await bot.sendMessage(chatId, data.data.msg, {
      reply_markup: { force_reply: true },
    });

    bot.onReplyToMessage(chatId, response.message_id, async (msg) => {
      if (data.data.sync) {
        const password = msg.text;
        bot.deleteMessage(chatId, msg.message_id);

        const loginData = await axios.post(telegramApiUrl, {
          method: "sync_account_confirm",
          chat_id: chatId,
          data: {
            phone
          },
          password
        }, {
          headers: { "x-endpoint-secret": API_SECRET },
        });

        if (loginData.data.status === 1) {
          bot.sendMessage(chatId, loginData.data.msg);
          showMenu(chatId);
        } else {
          bot.sendMessage(chatId, loginData.data.msg);
          console.log(`Sync failed: ${loginData.data.msg}`);
          showMenu(chatId);
        }
      } else {
        const username = msg.text;
        bot.deleteMessage(chatId, msg.message_id);

        const followupMessage = await bot.sendMessage(chatId, "Silahkan Masukan Kata Sandi Anda:", {
          reply_markup: { force_reply: true },
        });

        bot.onReplyToMessage(chatId, followupMessage.message_id, async (msg2) => {
          const password = msg2.text;
          bot.deleteMessage(chatId, msg2.message_id);

          const syncData = await axios.post(telegramApiUrl, {
            method: "sync_account_connect",
            chat_id: chatId,
            data: {
              phone,
              username,
              password
            },
            password
          }, {
            headers: { "x-endpoint-secret": API_SECRET },
          });

          if (syncData.data.status === 1) {
            bot.sendMessage(chatId, syncData.data.msg);
            showMenu(chatId);
          } else {
            bot.sendMessage(chatId, syncData.data.msg);
            console.log(`Login failed: ${syncData.data.msg}`);
            showMenu(chatId);
          }
        });
      }
    });
  }
}

module.exports = {
  registerUser,
  completeRegistration,
  syncAccount
};
