import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { authHeaders } from '../App';
import { ArrowLeftIcon, PlusIcon, PencilSquareIcon, TrashIcon, MapPinIcon, Square3Stack3DIcon, BeakerIcon, CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon, KeyIcon, ArrowPathIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

const Parametros = ({ setVistaActual, usuarioActual, predioActualId, onPredioActualizado }) => {
  const [tab, setTab] = useState('cultivos'); // cultivos | predios | areas | sensores
  const [cargando, setCargando] = useState(true);
  const [configs, setConfigs] = useState([]);
  const [predios, setPredios] = useState([]);
  const [areas, setAreas] = useState([]);
  const [sensores, setSensores] = useState([]);
  const [mensaje, setMensaje] = useState(null);
  const [modal, setModal] = useState(null); // { tipo, data, modo: 'crear'|'editar' }

  useEffect(() => {
    if (!predioActualId) {
      setCargando(false);
      return;
    }
    const cargar = async () => {
      try {
        const parseRes = r => r.ok ? r.json() : [];
        const [rConfigs, rPredios, rAreas, rSensores] = await Promise.all([
          fetch(`${API_BASE_URL}/configuraciones-cultivo?idPredio=${predioActualId}`, { headers: authHeaders() }).then(parseRes),
          fetch(`${API_BASE_URL}/predios`, { headers: authHeaders() }).then(parseRes),
          fetch(`${API_BASE_URL}/areas-riego?idPredio=${predioActualId}`, { headers: authHeaders() }).then(parseRes),
          fetch(`${API_BASE_URL}/sensores?idPredio=${predioActualId}`, { headers: authHeaders() }).then(parseRes),
        ]);
        setConfigs(rConfigs); setPredios(rPredios); setAreas(rAreas); setSensores(rSensores);
      } catch (e) { console.error(e); }
      setCargando(false);
    };
    cargar();
  }, [predioActualId]);

  const mostrarMensaje = (tipo, texto) => { setMensaje({ tipo, texto }); setTimeout(() => setMensaje(null), 4000); };
  const puedeAdministrarPredio = (predio) => predio?.Admin === undefined || predio.Admin === true || predio.Admin === 1;
  const prediosAdministrables = predios.filter(puedeAdministrarPredio);

  // ===== Regenerar CodigoAcceso =====
  const regenerarCodigo = async (idPredio) => {
    if (!confirm('¿Regenerar el código de acceso? El código anterior ya no servirá para nuevos registros, pero los lectores actuales mantienen su acceso.')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/predios/${idPredio}/regenerar-codigo`, {
        method: 'POST',
        headers: authHeaders()
      });
      if (res.ok) {
        const { codigoAcceso } = await res.json();
        setPredios(predios.map(p => p.IDpredio === idPredio ? { ...p, CodigoAcceso: codigoAcceso } : p));
        mostrarMensaje('exito', `Nuevo código generado: ${codigoAcceso}`);
      } else {
        const err = await res.json();
        mostrarMensaje('error', err.message || 'Error al regenerar');
      }
    } catch { mostrarMensaje('error', 'Error de conexión'); }
  };

  // ===== CRUD Predios =====
  const guardarPredio = async (data) => {
    const esModo = modal.modo;
    const url = esModo === 'editar' ? `${API_BASE_URL}/predios/${data.IDpredio}` : `${API_BASE_URL}/predios`;
    const method = esModo === 'editar' ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(data) });
      if (res.ok) {
        const updated = await res.json();
        if (esModo === 'editar') setPredios(predios.map(p => p.IDpredio === updated.IDpredio ? updated : p));
        else setPredios([...predios, updated]);
        await onPredioActualizado?.(updated.IDpredio || predioActualId);
        setModal(null); mostrarMensaje('exito', `Predio ${esModo === 'editar' ? 'actualizado' : 'creado'}`);
      } else { const err = await res.json(); mostrarMensaje('error', err.message || 'Error'); }
    } catch { mostrarMensaje('error', 'Error de conexión'); }
  };

  const eliminarPredio = async (id) => {
    if (!confirm('¿Eliminar este predio?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/predios/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) {
        const prediosRestantes = predios.filter(p => p.IDpredio !== id);
        setPredios(prediosRestantes);
        await onPredioActualizado?.(prediosRestantes[0]?.IDpredio || null);
        mostrarMensaje('exito', 'Predio eliminado');
      }
      else { const err = await res.json(); mostrarMensaje('error', err.message || 'Error al eliminar'); }
    } catch { mostrarMensaje('error', 'Error de conexión'); }
  };

  // ===== CRUD Áreas =====
  const guardarArea = async (data) => {
    const esModo = modal.modo;
    const url = esModo === 'editar' ? `${API_BASE_URL}/areas-riego/${data.ID_Area}` : `${API_BASE_URL}/areas-riego`;
    const method = esModo === 'editar' ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(data) });
      if (res.ok) {
        const updated = await res.json();
        if (esModo === 'editar') setAreas(areas.map(a => a.ID_Area === updated.ID_Area ? updated : a));
        else setAreas([...areas, updated]);
        setModal(null); mostrarMensaje('exito', `Área ${esModo === 'editar' ? 'actualizada' : 'creada'}`);
      } else { const err = await res.json(); mostrarMensaje('error', err.message || 'Error'); }
    } catch { mostrarMensaje('error', 'Error de conexión'); }
  };

  const eliminarArea = async (id) => {
    if (!confirm('¿Eliminar esta área?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/areas-riego/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) { setAreas(areas.filter(a => a.ID_Area !== id)); mostrarMensaje('exito', 'Área eliminada'); }
      else { const err = await res.json(); mostrarMensaje('error', err.message || 'Error al eliminar'); }
    } catch { mostrarMensaje('error', 'Error de conexión'); }
  };

  // ===== CRUD Configs Cultivo =====
  const guardarConfig = async (data) => {
    const esModo = modal.modo;
    const url = esModo === 'editar' ? `${API_BASE_URL}/configuraciones-cultivo/${data.ID_Configuracion}` : `${API_BASE_URL}/configuraciones-cultivo`;
    const method = esModo === 'editar' ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(data) });
      if (res.ok) {
        const updated = await res.json();
        if (esModo === 'editar') setConfigs(configs.map(c => c.ID_Configuracion === updated.ID_Configuracion ? updated : c));
        else setConfigs([...configs, updated]);
        setModal(null); mostrarMensaje('exito', `Configuración ${esModo === 'editar' ? 'actualizada' : 'creada'}`);
        // Verificar alertas automáticas con los nuevos rangos
        const areaId = data.ID_Area || updated.ID_Area;
        if (areaId) {
          try { await fetch(`${API_BASE_URL}/alertas/verificar/${areaId}`, { headers: authHeaders() }); } catch {}
        }
      } else { const err = await res.json(); mostrarMensaje('error', err.message || 'Error'); }
    } catch { mostrarMensaje('error', 'Error de conexión'); }
  };

  const eliminarConfig = async (id) => {
    if (!confirm('¿Eliminar esta configuración?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/configuraciones-cultivo/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) { setConfigs(configs.filter(c => c.ID_Configuracion !== id)); mostrarMensaje('exito', 'Configuración eliminada'); }
      else { const err = await res.json(); mostrarMensaje('error', err.message || 'Error al eliminar'); }
    } catch { mostrarMensaje('error', 'Error de conexión'); }
  };

  if (cargando) return <div className="flex justify-center h-[70vh] items-center"><div className="w-16 h-16 border-4 border-creamy-blue border-t-transparent rounded-full animate-spin"></div></div>;

  const tabs = [
    { id: 'cultivos', label: 'Configuración Cultivos', icon: BeakerIcon, count: configs.length },
    { id: 'predios', label: 'Predios', icon: MapPinIcon, count: predios.length },
    { id: 'areas', label: 'Áreas de Riego', icon: Square3Stack3DIcon, count: areas.length },
    { id: 'sensores', label: 'Sensores', icon: Square3Stack3DIcon, count: sensores.length },
  ];

  return (
    <div className="animate-fade-in pb-10 max-w-6xl mx-auto">
      <header className="mb-8 border-b border-white/5 pb-6">
        <div onClick={() => setVistaActual('dashboard')} className="flex items-center gap-2 text-creamy-blue hover:text-white cursor-pointer w-fit mb-4 transition-colors">
          <ArrowLeftIcon className="w-4 h-4" /> <span className="text-sm font-bold">Volver al Dashboard</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-1">Parámetros del Sistema</h2>
        <p className="text-gray-400">Gestión de predios, áreas de riego y configuraciones de cultivo</p>
      </header>

      {mensaje && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-fade-in ${mensaje.tipo === 'exito' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          {mensaje.tipo === 'exito' ? <CheckCircleIcon className="w-5 h-5" /> : <ExclamationTriangleIcon className="w-5 h-5" />}
          <span className="text-sm font-medium">{mensaje.texto}</span>
        </div>
      )}

      {/* TABS */}
      <div className="mb-8 overflow-x-auto">
        <div className="flex gap-2 min-w-max pr-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 md:px-5 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap ${tab === t.id ? 'bg-creamy-blue/10 text-creamy-blue border border-creamy-blue/20' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-transparent'}`}>
              <t.icon className="w-5 h-5" /> {t.label} <span className="ml-1 text-xs opacity-60">({t.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* CONTENIDO POR TAB */}
      {tab === 'predios' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Predios Registrados</h3>
            <button onClick={() => setModal({ tipo: 'predio', modo: 'crear', data: { NombrePredio: '', Ubicacion: '', Latitud: '', Longitud: '' } })} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer transition-colors"><PlusIcon className="w-5 h-5" /> Nuevo Predio</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {predios.map(p => {
              const puedeAdministrar = puedeAdministrarPredio(p);
              return (
              <div key={p.IDpredio} className="bg-earth-panel border border-white/5 p-6 rounded-2xl">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="text-lg font-bold text-white">{p.NombrePredio}</h4>
                    {!puedeAdministrar && <p className="text-xs text-blue-300 mt-1">Solo lectura</p>}
                  </div>
                  {puedeAdministrar && (
                    <div className="flex gap-2">
                      <button onClick={() => setModal({ tipo: 'predio', modo: 'editar', data: { ...p } })} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-creamy-blue cursor-pointer"><PencilSquareIcon className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-400 mb-1">{p.Ubicacion || 'Sin ubicación'}</p>
                <p className="text-xs text-gray-500 font-mono mb-4">{p.Latitud || '-'}, {p.Longitud || '-'}</p>
                {/* Código de Acceso */}
                {puedeAdministrar && p.CodigoAcceso && (
                  <div className="bg-black/30 border border-emerald-500/20 rounded-xl p-3">
                    <p className="text-[10px] text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <KeyIcon className="w-3 h-3" /> Código de Acceso para Lectores
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xl font-black text-white tracking-[0.2em] font-mono">{p.CodigoAcceso}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { navigator.clipboard.writeText(p.CodigoAcceso); mostrarMensaje('exito', 'Código copiado'); }}
                          title="Copiar código"
                          className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg text-emerald-400 cursor-pointer transition-colors"
                        >
                          <ClipboardDocumentIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => regenerarCodigo(p.IDpredio)}
                          title="Regenerar código"
                          className="p-1.5 bg-orange-500/10 hover:bg-orange-500/20 rounded-lg text-orange-400 cursor-pointer transition-colors"
                        >
                          <ArrowPathIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'areas' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Áreas de Riego</h3>
            <button onClick={() => setModal({ tipo: 'area', modo: 'crear', data: { IDpredio: predioActualId || prediosAdministrables[0]?.IDpredio || '', Nombre: '', Num_Hectareas: '', Estado: 1 } })} disabled={prediosAdministrables.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><PlusIcon className="w-5 h-5" /> Nueva Área</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {areas.map(a => (
              <div key={a.ID_Area} className="bg-earth-panel border border-white/5 p-6 rounded-2xl">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-lg font-bold text-white">{a.Nombre || `Área ${a.ID_Area}`}</h4>
                  <div className="flex gap-2">
                    <button onClick={() => setModal({ tipo: 'area', modo: 'editar', data: { ...a } })} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-creamy-blue cursor-pointer"><PencilSquareIcon className="w-4 h-4" /></button>
                    <button onClick={() => eliminarArea(a.ID_Area)} className="p-2 bg-white/5 hover:bg-red-500/20 rounded-lg text-red-400 cursor-pointer"><TrashIcon className="w-4 h-4" /></button>
                  </div>
                </div>
                <p className="text-sm text-gray-400">Predio: #{a.IDpredio} • {a.Num_Hectareas} ha</p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${a.Estado ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{a.Estado ? 'Activo' : 'Inactivo'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'sensores' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Sensores</h3>
          </div>
          {sensores.length === 0 ? (
            <div className="bg-earth-panel border border-white/5 p-10 rounded-2xl text-center">
              <p className="text-gray-400">No hay sensores registrados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sensores.map(s => {
                const areaName = areas.find(a => a.ID_Area === s.ID_Area)?.Nombre || `Área ${s.ID_Area || '—'}`;
                const batColor = (s.Bateria || 0) > 60 ? 'text-emerald-400' : (s.Bateria || 0) > 30 ? 'text-amber-400' : 'text-red-400';
                return (
                  <div key={s.IDsensor} className="bg-earth-panel border border-white/5 p-5 rounded-2xl">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-sm font-bold text-white">Sensor #{s.IDsensor}</h4>
                      <span className={`text-xs font-bold ${batColor}`}>{s.Bateria || 0}% 🔋</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Señal</span>
                        <span className="text-gray-300 font-mono">{s.Senal || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Área</span>
                        <span className="text-gray-300">{areaName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Módulo</span>
                        <span className="text-gray-300 font-mono">#{s.ID_Modulo || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Ubicación</span>
                        <span className="text-gray-300 font-mono text-[10px]">{s.Latitud || '—'}, {s.Longitud || '—'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {tab === 'cultivos' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Configuraciones de Cultivo</h3>
            <button onClick={() => setModal({ tipo: 'config', modo: 'crear', data: { ID_Area: areas[0]?.ID_Area || '', TipoCultivo: '', TipoTierra: '', CapacidadCampo: '', PuntoMarchitez: '', RangoHumedadMIN: '', RangoHumedadMAX: '', LaminaRiego: '' } })} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer transition-colors"><PlusIcon className="w-5 h-5" /> Nueva Config</button>
          </div>
          <div className="space-y-4">
            {configs.map(c => (
              <div key={c.ID_Configuracion} className="bg-earth-panel border border-white/5 p-6 rounded-2xl">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-white">{c.TipoCultivo || 'Sin tipo'} — {c.TipoTierra || 'Sin tierra'}</h4>
                    <p className="text-sm text-gray-400">Área #{c.ID_Area}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setModal({ tipo: 'config', modo: 'editar', data: { ...c } })} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-creamy-blue cursor-pointer"><PencilSquareIcon className="w-4 h-4" /></button>
                    <button onClick={() => eliminarConfig(c.ID_Configuracion)} className="p-2 bg-white/5 hover:bg-red-500/20 rounded-lg text-red-400 cursor-pointer"><TrashIcon className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-black/20 p-3 rounded-xl"><p className="text-[10px] text-gray-500 uppercase">Cap. Campo</p><p className="text-white font-bold">{c.CapacidadCampo}%</p></div>
                  <div className="bg-black/20 p-3 rounded-xl"><p className="text-[10px] text-gray-500 uppercase">Pto. Marchitez</p><p className="text-white font-bold">{c.PuntoMarchitez}%</p></div>
                  <div className="bg-black/20 p-3 rounded-xl"><p className="text-[10px] text-gray-500 uppercase">Humedad Min-Max</p><p className="text-white font-bold">{c.RangoHumedadMIN}-{c.RangoHumedadMAX}%</p></div>
                  <div className="bg-black/20 p-3 rounded-xl"><p className="text-[10px] text-gray-500 uppercase">Lámina Riego</p><p className="text-white font-bold">{c.LaminaRiego} cm</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL GENÉRICO */}
      {modal && <ModalFormulario modal={modal} setModal={setModal} predios={prediosAdministrables} areas={areas} onGuardarPredio={guardarPredio} onGuardarArea={guardarArea} onGuardarConfig={guardarConfig} />}
    </div>
  );
};

// ===== MODAL REUTILIZABLE =====
const ModalFormulario = ({ modal, setModal, predios, areas, onGuardarPredio, onGuardarArea, onGuardarConfig }) => {
  const [form, setForm] = useState(modal.data);
  const handleChange = (e) => {
    const val = e.target.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value;
    setForm({ ...form, [e.target.name]: val });
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (modal.tipo === 'predio') onGuardarPredio(form);
    else if (modal.tipo === 'area') onGuardarArea(form);
    else if (modal.tipo === 'config') onGuardarConfig(form);
  };
  const titulo = modal.modo === 'crear' ? 'Crear' : 'Editar';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-3 md:p-4 overflow-y-auto" onClick={() => setModal(null)}>
      <div className="bg-earth-panel border border-white/10 rounded-3xl md:rounded-4xl p-4 md:p-6 lg:p-8 w-full max-w-sm sm:max-w-md lg:max-w-lg shadow-2xl animate-fade-in max-h-[92vh] overflow-y-auto my-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">{titulo} {modal.tipo === 'predio' ? 'Predio' : modal.tipo === 'area' ? 'Área de Riego' : 'Configuración'}</h3>
          <button onClick={() => setModal(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 cursor-pointer"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {modal.tipo === 'predio' && (<>
            <Field label="Nombre" name="NombrePredio" value={form.NombrePredio} onChange={handleChange} required />
            <Field label="Ubicación" name="Ubicacion" value={form.Ubicacion} onChange={handleChange} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <Field label="Latitud" name="Latitud" type="number" step="any" value={form.Latitud} onChange={handleChange} />
              <Field label="Longitud" name="Longitud" type="number" step="any" value={form.Longitud} onChange={handleChange} />
            </div>
          </>)}
          {modal.tipo === 'area' && (<>
            <div><label className="block text-sm text-gray-400 mb-1.5">Predio</label><select name="IDpredio" value={form.IDpredio} onChange={handleChange} required className="bg-black/30 border border-white/10 text-white rounded-xl w-full p-3 text-sm">{predios.map(p => <option key={p.IDpredio} value={p.IDpredio}>{p.NombrePredio}</option>)}</select></div>
            <Field label="Nombre" name="Nombre" value={form.Nombre} onChange={handleChange} required />
            <Field label="Hectáreas" name="Num_Hectareas" type="number" step="0.1" value={form.Num_Hectareas} onChange={handleChange} />
          </>)}
          {modal.tipo === 'config' && (<>
            <div><label className="block text-sm text-gray-400 mb-1.5">Área de Riego</label><select name="ID_Area" value={form.ID_Area} onChange={handleChange} required className="bg-black/30 border border-white/10 text-white rounded-xl w-full p-3 text-sm">{areas.map(a => <option key={a.ID_Area} value={a.ID_Area}>{a.Nombre || `Área ${a.ID_Area}`}</option>)}</select></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <Field label="Tipo Cultivo" name="TipoCultivo" value={form.TipoCultivo} onChange={handleChange} />
              <Field label="Tipo Tierra" name="TipoTierra" value={form.TipoTierra} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <Field label="Cap. Campo" name="CapacidadCampo" type="number" step="0.1" value={form.CapacidadCampo} onChange={handleChange} />
              <Field label="Pto. Marchitez" name="PuntoMarchitez" type="number" step="0.1" value={form.PuntoMarchitez} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <Field label="Humedad Mín" name="RangoHumedadMIN" type="number" step="0.1" value={form.RangoHumedadMIN} onChange={handleChange} />
              <Field label="Humedad Máx" name="RangoHumedadMAX" type="number" step="0.1" value={form.RangoHumedadMAX} onChange={handleChange} />
            </div>
            <Field label="Lámina Riego (cm)" name="LaminaRiego" type="number" step="0.1" value={form.LaminaRiego} onChange={handleChange} />
          </>)}
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl cursor-pointer transition-colors mt-2">{titulo}</button>
        </form>
      </div>
    </div>
  );
};

const Field = ({ label, name, value, onChange, type = 'text', required = false, step }) => (
  <div>
    <label className="block text-sm text-gray-400 mb-1.5">{label}</label>
    <input type={type} name={name} value={value || ''} onChange={onChange} required={required} step={step} className="bg-black/30 border border-white/10 text-white rounded-xl w-full p-3 text-sm focus:border-creamy-blue transition-all outline-none" />
  </div>
);

export default Parametros;
