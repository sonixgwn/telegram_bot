const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const telegramToken = "7548403531:AAG1DHdQgZ2mQ1Rv6ci99oYQRFfS-CbYFWM"; // pwcdev_bot
const apiBaseUrl = "http://localhost:5050";
const telegramApiUrl = `${apiBaseUrl}/telegram`;
const master_code = "WINDEV";
const company_code = "PWCPLAYDEV";
const API_SECRET = "AbCdEfGh";

const bot = new TelegramBot(telegramToken, { polling: true });

// MEMORY STORAGE
let userDepositData = {};
let userRegistrationData = {};
let userLoginData = {};
let userRegisterData = {};
let siteSetting = {};

const getSiteSetting = async (chat_id) => {
  const response = await axios.post(telegramApiUrl,{
    method: "settings",
    chat_id,
    company_code: company_code,
  }, {
    headers: {
      "x-endpoint-secret": API_SECRET,
    },
  });

  if (response.data.status === 1) {
    siteSetting = response.data.data;
  } else {
    bot.sendMessage(chatId, response.data.msg);
  }
};

const getAccountListing = async () => {
  const response = await axios.get(`${apiBaseUrl}/getAccount_Listing`, {
    headers: {
      "x-endpoint-secret": API_SECRET,
    },
  });

  if (response.data.status === 1) {
    return response.data.data.map((account) => ({
      id: account.id,
      label: account.label,
    }));
  } else {
    return null;
  }
};

const registerUser = async (phone, chat_id) => {
  console.log(
    `Registering user with userCode: ${phone} and chatId: ${chat_id}`
  );

  const r1 = await bot.sendMessage(chat_id, "Please enter your username:", {
    "reply_markup": {
        "force_reply": true
    }
  });

  userRegistrationData[chat_id] = r1.message_id;

  bot.onReplyToMessage(chat_id, r1.message_id, async (msg1) => {
    if (msg1.reply_to_message.message_id !== r1.message_id) return;

    const username = msg1.text;
    console.log(`Received username: ${username}`);

    const r2 = await bot.sendMessage(chat_id, "Please enter your Password:", {
      "reply_markup": {
          "force_reply": true
      }
    });

    userRegistrationData[chat_id] = r2.message_id;

    bot.onReplyToMessage(chat_id, r2.message_id, async (msg2) => {
      if (msg2.reply_to_message.message_id !== r2.message_id) return;

      const password = msg2.text;
      console.log(`Received password: ${password}`);

      const banks = await getAccountListing();

      if (banks) {
        userRegisterData[chat_id] = { username, password, phone, chat_id };
         // Buat keyboard dengan 1 baris, 2 kolom
        const bankButtons = [];
        for (let i = 0; i < banks.length; i += 2) {
          const row = [];
          row.push({
            text: banks[i].label,
            callback_data: `register_${banks[i].label}`,
          });
          if (banks[i + 1]) {
            row.push({
              text: banks[i + 1].label,
              callback_data: `register_${banks[i + 1].label}`,
            });
          }
          bankButtons.push(row);
        }

        bot.sendMessage(chat_id, `Please Choose Your Bank:`, {
          reply_markup: { inline_keyboard: bankButtons },
        });
      } else {
        bot.sendMessage(chat_id, "No banks available at the moment.");
      }
    });
  });
};

const checkUserExist = async (chatId, password=null) => {
  const response = await axios.post(`${telegramApiUrl}`, {
    method: "check",
    chat_id: chatId,
    password
  }, {
    headers: {
      "x-endpoint-secret": API_SECRET,
    },
  });

  const data = response.data;

  if (data.status === -1) {
    return await userLogin(chatId, data);
  }

  if (password !== null) {
    bot.sendMessage(chatId, 'Login Successful.');
    showMenu(chatId);
  }

  if (data.status === 1 && !data.data) return null;

  return data.data ? {
    status: 1,
    ...data.data
  } : {
    status: 0
  };
};

const userLogin = async (chatId, data) => {
  const r1 = await bot.sendMessage(chatId, data.msg, {
    reply_markup: {
        force_reply: true,
    },
  });
  
  userLoginData[chatId] = r1.message_id;

  bot.onReplyToMessage(chatId, r1.message_id, async (msg1) => {
    const password = msg1.text;
    console.log(`Received password: ${password}`);

    delete userLoginData[chatId];
    
    return await checkUserExist(chatId, password);
  });
  
  return {
    status: 0
  };
};

const showMenu = async (chatId, password = null) => {
  try {
    const user = await checkUserExist(chatId, password);

    if (user) {
      if (user.status !== 1) return;

      bot.sendMessage(chatId, "Silakan pilih opsi berikut:", {
        reply_markup: {
          keyboard: [
            // Baris pertama: 2 kolom
            [{ text: "🎮 Games" }, { text: "👤 Profile" }],
            // Baris kedua: 2 kolom
            [{ text: "🏦 Balance" }, { text: "🎁 Bonuses" }],
            // Baris keempat: 1 kolom
            [{ text: "ℹ️ Information" }],
          ],
          resize_keyboard: true,
        },
      });
    } else {
      bot.sendMessage(chatId, "Silakan pilih opsi berikut:", {
        reply_markup: {
          keyboard: [
            // Baris pertama: 2 kolom
            [{ text: "🎮 Games" }, { text: "🎁 Bonuses" }],
            // Baris kedua: 1 kolom
            [{ text: "📝 Registration" }],
            // Baris ketiga: 1 kolom
            [{ text: "ℹ️ Information" }],
          ],
          resize_keyboard: true,
        },
      });
    }
  } catch (error) {
    console.error("Error fetching data:", error.message);
    bot.sendMessage(chatId, "Failed to fetch data. Please try again later.");
  }
};

const getSupportMarkup = async () => {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Livechat",
            url: siteSetting.livechat,
          },
        ],
        [
          {
            text: "Whatsapp",
            url: `https://wa.me/${siteSetting.whatsapp}`,
          },
        ],
        [
          {
            text: "Telegram",
            url: `https://t.me/${siteSetting.telegram}`,
          },
        ]
      ],
    },
  }
}

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  
  await getSiteSetting(chatId);

  bot.sendMessage(
    chatId,
    `
    <b>🎰 Welcome Message!</b>

    Welcome to our <b>🎰 Telegram Casino</b>!  
    🎰 <i>PWCPLAY DEV</i> 🎰  
    <i>Best games from top providers directly in Telegram!</i>
  `,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "➡️ Continue", callback_data: "continue" }],
          [{ text: "⏳ I'll come back later", callback_data: "later" }],
        ],
      },
    }
  );
});

bot.onText(/\/menu/, async (msg) => {
  const chatId = msg.chat.id;
  await getSiteSetting(chatId);

  showMenu(chatId);
});

bot.onText(/\/chat/, async (msg) => {
  const chatId = msg.chat.id;
  await getSiteSetting(chatId);

  bot.sendMessage(chatId, "Hubungi Admin Super Ramah kami dibawah ini:", await getSupportMarkup());
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  console.log(`User sent message: ${text}`);

  await getSiteSetting(chatId);

  if (text === "🎮 Games") {
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
      // [{ text: "🔍 Search", callback_data: "search" }],
    ];

    bot.sendMessage(chatId, "Select Game Category:", {
      reply_markup: { inline_keyboard: gamesKeyboard },
    });
  } else if (text === "👤 Profile") {
    const user = await checkUserExist(chatId);
    if (user) {
      if (user.status !== 1) return;
      bot.sendMessage(
        chatId,
        `Your profile details:
        - *Username:* ${user.username}
        - *Mata Uang:* IDR
        - *Bank:* ${user.bank}
        - *Rekening:* ${user.accNumber}

        Hubungi support jika Anda memerlukan bantuan.
        `,
        { parse_mode: "Markdown",
          ...await getSupportMarkup()
         }
      );
    } else {
      bot.sendMessage(chatId, "You are not registered. Please register first.");
    }
  } else if (text === "🏦 Balance") {
    const user = await checkUserExist(chatId);
    if (user) {
      if (user.status !== 1) return;
      const balance = user.saldo;
      
      const msgB = await bot.sendMessage(
        chatId,
        `Your current balance is IDR <span class="tg-spoiler">${balance}</span>. Choose an option:
        Message will be deleted in 20 seconds.`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "➕ Deposit to Account",
                  callback_data: "deposit_to_account",
                },
              ],
              [
                {
                  text: "➖ Withdraw Funds",
                  callback_data: "withdraw_funds",
                },
              ],
            ],
          },
          parse_mode: "HTML",
        }
      );
      setTimeout(() => {
        bot.deleteMessage(chatId, msgB.message_id);
      }, 20000);
    } else {
      // Jika tidak ada user_code yang terkait dengan chatId, beri tahu pengguna untuk menghubungi admin
      bot.sendMessage(
        chatId,
        "Your user information is not found. Please contact support."
      );
    }
  } else if (text === "🎁 Bonuses") {
    const bonusesKeyboard = [
      [
        { text: "✅ Active", callback_data: "active" },
        { text: "🆓 Available", callback_data: "available" },
      ],
      [
        {
          text: "📜 Transaction History",
          callback_data: "transaction_history",
        },
      ],
    ];

    bot.sendMessage(chatId, "Choose an option:", {
      reply_markup: { inline_keyboard: bonusesKeyboard },
    });
  } else if (text === "ℹ️ Information") {
    bot.sendMessage(
      chatId,
      `
      <b>ℹ️ Information</b>
      Gunakan bot ini untuk bermain game terbaik, melakukan deposit, dan banyak lagi.  
      Hubungi support jika Anda memerlukan bantuan.
    `,
      { parse_mode: "HTML" }
    );
  } else if (text === "📝 Registration") {
    bot.sendMessage(
      chatId,
      `
      To complete the registration share your phone number by clicking on the "Share phone number" button. 
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
  } else if (text === "⬅️ Back") {
    showMenu(chatId);
  }

  if (userDepositData[chatId] && !isNaN(text)) {
    const amount = parseFloat(text);
    const { method, bankMember, bonus_id, payment_category_id, img, bank_penerima, nama_penerima, nomer_penerima } = userDepositData[chatId];
    
    const user = await checkUserExist(chatId);

    try {
      const response = await axios.post(`${apiBaseUrl}/transaksi`, {
        user_id: user.id,
        accName: user.accName,
        accNumber: user.accNumber,
        bankMember: '',
        bonus_id,
        company_code: user.company_code,
        payment_category_id,
        amount,
        img,
        type: 1,
        bank_penerima,
        nama_penerima,
        nomer_penerima,
        platform: 'telegram',

      }, {
        headers: {
          "x-endpoint-secret": API_SECRET,
        },
      });
      const resData = response.data;
      if (resData.status === 1) {
        const filePath = path.join(__dirname, `temp/${chatId}.png`);
        if (!fs.existsSync(path.dirname(filePath))) {
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
        }

        await QRCode.toFile(filePath, resData.qris_data, {
          type: 'png',
          errorCorrectionLevel: 'H'
        }, function (err) {
          if (err) throw err;

          bot.sendPhoto(chatId, filePath, {
            caption: `Deposit of ${amount} via ${method} has been recorded successfully. QRIS only active for 5 minutes.`,
            parse_mode: "HTML",
          });

          fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`Error deleting file: ${err.message}`);
          } else {
            console.log(`File ${filePath} deleted successfully.`);
          }
          });
        })
      } else {
        bot.sendMessage(chatId, `Deposit failed: ${resData.msg}`);
      }
    } catch (error) {
      console.error('Error while calling deposit API:', error.message);
      if (error.response && error.response.data && error.response.data.status === 0) {
        bot.sendMessage(chatId, `Deposit failed: ${error.response.data.msg}`);
      } else {
        bot.sendMessage(chatId, 'An error occurred while processing your deposit. Please try again later.');
      }
    }
    delete userDepositData[chatId];
  } else if (userDepositData[chatId] && isNaN(text)) {
    bot.sendMessage(chatId, 'Please enter a valid amount (number).');
  }

  if (userRegistrationData[chatId] && (!msg.reply_to_message || userRegistrationData[chatId] !== msg.reply_to_message?.message_id)) {
    bot.sendMessage(chatId, 'Registration Cancelled.');
    delete userRegistrationData[chatId];
    
    bot.deleteMessage(chatId, msg.message_id);
  } else if (userRegistrationData[chatId]) {
    bot.deleteMessage(chatId, msg.message_id);
  }

  if (userLoginData[chatId] && (!msg.reply_to_message || userLoginData[chatId] !== msg.reply_to_message?.message_id)) {
    bot.sendMessage(chatId, 'Login Cancelled.');
    delete userLoginData[chatId];

    bot.deleteMessage(chatId, msg.message_id);
  } else if (userLoginData[chatId]) {
    bot.deleteMessage(chatId, msg.message_id);
  }
});

bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  await getSiteSetting(chatId);

  console.log(`Received callback data: ${data} - ${chatId}`);

  bot.deleteMessage(chatId, callbackQuery.message.message_id);

  if (data === "continue") {
    showMenu(chatId);
  } else if (data === "deposit_to_account") {
    const depositMethodsKeyboard = [
      [{ text: "📱 QRIS", callback_data: "deposit_qris" }],
      [{ text: "🏦 BANK", callback_data: "deposit_bank" }],
      [{ text: "💳 E-WALLET", callback_data: "deposit_ewallet" }],
      [{ text: "📶 PULSA", callback_data: "deposit_pulsa" }],
    ];

    bot.sendMessage(chatId, "💳 Choose your deposit method:", {
      reply_markup: { inline_keyboard: depositMethodsKeyboard },
    });
  } else if (
    data === "deposit_qris" ||
    data === "deposit_bank" ||
    data === "deposit_ewallet" ||
    data === "deposit_pulsa"
  ) {
    let method = "";
    if (data === "deposit_qris") {
      method = "QRIS";
      payment_category_id = 4;
      bot.sendMessage(
        chatId,
        `You selected ${method}. Please enter the amount you want to deposit.`
      );
      userDepositData[chatId] = { method, payment_category_id };
    } else if (data === "deposit_bank") {
      method = "BANK";
      payment_category_id = 1;
    } else if (data === "deposit_ewallet") {
      method = "EWALLET";
      payment_category_id = 2;
    } else if (data === "deposit_pulsa") {
      method = "PULSA";
      payment_category_id = 3;
    }
    if (method === "QRIS") return;
    try {
      bot.sendMessage(chatId, 
        `
        Berikut Contoh Deposit untuk ${method}:

        Bank: <code>BCA</code>
        Nama: <code>PT. PWCPLAY DEV</code>
        Account: <code>1234567890</code>
        `, {
          parse_mode: 'HTML'
        })
    } catch (error) {
      console.error(`Error fetching ${method} list:`, error.message);
      bot.sendMessage(
        chatId,
        `An error occurred while fetching ${method} options. Please try again later.`
      );
    }
  } else if (
    data.startsWith("BANK_") ||
    data.startsWith("EWALLET_") ||
    data.startsWith("CRYPTO_")
  ) {
    const [method, selectedOption] = data.split("_");
    const userMethod = userDepositData[chatId]?.method;

    if (userMethod && userMethod.toUpperCase() === method) {
      userDepositData[chatId].selectedOption = selectedOption;

      bot.sendMessage(
        chatId,
        `${selectedOption}. Please enter the amount you want to deposit.`
      );
    } else {
      bot.sendMessage(chatId, "Invalid selection. Please start again.");
    }
  } else if (data.startsWith("providers_")) {
    const game_category = data.split("_")[1];
    try {
      // Panggil API untuk mendapatkan daftar provider
      const response = await axios.get(`${apiBaseUrl}/getProviders/${game_category}`, {
        headers: {
          "x-endpoint-secret": API_SECRET,
        },
      });

      if (response.data.status === 1) {
        const providers = response.data.data.filter(provider => provider.status === 1);

        // Buat keyboard dengan 1 baris, 2 kolom
        const providerButtons = [];
        for (let i = 0; i < providers.length; i += 2) {
          const row = [];
          row.push({
            text: providers[i].provider_name,
            callback_data: `provider_${providers[i].vendor_custom_code}_${game_category}_${providers[i].provider_type}_1`,
          });
          if (providers[i + 1]) {
            row.push({
              text: providers[i + 1].provider_name,
              callback_data: `provider_${providers[i + 1].vendor_custom_code}_${game_category}_${providers[i + 1].provider_type}_1`,
            });
          }
          providerButtons.push(row);
        }

        // Kirim daftar provider ke pengguna
        bot.sendMessage(chatId, "Select a Provider:", {
          reply_markup: { inline_keyboard: providerButtons },
        });
      } else {
        bot.sendMessage(chatId, "No providers found.");
      }
    } catch (error) {
      console.error("Error fetching providers:", error.message);
      bot.sendMessage(
        chatId,
        "Failed to fetch providers. Please try again later."
      );
    }
  } else if (data.startsWith("provider_")) {
    const game_provider = data.split("_")[1];
    const game_category = data.split("_")[2];
    const provider_type = data.split("_")[3];
    let pagination = data.split("_")[4];

    let response;
    
    try {
      // Panggil API untuk mendapatkan daftar game berdasarkan ID provider
      if (game_category === 'slots') {
        response = await axios.post(
          `${apiBaseUrl}/getFiverGames`,
          {
            game_provider,
            game_category,
          },
          {
            headers: {
              "x-endpoint-secret": API_SECRET,
            },
          }
        );
      } else if (game_category === 'arcade') {
        response = await axios.get(
          `${apiBaseUrl}/getArcadeGames/${game_provider}`,
          {
            headers: {
              "x-endpoint-secret": API_SECRET,
            },
          }
        );
      }

      if (response.data.status === 1 && response.data.data.length > 0) {
        let games = response.data.data;

        const startIndex = (parseInt(pagination) - 1) * 20;
        const endIndex = startIndex + 20;
        games = games.slice(startIndex, endIndex);

        // Buat inline keyboard untuk daftar game
        const gameButtons = [];
        for (let i = 0; i < games.length; i += 2) {
          const row = [];
          row.push({
            text: games[i].game_name,
            callback_data: `game_${game_provider}_${game_category}_${games[i].game_code}_${provider_type}_${games[i].game_provider}`, // Menggunakan GameCode sebagai callback_data
          });
          if (games[i + 1]) {
            row.push({
              text: games[i + 1].game_name,
              callback_data: `game_${game_provider}_${game_category}_${games[i + 1].game_code}_${provider_type}_${games[i + 1].game_provider}`, // Menggunakan GameCode sebagai callback_data
            });
          }
          gameButtons.push(row);
        }
        
        const paginationRow = []
        if (pagination > 1) {
          paginationRow.push({
              text: "⏮️ First",
              callback_data: `provider_${game_provider}_${game_category}_${provider_type}_1`,
          });
          
          paginationRow.push({
              text: "⬅️ Back",
              callback_data: `provider_${game_provider}_${game_category}_${provider_type}_${parseInt(pagination) - 1}`,
          });
        }
        const totalPages = Math.ceil(response.data.data.length / 20);

        if (pagination < totalPages) {
          paginationRow.push({
            text: "➡️ Next",
            callback_data: `provider_${game_provider}_${game_category}_${provider_type}_${parseInt(pagination) + 1}`,
          });

          paginationRow.push({
              text: "⏭️ Last",
              callback_data: `provider_${game_provider}_${game_category}_${provider_type}_${totalPages}`,
          });
        }
        
        gameButtons.push(paginationRow);

        // Kirim daftar game ke pengguna dalam format inline keyboard
        bot.sendMessage(chatId, "Select a Game:", {
          reply_markup: { inline_keyboard: gameButtons },
        });
      } else {
        bot.sendMessage(chatId, "No games found for this provider.");
      }
    } catch (error) {
      console.error("Error fetching games:", error.message);
      bot.sendMessage(chatId, "Failed to fetch games. Please try again later.");
    }
  } else if (data.startsWith("game_")) {
    const game_provider = data.split("_")[1];
    const game_category = data.split("_")[2];
    const game_code = data.split("_")[3];
    const provider_type = data.split("_")[4];
    const user = await checkUserExist(chatId);
    const provider_id = data.split("_")[5];

    if (!user) {
      bot.sendMessage(chatId, "You are not registered. Please register first.");
      return;
    }

    let gamesResponse;

    try {
      if (game_category === 'slots') {
        gamesResponse = await axios.post(
          `${apiBaseUrl}/getFiverGames`,
          {
            game_provider,
            game_category,
          },
          {
            headers: {
              "x-endpoint-secret": API_SECRET,
            },
          }
        );
      } else if (game_category === 'arcade') {
        gamesResponse = await axios.get(
          `${apiBaseUrl}/getArcadeGames/${game_provider}`,
          {
            headers: {
              "x-endpoint-secret": API_SECRET,
            },
          }
        );
      }

      const games = gamesResponse.data.data;
      const selectedGame = games.find((game) => game.game_code.toString() === game_code);

      // Panggil API untuk mendapatkan daftar game berdasarkan ID provider
      const response = await axios.post(
        telegramApiUrl,
        {
          method: "game_launch",
          chat_id: chatId,
          game_provider: provider_id.toUpperCase(),
          game_category,
          extplayer: user.extplayer,
          game_code,
          provider_type,
          portfolio: 'SeamlessGame'
        },
        {
          headers: {
            "x-endpoint-secret": API_SECRET,
          },
        }
      );

      if (response.data.status === 1) {
        const game = response.data;
        // Buat inline keyboard dengan 1 baris 2 kolom untuk Demo Link dan Real Link
        const gameButtons = [
          [
            {
              text: "Play Now",
              web_app: { url: game.url }, // Menggunakan web_app untuk tombol Play Now
            },
          ],
        ];

        // Kirim gambar dan inline keyboard
        const gameMessage = await bot.sendPhoto(chatId, selectedGame.game_image, {
          reply_markup: {
            inline_keyboard: gameButtons,
          },
        });

        setTimeout(() => {
          bot.editMessageReplyMarkup(
            {
              inline_keyboard: [
                [
                  {
                    text: "Relaunch Game",
                    callback_data: `game_${game_provider}_${game_category}_${game_code}_${provider_type}_${provider_id}`, // Menggunakan web_app untuk tombol Play Now
                  },
                ],
              ]
            }, {
              chat_id: chatId,
              message_id: gameMessage.message_id
            });
        }, 30000);
      } else {
        bot.sendMessage(chatId, "No details found for this game.");
      }
    } catch (error) {
      console.error("Error fetching game details:", error.message);
      bot.sendMessage(
        chatId,
        "Failed to fetch game details. Please try again later."
      );
    }

    bot.answerCallbackQuery(callbackQuery.id);
  } else if (data.startsWith("categories_")) {
    const provider_type = data.split("_")[1];
    const portfolio = data.split("_")[2];
    try {
      // Panggil API untuk mendapatkan daftar provider
      const response = await axios.get(`${apiBaseUrl}/getCategoryGames/${provider_type}`, {
        headers: {
          "x-endpoint-secret": API_SECRET,
        },
      });

      if (response.data.status === 1) {
        const providers = response.data.data.filter(provider => provider.game_maintenance === false);

        // Buat keyboard dengan 1 baris, 2 kolom
        const providerButtons = [];
        for (let i = 0; i < providers.length; i += 2) {
          const row = [];
          row.push({
            text: providers[i].game_name,
            callback_data: `categoryGame_${providers[i].game_code}_${providers[i].game_provider}_${provider_type}_${portfolio}`,
          });
          if (providers[i + 1]) {
            row.push({
              text: providers[i + 1].game_name,
              callback_data: `categoryGame_${providers[i + 1].game_code}_${providers[i + 1].game_provider}_${provider_type}_${portfolio}`,
            });
          }
          providerButtons.push(row);
        }

        // Kirim daftar provider ke pengguna
        bot.sendMessage(chatId, "Select a Game:", {
          reply_markup: { inline_keyboard: providerButtons },
        });
      } else {
        bot.sendMessage(chatId, "No providers found.");
      }
    } catch (error) {
      console.error("Error fetching providers:", error.message);
      bot.sendMessage(
        chatId,
        "Failed to fetch providers. Please try again later."
      );
    }
  } else if (data.startsWith('categoryGame_')) {
    const game_code = data.split("_")[1];
    const game_provider = data.split("_")[2];
    const provider_type = data.split("_")[3];
    const portfolio = data.split("_")[4];
    const user = await checkUserExist(chatId);

    if (!user) {
      bot.sendMessage(chatId, "You are not registered. Please register first.");
      return;
    }

    try {
      const gamesResponse = await axios.get(
        `${apiBaseUrl}/getCategoryGames/${provider_type}`,
        {
          headers: {
            "x-endpoint-secret": API_SECRET,
          },
        }
      );

      const games = gamesResponse.data.data;
      const selectedGame = games.find((game) => game.game_provider.toString() === game_provider);

      // Panggil API untuk mendapatkan daftar game berdasarkan ID provider
      const response = await axios.post(
        telegramApiUrl,
        {
          method: "game_launch",
          chat_id: chatId,
          game_provider: game_provider === 'sbosports' ? game_code : game_provider,
          game_category: provider_type,
          extplayer: user.extplayer,
          game_code,
          provider_type,
          portfolio
        },
        {
          headers: {
            "x-endpoint-secret": API_SECRET,
          },
        }
      );

      if (response.data.status === 1) {
        const game = response.data;
        // Buat inline keyboard dengan 1 baris 2 kolom untuk Demo Link dan Real Link
        const gameButtons = [
          [
            {
              text: "Play Now",
              url: game.url, // Menggunakan web_app untuk tombol Play Now
            },
          ],
        ];

        // Kirim gambar dan inline keyboard
        const gameMessage = await bot.sendPhoto(chatId, selectedGame.game_image, {
          reply_markup: {
            inline_keyboard: gameButtons,
          },
        });

        setTimeout(() => {
          bot.editMessageReplyMarkup(
            {
              inline_keyboard: [
                [
                  {
                    text: "Relaunch Game",
                    callback_data: `categoryGame_${game_code}_${game_provider}_${provider_type}_${portfolio}`, // Menggunakan web_app untuk tombol Play Now
                  },
                ],
              ]
            }, {
              chat_id: chatId,
              message_id: gameMessage.message_id
            });
        }, 30000);
      } else {
        bot.sendMessage(chatId, "No details found for this game.");
      }
    } catch (error) {
      console.error("Error fetching game details:", error.message);
      bot.sendMessage(
        chatId,
        "Failed to fetch game details. Please try again later."
      );
    }

    bot.answerCallbackQuery(callbackQuery.id);
  } else if (data === "personal_info") {
    const userCode = chatId.toString();
    axios
      .get(`http://localhost:3000/userinfo?user_code=${userCode}`)
      .then((response) => {
        const user = response.data.user;
        bot.sendMessage(
          chatId,
          `
          *Personal Info for ${user.user_code}*:
          - *User Code:* ${user.user_code}
          - *Balance:* ${user.balance}
          - *Address:* ${user.alamat || "Not set"}
          - *Email:* ${user.email || "Not set"}
          - *Bank:* ${user.bank || "Not set"}
          - *Rekening:* ${user.rekening || "Not set"}
        `,
          { parse_mode: "Markdown" }
        );
      })
      .catch((error) => {
        bot.sendMessage(
          chatId,
          "There was an error retrieving your personal information. Please try again later."
        );
        console.error(error);
      });
    bot.answerCallbackQuery(callbackQuery.id);
  } else if (data.startsWith("register_")) {
    const checkUser = await checkUserExist(chatId);

    if (checkUser) {
      bot.sendMessage(chatId, "You are already registered.");
      return;
    }

    const [_, bankLabel] = data.split("_");
    console.log(`Received bank: ${bankLabel}`);

    const r3 = await bot.sendMessage(chatId, "Please enter Account Number:", {
      "reply_markup": {
          "force_reply": true
      }
    });
    userRegistrationData[chatId] = r3.message_id;

    bot.onReplyToMessage(chatId, r3.message_id, async (msg4) => {
      if (msg4.reply_to_message.message_id !== r3.message_id) return;

      const accNumber = msg4.text;
      console.log(`received Account Number: ${accNumber}`);

      const r4 = await bot.sendMessage(chatId, "Please enter Account Name:", {
        "reply_markup": {
            "force_reply": true
        }
      });
      userRegistrationData[chatId] = r4.message_id;
  
      bot.onReplyToMessage(chatId, r4.message_id, async (msg5) => {
        const accName = msg5.text;
        console.log(`received Account Name: ${accName}`);

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
            headers: {
              "x-endpoint-secret": API_SECRET,
            },
          });
  
          bot.sendMessage(chatId, data.data.msg);
          console.log(`Registering user with username: ${username}, password: ${password}, phone: ${phone}, bank: ${bankLabel}, accNumber: ${accNumber}, accName: ${accName}`);
          bot.sendMessage(chatId, "Registration completed successfully.");
        } catch (error) {
          console.error("Error registering user:", error.message);
          bot.sendMessage(chatId, "Failed to register user. Please try again later.");
        }
        
        delete userRegistrationData[chatId];
        delete userRegisterData[chatId];

        showMenu(chatId, password);
      });
    });
  }
});

bot.on("contact", (msg) => {
  const chatId = msg.chat.id;
  const phoneNumber = msg.contact.phone_number;

  registerUser(phoneNumber, chatId);
});

console.log("Bot is running...");
