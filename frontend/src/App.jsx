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
import Onboarding from './components/Onboarding';
import CambioPasswordObligatorio from './components/CambioPasswordObligatorio';
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
  const [requiereOnboarding, setRequiereOnboarding] = useState(false);
  const [requiereCambioPassword, setRequiereCambioPassword] = useState(false);
  const [predioActualId, setPredioActualId] = useState(null);

  // Conteo de alertas no leídas
  const [alertasNoLeidas, setAlertasNoLeidas] = useState(0);

  // Restaurar sesión desde localStorage al recargar
  useEffect(() => {
    const token = localStorage.getItem('irrigo_token');
    const usuarioStr = localStorage.getItem('irrigo_usuario');
    const onboardingPendiente = localStorage.getItem('irrigo_requiere_onboarding') === '1';
    const predioGuardado = localStorage.getItem('irrigo_predio_actual');
    if (token && usuarioStr) {
      try {
        const usuario = JSON.parse(usuarioStr);
        setUsuarioActual(usuario);
        setEstaAutenticado(true);
        setRequiereOnboarding(onboardingPendiente);
        setPredioActualId(predioGuardado ? Number(predioGuardado) : (usuario.predios?.[0]?.predio ?? null));
      } catch {
        localStorage.removeItem('irrigo_token');
        localStorage.removeItem('irrigo_usuario');
        localStorage.removeItem('irrigo_requiere_onboarding');
        localStorage.removeItem('irrigo_predio_actual');
      }
    }
    // Restaurar preferencia de daltonismo
    const colorMode = localStorage.getItem('irrigo_color_mode');
    document.body.classList.remove('daltonismo-deutan', 'daltonismo-protan');
    if (colorMode === 'deutan') document.body.classList.add('daltonismo-deutan');
    else if (colorMode === 'protan') document.body.classList.add('daltonismo-protan');
  }, []);

  useEffect(() => {
    if (predioActualId === null || predioActualId === undefined) {
      localStorage.removeItem('irrigo_predio_actual');
      return;
    }
    localStorage.setItem('irrigo_predio_actual', String(predioActualId));
  }, [predioActualId]);

  // Cargar alertas no leídas
  useEffect(() => {
    if (!estaAutenticado) return;
    if (!predioActualId) return;
    const cargarAlertasNoLeidas = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/alertas?idPredio=${predioActualId}`, { headers: authHeaders() });
        if (res.ok) {
          const alertas = await res.json();
          const esAdmin = (usuarioActual?.predios || []).some(p => p.predio === predioActualId && p.rol === 'admin');
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
  }, [estaAutenticado, usuarioActual, predioActualId]);

  const handleLoginSuccess = ({ token, usuario, requiereCambioPassword: cambioObligatorio = false }) => {
    localStorage.setItem('irrigo_token', token);
    localStorage.setItem('irrigo_usuario', JSON.stringify(usuario));
    localStorage.setItem('irrigo_requiere_onboarding', '0');
    setUsuarioActual(usuario);
    setEstaAutenticado(true);
    setRequiereOnboarding(false);
    setRequiereCambioPassword(Boolean(cambioObligatorio));
    setPredioActualId(usuario?.predios?.[0]?.predio ?? null);
    setVistaActual('dashboard');
  };

  const handleRegistroSuccess = (resultado) => {
    if (!resultado?.token || !resultado?.usuario) return;
    localStorage.setItem('irrigo_token', resultado.token);
    localStorage.setItem('irrigo_usuario', JSON.stringify(resultado.usuario));
    localStorage.setItem('irrigo_requiere_onboarding', '1');
    setUsuarioActual(resultado.usuario);
    setEstaAutenticado(true);
    setRequiereOnboarding(true);
    setPredioActualId(null);
    setModoRegistro(false);
  };

  const recargarSesion = async () => {
    const token = localStorage.getItem('irrigo_token');
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/auth/me`, { headers: authHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    const usuario = data.usuario;
    setUsuarioActual(usuario);
    localStorage.setItem('irrigo_usuario', JSON.stringify(usuario));
    const primerPredio = usuario?.predios?.[0]?.predio ?? null;
    setPredioActualId(primerPredio);
    setRequiereOnboarding(false);
    setRequiereCambioPassword(Boolean(data.requiereCambioPassword));
    localStorage.setItem('irrigo_requiere_onboarding', '0');
    setVistaActual('dashboard');
  };

  const cerrarSesion = () => {
    localStorage.removeItem('irrigo_token');
    localStorage.removeItem('irrigo_usuario');
    localStorage.removeItem('irrigo_requiere_onboarding');
    localStorage.removeItem('irrigo_predio_actual');
    setEstaAutenticado(false);
    setUsuarioActual(null);
    setRequiereOnboarding(false);
    setRequiereCambioPassword(false);
    setPredioActualId(null);
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
      </>
    );
  }

  if (requiereOnboarding) {
    return (
      <Onboarding
        usuario={usuarioActual}
        onComplete={recargarSesion}
      />
    );
  }

  if (requiereCambioPassword) {
    return <CambioPasswordObligatorio onSuccess={recargarSesion} />;
  }

  const predioActivo = usuarioActual?.predios?.find(p => p.predio === predioActualId)
    || usuarioActual?.predios?.[0]
    || null;
  const esAdmin = predioActivo?.rol === 'admin';
  const areaPermitida = (!esAdmin && predioActivo?.alcance === 'uno')
    ? predioActivo?.area
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
        predioActual={predioActivo}
      />

      <main className="flex-1 ml-64 p-10">

        {vistaActual === 'dashboard' && (
          <Dashboard
            setVistaActual={setVistaActual}
            esAdmin={esAdmin}
            areaPermitida={areaPermitida}
            predioActualId={predioActivo?.predio}
          />
        )}

        {vistaActual === 'areas' && (
          <AreasRiego
            setVistaActual={setVistaActual}
            setParcelaActiva={setParcelaActiva}
            areaPermitida={areaPermitida}
            predioActualId={predioActivo?.predio}
          />
        )}

        {vistaActual === 'detalle-parcela' && (
          <DetalleParcela
            setVistaActual={setVistaActual}
            parcelaId={parcelaActiva}
            esAdmin={esAdmin}
            predioActualId={predioActivo?.predio}
          />
        )}

        {vistaActual === 'alertas' && (
          <Alertas
            setVistaActual={setVistaActual}
            esAdmin={esAdmin}
            predioActualId={predioActivo?.predio}
            onAlertasChange={() => {
              fetch(`${API_BASE_URL}/alertas?idPredio=${predioActivo?.predio}`, { headers: authHeaders() })
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
          <Reportes setVistaActual={setVistaActual} predioActualId={predioActivo?.predio} />
        )}

        {vistaActual === 'mapa' && (
          <MapaDePredio
            setVistaActual={setVistaActual}
            setParcelaActiva={setParcelaActiva}
            areaPermitida={areaPermitida}
            predioActualId={predioActivo?.predio}
          />
        )}

        {vistaActual === 'perfil' && (
          <Perfil
            setVistaActual={setVistaActual}
            usuarioActual={usuarioActual}
            esAdmin={esAdmin}
            predioActual={predioActivo}
            onSeleccionarPredio={(predioId) => {
              setPredioActualId(predioId);
              setVistaActual('dashboard');
            }}
            onPredioActualizado={recargarSesion}
          />
        )}

        {vistaActual === 'parametros' && esAdmin && (
          <Parametros
            setVistaActual={setVistaActual}
            usuarioActual={usuarioActual}
            predioActualId={predioActivo?.predio}
          />
        )}

      </main>
    </div>
  );
}

export default App;