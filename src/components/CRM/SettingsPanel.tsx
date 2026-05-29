import React, { useState, useEffect } from 'react';
import db from '../../services/config';
import type { EPS, Treatment } from '../../services/DermatologyRepository';

export const SettingsPanel: React.FC = () => {
  // --- Estados de EPS ---
  const [epsList, setEpsList] = useState<EPS[]>([]);
  const [newEpsName, setNewEpsName] = useState<string>('');
  const [newEpsCoverage, setNewEpsCoverage] = useState<number>(0);
  const [epsLoading, setEpsLoading] = useState<boolean>(false);
  const [epsError, setEpsError] = useState<string | null>(null);

  // --- Estados de Tratamientos ---
  const [treatmentList, setTreatmentList] = useState<Treatment[]>([]);
  const [newTreatmentName, setNewTreatmentName] = useState<string>('');
  const [newTreatmentPrice, setNewTreatmentPrice] = useState<number>(0);
  const [treatmentLoading, setTreatmentLoading] = useState<boolean>(false);
  const [treatmentError, setTreatmentError] = useState<string | null>(null);

  // Cargar datos al montar el componente
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setEpsLoading(true);
      setTreatmentLoading(true);
      
      const [eps, treatments] = await Promise.all([
        db.getEPS(),
        db.getTreatments()
      ]);
      
      setEpsList(eps);
      setTreatmentList(treatments);
    } catch (err: any) {
      console.error('Error al cargar configuraciones:', err);
    } finally {
      setEpsLoading(false);
      setTreatmentLoading(false);
    }
  };

  // --- Acciones de EPS ---
  const handleAddEPS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEpsName.trim()) return;
    
    setEpsLoading(true);
    setEpsError(null);
    try {
      const added = await db.createEPS(newEpsName.trim(), newEpsCoverage);
      setEpsList((prev) => [...prev, added].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setNewEpsName('');
      setNewEpsCoverage(0);
    } catch (err: any) {
      console.error(err);
      setEpsError('Error al crear la EPS. Puede que el nombre ya exista.');
    } finally {
      setEpsLoading(false);
    }
  };

  // --- Acciones de Tratamientos ---
  const handleAddTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTreatmentName.trim() || newTreatmentPrice <= 0) return;

    setTreatmentLoading(true);
    setTreatmentError(null);
    try {
      const added = await db.createTreatment(newTreatmentName.trim(), newTreatmentPrice);
      setTreatmentList((prev) => [...prev, added].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setNewTreatmentName('');
      setNewTreatmentPrice(0);
    } catch (err: any) {
      console.error(err);
      setTreatmentError('Error al crear el tratamiento. Puede que el nombre ya exista.');
    } finally {
      setTreatmentLoading(false);
    }
  };

  const handleToggleTreatment = async (treatment: Treatment) => {
    try {
      const updated = await db.updateTreatment(treatment.id, treatment.nombre, treatment.precio_base, !treatment.activo);
      setTreatmentList((prev) => 
        prev.map((t) => (t.id === treatment.id ? updated : t))
            .filter((t) => t.activo) // Filtrar los inactivos de la vista de catálogo activo
      );
    } catch (err: any) {
      console.error('Error al desactivar tratamiento:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.35rem', color: 'hsl(var(--text-primary))' }}>
          Convenios y Catálogo
        </h2>
        <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>
          Configura y personaliza las entidades de EPS de tus pacientes y los tratamientos disponibles en tu clínica. La información guardada se almacena en PostgreSQL y se actualizará dinámicamente en las citas.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
        
        {/* --- COLUMNA 1: GESTIÓN DE EPS --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'hsl(var(--text-primary))' }}>
              Entidades EPS y Convenios
            </h3>
          </div>

          {epsError && <div className="alert error"><span>{epsError}</span></div>}

          {/* Formulario Agregar EPS */}
          <form onSubmit={handleAddEPS} style={{ background: 'hsl(var(--bg-primary))', border: '1px solid hsl(var(--border-color))', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Nombre de la EPS / Convenio:</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ej. Sura, Colpatria, Sanitas" 
                value={newEpsName}
                onChange={(e) => setNewEpsName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Porcentaje de Cobertura de la Póliza (%):</label>
              <input 
                type="number" 
                className="form-input" 
                min="0" 
                max="100" 
                placeholder="Ej. 80" 
                value={newEpsCoverage || ''}
                onChange={(e) => setNewEpsCoverage(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', marginTop: '0.15rem' }}>
                Este porcentaje de descuento se aplicará automáticamente al costo de la consulta del paciente.
              </span>
            </div>

            <button type="submit" className="btn-primary" disabled={epsLoading} style={{ alignSelf: 'flex-start' }}>
              Agregar EPS
            </button>
          </form>

          {/* Listado EPS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'hsl(var(--text-primary))', marginBottom: '0.25rem' }}>
              EPS Registradas ({epsList.length})
            </h4>

            {epsLoading && <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>Cargando convenios...</p>}
            
            {!epsLoading && epsList.length === 0 && (
              <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>No hay EPS registradas.</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '300px', overflowY: 'auto' }}>
              {epsList.map((eps) => (
                <div key={eps.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: 'hsl(var(--bg-secondary))', border: '1px solid hsl(var(--border-color))', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'hsl(var(--text-primary))' }}>{eps.nombre}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(var(--color-primary))', background: 'rgba(220, 80, 110, 0.08)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
                    {eps.cobertura_porcentaje}% cobertura
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- COLUMNA 2: GESTIÓN DE TRATAMIENTOS --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'hsl(var(--text-primary))' }}>
              Procedimientos y Precios
            </h3>
          </div>

          {treatmentError && <div className="alert error"><span>{treatmentError}</span></div>}

          {/* Formulario Agregar Tratamientos */}
          <form onSubmit={handleAddTreatment} style={{ background: 'hsl(var(--bg-primary))', border: '1px solid hsl(var(--border-color))', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Nombre del Procedimiento / Tratamiento:</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ej. Crioterapia, Biopsia Punch" 
                value={newTreatmentName}
                onChange={(e) => setNewTreatmentName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Precio Base ($ COP):</label>
              <input 
                type="number" 
                className="form-input" 
                min="0" 
                placeholder="Ej. 180000" 
                value={newTreatmentPrice || ''}
                onChange={(e) => setNewTreatmentPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', marginTop: '0.15rem' }}>
                Este costo inicial podrá ser ajustado o personalizado al momento de registrar cada cita.
              </span>
            </div>

            <button type="submit" className="btn-primary" disabled={treatmentLoading} style={{ alignSelf: 'flex-start' }}>
              Agregar Tratamiento
            </button>
          </form>

          {/* Listado Tratamientos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'hsl(var(--text-primary))', marginBottom: '0.25rem' }}>
              Catálogo Activo ({treatmentList.length})
            </h4>

            {treatmentLoading && <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>Cargando catálogo...</p>}
            
            {!treatmentLoading && treatmentList.length === 0 && (
              <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>No hay tratamientos activos.</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '300px', overflowY: 'auto' }}>
              {treatmentList.map((treatment) => (
                <div key={treatment.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: 'hsl(var(--bg-secondary))', border: '1px solid hsl(var(--border-color))', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'hsl(var(--text-primary))' }}>{treatment.nombre}</span>
                    <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>
                      ${treatment.precio_base.toLocaleString('es-CO')} COP
                    </span>
                  </div>
                  <button 
                    className="action-btn delete" 
                    title="Desactivar procedimiento" 
                    style={{ fontSize: '0.75rem', width: 'auto', padding: '0 0.5rem' }} 
                    onClick={() => handleToggleTreatment(treatment)}
                  >
                    Desactivar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
