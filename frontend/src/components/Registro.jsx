import { useState } from 'react';
import {
  UserIcon,
  EnvelopeIcon,
  KeyIcon,
  PhoneIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { API_BASE_URL } from '../config';

const reglasPassword = [
  { id: 'len', label: 'Minimo 8 caracteres', test: v => v.length >= 8 },
  { id: 'upper', label: '1 letra mayuscula', test: v => /[A-Z]/.test(v) },
  { id: 'lower', label: '1 letra minuscula', test: v => /[a-z]/.test(v) },
  { id: 'num', label: '1 numero', test: v => /\d/.test(v) },
  { id: 'sym', label: '1 simbolo especial', test: v => /[!@#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]/.test(v) },
];

const Registro = ({ onRegistroSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    Nombre: '',
    Apellido: '',
    Email: '',
    Contrasena: '',
    confirmarContrasena: '',
    Telefono: '',
  });

  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [pwFocus, setPwFocus] = useState(false);

  const reglasEstado = reglasPassword.map(r => ({ ...r, ok: r.test(formData.Contrasena) }));
  const pwValida = reglasEstado.every(r => r.ok);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!pwValida) {
      setError('La contrasena no cumple los requisitos de seguridad');
      return;
    }

    if (formData.Contrasena !== formData.confirmarContrasena) {
      setError('Las contrasenas no coinciden');
      return;
    }

    setCargando(true);

    try {
      const registroPayload = {
        Nombre: formData.Nombre,
        Apellido: formData.Apellido,
        Email: formData.Email,
        Contrasena: formData.Contrasena,
        Telefono: formData.Telefono,
      };

      const registroRes = await fetch(`${API_BASE_URL}/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registroPayload),
      });

      const registroData = await registroRes.json();
      if (!registroRes.ok) {
        setError(registroData.message || 'Error al crear la cuenta');
        return;
      }

      const loginRes = await fetch(`${API_BASE_URL}/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Email: formData.Email,
          Contrasena: formData.Contrasena,
        }),
      });

      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        setError('Cuenta creada, pero no se pudo iniciar sesion automaticamente');
        return;
      }

      onRegistroSuccess({
        token: loginData.token,
        usuario: loginData.usuario,
        requiereOnboarding: true,
      });
    } catch {
      setError('No se pudo conectar al servidor. Verifica que Flask este corriendo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a100d] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-600/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#cce3de]/20 rounded-full blur-[100px] animate-pulse" />

      <div className="sm:mx-auto sm:w-full sm:max-w-lg relative z-10">
        <div className="text-center animate-fade-in mb-8">
          <h2 className="text-5xl font-serif font-black text-white tracking-tight">
            Irri<span className="text-emerald-500">Go</span>
          </h2>
          <p className="mt-2 text-sm text-gray-400 font-medium uppercase tracking-widest">
            Crea tu cuenta
          </p>
        </div>

        <div className="bg-[#121c17] py-8 px-6 shadow-2xl border border-white/10 sm:rounded-[2.5rem] sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
            <button type="button" onClick={onSwitchToLogin} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors cursor-pointer mb-2">
              <ArrowLeftIcon className="w-4 h-4" /> Volver a inicio de sesion
            </button>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5 ml-1">Nombre</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3.5 h-4 w-4 text-gray-500 pointer-events-none" />
                  <input
                    name="Nombre"
                    type="text"
                    required
                    value={formData.Nombre}
                    onChange={handleChange}
                    className="bg-black/40 border border-white/10 text-white rounded-xl w-full pl-10 p-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                    placeholder="Juan"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5 ml-1">Apellido</label>
                <input
                  name="Apellido"
                  type="text"
                  value={formData.Apellido}
                  onChange={handleChange}
                  className="bg-black/40 border border-white/10 text-white rounded-xl w-full p-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                  placeholder="Perez"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5 ml-1">Correo electronico</label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-3.5 h-4 w-4 text-gray-500 pointer-events-none" />
                <input
                  name="Email"
                  type="email"
                  required
                  value={formData.Email}
                  onChange={handleChange}
                  className="bg-black/40 border border-white/10 text-white rounded-xl w-full pl-10 p-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                  placeholder="tu@correo.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5 ml-1">Contrasena</label>
              <div className="relative">
                <KeyIcon className="absolute left-3 top-3.5 h-4 w-4 text-gray-500 pointer-events-none" />
                <input
                  name="Contrasena"
                  type="password"
                  required
                  value={formData.Contrasena}
                  onChange={handleChange}
                  onFocus={() => setPwFocus(true)}
                  onBlur={() => setPwFocus(false)}
                  className="bg-black/40 border border-white/10 text-white rounded-xl w-full pl-10 p-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                  placeholder="Minimo 8 caracteres"
                />
              </div>
              {(pwFocus || formData.Contrasena.length > 0) && (
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {reglasEstado.map(r => (
                    <div key={r.id} className={`flex items-center gap-1.5 text-[11px] transition-colors ${r.ok ? 'text-emerald-400' : 'text-gray-500'}`}>
                      {r.ok ? <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" /> : <XCircleIcon className="w-3.5 h-3.5 shrink-0" />}
                      {r.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5 ml-1">Confirmar contrasena</label>
              <div className="relative">
                <KeyIcon className="absolute left-3 top-3.5 h-4 w-4 text-gray-500 pointer-events-none" />
                <input
                  name="confirmarContrasena"
                  type="password"
                  required
                  value={formData.confirmarContrasena}
                  onChange={handleChange}
                  className={`bg-black/40 border text-white rounded-xl w-full pl-10 p-3 text-sm transition-all outline-none ${
                    formData.confirmarContrasena && formData.Contrasena !== formData.confirmarContrasena
                      ? 'border-red-500/50 focus:ring-red-500'
                      : 'border-white/10 focus:border-emerald-500 focus:ring-emerald-500'
                  } focus:ring-1`}
                  placeholder="Repite tu contrasena"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5 ml-1">Telefono (opcional)</label>
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-3.5 h-4 w-4 text-gray-500 pointer-events-none" />
                <input
                  name="Telefono"
                  type="tel"
                  value={formData.Telefono}
                  onChange={handleChange}
                  className="bg-black/40 border border-white/10 text-white rounded-xl w-full pl-10 p-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                  placeholder="614 123 4567"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-xs font-medium p-3 rounded-xl text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-70"
            >
              {cargando ? 'Creando cuenta...' : 'Crear cuenta y continuar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Registro;
