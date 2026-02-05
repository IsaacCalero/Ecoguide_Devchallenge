import React, { useState, useEffect, useCallback } from 'react';
import Auth from './components/Auth';
import WasteItem from './components/WasteItem';
import Bin from './components/Bin';
import LandingPage from './components/LandingPage';
import Ranking from './components/Ranking';
import './App.css';

/**
 * Componente principal de la aplicación
 * Maneja la lógica del juego de clasificación de residuos,
 * autenticación de usuarios y gestión de puntuaciones
 */
function App() {
  // --- ESTADO DE USUARIO Y VISTAS ---
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [view, setView] = useState('landing'); // 'landing', 'auth', 'game', 'ranking'
  
  // --- ESTADO DEL JUEGO ---
  const [wasteData, setWasteData] = useState([]); // Array de objetos residuales
  const [currentIndex, setCurrentIndex] = useState(0); // Índice del objeto actual
  
  // --- ESTADÍSTICAS DEL USUARIO ---
  const [points, setPoints] = useState(0); // Puntos totales
  const [co2Saved, setCo2Saved] = useState(0); // CO2 evitado en kg
  const [dailyCount, setDailyCount] = useState(0); // Cantidad clasificada hoy (máx 10)
  
  // --- FEEDBACK E INTERACCIÓN ---
  const [feedback, setFeedback] = useState({ text: "", color: "#333" }); // Mensaje de respuesta
  const [showContinue, setShowContinue] = useState(false); // Mostrar botón continuar
  const [hasError, setHasError] = useState(false); // Indicador de error previo

  /**
   * Carga las estadísticas del usuario desde la base de datos
   * @param {number} userId - ID del usuario
   */
  const loadUserStats = useCallback((userId) => {
    if (!userId) return;
    fetch(`http://localhost:5000/api/usuarios/${userId}/stats-hoy`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setPoints(data.puntos_totales || 0);
        setCo2Saved(Number(data.co2_total) || 0);
        setDailyCount(Number(data.count_hoy) || 0);
      })
      .catch(err => console.error("Error al sincronizar stats:", err));
  }, []);

  /**
   * Efecto inicial: Carga residuos y estadísticas del usuario
   */
  useEffect(() => {
    fetch('http://localhost:5000/api/residuos')
      .then(res => res.json())
      .then(data => { 
        setWasteData(data); 
      })
      .catch(err => console.error("Error cargando residuos:", err));

    if (user && user.id) {
      loadUserStats(user.id);
    }
  }, [user, loadUserStats]);

  /**
   * Maneja el resultado cuando el usuario suelta un objeto en un contenedor
   * Valida si es correcto y actualiza puntos/CO2
   * @param {boolean} isCorrect - True si el contenedor es correcto
   */
  const onDropResult = async (isCorrect) => {
    // Evita procesar si ya está esperando confirmación o juego terminado
    if (showContinue || dailyCount >= 10) return;

    if (isCorrect === true) {
      // Si falló antes, registra el acierto sin puntos
      if (hasError) {
        try {
          await fetch(`http://localhost:5000/api/usuarios/${user.id}/progreso`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              puntos: points,
              co2_evitado: co2Saved, 
              residuo_id: wasteData[currentIndex].id 
            }),
          });
          setDailyCount(prev => prev + 1);
          setFeedback({ 
            text: "✅ ¡Correcto! Pero 0 puntos por haber fallado anteriormente.", 
            color: "#f1c40f" 
          });
          setShowContinue(true); 
          return;
        } catch (e) { console.error(e); }
      }

      // Acierto a la primera: suma 10 puntos y 0.05kg CO2
      const newPoints = points + 10;
      const newCo2 = co2Saved + 0.05;

      try {
        const response = await fetch(`http://localhost:5000/api/usuarios/${user.id}/progreso`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            puntos: newPoints, 
            co2_evitado: newCo2, 
            residuo_id: wasteData[currentIndex].id 
          }),
        });

        if (response.ok) {
          // Actualiza estado local y localStorage
          setPoints(newPoints);
          setCo2Saved(newCo2);
          setDailyCount(prev => prev + 1);
          const updatedUser = { ...user, puntos: newPoints, co2_evitado: newCo2 };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setFeedback({ 
            text: `✨ ¡Excelente! ${wasteData[currentIndex].consejo}`, 
            color: "#2ecc71" 
          });
          setShowContinue(true);
        }
      } catch (err) { console.error("Error al guardar:", err); }
    } else {
      // Respuesta incorrecta: muestra pista sin restar puntos
      setHasError(true);
      setFeedback({ 
        text: `❌ ¡Ese no es! Pista: ${wasteData[currentIndex].pista}`, 
        color: "#e74c3c" 
      });
    }
  };

  /**
   * Avanza al siguiente objeto cuando el usuario hace click en Continuar
   */
  const handleNext = () => {
    setShowContinue(false);
    setHasError(false); 
    if (currentIndex < wasteData.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setFeedback({ text: "Clasifica el siguiente objeto", color: "#333" });
    } else {
      setCurrentIndex(0); 
    }
  };

  /**
   * Cierra la sesión del usuario
   */
  const logout = () => {
    localStorage.clear();
    setUser(null);
    setPoints(0);
    setCo2Saved(0);
    setDailyCount(0);
    setView('landing');
  };

  // --- RENDERIZADO CONDICIONAL POR VISTA ---
  if (view === 'ranking') return <Ranking onBack={() => setView('landing')} />;
  
  if (view === 'auth') {
    return (
      <Auth onLogin={(userData) => { setUser(userData); setView('landing'); }} />
    );
  }

  // VISTA DE JUEGO
  if (view === 'game' && user) {
    return (
      <div className="app-container">
        {/* ENCABEZADO CON ESTADÍSTICAS */}
        <header className="main-header">
          <div className="header-left">
            <div className="logo-container" onClick={() => setView('landing')} style={{ cursor: 'pointer' }}>
               <img src="/logo.png" alt="EcoGuide Logo" className="nav-logo-img" />
            </div>
            <div className="stats-bar">
              <div className="stat-item"><span>Puntos</span><strong>{points}</strong></div>
              <div className="stat-item"><span>CO2</span><strong className="co2-highlight">{co2Saved.toFixed(2)}kg</strong></div>
              <div className="stat-item"><span>Hoy</span><strong>{dailyCount}/10</strong></div>
            </div>
          </div>

          <div className="user-nav">
            <button className="btn-secondary" onClick={() => setView('landing')}>Volver al Menú</button>
            <button className="btn-logout" onClick={logout}>Cerrar Sesión</button>
          </div>
        </header>

        {/* ÁREA PRINCIPAL DEL JUEGO */}
        <main className="game-area">
          {/* Feedback solo visible mientras juega (< 10 clasificaciones) */}
          {dailyCount < 10 && (
            <div className="feedback-hub" style={{ borderLeft: `8px solid ${feedback.color}` }}>
              <span>{feedback.text}</span>
              {showContinue && <button className="btn-next" onClick={handleNext}>Continuar →</button>}
            </div>
          )}

          {/* JUEGO EN CURSO */}
          {dailyCount < 10 ? (
            <>
              <div className="waste-display">
                {!showContinue && wasteData[currentIndex] && (
                  <WasteItem 
                    item={wasteData[currentIndex]} 
                    onDragStart={(e, item) => e.dataTransfer.setData("itemType", item.tipo)} 
                  />
                )}
              </div>
              <div className="bins-layout">
                <Bin type="yellow" label="Plásticos" onDropCorrect={onDropResult} />
                <Bin type="blue" label="Papel" onDropCorrect={onDropResult} />
                <Bin type="green" label="Vidrio" onDropCorrect={onDropResult} />
                <Bin type="grey" label="Orgánico" onDropCorrect={onDropResult} />
                <Bin type="special" label="Peligrosos" onDropCorrect={onDropResult} />
              </div>
            </>
          ) : (
            /* PANTALLA DE FINALIZACIÓN */
            <div className="limit-message">
              <h2>🎉 ¡Misión cumplida por hoy!</h2>
              <p>Has clasificado tus 10 residuos diarios.</p>
              <button className="btn-main" onClick={() => setView('landing')}>Ver mi impacto global</button>
            </div>
          )}
        </main>
      </div>
    );
  }

  // VISTA LANDING (por defecto)
  return (
    <LandingPage 
      user={user} 
      points={points} 
      co2Saved={co2Saved} 
      onStartGame={() => setView('game')} 
      onLoginClick={() => setView('auth')} 
      onLogout={logout} 
      onShowRanking={() => setView('ranking')}
    />
  );
}

export default App;