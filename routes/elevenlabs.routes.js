const express = require('express')
const {
  syncAgents,
  syncConversations,
} = require('../controllers/elevenlabs.controller')

const router = express.Router()

router.get('/agents', syncAgents)
router.get('/conversations', syncConversations)

module.exports = router

