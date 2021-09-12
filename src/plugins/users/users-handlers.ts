import Boom from '@hapi/boom'
import Hapi, { RouteOptions } from '@hapi/hapi'
import Joi from 'joi'
import { AuthenticatedRequest } from '../types'
import { API_AUTH_STATEGY } from '../auth/auth-handlers'
import { isRequestedUserOrAdmin } from '../../util/auth-helpers'


interface UserInput {
  firstName: string
  lastName: string
  email: string
  social: {
    facebook?: string
    twitter?: string
    github?: string
    website?: string
  }
}

const userInputValidator = Joi.object({
  firstName: Joi.string().alter({
    create: schema => schema.required(),
    update: schema => schema.optional(),
  }),
  lastName: Joi.string().alter({
    create: schema => schema.required(),
    update: schema => schema.optional(),
  }),
  email: Joi.string()
    .email()
    .alter({
      create: schema => schema.required(),
      update: schema => schema.optional(),
    }),
  social: Joi.object({
    facebook: Joi.string().optional(),
    twitter: Joi.string().optional(),
    github: Joi.string().optional(),
    website: Joi.string().optional(),
  }).optional(),
})

const createUserValidator = userInputValidator.tailor('create')
const updateUserValidator = userInputValidator.tailor('update')

export const createUser: RouteOptions = {
  validate: {
    payload: createUserValidator,
  },
  handler: async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { prisma } = request.server.app
    const payload = request.payload as UserInput

    try {
      const createdUser = await prisma.user.create({
        data: {
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email,
          social: JSON.stringify(payload.social),
        },
        select: {
          id: true,
        },
      })

      return h.response(createdUser).code(201)
    } catch (error) {
      console.log(error)
    }
  },
}

interface GetUserRequest extends AuthenticatedRequest {
  params: { userId: number }
}

export const getUser: RouteOptions = {
  validate: {
    params: Joi.object({
      userId: Joi.number().integer().required(),
    })
  },
  pre: [isRequestedUserOrAdmin],
  auth: { mode: 'required', strategy: API_AUTH_STATEGY },
  handler: async (request: GetUserRequest, h: Hapi.ResponseToolkit) => {
    const { prisma } = request.server.app
    const { userId } = request.params;

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return h.response().code(404)
      }
      return h.response(user).code(200)
    } catch (error) {
      console.log(error)
      return Boom.badImplementation();
    }
  }
}

export const deleteUser: RouteOptions = {
  validate: {
    params: Joi.object({
      userId: Joi.number().integer().required(),
    })
  },
  handler: async (request: GetUserRequest, h: Hapi.ResponseToolkit) => {
    const { prisma } = request.server.app
    const { userId } = request.params;

    try {
      await prisma.user.delete({
        where: { id: userId }
      })

      return h.response().code(204)
    } catch (error) {
      console.log(error)
      return Boom.badImplementation();
    }
  }
}

export const updateUser: RouteOptions = {
  validate: {
    payload: updateUserValidator,
  },
  handler: async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { prisma } = request.server.app
    const userId = parseInt(request.params.userId, 10)
    const payload = request.payload as Partial<UserInput>
    console.log(userId);
    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: payload,
      })

      return h.response(updatedUser).code(200)
    } catch (err) {
      console.log(err)
      return h.response().code(500)
    }
  },
}