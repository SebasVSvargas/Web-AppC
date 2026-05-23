import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';

interface FileWithId {
  id: string;
  file: File;
  size: string;
}

export const MergePDF: React.FC = () => {
  const [files, setFiles] = useState<FileWithId[]>([]);
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

  const processFiles = (uploadedFiles: FileList) => {
    setError(null);
    setSuccess(false);
    const validFiles: FileWithId[] = [];
    
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        validFiles.push({
          id: Math.random().toString(36).substring(2, 9),
          file,
          size: formatBytes(file.size)
        });
      }
    }

    if (validFiles.length === 0) {
      setError("Por favor, selecciona solo archivos PDF válidos.");
      return;
    }

    setFiles((prev) => [...prev, ...validFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFiles(e.target.files);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((item) => item.id !== id));
    setSuccess(false);
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    const newFiles = [...files];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= files.length) return;
    
    const [movedFile] = newFiles.splice(index, 1);
    newFiles.splice(targetIndex, 0, movedFile);
    setFiles(newFiles);
    setSuccess(false);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      setError("Se necesitan al menos 2 archivos PDF para realizar la fusión.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const mergedPdf = await PDFDocument.create();
      
      for (const fileObj of files) {
        const arrayBuffer = await fileObj.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();

      const blob = new Blob([mergedPdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fusionado_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError("Error al fusionar los PDFs. Asegúrate de que ninguno de los archivos cargados esté protegido con contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.35rem', color: 'hsl(var(--text-primary))' }}>Unir Archivos PDF</h2>
        <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>
          Combina múltiples archivos PDF en un solo documento. Puedes cambiar el orden utilizando los botones de control antes de fusionar.
        </p>
      </div>

      {error && (
        <div className="alert error">
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert success">
          <span>¡PDFs fusionados exitosamente! La descarga ha comenzado automáticamente.</span>
        </div>
      )}

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
          multiple 
          accept=".pdf"
          onChange={handleFileInput}
        />
        <div className="dropzone-text">
          <h3>Arrastra y suelta tus archivos PDF aquí</h3>
          <p style={{ margin: '0.25rem 0 0.85rem' }}>o selecciona archivos desde tu dispositivo</p>
          <span className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', pointerEvents: 'none' }}>
            Seleccionar Archivos
          </span>
        </div>
      </div>

      {files.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.85rem', color: 'hsl(var(--text-primary))' }}>
            Archivos seleccionados ({files.length})
          </h3>
          
          <div className="file-list">
            {files.map((item, index) => (
              <div className="file-item" key={item.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--text-secondary))', fontSize: '0.75rem', fontWeight: 600 }}>
                  {index + 1}
                </div>
                <div className="file-item-info" style={{ marginLeft: '0.25rem' }}>
                  <div className="file-item-name">{item.file.name}</div>
                  <div className="file-item-size">{item.size}</div>
                </div>
                <div className="file-item-actions" onClick={(e) => e.stopPropagation()}>
                  <button 
                    className="action-btn" 
                    title="Subir"
                    disabled={index === 0} 
                    onClick={() => moveFile(index, 'up')}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button 
                    className="action-btn" 
                    title="Bajar"
                    disabled={index === files.length - 1} 
                    onClick={() => moveFile(index, 'down')}
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button 
                    className="action-btn delete" 
                    title="Eliminar"
                    onClick={() => removeFile(item.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button 
              className="btn-primary" 
              onClick={handleMerge}
              disabled={loading || files.length < 2}
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  <span>Fusionando PDFs...</span>
                </>
              ) : (
                <span>Unir PDFs y Descargar</span>
              )}
            </button>
            <button 
              className="btn-secondary" 
              onClick={() => setFiles([])}
              disabled={loading}
            >
              Limpiar Todo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
