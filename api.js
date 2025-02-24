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
    console.log(`Received password: ${password}`);

    delete userLoginData[chatId];
    
    return await checkUserExist(chatId, password);
  });
  
  return {
    status: 0
  };
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
module.exports = { getSiteSetting, getAccountListing, userLogin, checkUserExist, showMenu };
