const axios = require("axios");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const { apiBaseUrl, API_SECRET } = require("../config");
const FormData = require("form-data");

// In-memory storage for deposit flows per chatId
let userDepositData = {};

// Define your deposit methods along with their payment_category_ids
const depositMethods = {
  deposit_qris: { method: "QRIS", payment_category_id: 4 },
  deposit_bank: { method: "BANK", payment_category_id: 1 },
  deposit_ewallet: { method: "EWALLET", payment_category_id: 2 },
  deposit_pulsa: { method: "PULSA", payment_category_id: 3 },
};

/**
 * Step 1: Handle deposit method selection
 */
async function handleProofOfPayment(bot, msg, checkUserExist) {
  const chatId = msg.chat.id;
  const userData = userDepositData[chatId];

  // If there's no deposit info or no transaction ID, user isn't in "awaiting proof" state
  if (!userData || !userData.transactionId) {
    return; // We either ignore or inform the user
  }

  const user = await checkUserExist(chatId);
  if (!user) {
    bot.sendMessage(chatId, "User not recognized, please /start or /login first.");
    return;
  }
  if (user && user.login) return;

  // The photo array is sorted by size, so let's grab the last (largest) photo
  const photos = msg.photo;
  const largestPhoto = photos[photos.length - 1];
  const fileId = largestPhoto.file_id;

  try {
    // 1) Retrieve the file path from Telegram
    const file = await bot.getFile(fileId); // getFile returns { file_id, file_path, ... }

    // 2) Telegram's file download URL => "https://api.telegram.org/file/bot<TOKEN>/<file_path>"
    //    But you can let the library handle it, or download via an HTTP request yourself.
    //    Some libraries (like node-telegram-bot-api) let you do: bot.downloadFile(fileId, downloadPath).

    const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;

    // 3) Download the image from Telegram
    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const fileBuffer = response.data;

    // 4) Now build FormData for sending to your backend.
    const form = new FormData();
    form.append("transaction_id", userData.transactionId);
    form.append("user_id", user.id);
    // Suppose your backend expects the field name to be "proof_image"
    form.append("proof_image", fileBuffer, {
      filename: `proof_${Date.now()}.jpg`, 
      contentType: "image/jpeg",
    });

    // 5) Post to your backend
    const proofResponse = await axios.post(`${apiBaseUrl}/uploadProof`, form, {
      headers: {
        "x-endpoint-secret": API_SECRET,
        ...form.getHeaders(), // required for multipart/form-data boundary
      },
    });

    const proofData = proofResponse.data;
    if (proofData.status === 1) {
      bot.sendMessage(
        chatId,
        "✅ Proof of deposit has been uploaded successfully!\nThank you."
      );
    } else {
      bot.sendMessage(chatId, `❌ Failed to upload proof: ${proofData.msg}`);
    }
  } catch (error) {
    console.error("Error uploading proof:", error.message);
    bot.sendMessage(
      chatId,
      "❌ There was an error uploading the proof. Please try again later."
    );
  } finally {
    // Clear the deposit flow so we don't keep waiting for more proofs
    delete userDepositData[chatId];
  }
}
const handleDepositSelection = async (bot, chatId, data) => {
  const depositInfo = depositMethods[data];

  if (depositInfo) {
    userDepositData[chatId] = {
      method: depositInfo.method,
      payment_category_id: String(depositInfo.payment_category_id),
      currentStep: "WAITING_FOR_AMOUNT", // <-- new line
    };    
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
  if (userDepositData[chatId].currentStep !== "WAITING_FOR_AMOUNT") {
    // Not expecting an amount input now, so ignore or return
    return;
  }
  if (isNaN(text)) {
    bot.sendMessage(chatId, "Please enter a valid amount (number).");
    return;
  }
  const amount = parseFloat(text);
  userDepositData[chatId].amount = amount;
  userDepositData[chatId].currentStep = "WAITING_FOR_BONUS_SELECTION";

  await showBonusOptions(bot, chatId);
};

/**
 * Fetch and present relevant bonuses for the selected payment_category_id
 */
const showBonusOptions = async (bot, chatId) => {
  try {
    // 1) Get the user's chosen payment_category_id from session
    const { payment_category_id } = userDepositData[chatId];

    // 2) Fetch the /bonusesPayment mapping
    const responseBonusPayment = await axios.get(`${apiBaseUrl}/bonusesPayment`, {
      headers: { "x-endpoint-secret": API_SECRET },
    });
    const bonusPaymentData = responseBonusPayment.data?.data || [];
    
    // 3) Filter only those that match the user’s chosen payment_category_id
    const matchedBonusPayments = bonusPaymentData.filter(
      (bp) => String(bp.payment_category_id) === String(payment_category_id)
    );

    // If no matched bonusPayment, skip bonus entirely
    if (!matchedBonusPayments || matchedBonusPayments.length === 0) {
      bot.sendMessage(
        chatId,
        "No relevant bonuses available for your selected payment method. Proceeding without bonus..."
      );
      return proceedAfterBonusSelection(bot, chatId);
    }

    // 4) Fetch the main /bonuses list
    const responseBonuses = await axios.get(`${apiBaseUrl}/bonuses`, {
      headers: { "x-endpoint-secret": API_SECRET },
    });
    const bonusesData = responseBonuses.data?.data || [];

    // 5) Filter out only the bonus objects whose ID is in the matched bonusPayment set
    //    (bonusPayment.bonus_id should match bonus.id)
    const validBonusIds = matchedBonusPayments.map((bp) => String(bp.bonus_id));
    const relevantBonuses = bonusesData.filter((bonus) =>
      validBonusIds.includes(String(bonus.id))
    );

    // If still no matched bonus, skip
    if (!relevantBonuses || relevantBonuses.length === 0) {
      bot.sendMessage(
        chatId,
        "No relevant bonuses found for your selection. Proceeding without bonus..."
      );
      return proceedAfterBonusSelection(bot, chatId);
    }

    // 6) Build the inline keyboard for the matched bonuses
    const inlineKeyboard = relevantBonuses.map((bonus) => [
      {
        text: bonus.title, // Adjust if your bonus object uses a different property for the title
        callback_data: `bonus_selected-${bonus.id}`,
      },
    ]);

    // 7) Add a "Skip Bonus" option
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
    proceedAfterBonusSelection(bot, chatId);
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

  userDepositData[chatId].bonusId = selectedBonusId ? String(selectedBonusId) : null;
  proceedAfterBonusSelection(bot, chatId, checkUserExist);
};

/**
 * Logic after bonus is chosen:
 * - If method is QRIS, generate QR code flow
 * - Otherwise, Bank/Ewallet/Pulsa => fetch banks and let user pick
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
    userDepositData[chatId].currentStep = "WAITING_FOR_BANK_SELECTION";
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

    const filteredBanks = banks.filter(
      (bank) => String(bank.payment_category_id) === String(payment_category_id)
    );

    if (filteredBanks.length === 0) {
      bot.sendMessage(
        chatId,
        "No available payment methods for your selection."
      );
      return;
    }

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
  const { payment_category_id, bonusId } = userDepositData[chatId] || {};
  const user = await checkUserExist(chatId);

  if (!user) {
    bot.sendMessage(chatId, "User not found. Please register or log in first.");
    return;
  }

  if (user && user.login) return;

  try {
    const response = await axios.post(
      `${apiBaseUrl}/transaksi`,
      {
        user_id: user.id,
        accName: user.accName,
        accNumber: user.accNumber,
        company_code: user.company_code,
        payment_category_id: payment_category_id || null,
        amount,
        type: 1,
        platform: "telegram",
        bonus_id: bonusId || null, 
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

      await bot.sendPhoto(chatId, filePath, {
        caption: `Deposit of ${amount} via QRIS has been recorded successfully.\nQRIS is only active for 5 minutes.`,
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
      bot.sendMessage(
        chatId,
        "An error occurred while processing your deposit. Please try again later."
      );
    }
  }

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
  const { payment_category_id, bonusId, method } = userDepositData[chatId] || {};
  const user = await checkUserExist(chatId);

  if (!user) {
    bot.sendMessage(chatId, "❌ User not found. Please register or log in first.");
    return;
  }
  if (user && user.login) return;

  // Instead of calling /transaksi here, we only store the data:
  userDepositData[chatId].bankInfo = {
    accountNumber,
    bankName,
    recipientName,
  };
  userDepositData[chatId].currentStep = "WAITING_FOR_PROOF";

  // Prompt user to upload proof photo
  bot.sendMessage(
    chatId,
    `✅ You selected <b>${bankName}</b> and entered an amount of <b>IDR ${amount}</b>.\n\n` +
    `Please upload your deposit proof (transfer receipt screenshot).`,
    { parse_mode: "HTML" }
  );
};
async function processDepositWithProof(bot, msg, checkUserExist) {
  try {
    const chatId = msg.chat.id;
    const userData = userDepositData[chatId];
    if (!userData) return;

    // Only proceed if waiting for proof:
    if (userData.currentStep !== "WAITING_FOR_PROOF") {
      return;
    }

    // if method is QRIS, skip, etc...
    if (userData.method === "QRIS") {
      return;
    }

    const user = await checkUserExist(chatId);
    if (!user || user.login) {
      bot.sendMessage(chatId, "❌ You must be logged in to finish deposit.");
      delete userDepositData[chatId];
      return;
    }

    // Grab the largest photo from Telegram
    const photos = msg.photo;
    const largestPhoto = photos[photos.length - 1];
    const fileId = largestPhoto.file_id;

    // 1) Get the file path from Telegram
    const file = await bot.getFile(fileId); 
    const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;

    // 2) Instead of downloading, just pass the Telegram URL in JSON
    const proofImageUrl = fileUrl;

    // 3) Build JSON payload
    const { amount, payment_category_id, bonusId, bankInfo } = userData;
    const { bankName, recipientName, accountNumber } = bankInfo || {};

    const payload = {
      user_id: user.id,
      accName: user.accName,
      accNumber: user.accNumber,
      company_code: user.company_code,
      payment_category_id: payment_category_id || "",
      amount,
      type: "1",
      notes: "telegram",
      bankMember: `${user.bank}|${user.accNumber}`,
      bank_penerima: bankName || "",
      nama_penerima: recipientName || "",
      nomer_penerima: accountNumber || "",
      bonus_id: bonusId || null,

      // The direct link for your server to fetch
      img: proofImageUrl,
    };

    // 4) Post JSON to your API
    const transaksiResponse = await axios.post(
      `${apiBaseUrl}/transaksi`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "x-endpoint-secret": API_SECRET,
        },
        validateStatus: (status) => [200, 201, 400].includes(status),
      }
    );

    const resData = transaksiResponse.data;
    if (resData.status === 1) {
      bot.sendMessage(
        chatId,
        `✅ Your deposit (IDR ${amount}) has been successfully recorded.\n` +
        `Thank you for sending your proof!\n\n` +
        `We will process your deposit shortly.`
      );
    } else {
      bot.sendMessage(
        chatId,
        `❌ Deposit submission failed: ${resData.msg || "Unknown error."}`
      );
    }
  } catch (error) {
    console.error("Error in processDepositWithProof:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    bot.sendMessage(
      msg.chat.id,
      "❌ An error occurred while sending your proof. Please try again."
    );
  } finally {
    // Clear deposit data
    delete userDepositData[msg.chat.id];
  }
}


module.exports = {
  userDepositData,
  handleDepositSelection,
  handleDepositAmount,
  handleBonusSelectionCallback,
  processBankDeposit,
  processDepositQRISAmount,
  processDepositWithProof,
};
