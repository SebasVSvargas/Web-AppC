import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';


export type PeriodType = 'quincenal' | 'mensual' | 'trimestral' | 'semestral' | 'anual';

interface ReportRow {
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

/**
 * Calcula el intervalo de fechas de inicio y fin y la etiqueta legible para un periodo seleccionado.
 */
export function getPeriodDateRange(
  periodType: PeriodType,
  selectedYear: number,
  detailValue: string
): { start: Date; end: Date; label: string } {
  let start = new Date(selectedYear, 0, 1);
  let end = new Date(selectedYear, 11, 31, 23, 59, 59);
  let label = '';

  const now = new Date();
  const isCurrentYear = now.getFullYear() === selectedYear;

  if (periodType === 'mensual' && detailValue !== '') {
    const month = parseInt(detailValue);
    start = new Date(selectedYear, month, 1);
    
    const isCurrentMonth = isCurrentYear && now.getMonth() === month;
    if (isCurrentMonth) {
      end = new Date(selectedYear, month, now.getDate(), 23, 59, 59);
    } else {
      end = new Date(selectedYear, month + 1, 0, 23, 59, 59);
    }
    const mNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    label = `${mNames[month]} del ${selectedYear}`;

  } else if (periodType === 'quincenal' && detailValue !== '') {
    const [mStr, fStr] = detailValue.split('-');
    const month = parseInt(mStr);
    const fortnight = parseInt(fStr);
    const mNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    if (fortnight === 1) {
      start = new Date(selectedYear, month, 1);
      const isCurrentFortnight = isCurrentYear && now.getMonth() === month && now.getDate() <= 15;
      if (isCurrentFortnight) {
        end = new Date(selectedYear, month, now.getDate(), 23, 59, 59);
      } else {
        end = new Date(selectedYear, month, 15, 23, 59, 59);
      }
      label = `1ª Quincena de ${mNames[month]} (${selectedYear})`;
    } else {
      start = new Date(selectedYear, month, 16);
      const isCurrentFortnight = isCurrentYear && now.getMonth() === month && now.getDate() >= 16;
      if (isCurrentFortnight) {
        end = new Date(selectedYear, month, now.getDate(), 23, 59, 59);
      } else {
        end = new Date(selectedYear, month + 1, 0, 23, 59, 59);
      }
      label = `2ª Quincena de ${mNames[month]} (${selectedYear})`;
    }

  } else if (periodType === 'trimestral' && detailValue !== '') {
    const quarter = parseInt(detailValue);
    start = new Date(selectedYear, quarter * 3, 1);
    
    const isCurrentQuarter = isCurrentYear && Math.floor(now.getMonth() / 3) === quarter;
    if (isCurrentQuarter) {
      end = new Date(selectedYear, now.getMonth(), now.getDate(), 23, 59, 59);
    } else {
      end = new Date(selectedYear, (quarter + 1) * 3, 0, 23, 59, 59);
    }
    label = `Q${quarter + 1} del ${selectedYear}`;

  } else if (periodType === 'semestral' && detailValue !== '') {
    const semester = parseInt(detailValue);
    start = new Date(selectedYear, semester * 6, 1);
    
    const isCurrentSemester = isCurrentYear && Math.floor(now.getMonth() / 6) === semester;
    if (isCurrentSemester) {
      end = new Date(selectedYear, now.getMonth(), now.getDate(), 23, 59, 59);
    } else {
      end = new Date(selectedYear, (semester + 1) * 6, 0, 23, 59, 59);
    }
    label = `${semester === 0 ? '1º Semestre' : '2º Semestre'} del ${selectedYear}`;

  } else if (periodType === 'anual') {
    start = new Date(selectedYear, 0, 1);
    if (isCurrentYear) {
      end = new Date(selectedYear, now.getMonth(), now.getDate(), 23, 59, 59);
    } else {
      end = new Date(selectedYear, 11, 31, 23, 59, 59);
    }
    label = `Año ${selectedYear}`;
  }

  return { start, end, label };
}

/**
 * Exporta la tabla de reportes a un archivo Excel (.xls) compatible mediante HTML/XML Spreadsheet.
 */
export function exportToExcel(params: {
  periodType: PeriodType;
  periodLabel: string;
  dateStart: Date;
  dateEnd: Date;
  groupByPatient: boolean;
  reportRows: ReportRow[];
  totalCopagoPaciente: number;
  totalEpsCubierto: number;
  totalCostoBase: number;
}): void {
  const {
    periodType,
    periodLabel,
    dateStart,
    dateEnd,
    groupByPatient,
    reportRows,
    totalCopagoPaciente,
    totalEpsCubierto,
    totalCostoBase
  } = params;

  // Construcción del documento HTML Spreadsheet para compatibilidad nativa con Excel
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
  html += `<head><meta charset="utf-8"/><style>
    body { font-family: sans-serif; }
    h2 { color: #d94e73; margin-bottom: 5px; }
    p { margin: 2px 0; font-size: 13px; color: #555; }
    table { border-collapse: collapse; margin-top: 15px; width: 100%; }
    th { background-color: #fceef1; font-weight: bold; border: 1px solid #d9d9d9; padding: 6px; text-align: left; }
    td { border: 1px solid #d9d9d9; padding: 6px; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .footer-row { background-color: #fffafb; font-weight: bold; }
  </style></head><body>`;

  html += `<h2>CATAPP - Reporte Clínico y de Facturación</h2>`;
  html += `<p><b>Periodo Reportado:</b> ${periodType.toUpperCase()} - ${periodLabel}</p>`;
  html += `<p><b>Intervalo de Fechas:</b> ${dateStart.toLocaleDateString('es-CO')} al ${dateEnd.toLocaleDateString('es-CO')}</p>`;
  html += `<p><b>Agrupación Consolidada por Paciente:</b> ${groupByPatient ? 'ACTIVADA' : 'DESACTIVADA'}</p>`;
  html += `<p><b>Fecha de Emisión:</b> ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}</p>`;

  html += `<table>`;
  html += `<thead><tr>
    <th>Paciente</th>
    <th>Cédula</th>
    <th>Tratamiento(s) Realizado(s)</th>
    <th class="text-right">Copago Neto (Caja)</th>
    <th class="text-right">Cobro EPS (Convenio)</th>
    <th class="text-right">Costo Base (Total)</th>
  </tr></thead><tbody>`;

  reportRows.forEach((row) => {
    html += `<tr>`;
    html += `<td>${row.apellidos}, ${row.nombres}</td>`;
    html += `<td>'${row.documento}</td>`; // Apóstrofe inicial para evitar que Excel recorte ceros de la cédula
    html += `<td>${row.tratamientos}</td>`;
    html += `<td class="text-right">${row.copagoPacienteTotal}</td>`;
    html += `<td class="text-right">${row.epsCubiertoTotal}</td>`;
    html += `<td class="text-right">${row.costoBaseTotal}</td>`;
    html += `</tr>`;
  });

  if (reportRows.length === 0) {
    html += `<tr><td colspan="6" style="text-align: center; color: #999; font-style: italic;">No hay registros en este periodo.</td></tr>`;
  } else {
    html += `<tr class="footer-row">`;
    html += `<td colspan="3" class="font-bold">TOTALES OBTENIDOS:</td>`;
    html += `<td class="text-right font-bold">${totalCopagoPaciente}</td>`;
    html += `<td class="text-right font-bold">${totalEpsCubierto}</td>`;
    html += `<td class="text-right font-bold">${totalCostoBase}</td>`;
    html += `</tr>`;
  }

  html += `</tbody></table></body></html>`;

  // Crear Blob y disparar descarga en navegador
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const cleanLabel = periodLabel.replace(/\s+/g, '_');
  link.download = `Reporte_Dermatologia_${periodType}_${cleanLabel}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Compila y descarga un informe en PDF A4 formal utilizando pdf-lib de forma 100% local.
 */
export async function generatePDFReport(params: {
  periodType: PeriodType;
  periodLabel: string;
  dateStart: Date;
  dateEnd: Date;
  groupByPatient: boolean;
  reportRows: ReportRow[];
  totalCopagoPaciente: number;
  totalEpsCubierto: number;
  totalCostoBase: number;
  setLoading: (loading: boolean) => void;
}): Promise<void> {
  const {
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
  } = params;

  setLoading(true);
  try {
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let page = pdfDoc.addPage([595.27, 841.89]);
    let { width, height } = page.getSize();
    
    const drawMarginsAndHeader = (p: typeof page, pageNum: number) => {
      // Margen decorativo
      p.drawRectangle({
        x: 30,
        y: 30,
        width: width - 60,
        height: height - 60,
        borderColor: rgb(0.9, 0.9, 0.9),
        borderWidth: 1,
      });

      // Encabezado
      p.drawText('CATAPP - INFORME CLÍNICO Y DE FACTURACIÓN', {
        x: 50,
        y: height - 65,
        size: 13,
        font: helveticaBold,
        color: rgb(0.85, 0.3, 0.45),
      });

      p.drawText(`Reporte de Gestión Dermatológica • Página ${pageNum}`, {
        x: 50,
        y: height - 80,
        size: 9,
        font: helvetica,
        color: rgb(0.4, 0.4, 0.4),
      });

      p.drawLine({
        start: { x: 50, y: height - 90 },
        end: { x: width - 50, y: height - 90 },
        color: rgb(0.85, 0.85, 0.85),
        thickness: 1,
      });
    };

    drawMarginsAndHeader(page, 1);

    let currentY = height - 120;

    // Sección 1: Detalles del Filtro de Reporte
    page.drawText('PARÁMETROS DEL REPORTE GENERADO', {
      x: 50,
      y: currentY,
      size: 9,
      font: helveticaBold,
      color: rgb(0.18, 0.1, 0.12),
    });

    currentY -= 15;
    page.drawText(`Periodo Seleccionado: ${periodType.toUpperCase()} - ${periodLabel}`, {
      x: 50,
      y: currentY,
      size: 9.5,
      font: helvetica,
    });

    page.drawText(`Intervalo de Fechas: ${dateStart.toLocaleDateString('es-CO')} al ${dateEnd.toLocaleDateString('es-CO')}`, {
      x: 300,
      y: currentY,
      size: 9.5,
      font: helvetica,
    });

    currentY -= 15;
    page.drawText(`Agrupación por paciente: ${groupByPatient ? 'ACTIVADA (Tratamientos consolidados)' : 'DESACTIVADA (Registros individuales)'}`, {
      x: 50,
      y: currentY,
      size: 9.5,
      font: helvetica,
    });

    currentY -= 20;

    // Sección 2: Bloque de Totales Analíticos (3 KPIs)
    page.drawRectangle({
      x: 50,
      y: currentY - 50,
      width: width - 100,
      height: 55,
      color: rgb(0.99, 0.97, 0.98),
      borderColor: rgb(0.92, 0.85, 0.87),
      borderWidth: 0.5,
    });

    // KPI 1: Copagos
    page.drawText('COPAGO CAJA NETO', { x: 70, y: currentY - 15, size: 7.5, font: helveticaBold, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(`$${totalCopagoPaciente.toLocaleString('es-CO')} COP`, { x: 70, y: currentY - 35, size: 12, font: helveticaBold, color: rgb(0.1, 0.5, 0.25) });

    // KPI 2: EPS
    page.drawText('RETORNO EPS FACTURADO', { x: 230, y: currentY - 15, size: 7.5, font: helveticaBold, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(`$${totalEpsCubierto.toLocaleString('es-CO')} COP`, { x: 230, y: currentY - 35, size: 12, font: helveticaBold, color: rgb(0.85, 0.3, 0.45) });

    // KPI 3: Total Base
    page.drawText('FACTURACIÓN BRUTA TOTAL', { x: 410, y: currentY - 15, size: 7.5, font: helveticaBold, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(`$${totalCostoBase.toLocaleString('es-CO')} COP`, { x: 410, y: currentY - 35, size: 12, font: helveticaBold, color: rgb(0.18, 0.1, 0.12) });

    currentY -= 80;

    // Sección 3: Tabla de Resultados
    page.drawText('REGISTRO DE CLIENTES ATENDIDOS Y LIQUIDACIONES', {
      x: 50,
      y: currentY,
      size: 9,
      font: helveticaBold,
      color: rgb(0.18, 0.1, 0.12),
    });

    currentY -= 20;

    // Dibujar Cabecera de Tabla
    page.drawRectangle({
      x: 50,
      y: currentY - 5,
      width: width - 100,
      height: 20,
      color: rgb(0.95, 0.9, 0.91),
    });

    const colPacienteX = 55;
    const colDocumentoX = 165;
    const colTratamientosX = 230;
    const colCopagoX = 390;
    const colEpsX = 445;
    const colCostoX = 500;

    page.drawText('Paciente', { x: colPacienteX, y: currentY, size: 8, font: helveticaBold });
    page.drawText('Cédula', { x: colDocumentoX, y: currentY, size: 8, font: helveticaBold });
    page.drawText('Tratamientos Realizados', { x: colTratamientosX, y: currentY, size: 8, font: helveticaBold });
    page.drawText('Copago Neto', { x: colCopagoX, y: currentY, size: 8, font: helveticaBold });
    page.drawText('Cubierto EPS', { x: colEpsX, y: currentY, size: 8, font: helveticaBold });
    page.drawText('Costo Base (Total)', { x: colCostoX, y: currentY, size: 8, font: helveticaBold });

    currentY -= 20;
    let pageNum = 1;

    // Filas
    for (let index = 0; index < reportRows.length; index++) {
      const row = reportRows[index];

      // Verificar si la fila requiere cambio de página preventiva (Margen inferior 70pt)
      if (currentY < 75) {
        page = pdfDoc.addPage([595.27, 841.89]);
        pageNum++;
        drawMarginsAndHeader(page, pageNum);
        
        currentY = height - 120;
        
        // Redibujar cabecera en nueva página
        page.drawRectangle({
          x: 50,
          y: currentY - 5,
          width: width - 100,
          height: 20,
          color: rgb(0.95, 0.9, 0.91),
        });
        page.drawText('Paciente', { x: colPacienteX, y: currentY, size: 8, font: helveticaBold });
        page.drawText('Cédula', { x: colDocumentoX, y: currentY, size: 8, font: helveticaBold });
        page.drawText('Tratamientos Realizados', { x: colTratamientosX, y: currentY, size: 8, font: helveticaBold });
        page.drawText('Copago Neto', { x: colCopagoX, y: currentY, size: 8, font: helveticaBold });
        page.drawText('Cubierto EPS', { x: colEpsX, y: currentY, size: 8, font: helveticaBold });
        page.drawText('Costo Base (Total)', { x: colCostoX, y: currentY, size: 8, font: helveticaBold });
        
        currentY -= 20;
      }

      // Lógica de Salto de Línea para Tratamientos Largos en la Columna
      const rawTratamientos = row.tratamientos;
      const words = rawTratamientos.split(' ');
      let line = '';
      const lines: string[] = [];
      
      for (let w = 0; w < words.length; w++) {
        const testLine = line + words[w] + ' ';
        const wWidth = helvetica.widthOfTextAtSize(testLine, 7.5);
        if (wWidth > 150 && w > 0) {
          lines.push(line.trim());
          line = words[w] + ' ';
        } else {
          line = testLine;
        }
      }
      if (line) lines.push(line.trim());

      const rowHeight = Math.max(15, lines.length * 10);

      // Fila de Fondo Cebra
      if (index % 2 === 1) {
        page.drawRectangle({
          x: 50,
          y: currentY - (rowHeight - 12),
          width: width - 100,
          height: rowHeight,
          color: rgb(0.985, 0.985, 0.99),
        });
      }

      // Separadores de filas ligeros
      page.drawLine({
        start: { x: 50, y: currentY - (rowHeight - 12) },
        end: { x: width - 50, y: currentY - (rowHeight - 12) },
        color: rgb(0.94, 0.94, 0.94),
        thickness: 0.5,
      });

      // Escribir datos
      const pacienteNombre = `${row.apellidos}, ${row.nombres}`;
      const patientNameClean = pacienteNombre.length > 25 ? `${pacienteNombre.slice(0, 22)}...` : pacienteNombre;
      
      page.drawText(patientNameClean, { x: colPacienteX, y: currentY, size: 7.5, font: helvetica });
      page.drawText(row.documento, { x: colDocumentoX, y: currentY, size: 7.5, font: helvetica });

      // Imprimir tratamientos multilinea
      lines.forEach((l, lIdx) => {
        page.drawText(l, { x: colTratamientosX, y: currentY - (lIdx * 9), size: 7.5, font: helvetica });
      });

      page.drawText(`$${row.copagoPacienteTotal.toLocaleString('es-CO')}`, { x: colCopagoX, y: currentY, size: 7.5, font: helvetica });
      page.drawText(`$${row.epsCubiertoTotal.toLocaleString('es-CO')}`, { x: colEpsX, y: currentY, size: 7.5, font: helvetica });
      page.drawText(`$${row.costoBaseTotal.toLocaleString('es-CO')}`, { x: colCostoX, y: currentY, size: 7.5, font: helvetica });

      currentY -= rowHeight;
    }

    // Verificación preventiva antes de dibujar el bloque final de totales
    if (currentY < 120) {
      page = pdfDoc.addPage([595.27, 841.89]);
      pageNum++;
      drawMarginsAndHeader(page, pageNum);
      currentY = height - 120;
    }

    // Línea Doble de Totales Finales de la Tabla
    currentY -= 10;
    page.drawLine({
      start: { x: 50, y: currentY },
      end: { x: width - 50, y: currentY },
      color: rgb(0.18, 0.1, 0.12),
      thickness: 1,
    });
    page.drawLine({
      start: { x: 50, y: currentY - 2 },
      end: { x: width - 50, y: currentY - 2 },
      color: rgb(0.18, 0.1, 0.12),
      thickness: 1,
    });

    currentY -= 15;
    page.drawText('TOTAL DE INGRESOS OBTENIDOS:', { x: colPacienteX, y: currentY, size: 8, font: helveticaBold, color: rgb(0.18, 0.1, 0.12) });
    page.drawText(`$${totalCopagoPaciente.toLocaleString('es-CO')}`, { x: colCopagoX, y: currentY, size: 8, font: helveticaBold, color: rgb(0.1, 0.5, 0.25) });
    page.drawText(`$${totalEpsCubierto.toLocaleString('es-CO')}`, { x: colEpsX, y: currentY, size: 8, font: helveticaBold });
    page.drawText(`$${totalCostoBase.toLocaleString('es-CO')}`, { x: colCostoX, y: currentY, size: 8, font: helveticaBold });

    // Bloque de Firma de Auditoría
    currentY -= 65;
    page.drawLine({
      start: { x: 380, y: currentY },
      end: { x: 540, y: currentY },
      color: rgb(0.5, 0.5, 0.5),
      thickness: 0.5,
    });
    page.drawText('Firma Auditora de Consultorio', { x: 395, y: currentY - 12, size: 8, font: helvetica, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(`Generado el ${new Date().toLocaleDateString('es-CO')} a las ${new Date().toLocaleTimeString('es-CO')}`, { x: 50, y: currentY - 12, size: 7.5, font: helvetica, color: rgb(0.6, 0.6, 0.6) });

    // Guardar e iniciar descarga
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_Dermatologia_${periodType}_${periodLabel.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err: any) {
    console.error('Error al generar reporte PDF:', err);
  } finally {
    setLoading(false);
  }
}
