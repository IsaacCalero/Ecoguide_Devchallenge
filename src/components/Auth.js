import React, { useState } from 'react';

/**
 * Componente de Autenticación (Login/Register)
 * Maneja tanto el registro de nuevos usuarios como el inicio de sesión
 * Alterna entre dos vistas: login y registro
 * 
 * @param {Function} onLogin - Callback ejecutado cuando el login es exitoso
 *                             recibe el objeto usuario: { id, nombre, puntos, co2_evitado }
 */
const Auth = ({ onLogin }) => {
  // --- ESTADO ---
  const [isRegister, setIsRegister] = useState(false); // true = modo registro, false = modo login
  const [formData, setFormData] = useState({ nombre: '', email: '', password: '' });
  const [error, setError] = useState(''); // Mensaje de error si falla la solicitud

  /**
   * Maneja el envío del formulario (registro o login)
   * Realiza una solicitud POST al backend con las credenciales
   * 
   * @param {Event} e - Evento del formulario
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Selecciona el endpoint según si es registro o login
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    
    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      // Si hay error HTTP, lanzamos excepción
      if (!response.ok) throw new Error(data.error || 'Algo salió mal');

      // --- MANEJO POST-LOGIN ---
      if (!isRegister) {
        // Guardamos token y usuario en localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        // Ejecutamos callback para actualizar estado en App
        onLogin(data.user);
      } else {
        // --- MANEJO POST-REGISTRO ---
        // Confirmamos registro y volvemos a login
        alert("¡Registro exitoso! Ahora puedes iniciar sesión.");
        setIsRegister(false);
      }
    } catch (err) {
      // Mostramos error en la UI
      setError(err.message);
    }
  };

  return (
    // Contenedor principal con posicionamiento relativo para el botón "Volver"
    <div className="auth-wrapper" style={{ position: 'relative' }}>
      
      {/* BOTÓN VOLVER: Navega a la página principal */}
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

      {/* TARJETA DE AUTENTICACIÓN */}
      <div className="auth-card">
        {/* ENCABEZADO CON LOGO */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 className="logo">EcoGuide</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {isRegister ? 'Únete a la revolución verde' : 'Bienvenid@ de nuevo'}
          </p>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit}>
          <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>
            {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </h2>
          
          {/* MOSTRAR ERRORES */}
          {error && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              color: 'var(--red-error)', 
              padding: '10px', 
              borderRadius: '10px', 
              marginBottom: '15px',
              fontSize: '0.85rem',
              border: '1px solid var(--red-error)',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}
          
          {/* CAMPO NOMBRE (solo en registro) */}
          {isRegister && (
            <input 
              type="text" 
              placeholder="Nombre completo" 
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})} 
              required 
            />
          )}
          
          {/* CAMPO EMAIL (obligatorio en ambos casos) */}
          <input 
            type="email" 
            placeholder="Correo electrónico" 
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})} 
            required 
          />
          
          {/* CAMPO CONTRASEÑA */}
          <input 
            type="password" 
            placeholder="Contraseña" 
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})} 
            required 
          />

          {/* BOTÓN DE ENVÍO */}
          <button type="submit" className="btn-main" style={{ width: '100%', marginTop: '10px' }}>
            {isRegister ? 'Registrarse Ahora' : 'Entrar al Sistema'}
          </button>

          {/* SWITCH ENTRE LOGIN Y REGISTRO */}
          <p 
            onClick={() => setIsRegister(!isRegister)} 
            className="switch-auth" 
            style={{ 
              cursor: 'pointer', 
              marginTop: '20px', 
              textAlign: 'center',
              fontSize: '0.9rem',
              color: 'var(--text-muted)'
            }}
          >
            {isRegister ? (
              <>¿Ya tienes cuenta? <span className="highlight">Inicia sesión</span></>
            ) : (
              <>¿No tienes cuenta? <span className="highlight">Regístrate gratis</span></>
            )}
          </p>
        </form>
      </div>
    </div>
  );
};

export default Auth;