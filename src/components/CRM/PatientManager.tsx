import React, { useState, useEffect } from 'react';
import db from '../../services/config';
import type { Patient, EPS } from '../../services/DermatologyRepository';

export const PatientManager: React.FC = () => {
  // --- Estados de Pacientes ---
  const [patientsList, setPatientsList] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [epsList, setEpsList] = useState<EPS[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // --- Formulario de Registro ---
  const [nombres, setNombres] = useState<string>('');
  const [apellidos, setApellidos] = useState<string>('');
  const [documento, setDocumento] = useState<string>('');
  const [celular, setCelular] = useState<string>('');
  const [fechaNacimiento, setFechaNacimiento] = useState<string>('');
  const [epsId, setEpsId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [patients, eps] = await Promise.all([
        db.getPatients(),
        db.getEPS()
      ]);
      setPatientsList(patients);
      setEpsList(eps);
    } catch (err: any) {
      console.error(err);
      setError('Error al conectar con la base de datos local catadb.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombres.trim() || !apellidos.trim() || !documento.trim() || !celular.trim() || !fechaNacimiento) {
      setError('Por favor, completa todos los campos del formulario.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const newPatient = await db.createPatient({
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        documento: documento.trim(),
        celular: celular.trim(),
        fecha_nacimiento: fechaNacimiento,
        eps_id: epsId || undefined
      });

      setPatientsList((prev) => [...prev, newPatient].sort((a, b) => a.apellidos.localeCompare(b.apellidos)));
      setSuccess(true);
      
      // Limpiar campos
      setNombres('');
      setApellidos('');
      setDocumento('');
      setCelular('');
      setFechaNacimiento('');
      setEpsId('');
    } catch (err: any) {
      console.error(err);
      setError('Error al registrar al paciente. Asegúrate de que el documento de identificación no esté registrado ya.');
    } finally {
      setLoading(false);
    }
  };

  // Filtrado de pacientes en tiempo real
  const filteredPatients = patientsList.filter((p) => {
    const fullText = `${p.nombres} ${p.apellidos} ${p.documento}`.toLowerCase();
    return fullText.includes(searchQuery.toLowerCase());
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.35rem', color: 'hsl(var(--text-primary))' }}>
          Registro y Expediente de Pacientes
        </h2>
        <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>
          Registra nuevos pacientes e ingresa su información personal e historial de EPS. Una vez registrado el paciente, podrás agendar y cargar consultas médicas para él en el panel de Registro.
        </p>
      </div>

      {error && <div className="alert error"><span>{error}</span></div>}
      {success && <div className="alert success"><span>¡Paciente registrado con éxito en catadb!</span></div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '2.5rem', alignItems: 'start' }}>
        
        {/* --- FORMULARIO DE REGISTRO --- */}
        <form onSubmit={handleRegister} style={{ background: 'hsl(var(--bg-secondary))', border: '1px solid hsl(var(--border-color))', borderRadius: 'var(--radius-lg)', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.15rem', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'hsl(var(--text-primary))', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '0.65rem', marginBottom: '0.25rem' }}>
            Nuevo Expediente
          </h3>

          <div className="form-group">
            <label className="form-label">Nombres:</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Nombres del paciente" 
              value={nombres}
              onChange={(e) => setNombres(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Apellidos:</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Apellidos del paciente" 
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Documento de Identificación (Cédula/TI):</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Cédula o documento único" 
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Celular de Contacto:</label>
            <input 
              type="tel" 
              className="form-input" 
              placeholder="Ej. 3101234567" 
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Fecha de Nacimiento:</label>
            <input 
              type="date" 
              className="form-input" 
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">EPS del Paciente (Convenio Póliza):</label>
            <select 
              className="form-input" 
              value={epsId}
              onChange={(e) => setEpsId(e.target.value)}
              style={{ background: 'hsl(var(--bg-secondary))' }}
            >
              <option value="">Selecciona EPS (Opcional - Particular)</option>
              {epsList.map((eps) => (
                <option key={eps.id} value={eps.id}>
                  {eps.nombre} ({eps.cobertura_porcentaje}% cobertura)
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Guardando...' : 'Crear Paciente'}
          </button>
        </form>

        {/* --- LISTADO Y BUSCADOR DE PACIENTES --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Barra de Búsqueda */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Buscar paciente por nombre o documento..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '0.75rem 1rem', fontSize: '0.95rem' }}
            />
          </div>

          {/* Listado / Tabla */}
          <div style={{ background: 'hsl(var(--bg-secondary))', border: '1px solid hsl(var(--border-color))', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'hsl(var(--text-primary))', marginBottom: '1rem' }}>
              Base de Datos de Pacientes ({filteredPatients.length})
            </h3>

            {loading && patientsList.length === 0 ? (
              <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))' }}>Cargando expediente de pacientes...</p>
            ) : filteredPatients.length === 0 ? (
              <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-muted))', textAlign: 'center', padding: '2rem 0' }}>
                {patientsList.length === 0 ? 'No hay pacientes registrados en la base de datos local.' : 'No se encontraron pacientes que coincidan con la búsqueda.'}
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid hsl(var(--border-color))', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>
                      <th style={{ padding: '0.5rem 0.5rem 0.5rem 0' }}>Paciente</th>
                      <th style={{ padding: '0.5rem' }}>Identificación</th>
                      <th style={{ padding: '0.5rem' }}>Contacto</th>
                      <th style={{ padding: '0.5rem 0 0.5rem 0.5rem' }}>EPS (Póliza)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid hsl(var(--border-color))' }}>
                        <td style={{ padding: '0.75rem 0.5rem 0.75rem 0', fontWeight: 600, color: 'hsl(var(--text-primary))' }}>
                          {p.apellidos}, {p.nombres}
                        </td>
                        <td style={{ padding: '0.75rem', color: 'hsl(var(--text-secondary))' }}>{p.documento}</td>
                        <td style={{ padding: '0.75rem', color: 'hsl(var(--text-secondary))' }}>{p.celular}</td>
                        <td style={{ padding: '0.75rem 0 0.75rem 0.75rem' }}>
                          {p.eps_nombre ? (
                            <span style={{ fontWeight: 600, color: 'hsl(var(--color-primary))', background: 'rgba(220, 80, 110, 0.06)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
                              {p.eps_nombre}
                            </span>
                          ) : (
                            <span style={{ color: 'hsl(var(--text-muted))' }}>Particular</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
