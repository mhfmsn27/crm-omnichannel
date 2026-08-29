/**
 * Predictive AI Lead Scoring & Win-Probability Service
 * Analyzes conversation intent, engagement velocity, and customer purchasing signals
 */
import pool from '../config/db.js';

export const calculateLeadScore = async (conversationId, organizationId) => {
    try {
        // 1. Fetch recent messages
        const msgRes = await pool.query(
            `SELECT content, from_me, created_at 
             FROM messages 
             WHERE conversation_id = $1 
             ORDER BY created_at DESC LIMIT 30`,
            [conversationId]
        );

        const messages = msgRes.rows;
        if (messages.length === 0) {
            return { score: 10, grade: 'cold', reasons: ['Belum ada riwayat pesan'], next_best_action: 'Mulai sapa calon prospek' };
        }

        let score = 20; // Base score
        const reasons = [];

        const customerMessages = messages.filter(m => !m.from_me);
        const customerText = customerMessages.map(m => (m.content || '').toLowerCase()).join(' ');

        // Intent Keyword Scoring
        const highIntentKeywords = ['harga', 'ongkir', 'pesan', 'beli', 'invoice', 'transfer', 'rekening', 'ready', 'bayar', 'checkout', 'spesifikasi', 'diskon', 'dp'];
        const mediumIntentKeywords = ['tanya', 'lokasi', 'toko', 'katalog', 'sample', 'contoh', 'ukuran', 'warna', 'garansi'];

        let highHits = 0;
        highIntentKeywords.forEach(kw => {
            if (customerText.includes(kw)) highHits++;
        });

        let medHits = 0;
        mediumIntentKeywords.forEach(kw => {
            if (customerText.includes(kw)) medHits++;
        });

        if (highHits > 0) {
            const added = Math.min(45, highHits * 15);
            score += added;
            reasons.push(`Menanyakan sinyal pembelian kuat (${highHits} kata kunci transaksi)`);
        }

        if (medHits > 0) {
            const added = Math.min(20, medHits * 8);
            score += added;
            reasons.push(`Tertarik dengan katalog produk/spesifikasi (${medHits} kata kunci)`);
        }

        // Engagement Velocity (Customer reply count)
        if (customerMessages.length >= 5) {
            score += 15;
            reasons.push(`Interaksi responsif (${customerMessages.length} pesan dari pelanggan)`);
        } else if (customerMessages.length >= 2) {
            score += 8;
            reasons.push('Terjadi percakapan dua arah');
        }

        // Check if contact has past invoices
        const invRes = await pool.query(
            `SELECT COUNT(*) as invoice_count, SUM(paid_amount) as total_spent 
             FROM invoices 
             WHERE contact_id = (SELECT contact_id FROM conversations WHERE id = $1)
               AND organization_id = $2`,
            [conversationId, organizationId]
        );

        if (invRes.rows.length > 0 && parseInt(invRes.rows[0].invoice_count) > 0) {
            score += 15;
            reasons.push(`Pelanggan setia (Pernah bertransaksi ${invRes.rows[0].invoice_count} kali sebelumnya)`);
        }

        // Clamp score between 0 and 100
        score = Math.min(100, Math.max(5, score));

        let grade = 'cold';
        let nextBestAction = 'Kirimkan katalog produk dan tanyakan kebutuhan prospek';

        if (score >= 75) {
            grade = 'hot';
            nextBestAction = '🔥 Prospek sangat siap closing! Segera tawarkan tautan pembayaran / invoice atau opsi DP termin';
        } else if (score >= 45) {
            grade = 'warm';
            nextBestAction = '⚡ Berikan konsultasi produk, testimoni pembeli lain, atau voucher promo terbatas';
        }

        // Update conversation record
        await pool.query(
            `UPDATE conversations 
             SET lead_score = $1, lead_grade = $2, lead_score_reasons = $3, last_scored_at = NOW() 
             WHERE id = $4 AND organization_id = $5`,
            [score, grade, JSON.stringify(reasons), conversationId, organizationId]
        );

        return {
            score,
            grade,
            reasons,
            next_best_action: nextBestAction
        };

    } catch (err) {
        console.error('[LeadScoring Error]:', err.message);
        return { score: 20, grade: 'cold', reasons: ['Gagal memproses skoring AI'], next_best_action: 'Hubungi prospek secara manual' };
    }
};
