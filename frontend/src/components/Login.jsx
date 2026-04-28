import { useState } from 'react';
import { EnvelopeIcon, KeyIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { API_BASE_URL } from '../config';

const Login = ({ onLoginSuccess, onSwitchToRegistro }) => {
  const [credenciales, setCredenciales] = useState({ Email: '', Contrasena: '' });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => {
    setCredenciales({ ...credenciales, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const response = await fetch(`${API_BASE_URL}/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credenciales)
      });

      const data = await response.json();

      if (response.ok) {
        // El backend retorna { token, usuario }
        onLoginSuccess(data);
      } else {
        setError(data.message || 'Error al iniciar sesión');
      }
    } catch (err) {
      console.error(err);
      setError('No se pudo conectar al servidor. Verifica que Flask esté corriendo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a100d] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Círculos decorativos de fondo con desenfoque */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-600/20 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#cce3de]/20 rounded-full blur-[100px] animate-pulse"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="text-center animate-fade-in">
          <h2 className="mt-6 text-6xl font-serif font-black text-white tracking-tight">
            Irri<span className="text-emerald-500">Go</span>
          </h2>
          <p className="mt-3 text-sm text-gray-400 font-medium uppercase tracking-widest">
            Sistema Inteligente de Riego Agrícola
          </p>
        </div>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="bg-[#121c17] py-10 px-4 shadow-2xl border border-white/10 sm:rounded-[2.5rem] sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>

            {/* Campo de Correo */}
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2 ml-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-4 top-4 h-5 w-5 text-gray-500 pointer-events-none" />
                <input
                  name="Email"
                  type="email"
                  required
                  value={credenciales.Email}
                  onChange={handleChange}
                  className="bg-black/40 border border-white/10 text-white rounded-2xl w-full pl-12 p-4 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                  placeholder="admin@irrigo.com"
                />
              </div>
            </div>

            {/* Campo de Contraseña */}
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2 ml-1">
                Contraseña
              </label>
              <div className="relative">
                <KeyIcon className="absolute left-4 top-4 h-5 w-5 text-gray-500 pointer-events-none" />
                <input
                  name="Contrasena"
                  type="password"
                  required
                  value={credenciales.Contrasena}
                  onChange={handleChange}
                  className="bg-black/40 border border-white/10 text-white rounded-2xl w-full pl-12 p-4 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Mensaje de Error Dinámico */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm font-medium p-4 rounded-2xl text-center flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Botón de Submit */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-4 rounded-2xl shadow-lg shadow-emerald-900/50 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4 cursor-pointer"
            >
              {cargando ? (
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>Iniciar Sesión <ArrowRightOnRectangleIcon className="w-5 h-5" /></>
              )}
            </button>
          </form>

          {/* Enlace a Registro */}
          <div className="mt-8 text-center border-t border-white/10 pt-6">
            <p className="text-gray-400 text-sm">
              ¿No tienes cuenta?{' '}
              <button
                onClick={onSwitchToRegistro}
                className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors cursor-pointer"
              >
                Crear una cuenta
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
