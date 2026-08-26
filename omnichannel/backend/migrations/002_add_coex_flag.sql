INSERT INTO
    system_feature_flags (key, name, category, is_active)
VALUES
    (
        'channel_wa_coex',
        'WhatsApp Official (CoEx)',
        'core_system',
        true
    ) ON CONFLICT (key) DO NOTHING;