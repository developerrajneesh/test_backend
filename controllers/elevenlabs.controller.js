const { pool, query } = require('../config/db')
const { parsePagination } = require('../utils/pagination')
const {
  fetchAgents,
  fetchConversations,
} = require('../utils/elevenlabs.service')
const { logActivity } = require('./log.controller')

function getListFromResponse(responseData, primaryKey) {
  if (!responseData) return []
  if (Array.isArray(responseData[primaryKey])) return responseData[primaryKey]
  if (Array.isArray(responseData.data)) return responseData.data
  if (Array.isArray(responseData)) return responseData
  return []
}

function extractAgentFields(raw) {
  const agentId = raw?.agent_id || raw?.agentId || raw?.id
  const name = raw?.name || raw?.display_name || raw?.displayName || null
  const voiceId = raw?.voice_id || raw?.voiceId || null
  return { agentId, name, voiceId, raw }
}

function extractConversationFields(raw) {
  const conversationId =
    raw?.conversation_id || raw?.conversationId || raw?.id || null
  const agentId = raw?.agent_id || raw?.agentId || raw?.agent || null

  const startUnix =
    raw?.start_time_unix_secs ??
    raw?.startTimeUnixSecs ??
    raw?.started_at ??
    raw?.startedAt ??
    raw?.created_at ??
    null

  const durationSecs =
    raw?.call_duration_secs ??
    raw?.callDurationSecs ??
    raw?.duration_secs ??
    null

  const startedAt =
    typeof startUnix === 'number'
      ? new Date(startUnix * 1000).toISOString()
      : startUnix

  const endedAt =
    typeof startUnix === 'number' && typeof durationSecs === 'number'
      ? new Date((startUnix + durationSecs) * 1000).toISOString()
      : raw?.ended_at || raw?.endedAt || null

  return { conversationId, agentId, startedAt, endedAt, raw }
}

async function upsertAgentsToDb(agentRows) {
  if (!agentRows.length) return

  const insertValues = agentRows.map((agentRow) => [
    agentRow.agentId ?? null,
    agentRow.name ?? null,
    agentRow.voiceId ?? null,
  ])
  const placeholders = insertValues.map(() => '(?, ?, ?)').join(', ')
  const flatParams = insertValues.flat()

  const sql = `
    INSERT INTO elevenlabs_agents (agent_id, name, voice_id)
    VALUES ${placeholders}
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      voice_id = VALUES(voice_id),
      updated_at = NOW(),
      deleted_at = NULL
  `

  await pool.execute(sql, flatParams)
}

function safeDate(value) {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

async function upsertConversationsToDb(conversationRows) {
  if (!conversationRows.length) return

  const insertValues = conversationRows.map((conversationRow) => [
    conversationRow.conversationId ?? null,
    conversationRow.agentId ?? null,
    null,
    safeDate(conversationRow.startedAt),
    safeDate(conversationRow.endedAt),
    JSON.stringify(conversationRow.raw ?? {}),
  ])

  const placeholders = insertValues.map(() => '(?, ?, ?, ?, ?, ?)').join(', ')
  const flatParams = insertValues.flat()

  const sql = `
    INSERT INTO elevenlabs_conversations
      (conversation_id, agent_id, user_id, started_at, ended_at, metadata)
    VALUES ${placeholders}
    ON DUPLICATE KEY UPDATE
      agent_id = VALUES(agent_id),
      user_id = VALUES(user_id),
      started_at = VALUES(started_at),
      ended_at = VALUES(ended_at),
      metadata = VALUES(metadata),
      updated_at = NOW(),
      deleted_at = NULL
  `

  await pool.execute(sql, flatParams)
}

async function syncAgents(req, res, next) {
  try {
    let doSync = String(req.query?.sync || 'false') === 'true'

    if (!doSync) {
      const existing = await query(
        'SELECT COUNT(*) AS total FROM elevenlabs_agents WHERE deleted_at IS NULL'
      )
      if (Number(existing?.[0]?.total || 0) === 0) doSync = true
    }

    if (doSync) {
      const responseData = await fetchAgents()
      const list = getListFromResponse(responseData, 'agents')

      const agentRows = list
        .map(extractAgentFields)
        .filter((a) => a.agentId)

      await upsertAgentsToDb(agentRows)

      await logActivity(
        'ElevenLabs sync triggered',
        `Synced agents. count=${agentRows.length}`
      )
    }

    const rows = await query(
      `SELECT id, agent_id, name, voice_id, created_at, updated_at
       FROM elevenlabs_agents
       WHERE deleted_at IS NULL
       ORDER BY updated_at DESC`
    )

    res.json({
      data: rows,
      syncedAt: doSync ? new Date().toISOString() : null,
    })
  } catch (e) {
    next(e)
  }
}

async function syncConversations(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query || {})
    const agentId = String(req.query?.agentId || '').trim()

    const responseData = await fetchConversations({
      agent_id: agentId || undefined,
    })

    const list = getListFromResponse(responseData, 'conversations')

    const conversationRows = list
      .map(extractConversationFields)
      .filter((c) => c.conversationId && c.agentId)

    await upsertConversationsToDb(conversationRows)

    await logActivity(
      'ElevenLabs sync triggered',
      `Synced conversations. count=${conversationRows.length}`
    )

    const where = ['deleted_at IS NULL']
    const queryParams = []
    if (agentId) {
      where.push('agent_id = ?')
      queryParams.push(agentId)
    }
    const whereSql = `WHERE ${where.join(' AND ')}`

    const countRows = await query(
      `SELECT COUNT(*) AS total FROM elevenlabs_conversations ${whereSql}`,
      queryParams
    )
    const total = Number(countRows?.[0]?.total || 0)

    const rows = await query(
      `SELECT id, conversation_id, agent_id, user_id, started_at, ended_at, metadata, created_at, updated_at
       FROM elevenlabs_conversations
       ${whereSql}
       ORDER BY started_at DESC, created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    )

    res.json({
      page,
      limit,
      total,
      data: rows,
    })
  } catch (e) {
    next(e)
  }
}

module.exports = { syncAgents, syncConversations }

