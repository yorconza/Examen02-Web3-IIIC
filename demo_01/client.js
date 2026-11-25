import dotenv from 'dotenv';
import grpc from '@grpc/grpc-js';
import { northwind } from './config/proto.js';

dotenv.config({ quiet: true });

const address = `localhost:${process.env.PORT || 50051}`;
const credentials = grpc.credentials.createInsecure();

const authClient = new northwind.AuthService(address, credentials);
const productClient = new northwind.ProductService(address, credentials);

// Convierte el estilo callback de gRPC a Promesas
const call = (client, method, request, metadata = new grpc.Metadata()) =>
    new Promise((resolve, reject) => {
        client[method](request, metadata, (error, response) =>
            error ? reject(error) : resolve(response)
        );
    });

const section = (title) => console.log(`\n=== ${title} ===`);

async function main() {
    // ---------- g. Seguridad JWT ----------
    section('g. JWT: llamada SIN token (debe fallar)');
    try {
        await call(productClient, 'GetAllProducts', {});
    } catch (error) {
        console.log(`Rechazada -> code ${error.code} (UNAUTHENTICATED): ${error.message}`);
    }

    section('g. JWT: Login');
    const { token, message } = await call(authClient, 'Login', {
        username: 'meraddams', //Usa tu propio usuario
        password: 'tomasa', //Usa tu propia contraseña
    });
    console.log(message);

    const metadata = new grpc.Metadata();
    metadata.add('authorization', `Bearer ${token}`);
    const api = (method, request = {}) => call(productClient, method, request, metadata);

    // ---------- a. Todos los datos ----------
    section('a. Consultar todos los productos');
    const all = await api('GetAllProducts');
    console.table(all.products);

    // ---------- b. Campos específicos ----------
    section('b. Solo id, nombre y precio');
    const summary = await api('GetProductsSummary');
    console.table(summary.items);

    // ---------- c. Filtros ----------
    section('c. Filtro: nombre contiene "ch" y precio >= 20');
    const filtered = await api('GetProductsByFilter', { keyword: 'ch', min_price: 20 });
    console.table(filtered.products);

    // ---------- d. Join y agregación ----------
    section('d. JOIN productos + categorías + proveedores');
    const joined = await api('GetProductsWithCategory');
    console.table(joined.items);

    section('d. AGREGACIÓN por categoría');
    const stats = await api('GetCategoryStats');
    console.table(stats.items);

    // ---------- e. Insertar, modificar, eliminar ----------
    section('e. INSERTAR');
    const categoryId = all.products[0].category_id;
    const created = await api('CreateProduct', {
        name: 'Producto Demo',
        price: 10,
        stock: 5,
        category_id: categoryId,
        supplier_id: '1',
    });
    console.table([created]);

    section('e. MODIFICAR');
    const updated = await api('UpdateProduct', {
        id: created.id,
        name: 'Producto Demo (editado)',
        price: 12.5,
        stock: 8,
    });
    console.table([updated]);

    section('e. ELIMINAR');
    console.log(await api('DeleteProduct', { id: created.id }));

    section('e. Eliminar de nuevo (debe dar NOT_FOUND)');
    try {
        await api('DeleteProduct', { id: created.id });
    } catch (error) {
        console.log(`code ${error.code} (NOT_FOUND): ${error.message}`);
    }

    // ---------- f. Paginación y ordenamiento ----------
    for (const page of [1, 2]) {
        section(`f. Página ${page} (5 por página, precio descendente)`);
        const result = await api('GetPaginatedProducts', {
            page,
            limit: 5,
            sort_by: 'price',
            sort_order: 'desc',
        });
        console.table(result.products);
        console.log(`Página ${result.page} de ${result.total_pages} | Total: ${result.total}`);
    }
}

main().catch((error) => {
    console.error('Error en la demo:', error.message);
    process.exit(1);
});