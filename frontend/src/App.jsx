import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import DetalleParcela from './components/DetalleParcela';
import AreasRiego from './components/AreasRiego';
import Alertas from './components/Alertas';
import Reportes from './components/Reportes';
import MapaDePredio from './components/MapaDePredio';
import Perfil from './components/Perfil';
import Parametros from './components/Parametros';
import Login from './components/Login';
import Registro from './components/Registro';
import { API_BASE_URL } from './config';

// Helper: añade Authorization header si hay token
export function authHeaders() {
  const token = localStorage.getItem('irrigo_token');
  return token
    ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

function App() {
  const [vistaActual, setVistaActual] = useState('dashboard');
  const [parcelaActiva, setParcelaActiva] = useState(null);

  // Estado de autenticación
  const [estaAutenticado, setEstaAutenticado] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [modoRegistro, setModoRegistro] = useState(false);

  // Modal post-registro admin: muestra el CodigoAcceso generado
  const [modalCodigo, setModalCodigo] = useState(null); // { codigoAcceso, nombrePredio }

  // Conteo de alertas no leídas
  const [alertasNoLeidas, setAlertasNoLeidas] = useState(0);

  // Restaurar sesión desde localStorage al recargar
  useEffect(() => {
    const token = localStorage.getItem('irrigo_token');
    const usuarioStr = localStorage.getItem('irrigo_usuario');
    if (token && usuarioStr) {
      try {
        const usuario = JSON.parse(usuarioStr);
        setUsuarioActual(usuario);
        setEstaAutenticado(true);
      } catch {
        localStorage.removeItem('irrigo_token');
        localStorage.removeItem('irrigo_usuario');
      }
    }
    // Restaurar preferencia de daltonismo
    const colorMode = localStorage.getItem('irrigo_color_mode');
    document.body.classList.remove('daltonismo-deutan', 'daltonismo-protan');
    if (colorMode === 'deutan') document.body.classList.add('daltonismo-deutan');
    else if (colorMode === 'protan') document.body.classList.add('daltonismo-protan');
  }, []);

  // Cargar alertas no leídas
  useEffect(() => {
    if (!estaAutenticado) return;
    const cargarAlertasNoLeidas = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/alertas`, { headers: authHeaders() });
        if (res.ok) {
          const alertas = await res.json();
          const esAdmin = usuarioActual?.esAdmin;
          const noLeidas = alertas.filter(a => {
            if (esAdmin) return !a.Confirmada_Admin;
            return !a.Leida;
          }).length;
          setAlertasNoLeidas(noLeidas);
        }
      } catch (err) {
        console.error('Error cargando alertas:', err);
      }
    };
    cargarAlertasNoLeidas();
    const intervalo = setInterval(cargarAlertasNoLeidas, 30000);
    return () => clearInterval(intervalo);
  }, [estaAutenticado, usuarioActual]);

  const handleLoginSuccess = ({ token, usuario }) => {
    localStorage.setItem('irrigo_token', token);
    localStorage.setItem('irrigo_usuario', JSON.stringify(usuario));
    setUsuarioActual(usuario);
    setEstaAutenticado(true);
    setVistaActual('dashboard');
  };

  const handleRegistroSuccess = (resultado) => {
    // Si es admin, mostrar modal con código de acceso
    if (resultado?.codigoAcceso) {
      setModalCodigo({
        codigoAcceso: resultado.codigoAcceso,
        nombrePredio: resultado.nombrePredio || 'tu predio'
      });
    }
    setModoRegistro(false);
  };

  const cerrarSesion = () => {
    localStorage.removeItem('irrigo_token');
    localStorage.removeItem('irrigo_usuario');
    setEstaAutenticado(false);
    setUsuarioActual(null);
    setVistaActual('dashboard');
    setModoRegistro(false);
  };

  if (!estaAutenticado) {
    if (modoRegistro) {
      return (
        <Registro
          onRegistroSuccess={handleRegistroSuccess}
          onSwitchToLogin={() => setModoRegistro(false)}
        />
      );
    }
    return (
      <>
        <Login
          onLoginSuccess={handleLoginSuccess}
          onSwitchToRegistro={() => setModoRegistro(true)}
        />
        {/* Modal post-registro: mostrar código de acceso */}
        {modalCodigo && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#121c17] border border-emerald-500/30 rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-fade-in text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">¡Cuenta creada!</h3>
              <p className="text-gray-400 text-sm mb-6">Tu predio está listo. Comparte este código con tus lectores para que se unan.</p>
              <div className="bg-black/40 border border-emerald-500/40 rounded-2xl p-4 mb-4">
                <p className="text-xs text-emerald-400 uppercase tracking-widest mb-2">Código de Acceso del Predio</p>
                <p className="text-4xl font-black text-white tracking-[0.3em] font-mono">{modalCodigo.codigoAcceso}</p>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(modalCodigo.codigoAcceso); }}
                className="w-full mb-3 py-3 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-400 font-bold rounded-xl transition-colors cursor-pointer"
              >
                📋 Copiar código
              </button>
              <button
                onClick={() => setModalCodigo(null)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors cursor-pointer"
              >
                Iniciar sesión
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  const esAdmin = usuarioActual?.esAdmin || false;
  // Si es lector con alcance 'uno', solo puede ver su área asignada
  const areaPermitida = (!esAdmin && usuarioActual?.alcance === 'uno')
    ? usuarioActual?.areaPermitida
    : null;

  return (
    <div className="min-h-screen bg-earth-dark flex font-sans antialiased pb-10">

      <Sidebar
        vistaActual={vistaActual}
        setVistaActual={setVistaActual}
        esAdmin={esAdmin}
        onLogout={cerrarSesion}
        alertasNoLeidas={alertasNoLeidas}
        usuarioActual={usuarioActual}
      />

      <main className="flex-1 ml-64 p-10">

        {vistaActual === 'dashboard' && (
          <Dashboard setVistaActual={setVistaActual} esAdmin={esAdmin} areaPermitida={areaPermitida} />
        )}

        {vistaActual === 'areas' && (
          <AreasRiego
            setVistaActual={setVistaActual}
            setParcelaActiva={setParcelaActiva}
            areaPermitida={areaPermitida}
          />
        )}

        {vistaActual === 'detalle-parcela' && (
          <DetalleParcela setVistaActual={setVistaActual} parcelaId={parcelaActiva} esAdmin={esAdmin} />
        )}

        {vistaActual === 'alertas' && (
          <Alertas
            setVistaActual={setVistaActual}
            esAdmin={esAdmin}
            onAlertasChange={() => {
              fetch(`${API_BASE_URL}/alertas`, { headers: authHeaders() })
                .then(r => r.json())
                .then(alertas => {
                  const noLeidas = alertas.filter(a => esAdmin ? !a.Confirmada_Admin : !a.Leida).length;
                  setAlertasNoLeidas(noLeidas);
                })
                .catch(() => {});
            }}
          />
        )}

        {vistaActual === 'reportes' && (
          <Reportes setVistaActual={setVistaActual} />
        )}

        {vistaActual === 'mapa' && (
          <MapaDePredio
            setVistaActual={setVistaActual}
            setParcelaActiva={setParcelaActiva}
            areaPermitida={areaPermitida}
          />
        )}

        {vistaActual === 'perfil' && (
          <Perfil setVistaActual={setVistaActual} usuarioActual={usuarioActual} esAdmin={esAdmin} />
        )}

        {vistaActual === 'parametros' && esAdmin && (
          <Parametros setVistaActual={setVistaActual} usuarioActual={usuarioActual} />
        )}

      </main>
    </div>
  );
}

export default App;