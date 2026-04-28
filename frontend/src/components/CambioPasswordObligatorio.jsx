import { useState } from 'react';
import { KeyIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { API_BASE_URL } from '../config';
import { authHeaders } from '../utils/authHeaders';

const reglasPassword = [
  { id: 'len', label: 'Minimo 8 caracteres', test: v => v.length >= 8 },
  { id: 'upper', label: '1 letra mayuscula', test: v => /[A-Z]/.test(v) },
  { id: 'lower', label: '1 letra minuscula', test: v => /[a-z]/.test(v) },
  { id: 'num', label: '1 numero', test: v => /\d/.test(v) },
  { id: 'sym', label: '1 simbolo especial', test: v => /[!@#$%^&*()_+\-=[\]{};:'",.<>?/\\|`~]/.test(v) },
];

export default function CambioPasswordObligatorio({ onSuccess }) {
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const reglasEstado = reglasPassword.map(r => ({ ...r, ok: r.test(nuevaContrasena) }));
  const pwValida = reglasEstado.every(r => r.ok);

  const guardar = async (e) => {
    e.preventDefault();
    setError('');

    if (!pwValida) {
      setError('La contrasena no cumple los requisitos de seguridad');
      return;
    }
    if (nuevaContrasena !== confirmarContrasena) {
      setError('Las contrasenas no coinciden');
      return;
    }

    setCargando(true);
    try {
      const res = await fetch(`${API_BASE_URL}/usuarios/cambiar-contrasena`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ nuevaContrasena }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'No se pudo actualizar la contrasena');
        return;
      }
      onSuccess?.();
    } catch {
      setError('Error de conexion con el servidor');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a100d] flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-[#121c17] border border-white/10 rounded-4xl p-8 shadow-2xl">
        <h2 className="text-3xl font-serif font-bold text-white mb-2">Actualizacion de seguridad requerida</h2>
        <p className="text-gray-400 mb-6">Debes cambiar tu contrasena para continuar usando la plataforma.</p>

        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5 ml-1">Nueva contrasena</label>
            <div className="relative">
              <KeyIcon className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" />
              <input
                type="password"
                value={nuevaContrasena}
                onChange={(e) => setNuevaContrasena(e.target.value)}
                className="bg-black/40 border border-white/10 text-white rounded-xl w-full pl-10 p-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {reglasEstado.map(r => (
                <div key={r.id} className={`flex items-center gap-1.5 text-[11px] ${r.ok ? 'text-emerald-400' : 'text-gray-500'}`}>
                  {r.ok ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <XCircleIcon className="w-3.5 h-3.5" />}
                  {r.label}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5 ml-1">Confirmar contrasena</label>
            <div className="relative">
              <KeyIcon className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" />
              <input
                type="password"
                value={confirmarContrasena}
                onChange={(e) => setConfirmarContrasena(e.target.value)}
                className="bg-black/40 border border-white/10 text-white rounded-xl w-full pl-10 p-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors disabled:opacity-70"
          >
            {cargando ? 'Actualizando...' : 'Actualizar contrasena'}
          </button>
        </form>
      </div>
    </div>
  );
}

