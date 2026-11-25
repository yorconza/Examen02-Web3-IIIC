import grpc from '@grpc/grpc-js';
import { authenticateGrpc } from '../security/auth.js';
import * as Products from '../models/mdl_products.js';
import * as Categories from '../models/mdl_categories.js';
import * as Suppliers from '../models/mdl_suppliers.js';

// Error con código gRPC para devolver al cliente
const fail = (code, message) => Object.assign(new Error(message), { grpcCode: code });

/**
 * Envuelve cada método: valida el JWT, ejecuta la lógica y traduce errores a códigos gRPC.
 * handler(request, user) -> objeto de respuesta
 */
const protect = (handler) => async (call, callback) => {
    const user = authenticateGrpc(call, callback);
    if (!user) return; // authenticateGrpc ya respondió UNAUTHENTICATED

    try {
        callback(null, await handler(call.request, user));
    } catch (error) {
        if (error.grpcCode) {
            callback({ code: error.grpcCode, message: error.message });
        } else {
            console.error(error);
            callback({ code: grpc.status.INTERNAL, message: 'Error interno del servidor' });
        }
    }
};

const requireValidId = (id) => {
    if (!Products.isValidId(id)) {
        throw fail(grpc.status.INVALID_ARGUMENT, 'El id proporcionado no es válido');
    }
};

export const productService = {
    // a. Todos los datos
    GetAllProducts: protect(async () => ({
        products: (await Products.findAll()).map(Products.toProto),
    })),

    GetProductById: protect(async ({ id }) => {
        requireValidId(id);
        const product = await Products.findById(id);
        if (!product) throw fail(grpc.status.NOT_FOUND, 'Producto no encontrado');
        return Products.toProto(product);
    }),

    // b. Campos específicos
    GetProductsSummary: protect(async () => ({
        items: (await Products.findSummary()).map(Products.toSummary),
    })),

    // c. Filtros
    GetProductsByFilter: protect(async (request) => ({
        products: (await Products.findByFilter(request)).map(Products.toProto),
    })),

    // d. Join y agregación
    GetProductsWithCategory: protect(async () => ({
        items: await Products.findWithCategory(),
    })),

    GetCategoryStats: protect(async () => ({
        items: await Products.categoryStats(),
    })),

    // e. Insertar
    CreateProduct: protect(async ({ name, price, stock, category_id, supplier_id }) => {
        if (!name || !name.trim()) {
            throw fail(grpc.status.INVALID_ARGUMENT, 'El nombre es obligatorio');
        }
        if (price < 0 || stock < 0) {
            throw fail(grpc.status.INVALID_ARGUMENT, 'Precio y stock no pueden ser negativos');
        }
        if (!supplier_id) {
            throw fail(grpc.status.INVALID_ARGUMENT, 'El proveedor es obligatorio');
        }
        if (category_id && !(await Categories.findById(category_id))) {
            throw fail(grpc.status.NOT_FOUND, 'La categoría indicada no existe');
        }
        if (!(await Suppliers.findById(supplier_id))) {
            throw fail(grpc.status.NOT_FOUND, 'El proveedor indicado no existe');
        }

        const created = await Products.insert({ name: name.trim(), price, stock, category_id, supplier_id });
        return Products.toProto(created);
    }),

    // e. Modificar
    UpdateProduct: protect(async ({ id, name, price, stock }) => {
        requireValidId(id);
        if (price < 0 || stock < 0) {
            throw fail(grpc.status.INVALID_ARGUMENT, 'Precio y stock no pueden ser negativos');
        }

        const fields = { price, stock };
        if (name && name.trim()) fields.name = name.trim();

        const updated = await Products.update(id, fields);
        if (!updated) throw fail(grpc.status.NOT_FOUND, 'Producto no encontrado');
        return Products.toProto(updated);
    }),

    // e. Eliminar
    DeleteProduct: protect(async ({ id }) => {
        requireValidId(id);
        const deleted = await Products.remove(id);
        if (!deleted) throw fail(grpc.status.NOT_FOUND, 'Producto no encontrado');
        return { success: true, message: 'Producto eliminado correctamente' };
    }),

    // f. Paginación y ordenamiento
    GetPaginatedProducts: protect(async (request) => {
        const { docs, total, page, total_pages } = await Products.findPaginated(request);
        return {
            products: docs.map(Products.toProto),
            total,
            page,
            total_pages,
        };
    }),
};