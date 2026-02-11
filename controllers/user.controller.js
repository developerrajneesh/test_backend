const { pool, query } = require('../config/db')
const { ApiError } = require('../middleweres/error.middleware')
const { parsePagination } = require('../utils/pagination')
const { logActivity } = require('./log.controller')

function mapUserRow(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

async function createUser(req, res, next) {
  try {
    const payload = req.body || {}

    const sql =
      'INSERT INTO users (name, email, role, status) VALUES (?, ?, ?, ?)'
    let result
    try {
      ;[result] = await pool.execute(sql, [
        payload.name,
        payload.email,
        payload.role || 'user',
        payload.status || 'active',
      ])
    } catch (e) {
      if (e?.code === 'ER_DUP_ENTRY') {
        throw new ApiError(409, 'Email already exists')
      }
      throw e
    }

    const id = result.insertId
    const rows = await query(
      'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL',
      [id]
    )
    const user = mapUserRow(rows[0])

    await logActivity(
      'User created',
      `Created user id=${id} email=${payload.email}`
    )

    res.status(201).json({ data: user })
  } catch (e) {
    next(e)
  }
}

async function getUsers(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query || {})
    const search = (req.query?.search || '').trim()
    const role = (req.query?.role || '').trim()
    const status = (req.query?.status || '').trim()

    const where = ['deleted_at IS NULL']
    const params = []

    if (search) {
      where.push('(name LIKE ? OR email LIKE ?)')
      const like = `%${search}%`
      params.push(like, like)
    }
    if (role) {
      where.push('role = ?')
      params.push(role)
    }
    if (status) {
      where.push('status = ?')
      params.push(status)
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const countRows = await query(
      `SELECT COUNT(*) AS total FROM users ${whereSql}`,
      params
    )
    const total = Number(countRows?.[0]?.total || 0)

    const dataRows = await query(
      `SELECT * FROM users ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )

    res.json({
      page,
      limit,
      total,
      data: dataRows.map(mapUserRow),
    })
  } catch (e) {
    next(e)
  }
}

async function updateUser(req, res, next) {
  try {
    const userId = Number(req.params?.id)
    if (!userId) throw new ApiError(400, 'Invalid user id')

    const payload = req.body || {}
    const updateFields = []
    const queryParams = []

    for (const key of ['name', 'email', 'role', 'status']) {
      if (payload[key] !== undefined) {
        updateFields.push(`${key} = ?`)
        queryParams.push(payload[key])
      }
    }
    if (updateFields.length === 0) throw new ApiError(400, 'No fields to update')

    queryParams.push(userId)

    try {
      const [result] = await pool.execute(
        `UPDATE users SET ${updateFields.join(
          ', '
        )} WHERE id = ? AND deleted_at IS NULL`,
        queryParams
      )
      if (result.affectedRows === 0) throw new ApiError(404, 'User not found')
    } catch (e) {
      if (e?.code === 'ER_DUP_ENTRY') {
        throw new ApiError(409, 'Email already exists')
      }
      throw e
    }

    const rows = await query(
      'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL',
      [userId]
    )
    const user = mapUserRow(rows[0])

    await logActivity('User updated', `Updated user id=${userId}`)

    res.json({ data: user })
  } catch (e) {
    next(e)
  }
}

async function deleteUser(req, res, next) {
  try {
    const userId = Number(req.params?.id)
    if (!userId) throw new ApiError(400, 'Invalid user id')

    const [result] = await pool.execute(
      `UPDATE users
       SET deleted_at = NOW(), status = 'deleted'
       WHERE id = ? AND deleted_at IS NULL`,
      [userId]
    )
    if (result.affectedRows === 0) throw new ApiError(404, 'User not found')

    await logActivity('User deleted', `Soft deleted user id=${userId}`)

    res.status(204).send()
  } catch (e) {
    next(e)
  }
}

module.exports = { createUser, getUsers, updateUser, deleteUser }

