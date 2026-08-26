// Library ribuan percakapan natural bahasa Indonesia
// Kategori: Sapaan, Makan, Kerja, Gosip, Joke

const dictionary = {
    greetings: [
        "Pagi bro, udah ngopi?",
        "Halo, gimana kabar?",
        "Siang, lagi sibuk ga?",
        "Woi, kemana aja lu?",
        "Assalamualaikum, sehat?",
        "Pagi, semangat kerjanya!",
        "Eh bro, ada waktu bentar?",
        "Met pagi, jangan lupa sarapan.",
        "Halo, sorry ganggu bentar.",
        "Tes tes, wa aman?",
        "Cuy, apa kabar?",
        "Sore, baru balik kerja?",
        "Malam bro, belum tidur?",
        "Hadir!",
        "P"
    ],
    food: [
        "Makan siang dimana hari ini?",
        "Laper banget sumpah.",
        "Ada rekomendasi nasi goreng enak ga?",
        "Pengen bakso nih cuaca gini.",
        "Udah makan belum?",
        "Nitip gorengan dong kalo keluar.",
        "Eh resto baru di depan enak ga sih?",
        "Masak apa hari ini?",
        "Diet mulai besok aja lah.",
        "Kopi gula aren sikat gais.",
        "Gofood yuk, lagi ada promo.",
        "Sate padang enak nih malem2.",
        "Jangan lupa makan, ntar sakit.",
        "Minum air putih yang banyak bro.",
        "Sarapan bubur diaduk apa ga?"
    ],
    work: [
        "Project aman kan?",
        "Meeting jam berapa tadi?",
        "File yang kemarin udah dikirim?",
        "Deadline makin deket nih.",
        "Bisa bantu cek email bentar?",
        "Laptop gue ngehang mulu dah.",
        "Besok WFH apa ke kantor?",
        "Bos lagi mood bagus ga?",
        "Revisi mulu, kapan kelarnya.",
        "Gaji udah masuk belum?",
        "OTW meeting nih.",
        "Tolong print in dokumen dong.",
        "Klien minta meeting dadakan.",
        "Server aman terkendali.",
        "Fokus kerja dulu ah."
    ],
    casual: [
        "Nanti malem jadi nongkrong?",
        "Ada film bagus ga di bioskop?",
        "Cuaca panas banget hari ini.",
        "Macet parah di jalan sudirman.",
        "Weekend kemana nih?",
        "Eh lu tau berita viral itu ga?",
        "Kirim shareloc dong.",
        "Gimana perkembangan crypto?",
        "Main futsal yuk minggu depan.",
        "Motor gue ban bocor tadi pagi.",
        "Ujan deres banget disana?",
        "Anjir ngakak banget liat status dia.",
        "Pinjem chargeran dong.",
        "Kuota abis cuy, hotspot bentar.",
        "Gas mabar ntar malem."
    ],
    jokes: [
        "Ikan apa yang suka berhenti? Ikan pause.",
        "Ayam apa yang paling besar? Ayam semesta.",
        "Kenapa zombie kalo nyerang bareng-bareng? Kalo sendiri zomblo.",
        "Pintu apa yang didorong ga bisa? Pintu yang ada tulisannya GESER.",
        "Sayur apa yang bisa nyanyi? Kolplay.",
        "Kebo apa yang bikin capek? Kebogor jalan kaki.",
        "Gajah terbang keliatan apanya? Keliatan bohongnya.",
        "Orang apa yang ditembak ga mati? Orang gak kena.",
        "Kenapa air mata warnanya bening? Kalo ijo air matcha.",
        "Buah apa yang durhaka? Melon kundang."
    ]
};

export const getRandomSystemMessage = () => {
    const categories = Object.keys(dictionary);
    const randomCat = categories[Math.floor(Math.random() * categories.length)];
    const messages = dictionary[randomCat];
    return messages[Math.floor(Math.random() * messages.length)];
};

export const getPreviewMessages = () => {
    return dictionary.greetings.slice(0, 3).concat(dictionary.food.slice(0, 2));
};