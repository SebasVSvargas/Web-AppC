import React, { useState, useRef } from 'react';
import { decryptPDF } from '@pdfsmaller/pdf-decrypt';
import { Lock, Unlock, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';

interface SelectedFile {
  file: File;
  name: string;
  size: string;
  arrayBuffer: ArrayBuffer;
}

export const UnlockPDF: React.FC = () => {
  const [file, setFile] = useState<SelectedFile | null>(null);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
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
    setPassword('');
    
    if (uploadedFiles.length === 0) return;
    
    const selectedFile = uploadedFiles[0];
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.endsWith(".pdf")) {
      setError("Por favor, selecciona un archivo PDF válido.");
      return;
    }

    setLoading(true);
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      
      setFile({
        file: selectedFile,
        name: selectedFile.name,
        size: formatBytes(selectedFile.size),
        arrayBuffer
      });
    } catch (err: any) {
      console.error(err);
      setError("Error al cargar el archivo PDF.");
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

  const handleDecrypt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    if (!password) {
      setError("Por favor, introduce la contraseña del PDF.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Intentar desencriptar el PDF localmente
      const decryptedBytes = await decryptPDF(new Uint8Array(file.arrayBuffer), password);

      // Crear un blob y descargar
      const blob = new Blob([decryptedBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileBaseName = file.name.replace(/\.[^/.]+$/, "");
      link.download = `${fileBaseName}_desbloqueado.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess(true);
      setPassword('');
    } catch (err: any) {
      console.error(err);
      setError("Contraseña incorrecta o error al desencriptar el PDF. Verifica la clave e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: 'white' }}>Quitar Contraseña a PDF</h2>
        <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.95rem' }}>
          Desbloquea documentos PDF protegidos con contraseña al instante. Todo el proceso es 100% local en tu navegador para proteger tus datos sensibles.
        </p>
      </div>

      {error && (
        <div className="alert error">
          <AlertTriangle className="alert-icon" size={20} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert success">
          <CheckCircle className="alert-icon" size={20} />
          <span>¡PDF desbloqueado y descargado exitosamente! Ya no requiere contraseña para abrirse.</span>
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
          <div className="dropzone-icon" style={{ color: 'hsl(var(--color-primary))', background: 'rgba(139, 92, 246, 0.1)' }}>
            <Lock size={32} />
          </div>
          <div className="dropzone-text">
            <h3>Arrastra y suelta tu PDF protegido aquí</h3>
            <p>o haz clic para buscar en tu dispositivo</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Card del Archivo Seleccionado */}
          <div className="file-item" style={{ background: 'rgba(139, 92, 246, 0.05)', borderColor: 'rgba(139, 92, 246, 0.2)' }}>
            <div className="file-item-icon" style={{ color: 'hsl(var(--color-primary))' }}>
              <Lock size={32} />
            </div>
            <div className="file-item-info">
              <div className="file-item-name" style={{ fontSize: '1.1rem' }}>{file.name}</div>
              <span className="file-item-size">{file.size} • Protegido con Contraseña</span>
            </div>
            <button className="action-btn delete" onClick={() => { setFile(null); setSuccess(false); setError(null); }}>
              Cambiar Archivo
            </button>
          </div>

          {/* Formulario de Contraseña */}
          <form onSubmit={handleDecrypt} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid hsl(var(--border-color))', borderRadius: 'var(--radius-md)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '1rem', marginBottom: '0.5rem' }}>
              <Unlock size={20} style={{ color: 'hsl(var(--color-secondary))' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white' }}>Desbloquear Documento</h3>
            </div>

            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">Introduce la contraseña de apertura del PDF:</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="form-input" 
                  placeholder="Contraseña del PDF"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: '3rem' }}
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'hsl(var(--text-secondary))',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    <span>Desbloqueando PDF...</span>
                  </>
                ) : (
                  <>
                    <Unlock size={20} />
                    <span>Eliminar Contraseña y Descargar</span>
                  </>
                )}
              </button>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => { setFile(null); setSuccess(false); setError(null); }}
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
