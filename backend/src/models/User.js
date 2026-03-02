const pool = require('../config/database');

class User {
  static async create({ email, passwordHash, fullName, userType, phone }) {
    const query = `
      INSERT INTO users (email, password_hash, full_name, user_type, phone)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, full_name, user_type, phone, created_at
    `;
    const values = [email, passwordHash, fullName, userType, phone];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT id, email, full_name, user_type, phone, created_at FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByIdWithPassword(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async update(id, fields) {
    const allowedFields = ['full_name', 'phone'];
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
    values.push(id);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, full_name, user_type, phone, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async count(userType = null) {
    let query = 'SELECT COUNT(*) FROM users';
    const values = [];
    
    if (userType) {
      query += ' WHERE user_type = $1';
      values.push(userType);
    }

    const result = await pool.query(query, values);
    return parseInt(result.rows[0].count);
  }
}

module.exports = User;
