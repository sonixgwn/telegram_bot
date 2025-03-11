// callback/withdraw.js

const axios = require("axios");
const { checkUserExist } = require("../api");
const { API_SECRET, apiBaseUrl, telegramApiUrl, company_code } = require("../config");

/**
 * Asks the user for a withdrawal amount and submits it to your API.
 * @param {Object} bot - Telegram bot instance
 * @param {Number} chatId - Telegram chat ID
 */
async function handleWithdrawFunds(bot, chatId) {
    // Check if user exists
    const user = await checkUserExist(chatId);
    if (!user) {
        bot.sendMessage(chatId, "You are not registered. Please register first.");
        return;
    }
  
    if (user && user.login) return;

    // Prompt for withdrawal amount
    bot.sendMessage(chatId, "Please enter the amount you want to withdraw:");

    // Listen for the user's next message (in the same chat)
    bot.once("message", async (msg) => {
        if (msg.chat.id !== chatId) return; // Ignore if it's from a different chat

        const amount = parseFloat(msg.text);
        if (isNaN(amount) || amount <= 0) {
            bot.sendMessage(chatId, "Please enter a valid number for the withdrawal amount.");
            return;
        }
        try {
            const initialResponse = await axios.post(
                `${telegramApiUrl}`,
                {
                    method: "withdraw",
                    user_code: user.extplayer,
                    chat_id: chatId,  
                    company_code,             
                    amount,
                },
                {
                    headers: { "x-endpoint-secret": API_SECRET }
                }
            );
            console.log(initialResponse);
            // Step 2: Check if the initial request is successful
            if (initialResponse.data.status !== 1) {
                bot.sendMessage(chatId, `❌ Withdrawal failed: ${initialResponse.data.msg || "Unknown error"}`);
                return;
            }
            // Submit withdrawal to your API
            const response = await axios.post(
                `${apiBaseUrl}/transaksi`,
                {
                    user_id: user.id,
                    accName: user.accName,
                    accNumber: user.accNumber,
                    company_code: user.company_code,
                    amount,
                    type: 2,
                    notes: "telegram",
                    bankMember: `${user.bank}|${user.accNumber}`,
                },
                {
                    headers: { "x-endpoint-secret": API_SECRET }
                }
            );
            const resData = response.data;
            console.log("💡 API Response:", resData);
        
            if (resData.status === 1) {
                const { data: withdrawalDetails } = response.data; // or however your API returns details
                bot.sendMessage(
                    chatId,
                    `✅ Withdrawal successful!\n\n` +
                    `Withdrawn Amount: ${amount}\n`
                );
            } else {
                bot.sendMessage(chatId, `❌ Withdraw failed: ${resData.msg}`);
            }
        } catch (error) {
            console.error("❌ Error while calling withdraw API:", error.message);
            if (error.response && error.response.data) {
              bot.sendMessage(
                chatId,
                `❌ Withdraw failed: ${
                  error.response.data.msg || "An unknown error occurred."
                }`
              );
            } else {
              bot.sendMessage(
                chatId,
                "❌ An error occurred while processing your Withdraw. Please try again later."
              );
            }
          }
    });
}

module.exports = handleWithdrawFunds;
