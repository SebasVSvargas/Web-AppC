import { useState, useEffect } from 'react';
import { 
  FileText, 
  Calendar 
} from 'lucide-react';
import { MergePDF } from './components/PDFTools/MergePDF';
import { SplitPDF } from './components/PDFTools/SplitPDF';
import { UnlockPDF } from './components/PDFTools/UnlockPDF';
import { ProtectPDF } from './components/PDFTools/ProtectPDF';

// Componentes del Módulo de Dermatología
import { PatientManager } from './components/CRM/PatientManager';
import { ConsultationForm } from './components/CRM/ConsultationForm';
import { HistoryDashboard } from './components/CRM/HistoryDashboard';
import { SettingsPanel } from './components/CRM/SettingsPanel';
import { ReportsManager } from './components/CRM/ReportsManager';
import { AuthPanel } from './components/CRM/AuthPanel';
import db from './services/config';

type MainSection = 'pdf-tools' | 'dermatology';
type PDFToolType = 'merge' | 'split' | 'unlock' | 'protect';
type DermatologyToolType = 'patients' | 'consultations' | 'history' | 'settings' | 'reports';

function App() {
  const [activeSection, setActiveSection] = useState<MainSection>('pdf-tools');
  
  // Estados de pestañas de cada sección
  const [activePDFTool, setActivePDFTool] = useState<PDFToolType>('merge');
  const [activeDermaTool, setActiveDermaTool] = useState<DermatologyToolType>('patients');

  // Estado de sesión del médico
  const [doctor, setDoctor] = useState<{ email: string; nombres: string; apellidos: string } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentDoc = await db.getCurrentDoctor();
        setDoctor(currentDoc);
      } catch (err) {
        console.error('Error al verificar sesión de médico:', err);
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  const handleSignOut = async () => {
    try {
      await db.signOutDoctor();
      setDoctor(null);
      setActiveSection('pdf-tools');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  };

  if (checkingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'hsl(var(--bg-primary))', color: 'hsl(var(--text-secondary))' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'hsl(var(--color-primary))', letterSpacing: '1px' }}>CATAPP</h2>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: 'hsl(var(--text-muted))' }}>Iniciando sesión segura...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Barra Lateral (Sidebar) */}
      <aside className="sidebar">
        <div className="brand-section">
          <div className="brand-icon">
            <FileText size={18} />
          </div>
          <span className="brand-name">CATAPP</span>
        </div>

        <nav className="nav-menu">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <button 
              className={`nav-item ${activeSection === 'pdf-tools' ? 'active' : ''}`}
              onClick={() => setActiveSection('pdf-tools')}
            >
              <FileText size={16} />
              <span>Herramientas PDF</span>
            </button>
            {activeSection === 'pdf-tools' && (
              <div className="sub-menu">
                <button 
                  className={`sub-nav-item ${activePDFTool === 'merge' ? 'active' : ''}`}
                  onClick={() => setActivePDFTool('merge')}
                >
                  Unir PDFs
                </button>
                <button 
                  className={`sub-nav-item ${activePDFTool === 'split' ? 'active' : ''}`}
                  onClick={() => setActivePDFTool('split')}
                >
                  Dividir PDF
                </button>
                <button 
                  className={`sub-nav-item ${activePDFTool === 'unlock' ? 'active' : ''}`}
                  onClick={() => setActivePDFTool('unlock')}
                >
                  Quitar Contraseña
                </button>
                <button 
                  className={`sub-nav-item ${activePDFTool === 'protect' ? 'active' : ''}`}
                  onClick={() => setActivePDFTool('protect')}
                >
                  Proteger con Clave
                </button>
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <button 
              className={`nav-item ${activeSection === 'dermatology' ? 'active' : ''}`}
              onClick={() => setActiveSection('dermatology')}
            >
              <Calendar size={16} />
              <span>Gestión Dermatológica</span>
            </button>
            {activeSection === 'dermatology' && doctor && (
              <div className="sub-menu">
                <button 
                  className={`sub-nav-item ${activeDermaTool === 'patients' ? 'active' : ''}`}
                  onClick={() => setActiveDermaTool('patients')}
                >
                  Pacientes
                </button>
                <button 
                  className={`sub-nav-item ${activeDermaTool === 'consultations' ? 'active' : ''}`}
                  onClick={() => setActiveDermaTool('consultations')}
                >
                  Registrar Consulta
                </button>
                <button 
                  className={`sub-nav-item ${activeDermaTool === 'history' ? 'active' : ''}`}
                  onClick={() => setActiveDermaTool('history')}
                >
                  Historial & Dashboard
                </button>
                <button 
                  className={`sub-nav-item ${activeDermaTool === 'reports' ? 'active' : ''}`}
                  onClick={() => setActiveDermaTool('reports')}
                >
                  Reportes Clínicos
                </button>
                <button 
                  className={`sub-nav-item ${activeDermaTool === 'settings' ? 'active' : ''}`}
                  onClick={() => setActiveDermaTool('settings')}
                >
                  Convenios y Precios
                </button>
              </div>
            )}
          </div>
        </nav>

        <div className="sidebar-footer" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid hsl(var(--border-color))', paddingTop: '1rem' }}>
          {doctor && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', paddingBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Médico Autenticado
              </span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'hsl(var(--text-primary))' }} title={doctor.email}>
                Dra. {doctor.nombres} {doctor.apellidos}
              </span>
              <button 
                onClick={handleSignOut}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'hsl(var(--color-error))', 
                  fontSize: '0.76rem', 
                  fontWeight: 700, 
                  cursor: 'pointer', 
                  textAlign: 'left',
                  padding: 0,
                  textDecoration: 'underline',
                  marginTop: '0.15rem'
                }}
              >
                Cerrar Sesión
              </button>
            </div>
          )}
          <div className="db-status">
            <div className="status-dot local"></div>
            <span>catadb local conectada</span>
          </div>
        </div>
      </aside>

      {/* Área de Contenido Principal */}
      <main className="main-content">
        {activeSection === 'pdf-tools' ? (
          <>
            <header className="header-section">
              <h1 className="header-title">Herramientas PDF</h1>
              <p className="header-subtitle">
                Modifica tus archivos PDF de forma instantánea. Todo el procesamiento se realiza 100% en tu navegador para garantizar máxima velocidad y total privacidad.
              </p>
            </header>

            {/* Área de Trabajo del Componente Seleccionado */}
            <section className="workspace-panel">
              {activePDFTool === 'merge' && <MergePDF />}
              {activePDFTool === 'split' && <SplitPDF />}
              {activePDFTool === 'unlock' && <UnlockPDF />}
              {activePDFTool === 'protect' && <ProtectPDF />}
            </section>
          </>
        ) : (
          /* Módulo de Dermatología (Fase 2 - 100% Funcional e Integrado) */
          <>
            <header className="header-section">
              <h1 className="header-title">Gestión Dermatológica</h1>
              <p className="header-subtitle">
                Sistema CRM profesional de dermatología. Registra pacientes, administra tratamientos y consulta el historial médico-financiero.
              </p>
            </header>

            {/* Área de Trabajo de Dermatología con Control de Acceso */}
            <section className="workspace-panel">
              {!doctor ? (
                <AuthPanel onLoginSuccess={(doc) => setDoctor(doc)} />
              ) : (
                <>
                  {activeDermaTool === 'patients' && <PatientManager />}
                  {activeDermaTool === 'consultations' && <ConsultationForm onSaveSuccess={() => setActiveDermaTool('history')} />}
                  {activeDermaTool === 'history' && <HistoryDashboard />}
                  {activeDermaTool === 'reports' && <ReportsManager />}
                  {activeDermaTool === 'settings' && <SettingsPanel />}
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
