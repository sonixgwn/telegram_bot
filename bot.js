const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const telegramToken = '7634762303:AAGVEfL-mlE4g1ANBCxDVCUoTjdJ54Rac7k';
const bot = new TelegramBot(telegramToken, { polling: true });
const agentCode = 'rensydev2';
const agentToken = 'rensydev2-tk:cc392776-0a4a-4ac1-8bdd-793c31345aed';
const registerUser = (userCode, chatId) => {
  const body = {
    method: "user_create",
    agent_code: agentCode,
    agent_token: agentToken,
    user_code: userCode,
    chat_id: chatId
  };
  axios.post('http://localhost:3000/user_create', body, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then((response) => {
    if (response.data.status === 1) {
      bot.sendMessage(chatId, `Pendaftaran berhasil! Selamat datang!`, {
        reply_markup: {
          keyboard: [
            [{ text: '🎮 Games'}, { text: '⚽ Sport' }],
            [{ text: '👤 Profile' }, { text: '⚙️ Settings' }],
            [{ text: '💰 Balance' }, { text: '🎁 Bonuses' }],
            [{ text: 'ℹ️ Information' }]
          ],
          one_time_keyboard: false,
          resize_keyboard: true
        }
      });
    } else {
      bot.sendMessage(chatId, 'Terjadi kesalahan saat mendaftar. Silakan coba lagi.');
    }
  })
  .catch((error) => {
    if (error.response) {
      console.error('Error during registration:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Error during registration: No response received from server. Request:', error.request);
    } else {
      console.error('Error during registration:', error.message);
    }
    bot.sendMessage(chatId, 'Terjadi kesalahan saat mendaftar. Silakan coba lagi.');
  });
};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `
    <b>🎰 Hello, Player!</b>

    Welcome to our <b>🎰 Casino Bot</b>!  
    🎰 <i>Slotegrator_Telegram_Casino</i> 🎰  
    <i>Best games from top providers directly in Telegram!</i>

    <b>We offer:</b>
    🎮 <i>An impressive game catalog</i>  
    🕹️ <i>A handy game and provider search</i>  
    ⚡ <i>Quick deposits and withdrawals</i>  

    ✅ <i>By continuing to use the bot you confirm that you're of age and consent to our</i>  
    <a href="https://example.com/terms">Terms & Conditions</a> and <a href="https://example.com/privacy">Privacy Policy</a>
  `, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '➡️ Continue', callback_data: 'continue' }],
        [{ text: '⏳ I\'ll come back later', callback_data: 'later' }]
      ]
    }
  });
});

bot.on('message',async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  console.log(`User sent message: ${text}`);

  if (text === '🎮 Games') {
    const gamesKeyboard = [
      [
        { text: '🏷 Providers', callback_data: 'providers' },
        { text: '🎲 All Games', callback_data: 'allgames' },
      ],
      [
        { text: '⭐ Popular Games', callback_data: 'popular' },
        { text: '🏆 Best', callback_data: 'best' },
      ],
      [
        { text: '🔥 Hot', callback_data: 'hot' },
        { text: '🆕 New Games', callback_data: 'newgames' },
      ],
      [{ text: '🔍 Search', callback_data: 'search' }],
    ];

    bot.sendMessage(chatId, 'Select Game Category:', {
      reply_markup: { inline_keyboard: gamesKeyboard },
    });
  } else if (text === '⚽ Sport') {
    bot.sendMessage(chatId, '🏟 You selected Sport. Stay tuned for updates!');
  } else if (text === '👤 Profile') {
    const profileKeyboard = [
      [{ text: '📞 Contacts', callback_data: 'contacts' }],
      [{ text: 'ℹ️ Personal Info', callback_data: 'personal_info' }],
    ];

    bot.sendMessage(chatId, 'Select Profile Category:', {
      reply_markup: { inline_keyboard: profileKeyboard },
    });
  } else if (text === '⚙️ Settings') {
    const settingsKeyboard = [
      [{ text: '🌐 Interface Language', callback_data: 'interface_language' }],
      [{ text: '✉️ Messaging Channel', callback_data: 'messaging_channel' }],
      [{ text: '📲 Add Shortcut to Home Screen', callback_data: 'add_shortcut' }],
    ];

    bot.sendMessage(chatId, 'Select Settings Category:', {
      reply_markup: { inline_keyboard: settingsKeyboard },
    });
  } else if (text === '💰 Balance') {
  const user_code = chatId.toString();
  if (user_code) {
    axios.get(`http://localhost:3000/userinfo?user_code=${user_code}`)
      .then(response => {
        const user = response.data.user;
        const balance = user.balance;

         console.log(`User data retrieved successfully: ${JSON.stringify(user)}`);
        console.log(`User balance: ${balance}`);
        bot.sendMessage(chatId, `Your current balance is IDR ${balance}. Choose an option:`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '➕ Deposit to Account', callback_data: 'deposit_to_account' }],
              [{ text: '➖ Withdraw Funds', callback_data: 'withdraw_funds' }],
              [{ text: 'Transaction History', callback_data: 'transaction_history' }],
            ],
          },
        });
      })
      .catch(error => {
        bot.sendMessage(chatId, 'There was an error retrieving your balance. Please try again later.');
        console.error(error);
      });
  } else {
    // Jika tidak ada user_code yang terkait dengan chatId, beri tahu pengguna untuk menghubungi admin
    bot.sendMessage(chatId, 'Your user information is not found. Please contact support.');
  }
  } else if (text === '🎁 Bonuses') {
    const bonusesKeyboard = [
      [
        { text: '✅ Active', callback_data: 'active' },
        { text: '🆓 Available', callback_data: 'available' },
        { text: '🔔 Subscribe', callback_data: 'subscribe' },
      ],
      [{ text: '📜 Transaction History', callback_data: 'transaction_history' }],
    ];

    bot.sendMessage(chatId, '🎁 No active bonuses. Choose an option:', {
      reply_markup: { inline_keyboard: bonusesKeyboard },
    });
  } else if (text === 'ℹ️ Information') {
    bot.sendMessage(chatId, `
      <b>ℹ️ Information</b>
      Gunakan bot ini untuk bermain game terbaik, melakukan deposit, dan banyak lagi.  
      Hubungi support jika Anda memerlukan bantuan.
    `, { parse_mode: 'HTML' });}
  else if (text === 'Skip') {
    bot.sendMessage(chatId, 'Pilihan Anda telah disimpan. Silakan pilih opsi berikut:', {
      reply_markup: {
        keyboard: [
          // Baris pertama: 2 kolom
          [
            { text: '🎮 Games' },
            { text: '⚽ Sport' }
          ],
          // Baris kedua: 1 kolom
          [
            { text: '📝 Registration' }
          ],
          // Baris ketiga: 1 kolom
          [
            { text: 'ℹ️ Information' }
          ]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
  }
   else if (text === '📝 Registration') {
  bot.sendMessage(chatId, '📝 Enter your promo code below:', {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Skip', callback_data: 'skip' }]
      ]
    }
  });
}





  if (userDepositData[chatId] && !isNaN(text)) {
    const amount = parseFloat(text);
    const { method } = userDepositData[chatId];

    const userCode = chatId.toString();

    try {
      const response = await axios.post('http://localhost:3000/depositweb/methoddeposit', {
        method: 'depositweb',
        agent_code: agentCode,
        agent_token: agentToken,
        user_code: userCode,
        deposit_method: method,
        amount,
      });
      const resData = response.data;
      if (resData.status === 1) {
        bot.sendMessage(chatId, `Deposit of ${amount} via ${method} has been recorded successfully.`);
      } else {
        bot.sendMessage(chatId, `Failed to record deposit: ${resData.msg}`);
      }
    } catch (error) {
      console.error('Error while calling deposit API:', error.message);
      bot.sendMessage(chatId, 'An error occurred while processing your deposit. Please try again later.');
    }
    delete userDepositData[chatId];
  } else if (userDepositData[chatId] && isNaN(text)) {
    bot.sendMessage(chatId, 'Please enter a valid amount (number).');
  }

});



let userDepositData = {};
bot.on('callback_query',async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  console.log(`Received callback data: ${data}`);
  if (data === 'continue') {
    bot.sendMessage(chatId, '🎰 Enter your promo code below:', {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Skip', callback_data: 'skip' }]
        ]
      }
    });} 
  else if (data === 'skip') {
    bot.sendPhoto(chatId, 'https://tsp2.coriara.com/img/bonus.png', {
      caption: '<b>Registration Bonus only</b>',
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎁 Take Bonus', callback_data: 'take_bonus' }],
          [{ text: '⛔ Continue without bonus', callback_data: 'continue_without_bonus' }]
        ]
      }
    }).then((sentMessage) => {
    });} 
  else if (data === 'take_bonus') {
    bot.sendMessage(chatId, `
      To complete the registration in Telegram casino, share your phone number by clicking on the "Share phone number" button. 
      (If this button is not available, click on the ⚃ icon in the lower right corner of the screen).
    `, {
      reply_markup: {
        keyboard: [
          [{ text: "Share phone number", request_contact: true }],
          [{ text: "Skip" , callback_data: 'skip_regis'}]
        ],
        one_time_keyboard: true,
        resize_keyboard: true
      }
    });}
  else if (data === 'continue_without_bonus') {
    bot.sendMessage(chatId, 'Anda memilih untuk melanjutkan tanpa bonus. Semoga beruntung! 🎰');
    bot.sendMessage(chatId, `
      To complete the registration in Telegram casino, share your phone number by clicking on the "Share phone number" button. 
      (If this button is not available, click on the ⚃ icon in the lower right corner of the screen).
    `, {
      reply_markup: {
        keyboard: [
          [{ text: "Share phone number", request_contact: true }],
          [{ text: "Skip" , callback_data: 'skip_regis'}]
        ],
        one_time_keyboard: true,
        resize_keyboard: true
      }
    });}
  else if (data === 'taken_bonus') {
    bot.sendMessage(chatId, 'Bonus sudah diambil. Silakan lanjutkan pendaftaran!');}
  else if (data === 'deposit_to_account') {
    const depositMethodsKeyboard = [
      [{ text: '📱 QRIS', callback_data: 'deposit_qris' }],
      [{ text: '🏦 BANK', callback_data: 'deposit_bank' }],
      [{ text: '💳 EWALLET', callback_data: 'deposit_ewallet' }],
      [{ text: '🪙 CRYPTO', callback_data: 'deposit_crypto' }],
    ];

    bot.sendMessage(chatId, '💳 Choose your deposit method:', {
      reply_markup: { inline_keyboard: depositMethodsKeyboard },
    });}
  else if (data === 'deposit_qris' || data === 'deposit_bank' || data === 'deposit_ewallet' || data === 'deposit_crypto') {
    let method = '';
    let listEndpoint = '';
    let itemType = '';

    if (data === 'deposit_qris') {
        method = 'QRIS';
        bot.sendMessage(chatId, `You selected ${method}. Please enter the amount you want to deposit.`);
        userDepositData[chatId] = { method };
    } else if (data === 'deposit_bank') {
        method = 'BANK';
        listEndpoint = 'http://localhost:3000/listbank';
        itemType = 'banks';
    } else if (data === 'deposit_ewallet') {
        method = 'EWALLET';
        listEndpoint = 'http://localhost:3000/listewallet';
        itemType = 'ewallets';
    } else if (data === 'deposit_crypto') {
        method = 'CRYPTO';
        listEndpoint = 'http://localhost:3000/listcrypto';
        itemType = 'cryptos';
    }
    if (method === 'QRIS') return;
    try {
        const response = await axios.get(listEndpoint);
        const items = response.data[itemType];

        if (items && items.length > 0) {
            const itemKeyboard = items.map((item) => [
                { text: item.name, callback_data: `${method}_${item.code}` },
            ]);
            bot.sendMessage(chatId, `Select your ${method} method:`, {
                reply_markup: { inline_keyboard: itemKeyboard },
            });
            userDepositData[chatId] = { method };
        } else {
            bot.sendMessage(chatId, `No available ${method} options at the moment.`);
        }
    } catch (error) {
        console.error(`Error fetching ${method} list:`, error.message);
        bot.sendMessage(chatId, `An error occurred while fetching ${method} options. Please try again later.`);
    }}
  else if (data.startsWith('BANK_') || data.startsWith('EWALLET_') || data.startsWith('CRYPTO_')) {
      const [method, selectedOption] = data.split('_');
      const userMethod = userDepositData[chatId]?.method;

      if (userMethod && userMethod.toUpperCase() === method) {
          userDepositData[chatId].selectedOption = selectedOption;

          bot.sendMessage(chatId, `${selectedOption}. Please enter the amount you want to deposit.`);
      } else {
          bot.sendMessage(chatId, 'Invalid selection. Please start again.');
      }}
  else if (data === 'transaction_history') {
    const user_code = chatId.toString();
  console.log(`Request for transaction history from user with chatId: ${chatId} and user_code: ${user_code}`);

  if (user_code) {
    // Panggil API untuk mendapatkan daftar transaksi pengguna berdasarkan user_code
    axios.get(`http://localhost:3000/listtransaction?user_code=${user_code}`)
      .then(response => {
        const transactions = response.data[user_code];

        // Log transaksi yang didapatkan
        console.log(`Transactions retrieved: ${JSON.stringify(transactions)}`);

        // Jika transaksi tersedia, tampilkan
        if (transactions && transactions.length > 0) {
          let transactionDetails = 'Here are your recent transactions:\n';
          transactions.forEach((transaction, index) => {
            transactionDetails += `
              ${index + 1}. *Transaction ID:* ${transaction.user_code}
              *Amount:* ${transaction.amount} IDR
              *Date:* ${transaction.date}
              *Status:* ${transaction.status}\n
            `;
          });
          bot.sendMessage(chatId, transactionDetails, { parse_mode: 'Markdown' });
        } else {
          bot.sendMessage(chatId, 'No transaction history available.');
        }
      })
      .catch(error => {
        console.error(`Error retrieving transaction history: ${error}`);
        bot.sendMessage(chatId, 'There was an error retrieving your transaction history. Please try again later.');
      });
  } else {
    console.log(`No user code found for chatId: ${chatId}`);
  }
  }
  else if (data === 'providers') {
  try {
    // Panggil API untuk mendapatkan daftar provider
    const response = await axios.get('http://localhost:3000/listprovider');

    if (response.data.status === 1) {
      const providers = response.data.providers;

      // Buat keyboard dengan 1 baris, 2 kolom
      const providerButtons = [];
      for (let i = 0; i < providers.length; i += 2) {
        const row = [];
        row.push({ text: providers[i].name, callback_data: `provider_${providers[i].id}` });
        if (providers[i + 1]) {
          row.push({ text: providers[i + 1].name, callback_data: `provider_${providers[i + 1].id}` });
        }
        providerButtons.push(row);
      }

      // Kirim daftar provider ke pengguna
      bot.sendMessage(chatId, 'Select a Provider:', {
        reply_markup: { inline_keyboard: providerButtons },
      });
    } else {
      bot.sendMessage(chatId, 'No providers found.');
    }
  } catch (error) {
    console.error('Error fetching providers:', error.message);
    bot.sendMessage(chatId, 'Failed to fetch providers. Please try again later.');
  }}
  else if (data === 'allgames') {
  try {
    // Panggil API untuk mendapatkan daftar provider
    const response = await axios.get('http://localhost:3000/listprovider');

    if (response.data.status === 1) {
      const providers = response.data.providers;

      // Buat keyboard dengan 1 baris, 2 kolom
      const providerButtons = [];
      for (let i = 0; i < providers.length; i += 2) {
        const row = [];
        row.push({ text: providers[i].name, callback_data: `provider_${providers[i].id}` });
        if (providers[i + 1]) {
          row.push({ text: providers[i + 1].name, callback_data: `provider_${providers[i + 1].id}` });
        }
        providerButtons.push(row);
      }

      // Kirim daftar provider ke pengguna
      bot.sendMessage(chatId, 'Select All Games:', {
        reply_markup: { inline_keyboard: providerButtons },
      });
    } else {
      bot.sendMessage(chatId, 'No providers found.');
    }
  } catch (error) {
    console.error('Error fetching providers:', error.message);
    bot.sendMessage(chatId, 'Failed to fetch providers. Please try again later.');
  }}
  else if (data === 'popular') {
  try {
    // Panggil API untuk mendapatkan daftar provider
    const response = await axios.get('http://localhost:3000/listprovider');

    if (response.data.status === 1) {
      const providers = response.data.providers;

      // Buat keyboard dengan 1 baris, 2 kolom
      const providerButtons = [];
      for (let i = 0; i < providers.length; i += 2) {
        const row = [];
        row.push({ text: providers[i].name, callback_data: `provider_${providers[i].id}` });
        if (providers[i + 1]) {
          row.push({ text: providers[i + 1].name, callback_data: `provider_${providers[i + 1].id}` });
        }
        providerButtons.push(row);
      }

      // Kirim daftar provider ke pengguna
      bot.sendMessage(chatId, 'Select Popular Games:', {
        reply_markup: { inline_keyboard: providerButtons },
      });
    } else {
      bot.sendMessage(chatId, 'No providers found.');
    }
  } catch (error) {
    console.error('Error fetching providers:', error.message);
    bot.sendMessage(chatId, 'Failed to fetch providers. Please try again later.');
  }}
  else if (data === 'best') {
  try {
    // Panggil API untuk mendapatkan daftar provider
    const response = await axios.get('http://localhost:3000/listprovider');

    if (response.data.status === 1) {
      const providers = response.data.providers;

      // Buat keyboard dengan 1 baris, 2 kolom
      const providerButtons = [];
      for (let i = 0; i < providers.length; i += 2) {
        const row = [];
        row.push({ text: providers[i].name, callback_data: `provider_${providers[i].id}` });
        if (providers[i + 1]) {
          row.push({ text: providers[i + 1].name, callback_data: `provider_${providers[i + 1].id}` });
        }
        providerButtons.push(row);
      }

      // Kirim daftar provider ke pengguna
      bot.sendMessage(chatId, 'Select Best Games:', {
        reply_markup: { inline_keyboard: providerButtons },
      });
    } else {
      bot.sendMessage(chatId, 'No providers found.');
    }
  } catch (error) {
    console.error('Error fetching providers:', error.message);
    bot.sendMessage(chatId, 'Failed to fetch providers. Please try again later.');
  }}
  else if (data === 'hot') {
  try {
    // Panggil API untuk mendapatkan daftar provider
    const response = await axios.get('http://localhost:3000/listprovider');

    if (response.data.status === 1) {
      const providers = response.data.providers;

      // Buat keyboard dengan 1 baris, 2 kolom
      const providerButtons = [];
      for (let i = 0; i < providers.length; i += 2) {
        const row = [];
        row.push({ text: providers[i].name, callback_data: `provider_${providers[i].id}` });
        if (providers[i + 1]) {
          row.push({ text: providers[i + 1].name, callback_data: `provider_${providers[i + 1].id}` });
        }
        providerButtons.push(row);
      }

      // Kirim daftar provider ke pengguna
      bot.sendMessage(chatId, 'Select a Provider:', {
        reply_markup: { inline_keyboard: providerButtons },
      });
    } else {
      bot.sendMessage(chatId, 'No providers found.');
    }
  } catch (error) {
    console.error('Error fetching providers:', error.message);
    bot.sendMessage(chatId, 'Failed to fetch providers. Please try again later.');
  }}

  else if (data === 'newgames') {
  try {
    // Panggil API untuk mendapatkan daftar provider
    const response = await axios.get('http://localhost:3000/listprovider');

    if (response.data.status === 1) {
      const providers = response.data.providers;

      // Buat keyboard dengan 1 baris, 2 kolom
      const providerButtons = [];
      for (let i = 0; i < providers.length; i += 2) {
        const row = [];
        row.push({ text: providers[i].name, callback_data: `provider_${providers[i].id}` });
        if (providers[i + 1]) {
          row.push({ text: providers[i + 1].name, callback_data: `provider_${providers[i + 1].id}` });
        }
        providerButtons.push(row);
      }

      // Kirim daftar provider ke pengguna
      bot.sendMessage(chatId, 'Select a Provider:', {
        reply_markup: { inline_keyboard: providerButtons },
      });
    } else {
      bot.sendMessage(chatId, 'No providers found.');
    }
  } catch (error) {
    console.error('Error fetching providers:', error.message);
    bot.sendMessage(chatId, 'Failed to fetch providers. Please try again later.');
  }}
  else if (data.startsWith('provider_')) {
  const providerId = data.split('_')[1]; // Ambil ID provider dari callback data

  try {
    // Panggil API untuk mendapatkan daftar game berdasarkan ID provider
    const response = await axios.get(`http://localhost:3000/listgame/${providerId}`);

    if (response.data.status === 1) {
      const games = response.data.games;

      // Buat inline keyboard untuk daftar game
      const gameButtons = [];
      for (let i = 0; i < games.length; i += 2) {
        const row = [];
        row.push({
          text: games[i].Name, 
          callback_data: `game_${games[i].GameCode}` // Menggunakan GameCode sebagai callback_data
        });
        if (games[i + 1]) {
          row.push({
            text: games[i + 1].Name, 
            callback_data: `game_${games[i + 1].GameCode}` // Menggunakan GameCode sebagai callback_data
          });
        }
        gameButtons.push(row);
      }

      // Kirim daftar game ke pengguna dalam format inline keyboard
      bot.sendMessage(chatId, 'Select a Game:', {
        reply_markup: { inline_keyboard: gameButtons },
      });
    } else {
      bot.sendMessage(chatId, 'No games found for this provider.');
    }
  } catch (error) {
    console.error('Error fetching games:', error.message);
    bot.sendMessage(chatId, 'Failed to fetch games. Please try again later.');
  }}
  else if (data.startsWith('game_')) {
    const gameCode = data.split('_')[1]; // Ambil GameCode dari callback data

    try {
      // Panggil API untuk mendapatkan detail game berdasarkan GameCode
      const response = await axios.get(`http://localhost:3000/gamedetails/${gameCode}`);

      if (response.data.status === 1) {
        const game = response.data.game;

        // Buat inline keyboard dengan 1 baris 2 kolom untuk Demo Link dan Real Link
       const gameButtons = [
    [
      {
        text: 'Demo Link',
        web_app: { url: game.LinkDemo } // Menggunakan web_app untuk tombol Demo Link
      },
      {
        text: 'Play Now',
        web_app: { url: game.LinkReal } // Menggunakan web_app untuk tombol Play Now
      }
    ]
  ];

        // Kirim gambar dan inline keyboard
        bot.sendPhoto(chatId, game.GameImage, {
          reply_markup: {
            inline_keyboard: gameButtons
          }
        });
      } else {
        bot.sendMessage(chatId, 'No details found for this game.');
      }
    } catch (error) {
      console.error('Error fetching game details:', error.message);
      bot.sendMessage(chatId, 'Failed to fetch game details. Please try again later.');
    }

    // Hentikan tampilan loading setelah proses selesai
    bot.answerCallbackQuery(callbackQuery.id);}
  else if (data === 'contacts') {
       const userCode = chatId.toString();
    axios.get(`http://localhost:3000/userinfo?user_code=${userCode}`)
      .then(response => {
        const user = response.data.user;
        bot.sendMessage(chatId, `
          ${user.user_code}
        `, { parse_mode: 'Markdown' });
      })
      .catch(error => {
        bot.sendMessage(chatId, 'There was an error retrieving your personal information. Please try again later.');
        console.error(error);
      });
    bot.answerCallbackQuery(callbackQuery.id);}
  else if (data === 'personal_info') { 
    const userCode = chatId.toString();
    axios.get(`http://localhost:3000/userinfo?user_code=${userCode}`)
      .then(response => {
        const user = response.data.user;
        bot.sendMessage(chatId, `
          *Personal Info for ${user.user_code}*:
          - *User Code:* ${user.user_code}
          - *Balance:* ${user.balance}
          - *Address:* ${user.alamat || 'Not set'}
          - *Email:* ${user.email || 'Not set'}
          - *Bank:* ${user.bank || 'Not set'}
          - *Rekening:* ${user.rekening || 'Not set'}
        `, { parse_mode: 'Markdown' });
      })
      .catch(error => {
        bot.sendMessage(chatId, 'There was an error retrieving your personal information. Please try again later.');
        console.error(error);
      });
    bot.answerCallbackQuery(callbackQuery.id);
  } 
});

bot.on('contact', (msg) => {
  const chatId = msg.chat.id;
  const phoneNumber = msg.contact.phone_number;
  bot.sendMessage(chatId, `Nomor telepon Anda: ${phoneNumber}. Terima kasih telah membagikannya!`);
  registerUser(phoneNumber, chatId);
});
console.log('Bot is running...'); 