import mongoose from 'mongoose';
import cors from 'cors';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { appRouter } from './router.js';
import { createContext } from './trpc.js';

// Conexión a MongoDB
await mongoose.connect(process.env.MONGO_URI!, { dbName: process.env.MONGO_DB });
console.log('Connected to MongoDB');

// CORS: permite que el front-end (otro puerto) llame a este servidor desde el navegador
const port = Number(process.env.PORT ?? 4000);
createHTTPServer({
    middleware: cors({ origin: 'http://localhost:5173' }),
    router: appRouter,
    createContext,
}).listen(port);

console.log(`tRPC server ready at http://localhost:${port}`);