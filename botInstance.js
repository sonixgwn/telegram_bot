const TelegramBot = require("node-telegram-bot-api");
const { telegramToken } = require("./config");

const bot = new TelegramBot(telegramToken, { polling: true });

module.exports = bot;
