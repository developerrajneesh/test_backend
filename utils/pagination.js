function parsePagination(query = {}) {
  const pageRaw = query.page
  const limitRaw = query.limit

  const page = Math.max(1, Number(pageRaw) || 1)
  const limit = Math.min(100, Math.max(1, Number(limitRaw) || 10))
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

module.exports = { parsePagination }

