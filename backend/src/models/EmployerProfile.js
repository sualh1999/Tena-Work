const pool = require('../config/database');

class EmployerProfile {
  static async create({ 
    userId, 
    companyName, 
    companyDescription, 
    position, 
    city, 
    address, 
    logoUrl 
  }) {
    const query = `
      INSERT INTO employer_profiles 
      (user_id, company_name, company_description, position, city, address, logo_url, company_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING *
    `;
    const values = [userId, companyName, companyDescription, position, city, address, logoUrl];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const query = 'SELECT * FROM employer_profiles WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  static async update(userId, fields) {
    const allowedFields = [
      'company_name', 
      'company_description', 
      'position', 
      'city', 
      'address', 
      'logo_url'
    ];
    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.keys(fields).forEach(key => {
      if (allowedFields.includes(key) && fields[key] !== undefined) {
        updates.push(`${key} = $${paramCount}`);
        values.push(fields[key]);
        paramCount++;
      }
    });

    if (updates.length === 0) {
      return null;
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `
      UPDATE employer_profiles 
      SET ${updates.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async updateStatus(userId, status, reason, approvedBy) {
    const query = `
      UPDATE employer_profiles 
      SET company_status = $1,
          approval_reason = $2,
          approved_by = $3,
          approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE NULL END,
          updated_at = NOW()
      WHERE user_id = $4
      RETURNING *
    `;
    const values = [status, reason, approvedBy, userId];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findPending(page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    
    const countQuery = `
      SELECT COUNT(*) FROM employer_profiles WHERE company_status = 'pending'
    `;
    const countResult = await pool.query(countQuery);
    const totalItems = parseInt(countResult.rows[0].count);

    const query = `
      SELECT 
        ep.*,
        u.full_name,
        u.email,
        u.phone
      FROM employer_profiles ep
      JOIN users u ON ep.user_id = u.id
      WHERE ep.company_status = 'pending'
      ORDER BY ep.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [pageSize, offset]);

    return {
      items: result.rows,
      pagination: {
        page,
        page_size: pageSize,
        total_items: totalItems,
        total_pages: Math.ceil(totalItems / pageSize)
      }
    };
  }

  static async getCompleteProfile(userId) {
    const query = `
      SELECT 
        u.id as user_id,
        u.full_name,
        u.email,
        u.phone,
        ep.company_name,
        ep.company_description,
        ep.position,
        ep.city,
        ep.address,
        ep.logo_url,
        ep.company_status,
        ep.approval_reason,
        ep.approved_at,
        ep.created_at,
        ep.updated_at
      FROM users u
      LEFT JOIN employer_profiles ep ON u.id = ep.user_id
      WHERE u.id = $1 AND u.user_type = 'employer'
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  static async countByStatus(status) {
    const query = 'SELECT COUNT(*) FROM employer_profiles WHERE company_status = $1';
    const result = await pool.query(query, [status]);
    return parseInt(result.rows[0].count);
  }
}

module.exports = EmployerProfile;
