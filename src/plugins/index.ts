import { emailPlugin } from './email/email';
import { prismaPlugin } from './prisma/prisma';
import { statusPlugin } from './status/status';
import { usersPlugin } from './users';
import hapiAuthJWT from 'hapi-auth-jwt2';
import { authPlugin } from './auth';

export const plugins = [
  hapiAuthJWT,
  authPlugin,
  statusPlugin,
  prismaPlugin,
  usersPlugin,
  emailPlugin,
];
