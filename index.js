require('dotenv').config()

const express = require('express')
const cors = require('cors')

const userRoutes = require('./routes/user.routes')
const elevenlabsRoutes = require('./routes/elevenlabs.routes')
const logRoutes = require('./routes/log.routes')
const { requireDb } = require('./middleweres/db.middleware')
const { notFound, errorHandler } = require('./middleweres/error.middleware')
const { supabaseAdmin } = require('./config/supabase')

const app = express()

app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    name: 'backend',
    message: 'API is running',
    endpoints: {
      health: '/health',
      users: '/api/users',
      elevenlabsAgents: '/api/elevenlabs/agents',
      elevenlabsConversations: '/api/elevenlabs/conversations',
      logs: '/api/logs',
    },
    ts: new Date().toISOString(),
  })
})

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    ts: new Date().toISOString(),
    deps: {
      mysqlConfigured: Boolean(
        process.env.MYSQL_HOST &&
          process.env.MYSQL_USER &&
          process.env.MYSQL_DATABASE
      ),
      supabaseConfigured: Boolean(supabaseAdmin),
      elevenlabsConfigured: Boolean(process.env.ELEVENLABS_API_KEY),
    },
  })
})

app.use('/api/users', requireDb(), userRoutes)
app.use('/api/elevenlabs', requireDb(), elevenlabsRoutes)
app.use('/api/logs', logRoutes)

app.use(notFound)
app.use(errorHandler)

const PORT = Number(process.env.PORT || 3001)

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`)
  })
}

module.exports = app

