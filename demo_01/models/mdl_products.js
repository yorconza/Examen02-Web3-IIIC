import { ObjectId } from 'mongodb';
import { connectDB } from '../config/database.js';

const products = async () => (await connectDB()).collection('products');

// Campo del .proto -> campo real en la colección de Northwind
const SORTABLE_FIELDS = {
    name: 'ProductName',
    price: 'UnitPrice',
    stock: 'UnitsInStock',
};

export const isValidId = (id) =>
    typeof id === 'string' && ObjectId.isValid(id) && new ObjectId(id).toString() === id;

// Documento de Mongo -> mensaje ProductResponse del .proto
export const toProto = (doc) => ({
    id: doc._id.toString(),
    name: doc.ProductName,
    price: doc.UnitPrice,
    stock: doc.UnitsInStock,
    category_id: doc.CategoryID != null ? String(doc.CategoryID) : '',
    supplier_id: doc.SupplierID != null ? String(doc.SupplierID) : '',
});

// Documento de Mongo -> mensaje ProductSummary del .proto
export const toSummary = (doc) => ({
    id: doc._id.toString(),
    name: doc.ProductName,
    price: doc.UnitPrice,
});

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// a. Todos los datos
export async function findAll() {
    return (await products()).find().toArray();
}

export async function findById(id) {
    return (await products()).findOne({ _id: new ObjectId(id) });
}

// b. Campos específicos (projection)
export async function findSummary() {
    return (await products())
        .find({}, { projection: { ProductName: 1, UnitPrice: 1 } })
        .sort({ ProductName: 1 })
        .toArray();
}

// c. Filtros
export async function findByFilter({ keyword, min_price, max_price }) {
    const filter = {};

    if (keyword) {
        filter.ProductName = { $regex: escapeRegex(keyword), $options: 'i' };
    }
    if (min_price > 0 || max_price > 0) {
        filter.UnitPrice = {};
        if (min_price > 0) filter.UnitPrice.$gte = min_price;
        if (max_price > 0) filter.UnitPrice.$lte = max_price;
    }

    return (await products()).find(filter).sort({ ProductName: 1 }).toArray();
}

// d. JOIN: products + categories + suppliers ($lookup)
export async function findWithCategory() {
    return (await products())
        .aggregate([
            { $lookup: { from: 'categories', localField: 'CategoryID', foreignField: 'CategoryID', as: 'category' } },
            { $lookup: { from: 'suppliers', localField: 'SupplierID', foreignField: 'SupplierID', as: 'supplier' } },
            { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    product_name: '$ProductName',
                    price: '$UnitPrice',
                    category_name: { $ifNull: ['$category.CategoryName', 'Sin categoría'] },
                    supplier_name: { $ifNull: ['$supplier.CompanyName', 'Sin proveedor'] },
                },
            },
            { $sort: { category_name: 1, product_name: 1 } },
        ])
        .toArray();
}

// d. AGREGACIÓN: conteo, promedio y suma por categoría ($group)
export async function categoryStats() {
    return (await products())
        .aggregate([
            {
                $group: {
                    _id: '$CategoryID',
                    product_count: { $sum: 1 },
                    avg_price: { $avg: '$UnitPrice' },
                    total_stock: { $sum: '$UnitsInStock' },
                },
            },
            { $lookup: { from: 'categories', localField: '_id', foreignField: 'CategoryID', as: 'category' } },
            { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    category_name: { $ifNull: ['$category.CategoryName', 'Sin categoría'] },
                    product_count: 1,
                    avg_price: { $round: ['$avg_price', 2] },
                    total_stock: 1,
                },
            },
            { $sort: { category_name: 1 } },
        ])
        .toArray();
}

// e. INSERTAR (Northwind usa ProductID numérico, así que calculamos el siguiente)
export async function insert({ name, price, stock, category_id, supplier_id }) {
    const col = await products();
    const last = await col.find().sort({ ProductID: -1 }).limit(1).next();

    const doc = {
        ProductID: (last?.ProductID ?? 0) + 1,
        ProductName: name,
        SupplierID: supplier_id ? Number(supplier_id) : null,
        CategoryID: category_id ? Number(category_id) : null,
        UnitPrice: price,
        UnitsInStock: stock,
    };
    const result = await col.insertOne(doc);
    return { _id: result.insertedId, ...doc };
}

// e. MODIFICAR (devuelve el documento actualizado o null si no existe)
export async function update(id, { name, price, stock }) {
    const fields = { UnitPrice: price, UnitsInStock: stock };
    if (name) fields.ProductName = name;

    return (await products()).findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: fields },
        { returnDocument: 'after' }
    );
}

// e. ELIMINAR
export async function remove(id) {
    const result = await (await products()).deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
}

// f. PAGINACIÓN + ORDENAMIENTO
export async function findPaginated({ page, limit, sort_by, sort_order }) {
    const safePage = Math.max(parseInt(page) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
    const sortField = SORTABLE_FIELDS[sort_by] ?? 'ProductName';
    const direction = sort_order === 'desc' ? -1 : 1;

    const col = await products();
    const total = await col.countDocuments();

    const docs = await col
        .find()
        .sort({ [sortField]: direction, _id: 1 }) // _id desempata para que las páginas sean estables
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .toArray();

    return {
        docs,
        total,
        page: safePage,
        total_pages: Math.ceil(total / safeLimit),
    };
}