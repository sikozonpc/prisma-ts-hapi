import Hapi from '@hapi/hapi'
import {
  createUser,
  deleteUser,
  getUser,
  updateUser,
} from './users-handlers';

export const register = (server: Hapi.Server) => server.route(
  [
    {
      method: 'POST',
      path: '/users',
      options: createUser,
    },
    {
      method: 'GET',
      path: '/users/{userId}',
      options: getUser,
    },
    {
      method: 'DELETE',
      path: '/users/{userId}',
      options: deleteUser,
    },
    {
      method: 'PUT',
      path: '/users/{userId}',
      options: updateUser,
    },
  ]
);

export const usersPlugin = {
  name: 'app/users',
  dependencies: ['prisma'],
  register,
};
