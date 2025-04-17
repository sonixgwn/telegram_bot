const axios = require("axios");
const { telegramToken, apiBaseUrl, telegramApiUrl, master_code, company_code, API_SECRET } = require("./config");
const bot = require("./botInstance"); // Import shared bot instance


const getSiteSetting = async (chat_id) => {
  try {
    const response = await axios.post(telegramApiUrl, {
      method: "settings",
      chat_id,
      company_code,
    }, {
      headers: {
        "x-endpoint-secret": API_SECRET,
      },
    });

    if (response.data.status === 1) {
      return response.data.data; // ✅ Return the settings instead of modifying a variable
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching site settings:", error.message);
    return null;
  }
};

const getAccountListing = async () => {
  try {
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
  } catch (error) {
    console.error("Error fetching account listing:", error.message);
    return null;
  }
};

const userLogin = async (chatId, data) => {
  let userLoginData = {};

  const r1 = await bot.sendMessage(chatId, data.msg, {
    reply_markup: {
        force_reply: true,
    },
  });
  
  userLoginData[chatId] = r1.message_id;

  bot.onReplyToMessage(chatId, r1.message_id, async (msg1) => {
    const password = msg1.text;

    delete userLoginData[chatId];
    
    return await checkUserExist(chatId, password);
  });
  
  return {
    login: true
  };
};

const getMenuKeyboard = (user) => {
  let keyboard;
  if (user) {
    keyboard = [
      [{ text: "🎮 Permainan" }, { text: "🎁 Bonus & Promosi" }],
      [{ text: "➕ Deposit" }, { text: "🏦 Informasi Saldo" }],
      [{ text: "👤 Profil" }, { text: "ℹ️ Bantuan" }],
    ];
  } else {
    keyboard = [
      [{ text: "🔄 Hubungkan Akun" }],
      [{ text: "📝 Halaman Registrasi" }, { text: "🎮 Permainan" }],
    ];
  }
  return keyboard;
}

const getDepositOptions = (chatId) => {
  const depositMethodsKeyboard = [
    [{ text: "📱 QRIS", callback_data: "deposit_qris" }],
    [{ text: "🏦 BANK", callback_data: "deposit_bank" }],
    [{ text: "💳 E-WALLET", callback_data: "deposit_ewallet" }],
    [{ text: "📶 PULSA", callback_data: "deposit_pulsa" }],
  ];

  bot.sendMessage(chatId, "💳 Silahkan pilih metode pembayaran Deposit Anda:", {
    reply_markup: { inline_keyboard: depositMethodsKeyboard },
  });
}

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
    const keyboard = getMenuKeyboard(data.data);
    bot.sendMessage(chatId, `Login Berhasil, Selamat Datang Kembali ${data.data.username}\n\nSaldo Anda saat ini: ${data.data.saldo}`, {
      reply_markup: {
        keyboard,
        resize_keyboard: true,
      },
    });
  }

  if (data.status === 1 && !data.data) return null;

  // Status 1 = User exists
  // Status 0 = new User
  return {...data.data, status: 1};
};

module.exports = { getSiteSetting, getAccountListing, userLogin, checkUserExist, getMenuKeyboard, getDepositOptions };
