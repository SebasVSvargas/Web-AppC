import React, { useState, useEffect } from 'react';
import db from '../../services/config';
import type { Consultation } from '../../services/DermatologyRepository';
import { 
  getPeriodDateRange, 
  exportToExcel, 
  generatePDFReport
} from '../../utils/reportsHelpers';
import type { PeriodType } from '../../utils/reportsHelpers';

interface GroupedRow {
  patientId: string;
  nombres: string;
  apellidos: string;
  documento: string;
  tratamientos: string;
  costoBaseTotal: number;
  epsCubiertoTotal: number;
  copagoPacienteTotal: number;
  visitas: number;
}

export const ReportsManager: React.FC = () => {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // --- Estados de Filtros ---
  const [periodType, setPeriodType] = useState<PeriodType>('mensual');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [detailValue, setDetailValue] = useState<string>('');
  const [groupByPatient, setGroupByPatient] = useState<boolean>(false);

  // --- Listas de Opciones de Años y Detalles ---
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()]);
  const [periodDetailOptions, setPeriodDetailOptions] = useState<{ value: string; label: string }[]>([]);

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const allConsultations = await db.getConsultations();
      setConsultations(allConsultations);

      // Calcular años disponibles dinámicamente según las consultas
      const years = new Set<number>();
      years.add(new Date().getFullYear());
      allConsultations.forEach((c) => {
        if (c.fecha) {
          const y = new Date(c.fecha).getFullYear();
          if (!isNaN(y)) years.add(y);
        }
      });
      setAvailableYears(Array.from(years).sort((a, b) => b - a));
    } catch (err: any) {
      console.error('Error al cargar datos de reportes:', err);
      setError('No se pudo conectar con la base de datos local para extraer el reporte.');
    } finally {
      setLoading(false);
    }
  };

  // Generar opciones de detalle cuando cambia el tipo de periodo o año
  useEffect(() => {
    const currentMonth = new Date().getMonth();
    const options: { value: string; label: string }[] = [];

    if (periodType === 'quincenal') {
      const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      meses.forEach((mes, index) => {
        options.push({ value: `${index}-1`, label: `1ª Quincena de ${mes} (Días 1-15)` });
        options.push({ value: `${index}-2`, label: `2ª Quincena de ${mes} (Días 16-Fin)` });
      });
      const isSecondHalf = new Date().getDate() >= 16;
      setDetailValue(`${currentMonth}-${isSecondHalf ? 2 : 1}`);
    } else if (periodType === 'mensual') {
      const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      meses.forEach((mes, index) => {
        options.push({ value: `${index}`, label: mes });
      });
      setDetailValue(`${currentMonth}`);
    } else if (periodType === 'trimestral') {
      options.push({ value: '0', label: 'Q1 (Enero - Marzo)' });
      options.push({ value: '1', label: 'Q2 (Abril - Junio)' });
      options.push({ value: '2', label: 'Q3 (Julio - Septiembre)' });
      options.push({ value: '3', label: 'Q4 (Octubre - Diciembre)' });
      
      const currentQuarter = Math.floor(currentMonth / 3);
      setDetailValue(`${currentQuarter}`);
    } else if (periodType === 'semestral') {
      options.push({ value: '0', label: '1º Semestre (Enero - Junio)' });
      options.push({ value: '1', label: '2º Semestre (Julio - Diciembre)' });
      
      const currentSemester = Math.floor(currentMonth / 6);
      setDetailValue(`${currentSemester}`);
    } else if (periodType === 'anual') {
      options.push({ value: 'all', label: 'Año Completo' });
      setDetailValue('all');
    }

    setPeriodDetailOptions(options);
  }, [periodType, selectedYear]);

  // Invocar al helper para obtener las fechas del rango
  const { start: dateStart, end: dateEnd, label: periodLabel } = getPeriodDateRange(
    periodType,
    selectedYear,
    detailValue
  );

  // Filtrado de Consultas en Memoria
  const getFilteredConsultations = (): Consultation[] => {
    return consultations.filter((c) => {
      if (!c.fecha) return false;
      const cDate = new Date(c.fecha);
      const dCompare = new Date(cDate.getFullYear(), cDate.getMonth(), cDate.getDate());
      const dStart = new Date(dateStart.getFullYear(), dateStart.getMonth(), dateStart.getDate());
      const dEnd = new Date(dateEnd.getFullYear(), dateEnd.getMonth(), dateEnd.getDate());
      return dCompare >= dStart && dCompare <= dEnd;
    });
  };

  const filteredData = getFilteredConsultations();

  // Generar filas finales de la tabla (agrupadas o no)
  const getReportRows = (): GroupedRow[] => {
    if (!groupByPatient) {
      return filteredData.map((c) => ({
        patientId: c.cliente_id,
        nombres: c.cliente_nombres || 'Desconocido',
        apellidos: c.cliente_apellidos || '',
        documento: c.cliente_documento || 'S/D',
        tratamientos: c.tratamiento_nombre || 'Consulta General',
        costoBaseTotal: Number(c.costo_aplicado),
        epsCubiertoTotal: Number(c.monto_cubierto),
        copagoPacienteTotal: Number(c.monto_pagado_paciente),
        visitas: 1
      }));
    }

    // Agrupación por documento
    const groups: { [key: string]: Consultation[] } = {};
    filteredData.forEach((c) => {
      const doc = c.cliente_documento || 'S/D';
      if (!groups[doc]) groups[doc] = [];
      groups[doc].push(c);
    });

    return Object.keys(groups).map((doc) => {
      const items = groups[doc];
      const patient = items[0];
      
      const distinctTreatments = Array.from(new Set(items.map((i) => i.tratamiento_nombre || 'Consulta')));
      const tratamientosConcat = distinctTreatments.join(' + ');
      const visitas = items.length;
      
      let costo = 0;
      let eps = 0;
      let copago = 0;
      items.forEach((i) => {
        costo += Number(i.costo_aplicado);
        eps += Number(i.monto_cubierto);
        copago += Number(i.monto_pagado_paciente);
      });

      return {
        patientId: patient.cliente_id,
        nombres: patient.cliente_nombres || 'Desconocido',
        apellidos: patient.cliente_apellidos || '',
        documento: doc,
        tratamientos: visitas > 1 ? `${tratamientosConcat} (${visitas} visitas)` : tratamientosConcat,
        costoBaseTotal: costo,
        epsCubiertoTotal: eps,
        copagoPacienteTotal: copago,
        visitas
      };
    }).sort((a, b) => a.apellidos.localeCompare(b.apellidos));
  };

  const reportRows = getReportRows();

  // Totales Acumulados
  const totalCostoBase = reportRows.reduce((acc, row) => acc + row.costoBaseTotal, 0);
  const totalEpsCubierto = reportRows.reduce((acc, row) => acc + row.epsCubiertoTotal, 0);
  const totalCopagoPaciente = reportRows.reduce((acc, row) => acc + row.copagoPacienteTotal, 0);

  // Mapear llamadas a Helpers Externos
  const handleExportPDF = () => {
    generatePDFReport({
      periodType,
      periodLabel,
      dateStart,
      dateEnd,
      groupByPatient,
      reportRows,
      totalCopagoPaciente,
      totalEpsCubierto,
      totalCostoBase,
      setLoading
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      periodType,
      periodLabel,
      dateStart,
      dateEnd,
      groupByPatient,
      reportRows,
      totalCopagoPaciente,
      totalEpsCubierto,
      totalCostoBase
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Cabecera */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.35rem', color: 'hsl(var(--text-primary))' }}>
          Módulo de Reportes Clínicos y Facturación
        </h2>
        <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>
          Consulta el flujo de pacientes, tratamientos acumulados e ingresos netos de caja por periodos calendarios. Activa la agrupación por cédula para consolidar visitas recurrentes y descarga reportes PDF o Excel profesionales.
        </p>
      </div>

      {error && <div className="alert error"><span>{error}</span></div>}

      {/* --- PANEL DE FILTROS --- */}
      <div style={{ 
        background: 'hsl(var(--bg-secondary))', 
        border: '1px solid hsl(var(--border-color))', 
        borderRadius: 'var(--radius-lg)', 
        padding: '1.5rem', 
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '1.25rem',
          alignItems: 'end'
        }}>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tipo de Periodo:</label>
            <select 
              className="form-input"
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as PeriodType)}
            >
              <option value="quincenal">Quincenal</option>
              <option value="mensual">Mensual</option>
              <option value="trimestral">Trimestral</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Anual</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label font-bold">Año:</label>
            <select 
              className="form-input"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {periodDetailOptions.length > 0 && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Periodo de Consulta:</label>
              <select 
                className="form-input"
                value={detailValue}
                onChange={(e) => setDetailValue(e.target.value)}
              >
                {periodDetailOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button 
              className="btn-primary"
              disabled={loading || filteredData.length === 0}
              onClick={handleExportPDF}
              style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              {loading ? 'Generando...' : 'Descargar PDF'}
            </button>

            <button 
              className="btn-primary"
              disabled={loading || filteredData.length === 0}
              onClick={handleExportExcel}
              style={{ 
                padding: '0.6rem 1rem', 
                fontSize: '0.85rem', 
                whiteSpace: 'nowrap',
                background: 'hsl(145, 45%, 45%)', /* Verde Excel */
                borderColor: 'hsl(145, 45%, 40%)'
              }}
            >
              Exportar a Excel
            </button>
            
            <button 
              className="btn-secondary" 
              onClick={loadData}
              style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}
            >
              Actualizar
            </button>
          </div>

        </div>

        {/* Interruptor para la agrupación consolidada */}
        <div style={{ 
          borderTop: '1px solid hsl(var(--border-color))', 
          paddingTop: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input 
              type="checkbox" 
              id="groupByPatientCheckbox"
              checked={groupByPatient}
              onChange={(e) => setGroupByPatient(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                accentColor: 'hsl(var(--color-primary))',
                cursor: 'pointer'
              }}
            />
            <label 
              htmlFor="groupByPatientCheckbox" 
              style={{ fontSize: '0.85rem', fontWeight: 600, color: 'hsl(var(--text-primary))', cursor: 'pointer' }}
            >
              Agrupar visitas recurrentes por paciente y sumar cobros
            </label>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>
            Rango Efectivo: <strong>{dateStart.toLocaleDateString('es-CO')}</strong> al <strong>{dateEnd.toLocaleDateString('es-CO')}</strong>
          </div>
        </div>

      </div>

      {/* --- TARJETAS ANALÍTICAS (KPIs) --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        
        <div style={{ 
          background: 'hsl(var(--bg-secondary))', 
          border: '1px solid hsl(var(--border-color))', 
          borderRadius: 'var(--radius-lg)', 
          padding: '1.25rem', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.35rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.2px' }}>
            Ingresos de Caja (Copagos)
          </span>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'hsl(var(--color-success))' }}>
            ${totalCopagoPaciente.toLocaleString('es-CO')}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
            Monto neto abonado en consultorio por pacientes.
          </span>
        </div>

        <div style={{ 
          background: 'hsl(var(--bg-secondary))', 
          border: '1px solid hsl(var(--border-color))', 
          borderRadius: 'var(--radius-lg)', 
          padding: '1.25rem', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.35rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.2px' }}>
            Facturación Convenios (EPS)
          </span>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'hsl(var(--color-primary))' }}>
            ${totalEpsCubierto.toLocaleString('es-CO')}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
            Monto acumulado cubierto por pólizas EPS.
          </span>
        </div>

        <div style={{ 
          background: 'hsl(var(--bg-secondary))', 
          border: '1px solid hsl(var(--border-color))', 
          borderRadius: 'var(--radius-lg)', 
          padding: '1.25rem', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.35rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.2px' }}>
            Facturación Bruta Total
          </span>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'hsl(var(--text-primary))' }}>
            ${totalCostoBase.toLocaleString('es-CO')}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
            Suma del valor base total de tratamientos realizados.
          </span>
        </div>

      </div>

      {/* --- TABLA DE REGISTROS --- */}
      <div style={{ 
        background: 'hsl(var(--bg-secondary))', 
        border: '1px solid hsl(var(--border-color))', 
        borderRadius: 'var(--radius-lg)', 
        padding: '1.5rem', 
        boxShadow: 'var(--shadow-sm)',
        overflowX: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'hsl(var(--text-primary))' }}>
            Detalle del Reporte ({reportRows.length} {groupByPatient ? 'Pacientes' : 'Consultas'})
          </h3>
          
          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', background: 'rgba(220, 80, 110, 0.06)', padding: '4px 10px', borderRadius: 'var(--radius-md)' }}>
            Periodo: {periodLabel}
          </span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid hsl(var(--border-color))', color: 'hsl(var(--text-secondary))', fontWeight: 700 }}>
              <th style={{ padding: '0.75rem 0.5rem' }}>Paciente</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Cédula</th>
              <th style={{ padding: '0.75rem 0.5rem', width: '35%' }}>Tratamiento(s) Realizado(s)</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 700, color: 'hsl(var(--text-primary))' }}>Copago Neto</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Cobro EPS</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Costo Base (Total)</th>
            </tr>
          </thead>
          <tbody>
            {reportRows.map((row, idx) => (
              <tr 
                key={row.patientId + '-' + idx} 
                style={{ 
                  borderBottom: '1px solid hsl(var(--border-color))',
                  background: idx % 2 === 1 ? 'rgba(0, 0, 0, 0.005)' : 'transparent'
                }}
              >
                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'hsl(var(--text-primary))' }}>
                  {row.apellidos}, {row.nombres}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', color: 'hsl(var(--text-secondary))' }}>
                  {row.documento}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', color: 'hsl(var(--text-primary))', lineHeight: '1.4' }}>
                  {row.tratamientos}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 700, color: 'hsl(var(--color-success))' }}>
                  ${row.copagoPacienteTotal.toLocaleString('es-CO')}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: 'hsl(var(--color-primary))' }}>
                  ${row.epsCubiertoTotal.toLocaleString('es-CO')}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: 'hsl(var(--text-secondary))' }}>
                  ${row.costoBaseTotal.toLocaleString('es-CO')}
                </td>
              </tr>
            ))}

            {reportRows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '3rem 0', textAlign: 'center', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>
                  No se registran consultas médicas ni ingresos en el periodo de tiempo seleccionado.
                </td>
              </tr>
            )}
          </tbody>

          {reportRows.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: '2px solid hsl(var(--text-primary))', fontWeight: 700, color: 'hsl(var(--text-primary))', background: 'rgba(220, 80, 110, 0.02)' }}>
                <td colSpan={3} style={{ padding: '1rem 0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total ingresos obtenidos:
                </td>
                <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: 'hsl(var(--color-success))', fontSize: '0.95rem' }}>
                  ${totalCopagoPaciente.toLocaleString('es-CO')}
                </td>
                <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: 'hsl(var(--color-primary))' }}>
                  ${totalEpsCubierto.toLocaleString('es-CO')}
                </td>
                <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                  ${totalCostoBase.toLocaleString('es-CO')}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

    </div>
  );
};
