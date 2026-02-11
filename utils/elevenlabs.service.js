const axios = require('axios')

const { ELEVENLABS_API_KEY } = process.env

if (!ELEVENLABS_API_KEY) {
  console.warn('[elevenlabs] Missing ELEVENLABS_API_KEY env var.')
}

const client = axios.create({
  baseURL: 'https://api.elevenlabs.io/v1',
  timeout: 30000,
  headers: {
    'xi-api-key': ELEVENLABS_API_KEY,
  },
})

async function fetchAgents({ pageSize = 100, search } = {}) {
  try {
    const res = await client.get('/convai/agents', {
      params: { page_size: pageSize, search },
    })
    return { agents: Array.isArray(res.data?.agents) ? res.data.agents : [] }
  } catch (e) {
    if (e?.response?.status === 404) {
      const res = await client.get('/agents')
      const list = Array.isArray(res.data?.agents)
        ? res.data.agents
        : Array.isArray(res.data)
          ? res.data
          : []
      return { agents: list }
    }
    throw new Error('ElevenLabs agents fetch failed')
  }
}

async function fetchConversations({
  pageSize = 100,
  agent_id,
  search,
} = {}) {
  try {
    const res = await client.get('/convai/conversations', {
      params: {
        page_size: pageSize,
        agent_id,
        search,
        summary_mode: 'exclude',
      },
    })
    return {
      conversations: Array.isArray(res.data?.conversations)
        ? res.data.conversations
        : [],
    }
  } catch (e) {
    if (e?.response?.status === 404) {
      const res = await client.get('/conversations')
      const list = Array.isArray(res.data?.conversations)
        ? res.data.conversations
        : Array.isArray(res.data)
          ? res.data
          : []
      return { conversations: list }
    }
    throw new Error('ElevenLabs conversations fetch failed')
  }
}

module.exports = { fetchAgents, fetchConversations }

