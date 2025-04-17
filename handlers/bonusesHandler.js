const axios = require("axios");
const { apiBaseUrl, API_SECRET } = require("../config");
const bot = require("../botInstance"); // Import shared bot instance

/**
 * Handle fetching and displaying bonuses
 * @param {Number} chatId - The Telegram chat ID
 */
const handleBonuses = async (chatId) => {
  try {
    // Make API request to fetch bonuses
    const response = await axios.get(`${apiBaseUrl}/bonuses`, {
      headers: { "x-endpoint-secret": API_SECRET },
    });

    // Extract bonuses array from response
    const bonuses = response.data?.data; // Ensure correct extraction

    console.log("Received bonuses data:", bonuses); // Debugging log

    // Check if bonuses exist and are an array
    if (!bonuses || !Array.isArray(bonuses) || bonuses.length === 0) {
      bot.sendMessage(chatId, "❌ No active bonuses available at the moment.");
      return;
    }

    // Format bonuses data into a readable message
    let message = "<b>🎁 Pilihan Bonus / Promosi:</b>\n\n";
    bonuses.forEach((bonus, index) => {
      message += `🔹 <b>${bonus.title}</b>\n`;
      message += `💰 <b>Amount:</b> ${
        bonus.amount_type === "percentage" ? bonus.amount + "%" : "IDR " + bonus.amount
      }\n`;
      message += `💵 <b>Min Deposit:</b> IDR ${bonus.min_deposit}\n`;
      message += `📏 <b>Max Amount:</b> ${bonus.max_amount > 0 ? "IDR " + bonus.max_amount : "No Limit"}\n`;
      message += `🔄 <b>Turnover Requirement:</b> ${bonus.turnover}x\n`;
      message += `📌 <b>Bonus Type:</b> ${bonus.bonus_type.replace("_", " ")}\n\n`;
    });

    // Send formatted message
    bot.sendMessage(chatId, message, { parse_mode: "HTML" });
  } catch (error) {
    console.error("❌ Error fetching bonuses:", error.message);
    bot.sendMessage(chatId, "❌ Gagal mengambil data bonus. Silakan coba lagi.");
  }
};

module.exports = handleBonuses;
