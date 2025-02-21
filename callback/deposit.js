const axios = require("axios");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const { apiBaseUrl, API_SECRET } = require("../config");

let userDepositData = {};

/**
 * Handle deposit method selection
 */
const handleDepositSelection = async (bot, chatId, data) => {
  let method = "";
  let payment_category_id = null;

  if (data === "deposit_qris") {
    method = "QRIS";
    payment_category_id = 4;
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

  if (method === "QRIS") {
    bot.sendMessage(chatId, `You selected ${method}. Please enter the amount you want to deposit.`);
    userDepositData[chatId] = { method, payment_category_id };
    return;
  }

  bot.sendMessage(chatId, 
    `Berikut Contoh Deposit untuk ${method}:
    
    Bank: <code>BCA</code>
    Nama: <code>PT. PWCPLAY DEV</code>
    Account: <code>1234567890</code>
    `, 
    { parse_mode: "HTML" }
  );
};

/**
 * Process deposit amount input
 */
const processDepositAmount = async (bot, chatId, text, checkUserExist) => {
  if (!userDepositData[chatId]) return;

  if (isNaN(text)) {
    bot.sendMessage(chatId, "Please enter a valid amount (number).");
    return;
  }

  const amount = parseFloat(text);
  const { method, payment_category_id } = userDepositData[chatId];
  const user = await checkUserExist(chatId);

  try {
    const response = await axios.post(`${apiBaseUrl}/transaksi`, {
      user_id: user.id,
      accName: user.accName,
      accNumber: user.accNumber,
      company_code: user.company_code,
      payment_category_id,
      amount,
      type: 1,
      platform: "telegram",
    }, {
      headers: { "x-endpoint-secret": API_SECRET },
    });

    const resData = response.data;
    if (resData.status === 1) {
      const filePath = path.join(__dirname, `../temp/${chatId}.png`);
      if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }

      await QRCode.toFile(filePath, resData.qris_data, {
        type: "png",
        errorCorrectionLevel: "H",
      });

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
    } else {
      bot.sendMessage(chatId, `Deposit failed: ${resData.msg}`);
    }
  } catch (error) {
    console.error("Error while calling deposit API:", error.message);
    if (error.response && error.response.data && error.response.data.status === 0) {
      bot.sendMessage(chatId, `Deposit failed: ${error.response.data.msg}`);
    } else {
      bot.sendMessage(chatId, "An error occurred while processing your deposit. Please try again later.");
    }
  }

  delete userDepositData[chatId];
};

module.exports = {
  handleDepositSelection,
  processDepositAmount,
};
