// config.js

const apiBaseUrl = process.env.API_URL;
module.exports = {
    telegramToken: process.env.BOT_TOKEN,
    apiBaseUrl,
    telegramApiUrl: `${apiBaseUrl}/telegram`,
    master_code: process.env.MASTER_CODE,
    company_code: process.env.COMPANY_CODE,
    API_SECRET: process.env.API_SECRET,
  };
  