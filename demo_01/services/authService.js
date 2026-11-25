import grpc from '@grpc/grpc-js';
import bcrypt from 'bcryptjs';
import { generateToken } from '../security/auth.js';
import { findByUsername } from '../models/mdl_users.js';

export const authService = {
    Login: async (call, callback) => {
        try {
            const { username, password } = call.request;

            const user = username ? await findByUsername(username) : null;
            const valid = user && (await bcrypt.compare(password, user.password));

            // Mismo mensaje para usuario inexistente o clave incorrecta
            if (!valid) {
                return callback({
                    code: grpc.status.UNAUTHENTICATED,
                    message: 'Usuario o contraseña incorrectos',
                });
            }

            callback(null, {
                token: generateToken(user),
                message: `Bienvenido, ${user.username}`,
            });
        } catch (error) {
            console.error(error);
            callback({ code: grpc.status.INTERNAL, message: 'Error interno del servidor' });
        }
    },
};