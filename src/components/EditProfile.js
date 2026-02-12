import React, { useState } from 'react';

function EditProfile({ user, setUser }) {
  const [nombre, setNombre] = useState(user?.nombre || '');
  const [email, setEmail] = useState(user?.email || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('token');

  // =============================
  // VALIDACIÓN EMAIL
  // =============================
  const validarEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // =============================
  // ACTUALIZAR PERFIL
  // =============================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!nombre.trim()) {
      setError('El nombre no puede estar vacío');
      return;
    }

    if (!validarEmail(email)) {
      setError('Formato de email inválido');
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        `http://localhost:5000/api/usuarios/${user.id}/perfil`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ nombre, email }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error actualizando perfil');
        return;
      }

      setUser(data);
      setSuccess('Perfil actualizado correctamente ✅');

    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  // =============================
  // ELIMINAR CUENTA
  // =============================
  const handleDelete = async () => {
    const confirmacion = window.confirm(
      '⚠️ Esta acción eliminará tu cuenta permanentemente.\n¿Deseas continuar?'
    );

    if (!confirmacion) return;

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
        return;
      }

      localStorage.removeItem('token');
      alert('Cuenta eliminada correctamente');
      window.location.href = '/';

    } catch (err) {
      setError('Error de conexión al eliminar cuenta');
    }
  };

  // =============================
  // UI
  // =============================
  return (
    <div className="card">
      <h2>Editar Perfil</h2>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Actualizando...' : 'Actualizar Perfil'}
        </button>
      </form>

      <hr />

      <button onClick={handleDelete} className="danger">
        Eliminar Cuenta
      </button>
    </div>
  );
}

export default EditProfile;
