import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import {
  UserIcon, EnvelopeIcon, PhoneIcon, ShieldCheckIcon, KeyIcon,
  DeviceTabletIcon, ComputerDesktopIcon, ArrowLeftIcon,
  CheckCircleIcon, ExclamationTriangleIcon, ClipboardDocumentIcon,
  EyeIcon, SwatchIcon
} from '@heroicons/react/24/outline';

const COLOR_MODES = [
  { id: 'normal', label: 'Normal', desc: 'Paleta por defecto', preview: ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'] },
  { id: 'deutan', label: 'Deuteranomalía', desc: 'Rojo-verde → Azul-naranja', preview: ['#2563eb', '#ea580c', '#d97706', '#0ea5e9'] },
  { id: 'protan', label: 'Protanomalía', desc: 'Alto contraste', preview: ['#7c3aed', '#dc2626', '#ca8a04', '#0284c7'] },
];

const Perfil = ({ setVistaActual, usuarioActual, esAdmin }) => {
  const [usuario, setUsuario] = useState(null);
  const [editando, setEditando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);
  const [formData, setFormData] = useState({ Nombre: '', Apellido: '', Email: '', Telefono: '' });
  const [colorMode, setColorMode] = useState(() => localStorage.getItem('irrigo_color_mode') || 'normal');

  useEffect(() => {
    if (!usuarioActual?.IDusuario) { setCargando(false); return; }
    fetch(`${API_BASE_URL}/usuarios/${usuarioActual.IDusuario}`)
      .then(res => res.json())
      .then(data => {
        setUsuario(data);
        setFormData({ Nombre: data.Nombre || '', Apellido: data.Apellido || '', Email: data.Email || '', Telefono: data.Telefono || '' });
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }, [usuarioActual]);

  // Aplicar modo de color
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
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
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
    } catch { setMensaje({ tipo: 'error', texto: 'No se pudo conectar al servidor' }); }
  };

  const codigoAcceso = usuarioActual?.predios?.[0]?.codigoAcceso;

  if (cargando) return <div className="flex justify-center h-[70vh] items-center"><div className="w-16 h-16 border-4 border-creamy-blue border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="animate-fade-in pb-10 max-w-5xl mx-auto">
      <header className="mb-8 border-b border-white/5 pb-6">
        <div onClick={() => setVistaActual('dashboard')} className="flex items-center gap-2 text-creamy-blue hover:text-white cursor-pointer w-fit mb-4 transition-colors">
          <ArrowLeftIcon className="w-4 h-4" /> <span className="text-sm font-bold">Volver al Dashboard</span>
        </div>
        <h2 className="text-4xl font-serif font-bold text-white mb-1">Mi Perfil</h2>
        <p className="text-gray-400">Administra tu información personal y preferencias</p>
      </header>

      {mensaje && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-fade-in ${mensaje.tipo === 'exito' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          {mensaje.tipo === 'exito' ? <CheckCircleIcon className="w-5 h-5" /> : <ExclamationTriangleIcon className="w-5 h-5" />}
          <span className="text-sm font-medium">{mensaje.texto}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUMNA IZQUIERDA */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Tarjeta de usuario */}
          <div className="bg-earth-panel border border-white/5 p-8 rounded-[2rem] shadow-2xl flex flex-col items-center text-center">
            <div className="w-32 h-32 bg-gradient-to-br from-creamy-blue to-emerald-600 rounded-full flex items-center justify-center shadow-lg mb-6 border-4 border-[#0f2922]">
              <span className="text-5xl font-black text-white tracking-tighter">{formData.Nombre.charAt(0)}{formData.Apellido?.charAt(0) || ''}</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">{usuario?.Nombre} {usuario?.Apellido}</h3>
            <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border mb-6 ${esAdmin ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-creamy-blue/20 text-creamy-blue border-creamy-blue/20'}`}>
              {esAdmin ? 'Administrador' : 'Lector'}
            </span>
            <div className="w-full border-t border-white/5 pt-6 flex flex-col gap-4 text-left">
              <div className="flex items-center gap-3 text-gray-300"><ShieldCheckIcon className="w-5 h-5 text-emerald-400" /><span className="text-sm">Cuenta verificada</span></div>
              <div className="flex items-center gap-3 text-gray-300"><KeyIcon className="w-5 h-5 text-creamy-blue" /><span className="text-sm">ID: #{usuarioActual?.IDusuario}</span></div>
              {/* Nombre del predio */}
              {usuarioActual?.predios?.[0]?.nombrePredio && (
                <div className="flex items-center gap-3 text-gray-300"><EyeIcon className="w-5 h-5 text-gray-400" /><span className="text-sm truncate">{usuarioActual.predios[0].nombrePredio}</span></div>
              )}
            </div>
          </div>

          {/* Código de Acceso del Predio (solo Admin) */}
          {esAdmin && codigoAcceso && (
            <div className="bg-earth-panel border border-emerald-500/20 p-6 rounded-[2rem] shadow-2xl">
              <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                <KeyIcon className="w-5 h-5 text-emerald-400" /> Código de Predio
              </h4>
              <p className="text-xs text-gray-400 mb-3">Comparte este código con tus lectores para que se unan a tu predio</p>
              <div className="bg-black/30 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
                <span className="text-2xl font-black text-white tracking-[0.2em] font-mono">{codigoAcceso}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(codigoAcceso); setMensaje({ tipo: 'exito', texto: 'Código copiado al portapapeles' }); setTimeout(() => setMensaje(null), 3000); }}
                  className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg text-emerald-400 cursor-pointer transition-colors"
                  title="Copiar código"
                >
                  <ClipboardDocumentIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Información Personal */}
          <div className="bg-earth-panel border border-white/5 p-8 rounded-[2rem] shadow-2xl">
            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-3"><UserIcon className="w-6 h-6 text-creamy-blue" /> Información Personal</h3>
              <button onClick={() => editando ? guardarCambios() : setEditando(true)} className={`px-6 py-2 rounded-xl font-bold text-sm transition-all shadow-lg cursor-pointer ${editando ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-transparent border border-white/20 text-gray-300 hover:bg-white/10'}`}>
                {editando ? 'Guardar Cambios' : 'Editar Perfil'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-sm font-medium text-gray-400 mb-2">Nombre</label><input type="text" name="Nombre" value={formData.Nombre} onChange={handleChange} disabled={!editando} className="bg-black/30 border border-white/10 text-white rounded-xl w-full p-3.5 focus:border-creamy-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed" /></div>
              <div><label className="block text-sm font-medium text-gray-400 mb-2">Apellidos</label><input type="text" name="Apellido" value={formData.Apellido} onChange={handleChange} disabled={!editando} className="bg-black/30 border border-white/10 text-white rounded-xl w-full p-3.5 focus:border-creamy-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-400 mb-2">Correo Electrónico</label><div className="relative"><EnvelopeIcon className="absolute left-4 top-3.5 h-5 w-5 text-gray-500 pointer-events-none" /><input type="email" name="Email" value={formData.Email} onChange={handleChange} disabled={!editando} className="bg-black/30 border border-white/10 text-white rounded-xl w-full pl-12 p-3.5 focus:border-creamy-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed" /></div></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-400 mb-2">Teléfono</label><div className="relative"><PhoneIcon className="absolute left-4 top-3.5 h-5 w-5 text-gray-500 pointer-events-none" /><input type="tel" name="Telefono" value={formData.Telefono} onChange={handleChange} disabled={!editando} className="bg-black/30 border border-white/10 text-white rounded-xl w-full pl-12 p-3.5 focus:border-creamy-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed" /></div></div>
            </div>
          </div>

          {/* Accesibilidad — Modo Daltonismo */}
          <div className="bg-earth-panel border border-white/5 p-8 rounded-[2rem] shadow-2xl">
            <h3 className="text-xl font-bold text-white flex items-center gap-3 mb-2">
              <SwatchIcon className="w-6 h-6 text-creamy-blue" /> Accesibilidad
            </h3>
            <p className="text-sm text-gray-400 mb-6">Selecciona una paleta de colores adaptada a tu visión</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {COLOR_MODES.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setColorMode(mode.id)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    colorMode === mode.id
                      ? 'border-creamy-blue bg-creamy-blue/10 shadow-lg'
                      : 'border-white/10 bg-black/20 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {colorMode === mode.id && <CheckCircleIcon className="w-4 h-4 text-creamy-blue shrink-0" />}
                    <span className="text-sm font-bold text-white">{mode.label}</span>
                  </div>
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

          {/* Dispositivos Conectados */}
          <div className="bg-earth-panel border border-white/5 p-8 rounded-[2rem] shadow-2xl">
            <h3 className="text-xl font-bold text-white flex items-center gap-3 mb-6"><ComputerDesktopIcon className="w-6 h-6 text-creamy-blue" /> Dispositivos Conectados</h3>
            <div className="bg-emerald-950/20 border border-emerald-500/30 p-5 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400"><DeviceTabletIcon className="w-6 h-6" /></div>
                <div><h4 className="text-white font-bold">Navegador Actual</h4><p className="text-xs text-gray-400">Sesión Actual • {new Date().toLocaleDateString('es-MX')}</p></div>
              </div>
              <span className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span></span>
                Activo
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Perfil;