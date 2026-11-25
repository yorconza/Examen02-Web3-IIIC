import { initTRPC, TRPCError } from '@trpc/server';
import type { CreateHTTPContextOptions } from '@trpc/server/adapters/standalone';
import jwt from 'jsonwebtoken';

export type UserPayload = { id: string; email: string; role: 'USER' | 'ADMIN' };


// Se ejecuta en CADA petición: lee el header Authorization y valida el JWT
export function createContext({ req }: CreateHTTPContextOptions) {

    let user: UserPayload | null = null;
    const header = req.headers.authorization ?? '';

    if (header.startsWith('Bearer ')) {
        try {
        // Verifica la firma y la fecha de expiración del token
        user = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as unknown as UserPayload;
        } catch {
        user = null; // token vencido, alterado o inválido
        }
    }
    return { user };
}
export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure; // cualquiera puede llamarlo

// Middleware 1: exige sesión activa (token válido)
const isAuthed = t.middleware(({ ctx, next }) => {

    if (!ctx.user) {
        throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'No se ha proporcionado un token de autenticación válido.',
        });
    }
    return next({ ctx: { user: ctx.user } });
});

// Middleware 2: exige rol ADMIN
const isAdmin = t.middleware(({ ctx, next }) => {

    if (ctx.user?.role !== 'ADMIN') {
        throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Acceso denegado. Se requiere rol de Administrador.',
        });
    }
    return next();
});

export const protectedProcedure = t.procedure.use(isAuthed);           // USER o ADMIN
export const adminProcedure = t.procedure.use(isAuthed).use(isAdmin);  // solo ADMIN
