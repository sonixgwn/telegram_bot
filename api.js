const axios = require("axios");
const { telegramToken, apiBaseUrl, telegramApiUrl, master_code, company_code, API_SECRET } = require("./config");

const getSiteSetting = async (chat_id) => {
  try {
    const response = await axios.post(telegramApiUrl, {
      method: "settings",
      chat_id,
      company_code,
    }, {
      headers: {
        "x-endpoint-secret": API_SECRET,
      },
    });

    if (response.data.status === 1) {
      return response.data.data; // ✅ Return the settings instead of modifying a variable
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching site settings:", error.message);
    return null;
  }
};

const getAccountListing = async () => {
  try {
    const response = await axios.get(`${apiBaseUrl}/getAccount_Listing`, {
      headers: {
        "x-endpoint-secret": API_SECRET,
      },
    });

    if (response.data.status === 1) {
      return response.data.data.map((account) => ({
        id: account.id,
        label: account.label,
      }));
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching account listing:", error.message);
    return null;
  }
};

module.exports = { getSiteSetting, getAccountListing };
