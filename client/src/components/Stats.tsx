import { useEffect, useState } from 'react';
import { trpc, errMsg } from '../trpc';

type Stat = {
    CategoryID: number;
    CategoryName: string;
    totalProducts: number;
    avgPrice: number;
    totalStock: number;
};

export default function Stats() {
    const [rows, setRows] = useState<Stat[]>([]);
    const [error, setError] = useState('');

useEffect(() => {
    trpc.products.statsByCategory
        .query()
        .then((r) => setRows(r as Stat[]))
        .catch((e) => setError(errMsg(e)));
}, []);

return (
        <section className="card">
            <h2>Resumen por categoría (agregación)</h2>
            
            {error && <p className="msg error">{error}</p>}
            <div className="table-wrap">
                <table>
                <thead>
                    <tr>
                    <th>ID</th>
                    <th>Categoría</th>
                    <th>Cantidad de productos</th>
                    <th>Precio promedio</th>
                    <th>Stock total</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                    <tr key={r.CategoryID}>
                        <td>{r.CategoryID}</td>
                        <td>{r.CategoryName}</td>
                        <td>{r.totalProducts}</td>
                        <td>{r.avgPrice}</td>
                        <td>{r.totalStock}</td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
        </section>
    );
}