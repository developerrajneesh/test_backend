const express = require('express')
const { z } = require('zod')
const { createLog } = require('../controllers/log.controller')
const { validate } = require('../middleweres/validate.middleware')

const router = express.Router()

router.post(
  '/',
  validate({
    body: z.object({
      action: z.string().min(1).max(255),
      description: z.string().max(2000).optional(),
    }),
  }),
  createLog
)

module.exports = router

