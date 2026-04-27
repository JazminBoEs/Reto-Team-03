import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from '../config';
import { authHeaders } from '../App';
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPinIcon,
  SignalIcon,
  BoltIcon,
  BuildingOfficeIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";

// ─── API Config ────────────────────────────────────────────
const API_BASE = API_BASE_URL;

// ─── Custom Leaflet Icons ──────────────────────────────────
const createIcon = (color, glow) =>
  L.divIcon({
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
    html: `
      <div style="
        width:32px;height:32px;display:flex;align-items:center;justify-content:center;
        background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        box-shadow:0 0 12px ${glow},0 4px 12px rgba(0,0,0,.4);
        border:2px solid rgba(255,255,255,.3);
      ">
        <div style="transform:rotate(45deg);width:12px;height:12px;background:white;border-radius:50%;opacity:.9"></div>
      </div>
    `,
  });

const predioIcon = createIcon("#A7C7E7", "rgba(167,199,231,.5)");
const sensorIcon = createIcon("#00FF9D", "rgba(0,255,157,.4)");
const sensorLowIcon = createIcon("#ef4444", "rgba(239,68,68,.4)");

// ─── Helper: Fly to bounds when data loads ─────────────────
function FitBounds({ coords }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (coords.length > 0 && !fitted.current) {
      fitted.current = true;
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds.pad(0.3), { maxZoom: 16 });
    }
  }, [coords, map]);

  return null;
}

// ─── Main Component ────────────────────────────────────────
export default function MapaDePredio({ setVistaActual, setParcelaActiva, predioActualId }) {
  const [predios, setPredios] = useState([]);
  const [sensores, setSensores] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const goToDashboard = () => setVistaActual('dashboard');
  const goToAreaDashboard = (areaId) => {
    if (areaId) {
      setParcelaActiva(areaId);
      setVistaActual('detalle-parcela');
    } else {
      setVistaActual('areas');
    }
  };

  // ── Fetch data from API ──
  const fetchData = async () => {
    if (!predioActualId) {
      setPredios([]);
      setSensores([]);
      setAreas([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [prediosRes, sensoresRes, areasRes] = await Promise.all([
        fetch(`${API_BASE}/predios`, { headers: authHeaders() }),
        fetch(`${API_BASE}/sensores?idPredio=${predioActualId}`, { headers: authHeaders() }),
        fetch(`${API_BASE}/areas-riego?idPredio=${predioActualId}`, { headers: authHeaders() }),
      ]);

      if (!prediosRes.ok || !sensoresRes.ok || !areasRes.ok) {
        throw new Error("Error al conectar con el servidor");
      }

      const [prediosData, sensoresData, areasData] = await Promise.all([
        prediosRes.json(),
        sensoresRes.json(),
        areasRes.json(),
      ]);

      setPredios(prediosData.filter(p => p.IDpredio === predioActualId));
      setSensores(sensoresData);
      setAreas(areasData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
      console.error("Error fetching map data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [predioActualId]);

  // ── Gather all valid coordinates for auto-fit ──
  const allCoords = [
    ...predios
      .filter((p) => p.Latitud && p.Longitud)
      .map((p) => [parseFloat(p.Latitud), parseFloat(p.Longitud)]),
    ...sensores
      .filter((s) => s.Latitud && s.Longitud)
      .map((s) => [parseFloat(s.Latitud), parseFloat(s.Longitud)]),
  ];

  const defaultCenter = allCoords.length > 0 ? allCoords[0] : [28.6353, -106.0889];

  // ── Find area name for a sensor ──
  const getAreaName = (areaId) => {
    const area = areas.find((a) => a.ID_Area === areaId);
    return area ? area.Nombre : "Sin asignar";
  };

  // ─── RENDER ──────────────────────────────────────────────
  return (
    <div className="animate-fade-in">
      {/* ─── HEADER ─── */}
      <header className="mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-white mb-2">
              Mapa del Predio
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-creamy-blue/80 font-medium">
                Ubicación de Predios y Sensores
              </span>
              <span className="text-gray-600">•</span>
              <span className="text-gray-400 text-sm">
                {lastUpdated
                  ? `Actualizado ${lastUpdated.toLocaleTimeString("es-MX")}`
                  : "Cargando..."}
              </span>
            </div>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="w-full md:w-auto justify-center flex items-center gap-2 px-5 py-3 bg-earth-panel border border-white/10 text-white font-semibold rounded-2xl hover:bg-white/5 hover:border-white/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <ArrowPathIcon
              className={`w-5 h-5 text-creamy-blue ${loading ? "animate-spin" : ""}`}
            />
            Actualizar
          </button>
        </div>
      </header>

      {/* ─── ERROR STATE ─── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 mb-6 flex items-center gap-4">
          <ExclamationTriangleIcon className="w-7 h-7 text-red-400 shrink-0" />
          <div>
            <p className="text-red-300 font-semibold">Error de conexión</p>
            <p className="text-red-400/70 text-sm">
              {error} — Asegúrate de que el servidor Flask esté corriendo en el puerto 3000.
            </p>
          </div>
        </div>
      )}

      {/* ─── STATS BAR ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 mb-6">
        <div className="bg-earth-panel p-5 rounded-3xl border border-white/5 shadow-xl flex items-center gap-4">
          <div className="p-3 bg-creamy-blue/10 rounded-2xl">
            <BuildingOfficeIcon className="w-7 h-7 text-creamy-blue" />
          </div>
          <div>
            <p className="text-gray-400 font-medium uppercase text-[10px] tracking-widest">
              Predios
            </p>
            <h3 className="text-2xl font-bold text-white">{predios.length}</h3>
          </div>
        </div>

        <div className="bg-earth-panel p-5 rounded-3xl border border-white/5 shadow-xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-2xl">
            <SignalIcon className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <p className="text-gray-400 font-medium uppercase text-[10px] tracking-widest">
              Sensores Activos
            </p>
            <h3 className="text-2xl font-bold text-white">{sensores.length}</h3>
          </div>
        </div>

        <div className="bg-earth-panel p-5 rounded-3xl border border-white/5 shadow-xl flex items-center gap-4">
          <div className="p-3 bg-soil-brown/10 rounded-2xl">
            <GlobeAltIcon className="w-7 h-7 text-soil-brown" />
          </div>
          <div>
            <p className="text-gray-400 font-medium uppercase text-[10px] tracking-widest">
              Áreas Monitoreadas
            </p>
            <h3 className="text-2xl font-bold text-white">{areas.length}</h3>
          </div>
        </div>
      </div>

      {/* ─── MAP + DETAIL PANEL ─── */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Map Container */}
        <div className="flex-1 bg-earth-panel rounded-3xl md:rounded-4xl border border-white/5 shadow-2xl overflow-hidden relative">
          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 z-1000 bg-earth-dark/70 backdrop-blur-sm flex flex-col items-center justify-center">
              <ArrowPathIcon className="w-10 h-10 text-creamy-blue animate-spin mb-4" />
              <p className="text-gray-400 font-medium">Cargando mapa…</p>
            </div>
          )}

          <div className="h-[320px] sm:h-[380px] md:h-[460px] lg:h-[520px] w-full">
          <MapContainer
            center={defaultCenter}
            zoom={15}
            style={{ height: "100%", width: "100%" }}
            className="z-0 rounded-3xl md:rounded-4xl"
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {/* Auto-fit map bounds */}
            <FitBounds coords={allCoords} />

            {/* Predio Markers */}
            {predios
              .filter((p) => p.Latitud && p.Longitud)
              .map((predio) => (
                <Marker
                  key={`predio-${predio.IDpredio}`}
                  position={[parseFloat(predio.Latitud), parseFloat(predio.Longitud)]}
                  icon={predioIcon}
                >
                  <Popup className="leaflet-popup-custom">
                    <div style={{ minWidth: 180 }}>
                      <h4
                        style={{
                          margin: "0 0 6px",
                          fontWeight: 700,
                          fontSize: 14,
                          color: "#1A1C19",
                        }}
                      >
                        <button
                          onClick={goToDashboard}
                          style={{
                            border: 'none',
                            padding: 0,
                            background: 'transparent',
                            color: 'inherit',
                            font: 'inherit',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            textUnderlineOffset: '4px',
                          }}
                        >
                          {predio.NombrePredio}
                        </button>
                      </h4>
                      <p style={{ margin: 0, fontSize: 12, color: "#555" }}>
                        {predio.Ubicacion || "Sin ubicación"}
                      </p>
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: 11,
                          color: "#888",
                          fontFamily: "monospace",
                        }}
                      >
                        {parseFloat(predio.Latitud).toFixed(6)},{" "}
                        {parseFloat(predio.Longitud).toFixed(6)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {/* Sensor Markers */}
            {sensores
              .filter((s) => s.Latitud && s.Longitud)
              .map((sensor) => (
                <Marker
                  key={`sensor-${sensor.IDsensor}`}
                  position={[parseFloat(sensor.Latitud), parseFloat(sensor.Longitud)]}
                  icon={sensor.Bateria < 20 ? sensorLowIcon : sensorIcon}
                  eventHandlers={{
                    click: () => setSelectedSensor(sensor),
                  }}
                >
                  <Popup className="leaflet-popup-custom">
                    <div style={{ minWidth: 180 }}>
                      <h4
                        style={{
                          margin: "0 0 6px",
                          fontWeight: 700,
                          fontSize: 14,
                          color: "#1A1C19",
                        }}
                      >
                        Sensor #{sensor.IDsensor}
                      </h4>
                      <p style={{ margin: 0, fontSize: 12, color: "#555" }}>
                        Batería: {sensor.Bateria}%
                      </p>
                      <p style={{ margin: "2px 0", fontSize: 12, color: "#555" }}>
                        Señal: {sensor.Senal}%
                      </p>
                      <p style={{ margin: "2px 0", fontSize: 12, color: "#888" }}>
                        Área:{' '}
                        <button
                          onClick={() => goToAreaDashboard(sensor.ID_Area)}
                          style={{
                            border: 'none',
                            padding: 0,
                            background: 'transparent',
                            color: '#1d4ed8',
                            font: 'inherit',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            textUnderlineOffset: '3px',
                          }}
                        >
                          {getAreaName(sensor.ID_Area)}
                        </button>
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
          </div>

          {/* ── LEYENDA flotante ── */}
          <div className="absolute bottom-3 left-3 md:bottom-6 md:left-6 z-999 bg-earth-dark/80 backdrop-blur-lg border border-white/10 rounded-2xl px-3 md:px-5 py-3 md:py-4 shadow-2xl max-w-[85%]">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
              Leyenda
            </p>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full"
                  style={{
                    background: "#A7C7E7",
                    boxShadow: "0 0 8px rgba(167,199,231,.5)",
                  }}
                ></span>
                <span className="text-xs md:text-sm text-gray-300">Predio</span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full"
                  style={{
                    background: "#00FF9D",
                    boxShadow: "0 0 8px rgba(0,255,157,.4)",
                  }}
                ></span>
                <span className="text-xs md:text-sm text-gray-300">Sensor (OK)</span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full"
                  style={{
                    background: "#ef4444",
                    boxShadow: "0 0 8px rgba(239,68,68,.4)",
                  }}
                ></span>
                <span className="text-xs md:text-sm text-gray-300">Sensor (Batería baja)</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── DETAIL SIDEBAR ── */}
        <div className="w-full xl:w-80 shrink-0 flex flex-col gap-5">
          {/* Selected Sensor Detail */}
          <div className="bg-earth-panel rounded-3xl border border-white/5 shadow-xl p-6 flex-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-5">
              Detalle del Sensor
            </p>

            {selectedSensor ? (
              <div className="space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <SignalIcon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Sensor #{selectedSensor.IDsensor}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {getAreaName(selectedSensor.ID_Area)}
                    </p>
                  </div>
                </div>

                {/* Battery bar */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-400 flex items-center gap-2">
                      <BoltIcon className="w-4 h-4" /> Batería
                    </span>
                    <span
                      className={`text-sm font-bold ${selectedSensor.Bateria < 20
                          ? "text-red-400"
                          : selectedSensor.Bateria < 50
                            ? "text-yellow-400"
                            : "text-emerald-400"
                        }`}
                    >
                      {selectedSensor.Bateria}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${selectedSensor.Bateria}%`,
                        background:
                          selectedSensor.Bateria < 20
                            ? "#ef4444"
                            : selectedSensor.Bateria < 50
                              ? "#eab308"
                              : "#10b981",
                      }}
                    ></div>
                  </div>
                </div>

                {/* Signal bar */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-400 flex items-center gap-2">
                      <SignalIcon className="w-4 h-4" /> Señal
                    </span>
                    <span className="text-sm font-bold text-creamy-blue">
                      {selectedSensor.Senal}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-creamy-blue transition-all duration-700"
                      style={{ width: `${selectedSensor.Senal}%` }}
                    ></div>
                  </div>
                </div>

                {/* Coordinates */}
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Coordenadas
                  </p>
                  <p className="text-sm text-gray-300 font-mono">
                    <MapPinIcon className="w-4 h-4 inline mr-1 text-creamy-blue" />
                    {selectedSensor.Latitud
                      ? `${parseFloat(selectedSensor.Latitud).toFixed(6)}, ${parseFloat(
                        selectedSensor.Longitud
                      ).toFixed(6)}`
                      : "No disponible"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
                  <MapPinIcon className="w-8 h-8 text-gray-500" />
                </div>
                <p className="text-gray-500 text-sm">
                  Haz clic en un sensor del mapa para ver sus detalles
                </p>
              </div>
            )}
          </div>

          {/* Predio List */}
          <div className="bg-earth-panel rounded-3xl border border-white/5 shadow-xl p-6">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
              Predios Registrados
            </p>
            <div className="space-y-3">
              {predios.length > 0 ? (
                predios.map((predio) => (
                  <div
                    key={predio.IDpredio}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white/3 border border-white/5 hover:bg-white/6 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-creamy-blue/10 flex items-center justify-center shrink-0">
                      <BuildingOfficeIcon className="w-5 h-5 text-creamy-blue" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {predio.NombrePredio}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {predio.Ubicacion || "Sin ubicación"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">
                  {loading ? "Cargando..." : "Sin predios registrados"}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
