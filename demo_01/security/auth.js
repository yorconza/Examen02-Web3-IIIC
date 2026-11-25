import jwt from 'jsonwebtoken';
import grpc from '@grpc/grpc-js';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

// Se asegura de usar la variable de entorno o un respaldo por seguridad
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_por_defecto';

/**
 * Genera un token JWT para un usuario autenticado.
 * @param {Object} user
 * @returns {string}
 */
export function generateToken(user) {
    const payload = {
        id: user._id.toString(),
        username: user.username,
    };

    // El token expira en 2 horas (Se puede ajustar a tus necesidades)
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
}

/**
 * Middleware de autenticación para gRPC.
 * Verifica que la llamada incluya un token JWT válido en los metadatos.
 * 
 * @param {Object} call - Objeto de la llamada gRPC
 * @param {Function} callback - Callback para responder errores en gRPC
 * @returns {Object|null} Retorna los datos decodificados del usuario si es válido, o detiene la ejecución respondiendo el error.
 */
export function authenticateGrpc(call, callback) {
    try {
        // En gRPC, los headers/tokens viajan en los metadatos de la llamada
        const metadata = call.metadata.get('authorization');

        if (!metadata || metadata.length === 0) {
            callback({
                code: grpc.status.UNAUTHENTICATED,
                message: 'Acceso denegado. No se proporcionaron credenciales de autenticación.',
            });
            return null;
        }

        const authHeader = metadata[0]; // Ejemplo: "Bearer eyJhbGciOiJIUzI1Ni..."

        // Validar el formato del header Bearer
        if (!authHeader.startsWith('Bearer ')) {
            callback({
                code: grpc.status.UNAUTHENTICATED,
                message: 'Formato de token inválido. Debe usar el esquema Bearer.',
            });
            return null;
        }

        const token = authHeader.slice(7).trim();

        // Verificar el token con la clave secreta
        const decoded = jwt.verify(token, JWT_SECRET);

        // Retornamos la info del usuario decodificada por si el método la necesita
        return decoded;

    } catch (error) {
        let message = 'Token inválido.';
        if (error.name === 'TokenExpiredError') {
            message = 'El token ha expirado. Por favor, inicie sesión nuevamente.';
        }

        callback({
            code: grpc.status.UNAUTHENTICATED,
            message: message,
        });
        return null;
    }
}