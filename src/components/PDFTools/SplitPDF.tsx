import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

interface SelectedFile {
  file: File;
  name: string;
  size: string;
  pages: number;
  arrayBuffer: ArrayBuffer;
}

export const SplitPDF: React.FC = () => {
  const [file, setFile] = useState<SelectedFile | null>(null);
  const [splitMode, setSplitMode] = useState<'individual' | 'ranges'>('individual');
  const [customRange, setCustomRange] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (uploadedFiles: FileList) => {
    setError(null);
    setSuccess(false);
    
    if (uploadedFiles.length === 0) return;
    
    const selectedFile = uploadedFiles[0];
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.endsWith(".pdf")) {
      setError("Por favor, selecciona un archivo PDF válido.");
      return;
    }

    setLoading(true);
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const pageCount = pdf.getPageCount();
      
      setFile({
        file: selectedFile,
        name: selectedFile.name,
        size: formatBytes(selectedFile.size),
        pages: pageCount,
        arrayBuffer
      });
      
      setCustomRange(`1-${pageCount}`);
    } catch (err: any) {
      console.error(err);
      setError("Error al cargar el PDF. Puede que el archivo esté protegido con contraseña.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const parseRanges = (rangeStr: string, maxPages: number): number[][] => {
    const parts = rangeStr.split(',');
    const results: number[][] = [];

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      if (trimmed.includes('-')) {
        const [startStr, endStr] = trimmed.split('-');
        const start = parseInt(startStr.trim(), 10);
        const end = parseInt(endStr.trim(), 10);

        if (!isNaN(start) && !isNaN(end) && start >= 1 && end <= maxPages && start <= end) {
          const range: number[] = [];
          for (let i = start; i <= end; i++) {
            range.push(i - 1); // 0-indexed
          }
          results.push(range);
        } else {
          throw new Error(`Rango inválido: "${trimmed}". Debe estar entre 1 y ${maxPages}.`);
        }
      } else {
        const page = parseInt(trimmed, 10);
        if (!isNaN(page) && page >= 1 && page <= maxPages) {
          results.push([page - 1]); // 0-indexed
        } else {
          throw new Error(`Página inválida: "${trimmed}". Debe estar entre 1 y ${maxPages}.`);
        }
      }
    }

    return results;
  };

  const handleSplit = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const pdfDoc = await PDFDocument.load(file.arrayBuffer, { ignoreEncryption: true });
      const totalPages = file.pages;
      
      let rangesToExtract: number[][] = [];

      if (splitMode === 'individual') {
        for (let i = 0; i < totalPages; i++) {
          rangesToExtract.push([i]);
        }
      } else {
        if (!customRange.trim()) {
          setError("Por favor, introduce al menos un rango de páginas.");
          setLoading(false);
          return;
        }
        rangesToExtract = parseRanges(customRange, totalPages);
      }

      if (rangesToExtract.length === 0) {
        setError("No se definieron páginas válidas para la división.");
        setLoading(false);
        return;
      }

      const fileBaseName = file.name.replace(/\.[^/.]+$/, "");

      if (rangesToExtract.length === 1) {
        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(pdfDoc, rangesToExtract[0]);
        copiedPages.forEach((page) => newPdf.addPage(page));
        const pdfBytes = await newPdf.save();

        const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const pageLabel = rangesToExtract[0].map(p => p + 1).join('_');
        link.download = `${fileBaseName}_parte_paginas_${pageLabel}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const zip = new JSZip();
        
        for (let index = 0; index < rangesToExtract.length; index++) {
          const pageIndices = rangesToExtract[index];
          const newPdf = await PDFDocument.create();
          const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
          copiedPages.forEach((page) => newPdf.addPage(page));
          const pdfBytes = await newPdf.save();
          
          const pageLabel = pageIndices.map(p => p + 1).join('_');
          zip.file(`${fileBaseName}_parte_${index + 1}_paginas_${pageLabel}.pdf`, pdfBytes);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileBaseName}_dividido.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocurrió un error al intentar dividir el archivo PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.35rem', color: 'hsl(var(--text-primary))' }}>Dividir Archivo PDF</h2>
        <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>
          Extrae páginas específicas de un archivo PDF o divide todo el documento en páginas individuales en segundos y de manera local.
        </p>
      </div>

      {error && (
        <div className="alert error">
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert success">
          <span>¡PDF dividido exitosamente! La descarga ha comenzado.</span>
        </div>
      )}

      {!file ? (
        <div 
          className={`dropzone ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
        >
          <input 
            ref={fileInputRef}
            type="file" 
            className="file-input-hidden" 
            accept=".pdf"
            onChange={handleFileInput}
          />
          <div className="dropzone-text">
            <h3>Arrastra y suelta tu archivo PDF aquí</h3>
            <p style={{ margin: '0.25rem 0 0.85rem' }}>o selecciona el archivo desde tu dispositivo</p>
            <span className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', pointerEvents: 'none' }}>
              Seleccionar Archivo
            </span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Card del Archivo Seleccionado */}
          <div className="file-item" style={{ borderColor: 'hsl(var(--border-color))' }}>
            <div className="file-item-info">
              <div className="file-item-name" style={{ fontSize: '1rem', fontWeight: 600 }}>{file.name}</div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.15rem' }}>
                <span className="file-item-size">{file.size}</span>
                <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem' }}>•</span>
                <span className="file-item-size" style={{ color: 'hsl(var(--color-primary))', fontWeight: 600 }}>{file.pages} páginas</span>
              </div>
            </div>
            <button className="action-btn delete" style={{ fontSize: '0.8rem', width: 'auto', padding: '0 0.5rem' }} onClick={() => { setFile(null); setSuccess(false); setError(null); }}>
              Cambiar
            </button>
          </div>

          {/* Grid visual de páginas */}
          <div className="pdf-preview-box">
            <div style={{ alignSelf: 'flex-start', color: 'hsl(var(--text-primary))', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
              Esquema de páginas del documento cargado:
            </div>
            <div className="pdf-page-grid">
              {Array.from({ length: file.pages }).map((_, i) => (
                <div className="pdf-page-thumbnail" key={i}>
                  Pág. {i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Opciones de División */}
          <div style={{ background: 'hsl(var(--bg-secondary))', border: '1px solid hsl(var(--border-color))', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'hsl(var(--text-primary))' }}>Configuración de división</h3>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--text-primary))', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input 
                  type="radio" 
                  name="splitMode" 
                  checked={splitMode === 'individual'} 
                  onChange={() => setSplitMode('individual')} 
                  style={{ accentColor: 'hsl(var(--color-primary))', width: '16px', height: '16px' }}
                />
                <span>Separar todas las páginas ({file.pages} archivos en un ZIP)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--text-primary))', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input 
                  type="radio" 
                  name="splitMode" 
                  checked={splitMode === 'ranges'} 
                  onChange={() => setSplitMode('ranges')} 
                  style={{ accentColor: 'hsl(var(--color-primary))', width: '16px', height: '16px' }}
                />
                <span>Extraer rangos personalizados de páginas</span>
              </label>
            </div>

            {splitMode === 'ranges' && (
              <div className="form-group" style={{ marginTop: '0.25rem' }}>
                <label className="form-label">Especifica los rangos a extraer (ej. 1-2, 4, 6-8):</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder={`Ej: 1-2, 4, ${Math.min(5, file.pages)}-${file.pages}`}
                  value={customRange}
                  onChange={(e) => setCustomRange(e.target.value)}
                />
                <span style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                  Usa comas para separar múltiples archivos resultantes.
                </span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button 
                className="btn-primary" 
                onClick={handleSplit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    <span>Procesando PDF...</span>
                  </>
                ) : (
                  <span>Dividir PDF y Descargar</span>
                )}
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => { setFile(null); setSuccess(false); setError(null); }}
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
