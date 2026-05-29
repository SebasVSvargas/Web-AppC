import React, { useState, useEffect } from 'react';
import db from '../../services/config';
import type { Patient, Treatment, EPS } from '../../services/DermatologyRepository';

interface ConsultationFormProps {
  onSaveSuccess: () => void;
}

export const ConsultationForm: React.FC<ConsultationFormProps> = ({ onSaveSuccess }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [epsList, setEpsList] = useState<EPS[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // --- Campos del Formulario ---
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>('');
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [costoAplicado, setCostoAplicado] = useState<number>(0);
  const [selectedEpsId, setSelectedEpsId] = useState<string>('');
  const [coberturaPorcentaje, setCoberturaPorcentaje] = useState<number>(0);
  const [descripcion, setDescripcion] = useState<string>('');

  // --- Cálculos automáticos ---
  const [montoCubierto, setMontoCubierto] = useState<number>(0);
  const [montoPagadoPaciente, setMontoPagadoPaciente] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [patientsData, treatmentsData, epsData] = await Promise.all([
        db.getPatients(),
        db.getTreatments(),
        db.getEPS()
      ]);
      setPatients(patientsData);
      setTreatments(treatmentsData);
      setEpsList(epsData);
    } catch (err: any) {
      console.error(err);
      setError('Error al cargar datos iniciales desde catadb.');
    } finally {
      setLoading(false);
    }
  };

  // Re-calcular los montos financieros cuando cambia el costo o la cobertura de la EPS
  useEffect(() => {
    const cubierto = costoAplicado * (coberturaPorcentaje / 100);
    const pagado = costoAplicado - cubierto;
    
    setMontoCubierto(parseFloat(cubierto.toFixed(2)));
    setMontoPagadoPaciente(parseFloat(pagado.toFixed(2)));
  }, [costoAplicado, coberturaPorcentaje]);

  // Al seleccionar un paciente, precargar su EPS habitual
  const handlePatientChange = (patientId: string) => {
    setSelectedPatientId(patientId);
    setError(null);
    const patient = patients.find((p) => p.id === patientId);
    
    if (patient) {
      if (patient.eps_id) {
        setSelectedEpsId(patient.eps_id);
        setCoberturaPorcentaje(patient.eps_cobertura || 0);
      } else {
        setSelectedEpsId('');
        setCoberturaPorcentaje(0);
      }
    }
  };

  // Al seleccionar un tratamiento, precargar su precio base actual de catálogo
  const handleTreatmentChange = (treatmentId: string) => {
    setSelectedTreatmentId(treatmentId);
    setError(null);
    const treatment = treatments.find((t) => t.id === treatmentId);
    
    if (treatment) {
      // Cargamos el costo del tratamiento, el cual puede ser editado libremente por el profesional
      setCostoAplicado(Number(treatment.precio_base));
    }
  };

  // Al seleccionar/cambiar la EPS para esta cita específica
  const handleEpsChange = (epsId: string) => {
    setSelectedEpsId(epsId);
    const eps = epsList.find((e) => e.id === epsId);
    if (eps) {
      setCoberturaPorcentaje(eps.cobertura_porcentaje);
    } else {
      setCoberturaPorcentaje(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      setError('Por favor, selecciona un paciente de la lista.');
      return;
    }
    if (!selectedTreatmentId) {
      setError('Por favor, selecciona el procedimiento a realizar.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await db.createConsultation({
        cliente_id: selectedPatientId,
        fecha,
        tratamiento_id: selectedTreatmentId,
        descripcion: descripcion.trim() || undefined,
        costo_aplicado: costoAplicado,
        eps_id: selectedEpsId || undefined,
        porcentaje_cobertura: coberturaPorcentaje,
        monto_cubierto: montoCubierto,
        monto_pagado_paciente: montoPagadoPaciente
      });

      setSuccess(true);
      
      // Limpiar campos
      setSelectedPatientId('');
      setSelectedTreatmentId('');
      setCostoAplicado(0);
      setSelectedEpsId('');
      setCoberturaPorcentaje(0);
      setDescripcion('');
      
      // Redirigir al historial tras un breve delay
      setTimeout(() => {
        onSaveSuccess();
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setError('Error al registrar la consulta en PostgreSQL.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.35rem', color: 'hsl(var(--text-primary))' }}>
          Registrar Consulta Dermatológica
        </h2>
        <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>
          Carga un nuevo procedimiento clínico para un paciente. El sistema calculará de forma automática las deducciones financieras asociadas a su convenio de EPS y registrará el costo histórico exacto.
        </p>
      </div>

      {error && <div className="alert error"><span>{error}</span></div>}
      {success && <div className="alert success"><span>¡Consulta y liquidación de costos guardados con éxito!</span></div>}

      <form onSubmit={handleSubmit} style={{ background: 'hsl(var(--bg-secondary))', border: '1px solid hsl(var(--border-color))', borderRadius: 'var(--radius-lg)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: 'var(--shadow-md)' }}>
        
        {/* Paciente y Fecha */}
        <div className="form-row">
          <div className="form-group" style={{ flex: 1.5 }}>
            <label className="form-label">Paciente:</label>
            <select 
              className="form-input"
              value={selectedPatientId}
              onChange={(e) => handlePatientChange(e.target.value)}
              style={{ background: 'hsl(var(--bg-secondary))' }}
              required
            >
              <option value="">-- Selecciona el paciente --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.apellidos}, {p.nombres} ({p.documento})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Fecha de la Consulta:</label>
            <input 
              type="date" 
              className="form-input" 
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Procedimiento y Costo */}
        <div className="form-row">
          <div className="form-group" style={{ flex: 1.5 }}>
            <label className="form-label">Procedimiento Dermatológico:</label>
            <select 
              className="form-input"
              value={selectedTreatmentId}
              onChange={(e) => handleTreatmentChange(e.target.value)}
              style={{ background: 'hsl(var(--bg-secondary))' }}
              required
            >
              <option value="">-- Selecciona el procedimiento --</option>
              {treatments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Costo de Consulta / Procedimiento ($):</label>
            <input 
              type="number" 
              className="form-input" 
              min="0" 
              value={costoAplicado || ''}
              onChange={(e) => setCostoAplicado(Math.max(0, parseFloat(e.target.value) || 0))}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', marginTop: '0.15rem' }}>
              Precio ajustable libremente para este año/visita.
            </span>
          </div>
        </div>

        {/* EPS y Cobertura */}
        <div className="form-row">
          <div className="form-group" style={{ flex: 1.5 }}>
            <label className="form-label">EPS Aplicada para este Cobro:</label>
            <select 
              className="form-input"
              value={selectedEpsId}
              onChange={(e) => handleEpsChange(e.target.value)}
              style={{ background: 'hsl(var(--bg-secondary))' }}
            >
              <option value="">Particular / Sin Cobertura Especial</option>
              {epsList.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre} ({e.cobertura_porcentaje}% cobertura)
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Cobertura de Póliza Aplicada (%):</label>
            <input 
              type="number" 
              className="form-input" 
              min="0" 
              max="100" 
              value={coberturaPorcentaje}
              onChange={(e) => setCoberturaPorcentaje(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              disabled={!selectedEpsId} // Deshabilitado si es Particular
            />
          </div>
        </div>

        {/* Descripción del Procedimiento */}
        <div className="form-group">
          <label className="form-label">Descripción del Procedimiento / Notas Clínicas (Opcional):</label>
          <textarea 
            className="form-input" 
            placeholder="Añade detalles médicos, medicamentos formulados, o notas de control..." 
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={4}
            style={{ resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        {/* --- DESGLOSE FINANCIERO DINÁMICO (Premium & Tipográfico) --- */}
        <div style={{ background: 'hsl(var(--bg-primary))', border: '1px solid hsl(var(--border-color))', borderRadius: 'var(--radius-md)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'hsl(var(--text-primary))', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '0.5rem', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Desglose de Liquidación
          </h4>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: 'hsl(var(--text-secondary))' }}>Valor Total del Servicio:</span>
            <span style={{ fontWeight: 600, color: 'hsl(var(--text-primary))' }}>
              ${costoAplicado.toLocaleString('es-CO')} COP
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: 'hsl(var(--text-secondary))' }}>
              Cobertura por Convenio ({coberturaPorcentaje}%):
            </span>
            <span style={{ fontWeight: 600, color: 'hsl(var(--color-primary))' }}>
              -${montoCubierto.toLocaleString('es-CO')} COP
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', borderTop: '1.5px dashed hsl(var(--border-color))', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
            <span style={{ fontWeight: 700, color: 'hsl(var(--text-primary))' }}>Copago Neto a Pagar Paciente:</span>
            <span style={{ fontWeight: 800, color: 'hsl(var(--color-success))', fontSize: '1.1rem' }}>
              ${montoPagadoPaciente.toLocaleString('es-CO')} COP
            </span>
          </div>
        </div>

        {/* Botón de Envío */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <>
                <div className="spinner"></div>
                <span>Registrando Consulta...</span>
              </>
            ) : (
              <span>Registrar Consulta y Liquidar</span>
            )}
          </button>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={() => {
              setSelectedPatientId('');
              setSelectedTreatmentId('');
              setCostoAplicado(0);
              setSelectedEpsId('');
              setCoberturaPorcentaje(0);
              setDescripcion('');
              setError(null);
            }}
            disabled={loading}
          >
            Limpiar Formulario
          </button>
        </div>

      </form>
    </div>
  );
};
