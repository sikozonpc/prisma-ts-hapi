import { Request, RequestAuth } from '@hapi/hapi'

export interface AuthenticatedRequest extends Request {
  auth: {
    credentials: {
      userId?: number,
      tokenId?: number,
      isAdmin?: boolean,
      teacherOf?: number[],
    }
  } & RequestAuth
}
