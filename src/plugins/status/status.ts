import Hapi from '@hapi/hapi'

export const statusPlugin: Hapi.Plugin<null> = {
  name: 'app/status',
  register: async function (server: Hapi.Server) {
    server.route({
      method: 'GET',
      path: '/',
      handler: (_, h: Hapi.ResponseToolkit) => {
        return h.response({ up: true }).code(200)
      },
    })
  },
};
