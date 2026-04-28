import { useState } from 'react';
import { PlusCircleIcon, KeyIcon, ArrowRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { API_BASE_URL } from '../config';

function authHeaders() {
  const token = localStorage.getItem('irrigo_token');
  return token
    ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

const Onboarding = ({ usuario, onComplete, onCancel = null, initialStep = 'seleccion' }) => {
  const [paso, setPaso] = useState(initialStep);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const [nuevoPredio, setNuevoPredio] = useState({
    NombrePredio: '',
    Ubicacion: '',
    Latitud: '',
    Longitud: '',
  });
  const [codigoJoin, setCodigoJoin] = useState('');

  const handleCrear = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/predios/onboarding/crear`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          ...nuevoPredio,
          Latitud: nuevoPredio.Latitud || null,
          Longitud: nuevoPredio.Longitud || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        await onComplete?.(data);
      } else {
        setError(data.message || 'Error al crear predio');
      }
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setCargando(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/predios/onboarding/solicitar-acceso`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ codigoAcceso: codigoJoin.trim().toUpperCase() }),
      });

      const data = await res.json();
      if (res.ok) {
        await onComplete?.(data);
      } else {
        setError(data.message || 'Código inválido');
      }
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a100d] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-125 h-125 bg-emerald-600/10 rounded-full blur-[120px]" />

      <div className="max-w-4xl w-full relative z-10 animate-fade-in">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-serif font-black text-white mb-4">
            Bienvenido a Irri<span className="text-emerald-500">Go</span>{usuario?.Nombre ? `, ${usuario.Nombre}` : ''}
          </h1>
          <p className="text-gray-400 text-lg">Selecciona como deseas comenzar: crear un predio o solicitar acceso.</p>
        </header>

        {paso === 'seleccion' && (
          <div className="grid md:grid-cols-2 gap-8">
            <button
              onClick={() => setPaso('crear')}
              className="group bg-[#121c17] border border-white/5 p-10 rounded-[2.5rem] text-left hover:border-emerald-500/50 transition-all duration-500 shadow-2xl"
            >
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <PlusCircleIcon className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Crear mi propio predio</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">Tendras permisos de administrador para gestionar areas, parametros y usuarios.</p>
              <div className="flex items-center gap-2 text-emerald-500 font-bold">
                Comenzar <ArrowRightIcon className="w-4 h-4" />
              </div>
            </button>

            <button
              onClick={() => setPaso('unirse')}
              className="group bg-[#121c17] border border-white/5 p-10 rounded-[2.5rem] text-left hover:border-blue-500/50 transition-all duration-500 shadow-2xl"
            >
              <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <KeyIcon className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Solicitar acceso</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">Ingresa el codigo de acceso de un predio para unirte como lector.</p>
              <div className="flex items-center gap-2 text-blue-500 font-bold">
                Ingresar codigo <ArrowRightIcon className="w-4 h-4" />
              </div>
            </button>
          </div>
        )}

        {paso === 'crear' && (
          <div className="max-w-md mx-auto bg-[#121c17] border border-white/10 p-10 rounded-[2.5rem] shadow-2xl animate-slide-up">
            <button
              onClick={() => setPaso('seleccion')}
              className="text-gray-500 hover:text-white mb-6 flex items-center gap-2 text-sm"
              type="button"
            >
              <ArrowLeftIcon className="w-4 h-4" /> Volver atras
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">Datos del nuevo predio</h2>
            <form onSubmit={handleCrear} className="space-y-4">
              <input
                placeholder="Nombre del predio"
                className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-emerald-500"
                value={nuevoPredio.NombrePredio}
                onChange={e => setNuevoPredio({ ...nuevoPredio, NombrePredio: e.target.value })}
                required
              />
              <input
                placeholder="Ubicacion (opcional)"
                className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-emerald-500"
                value={nuevoPredio.Ubicacion}
                onChange={e => setNuevoPredio({ ...nuevoPredio, Ubicacion: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  placeholder="Latitud"
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-emerald-500"
                  value={nuevoPredio.Latitud}
                  onChange={e => setNuevoPredio({ ...nuevoPredio, Latitud: e.target.value })}
                />
                <input
                  placeholder="Longitud"
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-emerald-500"
                  value={nuevoPredio.Longitud}
                  onChange={e => setNuevoPredio({ ...nuevoPredio, Longitud: e.target.value })}
                />
              </div>
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <button
                type="submit"
                disabled={cargando}
                className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/40 disabled:opacity-70"
              >
                {cargando ? 'Creando...' : 'Crear y continuar'}
              </button>
            </form>
          </div>
        )}

        {paso === 'unirse' && (
          <div className="max-w-md mx-auto bg-[#121c17] border border-white/10 p-10 rounded-[2.5rem] shadow-2xl animate-slide-up">
            <button
              onClick={() => setPaso('seleccion')}
              className="text-gray-500 hover:text-white mb-6 flex items-center gap-2 text-sm"
              type="button"
            >
              <ArrowLeftIcon className="w-4 h-4" /> Volver atras
            </button>
            <h2 className="text-2xl font-bold text-white mb-2">Ingresar al predio</h2>
            <p className="text-gray-400 text-sm mb-6">Ingresa el codigo de acceso de 8 caracteres.</p>
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="relative">
                <KeyIcon className="absolute left-4 top-4 h-6 w-6 text-gray-500" />
                <input
                  placeholder="CODIGO DE ACCESO"
                  className="w-full bg-black/40 border border-white/10 pl-14 p-4 rounded-2xl text-white font-mono text-xl tracking-[0.3em] outline-none focus:border-blue-500 placeholder:tracking-normal placeholder:text-sm"
                  value={codigoJoin}
                  onChange={e => setCodigoJoin(e.target.value.toUpperCase())}
                  maxLength={8}
                  required
                />
              </div>
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <button
                type="submit"
                disabled={cargando}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/40 disabled:opacity-70"
              >
                {cargando ? 'Validando...' : 'Unirse al predio'}
              </button>
            </form>
          </div>
        )}

        {onCancel && (
          <div className="text-center mt-8">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-gray-400 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
