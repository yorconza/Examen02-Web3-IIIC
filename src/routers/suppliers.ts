import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure, adminProcedure } from '../trpc.js';
import { Suppliers, Products } from '../models.js';

const supplierInput = z.object({
    SupplierID: z.number().int(),
    CompanyName: z.string().min(1),
    ContactName: z.string().min(1),
    ContactTitle: z.string().min(1),
    Country: z.string().min(1),
    City: z.string().min(1),
    Address: z.string().min(1),
});

export const suppliersRouter = router({
    //Datos totales
    getAll: publicProcedure.query(() => Suppliers.find().select('-_id -__v').lean()),

    //Campos específicos filtrando por país
    byCountry: publicProcedure
        .input(z.object({ Country: z.string().min(1) }))
        
        .query(({ input }) =>
        Suppliers.find({ Country: new RegExp(`^input.Country`, 'i') })
            .select('SupplierID CompanyName Country City -_id')
            .lean(),
        ),

    // Filtro por ID + relación, proveedor con sus productos
    byId: publicProcedure
        .input(z.object({ SupplierID: z.number().int() }))

        .query(async ({ input }) => {
        const supplier = await Suppliers.findOne(input).select('-_id -__v').lean();
        if (!supplier) {
            throw new TRPCError({ code: 'NOT_FOUND', message: `El proveedor ${input.SupplierID} no existe.` });
        }
        const products = await Products.find({ SupplierID: input.SupplierID })
            .select('ProductID ProductName -_id')
            .lean();
        return { ...supplier, Products: products };
        }),

    add: protectedProcedure.input(supplierInput).mutation(async ({ input }) => {
        if (await Suppliers.exists({ SupplierID: input.SupplierID })) {
        throw new TRPCError({ code: 'CONFLICT', message: `El proveedor con ID ${input.SupplierID} ya existe.` });
        }
        return (await Suppliers.create(input)).toObject();
    }),

    update: protectedProcedure
        .input(supplierInput.partial().required({ SupplierID: true }))

        .mutation(async ({ input }) => {
        const { SupplierID, ...rest } = input;
        const updated = await Suppliers.findOneAndUpdate({ SupplierID }, rest, { new: true })
            .select('-_id -__v')
            .lean();
        if (!updated) {
            throw new TRPCError({ code: 'NOT_FOUND', message: `El proveedor ${SupplierID} no existe.` });
        }
        return updated;
        }),

    delete: adminProcedure
        .input(z.object({ SupplierID: z.number().int() }))

        .mutation(async ({ input }) => {
        const deleted = await Suppliers.findOneAndDelete(input).select('-_id -__v').lean();
        if (!deleted) {
            throw new TRPCError({ code: 'NOT_FOUND', message: `El proveedor ${input.SupplierID} no existe.` });
        }
        return deleted;
        }),
});