import Boom from '@hapi/boom'
import Hapi from '@hapi/hapi'
import { TokenType, UserRole } from '@prisma/client'
import { add } from 'date-fns'
import Joi from 'joi';
import jwt from 'jsonwebtoken';

export const EMAIL_TOKEN_EXPIRATION_MINUTES = 10
export const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_SECRET_JWT_SECRET'
export const JWT_ALGORITHM = 'HS256'
const AUTHENTICATION_TOKEN_EXPIRATION_HOURS = 12

export const API_AUTH_STATEGY = 'API'



interface LoginInput {
  email: string
}

export async function loginHandler(request: Hapi.Request, h: Hapi.ResponseToolkit) {
  const { prisma, sendEmailToken } = request.server.app
  const { email } = request.payload as LoginInput


  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { tokens: true }
    });
    const hasPendingToken = user && user.tokens.length > 0 && user.tokens
      .filter((token) => token.type === TokenType.EMAIL)
      .some((emailToken) => emailToken.expiration >= new Date() && emailToken.valid);
    if (hasPendingToken) {
      return Boom.teapot('User already has a valid pending invite');
    }

    const emailToken = generateEmailToken()
    const tokenExpiration = add(new Date(), {
      minutes: EMAIL_TOKEN_EXPIRATION_MINUTES,
    })

    // create a short lived token and update user or create if they don't exist
    const createdToken = await prisma.token.create({
      data: {
        emailToken,
        type: TokenType.EMAIL,
        expiration: tokenExpiration,
        user: {
          connectOrCreate: {
            create: {
              email,
            },
            where: {
              email,
            },
          },
        },
      },
    })

    await sendEmailToken(email, emailToken)

    return h.response().code(204)
  } catch (error) {
    console.dir((error as any))
    if (error instanceof Error) {
      return Boom.badImplementation(error.message)
    }
    return Boom.badImplementation(error as any)
  }
}

// Generate a random 8 digit number as the email token
function generateEmailToken(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString()
}


interface AuthenticateInput {
  email: string
  emailToken: string
}

export async function authenticateHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit,
) {
  const { prisma } = request.server.app
  const { email, emailToken } = request.payload as AuthenticateInput

  try {
    const fetchedEmailToken = await prisma.token.findUnique({
      where: {
        emailToken: emailToken,
      },
      include: {
        user: true,
      },
    })


    if (!fetchedEmailToken || !fetchedEmailToken.valid) {
      return Boom.unauthorized()
    }

    const isEmailTokenExpired = fetchedEmailToken.expiration < new Date();
    if (isEmailTokenExpired) {
      return Boom.unauthorized('Token expired')
    }

    const isUserTokenEmail = fetchedEmailToken.user.email === email;
    if (!isUserTokenEmail) {
      return Boom.unauthorized()
    }

    const tokenExpiration = add(new Date(), {
      hours: AUTHENTICATION_TOKEN_EXPIRATION_HOURS,
    })
    // Persist token in DB so it's stateful
    const createdToken = await prisma.token.create({
      data: {
        type: TokenType.API,
        expiration: tokenExpiration,
        user: {
          connect: {
            email,
          },
        },
      },
    })

    // Invalidate the email token after it's been used
    await prisma.token.update({
      where: {
        id: fetchedEmailToken.id,
      },
      data: {
        valid: false,
      },
    })

    const authToken = generateAuthToken(createdToken.id)
    return h.response().code(200).header('Authorization', authToken)
  } catch (error) {
    return Boom.badImplementation((error as any).message)
  }
}

// Generate a signed JWT token with the tokenId in the payload
function generateAuthToken(tokenId: number): string {
  const jwtPayload = { tokenId }

  return jwt.sign(jwtPayload, JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    noTimestamp: true,
  })
}

interface APITokenPayload {
  tokenId?: number,
}

const apiTokenSchema = Joi.object({
  tokenId: Joi.number().integer().required(),
})

// Function will be called on every request using the auth strategy
export const validateAPIToken = async (
  decoded: APITokenPayload,
  request: Hapi.Request,
  h: Hapi.ResponseToolkit,
) => {
  const { prisma } = request.server.app
  const { tokenId } = decoded
  // Validate the token payload adheres to the schema
  const { error } = apiTokenSchema.validate(decoded)

  if (error) {
    request.log(['error', 'auth'], `API token error: ${error.message}`)
    return { isValid: false }
  }

  try {
    // Fetch the token from DB to verify it's valid
    const fetchedToken = await prisma.token.findUnique({
      where: { id: tokenId },
      include: { user: true },
    })

    // Check if token could be found in database and is valid
    if (!fetchedToken || !fetchedToken.valid) {
      return { isValid: false, errorMessage: 'Invalid Token' }
    }

    const isExpired = fetchedToken.expiration < new Date();
    if (isExpired) {
      return { isValid: false, errorMessage: 'Token expired' }
    }

    // Get all the courses that the user is the teacher of
    const teacherOf = await prisma.courseEnrollment.findMany({
      where: {
        userId: fetchedToken.userId,
        role: UserRole.TEACHER,
      },
      select: {
        courseId: true,
      },
    })

    // The token is valid. Make the `userId`, `isAdmin`, and `teacherOf` to `credentials` which is available in route handlers via `request.auth.credentials`
    return {
      isValid: true,
      credentials: {
        tokenId: decoded.tokenId,
        userId: fetchedToken.userId,
        isAdmin: fetchedToken.user.isAdmin,
        // convert teacherOf from an array of objects to an array of numbers
        teacherOf: teacherOf.map(({ courseId }) => courseId),
      },
    }
  } catch (error: any) {
    request.log(['error', 'auth', 'db'], error)
    return { isValid: false }
  }
}