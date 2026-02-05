import React from 'react';

/**
 * Componente GameHistory (Historial de Juego)
 * Muestra una tabla con el registro de todos los objetos clasificados por el usuario
 * Indica si cada clasificación fue correcta o incorrecta
 * Incluye fecha y emoji del objeto para mejor identificación visual
 * 
 * @param {Array} history - Array de objetos con estructura:
 *                         { objeto, icono, acierto, fecha }
 *                         - objeto: nombre del residuo clasificado
 *                         - icono: emoji representativo
 *                         - acierto: boolean (true si fue correcto)
 *                         - fecha: string ISO con timestamp
 */
const GameHistory = ({ history }) => {
  return (
    <div className="history-section">
      {/* TÍTULO */}
      <h3>Tu Historial Reciente</h3>
      
      {/* CONTENEDOR DE TABLA */}
      <div className="history-table-container">
        {/* CASO VACÍO: Sin clasificaciones aún */}
        {history.length === 0 ? (
          <p className="no-data">Aún no has clasificado ningún objeto.</p>
        ) : (
          /* TABLA CON HISTORIAL */
          <table className="history-table">
            {/* ENCABEZADOS */}
            <thead>
              <tr>
                <th>Objeto</th>
                <th>Resultado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            
            {/* FILAS DE DATOS */}
            <tbody>
              {history.map((entry, index) => (
                <tr 
                  key={index} 
                  // Clase condicional: verde si acertó, roja si falló
                  className={entry.acierto ? 'row-success' : 'row-fail'}
                >
                  {/* COLUMNA 1: Objeto con icono */}
                  <td>
                    <span className="history-icon">{entry.icono}</span> {entry.objeto}
                  </td>
                  
                  {/* COLUMNA 2: Resultado (Acertaste/Fallaste) */}
                  <td>
                    {entry.acierto ? '✅ Acertaste' : '❌ Fallaste'}
                  </td>
                  
                  {/* COLUMNA 3: Fecha formateada */}
                  <td>
                    {new Date(entry.fecha).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default GameHistory;