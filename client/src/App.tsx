import { useState } from 'react';
import { setToken } from './trpc';
import Auth, { type Session } from './components/Auth';
import Products from './components/Products';
import Stats from './components/Stats';
import Categories from './components/Categories';

const TABS = ['Productos', 'Resumen', 'Categorías'] as const;

    // El payload del JWT es JSON codificado en base64url
    function decodePayload(token: string) {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64));
    }

    export default function App() {
    const [tab, setTab] = useState<(typeof TABS)[number]>('Productos');
    const [session, setSession] = useState<Session | null>(null);
    const [guest, setGuest] = useState(false);

    // Se llama tras un login o registro exitoso
    const startSession = (s: Session) => {
        setToken(s.token); // desde ahora cada llamada envía el token
        setSession(s);
        setGuest(false);
        setTab('Productos');
    };

    const logout = () => {
        setToken('');
        setSession(null);
        setGuest(false);
    };

    // Pantalla de acceso (login / registro) a página completa
    if (!session && !guest) {
        return <Auth onSession={startSession} onGuest={() => setGuest(true)} />;
    }

    // Hora en que vence el token (campo "exp" del JWT, en segundos)
    const expiresAt = session
        ? new Date(decodePayload(session.token).exp * 1000).toLocaleTimeString()
        : '';

    return (
        <div className="app">
        <h1>Demo tRPC · Northwind</h1>

        <section className="card">
            <h2>Seguridad (JWT)</h2>

            {session ? (
            <p>
                Sesión iniciada como <b>{session.user.email}</b>{' '}
                <span className={`badge ${session.user.role}`}>{session.user.role}</span>
                <br />
                <span className="hint">Token expira hasta: {expiresAt}</span>{' '}
                <button type="button" className="ghost" onClick={logout}>Cerrar sesión</button>
            </p>
            ) : (
            <p>
                Modo invitado: <b>sin token</b>. Se pueden consultar datos, pero insertar, modificar y eliminar serán rechazados.{' '}
                <button type="button" className="ghost" onClick={logout}>Iniciar sesión</button>
            </p>
            )}
        </section>

        <nav className="tabs">
            {TABS.map((t) => (
            <button key={t} type="button" className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
                {t}
            </button>
            ))}
        </nav>

        {tab === 'Productos' && <Products />}
        {tab === 'Resumen' && <Stats />}
        {tab === 'Categorías' && <Categories />}
        </div>
    );
}