import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SwatchIcon,
  PlusCircleIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';
import Onboarding from './Onboarding';

const COLOR_MODES = [
  { id: 'normal', label: 'Normal', desc: 'Paleta por defecto', preview: ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'] },
  { id: 'deutan', label: 'Deuteranomaly', desc: 'Rojo-verde a azul-naranja', preview: ['#2563eb', '#ea580c', '#d97706', '#0ea5e9'] },
  { id: 'protan', label: 'Protanomaly', desc: 'Mayor contraste', preview: ['#7c3aed', '#dc2626', '#ca8a04', '#0284c7'] },
];

const Perfil = ({
  setVistaActual,
  usuarioActual,
  esAdmin,
  predioActual,
  onSeleccionarPredio,
  onPredioActualizado,
}) => {
  const [usuario, setUsuario] = useState(null);
  const [editando, setEditando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);
  const [formData, setFormData] = useState({ Nombre: '', Apellido: '', Email: '', Telefono: '' });
  const [colorMode, setColorMode] = useState(() => localStorage.getItem('irrigo_color_mode') || 'normal');
  const [modalOnboardingStep, setModalOnboardingStep] = useState(null);

  useEffect(() => {
    if (!usuarioActual?.IDusuario) {
      setCargando(false);
      return;
    }
    fetch(`${API_BASE_URL}/usuarios/${usuarioActual.IDusuario}`)
      .then(res => res.json())
      .then(data => {
        setUsuario(data);
        setFormData({
          Nombre: data.Nombre || '',
          Apellido: data.Apellido || '',
          Email: data.Email || '',
          Telefono: data.Telefono || '',
        });
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }, [usuarioActual]);

  useEffect(() => {
    document.body.classList.remove('daltonismo-deutan', 'daltonismo-protan');
    if (colorMode === 'deutan') document.body.classList.add('daltonismo-deutan');
    else if (colorMode === 'protan') document.body.classList.add('daltonismo-protan');
    localStorage.setItem('irrigo_color_mode', colorMode);
  }, [colorMode]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const guardarCambios = async () => {
    setMensaje(null);
    try {
      const response = await fetch(`${API_BASE_URL}/usuarios/${usuarioActual.IDusuario}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        const updatedUser = await response.json();
        setUsuario(updatedUser);
        setEditando(false);
        setMensaje({ tipo: 'exito', texto: 'Perfil actualizado correctamente' });
        setTimeout(() => setMensaje(null), 4000);
      } else {
        const err = await response.json();
        setMensaje({ tipo: 'error', texto: err.message || 'Error al guardar cambios' });
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'No se pudo conectar al servidor' });
    }
  };

  const predios = usuarioActual?.predios || [];
  const misPredios = predios.filter(p => p.rol === 'admin');
  const prediosCompartidos = predios.filter(p => p.rol !== 'admin');

  if (cargando) {
    return (
      <div className="flex justify-center h-[70vh] items-center">
        <div className="w-16 h-16 border-4 border-creamy-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-10 max-w-6xl mx-auto">
      {modalOnboardingStep && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 p-4 overflow-auto">
          <Onboarding
            usuario={usuarioActual}
            initialStep={modalOnboardingStep}
            onCancel={() => setModalOnboardingStep(null)}
            onComplete={async () => {
              await onPredioActualizado?.();
              setModalOnboardingStep(null);
            }}
          />
        </div>
      )}

      <header className="mb-8 border-b border-white/5 pb-6">
        <div onClick={() => setVistaActual('dashboard')} className="flex items-center gap-2 text-creamy-blue hover:text-white cursor-pointer w-fit mb-4 transition-colors">
          <ArrowLeftIcon className="w-4 h-4" /> <span className="text-sm font-bold">Volver al Dashboard</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-4xl font-serif font-bold text-white mb-1">Mi Perfil</h2>
            <p className="text-gray-400">Gestiona tus datos y tus predios</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setModalOnboardingStep('crear')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/30 text-emerald-400 rounded-xl font-bold text-sm"
            >
              <PlusCircleIcon className="w-5 h-5" /> Crear predio
            </button>
            <button
              onClick={() => setModalOnboardingStep('unirse')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/30 text-blue-300 rounded-xl font-bold text-sm"
            >
              <KeyIcon className="w-5 h-5" /> Solicitar acceso
            </button>
          </div>
        </div>
      </header>

      {mensaje && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 ${mensaje.tipo === 'exito' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          {mensaje.tipo === 'exito' ? <CheckCircleIcon className="w-5 h-5" /> : <ExclamationTriangleIcon className="w-5 h-5" />}
          <span className="text-sm font-medium">{mensaje.texto}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 order-1 lg:order-1 flex flex-col gap-6 md:gap-8">
          <div className="bg-earth-panel border border-white/5 p-4 md:p-8 rounded-3xl md:rounded-4xl shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 md:mb-8 border-b border-white/5 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-3"><UserIcon className="w-6 h-6 text-creamy-blue" /> Informacion personal</h3>
              <button onClick={() => (editando ? guardarCambios() : setEditando(true))} className={`px-6 py-2 rounded-xl font-bold text-sm ${editando ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-transparent border border-white/20 text-gray-300 hover:bg-white/10'}`}>
                {editando ? 'Guardar cambios' : 'Editar perfil'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div><label className="block text-sm font-medium text-gray-400 mb-2">Nombre</label><input type="text" name="Nombre" value={formData.Nombre} onChange={handleChange} disabled={!editando} className="bg-black/30 border border-white/10 text-white rounded-xl w-full p-3.5 disabled:opacity-50" /></div>
              <div><label className="block text-sm font-medium text-gray-400 mb-2">Apellidos</label><input type="text" name="Apellido" value={formData.Apellido} onChange={handleChange} disabled={!editando} className="bg-black/30 border border-white/10 text-white rounded-xl w-full p-3.5 disabled:opacity-50" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-400 mb-2">Correo electronico</label><div className="relative"><EnvelopeIcon className="absolute left-4 top-3.5 h-5 w-5 text-gray-500" /><input type="email" name="Email" value={formData.Email} onChange={handleChange} disabled={!editando} className="bg-black/30 border border-white/10 text-white rounded-xl w-full pl-12 p-3.5 disabled:opacity-50" /></div></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-400 mb-2">Telefono</label><div className="relative"><PhoneIcon className="absolute left-4 top-3.5 h-5 w-5 text-gray-500" /><input type="tel" name="Telefono" value={formData.Telefono} onChange={handleChange} disabled={!editando} className="bg-black/30 border border-white/10 text-white rounded-xl w-full pl-12 p-3.5 disabled:opacity-50" /></div></div>
            </div>
          </div>

          <div className="bg-earth-panel border border-white/5 p-4 md:p-8 rounded-3xl md:rounded-4xl shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Mis predios (Administrador)</h3>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {misPredios.length === 0 && <p className="text-sm text-gray-500">No administras predios todavia.</p>}
              {misPredios.map((p) => (
                <button
                  key={p.predio}
                  onClick={() => onSeleccionarPredio?.(p.predio)}
                  className={`text-left bg-black/20 border rounded-2xl p-4 transition-all ${predioActual?.predio === p.predio ? 'border-emerald-500/50' : 'border-white/10 hover:border-emerald-500/30'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-white font-bold">{p.nombrePredio}</span>
                    <span className="text-[10px] px-2 py-1 rounded-full border bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-bold uppercase">Admin</span>
                  </div>
                  <p className="text-xs text-gray-400">{p.codigoAcceso ? `Codigo: ${p.codigoAcceso}` : 'Sin codigo'}</p>
                </button>
              ))}
            </div>

            <h3 className="text-xl font-bold text-white mb-4">Predios compartidos (Solo lectura)</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {prediosCompartidos.length === 0 && <p className="text-sm text-gray-500">No tienes accesos compartidos.</p>}
              {prediosCompartidos.map((p) => (
                <button
                  key={p.predio}
                  onClick={() => onSeleccionarPredio?.(p.predio)}
                  className={`text-left bg-black/20 border rounded-2xl p-4 transition-all ${predioActual?.predio === p.predio ? 'border-blue-400/50' : 'border-white/10 hover:border-blue-400/30'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-white font-bold">{p.nombrePredio}</span>
                    <span className="text-[10px] px-2 py-1 rounded-full border bg-blue-500/15 border-blue-500/30 text-blue-300 font-bold uppercase">Lector</span>
                  </div>
                  <p className="text-xs text-gray-400">{p.alcance === 'uno' ? 'Acceso parcial' : 'Acceso total de lectura'}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 order-2 lg:order-2 flex flex-col gap-4 md:gap-6">
          <div className="bg-earth-panel border border-white/5 p-8 rounded-4xl shadow-2xl text-center">
            <div className="w-24 h-24 bg-linear-to-br from-creamy-blue to-emerald-600 rounded-full flex items-center justify-center shadow-lg mb-5 border-4 border-[#0f2922] mx-auto">
              <span className="text-4xl font-black text-white tracking-tighter">{formData.Nombre.charAt(0)}{formData.Apellido?.charAt(0) || ''}</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">{usuario?.Nombre} {usuario?.Apellido}</h3>
            <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${esAdmin ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-creamy-blue/20 text-creamy-blue border-creamy-blue/20'}`}>
              {esAdmin ? 'Admin en predio activo' : 'Lector en predio activo'}
            </span>
            {predioActual && (
              <p className="text-xs text-gray-400 mt-3">Predio activo: <span className="text-gray-200">{predioActual.nombrePredio}</span></p>
            )}
          </div>

          <div className="bg-earth-panel border border-white/5 p-8 rounded-4xl shadow-2xl">
            <h3 className="text-xl font-bold text-white flex items-center gap-3 mb-2">
              <SwatchIcon className="w-6 h-6 text-creamy-blue" /> Accesibilidad
            </h3>
            <p className="text-sm text-gray-400 mb-6">Selecciona una paleta de colores adaptada a tu vision</p>
            <div className="grid grid-cols-1 gap-4">
              {COLOR_MODES.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setColorMode(mode.id)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    colorMode === mode.id ? 'border-creamy-blue bg-creamy-blue/10 shadow-lg' : 'border-white/10 bg-black/20 hover:border-white/30'
                  }`}
                >
                  <span className="text-sm font-bold text-white block mb-1">{mode.label}</span>
                  <p className="text-xs text-gray-400 mb-3">{mode.desc}</p>
                  <div className="flex gap-1.5">
                    {mode.preview.map((color, i) => (
                      <div key={i} className="w-6 h-6 rounded-full border border-white/10" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Perfil;
