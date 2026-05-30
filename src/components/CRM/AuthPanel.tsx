import React, { useState } from 'react';
import db from '../../services/config';

interface AuthPanelProps {
  onLoginSuccess: (doctor: { email: string; nombres: string; apellidos: string }) => void;
}

export const AuthPanel: React.FC<AuthPanelProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  
  // Estados de campos
  const [nombres, setNombres] = useState<string>('');
  const [apellidos, setApellidos] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  
  // Estados de control
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isLogin) {
        // --- Iniciar Sesión ---
        if (!email.trim() || !password) {
          setError('Por favor, ingresa tu correo y contraseña.');
          setLoading(false);
          return;
        }
        const doctor = await db.signInDoctor(email.trim().toLowerCase(), password);
        onLoginSuccess(doctor);
      } else {
        // --- Registrar Médico ---
        if (!nombres.trim() || !apellidos.trim() || !email.trim() || !password || !confirmPassword) {
          setError('Por favor, completa todos los campos del formulario.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Las contraseñas ingresadas no coinciden.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres.');
          setLoading(false);
          return;
        }
        await db.signUpDoctor(nombres.trim(), apellidos.trim(), email.trim().toLowerCase(), password);
        setSuccess('¡Registro exitoso! Ya puedes iniciar sesión con tu cuenta.');
        setIsLogin(true);
        // Limpiar campos de registro
        setNombres('');
        setApellidos('');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '55vh', padding: '1rem' }}>
      <div style={{
        width: '100%',
        maxWidth: '430px',
        background: 'hsl(var(--bg-secondary))',
        border: '1px solid hsl(var(--border-color))',
        borderRadius: 'var(--radius-lg)',
        padding: '2.5rem',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        {/* Cabecera */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'hsl(var(--color-primary))', marginBottom: '0.4rem' }}>
            {isLogin ? 'Acceso de Médicos' : 'Registro de Médicos'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.4' }}>
            {isLogin 
              ? 'Ingresa tus credenciales profesionales autorizadas de dermatología para acceder.' 
              : 'Regístrate como médico para acceder al historial clínico y reportes.'}
          </p>
        </div>

        {error && <div className="alert error" style={{ margin: 0 }}><span>{error}</span></div>}
        {success && <div className="alert success" style={{ margin: 0 }}><span>{success}</span></div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {!isLogin && (
            <>
              <div className="form-group">
                <label className="form-label">Nombres:</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Nombres del médico"
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
                  placeholder="Apellidos del médico"
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Correo Electrónico:</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="ejemplo@medicos.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña:</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Confirmar Contraseña:</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="Repite la contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading} 
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}
          >
            {loading ? 'Validando datos...' : isLogin ? 'Ingresar al CRM' : 'Crear Cuenta Médica'}
          </button>
        </form>

        {/* Conmutador */}
        <div style={{
          textAlign: 'center',
          fontSize: '0.8rem',
          borderTop: '1px solid hsl(var(--border-color))',
          paddingTop: '1.25rem',
          color: 'hsl(var(--text-secondary))'
        }}>
          {isLogin ? (
            <span>
              ¿Eres un nuevo especialista?{' '}
              <button 
                type="button" 
                onClick={() => { setIsLogin(false); setError(null); }}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'hsl(var(--color-primary))', 
                  fontWeight: 700, 
                  cursor: 'pointer', 
                  textDecoration: 'underline',
                  padding: 0 
                }}
              >
                Regístrate aquí
              </button>
            </span>
          ) : (
            <span>
              ¿Ya posees una cuenta de médico?{' '}
              <button 
                type="button" 
                onClick={() => { setIsLogin(true); setError(null); }}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'hsl(var(--color-primary))', 
                  fontWeight: 700, 
                  cursor: 'pointer', 
                  textDecoration: 'underline',
                  padding: 0 
                }}
              >
                Inicia sesión
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
