import React from 'react';

/**
 * Componente WasteItem (Objeto Residual Arrastrable)
 * Representa un objeto que el usuario debe clasificar
 * Soporta drag&drop y muestra la imagen o emoji del residuo
 * 
 * @param {Object} item - Objeto residual con estructura:
 *                       { id, nombre, tipo, icono, imagen_url, consejo, pista }
 *                       - id: identificador único
 *                       - nombre: nombre del residuo (ej: "Botella de plástico")
 *                       - tipo: tipo de contenedor correcto ('yellow', 'blue', 'green', 'grey', 'special')
 *                       - icono: emoji de fallback
 *                       - imagen_url: ruta local a la imagen del residuo
 *                       - consejo: mensaje de feedback positivo
 *                       - pista: pista si el usuario falla
 * @param {Function} onDragStart - Callback opcional ejecutado al iniciar el drag
 */
const WasteItem = ({ item, onDragStart }) => {
  /**
   * Maneja el inicio del arrastre del objeto
   * Guarda el tipo en dataTransfer para que el Bin pueda validar si es correcto
   * Ejecuta callback opcional si se proporciona
   * 
   * @param {DragEvent} e - Evento de drag
   */
  const handleDrag = (e) => {
    // Guardamos el tipo para que el Bin sepa si es correcto al soltar
    e.dataTransfer.setData("itemType", item.tipo); 
    if (onDragStart) onDragStart(e, item);
  };

  return (
    <div 
      className="waste-item pulse" 
      draggable // Habilita drag&drop nativo del navegador
      onDragStart={handleDrag}
      style={{ cursor: 'grab', textAlign: 'center' }}
    >
      {/* CONTENEDOR VISUAL DEL OBJETO */}
      <div className="waste-item-visual" style={{ marginBottom: '10px' }}>
        {/* 
          PRIORIDAD 1: Imagen local de la base de datos
          - Muestra la imagen si existe en imagen_url
          - Si falla la carga, oculta la imagen y muestra el emoji
        */}
        {item.imagen_url ? (
          <img 
            src={item.imagen_url} 
            alt={item.nombre} 
            style={{ 
              width: '120px', 
              height: '120px', 
              objectFit: 'contain',
              display: 'block',
              margin: '0 auto' 
            }}
            // Maneja errores de carga: si la imagen no existe, mostramos el emoji
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
        ) : null}

        {/* 
          PRIORIDAD 2 / RESPALDO: Emoji
          - Se muestra si no hay imagen_url configurada
          - Se muestra si la imagen falla al cargar (onError)
          - Proporciona fallback visual siempre disponible
        */}
        <span 
          className="emoji-fallback"
          style={{ 
            fontSize: '5rem', 
            display: item.imagen_url ? 'none' : 'block' 
          }}
        >
          {item.icono || '📦'} 
        </span>
      </div>

      {/* NOMBRE DEL RESIDUO */}
      <strong style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>
        {item.nombre}
      </strong>
    </div>
  );
};

export default WasteItem;