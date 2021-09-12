import Hapi from '@hapi/hapi'
import Joi from 'joi';
import { API_AUTH_STATEGY, authenticateHandler, JWT_ALGORITHM, JWT_SECRET, loginHandler, validateAPIToken } from './auth-handlers';

export const authPlugin: Hapi.Plugin<null> = {
  name: 'app/auth',
  dependencies: ['prisma', 'hapi-auth-jwt2', 'app/email'],
  register: async (server: Hapi.Server) => {
    // Define the authentication strategy which uses the `jwt` authentication scheme
    server.auth.strategy(API_AUTH_STATEGY, 'jwt', {
      key: JWT_SECRET,
      verifyOptions: { algorithms: [JWT_ALGORITHM] },
      validate: validateAPIToken,
    })

    // Set the default authentication strategy for API routes, unless explicitly disabled
    server.auth.default(API_AUTH_STATEGY)

    return server.route([
      {
        method: 'POST',
        path: '/login', // Endpoint to login or register and to send the short-lived token
        handler: loginHandler,
        options: {
          auth: false,
          validate: {
            payload: Joi.object({
              email: Joi.string().email().required(),
            }),
          },
        },
      },
      {
        method: 'POST',
        path: '/authenticate',
        handler: authenticateHandler,
        options: {
          auth: false,
          validate: {
            payload: Joi.object({
              email: Joi.string()
                .email()
                .required(),
              emailToken: Joi.string().required(),
            }),
          },
        },
      }
    ])
  }
}
