import { useEffect, useState } from 'react';
import { trpc, errMsg } from '../trpc';

type View = 'paged' | 'all' | 'fields';
type SortBy = 'ProductID' | 'ProductName' | 'UnitPrice' | 'UnitsInStock';
type Row = Record<string, string | number>;

export default function Products() {
    const [view, setView] = useState<View>('paged');
    const [categories, setCategories] = useState<{ CategoryID: number; CategoryName: string }[]>([]);

    // Filtros, orden y paginación
    const [categoryId, setCategoryId] = useState('');
    const [search, setSearch] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [sortBy, setSortBy] = useState<SortBy>('ProductID');
    const [order, setOrder] = useState<'asc' | 'desc'>('asc');
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(0);

    const [rows, setRows] = useState<Row[]>([]);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState('');
    const [detail, setDetail] = useState<unknown>(null);

    // Lista de categorías para el filtro (consulta con campos específicos)
    useEffect(() => {
        trpc.categories.names.query().then(setCategories).catch((e) => setError(errMsg(e)));
    }, []);

    // Cada vez que cambia algo, se vuelve a consultar al servidor
    useEffect(() => {
        const load = async () => {
        setError('');

            if (view === 'all') {
                // Todos los datos de la tabla
                const r = await trpc.products.getAll.query();
                setRows(r as unknown as Row[]);
                setTotal(r.length);

            } else if (view === 'fields') {
                // Solo campos específicos
                const r = await trpc.products.namesAndPrices.query();
                setRows(r as unknown as Row[]);
                setTotal(r.length);

            } else {
                // Filtros, orden y paginación
                const r = await trpc.products.list.query({
                limit,
                offset: page * limit,
                sortBy,
                order,
                categoryId: categoryId ? Number(categoryId) : undefined,
                search: search || undefined,
                minPrice: minPrice ? Number(minPrice) : undefined,
                maxPrice: maxPrice ? Number(maxPrice) : undefined,
                });
                setRows(r.items as unknown as Row[]);
                setTotal(r.total);
            }

        };

        load().catch((e) => setError(errMsg(e)));

    }, [view, categoryId, search, minPrice, maxPrice, sortBy, order, limit, page]);

    // JOIN: al hacer clic en una fila se consulta el producto con su categoría y proveedor
    const showDetail = async (id: number) => {
        try {
        setDetail(await trpc.products.byId.query({ ProductID: id }));
        } catch (e) {
        setError(errMsg(e));
        }
    };

    const columns = rows.length ? Object.keys(rows[0]) : [];
    const pages = Math.max(1, Math.ceil(total / limit));

    return (
        <section className="card">
            <h2>Productos</h2>

            <div className="row">
                <label>
                Vista
                <select value={view} onChange={(e) => { setView(e.target.value as View); setPage(0); }}>
                    <option value="paged">Filtros, orden y paginación</option>
                    <option value="all">Todos los campos (todos los registros)</option>
                    <option value="fields">Solo ID, nombre y precio</option>
                </select>
                </label>
            </div>

            {view === 'paged' && (
                <div className="row">
                <label>
                    Categoría
                    <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(0); }}>
                    <option value="">Todas</option>
                    {categories.map((c) => (
                        <option key={c.CategoryID} value={c.CategoryID}>{c.CategoryName}</option>
                    ))}
                    </select>
                </label>
                <label>
                    Nombre contiene
                    <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
                </label>
                <label>
                    Precio mín.
                    <input type="number" value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setPage(0); }} />
                </label>
                <label>
                    Precio máx.
                    <input type="number" value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setPage(0); }} />
                </label>
                <label>
                    Ordenar por
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
                    <option value="ProductID">ID</option>
                    <option value="ProductName">Nombre</option>
                    <option value="UnitPrice">Precio</option>
                    <option value="UnitsInStock">Stock</option>
                    </select>
                </label>
                <label>
                    Sentido
                    <select value={order} onChange={(e) => setOrder(e.target.value as 'asc' | 'desc')}>
                    <option value="asc">Ascendente</option>
                    <option value="desc">Descendente</option>
                    </select>
                </label>
                <label>
                    Por página
                    <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(0); }}>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    </select>
                </label>
                </div>
            )}

            {error && <p className="msg error">{error}</p>}

            <div className="table-wrap">
                <table>
                <thead>
                    <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                    <tr key={i} onClick={() => showDetail(Number(r.ProductID))} className="clickable">
                        {columns.map((c) => <td key={c}>{String(r[c])}</td>)}
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>

            <div className="row">
                <span>{total} registros</span>
                {view === 'paged' && (
                <>
                    <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button>
                    <span>Página {page + 1} de {pages}</span>
                    <button type="button" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Siguiente</button>
                </>
                )}
            </div>

            {detail !== null && (
                <>
                <h3>Detalle (join producto + categoría + proveedor)</h3>
                <pre>{JSON.stringify(detail, null, 2)}</pre>
                </>
            )}
        </section>
    );
}