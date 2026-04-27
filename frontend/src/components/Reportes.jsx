import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { authHeaders } from '../App';
import { ArrowLeftIcon, FunnelIcon, DocumentArrowDownIcon, TableCellsIcon, CalendarIcon, MapPinIcon, DocumentTextIcon, ChartBarIcon, PresentationChartLineIcon } from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const Reportes = ({ setVistaActual, predioActualId }) => {
  const [reportes, setReportes] = useState([]);
  const [reportesFiltrados, setReportesFiltrados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [areaFiltro, setAreaFiltro] = useState('');

  useEffect(() => {
    if (!predioActualId) {
      setReportes([]);
      setReportesFiltrados([]);
      setCargando(false);
      return;
    }
    fetch(`${API_BASE_URL}/mediciones-historicas?idPredio=${predioActualId}`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => { setReportes(data); setReportesFiltrados(data); setCargando(false); })
      .catch(error => { console.error("Error al cargar reportes:", error); setCargando(false); });
  }, [predioActualId]);

  const aplicarFiltros = () => {
    let filtrados = [...reportes];
    if (fechaInicio) filtrados = filtrados.filter(r => new Date(r.Fecha) >= new Date(fechaInicio));
    if (fechaFin) { const fin = new Date(fechaFin); fin.setDate(fin.getDate() + 1); filtrados = filtrados.filter(r => new Date(r.Fecha) < fin); }
    if (areaFiltro) filtrados = filtrados.filter(r => r.ID_Area.toString() === areaFiltro);
    setReportesFiltrados(filtrados);
  };

  const limpiarFiltros = () => { setFechaInicio(''); setFechaFin(''); setAreaFiltro(''); setReportesFiltrados(reportes); };

  // Cálculos
  const promHumedad = reportesFiltrados.length > 0 ? (reportesFiltrados.reduce((a, c) => a + (c.Humedad_suelo || 0), 0) / reportesFiltrados.length).toFixed(1) : 0;
  const promTemp = reportesFiltrados.length > 0 ? (reportesFiltrados.reduce((a, c) => a + (c.Temperatura_Suelo || 0), 0) / reportesFiltrados.length).toFixed(1) : 0;
  const aguaUsada = reportesFiltrados.reduce((a, c) => a + (c.consumo_agua || 0), 0);
  const promNDVI = reportesFiltrados.length > 0 ? (reportesFiltrados.reduce((a, c) => a + (c.Desarrollo_vegetativa || 0), 0) / reportesFiltrados.length) : 0;
  const eficienciaGlobal = (promNDVI * 100).toFixed(0);
  const areasUnicas = new Set(reportesFiltrados.map(r => r.ID_Area)).size;

  const statsPorArea = Object.values(reportesFiltrados.reduce((acc, curr) => {
    if (!acc[curr.ID_Area]) acc[curr.ID_Area] = { id: curr.ID_Area, humedadTotal: 0, ndviTotal: 0, aguaTotal: 0, count: 0 };
    acc[curr.ID_Area].humedadTotal += (curr.Humedad_suelo || 0);
    acc[curr.ID_Area].ndviTotal += (curr.Desarrollo_vegetativa || 0);
    acc[curr.ID_Area].aguaTotal += (curr.consumo_agua || 0);
    acc[curr.ID_Area].count += 1;
    return acc;
  }, {})).map(area => ({
    id: area.id, humedad: (area.humedadTotal / area.count).toFixed(1),
    eficiencia: ((area.ndviTotal / area.count) * 100).toFixed(0), agua: area.aguaTotal.toFixed(0)
  }));

  // Gráfica
  const generarTendenciasReales = () => {
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const acumulado = { 'Lun': { h: 0, t: 0, r: 0, count: 0 }, 'Mar': { h: 0, t: 0, r: 0, count: 0 }, 'Mié': { h: 0, t: 0, r: 0, count: 0 }, 'Jue': { h: 0, t: 0, r: 0, count: 0 }, 'Vie': { h: 0, t: 0, r: 0, count: 0 }, 'Sáb': { h: 0, t: 0, r: 0, count: 0 }, 'Dom': { h: 0, t: 0, r: 0, count: 0 } };
    reportesFiltrados.forEach(curr => {
      const fecha = new Date(curr.Fecha);
      const nombreDia = diasSemana[fecha.getDay()];
      acumulado[nombreDia].h += curr.Humedad_suelo || 0;
      acumulado[nombreDia].t += curr.Temperatura_Suelo || 0;
      acumulado[nombreDia].r += (curr.consumo_agua || 0) / 10;
      acumulado[nombreDia].count += 1;
    });
    const ordenDias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    return ordenDias.map(dia => ({
      dia, h: acumulado[dia].count > 0 ? Math.round(acumulado[dia].h / acumulado[dia].count) : 0,
      t: acumulado[dia].count > 0 ? Math.round(acumulado[dia].t / acumulado[dia].count) : 0,
      r: acumulado[dia].count > 0 ? Math.round(acumulado[dia].r / acumulado[dia].count) : 0,
    }));
  };
  const datosGrafica = generarTendenciasReales();

  // === EXPORTAR PDF ===
  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(34, 139, 34);
    doc.text('IrriGo — Reporte de Mediciones', 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 14, 30);
    doc.text(`Registros: ${reportesFiltrados.length} | Áreas: ${areasUnicas}`, 14, 36);

    // Resumen
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Resumen', 14, 46);
    doc.setFontSize(10);
    doc.text(`Humedad Promedio: ${promHumedad}%`, 14, 54);
    doc.text(`Temperatura Promedio: ${promTemp}°C`, 14, 60);
    doc.text(`Agua Total Usada: ${aguaUsada.toLocaleString()} L`, 14, 66);
    doc.text(`Eficiencia (NDVI): ${eficienciaGlobal}%`, 14, 72);

    // Tabla
    const columnas = ['ID', 'Área', 'Fecha', 'Humedad', 'Temp', 'Consumo', 'NDVI', 'ET₀'];
    const filas = reportesFiltrados.map(r => [
      r.ID_Medicion, r.ID_Area,
      r.Fecha ? new Date(r.Fecha).toLocaleDateString('es-MX') : '-',
      r.Humedad_suelo != null ? `${r.Humedad_suelo}%` : '-',
      r.Temperatura_Suelo != null ? `${r.Temperatura_Suelo}°C` : '-',
      r.consumo_agua != null ? `${r.consumo_agua} L` : '-',
      r.Desarrollo_vegetativa != null ? r.Desarrollo_vegetativa.toFixed(2) : '-',
      r.Evapotranspiracion != null ? `${r.Evapotranspiracion} mm/d` : '-',
    ]);
    autoTable(doc, { head: [columnas], body: filas, startY: 80, styles: { fontSize: 8 }, headStyles: { fillColor: [34, 139, 34] } });
    doc.save(`IrriGo_Reporte_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  // === EXPORTAR EXCEL ===
  const exportarExcel = () => {
    const datos = reportesFiltrados.map(r => ({
      'ID Medición': r.ID_Medicion, 'ID Área': r.ID_Area,
      'Fecha': r.Fecha ? new Date(r.Fecha).toLocaleDateString('es-MX') : '',
      'Humedad Suelo (%)': r.Humedad_suelo, 'Temp Suelo (°C)': r.Temperatura_Suelo,
      'Consumo Agua (L)': r.consumo_agua, 'NDVI': r.Desarrollo_vegetativa,
      'ET₀ (mm/d)': r.Evapotranspiracion, 'Conductividad (dS/m)': r.Conductividad_suelo,
      'Potencial Hídrico (MPa)': r.Potencial_Hidrico, 'Temp Ambiental (°C)': r.Temp_Ambiental,
      'Humedad Relativa (%)': r.Humedad_Relativa, 'Viento (km/h)': r.Velocidad_Viento,
      'Radiación (W/m²)': r.Radiacion_Sol, 'Consumo Diario Prom (L)': r.Consumo_Diario_Prom,
      'Consumo Acumulado (L)': r.Consumo_Acum
    }));
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mediciones');
    // Stats por área
    const statsData = statsPorArea.map(a => ({ 'Área': `Parcela #${a.id}`, 'Humedad Prom (%)': a.humedad, 'Eficiencia (%)': a.eficiencia, 'Agua Total (L)': a.agua }));
    const ws2 = XLSX.utils.json_to_sheet(statsData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Resumen por Área');
    XLSX.writeFile(wb, `IrriGo_Reporte_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  if (cargando) return <div className="flex justify-center h-[70vh] items-center"><div className="w-16 h-16 border-4 border-creamy-blue border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="animate-fade-in pb-10 max-w-6xl mx-auto">
      <header className="mb-8 border-b border-white/5 pb-6">
        <div onClick={() => setVistaActual('dashboard')} className="flex items-center gap-2 text-creamy-blue hover:text-white cursor-pointer w-fit mb-4">
          <ArrowLeftIcon className="w-4 h-4" /> <span className="text-sm font-bold">Volver al Dashboard</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-1">Reportes y Análisis</h2>
        <p className="text-gray-400">Visualización y exportación de datos históricos</p>
      </header>

      {/* FILTROS */}
      <div className="bg-earth-panel p-4 md:p-8 rounded-3xl md:rounded-4xl border border-white/5 shadow-2xl mb-6">
        <div className="flex items-center gap-3 text-white font-bold text-lg mb-6"><FunnelIcon className="w-6 h-6 text-creamy-blue" /> Filtros</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <div><label className="block text-sm font-medium text-gray-400 mb-2">Fecha Inicio</label><div className="relative"><CalendarIcon className="absolute left-4 top-3.5 h-5 w-5 text-gray-500 pointer-events-none" /><input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="bg-black/30 border border-white/10 text-white rounded-xl w-full pl-12 p-3.5 focus:border-creamy-blue transition-all" /></div></div>
          <div><label className="block text-sm font-medium text-gray-400 mb-2">Fecha Fin</label><div className="relative"><CalendarIcon className="absolute left-4 top-3.5 h-5 w-5 text-gray-500 pointer-events-none" /><input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="bg-black/30 border border-white/10 text-white rounded-xl w-full pl-12 p-3.5 focus:border-creamy-blue transition-all" /></div></div>
          <div><label className="block text-sm font-medium text-gray-400 mb-2">Área (ID)</label><div className="relative"><MapPinIcon className="absolute left-4 top-3.5 h-5 w-5 text-gray-500 pointer-events-none" /><input type="number" placeholder="Ej. 1, 2..." value={areaFiltro} onChange={(e) => setAreaFiltro(e.target.value)} className="bg-black/30 border border-white/10 text-white rounded-xl w-full pl-12 p-3.5 focus:border-creamy-blue transition-all" /></div></div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
          <button onClick={aplicarFiltros} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg cursor-pointer">Aplicar Filtros</button>
          <button onClick={limpiarFiltros} className="sm:w-40 md:w-48 bg-transparent border border-white/20 text-gray-300 hover:bg-white/10 hover:text-white font-bold py-4 px-6 rounded-xl cursor-pointer">Limpiar</button>
        </div>
      </div>

      {/* BOTONES EXPORTAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <button onClick={exportarPDF} className="flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-bold cursor-pointer transition-colors"><DocumentArrowDownIcon className="w-6 h-6" /> Exportar como PDF</button>
        <button onClick={exportarExcel} className="flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-creamy-blue/30 text-creamy-blue hover:bg-creamy-blue/10 font-bold cursor-pointer transition-colors"><TableCellsIcon className="w-6 h-6" /> Exportar como Excel</button>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-[#0f2922] border border-emerald-500/20 p-6 rounded-4xl shadow-lg"><p className="text-gray-400 font-medium text-sm mb-2">Promedio Humedad</p><h3 className="text-4xl font-black text-emerald-400 mb-1">{promHumedad}%</h3><p className="text-xs text-gray-500 mt-2">Últimos {reportesFiltrados.length} registros</p></div>
        <div className="bg-[#2a1f13] border border-amber-500/20 p-6 rounded-4xl shadow-lg"><p className="text-gray-400 font-medium text-sm mb-2">Promedio Temp.</p><h3 className="text-4xl font-black text-[#f97316] mb-1">{promTemp}°C</h3><p className="text-xs text-gray-500 mt-2">Últimos {reportesFiltrados.length} registros</p></div>
        <div className="bg-[#0f2329] border border-cyan-500/20 p-6 rounded-4xl shadow-lg"><p className="text-gray-400 font-medium text-sm mb-2">Agua Usada</p><h3 className="text-4xl font-black text-[#00d1ff] mb-1">{aguaUsada.toLocaleString()}L</h3><p className="text-xs text-gray-500 mt-2">Acumulado total</p></div>
        <div className="bg-[#231533] border border-purple-500/20 p-6 rounded-4xl shadow-lg"><p className="text-gray-400 font-medium text-sm mb-2">Eficiencia Promedio</p><h3 className="text-4xl font-black text-[#a855f7] mb-1">{eficienciaGlobal}%</h3><p className="text-xs text-gray-500 mt-2">Basado en índice NDVI</p></div>
      </div>

      {/* RESUMEN */}
      <div className="bg-emerald-950/20 border border-emerald-500/30 p-8 rounded-4xl shadow-lg mb-8">
        <div className="flex items-center gap-3 text-emerald-400 font-bold text-xl mb-6"><DocumentTextIcon className="w-7 h-7" /> Resumen del Reporte</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-gray-300">
          <p><strong className="text-white">Áreas monitoreadas:</strong> {areasUnicas} áreas activas</p>
          <p><strong className="text-white">Lecturas totales:</strong> {reportesFiltrados.length.toLocaleString()} mediciones</p>
          <p><strong className="text-white">Consumo total de agua:</strong> {aguaUsada.toLocaleString()} litros</p>
          <p><strong className="text-white">Eficiencia general:</strong> {eficienciaGlobal}% ({eficienciaGlobal >= 80 ? 'Excelente' : 'Requiere Atención'})</p>
        </div>
      </div>

      {/* GRÁFICA */}
      <div className="bg-earth-panel p-4 md:p-8 rounded-3xl md:rounded-4xl border border-white/5 shadow-2xl mb-8">
        <div className="flex items-center gap-3 text-white font-bold text-xl mb-8"><ChartBarIcon className="w-7 h-7 text-creamy-blue" /> Tendencias Semanales</div>
        <div className="overflow-x-auto">
        <div className="relative h-56 md:h-64 min-w-[520px] border-b border-l border-white/10 flex items-end justify-around pb-0 pt-4 px-2">
          <div className="absolute w-full h-full border-t border-white/5 top-1/4 left-0"></div>
          <div className="absolute w-full h-full border-t border-white/5 top-2/4 left-0"></div>
          <div className="absolute w-full h-full border-t border-white/5 top-3/4 left-0"></div>
          {datosGrafica.map((dato, i) => (
            <div key={i} className="flex flex-col items-center gap-2 h-full justify-end z-10 w-full">
              <div className="flex items-end gap-1.5 w-full justify-center h-full">
                <div className="w-2 sm:w-3 md:w-5 bg-[#34d399] rounded-t-sm hover:opacity-80 transition-opacity relative group" style={{ height: `${Math.min(dato.h, 100)}%` }}><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] md:text-xs text-white opacity-0 group-hover:opacity-100">{dato.h}</span></div>
                <div className="w-2 sm:w-3 md:w-5 bg-[#fbbf24] rounded-t-sm hover:opacity-80 transition-opacity relative group" style={{ height: `${Math.min(dato.t, 100)}%` }}><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] md:text-xs text-white opacity-0 group-hover:opacity-100">{dato.t}</span></div>
                <div className="w-2 sm:w-3 md:w-5 bg-[#22d3ee] rounded-t-sm hover:opacity-80 transition-opacity relative group" style={{ height: `${Math.min(dato.r, 100)}%` }}><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] md:text-xs text-white opacity-0 group-hover:opacity-100">{dato.r}</span></div>
              </div>
              <span className="text-xs text-gray-500 font-bold mt-2">{dato.dia}</span>
            </div>
          ))}
        </div>
        </div>
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-6">
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#34d399]"></div><span className="text-sm text-[#34d399]">Humedad (%)</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#fbbf24]"></div><span className="text-sm text-[#fbbf24]">Temperatura (°C)</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#22d3ee]"></div><span className="text-sm text-[#22d3ee]">Riego Est. (min)</span></div>
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-earth-panel rounded-3xl md:rounded-4xl border border-white/5 shadow-2xl overflow-hidden">
        <div className="p-4 md:p-8 border-b border-white/5 flex items-center gap-3"><PresentationChartLineIcon className="w-7 h-7 text-creamy-blue" /><h3 className="text-xl font-serif font-bold text-white">Estadísticas por Área</h3></div>
        <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-black/20 text-gray-400 text-sm font-bold border-b border-white/10"><tr><th className="px-3 md:px-5 lg:px-8 py-4 md:py-5">Área</th><th className="px-3 md:px-5 lg:px-8 py-4 md:py-5">Humedad</th><th className="px-3 md:px-5 lg:px-8 py-4 md:py-5">Eficiencia</th><th className="px-3 md:px-5 lg:px-8 py-4 md:py-5">Agua (L)</th><th className="px-3 md:px-5 lg:px-8 py-4 md:py-5">Estado</th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {statsPorArea.map((area) => (
                <tr key={area.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-3 md:px-5 lg:px-8 py-4 md:py-6 text-white font-bold">Parcela #{area.id}</td>
                  <td className="px-3 md:px-5 lg:px-8 py-4 md:py-6 text-emerald-400 font-bold">{area.humedad}%</td>
                  <td className="px-3 md:px-5 lg:px-8 py-4 md:py-6"><div className="flex items-center gap-3"><div className="w-20 md:w-24 bg-gray-800 rounded-full h-2 overflow-hidden"><div className={`h-2 rounded-full ${area.eficiencia >= 80 ? 'bg-emerald-400' : 'bg-amber-500'}`} style={{ width: `${Math.min(area.eficiencia, 100)}%` }}></div></div><span className="text-sm text-gray-300">{area.eficiencia}%</span></div></td>
                  <td className="px-3 md:px-5 lg:px-8 py-4 md:py-6 text-gray-300">{area.agua}L</td>
                  <td className="px-3 md:px-5 lg:px-8 py-4 md:py-6">{area.eficiencia >= 80 ? (<span className="px-3 md:px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 uppercase tracking-wider border border-emerald-500/20">Óptimo</span>) : (<span className="px-3 md:px-4 py-1.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 uppercase tracking-wider border border-amber-500/20">Advertencia</span>)}</td>
                </tr>
              ))}
              {statsPorArea.length === 0 && (<tr><td colSpan="5" className="px-3 md:px-8 py-10 text-center text-gray-500">No hay datos en el rango seleccionado.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reportes;
