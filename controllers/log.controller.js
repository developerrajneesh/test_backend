const { supabaseAdmin } = require('../config/supabase')
const { ApiError } = require('../middleweres/error.middleware')

async function logActivity(action, description) {
  if (!supabaseAdmin) return

  const { error } = await supabaseAdmin.from('activity_logs').insert([
    {
      action,
      description,
    },
  ])

  if (error) {
    console.warn('[logs] failed to insert activity log:', error.message)
  }
}

async function createLog(req, res, next) {
  try {
    if (!supabaseAdmin) {
      throw new ApiError(
        500,
        'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
      )
    }

    const { action, description } = req.body || {}
    if (!action) throw new ApiError(400, 'action is required')

    const { data, error } = await supabaseAdmin
      .from('activity_logs')
      .insert([{ action, description: description || null }])
      .select('*')
      .single()

    if (error) {
      const msg = error?.message || 'Supabase insert failed'
      const missingTable =
        msg.includes("Could not find the table 'public.activity_logs'") ||
        msg.includes('schema cache') ||
        msg.includes('activity_logs')

      if (missingTable) {
        throw new ApiError(
          500,
          "Supabase table 'public.activity_logs' is missing or not in the schema cache. Run backend/supabase.sql in Supabase SQL editor, then reload the Supabase API schema cache.",
          { supabaseMessage: msg }
        )
      }

      throw new ApiError(500, msg)
    }

    res.status(201).json({ data })
  } catch (e) {
    next(e)
  }
}

module.exports = { createLog, logActivity }

