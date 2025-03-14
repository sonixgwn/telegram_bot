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
    bot.sendMessage(chatId, "Silahkan masukkan jumlah withdraw:");

    // Listen for the user's next message (in the same chat)
    bot.once("message", async (msg) => {
        if (msg.chat.id !== chatId) return; // Ignore if it's from a different chat

        const amount = parseFloat(msg.text);
        if (isNaN(amount) || amount <= 0) {
            bot.sendMessage(chatId, "Silahkan masukkan jumlah withdraw yang valid:");
            return;
        }
        try {
            bot.sendMessage(chatId, "Silahkan tunggu sebentar, sedang memproses withdraw...");
            const response = await axios.post(
                `${telegramApiUrl}`,
                {
                    method: "withdraw",
                    user_code: user.extplayer,
                    chat_id: chatId,  
                    company_code,             
                    amount,
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
            
            // Step 2: Check if the initial request is successful
            if (response.data.status !== 1) {
                bot.sendMessage(chatId, `❌ Withdraw Gagal: ${response.data.msg || "Unknown error"}. Silahkan ajukan kembali Withdraw atau hubungi Livechat untuk bantuan.`);
                return;
            };
            
            bot.sendMessage(
                chatId,
                `✅ Withdrawal successful!\n\n` +
                `Withdrawn Amount: ${amount}\n`
            );
        } catch (error) {
            console.error("❌ Error while calling withdraw API:", error.message);
            if (error.response && error.response.data) {
              bot.sendMessage(
                chatId,
                `❌ Withdraw Gagal: ${
                  error.response.data.msg || "An unknown error occurred."
                }. Silahkan ajukan kembali Withdraw atau hubungi Livechat untuk bantuan.`
              );
            } else {
              bot.sendMessage(
                chatId,
                "❌ Withdraw Gagal: Silahkan ajukan kembali Withdraw atau hubungi Livechat untuk bantuan."
              );
            }
          }
    });
}

module.exports = handleWithdrawFunds;
