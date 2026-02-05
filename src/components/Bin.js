import React, { useState } from 'react';

/**
 * Componente Bin (Contenedor de Reciclaje)
 * Representa un contenedor donde el usuario puede soltar objetos residuales
 * Valida si el objeto soltado corresponde al tipo de contenedor
 * 
 * @param {string} type - Tipo de contenedor: 'yellow', 'blue', 'green', 'grey', 'special'
 * @param {string} label - Etiqueta visible: 'Plásticos', 'Papel', 'Vidrio', 'Orgánico', 'Peligrosos'
 * @param {Function} onDropCorrect - Callback ejecutado al soltar un objeto
 *                                   recibe boolean: true si es correcto, false si es incorrecto
 */
const Bin = ({ type, label, onDropCorrect }) => {
  // --- ESTADO ---
  const [isOver, setIsOver] = useState(false); // Indica si un objeto está siendo arrastrado sobre este contenedor

  /**
   * Maneja el evento dragover
   * Permite que el elemento reciba objetos en drag&drop
   * Activa el estado visual "isOver"
   */
  const handleDragOver = (e) => {
    e.preventDefault(); // Permite el drop
    setIsOver(true); // Activa estilo visual
  };

  /**
   * Maneja cuando el objeto arrastrado sale del contenedor
   * Desactiva el estado visual
   */
  const handleDragLeave = () => {
    setIsOver(false);
  };

  /**
   * Maneja el drop del objeto
   * Obtiene el tipo del objeto arrastrado y lo compara con el tipo del contenedor
   * Ejecuta el callback con true si coinciden, false si no
   * 
   * @param {DragEvent} e - Evento de drag
   */
  const handleDrop = (e) => {
    e.preventDefault();
    setIsOver(false);
    // Obtiene el tipo de residuo almacenado durante el drag
    const droppedType = e.dataTransfer.getData("itemType");
    // Valida si el tipo coincide con el contenedor
    onDropCorrect(droppedType === type);
  };

  return (
    <div className="bin-wrapper">
      {/* CONTENEDOR VISUAL */}
      <div 
        className={`bin ${type} ${isOver ? 'bin-active' : ''}`} 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* ICONO DEL CONTENEDOR (centrado y dentro) */}
        <img 
          src="/assets/bins/reciclable.png" 
          className="bin-internal-icon" 
          alt="indicador" 
        />
        
        {/* ETIQUETA DEL CONTENEDOR */}
        <span className="bin-label">{label}</span>
      </div>
    </div>
  );
};

export default Bin;