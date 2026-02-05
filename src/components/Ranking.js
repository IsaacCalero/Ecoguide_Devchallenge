import React, { useState, useEffect } from 'react';

/**
 * Componente Ranking (Tabla de Líderes)
 * Muestra el top 10 de usuarios ordenados por puntos
 * Destaca a los top 3 con medallas (🥇 🥈 🥉)
 * Incluye información de CO2 evitado y puntos totales
 * 
 * @param {Function} onBack - Callback para volver a la vista anterior
 */
const Ranking = ({ onBack }) => {
  // --- ESTADO ---
  const [leaders, setLeaders] = useState([]); // Array de usuarios ordenados por puntos
  const [loading, setLoading] = useState(true); // Indicador de carga desde el servidor

  /**
   * Efecto: Carga el ranking desde la API al montar el componente
   * Realiza validación de datos antes de guardar en estado
   * Maneja errores gracefully sin romper la UI
   */
  useEffect(() => {
    fetch('http://localhost:5000/api/ranking')
      .then(res => {
        // Verificamos si la respuesta es OK antes de intentar leer el JSON
        if (!res.ok) throw new Error("Error en el servidor");
        return res.json();
      })
      .then(data => {
        // Nos aseguramos de que data sea un array antes de guardarlo
        // Esto previene errores al hacer .map() más adelante
        setLeaders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        // En caso de error, registramos en consola y dejamos lista vacía
        console.error("Error cargando ranking:", err);
        setLeaders([]); // Previene que .map() explote si hay error
        setLoading(false);
      });
  }, []);

  return (
    <div className="ranking-container">
      {/* BOTÓN VOLVER */}
      <button className="btn-back" onClick={onBack}>← Volver al Menú</button>
      
      {/* ENCABEZADO CON TÍTULO */}
      <div style={{textAlign: 'center', marginBottom: '30px'}}>
        <h2 style={{fontSize: '2rem'}}>🏆 Líderes Ambientales</h2>
        <p style={{color: '#7f8c8d'}}>Las personas que más CO2 han evitado este mes</p>
      </div>

      {/* ESTADO DE CARGA */}
      {loading ? (
        <p style={{textAlign: 'center'}}>Cargando líderes...</p>
      ) : (
        /* TABLA DE RANKING */
        <table className="ranking-table">
          {/* ENCABEZADOS */}
          <thead>
            <tr>
              <th>Puesto</th>
              <th>Persona</th>
              <th>CO2 Evitado</th>
              <th>Puntos</th>
            </tr>
          </thead>
          
          {/* FILAS DE DATOS */}
          <tbody>
            {leaders.map((player, index) => (
              <tr 
                key={player.id || index} 
                // Destaca filas del top 3 con estilos especiales
                className={index < 3 ? 'top-player' : ''}
              >
                {/* COLUMNA 1: Número de puesto con medallas para top 3 */}
                <td className="rank-number">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                </td>
                
                {/* COLUMNA 2: Nombre del usuario */}
                <td style={{fontWeight: '600'}}>{player.nombre}</td>
                
                {/* COLUMNA 3: CO2 evitado en kg (con conversión segura a número) */}
                <td className="co2-highlight" style={{fontWeight: 'bold'}}>
                  {/* Convertimos a Number antes de usar toFixed para evitar errores de tipo */}
                  {Number(player.co2_evitado || 0).toFixed(2)} kg
                </td>
                
                {/* COLUMNA 4: Puntos totales */}
                <td>{player.puntos || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* MENSAJE CUANDO NO HAY DATOS */}
      {!loading && leaders.length === 0 && (
        <p style={{textAlign: 'center', marginTop: '20px'}}>
          ¡Aún no hay datos! Sé el primero en liderar.
        </p>
      )}
    </div>
  );
};

export default Ranking;