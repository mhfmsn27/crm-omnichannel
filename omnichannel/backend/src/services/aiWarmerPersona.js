/**
 * AI Persona Warmer Message Generator
 * Generates natural, human-like, non-repetitive dialogue pairs to minimize WhatsApp spam detection
 * and ensure mutual End-to-End Encryption key ratchet exchange.
 */

const DIALOGUE_PAIRS = {
    kuliner: [
        {
            prompt: "Eh tadi makan siang apa? Ada rekomendasi tempat makan enak dekat sini ga?",
            reply: "Tadi nyobain ayam geprek sambal matah dekat perempatan, lumayan mantap pedasnya. Mau nitip?"
        },
        {
            prompt: "Tadi nyobain resto baru di dekat kantor, lumayan enak juga sambalnya.",
            reply: "Wah resto yang seberang bank itu ya? Harganya terjangkau ga buat makan siang bareng?"
        },
        {
            prompt: "Kopi susu di coffee shop sebelah ternyata cocok banget rasanya, gak terlalu manis.",
            reply: "Cocok tuh, nanti sore boleh pesen bareng biar seger lagi kerjanya."
        },
        {
            prompt: "Weekend besok mau kulineran ke mana nih? Lagi pengen makanan khas sunda.",
            reply: "Ada saung sunda enak di pinggir kota, lalapan sama guramenya juara banget."
        },
        {
            prompt: "Ada promo grabfood/gofood lumayan tadi, lumayan hemat makan siang.",
            reply: "Wah info menarik, boleh minta vouchernya? Mau order kopi sore nih."
        },
        {
            prompt: "Resep ayam bakar kemarin udah kamu coba belum? Hasilnya empuk banget lho.",
            reply: "Udah dicoba tadi malam, bumbunya meresap sampai ke dalam. Keluarga pada suka!"
        },
        {
            prompt: "Lagi pengen ngemil yang manis-manis nih, martabak atau roti bakar ya enaknya?",
            reply: "Roti bakar keju cokelat enak tuh sore-sore gini, anget-anget pas banget."
        },
        {
            prompt: "Tadi nyoba bakso urat di pertigaan jalan, kuahnya gurih mantap.",
            reply: "Bakso pak kumis ya? Kuah kaldunya emang terkenal gurih banget dari dulu."
        }
    ],
    bisnis: [
        {
            prompt: "Halo, gimana perkembangan orderan hari ini? Lancar?",
            reply: "Halo, alhamdulillah sejauh ini aman dan lancar nih. Lagi proses rekap pesanan juga."
        },
        {
            prompt: "Lagi ngecek stok barang masuk tadi, aman semua jumlahnya.",
            reply: "Oke mantap, nanti kalau sudah selesai rekap tolong update di spreadsheet ya."
        },
        {
            prompt: "Laporan pengiriman minggu ini udah saya rekap di spreadsheet ya.",
            reply: "Siap, terima kasih banyak ya. Nanti langsung saya review bareng tim."
        },
        {
            prompt: "Vendor pengiriman yang baru layanannya cukup responsif ya, paket cepat sampai.",
            reply: "Iya bener, pelayanannya memuaskan dan update tracking-nya juga real-time."
        },
        {
            prompt: "Siang, jangan lupa meeting review target bulan ini jam 2 nanti ya.",
            reply: "Oke siap noted, materinya sudah saya siapkan. Sampai ketemu di ruang meeting."
        },
        {
            prompt: "Udah follow up klien yang kemarin tanya-tanya katalog produk?",
            reply: "Sudah di-follow up tadi pagi, mereka lagi diskusi internal buat penentuan jumlah pesanannya."
        },
        {
            prompt: "Nanti sore mau kirim beberapa resi pesanan ya, tolong dibantu cek.",
            reply: "Boleh banget, kirimkan aja list-nya nanti saya bantu verifikasi satu per satu."
        }
    ],
    teknologi: [
        {
            prompt: "Udah update OS handphone yang terbaru belum? Katanya baterainya jadi lebih awet.",
            reply: "Udah semalam ku update, iya bener kerasa lebih enteng dan performanya smooth."
        },
        {
            prompt: "Aplikasi chat tadi sempet delay ga di kamu? Di sini lancar sih.",
            reply: "Tadi pagi sempet agak lambat koneksi internetnya, tapi sekarang udah normal dan lancar."
        },
        {
            prompt: "Fitur AI yang baru ternyata ngebantu banget ya buat ngerangkum catatan kerjaan.",
            reply: "Setuju, hemat waktu banget apalagi pas harus bikin ringkasan meeting panjang."
        },
        {
            prompt: "Lagi cari rekomendasi earphone wireless yang bagus di bawah 500rb, ada saran?",
            reply: "Coba merk soundcore atau qcy, bass-nya oke dan baterainya tahan lama seharian."
        },
        {
            prompt: "Backup data chat WA kamu udah diatur ke Google Drive belum biar aman?",
            reply: "Udah diset tiap malam otomatis backup, biar aman kalau ganti device sewaktu-waktu."
        }
    ],
    travelling: [
        {
            prompt: "Weekend ini ada rencana liburan keluar kota atau istirahat di rumah aja?",
            reply: "Rencana mau santai di rumah aja nih sambil nonton film, kamu mau jalan ke mana?"
        },
        {
            prompt: "Kemarin pas jalan-jalan ke pantai udaranya seger banget, gak terlalu rame juga.",
            reply: "Wah seru banget ya, jadi pengen refreshing juga nih cari udara pantai."
        },
        {
            prompt: "Lagi cari tiket kereta promo buat liburan bulan depan nih.",
            reply: "Coba cek di aplikasi tengah malam biasanya ada flash sale tiket potongan lumayan."
        },
        {
            prompt: "Jalanan sore ini lumayan lancar ya, gak sepadat biasanya.",
            reply: "Iya alhamdulillah, tadi lewat jalur utama juga gak macet sama sekali."
        }
    ],
    santai: [
        {
            prompt: "Halo, apa kabar? Semoga harimu menyenangkan dan lancar ya!",
            reply: "Halo! Alhamdulillah baik, terima kasih ya. Semoga harimu juga lancar dan berkah."
        },
        {
            prompt: "Lagi santai nih, cuaca di sana gimana? Di sini agak mendung sejuk.",
            reply: "Di sini cerah berawan, enak banget suasananya gak terlalu panas."
        },
        {
            prompt: "Siap, terima kasih banyak ya infonya tadi. Sangat membantu.",
            reply: "Sama-sama, senang bisa bantu! Kalau ada yang perlu ditanyakan lagi kabari aja ya."
        },
        {
            prompt: "Oke noted ya, nanti kalau ada update baru saya kabari lagi.",
            reply: "Siap, kabari aja ya kalau ada perkembangan terbaru. Terima kasih banyak!"
        },
        {
            prompt: "Semangat ya buat aktivitas hari ini, jangan lupa jaga kesehatan!",
            reply: "Terima kasih banyak atas supportnya! Semangat juga buat kamu ya."
        }
    ]
};

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Generates a realistic, human-sounding dialogue pair (prompt + reply)
 *
 * @param {string} topic - Category ('kuliner', 'bisnis', 'teknologi', 'travelling', 'santai', or 'auto')
 * @returns {{ prompt: string, reply: string }}
 */
export const generateWarmerPersonaPair = (topic = 'auto') => {
    const categories = Object.keys(DIALOGUE_PAIRS);
    const selectedCategory = (topic && DIALOGUE_PAIRS[topic]) ? topic : getRandomElement(categories);
    const pairs = DIALOGUE_PAIRS[selectedCategory];

    return getRandomElement(pairs);
};

/**
 * Generates a realistic, human-sounding single message for backward compatibility.
 *
 * @param {string} topic - Category ('kuliner', 'bisnis', 'teknologi', 'travelling', 'santai', or 'auto')
 * @returns {string}
 */
export const generateWarmerPersonaMessage = (topic = 'auto') => {
    const pair = generateWarmerPersonaPair(topic);
    return pair.prompt;
};

export default {
    generateWarmerPersonaPair,
    generateWarmerPersonaMessage
};
