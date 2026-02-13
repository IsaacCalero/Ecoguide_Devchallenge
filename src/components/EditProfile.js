import React, { useState, useRef } from 'react';

function EditProfile({ user, setUser, onBack }) {
  const [nombre, setNombre] = useState(user?.nombre || '');
  const [email, setEmail] = useState(user?.email || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ nombre: false, email: false });
  const [fieldErrors, setFieldErrors] = useState({ nombre: '', email: '' });

  const token = localStorage.getItem('token');

  // Avatar preview / upload (base64)
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [avatarBase64, setAvatarBase64] = useState('');
  const fileInputRef = useRef(null);
  const [avatarHover, setAvatarHover] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Toast notification
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  // Change password
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPwdError, setNewPwdError] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPwdError, setConfirmPwdError] = useState('');

  const showToast = (message, type = 'info', ms = 3000) => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'info' }), ms);
  };

  const validatePassword = (pw) => {
    if (!pw || pw.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
    if (!/[A-Z]/.test(pw)) return 'Incluye al menos una letra mayúscula';
    if (!/[a-z]/.test(pw)) return 'Incluye al menos una letra minúscula';
    if (!/[0-9]/.test(pw)) return 'Incluye al menos un número';
    if (!/[!@#$%^&*()_+\-=\[\]{};:\"\\|,.<>\/?]/.test(pw)) return 'Incluye al menos un carácter especial';
    return '';
  };

  // =============================
  // VALIDACIÓN EMAIL
  // =============================
  const validarEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateField = (field, value) => {
    if (field === 'nombre') {
      return value.trim() ? '' : 'El nombre no puede estar vacío';
    }

    if (field === 'email') {
      return validarEmail(value) ? '' : 'Formato de email inválido';
    }

    return '';
  };

  // =============================
  // ACTUALIZAR PERFIL
  // =============================
  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setError('');
    setSuccess('');

    // marcar campos como tocados para mostrar errores
    setTouched({ nombre: true, email: true });

    const nombreErr = validateField('nombre', nombre);
    // only validate email if it was changed (don't force change)
    const emailChanged = (email || '').trim() !== (user?.email || '').trim();
    const emailErr = emailChanged ? validateField('email', email) : '';
    setFieldErrors({ nombre: nombreErr, email: emailErr });

    if (nombreErr || emailErr) return;

    // If user wants to change password, validate it here
    if (showChangePwd) {
      const pwdErr = validatePassword(newPassword);
      setNewPwdError(pwdErr);
      if (pwdErr) return;
      if (newPassword !== confirmPassword) {
        setConfirmPwdError('Las contraseñas no coinciden');
        return;
      }
      setConfirmPwdError('');
    }

    try {
      setLoading(true);

      // Prepare payload; include avatar and password if present
      const payload = { nombre, email };
      if (avatarBase64) payload.avatar_base64 = avatarBase64;
      if (showChangePwd && newPassword) payload.newPassword = newPassword;

      const res = await fetch(
        `http://localhost:5000/api/usuarios/${user.id}/perfil`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error actualizando perfil');
        showToast(data.error || 'Error actualizando perfil', 'error');
        return;
      }

      setUser(data);
      setSuccess('Perfil actualizado correctamente ✅');
      showToast('Perfil actualizado correctamente', 'success');

    } catch (err) {
      setError('Error de conexión con el servidor');
      showToast('Error de conexión con el servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  // =============================
  // ELIMINAR CUENTA
  // =============================
  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteModal(false);
    try {
      const res = await fetch(
        `http://localhost:5000/api/usuarios/${user.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Error eliminando cuenta');
        showToast(data.error || 'Error eliminando cuenta', 'error');
        return;
      }

      // Clear auth and user data, update app state and navigate back to landing
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof setUser === 'function') setUser(null);
      showToast('Cuenta eliminada correctamente', 'success');
      if (typeof onBack === 'function') {
        onBack();
      } else {
        window.location.href = '/';
      }

    } catch (err) {
      setError('Error de conexión al eliminar cuenta');
      showToast('Error de conexión al eliminar cuenta', 'error');
    }
  };

  // =============================
  // UI
  // =============================
  return (
    <div className="card profile-card">
      {/* TOAST */}
      {toast.visible && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* AVATAR */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
        <div
          className="avatar-wrapper"
          onMouseEnter={() => setAvatarHover(true)}
          onMouseLeave={() => setAvatarHover(false)}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <div
            className="avatar-circle"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current && fileInputRef.current.click(); }}
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f4f4f4',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'transform 120ms ease, opacity 120ms ease',
              opacity: avatarHover ? 0.95 : 1,
            }}
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="avatar"
                className="avatar-img"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={(e) => { e.target.onerror = null; setAvatarPreview(''); }}
              />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9aa4a6"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}

            {/* Camera overlay icon */}
            <div
              style={{
                position: 'absolute',
                right: 6,
                bottom: 6,
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                transition: 'transform 120ms ease, opacity 120ms ease',
                opacity: avatarHover ? 1 : 0.85,
              }}
              aria-hidden
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files && e.target.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result;
                setAvatarPreview(result);
                setAvatarBase64(result);
              };
              reader.readAsDataURL(file);
            }}
            className="avatar-input"
            style={{ display: 'none' }}
          />

          <button
            type="button"
            className="change-photo"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            style={{
              marginTop: 8,
              background: 'transparent',
              border: 'none',
              color: '#cfe3d6',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Cambiar foto
          </button>
        </div>
      </div>
      <div className="profile-header">
        <h2>Editar Perfil</h2>
        {onBack && (
          <button type="button" className="btn-back" onClick={onBack}>
            ← Volver
          </button>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}
      {success && <p className="success">{success}</p>}

      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-row">
          <label htmlFor="nombre" className="form-label">Nombre</label>
          <input
            id="nombre"
            className="form-input"
            type="text"
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              if (touched.nombre) setFieldErrors(prev => ({ ...prev, nombre: validateField('nombre', e.target.value) }));
            }}
            onBlur={() => { setTouched(prev => ({ ...prev, nombre: true })); setFieldErrors(prev => ({ ...prev, nombre: validateField('nombre', nombre) })); }}
          />
          {fieldErrors.nombre && <small className="error">{fieldErrors.nombre}</small>}
        </div>

        <div className="form-row">
          <label htmlFor="email" className="form-label">Correo electrónico</label>
          <input
            id="email"
            className="form-input"
            type="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              // only validate if email differs from original
              const changed = (e.target.value || '').trim() !== (user?.email || '').trim();
              if (touched.email && changed) setFieldErrors(prev => ({ ...prev, email: validateField('email', e.target.value) }));
              else setFieldErrors(prev => ({ ...prev, email: '' }));
            }}
            onBlur={() => {
              setTouched(prev => ({ ...prev, email: true }));
              const changed = (email || '').trim() !== (user?.email || '').trim();
              setFieldErrors(prev => ({ ...prev, email: changed ? validateField('email', email) : '' }));
            }}
          />
          {fieldErrors.email && <small className="error">{fieldErrors.email}</small>}
        </div>

        {/* Change password toggle + fields (inside form so buttons align) */}
        <div style={{ marginTop: 12 }}>
          <button type="button" className="btn-secondary" onClick={() => setShowChangePwd(prev => !prev)} style={{ marginBottom: 8 }}>
            {showChangePwd ? 'Cancelar cambio de contraseña' : 'Cambiar contraseña'}
          </button>

          {showChangePwd && (
            <div className="change-pwd" style={{ marginTop: 8 }}>
              <div className="form-row">
                <label className="form-label">Nueva contraseña</label>
                <input
                  type="password"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); if (newPwdError) setNewPwdError(validatePassword(e.target.value)); }}
                  onBlur={() => setNewPwdError(validatePassword(newPassword))}
                  placeholder="Nueva contraseña"
                />
                {newPwdError && <small className="error">{newPwdError}</small>}
              </div>

              <div className="form-row">
                <label className="form-label">Confirmar nueva contraseña</label>
                <input
                  type="password"
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); if (confirmPwdError) setConfirmPwdError(''); }}
                  onBlur={() => { if (newPassword !== confirmPassword) setConfirmPwdError('Las contraseñas no coinciden'); else setConfirmPwdError(''); }}
                  placeholder="Confirmar contraseña"
                />
                {confirmPwdError && <small className="error">{confirmPwdError}</small>}
              </div>
            </div>
          )}
        </div>

        <div className="form-actions" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
          
          {showChangePwd && (
            <button type="button" className="btn-secondary" onClick={() => handleSubmit()} disabled={loading}>
              Actualizar contraseña
            </button>
          )}
        </div>
      </form>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.03)', margin: '20px 0' }} />

      <div className="danger-row">
        <button onClick={handleDelete} className="danger btn-danger">
          Eliminar Cuenta
        </button>
      </div>

      {/* DELETE CONFIRM MODAL */}
      {showDeleteModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Confirmar eliminación</h3>
            <p>⚠️ Esta acción eliminará tu cuenta y todos los datos asociados. ¿Deseas continuar?</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button className="btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancelar</button>
              <button className="danger btn-danger" onClick={handleConfirmDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditProfile;
