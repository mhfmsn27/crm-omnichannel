
import pool from '../../config/db.js';

// GET /api/sa/plans
export const getPlans = async (req, res) => {
  try {
    const query = `
      SELECT p.*, 
             (
               SELECT count(*) 
               FROM organizations o 
               WHERE o.plan_id = p.id AND (o.subscription_status = 'active' OR o.subscription_status = 'trialing')
             ) as subscriber_count,
             COALESCE(
               json_agg(
                 json_build_object(
                   'code', pf.feature_code,
                   'is_enabled', pf.is_enabled,
                   'limit_value', pf.limit_value
                 )
               ) FILTER (WHERE pf.id IS NOT NULL), 
               '[]'
             ) as features
      FROM plans p
      LEFT JOIN plan_features pf ON p.id = pf.plan_id
      WHERE p.is_active = true
      GROUP BY p.id
      ORDER BY p.price_monthly ASC
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/sa/plans/:id
export const getPlanById = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT p.*, 
                COALESCE(
                json_agg(
                    json_build_object(
                    'code', pf.feature_code,
                    'is_enabled', pf.is_enabled,
                    'limit_value', pf.limit_value
                    )
                ) FILTER (WHERE pf.id IS NOT NULL), 
                '[]'
                ) as features
            FROM plans p
            LEFT JOIN plan_features pf ON p.id = pf.plan_id
            WHERE p.id = $1
            GROUP BY p.id
        `;
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Plan not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// NEW: GET /api/public/plans/:id (Public Access for Checkout)
export const getPublicPlanById = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `SELECT id, name, description, price_monthly, price_yearly, price_monthly_promo, price_yearly_promo, trial_days, is_trial_allowed FROM plans WHERE id = $1 AND is_active = true`;
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) return res.status(404).json({ error: 'Plan not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/sa/plans
export const createPlan = async (req, res) => {
  const { name, description, price_monthly, price_yearly, price_monthly_promo, price_yearly_promo, features, trial_days, is_trial_allowed } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const planRes = await client.query(
      `INSERT INTO plans (name, description, price_monthly, price_yearly, price_monthly_promo, price_yearly_promo, trial_days, is_trial_allowed) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [name, description, price_monthly, price_yearly, price_monthly_promo || null, price_yearly_promo || null, trial_days || 0, is_trial_allowed || false]
    );
    const planId = planRes.rows[0].id;

    if (features && Array.isArray(features)) {
      for (const feat of features) {
        await client.query(
          `INSERT INTO plan_features (plan_id, feature_code, is_enabled, limit_value) 
           VALUES ($1, $2, $3, $4)`,
          [planId, feat.code, feat.is_enabled, feat.limit_value]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Plan created successfully', id: planId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// PUT /api/sa/plans/:id
export const updatePlan = async (req, res) => {
  const { id } = req.params;
  const { name, description, price_monthly, price_yearly, price_monthly_promo, price_yearly_promo, features, trial_days, is_trial_allowed } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE plans 
       SET name = $1, description = $2, price_monthly = $3, price_yearly = $4, price_monthly_promo = $5, price_yearly_promo = $6, trial_days = $7, is_trial_allowed = $8, updated_at = NOW() 
       WHERE id = $9`,
      [name, description, price_monthly, price_yearly, price_monthly_promo || null, price_yearly_promo || null, trial_days || 0, is_trial_allowed || false, id]
    );

    if (features && Array.isArray(features)) {
      for (const feat of features) {
        const check = await client.query(
            'SELECT id FROM plan_features WHERE plan_id = $1 AND feature_code = $2',
            [id, feat.code]
        );

        if (check.rows.length > 0) {
            await client.query(
                `UPDATE plan_features SET is_enabled = $1, limit_value = $2 WHERE id = $3`,
                [feat.is_enabled, feat.limit_value, check.rows[0].id]
            );
        } else {
            await client.query(
                `INSERT INTO plan_features (plan_id, feature_code, is_enabled, limit_value) 
                 VALUES ($1, $2, $3, $4)`,
                [id, feat.code, feat.is_enabled, feat.limit_value]
            );
        }
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Plan updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// DELETE /api/sa/plans/:id
export const deletePlan = async (req, res) => {
  const { id } = req.params;
  try {
    const usageRes = await pool.query(
      'SELECT count(*) FROM organizations WHERE plan_id = $1', 
      [id]
    );
    
    const usageCount = parseInt(usageRes.rows[0].count);

    if (usageCount > 0) {
      await pool.query('UPDATE plans SET is_active = false WHERE id = $1', [id]);
      return res.json({ message: 'Plan archived (Soft Deleted) because it has active subscribers.' });
    } else {
      await pool.query('DELETE FROM plans WHERE id = $1', [id]);
      return res.json({ message: 'Plan permanently deleted.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
