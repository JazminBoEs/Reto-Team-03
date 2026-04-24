import { useState, useEffect } from 'react';
import {
  UserIcon, EnvelopeIcon, KeyIcon, PhoneIcon, ArrowLeftIcon,
  UserPlusIcon, ShieldCheckIcon, EyeIcon, MapPinIcon, CheckCircleIcon, XCircleIcon
} from '@heroicons/react/24/outline';
import { API_BASE_URL } from '../config';

// Reglas de contraseña para validación en tiempo real
const reglasPassword = [
  { id: 'len',   label: 'Mínimo 8 caracteres',  test: v => v.length >= 8 },
  { id: 'upper', label: '1 letra mayúscula',     test: v => /[A-Z]/.test(v) },
  { id: 'lower', label: '1 letra minúscula',     test: v => /[a-z]/.test(v) },
  { id: 'num',   label: '1 número',              test: v => /\d/.test(v) },
  { id: 'sym',   label: '1 símbolo especial',    test: v => /[!@#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]/.test(v) },
];

const Registro = ({ onRegistroSuccess, onSwitchToLogin }) => {
  // Paso 1: selección de rol. Paso 2: formulario.
  const [paso, setPaso] = useState(1);
  const [tipoUsuario, setTipoUsuario] = useState(null); // 'admin' | 'lector'

  const [formData, setFormData] = useState({
    Nombre: '', Apellido: '', Email: '', Contrasena: '',
    confirmarContrasena: '', Telefono: '',
    // Admin
    NombrePredio: '', Ubicacion: '', Latitud: '', Longitud: '',
    // Lector
    codigoAcceso: '',
  });

  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  // Validación código en tiempo real
  const [codigoStatus, setCodigoStatus] = useState(null); // null | 'validando' | { valido, predio }

  // Indicadores de contraseña
  const [pwFocus, setPwFocus] = useState(false);
  const reglasEstado = reglasPassword.map(r => ({ ...r, ok: r.test(formData.Contrasena) }));
  const pwValida = reglasEstado.every(r => r.ok);

  // Validar código de acceso cuando tiene 8 caracteres
  useEffect(() => {
    const codigo = formData.codigoAcceso.trim().toUpperCase();
    if (codigo.length !== 8) { setCodigoStatus(null); return; }
    setCodigoStatus('validando');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/predios/validar-codigo/${codigo}`);
        const data = await res.json();
        setCodigoStatus(data);
      } catch {
        setCodigoStatus({ valido: false });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.codigoAcceso]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'codigoAcceso') setCodigoStatus(null);
  };

  const handleSeleccionRol = (rol) => {
    setTipoUsuario(rol);
    setPaso(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!pwValida) { setError('La contraseña no cumple todos los requisitos'); return; }
    if (formData.Contrasena !== formData.confirmarContrasena) { setError('Las contraseñas no coinciden'); return; }
    if (tipoUsuario === 'lector' && (!codigoStatus || !codigoStatus.valido)) {
      setError('Ingresa un código de predio válido'); return;
    }
    if (tipoUsuario === 'admin' && !formData.NombrePredio.trim()) {
      setError('El nombre del predio es requerido'); return;
    }

    setCargando(true);

    const payload = {
      tipoUsuario,
      Nombre: formData.Nombre,
      Apellido: formData.Apellido,
      Email: formData.Email,
      Contrasena: formData.Contrasena,
      Telefono: formData.Telefono,
    };

    if (tipoUsuario === 'admin') {
      payload.predio = {
        NombrePredio: formData.NombrePredio,
        Ubicacion: formData.Ubicacion,
        Latitud: formData.Latitud || null,
        Longitud: formData.Longitud || null,
      };
    } else {
      payload.codigoAcceso = formData.codigoAcceso.trim().toUpperCase();
    }

    try {
      const res = await fetch(`${API_BASE_URL}/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        onRegistroSuccess(data);
      } else {
        setError(data.message || 'Error al crear la cuenta');
      }
    } catch {
      setError('No se pudo conectar al servidor. Verifica que Flask esté corriendo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a100d] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Círculos decorativos */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-600/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#cce3de]/20 rounded-full blur-[100px] animate-pulse" />

      <div className="sm:mx-auto sm:w-full sm:max-w-lg relative z-10">
        <div className="text-center animate-fade-in mb-8">
          <h2 className="text-5xl font-serif font-black text-white tracking-tight">
            Irri<span className="text-emerald-500">Go</span>
          </h2>
          <p className="mt-2 text-sm text-gray-400 font-medium uppercase tracking-widest">
            {paso === 1 ? 'Crear Nueva Cuenta' : `Registro — ${tipoUsuario === 'admin' ? 'Administrador' : 'Lector'}`}
          </p>
        </div>

        <div className="bg-[#121c17] py-8 px-6 shadow-2xl border border-white/10 sm:rounded-[2.5rem] sm:px-10">

          {/* ── PASO 1: SELECTOR DE ROL ── */}
          {paso === 1 && (
            <div className="animate-fade-in">
              <p className="text-center text-gray-300 text-sm mb-6 font-medium">¿Qué tipo de cuenta deseas crear?</p>
              <div className="grid grid-cols-2 gap-4">
                {/* Admin */}
                <button
                  onClick={() => handleSeleccionRol('admin')}
                  className="group flex flex-col items-center gap-3 p-6 bg-black/30 border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 rounded-2xl transition-all duration-300 cursor-pointer"
                >
                  <div className="w-14 h-14 bg-emerald-500/10 group-hover:bg-emerald-500/20 border border-emerald-500/20 rounded-2xl flex items-center justify-center transition-all">
                    <ShieldCheckIcon className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold text-sm">Administrador</p>
                    <p className="text-gray-500 text-xs mt-1">Crea y gestiona tu propio predio</p>
                  </div>
                </button>
                {/* Lector */}
                <button
                  onClick={() => handleSeleccionRol('lector')}
                  className="group flex flex-col items-center gap-3 p-6 bg-black/30 border border-white/10 hover:border-blue-400/50 hover:bg-blue-400/5 rounded-2xl transition-all duration-300 cursor-pointer"
                >
                  <div className="w-14 h-14 bg-blue-400/10 group-hover:bg-blue-400/20 border border-blue-400/20 rounded-2xl flex items-center justify-center transition-all">
                    <EyeIcon className="w-7 h-7 text-blue-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold text-sm">Lector</p>
                    <p className="text-gray-500 text-xs mt-1">Únete a un predio con un código</p>
                  </div>
                </button>
              </div>
              <div className="mt-6 text-center border-t border-white/10 pt-5">
                <button onClick={onSwitchToLogin} className="text-gray-400 hover:text-white text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 mx-auto">
                  <ArrowLeftIcon className="w-4 h-4" /> Ya tengo cuenta, iniciar sesión
                </button>
              </div>
            </div>
          )}

          {/* ── PASO 2: FORMULARIO ── */}
          {paso === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
              {/* Botón volver al paso 1 */}
              <button type="button" onClick={() => { setPaso(1); setError(''); }} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors cursor-pointer mb-2">
                <ArrowLeftIcon className="w-4 h-4" /> Cambiar tipo de cuenta
              </button>

              {/* Badge de tipo */}
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${tipoUsuario === 'admin' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-blue-400/10 border-blue-400/20 text-blue-400'}`}>
                {tipoUsuario === 'admin' ? <ShieldCheckIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                {tipoUsuario === 'admin' ? 'Administrador' : 'Lector'}
              </div>

              {/* Nombre + Apellido */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5 ml-1">Nombre</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3.5 h-4 w-4 text-gray-500 pointer-events-none" />
                    <input name="Nombre" type="text" required value={formData.Nombre} onChange={handleChange}
                      className="bg-black/40 border border-white/10 text-white rounded-xl w-full pl-10 p-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                      placeholder="Juan" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5 ml-1">Apellido</label>
                  <input name="Apellido" type="text" value={formData.Apellido} onChange={handleChange}
                    className="bg-black/40 border border-white/10 text-white rounded-xl w-full p-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                    placeholder="Pérez" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5 ml-1">Correo Electrónico</label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-3.5 h-4 w-4 text-gray-500 pointer-events-none" />
                  <input name="Email" type="email" required value={formData.Email} onChange={handleChange}
                    className="bg-black/40 border border-white/10 text-white rounded-xl w-full pl-10 p-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                    placeholder="tu@correo.com" />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5 ml-1">Contraseña</label>
                <div className="relative">
                  <KeyIcon className="absolute left-3 top-3.5 h-4 w-4 text-gray-500 pointer-events-none" />
                  <input name="Contrasena" type="password" required value={formData.Contrasena} onChange={handleChange}
                    onFocus={() => setPwFocus(true)} onBlur={() => setPwFocus(false)}
                    className="bg-black/40 border border-white/10 text-white rounded-xl w-full pl-10 p-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                    placeholder="Mínimo 8 caracteres" />
                </div>
                {/* Indicadores en tiempo real */}
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

              {/* Confirmar contraseña */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5 ml-1">Confirmar Contraseña</label>
                <div className="relative">
                  <KeyIcon className="absolute left-3 top-3.5 h-4 w-4 text-gray-500 pointer-events-none" />
                  <input name="confirmarContrasena" type="password" required value={formData.confirmarContrasena} onChange={handleChange}
                    className={`bg-black/40 border text-white rounded-xl w-full pl-10 p-3 text-sm transition-all outline-none ${
                      formData.confirmarContrasena && formData.Contrasena !== formData.confirmarContrasena
                        ? 'border-red-500/50 focus:ring-red-500'
                        : 'border-white/10 focus:border-emerald-500 focus:ring-emerald-500'
                    } focus:ring-1`}
                    placeholder="Repite tu contraseña" />
                </div>
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5 ml-1">Teléfono <span className="text-gray-500 font-normal">(Opcional)</span></label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3 top-3.5 h-4 w-4 text-gray-500 pointer-events-none" />
                  <input name="Telefono" type="tel" value={formData.Telefono} onChange={handleChange}
                    className="bg-black/40 border border-white/10 text-white rounded-xl w-full pl-10 p-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                    placeholder="614 123 4567" />
                </div>
              </div>

              {/* ── ADMIN: datos del predio ── */}
              {tipoUsuario === 'admin' && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 space-y-3">
                  <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <MapPinIcon className="w-4 h-4" /> Datos de tu Predio
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">Nombre del Predio</label>
                    <input name="NombrePredio" type="text" required value={formData.NombrePredio} onChange={handleChange}
                      className="bg-black/40 border border-white/10 text-white rounded-xl w-full p-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                      placeholder="Rancho La Esperanza" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">Ubicación</label>
                    <input name="Ubicacion" type="text" value={formData.Ubicacion} onChange={handleChange}
                      className="bg-black/40 border border-white/10 text-white rounded-xl w-full p-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                      placeholder="Chihuahua, Chih." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-300 mb-1.5">Latitud <span className="text-gray-500 font-normal">(Opcional)</span></label>
                      <input name="Latitud" type="number" step="any" value={formData.Latitud} onChange={handleChange}
                        className="bg-black/40 border border-white/10 text-white rounded-xl w-full p-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                        placeholder="28.6329" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-300 mb-1.5">Longitud <span className="text-gray-500 font-normal">(Opcional)</span></label>
                      <input name="Longitud" type="number" step="any" value={formData.Longitud} onChange={handleChange}
                        className="bg-black/40 border border-white/10 text-white rounded-xl w-full p-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                        placeholder="-106.069" />
                    </div>
                  </div>
                </div>
              )}

              {/* ── LECTOR: código de acceso ── */}
              {tipoUsuario === 'lector' && (
                <div className="bg-blue-400/5 border border-blue-400/20 rounded-2xl p-4 space-y-3">
                  <p className="text-blue-400 text-xs font-bold uppercase tracking-widest">Código de Predio</p>
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">Código de 8 caracteres</label>
                    <input
                      name="codigoAcceso"
                      type="text"
                      maxLength={8}
                      value={formData.codigoAcceso}
                      onChange={handleChange}
                      className={`bg-black/40 border text-white rounded-xl w-full p-3 text-sm font-mono tracking-[0.2em] uppercase transition-all outline-none ${
                        codigoStatus === null || codigoStatus === 'validando' ? 'border-white/10 focus:border-blue-400 focus:ring-1 focus:ring-blue-400'
                        : codigoStatus.valido ? 'border-emerald-500/50 focus:ring-emerald-500'
                        : 'border-red-500/50 focus:ring-red-500'
                      } focus:ring-1`}
                      placeholder="AB12CD34"
                    />
                    {/* Feedback del código */}
                    {codigoStatus === 'validando' && (
                      <p className="text-xs text-gray-400 mt-2 flex items-center gap-2">
                        <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
                        Verificando código...
                      </p>
                    )}
                    {codigoStatus && codigoStatus !== 'validando' && codigoStatus.valido && (
                      <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1.5">
                        <CheckCircleIcon className="w-4 h-4" />
                        Predio encontrado: <strong>{codigoStatus.predio?.NombrePredio}</strong>
                        {codigoStatus.predio?.Ubicacion && ` — ${codigoStatus.predio.Ubicacion}`}
                      </p>
                    )}
                    {codigoStatus && codigoStatus !== 'validando' && !codigoStatus.valido && (
                      <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5">
                        <XCircleIcon className="w-4 h-4" />
                        Código inválido. Pídele el código a tu administrador.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm font-medium p-3 rounded-xl text-center">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={cargando}
                className="w-full flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-4 rounded-2xl shadow-lg shadow-emerald-900/50 transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {cargando ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <><UserPlusIcon className="w-5 h-5" /> Crear Cuenta</>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Registro;
