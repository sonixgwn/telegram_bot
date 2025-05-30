const axios = require("axios");
const showMenu = require("./menuHandler");
const {
    handleDepositSelection,
    processBankDeposit,
    handleBonusSelectionCallback,
} = require("../callback/deposit");
const handleWithdrawFunds = require("../callback/withdraw");
const { checkUserExist, getDepositOptions } = require("../api");
const bot = require("../botInstance"); // Ensure correct import
const { API_SECRET, apiBaseUrl, telegramApiUrl } = require("../config");
const { completeRegistration } = require("../callback/register");

const callbackHandlers = {
    bonus_selected: async (chatId, data) => {
        // data might be "bonus_selected-27" etc.
        // We'll just pass the entire string to handleBonusSelectionCallback
        await handleBonusSelectionCallback(bot, chatId, data, checkUserExist);
    },

    // Optionally, handle skip_bonus as well,
    // if you have "Skip Bonus" callback_data: "skip_bonus"
    skip_bonus: async (chatId, data) => {
        await handleBonusSelectionCallback(bot, chatId, data, checkUserExist);
    },
    continue: async (chatId) => showMenu(chatId),

    deposit_to_account: async (chatId) => {
        getDepositOptions(chatId);
    },

    withdraw_funds: async (chatId) => {
        await handleWithdrawFunds(bot, chatId);
    },
    deposit_: async (chatId, data) => {
        const user = await checkUserExist(chatId);
        if (!user) {
            bot.sendMessage(
                chatId,
                "❌ User not found. Please register or log in first."
            );
            return;
        }

        handleDepositSelection(bot, chatId, data);
    },

    bank_selected: async (chatId, data) => {
        const bankData = data.split("bank_selected-")[1];
        processBankDeposit(bot, chatId, bankData, checkUserExist);
    },

    providers_: async (chatId, data) => {
        const game_category = data.split("_")[1];
        const label = data.split("_")[2];

        try {
            const response = await axios.get(
                `${apiBaseUrl}/getProviders/${game_category}`,
                {
                    headers: { "x-endpoint-secret": API_SECRET },
                }
            );

            if (response.data.status === 1) {
                const providers = response.data.data.filter(
                    (provider) => provider.status === 1
                );
                const providerButtons = [];

                for (let i = 0; i < providers.length; i += 2) {
                    const row = [
                        {
                            text: providers[i].provider_name,
                            callback_data: `provider_${providers[i].vendor_custom_code}_${game_category}_${providers[i].provider_type}_1`,
                        },
                    ];
                    if (providers[i + 1]) {
                        row.push({
                            text: providers[i + 1].provider_name,
                            callback_data: `provider_${
                                providers[i + 1].vendor_custom_code
                            }_${game_category}_${
                                providers[i + 1].provider_type
                            }_1`,
                        });
                    }
                    providerButtons.push(row);
                }

                bot.sendMessage(chatId, `Silahkan Pilih Provider ${label}:`, {
                    reply_markup: { inline_keyboard: providerButtons },
                });
            } else {
                bot.sendMessage(chatId, "No providers found.");
            }
        } catch (error) {
            console.error("Error fetching providers:", error.message);
            bot.sendMessage(
                chatId,
                "Gagal mengambil daftar provider. Silakan coba lagi."
            );
        }
    },

    provider_: async (chatId, data) => {
        const [_, game_provider, game_category, provider_type, pagination] =
            data.split("_");

        try {
            let response;
            if (game_category === "slots") {
                response = await axios.post(
                    `${apiBaseUrl}/getFiverGames`,
                    { game_provider, game_category },
                    { headers: { "x-endpoint-secret": API_SECRET } }
                );
            } else if (game_category === "arcade") {
                response = await axios.get(
                    `${apiBaseUrl}/getArcadeGames/${game_provider}`,
                    { headers: { "x-endpoint-secret": API_SECRET } }
                );
            }

            if (response.data.status === 1 && response.data.data.length > 0) {
                let games = response.data.data;
                const startIndex = (parseInt(pagination) - 1) * 20;
                const endIndex = startIndex + 20;
                games = games.slice(startIndex, endIndex);
                const gameButtons = games.map((game) => [
                    {
                        text: game.game_name,
                        callback_data: `game_${game_provider}_${game_category}_${game.game_code}_${provider_type}_${game.game_provider}_${game.game_provider_code}`,
                    },
                ]);

                bot.sendMessage(chatId, "Select a Game:", {
                    reply_markup: { inline_keyboard: gameButtons },
                });
            } else {
                bot.sendMessage(chatId, "No games found for this provider.");
            }
        } catch (error) {
            console.error("Error fetching games:", error.message);
            bot.sendMessage(
                chatId,
                "Gagal mengambil daftar permainan. Silakan coba lagi."
            );
        }
    },

    game_: async (chatId, data) => {
        const [
            _,
            game_provider,
            game_category,
            game_code,
            provider_type,
            provider_id,
            vendor_code,
        ] = data.split("_");
        const user = await checkUserExist(chatId);

        if (!user) {
            bot.sendMessage(
                chatId,
                "Akun Anda belum terdaftar. Harap melakukan pendaftaran terlebih dahulu."
            );
            return;
        }

        if (user && user.login) return;

        try {
            // Fetch game details
            let gamesResponse;
            if (game_category === "slots") {
                gamesResponse = await axios.post(
                    `${apiBaseUrl}/getFiverGames`,
                    { game_provider, game_category },
                    {
                        headers: { "x-endpoint-secret": API_SECRET },
                    }
                );
            } else if (game_category === "arcade") {
                gamesResponse = await axios.get(
                    `${apiBaseUrl}/getArcadeGames/${game_provider}`,
                    {
                        headers: { "x-endpoint-secret": API_SECRET },
                    }
                );
            }

            if (
                !gamesResponse ||
                !gamesResponse.data ||
                !gamesResponse.data.data
            ) {
                bot.sendMessage(chatId, "No details found for this game.");
                return;
            }

            const games = gamesResponse.data.data;
            const selectedGame = games.find(
                (game) => game.game_code.toString() === game_code
            );

            if (!selectedGame) {
                bot.sendMessage(chatId, "Game not found.");
                return;
            }

            // Launch the game via API
            const response = await axios.post(
                telegramApiUrl,
                {
                    method: "game_launch",
                    chat_id: chatId,
                    game_vendor: provider_id.toUpperCase(),
                    game_provider: provider_type,
                    game_category,
                    extplayer: user.extplayer,
                    game_code,
                    provider_type: vendor_code,
                    portfolio: "SeamlessGame",
                },
                { headers: { "x-endpoint-secret": API_SECRET } }
            );

            if (response.data.status === 1) {
                const game = response.data;

                // Send game image with "Play Now" button
                const gameMessage = await bot.sendPhoto(
                    chatId,
                    selectedGame.game_image,
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: "🚀 Play Now",
                                        web_app: { url: game.url },
                                    },
                                ],
                            ],
                        },
                    }
                );

                // After 30 seconds, show a "Relaunch Game" button
                setTimeout(() => {
                    bot.editMessageReplyMarkup(
                        {
                            inline_keyboard: [
                                [
                                    {
                                        text: "🔄 Relaunch Game",
                                        callback_data: `game_${game_provider}_${game_category}_${game_code}_${provider_type}_${provider_id}_${vendor_code}`,
                                    },
                                ],
                            ],
                        },
                        {
                            chat_id: chatId,
                            message_id: gameMessage.message_id,
                        }
                    );
                }, 30000);
            } else {
                bot.sendMessage(
                    chatId,
                    "Gagal meluncurkan permainan. Silakan coba lagi."
                );
            }
        } catch (error) {
            console.error("Error launching game:", error.message);
            bot.sendMessage(
                chatId,
                "Gagal meluncurkan permainan. Silakan coba lagi."
            );
        }
    },

    categories_: async (chatId, data) => {
        const provider_type = data.split("_")[1];
        const portfolio = data.split("_")[2];
        const label = data.split("_")[3];

        try {
            const response = await axios.get(
                `${apiBaseUrl}/getCategoryGames/${provider_type}`,
                {
                    headers: {
                        "x-endpoint-secret": API_SECRET,
                    },
                }
            );

            if (response.data.status === 1) {
                const providers = response.data.data.filter(
                    (provider) => provider.game_maintenance === false
                );

                // Buat keyboard dengan 1 baris, 2 kolom
                const providerButtons = [];
                for (let i = 0; i < providers.length; i += 2) {
                    const row = [];
                    row.push({
                        text: providers[i].game_name,
                        callback_data: `categoryGame_${
                            providers[i].game_code
                        }_${providers[i].game_provider}_${provider_type}_${
                            provider_type === "SB" &&
                            !providers[i].game_name.startsWith("SBO")
                                ? "ThirdPartySportsBook"
                                : portfolio
                        }_${providers[i].game_provider_code}`,
                    });
                    if (providers[i + 1]) {
                        row.push({
                            text: providers[i + 1].game_name,
                            callback_data: `categoryGame_${
                                providers[i + 1].game_code
                            }_${
                                providers[i + 1].game_provider
                            }_${provider_type}_${
                                provider_type === "SB" &&
                                !providers[i + 1].game_name.startsWith("SBO")
                                    ? "ThirdPartySportsBook"
                                    : portfolio
                            }_${providers[i + 1].game_provider_code}`,
                        });
                    }
                    providerButtons.push(row);
                }

                // Kirim daftar provider ke pengguna
                bot.sendMessage(chatId, `Silahkan Pilih Provider ${label}:`, {
                    reply_markup: { inline_keyboard: providerButtons },
                });
            } else {
                bot.sendMessage(chatId, "No providers found.");
            }
        } catch (error) {
            console.error("Error fetching providers:", error.message);
            bot.sendMessage(
                chatId,
                "Gagal mengambil daftar provider. Silakan coba lagi."
            );
        }
    },

    categoryGame_: async (chatId, data) => {
        const game_code = data.split("_")[1];
        const game_provider = data.split("_")[2];
        const provider_type = data.split("_")[3];
        const portfolio = data.split("_")[4];
        const vendor_code = data.split("_")[5];
        const user = await checkUserExist(chatId);

        if (!user) {
            bot.sendMessage(
                chatId,
                "Akun Anda belum terdaftar. Harap melakukan pendaftaran terlebih dahulu."
            );
            return;
        }

        try {
            const gamesResponse = await axios.get(
                `${apiBaseUrl}/getCategoryGames/${provider_type}`,
                {
                    headers: {
                        "x-endpoint-secret": API_SECRET,
                    },
                }
            );

            const games = gamesResponse.data.data;
            const selectedGame = games.find(
                (game) => game.game_provider.toString() === game_provider
            );

            // Panggil API untuk mendapatkan daftar game berdasarkan ID provider
            const response = await axios.post(
                telegramApiUrl,
                {
                    method: "game_launch",
                    chat_id: chatId,
                    game_vendor:
                        game_provider === "sbosports"
                            ? game_code
                            : game_provider.toUpperCase(),
                    game_provider: provider_type,
                    game_category: provider_type,
                    extplayer: user.extplayer,
                    game_code,
                    provider_type: vendor_code,
                    portfolio,
                },

                // method: "game_launch",
                // chat_id: chatId,
                // game_vendor: provider_id.toUpperCase(),
                // game_provider: provider_type,
                // game_category,
                // extplayer: user.extplayer,
                // game_code,
                // provider_type: vendor_code,
                // portfolio: "SeamlessGame",
                {
                    headers: {
                        "x-endpoint-secret": API_SECRET,
                    },
                }
            );

            if (response.data.status === 1) {
                const game = response.data;
                // Buat inline keyboard dengan 1 baris 2 kolom untuk Demo Link dan Real Link
                const gameButtons = [
                    [
                        {
                            text: "Play Now",
                            url: game.url, // Menggunakan web_app untuk tombol Play Now
                        },
                    ],
                ];

                // Kirim gambar dan inline keyboard
                const gameMessage = await bot.sendPhoto(
                    chatId,
                    selectedGame.game_image,
                    {
                        reply_markup: {
                            inline_keyboard: gameButtons,
                        },
                    }
                );

                setTimeout(() => {
                    bot.editMessageReplyMarkup(
                        {
                            inline_keyboard: [
                                [
                                    {
                                        text: "Relaunch Game",
                                        callback_data: `categoryGame_${game_code}_${game_provider}_${provider_type}_${portfolio}`, // Menggunakan web_app untuk tombol Play Now
                                    },
                                ],
                            ],
                        },
                        {
                            chat_id: chatId,
                            message_id: gameMessage.message_id,
                        }
                    );
                }, 30000);
            } else {
                bot.sendMessage(chatId, "No details found for this game.");
            }
        } catch (error) {
            console.error("Error fetching game details:", error.message);
            bot.sendMessage(
                chatId,
                "Gagal mengambil daftar permainan. Silakan coba lagi."
            );
        }
    },

    register_: async (chatId, data) => {
        const bankLabel = data.split("_")[1];
        completeRegistration(bot, chatId, bankLabel);
    },
};

async function handleCallbackQuery(callbackQuery) {
    if (
        !callbackQuery ||
        !callbackQuery.message ||
        !callbackQuery.message.chat
    ) {
        console.error("Invalid callbackQuery object:", callbackQuery);
        return;
    }

    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    console.log(`Received callback data: ${data} - ${chatId}`);

    try {
        if (bot && bot.deleteMessage) {
            await bot.deleteMessage(chatId, callbackQuery.message.message_id);
        } else {
            console.error(
                "Bot instance is undefined or deleteMessage is not a function."
            );
        }
    } catch (err) {
        console.error("Error deleting message:", err);
    }

    for (const key in callbackHandlers) {
        if (data === key || data.startsWith(key)) {
            return callbackHandlers[key](chatId, data);
        }
    }

    console.warn(`Unhandled callback query: ${data}`);
}

module.exports = handleCallbackQuery;
