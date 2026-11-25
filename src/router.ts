import { router } from './trpc.js';
import { authRouter } from './routers/auth.js';
import { categoriesRouter } from './routers/categories.js';
import { suppliersRouter } from './routers/suppliers.js';
import { productsRouter } from './routers/products.js';

export const appRouter = router({
    auth: authRouter,
    categories: categoriesRouter,
    suppliers: suppliersRouter,
    products: productsRouter,
});

// El front-end importa SOLO este tipo: así obtiene autocompletado y validación
// de tipos de todos los procedures sin copiar código del servidor.
export type AppRouter = typeof appRouter;