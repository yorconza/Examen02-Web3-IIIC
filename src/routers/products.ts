import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure, adminProcedure } from '../trpc.js';
import { Products } from '../models.js';

const productInput = z.object({
    ProductID: z.number().int(),
    ProductName: z.string().min(1),
    SupplierID: z.number().int(),
    CategoryID: z.number().int(),
    QuantityPerUnit: z.string().min(1),
    UnitPrice: z.number().nonnegative(),
    UnitsInStock: z.number().int().nonnegative(),
    ReorderLevel: z.number().int().nonnegative(),
});

export const productsRouter = router({
    // Datos totales (sin paginar)
    getAll: publicProcedure.query(() => Products.find().select('-_id -__v').lean()),

    // Selección de campos específicos
    namesAndPrices: publicProcedure.query(() =>
        Products.find().select('ProductID ProductName UnitPrice -_id').lean(),
    ),

    // Filtros, paginación y ordenamiento
    list: publicProcedure
        .input(
        z
            .object({
            limit: z.number().int().min(1).max(100).default(10),
            offset: z.number().int().min(0).default(0),
            categoryId: z.number().int().optional(),
            supplierId: z.number().int().optional(),
            minPrice: z.number().optional(),
            maxPrice: z.number().optional(),
            search: z.string().optional(), // coincidencia parcial en el nombre
            sortBy: z
                .enum(['ProductID', 'ProductName', 'UnitPrice', 'UnitsInStock'])
                .default('ProductID'),
            order: z.enum(['asc', 'desc']).default('asc'),
            })
            .default({}),
        )

        .query(async ({ input }) => {
        const { limit, offset, categoryId, supplierId, minPrice, maxPrice, search, sortBy, order } = input;

        // Filtro dinámico: solo se agregan las condiciones que el cliente envió
        const filter: Record<string, any> = {};
        if (categoryId !== undefined) filter.CategoryID = categoryId;
        if (supplierId !== undefined) filter.SupplierID = supplierId;
        if (minPrice !== undefined || maxPrice !== undefined) {
            filter.UnitPrice = {
            ...(minPrice !== undefined && { $gte: minPrice }),
            ...(maxPrice !== undefined && { $lte: maxPrice }),
            };
        }
        if (search) filter.ProductName = { $regex: search, $options: 'i' };

        // Ordenamiento: 1 = ascendente, -1 = descendente
        const sort: Record<string, 1 | -1> = { [sortBy]: order === 'asc' ? 1 : -1 };

        const [items, total] = await Promise.all([
            Products.find(filter).sort(sort).skip(offset).limit(limit).select('-_id -__v').lean(),
            Products.countDocuments(filter),
        ]);

        return { items, total, limit, offset, hasMore: offset + items.length < total };
        }),

    // d. JOIN: producto + categoría + proveedor ($lookup)
    byId: publicProcedure
        .input(z.object({ ProductID: z.number().int() }))

        .query(async ({ input }) => {
        const [product] = await Products.aggregate([
            { $match: { ProductID: input.ProductID } },
            { $lookup: { from: 'categories', localField: 'CategoryID', foreignField: 'CategoryID', as: 'Category' } },
            { $lookup: { from: 'suppliers', localField: 'SupplierID', foreignField: 'SupplierID', as: 'Supplier' } },
            { $unwind: '$Category' },  
            { $unwind: '$Supplier' },  
            {
            $project: {
                _id: 0, ProductID: 1, ProductName: 1, QuantityPerUnit: 1, UnitPrice: 1, UnitsInStock: 1,
                'Category.CategoryID': 1, 'Category.CategoryName': 1,
                'Supplier.SupplierID': 1, 'Supplier.CompanyName': 1, 'Supplier.Country': 1,
            },
            },
        ]);
        
        if (!product) {
            throw new TRPCError({ code: 'NOT_FOUND', message: `El producto con ID ${input.ProductID} no fue encontrado.` });
        }

        return product;
        }),

    // AGREGACIÓN: resumen por categoría ($group + $lookup)
    statsByCategory: publicProcedure.query(() =>
        Products.aggregate([
        {
            $group: {
            _id: '$CategoryID',
            totalProducts: { $sum: 1 },
            avgPrice: { $avg: '$UnitPrice' },        
            totalStock: { $sum: '$UnitsInStock' },   
            },
        },

        { $lookup: { from: 'categories', localField: '_id', foreignField: 'CategoryID', as: 'category' } },
        { $unwind: '$category' },   

        {
            $project: {
            _id: 0,
            CategoryID: '$_id',
            CategoryName: '$category.CategoryName',
            totalProducts: 1,
            avgPrice: { $round: ['$avgPrice', 2] },  
            totalStock: 1,
            },
        },

        { $sort: { CategoryID: 1 } },

        ]),
    ),

    // e. Insertar / Modificar / Eliminar
    add: protectedProcedure.input(productInput).mutation(async ({ input }) => {

            if (await Products.exists({ ProductID: input.ProductID })) {
            throw new TRPCError({ code: 'CONFLICT', message: `El producto con ID ${input.ProductID} ya existe.` });
            }
        return (await Products.create(input)).toObject();
    }),

    update: protectedProcedure
        .input(productInput.partial().required({ ProductID: true }))
        .mutation(async ({ input }) => {
            const { ProductID, ...rest } = input;

            const updated = await Products.findOneAndUpdate({ ProductID }, rest, { new: true })
                .select('-_id -__v')
                .lean();
            if (!updated) {
                throw new TRPCError({ code: 'NOT_FOUND', message: `El producto ${ProductID} no existe.` });
            }
        return updated;
        }),

    delete: adminProcedure
        .input(z.object({ ProductID: z.number().int() }))

        .mutation(async ({ input }) => {
            const deleted = await Products.findOneAndDelete(input).select('-_id -__v').lean();
            if (!deleted) {
                throw new TRPCError({ code: 'NOT_FOUND', message: `El producto ${input.ProductID} no existe.` });
            }
        return deleted;
        }),
});