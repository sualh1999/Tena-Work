const pool = require('../config/database');

class ProfessionalProfile {
  static async create({ userId, bio, location, willingToTravel, languagesSpoken, resumeUrl }) {
    const query = `
      INSERT INTO professional_profiles 
      (user_id, bio, location, willing_to_travel, languages_spoken, resume_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [userId, bio, location, willingToTravel, languagesSpoken, resumeUrl];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const query = 'SELECT * FROM professional_profiles WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  static async update(userId, fields) {
    const allowedFields = ['bio', 'location', 'willing_to_travel', 'languages_spoken', 'resume_url'];
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
      UPDATE professional_profiles 
      SET ${updates.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getCompleteProfile(userId) {
    const query = `
      SELECT 
        u.id as user_id,
        u.full_name,
        u.email,
        u.phone,
        pp.bio,
        pp.location,
        pp.willing_to_travel,
        pp.languages_spoken,
        pp.resume_url,
        pp.created_at,
        pp.updated_at
      FROM users u
      LEFT JOIN professional_profiles pp ON u.id = pp.user_id
      WHERE u.id = $1 AND u.user_type = 'professional'
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  static async findByUserIds(userIds) {
    if (!userIds || userIds.length === 0) return [];
    
    const query = `
      SELECT 
        u.id as user_id,
        u.full_name,
        pp.bio,
        pp.location,
        pp.languages_spoken
      FROM users u
      LEFT JOIN professional_profiles pp ON u.id = pp.user_id
      WHERE u.id = ANY($1) AND u.user_type = 'professional'
    `;
    const result = await pool.query(query, [userIds]);
    return result.rows;
  }
}

module.exports = ProfessionalProfile;
