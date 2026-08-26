/**
 * AI Persona Warmer Message Generator
 * Generates natural, human-like, non-repetitive dialogue pairs to minimize WhatsApp spam detection.
 */

const DIALOGUE_BANKS = {
    kuliner: [
        "Eh tadi makan siang apa? Ada rekomendasi tempat makan enak dekat sini ga?",
        "Tadi nyobain resto baru di dekat kantor, lumayan enak juga sambalnya.",
        "Kopi susu di coffee shop sebelah ternyata cocok banget rasanya, gak terlalu manis.",
        "Weekend besok mau kulineran ke mana nih? Lagi pengen makanan khas sunda.",
        "Ada promo grabfood/gofood lumayan tadi, lumayan hemat makan siang.",
        "Resep ayam bakar kemarin udah kamu coba belum? Hasilnya empuk banget lho.",
        "Lagi pengen ngemil yang manis-manis nih, martabak atau roti bakar ya enaknya?",
        "Tadi nyoba bakso urat di pertigaan jalan, kuahnya gurih mantap."
    ],
    bisnis: [
        "Halo, gimana perkembangan orderan hari ini? Lancar?",
        "Lagi ngecek stok barang masuk tadi, aman semua jumlahnya.",
        "Laporan pengiriman minggu ini udah saya rekap di spreadsheet ya.",
        "Vendor pengiriman yang baru layanannya cukup responsif ya, paket cepat sampai.",
        "Siang, jangan lupa meeting review target bulan ini jam 2 nanti ya.",
        "Udah follow up klien yang kemarin tanya-tanya katalog produk?",
        "Nanti sore mau kirim beberapa resi pesanan ya, tolong dibantu cek."
    ],
    teknologi: [
        "Udah update OS handphone yang terbaru belum? Katanya baterainya jadi lebih awet.",
        "Aplikasi chat tadi sempet delay ga di kamu? Di sini lancar sih.",
        "Fitur AI yang baru ternyata ngebantu banget ya buat ngerangkum catatan kerjaan.",
        "Lagi cari rekomendasi earphone wireless yang bagus di bawah 500rb, ada saran?",
        "Backup data chat WA kamu udah diatur ke Google Drive belum biar aman?"
    ],
    travelling: [
        "Weekend ini ada rencana liburan keluar kota atau istirahat di rumah aja?",
        "Kemarin pas jalan-jalan ke pantai udaranya seger banget, gak terlalu rame juga.",
        "Lagi cari tiket kereta promo buat liburan bulan depan nih.",
        "Jalanan sore ini lumayan lancar ya, gak sepadat biasanya."
    ],
    santai: [
        "Halo, apa kabar? Semoga harimu menyenangkan dan lancar ya!",
        "Lagi santai nih, cuaca di sana gimana? Di sini agak mendung sejuk.",
        "Siap, terima kasih banyak ya infonya tadi. Sangat membantu.",
        "Oke noted ya, nanti kalau ada info baru saya kabari lagi.",
        "Semangat ya buat aktivitas hari ini, jangan lupa jaga kesehatan!"
    ]
};

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Generates a realistic, human-sounding message for WhatsApp warmer peer-to-peer chats.
 *
 * @param {string} topic - Category ('kuliner', 'bisnis', 'teknologi', 'travelling', 'santai', or 'auto')
 * @returns {string}
 */
export const generateWarmerPersonaMessage = (topic = 'auto') => {
    const categories = Object.keys(DIALOGUE_BANKS);
    const selectedCategory = (topic && DIALOGUE_BANKS[topic]) ? topic : getRandomElement(categories);
    const messages = DIALOGUE_BANKS[selectedCategory];

    return getRandomElement(messages);
};

export default {
    generateWarmerPersonaMessage
};
