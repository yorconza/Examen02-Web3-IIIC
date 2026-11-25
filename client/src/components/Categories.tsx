import { useEffect, useState } from 'react';
import { trpc, errMsg } from '../trpc';

type Cat = { CategoryID: number; CategoryName: string; Description: string };

export default function Categories() {
    const [items, setItems] = useState<Cat[]>([]);
    const [form, setForm] = useState({ CategoryID: '', CategoryName: '', Description: '' });
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

    const load = () =>
        trpc.categories.getAll
        .query()
        .then((r) => setItems(r as unknown as Cat[]))
        .catch((e) => setMsg({ ok: false, text: errMsg(e) }));

        useEffect(() => {
            load();
        }, []);

    // Ejecuta una operación, muestra el resultado y recarga la lista
    const run = async (fn: () => Promise<unknown>, okText: string) => {
        try {
            await fn();
            setMsg({ ok: true, text: okText });
            await load();
        } catch (e) {
        setMsg({ ok: false, text: errMsg(e) }); // aquí se ven UNAUTHORIZED / FORBIDDEN
        }
    };

    const payload = () => ({
        CategoryID: Number(form.CategoryID),
        CategoryName: form.CategoryName,
        Description: form.Description,
    });

return (
        <section className="card">
            <h2>Categorías (insertar, modificar y eliminar)</h2>

            <div className="row">
                <input
                type="number"
                placeholder="ID"
                value={form.CategoryID}
                onChange={(e) => setForm({ ...form, CategoryID: e.target.value })}
                />
                <input
                placeholder="Nombre"
                value={form.CategoryName}
                onChange={(e) => setForm({ ...form, CategoryName: e.target.value })}
                />
                <input
                placeholder="Descripción"
                value={form.Description}
                onChange={(e) => setForm({ ...form, Description: e.target.value })}
                />
                <button type="button" onClick={() => run(() => trpc.categories.add.mutate(payload()), 'Categoría insertada')}>
                Insertar
                </button>
                <button type="button" onClick={() => run(() => trpc.categories.update.mutate(payload()), 'Categoría modificada')}>
                Modificar
                </button>
            </div>

            {msg && <p className={`msg ${msg.ok ? 'ok' : 'error'}`}>{msg.text}</p>}

            <div className="table-wrap">
                <table>
                <thead>
                    <tr><th>ID</th><th>Nombre</th><th>Descripción</th><th></th></tr>
                </thead>
                <tbody>
                    {items.map((c) => (
                    <tr key={c.CategoryID}>
                        <td>{c.CategoryID}</td>
                        <td>{c.CategoryName}</td>
                        <td>{c.Description}</td>
                        <td className="actions">
                        <button
                            type="button"
                            className="ghost"
                            onClick={() => setForm({ CategoryID: String(c.CategoryID), CategoryName: c.CategoryName, Description: c.Description })}
                        >
                            Editar
                        </button>
                        <button
                            type="button"
                            className="danger"
                            onClick={() =>
                            run(() => trpc.categories.delete.mutate({ CategoryID: c.CategoryID }), `Categoría ${c.CategoryID} eliminada`)
                            }
                        >
                            Eliminar
                        </button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
        </section>
    );
}