import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { router, publicProcedure } from '../trpc.js';
import { Users } from '../models.js';

// Firma el JWT con los datos del usuario y su rol (expira en 2 horas)
function createSession(user: { _id: unknown; email: string; role: string }) {

    const token = jwt.sign(
        { id: String(user._id), email: user.email, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '2h' },
    );
    
    return {
        token,
        user: { id: String(user._id), email: user.email, role: user.role },
    };
}

export const authRouter = router({
    // Inicio de sesión
    login: publicProcedure
        .input(z.object({ email: z.string().email(), password: z.string().min(1) }))

        .mutation(async ({ input }) => {

        const user = await Users.findOne({ email: input.email });
        const ok = user && (await bcrypt.compare(input.password, user.password));

        if (!user || !ok) {
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Credenciales inválidas' });
        }
        return createSession(user);
        }),

    // Registro de un usuario nuevo
    register: publicProcedure
        .input(
        z.object({
            fullName: z.string().min(2),
            username: z.string().min(3),
            email: z.string().email(),
            password: z.string().min(6),
        }),
        )

        .mutation(async ({ input }) => {
        const exists = await Users.findOne({
            $or: [{ email: input.email }, { username: input.username }],
        });

        if (exists) {
            throw new TRPCError({
            code: 'CONFLICT',
            message: 'Ya existe un usuario con ese correo o nombre de usuario.',
            });
        }

        const user = await Users.create({
            ...input,
            password: await bcrypt.hash(input.password, 10), // se guarda el hash
            role: 'USER',                                    // siempre USER
        });

            return createSession(user);
        }),
});
