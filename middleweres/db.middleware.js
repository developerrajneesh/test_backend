const { ping } = require('../config/db')
const { ApiError } = require('./error.middleware')

function requireDb() {
  return async (_req, _res, next) => {
    try {
      await ping()
      next()
    } catch (e) {
      next(
        new ApiError(
          503,
          'MySQL is not reachable. Start MySQL and apply schema.sql.',
          { code: e?.code || e?.message }
        )
      )
    }
  }
}

module.exports = { requireDb }

