// callback/withdraw.js

const axios = require("axios");
const { checkUserExist } = require("../api");
const { API_SECRET, apiBaseUrl, telegramApiUrl, company_code } = require("../config");
const { moneyFormat } = require("../utils/helpers");

/**
 * Asks the user for a withdrawal amount and submits it to your API.
 * @param {Object} bot - Telegram bot instance
 * @param {Number} chatId - Telegram chat ID
 */
async function handleWithdrawFunds(bot, chatId) {
    // Check if user exists
    const user = await checkUserExist(chatId);
    if (!user) {
        bot.sendMessage(chatId, "Akun Anda belum terdaftar. Harap melakukan pendaftaran terlebih dahulu.");
        return;
    }
  
    if (user && user.login) return;

    // Prompt for withdrawal amount
    bot.sendMessage(chatId, "Silahkan masukan jumlah withdraw:", {
      reply_markup: {
        force_reply: true
      }
    });

    // Listen for the user's next message (in the same chat)
    bot.once("message", async (msg) => {
        if (msg.chat.id !== chatId) return; // Ignore if it's from a different chat

        const amount = parseFloat(msg.text);
        if (isNaN(amount) || amount <= 0) {
            bot.sendMessage(chatId, "Silahkan masukan jumlah withdraw yang valid:", {
              reply_markup: {
                force_reply: true
              }
            });
            return;
        }
        
        try {
            bot.sendMessage(chatId, "Withdraw sedang dalam proses validasi, Mohon menunggu.");
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
                `✅ Withdraw sebesar IDR ${moneyFormat(amount)} behasil dibuat. Mohon menunggu konfirmasi selanjutnya. Terima Kasih`
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
