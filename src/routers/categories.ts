import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure, adminProcedure } from '../trpc.js';
import { Categories, Products } from '../models.js';

const categoryInput = z.object({
    CategoryID: z.number().int(),
    CategoryName: z.string().min(1),
    Description: z.string().min(1),
});

export const categoriesRouter = router({
    // a. Datos totales
    getAll: publicProcedure.query(() => Categories.find().select('-_id -__v').lean()),

    // b. Campos específicos
    names: publicProcedure.query(() =>
        Categories.find().select('CategoryID CategoryName -_id').lean(),
    ),

    // c. Filtro por ID + relación, categoría con sus productos
    byId: publicProcedure
        .input(z.object({ CategoryID: z.number().int() }))
        .query(async ({ input }) => {
        const category = await Categories.findOne(input).select('-_id -__v').lean();
        if (!category) {
            throw new TRPCError({ code: 'NOT_FOUND', message: `La categoría ${input.CategoryID} no existe.` });
        }
        const products = await Products.find({ CategoryID: input.CategoryID })
            .select('ProductID ProductName UnitPrice -_id')
            .lean();
        return { ...category, Products: products };
        }),

    // e. Insertar requiere sesión
    add: protectedProcedure.input(categoryInput).mutation(async ({ input }) => {
        if (await Categories.exists({ CategoryID: input.CategoryID })) {
        throw new TRPCError({ code: 'CONFLICT', message: `La categoría con ID ${input.CategoryID} ya existe.` });
        }
        const created = await Categories.create(input);
        return created.toObject();
    }),

    // e. Modificar requiere sesión. Solo CategoryID es obligatorio
    update: protectedProcedure

        .input(categoryInput.partial().required({ CategoryID: true }))

        .mutation(async ({ input }) => {
        const { CategoryID, ...rest } = input;
        const updated = await Categories.findOneAndUpdate({ CategoryID }, rest, { new: true })
            .select('-_id -__v')
            .lean();
        if (!updated) {
            throw new TRPCError({ code: 'NOT_FOUND', message: `La categoría ${CategoryID} no existe.` });
        }
            return updated;
        }),

    // e. Eliminar solo ADMIN
    delete: adminProcedure
        .input(z.object({ CategoryID: z.number().int() }))
        .mutation(async ({ input }) => {
        const deleted = await Categories.findOneAndDelete(input).select('-_id -__v').lean();
        if (!deleted) {
            throw new TRPCError({ code: 'NOT_FOUND', message: `La categoría ${input.CategoryID} no existe.` });
        }
        return deleted;
        }),
    });