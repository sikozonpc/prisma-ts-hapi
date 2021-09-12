import { createServer, startServer } from './src/server';

(async () => {
  try {
    let server = await createServer()
    server = await startServer(server);
  } catch (error) {
    console.log(error);
  }
})();