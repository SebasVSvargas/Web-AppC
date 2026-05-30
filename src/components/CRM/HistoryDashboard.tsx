import React, { useState, useEffect } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import db from '../../services/config';
import type { Patient, Consultation } from '../../services/DermatologyRepository';

export const HistoryDashboard: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pdfGeneratingId, setPdfGeneratingId] = useState<string | null>(null);

  // --- Métricas financieras del paciente seleccionado ---
  const [metrics, setMetrics] = useState({
    totalInvertido: 0,
    totalCubiertoEPS: 0,
    totalCopagoPaciente: 0,
    visitasTotales: 0,
  });

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const data = await db.getPatients();
      setPatients(data);
    } catch (err) {
      console.error('Error al cargar pacientes:', err);
    }
  };

  // Cargar el historial cuando cambia el paciente seleccionado
  useEffect(() => {
    if (selectedPatientId) {
      const patient = patients.find((p) => p.id === selectedPatientId) || null;
      setSelectedPatient(patient);
      loadHistory(selectedPatientId);
    } else {
      setSelectedPatient(null);
      setConsultations([]);
      setMetrics({
        totalInvertido: 0,
        totalCubiertoEPS: 0,
        totalCopagoPaciente: 0,
        visitasTotales: 0,
      });
    }
  }, [selectedPatientId, patients]);

  const loadHistory = async (patientId: string) => {
    setLoading(true);
    try {
      const history = await db.getPatientConsultations(patientId);
      setConsultations(history);

      // Calcular métricas
      let total = 0;
      let cubierto = 0;
      let copago = 0;

      history.forEach((c) => {
        total += Number(c.costo_aplicado);
        cubierto += Number(c.monto_cubierto);
        copago += Number(c.monto_pagado_paciente);
      });

      setMetrics({
        totalInvertido: total,
        totalCubiertoEPS: cubierto,
        totalCopagoPaciente: copago,
        visitasTotales: history.length,
      });
    } catch (err) {
      console.error('Error al cargar historial:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrado de pacientes para el selector predictivo
  const filteredPatients = patients.filter((p) => {
    const text = `${p.nombres} ${p.apellidos} ${p.documento}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  // --- GENERACIÓN DE RECETA / INFORME PDF LOCAL ---
  const generatePrescriptionPDF = async (consultation: Consultation) => {
    if (!selectedPatient) return;
    setPdfGeneratingId(consultation.id);

    try {
      // 1. Crear documento PDF vacío
      const pdfDoc = await PDFDocument.create();
      
      // 2. Cargar fuentes estándar
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // 3. Añadir página A4 (595.27 x 841.89 puntos)
      const page = pdfDoc.addPage([595.27, 841.89]);
      const { width, height } = page.getSize();

      // 4. Margen decorativo fino (Estilo premium y serio)
      page.drawRectangle({
        x: 30,
        y: 30,
        width: width - 60,
        height: height - 60,
        borderColor: rgb(0.85, 0.85, 0.85),
        borderWidth: 1,
      });

      // --- ENCABEZADO ---
      page.drawText('CATAPP - REGISTRO DE DERMATOLOGÍA', {
        x: 50,
        y: height - 70,
        size: 14,
        font: helveticaBold,
        color: rgb(0.85, 0.3, 0.45), // Acento rosa CATAPP
      });

      page.drawText('Consulta Clínica e Informe del Paciente', {
        x: 50,
        y: height - 85,
        size: 10,
        font: helvetica,
        color: rgb(0.4, 0.4, 0.4),
      });

      // Línea divisoria superior
      page.drawLine({
        start: { x: 50, y: height - 100 },
        end: { x: width - 50, y: height - 100 },
        color: rgb(0.85, 0.85, 0.85),
        thickness: 1,
      });

      // --- DATOS DEL PACIENTE ---
      page.drawText('DATOS GENERALES DEL PACIENTE', {
        x: 50,
        y: height - 125,
        size: 9,
        font: helveticaBold,
        color: rgb(0.18, 0.1, 0.12),
      });

      page.drawText(`Nombre Completo: ${selectedPatient.nombres} ${selectedPatient.apellidos}`, {
        x: 50,
        y: height - 145,
        size: 10,
        font: helvetica,
      });

      page.drawText(`Identificación: ${selectedPatient.documento}`, {
        x: 50,
        y: height - 160,
        size: 10,
        font: helvetica,
      });

      page.drawText(`Celular: ${selectedPatient.celular}`, {
        x: 50,
        y: height - 175,
        size: 10,
        font: helvetica,
      });

      const formattedDateOfBirth = new Date(selectedPatient.fecha_nacimiento).toLocaleDateString('es-CO');
      page.drawText(`Fecha de Nacimiento: ${formattedDateOfBirth}`, {
        x: 320,
        y: height - 145,
        size: 10,
        font: helvetica,
      });

      page.drawText(`EPS / Póliza: ${consultation.eps_nombre || 'Particular'}`, {
        x: 320,
        y: height - 160,
        size: 10,
        font: helvetica,
      });

      page.drawText(`Fecha de Consulta: ${new Date(consultation.fecha).toLocaleDateString('es-CO')}`, {
        x: 320,
        y: height - 175,
        size: 10,
        font: helvetica,
      });

      // Línea divisoria media
      page.drawLine({
        start: { x: 50, y: height - 195 },
        end: { x: width - 50, y: height - 195 },
        color: rgb(0.9, 0.9, 0.9),
        thickness: 1,
      });

      // --- DETALLES DE PROCEDIMIENTO ---
      page.drawText('DETALLES DEL PROCEDIMIENTO Y TRATAMIENTO', {
        x: 50,
        y: height - 220,
        size: 9,
        font: helveticaBold,
        color: rgb(0.18, 0.1, 0.12),
      });

      page.drawText(`Tratamiento Realizado: ${consultation.tratamiento_nombre || 'Consulta General'}`, {
        x: 50,
        y: height - 240,
        size: 11,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });

      // Notas Clínicas / Descripción
      page.drawText('Descripción del procedimiento y observaciones clínicas:', {
        x: 50,
        y: height - 265,
        size: 9,
        font: helveticaBold,
        color: rgb(0.3, 0.3, 0.3),
      });

      // Lógica de salto de línea básico para descripciones largas
      const descText = consultation.descripcion || 'Sin observaciones adicionales registradas.';
      const words = descText.split(' ');
      let line = '';
      let currentY = height - 280;
      
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const widthText = helvetica.widthOfTextAtSize(testLine, 10);
        
        if (widthText > width - 100 && i > 0) {
          page.drawText(line, { x: 50, y: currentY, size: 10, font: helvetica });
          line = words[i] + ' ';
          currentY -= 15;
        } else {
          line = testLine;
        }
      }
      if (line) {
        page.drawText(line, { x: 50, y: currentY, size: 10, font: helvetica });
        currentY -= 15;
      }

      // Línea divisoria pre-financiera
      page.drawLine({
        start: { x: 50, y: currentY - 20 },
        end: { x: width - 50, y: currentY - 20 },
        color: rgb(0.9, 0.9, 0.9),
        thickness: 1,
      });

      // --- DETALLE FINANCIERO / LIQUIDACIÓN ---
      let finY = currentY - 45;
      page.drawText('LIQUIDACIÓN FINANCIERA (CONVENIOS Y COPAGOS)', {
        x: 50,
        y: finY,
        size: 9,
        font: helveticaBold,
        color: rgb(0.18, 0.1, 0.12),
      });

      finY -= 20;
      page.drawText(`Costo Base del Procedimiento:`, { x: 50, y: finY, size: 10, font: helvetica });
      page.drawText(`$${Number(consultation.costo_aplicado).toLocaleString('es-CO')} COP`, { 
        x: width - 180, 
        y: finY, 
        size: 10, 
        font: helveticaBold 
      });

      finY -= 15;
      page.drawText(`Descuento por Cobertura EPS (${consultation.porcentaje_cobertura}%):`, { x: 50, y: finY, size: 10, font: helvetica });
      page.drawText(`-$${Number(consultation.monto_cubierto).toLocaleString('es-CO')} COP`, { 
        x: width - 180, 
        y: finY, 
        size: 10, 
        font: helveticaBold,
        color: rgb(0.85, 0.3, 0.45)
      });

      finY -= 20;
      // Recuadro del monto final pagado
      page.drawRectangle({
        x: 45,
        y: finY - 10,
        width: width - 90,
        height: 25,
        color: rgb(0.98, 0.95, 0.96),
        borderColor: rgb(0.9, 0.8, 0.82),
        borderWidth: 0.5,
      });

      page.drawText(`TOTAL COPAGO NETO PAGADO POR PACIENTE:`, { 
        x: 55, 
        y: finY - 2, 
        size: 9, 
        font: helveticaBold, 
        color: rgb(0.18, 0.1, 0.12) 
      });
      page.drawText(`$${Number(consultation.monto_pagado_paciente).toLocaleString('es-CO')} COP`, { 
        x: width - 180, 
        y: finY - 2, 
        size: 10, 
        font: helveticaBold,
        color: rgb(0.1, 0.5, 0.25)
      });

      // --- FIRMA Y PIE DE PÁGINA ---
      page.drawLine({
        start: { x: width - 200, y: 120 },
        end: { x: width - 50, y: 120 },
        color: rgb(0.6, 0.6, 0.6),
        thickness: 0.5,
      });

      page.drawText('Firma de la Dermatóloga', {
        x: width - 170,
        y: 105,
        size: 9,
        font: helvetica,
        color: rgb(0.4, 0.4, 0.4),
      });

      page.drawText('CATAPP - Solución de Registro Clínico 100% Local. Datos privados.', {
        x: width / 2 - 140,
        y: 45,
        size: 8,
        font: helvetica,
        color: rgb(0.6, 0.6, 0.6),
      });

      // 5. Guardar y descargar
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanPatientName = `${selectedPatient.nombres}_${selectedPatient.apellidos}`.replace(/\s+/g, '_');
      link.download = `Receta_${cleanPatientName}_${consultation.fecha}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Error al generar PDF local:', err);
    } finally {
      setPdfGeneratingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.35rem', color: 'hsl(var(--text-primary))' }}>
          Historial Clínico & Dashboard de Consultas
        </h2>
        <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>
          Selecciona un paciente para revisar la línea de tiempo de sus consultas pasadas, visualizar su tablero de métricas financieras de copagos y pólizas, y generar recetas PDF de forma local.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2.5rem', alignItems: 'start' }}>
        
        {/* --- SELECTOR DE PACIENTE --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Filtrar/Buscar Paciente:</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Buscar por nombre o cédula..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ background: 'hsl(var(--bg-secondary))', border: '1px solid hsl(var(--border-color))', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'hsl(var(--text-primary))', marginBottom: '0.75rem' }}>
              Pacientes Disponibles ({filteredPatients.length})
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '350px', overflowY: 'auto' }}>
              {filteredPatients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPatientId(p.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.65rem 0.85rem',
                    background: selectedPatientId === p.id ? 'rgba(220, 80, 110, 0.06)' : 'transparent',
                    border: '1px solid',
                    borderColor: selectedPatientId === p.id ? 'hsl(var(--color-primary))' : 'hsl(var(--border-color))',
                    borderRadius: 'var(--radius-md)',
                    color: selectedPatientId === p.id ? 'hsl(var(--color-primary))' : 'hsl(var(--text-primary))',
                    fontWeight: selectedPatientId === p.id ? 600 : 500,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.apellidos}, {p.nombres}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', marginTop: '0.15rem', fontWeight: 400 }}>
                    Doc: {p.documento} {p.eps_nombre ? `• ${p.eps_nombre}` : '• Particular'}
                  </div>
                </button>
              ))}
              {filteredPatients.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', textAlign: 'center', padding: '1rem 0' }}>
                  No se encontraron pacientes.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* --- HISTORIAL Y DASHBOARD DEL PACIENTE --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {!selectedPatient ? (
            <div style={{ background: 'hsl(var(--bg-secondary))', border: '1px dashed hsl(var(--border-color))', borderRadius: 'var(--radius-lg)', padding: '4rem 2rem', textAlign: 'center', color: 'hsl(var(--text-secondary))' }}>
              <p style={{ fontSize: '1rem', fontWeight: 600 }}>Selecciona un paciente del menú izquierdo</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Podrás consultar su línea de tiempo, copagos e imprimir recetas en formato PDF.</p>
            </div>
          ) : (
            <>
              {/* FICHA GENERAL PACIENTE */}
              <div style={{ background: 'hsl(var(--bg-secondary))', border: '1px solid hsl(var(--border-color))', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'hsl(var(--text-primary))' }}>
                  {selectedPatient.nombres} {selectedPatient.apellidos}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
                  <span><strong>Identificación:</strong> {selectedPatient.documento}</span>
                  <span><strong>Celular:</strong> {selectedPatient.celular}</span>
                  <span><strong>Fecha Nacimiento:</strong> {new Date(selectedPatient.fecha_nacimiento).toLocaleDateString('es-CO')}</span>
                  <span><strong>EPS Afiliación:</strong> {selectedPatient.eps_nombre || 'Particular (Sin Convenio)'}</span>
                  {selectedPatient.email && <span style={{ gridColumn: 'span 2' }}><strong>Correo Electrónico:</strong> {selectedPatient.email}</span>}
                </div>
              </div>

              {/* TABLERO DE MÉTRICAS FINANCIERAS ACUMULADAS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                
                <div style={{ background: 'hsl(var(--bg-secondary))', border: '1px solid hsl(var(--border-color))', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.2px' }}>
                    Inversión Total
                  </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'hsl(var(--text-primary))' }}>
                    ${metrics.totalInvertido.toLocaleString('es-CO')}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>
                    Suma del costo base de consultas
                  </span>
                </div>

                <div style={{ background: 'hsl(var(--bg-secondary))', border: '1px solid hsl(var(--border-color))', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.2px' }}>
                    Cubierto por EPS
                  </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'hsl(var(--color-primary))' }}>
                    ${metrics.totalCubiertoEPS.toLocaleString('es-CO')}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>
                    Ahorro acumulado por pólizas
                  </span>
                </div>

                <div style={{ background: 'hsl(var(--bg-secondary))', border: '1px solid hsl(var(--border-color))', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.2px' }}>
                    Copagos Paciente
                  </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'hsl(var(--color-success))' }}>
                    ${metrics.totalCopagoPaciente.toLocaleString('es-CO')}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>
                    Neto pagado del bolsillo
                  </span>
                </div>

              </div>

              {/* LÍNEA DE TIEMPO DEL HISTORIAL CLÍNICO */}
              <div style={{ background: 'hsl(var(--bg-secondary))', border: '1px solid hsl(var(--border-color))', borderRadius: 'var(--radius-lg)', padding: '1.75rem', boxShadow: 'var(--shadow-sm)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'hsl(var(--text-primary))', marginBottom: '1.25rem', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '0.5rem' }}>
                  Línea de Tiempo de Consultas ({metrics.visitasTotales})
                </h3>

                {loading ? (
                  <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>Cargando consultas de catadb...</p>
                ) : consultations.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', textAlign: 'center', padding: '1.5rem 0', fontStyle: 'italic' }}>
                    No se registran consultas ni procedimientos médicos para este paciente.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', paddingLeft: '1rem', borderLeft: '1px solid hsl(var(--border-color))' }}>
                    
                    {consultations.map((c) => (
                      <div key={c.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'hsl(var(--bg-primary))', border: '1px solid hsl(var(--border-color))', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                        
                        {/* Nodo de línea de tiempo */}
                        <div style={{
                          position: 'absolute',
                          left: '-1.35rem',
                          top: '1.25rem',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: 'hsl(var(--color-primary))',
                          border: '2px solid hsl(var(--bg-secondary))'
                        }} />

                        {/* Cabecera de la consulta */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'hsl(var(--text-primary))' }}>
                              {c.tratamiento_nombre || 'Consulta'}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>
                              Fecha: {new Date(c.fecha).toLocaleDateString('es-CO')}
                            </span>
                          </div>
                          
                          <button 
                            className="btn-primary" 
                            disabled={pdfGeneratingId === c.id}
                            onClick={() => generatePrescriptionPDF(c)}
                            style={{ 
                              padding: '0.35rem 0.75rem', 
                              fontSize: '0.75rem', 
                              fontWeight: 600,
                              background: pdfGeneratingId === c.id ? 'hsl(var(--bg-tertiary))' : 'hsl(var(--color-primary))',
                              color: pdfGeneratingId === c.id ? 'hsl(var(--text-muted))' : 'white'
                            }}
                          >
                            {pdfGeneratingId === c.id ? 'Generando PDF...' : 'Exportar Receta PDF'}
                          </button>
                        </div>

                        {/* Descripción Clínica */}
                        {c.descripcion && (
                          <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-primary))', background: 'hsl(var(--bg-secondary))', border: '1px solid hsl(var(--border-color))', borderRadius: 'var(--radius-sm)', padding: '0.75rem', margin: '0.25rem 0', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                            {c.descripcion}
                          </div>
                        )}

                        {/* Liquidación Financiera */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', background: 'rgba(0,0,0,0.01)', borderTop: '1px solid hsl(var(--border-color))', paddingTop: '0.5rem', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>
                          <span><strong>Costo aplicado:</strong> ${Number(c.costo_aplicado).toLocaleString('es-CO')}</span>
                          <span>
                            <strong>EPS Convenio:</strong> {c.eps_nombre || 'Particular'} ({c.porcentaje_cobertura}%)
                          </span>
                          <span style={{ color: 'hsl(var(--color-success))', fontWeight: 700 }}>
                            <strong>Copago neto pagado:</strong> ${Number(c.monto_pagado_paciente).toLocaleString('es-CO')}
                          </span>
                        </div>

                      </div>
                    ))}
                    
                  </div>
                )}
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
};
