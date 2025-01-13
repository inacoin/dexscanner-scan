require('dotenv').config();  // Menambahkan dotenv untuk membaca file .env
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Konfigurasi CORS
const corsOptions = {
    origin: '*', // Anda dapat mengganti '*' dengan domain yang lebih spesifik
    methods: ['GET', 'POST'], // Metode HTTP yang diizinkan
    allowedHeaders: ['Content-Type', 'Authorization'], // Header yang diizinkan
};

// Mengambil Bot Token dan Chat ID dari file .env
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const url1 = 'https://api.geckoterminal.com/api/v2/networks/solana/new_pools?include=base_token&page=1';
const url2 = 'https://api.geckoterminal.com/api/v2/networks/base/new_pools?include=base_token&page=1'; // URL baru
const sentPairs = new Set(); // Menyimpan pairAddress yang sudah dikirim
const MAX_CACHE_SIZE = 50; // Batas maksimal data di cache
const DATA_FILE_PATH = path.join(__dirname, 'sent_data.json');

// Fungsi untuk mengirim gambar ke Telegram
async function sendToTelegram(imageUrl, caption) {
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;

    try {
        const response = await axios.post(telegramUrl, {
            chat_id: TELEGRAM_CHAT_ID,
            photo: imageUrl,
            caption: caption,
            parse_mode: "HTML", // Aktifkan parse_mode untuk HTML
        });

        if (response.data.ok) {
            console.log('Data successfully sent to Telegram');
        } else {
            console.error('Failed to send data to Telegram:', response.data);
        }
    } catch (error) {
        console.error('Error sending data to Telegram:', error.message);
    }
}

// Fungsi untuk membaca data dari file JSON
function readDataFromFile() {
    if (fs.existsSync(DATA_FILE_PATH)) {
        const data = fs.readFileSync(DATA_FILE_PATH);
        return JSON.parse(data);
    }
    return [];
}

// Fungsi untuk menyimpan data ke file JSON
function saveDataToFile(data) {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2));
}

// Fungsi utama untuk mengambil data dari kedua URL dan mengirimnya ke Telegram
module.exports = async function handler(req, res) {
    // Mengaktifkan CORS untuk setiap permintaan
    cors(corsOptions)(req, res, async () => {
        try {
            // Ambil data dari URL pertama (Solana)
            const response1 = await axios.get(url1);
            // Ambil data dari URL kedua (Base)
            const response2 = await axios.get(url2);

            // Menggabungkan data dari kedua respons
            const pools = [
                ...(response1.data.data || []),
                ...(response2.data.data || []),
            ]
                .filter(pool => pool.relationships.dex?.data?.id)
                .sort((a, b) => new Date(b.attributes.pool_created_at) - new Date(a.attributes.pool_created_at))
                .map(pool => ({
                    address: pool.attributes.address,
                    name: pool.attributes.name,
                    base_token_price_usd: parseFloat(pool.attributes.base_token_price_usd).toFixed(12),
                    dex: pool.relationships.dex.data.id,
                }));

            // Membaca data yang sudah terkirim dari file JSON
            let dataCache = readDataFromFile();

            for (const pool of pools) {
                const liquidityUrl = `https://api.dexscreener.com/latest/dex/pairs/solana/${pool.address}`;
                const liquidityUrlBase = `https://api.dexscreener.com/latest/dex/pairs/base/${pool.address}`; // URL untuk Base network
                const liquidityUrls = [liquidityUrl, liquidityUrlBase]; // Array dari kedua URL

                if (sentPairs.has(pool.address)) {
                    continue;
                }

                for (const url of liquidityUrls) {
                    try {
                        const response3 = await axios.get(url);

                        if (response3.data && response3.data.pairs && response3.data.pairs.length > 0) {
                            const pairData = response3.data.pairs[0];
                            const liquidityUsd = pairData.liquidity?.usd || "N/A";
                            const dexId = pairData.dexId || "N/A";
                            const baseToken = pairData.baseToken?.name || "N/A";
                            const baseSymbol = pairData.baseToken?.symbol || "N/A";
                            const quoteToken = pairData.quoteToken?.name || "N/A";
                            const quoteAddress = pairData.baseToken?.address || "N/A";
                            const quoteSymbol = pairData.quoteToken?.symbol || "N/A";

                            const websites = pairData.info?.websites && Array.isArray(pairData.info.websites) && pairData.info.websites.length > 0
                                ? pairData.info.websites
                                    .filter(site => site.url)
                                    .map(site => `<a href="${site.url}" target="_blank">${site.label || "Visit Website"}</a>`)
                                    .join(', ')
                                : "N/A";

                            const socials = pairData.info?.socials && Array.isArray(pairData.info.socials) && pairData.info.socials.length > 0
                                ? pairData.info.socials
                                    .filter(social => social.url)
                                    .map(social => `<a href="${social.url}" target="_blank">${social.type || "Social Link"}</a>`)
                                    .join(', ')
                                : "N/A";

                            const imageUrl = pairData.info?.imageUrl || "https://bafybeieyhue2vhr7hzfu4zkarvysnbwqy2qsalxq4sfqqkkwg7bejlmp3y.ipfs.web3approved.com/?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjaWQiOiJiYWZ5YmVpZXlodWUydmhyN2h6ZnU0emthcnZ5c25id3F5MnFzYWx4cTRzZnFxa2t3ZzdiZWpsbXAzeSIsInByb2plY3RfdXVpZCI6IjRkYjI3YWFlLTE4MDItNDJiYy04NjdkLWMwZDNjNzBhODhiMSIsImlhdCI6MTczMjUzNjM4NCwic3ViIjoiSVBGUy10b2tlbiJ9.2piY4g5lydWrPV-8yiNmkqgTVCACHOPy_j7IGTV0wJE";
                            const marketCap = pairData.marketCap || "N/A";
                            const priceUsd = pairData.priceUsd || "N/A";

                            // Kirim gambar ke Telegram setelah data diperoleh
                            const caption = `
🔹 <b>Pair</b>: <code>${baseToken} / ${quoteToken}</code>
💲 <b>Price (USD)</b>: ${priceUsd}
📌 <b>Dex</b>: ${dexId}
💧 <b>Liquidity (USD)</b>: ${liquidityUsd}
📊 <b>Market Cap</b>: ${marketCap}

🔗 <b>Address</b>: <code>${pool.address}</code>
🔹 <b>Pair Address</b>: <code>${quoteAddress}</code>

📌 <b>Websites</b>: ${websites}
🌐 <b>Socials</b>: ${socials}
                            `;
                            await sendToTelegram(imageUrl, caption);

                            // Cek apakah data sudah ada di cache
                            if (!dataCache.some(item => item.pairAddress === pairData.pairAddress)) {
                                // Menambahkan data baru ke cache
                                dataCache.unshift({
                                    pairAddress: pairData.pairAddress,
                                    dexId,
                                    baseToken,
                                    baseSymbol,
                                    quoteToken,
                                    quoteSymbol,
                                    liquidityUsd,
                                    quoteAddress,
                                    websites,
                                    socials,
                                    url: pairData.url,
                                    imageUrl,
                                    marketCap,
                                    priceUsd,
                                });

                                // Jika jumlah data lebih dari MAX_CACHE_SIZE, hapus yang paling lama
                                if (dataCache.length > MAX_CACHE_SIZE) {
                                    dataCache.pop();
                                }

                                // Simpan data ke file JSON
                                saveDataToFile(dataCache);
                            }

                            sentPairs.add(pool.address);
                            break; // Jika berhasil mengambil data dari salah satu URL, lanjut ke pool berikutnya
                        }
                    } catch (error) {
                        console.error(`Error fetching liquidity for address ${pool.address}:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error.message);
        }

        res.status(200).json({ status: 'success', data: dataCache });
    });
};