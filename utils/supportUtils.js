function getSupportMarkup(lc, wa, te) {
    return {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Livechat", url: lc }],
          [{ text: "Whatsapp", url: `https://wa.me/${wa}` }],
          [{ text: "Telegram", url: `https://t.me/${te}` }],
        ],
      },
    };
  }
  
  module.exports = { getSupportMarkup };
  