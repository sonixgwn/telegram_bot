const axios = require("axios");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const { apiBaseUrl, API_SECRET } = require("../config");

let userDepositData = {};

const depositMethods = {
  deposit_qris: { method: "QRIS", payment_category_id: 4 },
  deposit_bank: { method: "BANK", payment_category_id: 1 },
  deposit_ewallet: { method: "EWALLET", payment_category_id: 2 },
  deposit_pulsa: { method: "PULSA", payment_category_id: 3 },
};

/**
 * Handle deposit method selection
 */
const handleDepositSelection = async (bot, chatId, data) => {
  const depositInfo = depositMethods[data];

  if (depositInfo) {
    bot.sendMessage(chatId, `You selected ${depositInfo.method}. Please enter the amount you want to deposit.`);
    userDepositData[chatId] = depositInfo;
  } else {
    bot.sendMessage(chatId, "Invalid deposit method selected. Please try again.");
  }
};
const handleDepositAmount = async (bot, chatId, text, checkUserExist) => {
  if (!userDepositData[chatId]) return; // Ignore if no deposit method was selected

  if (isNaN(text)) {
    bot.sendMessage(chatId, "Please enter a valid amount (number).");
    return;
  }

  const amount = parseFloat(text);
  userDepositData[chatId].amount = amount;
  const { method, payment_category_id } = userDepositData[chatId];

  if (method === "QRIS") {
    await processDepositQRISAmount(bot, chatId, text, checkUserExist); // Directly process QRIS deposit
  } else if (method === "BANK") {
    try {
      const response = await axios.get(`${apiBaseUrl}/getBanks`, {
        headers: { "x-endpoint-secret": API_SECRET },
      });

      let banks = response.data;
      if (banks && typeof banks === "object" && !Array.isArray(banks)) {
        banks = banks.banks || banks.data || banks.list || Object.values(banks);
      }

      if (!Array.isArray(banks) || banks.length === 0) {
        bot.sendMessage(chatId, "No available bank accounts for deposit at the moment.");
        return;
      }

      // Generate inline keyboard buttons for each bank
      const bankOptions = {
        reply_markup: {
          inline_keyboard: banks
            .filter(bank => bank.payment_category_id === 1) // ✅ Filter banks
            .map(bank => [
              {
                text: `${bank.nama_bank} - ${bank.nama_penerima}`,
                callback_data: `bank_selected-${bank.no_rek}-${bank.nama_bank}-${bank.nama_penerima}`,
              }
            ]),
        },
      };   

      bot.sendMessage(chatId, `Anda memasukkan jumlah: ${amount}\nSilakan pilih bank untuk deposit:`, bankOptions);
    } catch (error) {
      console.error("Error fetching bank details:", error.message);
      bot.sendMessage(chatId, "Failed to retrieve bank details. Please try again later.");
    }
  }
};

/**
 * Process deposit amount input
 */
const processDepositQRISAmount = async (bot, chatId, text, checkUserExist) => {
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
const processBankDeposit = async (bot, chatId, bankData, checkUserExist) => {
  if (!userDepositData[chatId]) return;

  const bankDetails = bankData.split("-");
  if (bankDetails.length < 3) {
    bot.sendMessage(chatId, "❌ Invalid bank selection. Please try again.");
    return;
  }

  const accountNumber = bankDetails[0];
  const bankName = bankDetails[1];
  const recipientName = bankDetails.slice(2).join("-").trim();

  const amount = userDepositData[chatId].amount;
  const { payment_category_id } = userDepositData[chatId];
  const user = await checkUserExist(chatId);

  if (!user) {
    bot.sendMessage(chatId, "❌ User not found. Please register or log in first.");
    return;
  }

  try {
    const requestData = {
      user_id: user.id,
      accName: user.accName,
      accNumber: user.accNumber,
      company_code: user.company_code,
      payment_category_id,
      amount,
      type: 1,
      platform: "telegram",
      bankMember: `${user.bank}|${user.accNumber}`,
      bank_penerima: bankName,
      nama_penerima: recipientName,
      nomer_penerima: accountNumber,
    };

    console.log("📡 Sending Deposit Request:", requestData);

    // ❗ Handle API response properly
    const response = await axios.post(`${apiBaseUrl}/transaksi`, requestData, {
      headers: { "x-endpoint-secret": API_SECRET },
      validateStatus: function (status) {
        return status === 200 || status === 400; // Accept 400 responses too
      },
    });

    const resData = response.data;
    console.log("💡 API Response:", resData);

    if (resData.status === 1) {
      bot.sendMessage(chatId, 
        `✅ Deposit of <b>IDR ${amount}</b> has been successfully recorded.\n\n` +
        `🏦 <b>Bank:</b> ${bankName}\n` +
        `👤 <b>Recipient:</b> ${recipientName}\n` +
        `🔢 <b>Account Number:</b> ${accountNumber}\n\n` +
        `👤 <b>Sender Name:</b> ${user.accName}\n` +
        `🔢 <b>Sender Account Number:</b> ${user.accNumber}\n\n` +
        `📌 Please proceed with the transfer.`,
        { parse_mode: "HTML" }
      );
    } else {
      bot.sendMessage(chatId, `❌ Deposit failed: ${resData.msg}`);
    }
  } catch (error) {
    console.error("❌ Error while calling deposit API:", error.message);

    if (error.response && error.response.data) {
      bot.sendMessage(chatId, `❌ Deposit failed: ${error.response.data.msg || "An unknown error occurred."}`);
    } else {
      bot.sendMessage(chatId, "❌ An error occurred while processing your deposit. Please try again later.");
    }
  }

  delete userDepositData[chatId];
};

module.exports = {
  handleDepositSelection,
  processDepositQRISAmount,
  handleDepositAmount,
  processBankDeposit,
};
