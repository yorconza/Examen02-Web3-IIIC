import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { trpc, errMsg } from '../trpc';

export type Session = { token: string; user: { id: string; email: string; role: string } };

type Props = {
    onSession: (s: Session) => void; // se llama al iniciar sesión o registrarse
    onGuest: () => void;             // continuar sin token
};

const icon = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const MailIcon = () => (
    <svg {...icon}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
);
const LockIcon = () => (
    <svg {...icon}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
);
const UserIcon = () => (
    <svg {...icon}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
);

// Campo de texto con ícono a la izquierda
function Field({ leading, ...props }: { leading: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div className="field">
        {leading}
        <input {...props} />
        </div>
    );
}

export default function Auth({ onSession, onGuest }: Props) {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('maddams@northwind.com');
    const [password, setPassword] = useState('tomasa');
    const [error, setError] = useState('');

const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setError('');
    if (m === 'register') {
        setFullName('');
        setUsername('');
        setEmail('');
        setPassword('');
    } else {
        setEmail('maddams@northwind.com');
        setPassword('tomasa');
    }
};

const submit = async () => {
        try {
        setError('');
        
        const session =
            mode === 'login'
            ? await trpc.auth.login.mutate({ email, password })
            : await trpc.auth.register.mutate({ fullName, username, email, password });
        onSession(session);

        } catch (e) {
            setError(errMsg(e));
        }
};

const isLogin = mode === 'login';

    return (
        <div className="auth-page">
        <div className="auth-card">
            {/* Panel izquierdo decorativo */}
            <aside className="auth-art">
            <span className="shape s1" />
            <span className="shape s2" />
            <span className="shape s3" />
            <span className="shape s4" />
            <div className="auth-brand">
                <h2>Northwind</h2>
                <p>Demo tRPC · MongoDB </p>
            </div>
            </aside>

            {/* Formulario */}
            <div className="auth-form">
            <form
                onSubmit={(e) => {
                e.preventDefault();
                submit();
                }}
            >
                <h1>{isLogin ? '¡Hola de nuevo!' : 'Crear cuenta'}</h1>
                <p className="sub">{isLogin ? 'Bienvenido' : 'Regístrate para continuar'}</p>

                {!isLogin && (
                <>
                    <Field
                    leading={<UserIcon />}
                    placeholder="Nombre completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    />
                    <Field
                    leading={<UserIcon />}
                    placeholder="Nombre de usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    />
                </>
                )}

                <Field
                leading={<MailIcon />}
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                />
                <Field
                leading={<LockIcon />}
                type="password"
                placeholder={isLogin ? 'Contraseña' : 'Contraseña (mínimo 6 caracteres)'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                />

                {error && <p className="msg error">{error}</p>}

                <button type="submit" className="btn-primary">
                {isLogin ? 'Entrar' : 'Registrarme'}
                </button>
            </form>

            {isLogin && (
                <p className="demo-accounts">
                Cuentas de prueba:{' '}
                <button type="button" className="link" onClick={() => { setEmail('maddams@northwind.com'); setPassword('tomasa'); }}>
                    USER
                </button>
                {' · '}
                <button type="button" className="link" onClick={() => { setEmail('moddams@northwind.com'); setPassword('cleopatra'); }}>
                    ADMIN
                </button>
                </p>
            )}

            <p className="alt">
                {isLogin ? '¿No tienes una cuenta? ' : '¿Ya tienes una cuenta? '}
                <button type="button" className="link" onClick={() => switchMode(isLogin ? 'register' : 'login')}>
                {isLogin ? 'Regístrate' : 'Inicia sesión'}
                </button>
            </p>

            {!isLogin && <p className="hint center">Las cuentas nuevas siempre tienen el rol USER.</p>}

            <p className="alt">
                <button type="button" className="link muted" onClick={onGuest}>
                Continuar sin iniciar sesión
                </button>
            </p>
            </div>
        </div>
        </div>
    );
}