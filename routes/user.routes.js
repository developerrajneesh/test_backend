const express = require('express')
const { z } = require('zod')
const {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
} = require('../controllers/user.controller')
const { validate } = require('../middleweres/validate.middleware')

const router = express.Router()

const idParams = z.object({
  id: z.coerce.number().int().positive(),
})

router.get('/', getUsers)

router.post(
  '/',
  validate({
    body: z.object({
      name: z.string().min(1).max(255),
      email: z.string().email().max(255),
      role: z.string().min(1).max(64).optional(),
      status: z.string().min(1).max(32).optional(),
    }),
  }),
  createUser
)

router.put(
  '/:id',
  validate({
    params: idParams,
    body: z
      .object({
        name: z.string().min(1).max(255).optional(),
        email: z.string().email().max(255).optional(),
        role: z.string().min(1).max(64).optional(),
        status: z.string().min(1).max(32).optional(),
      })
      .refine((v) => Object.keys(v).length > 0, {
        message: 'At least one field must be provided',
      }),
  }),
  updateUser
)

router.delete('/:id', validate({ params: idParams }), deleteUser)

module.exports = router

