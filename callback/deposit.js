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
 * Step 1: Handle deposit method selection
 */
const handleDepositSelection = async (bot, chatId, data) => {
  const depositInfo = depositMethods[data];

  if (depositInfo) {
    // Store selected deposit method in session data
    userDepositData[chatId] = { ...depositInfo };
    bot.sendMessage(
      chatId,
      `You selected ${depositInfo.method}. Please enter the amount you want to deposit.`
    );
  } else {
    bot.sendMessage(
      chatId,
      "Invalid deposit method selected. Please try again."
    );
  }
};

/**
 * Step 2: Handle deposit amount input.
 * After user enters an amount, we store it and move to the bonus selection.
 */
const handleDepositAmount = async (bot, chatId, text, checkUserExist) => {
  if (!userDepositData[chatId]) return; // No deposit method was selected

  if (isNaN(text)) {
    bot.sendMessage(chatId, "Please enter a valid amount (number).");
    return;
  }

  const amount = parseFloat(text);
  userDepositData[chatId].amount = amount;

  // Now fetch and show bonus options
  await showBonusOptions(bot, chatId);
};

/**
 * Fetch bonus list from API and present them to the user
 */
const showBonusOptions = async (bot, chatId) => {
  try {
    // Example endpoint: adjust as needed
    const response = await axios.get(`${apiBaseUrl}/bonuses`, {
      headers: { "x-endpoint-secret": API_SECRET },
    });
    
    // 'response.data' is an object like: { status, data: [...], msg }
    const bonuses = response.data;      
    // Extract the array:
    const bonusArray = bonuses.data;  
    
    // Check if we indeed have an array
    if (!bonusArray || !Array.isArray(bonusArray) || bonusArray.length === 0) {
      bot.sendMessage(chatId, "No bonuses available at the moment. Proceeding without bonus...");
      return;
    }
    
    // Now map over the real array 'bonusArray'
    const inlineKeyboard = bonusArray.map((bonus) => [
      {
        // Adjust the property name to match your data. 
        // If it's bonus.title or bonus.bonus_name, etc.
        text: bonus.title,  
        callback_data: `bonus_selected-${bonus.id}`,
      },
    ]);
    
    // Add a "Skip Bonus" option
    inlineKeyboard.push([
      { text: "Skip Bonus", callback_data: `skip_bonus` },
    ]);
    
    bot.sendMessage(chatId, "Please select a bonus or skip:", {
      reply_markup: {
        inline_keyboard: inlineKeyboard,
      },
    });
    
  } catch (error) {
    console.error("Error fetching bonus:", error.message);
    bot.sendMessage(
      chatId,
      "Failed to retrieve bonus. Proceeding without bonus..."
    );
    // If there's an error, proceed without bonus
    proceedAfterBonusSelection(bot, chatId, null);
  }
};

/**
 * Step 3: Handle user clicking bonus selection callback
 */
const handleBonusSelectionCallback = async (
  bot,
  chatId,
  callbackData,
  checkUserExist
) => {
  if (!userDepositData[chatId]) {
    bot.sendMessage(chatId, "No deposit information found. Please start over.");
    return;
  }

  let selectedBonusId = null;
  if (callbackData === "skip_bonus") {
    selectedBonusId = null;
  } else if (callbackData.startsWith("bonus_selected-")) {
    selectedBonusId = callbackData.split("-")[1];
  } else {
    bot.sendMessage(chatId, "Invalid bonus selection. Please try again.");
    return;
  }

  // Store the selected bonus
  userDepositData[chatId].bonusId = selectedBonusId;

  // Proceed with the next step in deposit flow
  proceedAfterBonusSelection(bot, chatId, checkUserExist);
};

/**
 * Logic after bonus is chosen: if method is QRIS, go QRIS flow;
 * otherwise, if Bank/Ewallet/Pulsa, get banks, etc.
 */
const proceedAfterBonusSelection = async (bot, chatId, checkUserExist) => {
  const { method } = userDepositData[chatId];
  if (!method) {
    bot.sendMessage(chatId, "No deposit method found. Please start over.");
    return;
  }

  if (method === "QRIS") {
    // Directly process deposit with QRIS
    await processDepositQRISAmount(
      bot,
      chatId,
      userDepositData[chatId].amount,
      checkUserExist
    );
  } else if (method === "BANK" || method === "EWALLET" || method === "PULSA") {
    // Ask user to pick bank from the list
    await promptBankSelection(bot, chatId);
  }
};

/**
 * Step 4a: For Bank/Ewallet/Pulsa, fetch banks and show selection
 */
const promptBankSelection = async (bot, chatId) => {
  const { payment_category_id, amount } = userDepositData[chatId];

  try {
    const response = await axios.get(`${apiBaseUrl}/getBanks`, {
      headers: { "x-endpoint-secret": API_SECRET },
    });

    let banks = response.data;
    // Make sure to handle the structure of your API's response
    if (banks && typeof banks === "object" && !Array.isArray(banks)) {
      banks = banks.banks || banks.data || banks.list || Object.values(banks);
    }

    if (!Array.isArray(banks) || banks.length === 0) {
      bot.sendMessage(
        chatId,
        "No available bank accounts for deposit at the moment."
      );
      return;
    }

    // Filter banks based on selected payment_category_id
    const filteredBanks = banks.filter(
      (bank) => bank.payment_category_id === payment_category_id
    );

    if (filteredBanks.length === 0) {
      bot.sendMessage(
        chatId,
        "No available payment methods for your selection."
      );
      return;
    }

    // Generate inline keyboard buttons for each option
    const bankOptions = {
      reply_markup: {
        inline_keyboard: filteredBanks.map((bank) => [
          {
            text: `${bank.nama_bank} - ${bank.nama_penerima}`,
            callback_data: `bank_selected-${bank.no_rek}-${bank.nama_bank}-${bank.nama_penerima}`,
          },
        ]),
      },
    };

    bot.sendMessage(
      chatId,
      `You have entered an amount of: ${amount}\nPlease choose your preferred bank/payment:`,
      bankOptions
    );
  } catch (error) {
    console.error("Error fetching bank details:", error.message);
    bot.sendMessage(
      chatId,
      "Failed to retrieve payment details. Please try again later."
    );
  }
};

/**
 * Step 4b: For QRIS, process deposit immediately
 */
const processDepositQRISAmount = async (bot, chatId, text, checkUserExist) => {
  if (!userDepositData[chatId]) return;

  const amount = parseFloat(text);
  const { payment_category_id, bonusId } = userDepositData[chatId];
  const user = await checkUserExist(chatId);

  if (!user) {
    bot.sendMessage(chatId, "User not found. Please register or log in first.");
    return;
  }

  try {
    // Submit deposit transaction with `bonusId`
    const response = await axios.post(
      `${apiBaseUrl}/transaksi`,
      {
        user_id: user.id,
        accName: user.accName,
        accNumber: user.accNumber,
        company_code: user.company_code,
        payment_category_id,
        amount,
        type: 1,
        platform: "telegram",
        bonus_id: bonusId, // <--- Pass the bonusId here
      },
      {
        headers: { "x-endpoint-secret": API_SECRET },
      }
    );

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
        caption: `Deposit of ${amount} via QRIS has been recorded successfully.\nQRIS only active for 5 minutes.`,
        parse_mode: "HTML",
      });

      // Clean up the QR image after sending
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
      bot.sendMessage(
        chatId,
        "An error occurred while processing your deposit. Please try again later."
      );
    }
  }

  // Clean up data after deposit process
  delete userDepositData[chatId];
};

/**
 * Step 5: Handle the bank selection callback
 */
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
  const { payment_category_id, bonusId } = userDepositData[chatId];
  const user = await checkUserExist(chatId);

  if (!user) {
    bot.sendMessage(
      chatId,
      "❌ User not found. Please register or log in first."
    );
    return;
  }

  try {
    // Include bonus_id in the transaction payload
    const requestData = {
      user_id: user.id,
      accName: user.accName,
      accNumber: user.accNumber,
      company_code: user.company_code,
      payment_category_id,
      amount,
      type: 1,
      notes: "telegram",
      bankMember: `${user.bank}|${user.accNumber}`,
      bank_penerima: bankName,
      nama_penerima: recipientName,
      nomer_penerima: accountNumber,
      bonus_id: bonusId, // <--- Pass the bonusId here
    };

    console.log("📡 Sending Deposit Request:", requestData);

    const response = await axios.post(`${apiBaseUrl}/transaksi`, requestData, {
      headers: { "x-endpoint-secret": API_SECRET },
      validateStatus: function (status) {
        // Accept 200, 201, 400
        return [200, 201, 400].includes(status);
      },
    });

    const resData = response.data;
    console.log("💡 API Response:", resData);

    if (resData.status === 1) {
      bot.sendMessage(
        chatId,
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
      bot.sendMessage(
        chatId,
        `❌ Deposit failed: ${error.response.data.msg || "An unknown error occurred."}`
      );
    } else {
      bot.sendMessage(
        chatId,
        "❌ An error occurred while processing your deposit. Please try again later."
      );
    }
  }

  delete userDepositData[chatId];
};

module.exports = {
  handleDepositSelection,
  handleDepositAmount,
  handleBonusSelectionCallback,
  processBankDeposit,
  // Expose QRIS as well if needed externally
  processDepositQRISAmount,
};
