import React, { useState } from 'react';

/**
 * Auth component: login and register with frontend password validation
 */
const Auth = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [pwdTouched, setPwdTouched] = useState(false);
  const [pwdError, setPwdError] = useState('');

  const validatePassword = (pw) => {
    if (!pw || pw.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
    if (!/[A-Z]/.test(pw)) return 'Incluye al menos una letra mayúscula';
    if (!/[a-z]/.test(pw)) return 'Incluye al menos una letra minúscula';
    if (!/[0-9]/.test(pw)) return 'Incluye al menos un número';
    if (!/[!@#$%^&*()_+\-=\[\]{};:\"\\|,.<>\/?]/.test(pw)) return 'Incluye al menos un carácter especial (ej. !?@#)';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPwdError('');
    setPwdTouched(true);

    if (isRegister) {
      if (!formData.nombre || !formData.nombre.trim()) {
        setError('Por favor introduce tu nombre completo');
        return;
      }
      const pwErr = validatePassword(formData.password);
      if (pwErr) {
        setPwdError(pwErr);
        return;
      }
    }

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Algo salió mal');

      if (!isRegister) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        alert('¡Registro exitoso! Ahora puedes iniciar sesión.');
        setIsRegister(false);
      }
    } catch (err) {
      setError(err.message || 'Error en la petición');
    }
  };

  return (
    <div className="auth-wrapper" style={{ position: 'relative' }}>
      <button
        onClick={() => window.location.href = '/'}
        className="btn-back"
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}
      >
        <span style={{ fontSize: '1.2rem' }}>←</span> Volver
      </button>

      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 className="logo">EcoGuide</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {isRegister ? 'Únete a la revolución verde' : 'Bienvenid@ de nuevo'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <h2 style={{ marginBottom: '12px', textAlign: 'center' }}>{isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}</h2>

          {error && <div className="auth-error">{error}</div>}

          {isRegister && (
            <div className="form-row">
              <label htmlFor="nombre" className="form-label">Nombre completo</label>
              <input
                id="nombre"
                type="text"
                className="form-input"
                placeholder="Tu nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </div>
          )}

          <div className="form-row">
            <label htmlFor="email" className="form-label">Correo electrónico</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="tu@correo.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="password" className="form-label">Contraseña</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="Contraseña"
              value={formData.password}
              onChange={(e) => { setFormData({ ...formData, password: e.target.value }); if (pwdTouched) setPwdError(validatePassword(e.target.value)); }}
              onBlur={() => { setPwdTouched(true); setPwdError(validatePassword(formData.password)); }}
              required
            />

            {isRegister && (
              <div className="password-hints" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                <div>La contraseña debe incluir:</div>
                <ul style={{ margin: '6px 0 0 18px' }}>
                  <li>8+ caracteres</li>
                  <li>Una mayúscula</li>
                  <li>Una minúscula</li>
                  <li>Un número</li>
                  <li>Un carácter especial (ej. !@#)</li>
                </ul>
              </div>
            )}

            {pwdError && <div style={{ color: 'var(--red-error)', marginTop: '8px', fontWeight: 700 }}>{pwdError}</div>}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-main" style={{ width: '100%', marginTop: '6px' }}>{isRegister ? 'Registrarse Ahora' : 'Entrar al Sistema'}</button>
          </div>

          <p onClick={() => setIsRegister(!isRegister)} className="switch-auth" style={{ cursor: 'pointer', marginTop: '16px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {isRegister ? (<>¿Ya tienes cuenta? <span className="highlight">Inicia sesión</span></>) : (<>¿No tienes cuenta? <span className="highlight">Regístrate gratis</span></>)}
          </p>
        </form>
      </div>
    </div>
  );
};

export default Auth;