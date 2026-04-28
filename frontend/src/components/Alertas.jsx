import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { authHeaders } from '../utils/authHeaders';
import { ArrowLeftIcon, ExclamationTriangleIcon, ShieldExclamationIcon, InformationCircleIcon, CheckCircleIcon, FunnelIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';

const Alertas = ({ setVistaActual, esAdmin, predioActualId, onAlertasChange }) => {
  const [alertas, setAlertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroSeveridad, setFiltroSeveridad] = useState('todas');
  const [filtroEstado, setFiltroEstado] = useState('todas');

  useEffect(() => {
    if (!predioActualId) return;
    fetch(`${API_BASE_URL}/alertas?idPredio=${predioActualId}`, { headers: authHeaders() })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        const ordenadas = data.sort((a, b) => a.Leida - b.Leida);
        setAlertas(ordenadas);
        setCargando(false);
      })
      .catch(error => { console.error("Error al cargar alertas:", error); setCargando(false); });
  }, [predioActualId]);

  // Lector marca como leída
  const marcarComoLeida = (idAlerta) => {
    fetch(`${API_BASE_URL}/alertas/${idAlerta}`, {
      method: 'PUT', headers: authHeaders(),
      body: JSON.stringify({ Leida: 1 })
    })
    .then(res => res.ok ? res.json() : null)
    .then(() => {
      setAlertas(alertas.map(a => a.ID_Alerta === idAlerta ? { ...a, Leida: 1 } : a));
      onAlertasChange?.();
    })
    .catch(error => console.error("Error al actualizar:", error));
  };

  // Admin confirma la alerta (sistema de 2 pasos)
  const confirmarAdmin = (idAlerta) => {
    fetch(`${API_BASE_URL}/alertas/${idAlerta}`, {
      method: 'PUT', headers: authHeaders(),
      body: JSON.stringify({ Confirmada_Admin: 1, Leida: 1 })
    })
    .then(res => res.ok ? res.json() : null)
    .then(() => {
      setAlertas(alertas.map(a => a.ID_Alerta === idAlerta ? { ...a, Confirmada_Admin: 1, Leida: 1 } : a));
      onAlertasChange?.();
    })
    .catch(error => console.error("Error al confirmar:", error));
  };

  // Marcar todas como leídas
  const marcarTodasLeidas = async () => {
    const noLeidas = alertas.filter(a => !a.Leida);
    for (const alerta of noLeidas) {
      try {
        await fetch(`${API_BASE_URL}/alertas/${alerta.ID_Alerta}`, {
          method: 'PUT', headers: authHeaders(),
          body: JSON.stringify({ Leida: 1 })
        });
      } catch (e) { console.error(e); }
    }
    setAlertas(alertas.map(a => ({ ...a, Leida: 1 })));
    onAlertasChange?.();
  };

  const getEstiloSeveridad = (severidad, leida, confirmada) => {
    if (confirmada) return { border: 'border-white/5', bg: 'bg-black/10', text: 'text-gray-600', icon: CheckCircleIcon };
    if (leida && !esAdmin) return { border: 'border-white/5', bg: 'bg-black/20', text: 'text-gray-500', icon: InformationCircleIcon };
    const sev = (severidad || '').toLowerCase();
    if (sev === 'alta' || sev === 'critica') return { border: 'border-red-500/40', bg: 'bg-red-950/20', text: 'text-red-400', icon: ShieldExclamationIcon };
    if (sev === 'media' || sev === 'advertencia') return { border: 'border-orange-500/40', bg: 'bg-orange-950/20', text: 'text-orange-400', icon: ExclamationTriangleIcon };
    return { border: 'border-creamy-blue/40', bg: 'bg-creamy-blue/10', text: 'text-creamy-blue', icon: InformationCircleIcon };
  };

  // Filtrado
  let alertasFiltradas = [...alertas];
  if (filtroSeveridad !== 'todas') alertasFiltradas = alertasFiltradas.filter(a => (a.Severidad || '').toLowerCase() === filtroSeveridad);
  if (filtroEstado === 'no-leidas') alertasFiltradas = alertasFiltradas.filter(a => !a.Leida);
  else if (filtroEstado === 'leidas') alertasFiltradas = alertasFiltradas.filter(a => a.Leida && !a.Confirmada_Admin);
  else if (filtroEstado === 'confirmadas') alertasFiltradas = alertasFiltradas.filter(a => a.Confirmada_Admin);
  // Para admin: ocultar confirmadas por defecto
  if (esAdmin && filtroEstado === 'todas') alertasFiltradas = alertasFiltradas.filter(a => !a.Confirmada_Admin);

  if (cargando) return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center">
      <div className="w-16 h-16 border-4 border-creamy-blue border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-gray-400 font-bold animate-pulse">Buscando notificaciones de IrriGo...</p>
    </div>
  );

  return (
    <div className="animate-fade-in pb-10 max-w-5xl mx-auto">
      <header className="mb-8">
        <div onClick={() => setVistaActual('dashboard')} className="flex items-center gap-2 text-creamy-blue hover:text-white cursor-pointer transition-colors w-fit mb-4">
          <ArrowLeftIcon className="w-4 h-4" /><span className="text-sm font-bold">Volver al Dashboard</span>
        </div>
        <h2 className="text-4xl font-serif font-bold text-white mb-2">Centro de Alertas</h2>
        <p className="text-gray-400">Notificaciones y avisos de todas tus áreas de riego</p>
      </header>

      {/* FILTROS */}
      <div className="bg-earth-panel p-6 rounded-4xl border border-white/5 shadow-xl mb-6">
        <div className="flex items-center gap-3 text-white font-bold mb-4"><FunnelIcon className="w-5 h-5 text-creamy-blue" /> Filtros</div>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Severidad</label>
            <select value={filtroSeveridad} onChange={e => setFiltroSeveridad(e.target.value)} className="bg-black/30 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm">
              <option value="todas">Todas</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Estado</label>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="bg-black/30 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm">
              <option value="todas">Pendientes</option>
              <option value="no-leidas">No leídas</option>
              <option value="leidas">Marcadas</option>
              <option value="confirmadas">Confirmadas</option>
            </select>
          </div>
          <button onClick={marcarTodasLeidas} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-bold rounded-xl text-sm cursor-pointer transition-colors">
            Marcar todas como leídas
          </button>
        </div>
      </div>

      {/* LISTA */}
      <div className="space-y-4">
        {alertasFiltradas.length === 0 ? (
          <div className="bg-earth-panel p-10 rounded-3xl text-center border border-white/5">
            <CheckCircleIcon className="w-16 h-16 text-emerald-500 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-white mb-2">Todo en orden</h3>
            <p className="text-gray-400">No hay alertas que mostrar con los filtros seleccionados.</p>
          </div>
        ) : (
          alertasFiltradas.map((alerta) => {
            const estilo = getEstiloSeveridad(alerta.Severidad, alerta.Leida, alerta.Confirmada_Admin);
            const Icono = estilo.icon;
            const fechaObj = new Date(alerta.Fecha);
            const fechaStr = fechaObj.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

            return (
              <div key={alerta.ID_Alerta} className={`flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl border transition-all duration-300 ${estilo.border} ${estilo.bg} ${alerta.Confirmada_Admin ? 'opacity-40 grayscale' : alerta.Leida ? 'opacity-70' : 'shadow-lg'}`}>
                <div className="flex items-start gap-4 mb-4 md:mb-0">
                  <div className={`p-3 rounded-full bg-white/5 ${estilo.text}`}><Icono className="w-6 h-6" /></div>
                  <div>
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${estilo.border} ${estilo.text}`}>{alerta.Severidad}</span>
                      <span className="text-xs text-gray-500">{fechaStr}</span>
                      {/* Badge: marcada por lector (visible para admin) */}
                      {esAdmin && alerta.Leida && !alerta.Confirmada_Admin && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/20">
                          Marcada por lector
                        </span>
                      )}
                      {alerta.Confirmada_Admin && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                          Confirmada
                        </span>
                      )}
                    </div>
                    <h4 className={`text-lg font-bold ${alerta.Confirmada_Admin ? 'text-gray-500' : alerta.Leida ? 'text-gray-400' : 'text-white'}`}>{alerta.Tipo}</h4>
                    <p className={`text-sm mt-1 ${alerta.Leida ? 'text-gray-500' : 'text-gray-300'}`}>
                      {alerta.Mensaje || `Se detectó una anomalía en el Área de Riego #${alerta.ID_area}.`}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  {/* Lector: marcar como leída */}
                  {!esAdmin && !alerta.Leida && (
                    <button onClick={() => marcarComoLeida(alerta.ID_Alerta)} className="w-full md:w-auto px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2">
                      <CheckCircleIcon className="w-5 h-5" /> Enterado
                    </button>
                  )}
                  {/* Admin: confirmar alerta */}
                  {esAdmin && !alerta.Confirmada_Admin && (
                    <button onClick={() => confirmarAdmin(alerta.ID_Alerta)} className="w-full md:w-auto px-5 py-3 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-400 font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2">
                      <CheckBadgeIcon className="w-5 h-5" /> Confirmar
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Alertas;
