-- Migration 027: Seed Default CMS Tutorial Pages
INSERT INTO public_pages (slug, title, content, meta_description, is_published, page_type, target_menu)
VALUES 
(
    'tutorial-chatbot',
    'Panduan Lengkap & Tutorial Modul Chatbot AI',
    '{"video_urls":[],"items":[{"title":"1. Pengenalan AI Chatbot & Customer Service Assistant","body":"Fitur Chatbot AI di CRMHub memungkinkan Anda menjawab pesan pelanggan secara otomatis 24/7 di semua channel (WhatsApp, Instagram, Telegram, Messenger, Webchat).\n\nChatbot mendukung model AI mutakhir termasuk Google Gemini, OpenAI (GPT-4o), dan OpenRouter."},{"title":"2. Menghubungkan API Key AI (Gemini / OpenAI / OpenRouter)","body":"1. Buka menu Chatbot → API Setting.\n2. Pilih AI Provider yang Anda gunakan (Google Gemini, OpenAI, atau OpenRouter).\n3. Tempelkan API Key Anda dan klik Simpan Pengaturan.\n4. Sistem akan otomatis memverifikasi kunci API Anda."},{"title":"3. Menyiapkan Basis Pengetahuan (Knowledge Base)","body":"1. Buka menu Chatbot → Knowledge Base.\n2. Tambahkan FAQ Tanya-Jawab produk, harga, dan ketentuan layanan Anda.\n3. Anda juga dapat mengunggah file PDF / Brosur untuk dianalisis oleh AI.\n4. AI akan menjawab pertanyaan pelanggan secara akurat berdasarkan dokumen tersebut."},{"title":"4. Mengatur Alur Percakapan Interaktif (Visual Flow Builder)","body":"1. Buka menu Chatbot → Visual Flow.\n2. Buat alur percakapan interaktif berbasis kata kunci pemicu (trigger keyword).\n3. Rancang tombol pilihan, menu interaktif, hingga eskalasi ke staf manusia (Live Agent Transfer)."},{"title":"5. Mengaktifkan Chatbot pada Saluran Komunikasi","body":"1. Buka menu Integrasi / Device.\n2. Aktifkan saklar AI Assistant pada perangkat WhatsApp, Halaman Facebook, Akun Instagram, atau Bot Telegram Anda.\n3. Chatbot kini aktif melayani pelanggan secara otomatis!"}]}',
    'Pelajari cara mudah mengatur asisten AI, menghubungkan API Key, mengunggah Knowledge Base, dan mendesain Visual Flow interaktif.',
    true,
    'tutorial',
    'chatbot'
),
(
    'tutorial-broadcast',
    'Panduan Lengkap & Tutorial Modul Broadcast',
    '{"video_urls":[],"items":[{"title":"1. Pengenalan Modul Broadcast & Kampanye Massal","body":"Modul Broadcast memungkinkan pengiriman pesan massal ke ribuan kontak pelanggan secara terjadwal dan aman dengan fitur anti-banned cerdas, rotasi nomor, dan jeda pengiriman."},{"title":"2. Mempersiapkan Daftar Kontak & Label Target","body":"1. Pastikan kontak target sudah memiliki tag / label yang sesuai di menu Contacts.\n2. Anda juga dapat mengimpor file Excel / CSV kontak baru dengan mudah di menu Contacts."},{"title":"3. Membuat & Menjadwalkan Kampanye Broadcast","body":"1. Buka menu Broadcast → Create Campaign.\n2. Tulis pesan dengan personalisasi nama dinamis {name}.\n3. Pilih perangkat pengirim, jadwal pengiriman, dan jeda delay aman.\n4. Klik Mulai Kampanye untuk mengirim pesan."}]}',
    'Pelajari cara mengirimkan pesan massal ke ribuan kontak pelanggan secara terjadwal dan aman dengan fitur anti-banned cerdas.',
    true,
    'tutorial',
    'broadcast'
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    meta_description = EXCLUDED.meta_description,
    is_published = true,
    page_type = EXCLUDED.page_type,
    target_menu = EXCLUDED.target_menu,
    updated_at = NOW();
