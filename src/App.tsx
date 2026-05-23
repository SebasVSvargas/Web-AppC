import { useState } from 'react';
import { 
  FileText, 
  Merge, 
  Split, 
  Lock, 
  Unlock, 
  Database, 
  Sparkles, 
  Calendar, 
  Users, 
  ShieldAlert 
} from 'lucide-react';
import { MergePDF } from './components/PDFTools/MergePDF';
import { SplitPDF } from './components/PDFTools/SplitPDF';
import { UnlockPDF } from './components/PDFTools/UnlockPDF';
import { ProtectPDF } from './components/PDFTools/ProtectPDF';

type MainSection = 'pdf-tools' | 'cosmetology';
type PDFToolType = 'merge' | 'split' | 'unlock' | 'protect';

function App() {
  const [activeSection, setActiveSection] = useState<MainSection>('pdf-tools');
  const [activeTool, setActiveTool] = useState<PDFToolType>('merge');

  return (
    <div className="app-container">
      {/* Luces de fondo difusas decorativas */}
      <div className="glow-backdrop" />

      {/* Barra Lateral (Sidebar) */}
      <aside className="sidebar">
        <div className="brand-section">
          <div className="brand-icon">
            <Sparkles size={22} />
          </div>
          <span className="brand-name">CATAPP</span>
        </div>

        <nav className="nav-menu">
          <button 
            className={`nav-item ${activeSection === 'pdf-tools' ? 'active' : ''}`}
            onClick={() => setActiveSection('pdf-tools')}
          >
            <FileText size={18} />
            <span>Herramientas PDF</span>
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'cosmetology' ? 'active' : ''}`}
            onClick={() => setActiveSection('cosmetology')}
          >
            <Calendar size={18} />
            <span>Citas y Cosmetología</span>
            <span className="coming-soon-badge">Fase 2</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="db-status">
            <div className="status-dot local"></div>
            <span>Base de Datos: Modo Local</span>
          </div>
        </div>
      </aside>

      {/* Área de Contenido Principal */}
      <main className="main-content">
        {activeSection === 'pdf-tools' ? (
          <>
            <header className="header-section">
              <h1 className="header-title">Herramientas PDF Inteligentes</h1>
              <p className="header-subtitle">
                Modifica tus archivos PDF de forma instantánea. Todo el procesamiento se realiza 100% de forma local en tu navegador para máxima velocidad y total privacidad.
              </p>
            </header>

            {/* Selector de sub-herramientas PDF */}
            <section className="pdf-tools-tabs">
              <button 
                className={`tool-tab-card ${activeTool === 'merge' ? 'active' : ''}`}
                onClick={() => setActiveTool('merge')}
              >
                <div className="tool-icon-wrapper">
                  <Merge size={22} />
                </div>
                <div className="tool-info">
                  <span className="tool-title">Unir PDFs</span>
                  <span className="tool-description">Combina múltiples archivos PDF en un solo documento.</span>
                </div>
              </button>

              <button 
                className={`tool-tab-card ${activeTool === 'split' ? 'active' : ''}`}
                onClick={() => setActiveTool('split')}
              >
                <div className="tool-icon-wrapper">
                  <Split size={22} />
                </div>
                <div className="tool-info">
                  <span className="tool-title">Dividir PDF</span>
                  <span className="tool-description">Extrae rangos específicos o separa todas las páginas.</span>
                </div>
              </button>

              <button 
                className={`tool-tab-card ${activeTool === 'unlock' ? 'active' : ''}`}
                onClick={() => setActiveTool('unlock')}
              >
                <div className="tool-icon-wrapper">
                  <Unlock size={22} />
                </div>
                <div className="tool-info">
                  <span className="tool-title">Quitar Contraseña</span>
                  <span className="tool-description">Elimina la protección y restricciones de tus PDFs.</span>
                </div>
              </button>

              <button 
                className={`tool-tab-card ${activeTool === 'protect' ? 'active' : ''}`}
                onClick={() => setActiveTool('protect')}
              >
                <div className="tool-icon-wrapper">
                  <Lock size={22} />
                </div>
                <div className="tool-info">
                  <span className="tool-title">Proteger con Clave</span>
                  <span className="tool-description">Encripta y restringe el acceso mediante contraseña.</span>
                </div>
              </button>
            </section>

            {/* Área de Trabajo del Componente Seleccionado */}
            <section className="workspace-panel">
              {activeTool === 'merge' && <MergePDF />}
              {activeTool === 'split' && <SplitPDF />}
              {activeTool === 'unlock' && <UnlockPDF />}
              {activeTool === 'protect' && <ProtectPDF />}
            </section>
          </>
        ) : (
          /* Módulo de Cosmetología (Elegante Placeholder para la Fase 2) */
          <>
            <header className="header-section">
              <h1 className="header-title">Gestión de Citas y Cosmetología</h1>
              <p className="header-subtitle">
                Sistema CRM profesional diseñado para cosmetólogas y estéticas. Almacena clientes, programa citas y calcula costos.
              </p>
            </header>

            <section className="workspace-panel" style={{ justifyContent: 'center' }}>
              <div className="coming-soon-container">
                <div className="coming-soon-icon">
                  <Sparkles />
                </div>
                <h2 className="coming-soon-title">Módulo en Desarrollo (Fase 2)</h2>
                <p className="coming-soon-desc">
                  Este panel estará disponible una vez que compruebes y verifiques el funcionamiento completo del suite de herramientas PDF.
                  En la siguiente fase, integraremos este módulo con **Supabase** para ofrecerte persistencia en tiempo real en la nube,
                  permitiendo registrar datos completos de clientes, fechas de citas cosmetológicas, costos de tratamiento, y tipo de EPS de forma totalmente segura.
                </p>

                <div className="features-preview-grid">
                  <div className="feature-preview-card">
                    <Users size={20} style={{ color: 'hsl(var(--color-primary))' }} />
                    <span className="feature-preview-title">Expediente de Clientes</span>
                    <span className="feature-preview-desc">
                      Guarda nombre, contacto, EPS, antecedentes clínicos, tipo de piel y notas estéticas.
                    </span>
                  </div>

                  <div className="feature-preview-card">
                    <Calendar size={20} style={{ color: 'hsl(var(--color-secondary))' }} />
                    <span className="feature-preview-title">Agenda Interactiva</span>
                    <span className="feature-preview-desc">
                      Programa, edita y cancela citas de cosmetología con alertas visuales de fechas.
                    </span>
                  </div>

                  <div className="feature-preview-card">
                    <Database size={20} style={{ color: 'hsl(var(--color-accent))' }} />
                    <span className="feature-preview-title">Sincronización en la Nube</span>
                    <span className="feature-preview-desc">
                      Conectado directamente a una base de datos segura en Supabase para acceso multidispositivo.
                    </span>
                  </div>

                  <div className="feature-preview-card">
                    <ShieldAlert size={20} style={{ color: 'hsl(var(--color-success))' }} />
                    <span className="feature-preview-title">Reportes de Ingresos</span>
                    <span className="feature-preview-desc">
                      Monitorea el costo acumulado de los tratamientos y el estatus de pago de cada cita.
                    </span>
                  </div>
                </div>

                <button 
                  className="btn-primary" 
                  style={{ marginTop: '1.5rem' }} 
                  onClick={() => setActiveSection('pdf-tools')}
                >
                  Regresar a las Herramientas PDF
                </button>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
