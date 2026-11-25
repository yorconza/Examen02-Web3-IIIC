import { createTRPCClient, httpBatchLink, TRPCClientError } from '@trpc/client';
// Solo se importa el TIPO del servidor, no su código
import type { AppRouter } from '../../src/router';

// Aquí se guarda el JWT que devuelven auth.login y auth.register
let token = '';
export const setToken = (t: string) => {
    token = t;
};

export const trpc = createTRPCClient<AppRouter>({
    links: [
        httpBatchLink({
        url: 'http://localhost:4000',
        // Se ejecuta en cada llamada: si hay token, lo envía en el header Authorization
        headers: () => (token ? { Authorization: `Bearer ${token}` } : {}),
        }),
    ],
});

// Los errores de validación de zod llegan como un JSON de "issues": se convierten a texto legible
function prettyMessage(message: string): string {
    try {
        const issues = JSON.parse(message);
        if (Array.isArray(issues)) {
        return issues.map((i) => `${i.path?.join('.')}: ${i.message}`).join(' | ');
        }
    } catch {
        /* no era JSON: se devuelve tal cual */
    }
    return message;
}

// Convierte un error de tRPC en un texto legible: "CODIGO: mensaje"
export function errMsg(e: unknown): string {
    if (e instanceof TRPCClientError) {
        return `${(e as any).data?.code ?? 'ERROR'}: ${prettyMessage(e.message)}`;
    }
    return String(e);
}