import React from 'react';

const LandingPage = ({ user, onStartGame, onLoginClick, onLogout, onShowRanking, co2Saved }) => {
  
  const guideItems = [
    {
      id: 1,
      type: 'yellow',
      title: 'Plásticos y Latas',
      icon: '🟡',
      desc: 'Botellas, envases de comida y latas de refresco. El plástico tarda 500 años en degradarse.'
    },
    {
      id: 2,
      type: 'blue',
      title: 'Papel y Cartón',
      icon: '🔵',
      desc: 'Cajas, revistas y hojas. Reciclar una tonelada de papel salva 17 árboles.'
    },
    {
      id: 3,
      type: 'green',
      title: 'Vidrio',
      icon: '🟢',
      desc: 'Botellas de vino, frascos de mermelada. El vidrio es 100% reciclable infinitas veces.'
    },
    {
      id: 4,
      type: 'grey',
      title: 'Orgánico',
      icon: '⚪',
      desc: 'Restos de fruta, verdura y café. Se transforman en abono para nuevas plantas.'
    },
    {
      id: 5,
      type: 'special',
      title: 'Peligrosos',
      icon: '⚫',
      desc: 'Pilas, aceites y medicinas. Requieren un tratamiento especial para no contaminar el agua.'
    }
  ];

  return (
    <div className="landing-container">
      {/* NAVEGACIÓN CON LOGO E IMAGEN */}
      <nav className="landing-nav">
        <a href="/" className="logo-container">
          <img 
            src="/logo.png" 
            alt="EcoGuide Logo" 
            className="nav-logo-img" 
          />
        </a>
        
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {user ? (
            /* ORDEN: Saludo -> Ranking -> Salir */
            <>
              <span className="welcome-msg" style={{ fontWeight: '600' }}>
                Hola, <strong>{user.nombre}</strong> 
              </span>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-secondary" onClick={onShowRanking}>
                  Ranking
                </button>
                <button className="btn-logout" onClick={onLogout}>
                  Cerrar Sesión
                </button>
              </div>
            </>
          ) : (
            /* Si no hay usuario */
            <>
              <button className="btn-secondary" onClick={onShowRanking}>Ranking</button>
              <button className="btn-main" onClick={onLoginClick}>Inicia Sesión</button>
            </>
          )}
        </div>
      </nav>

      {/* SECCIÓN HERO */}
      <header className="hero-section">
        <h1>Clasifica, Aprende y <span className="highlight">Ayuda al Medioambiente</span></h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', margin: '20px 0 30px' }}>
          Pon a prueba tus conocimientos con otras personas y descubre cuánto CO2 puedes evitar reciclando correctamente.
        </p>
        
        {user ? (
          <button className="btn-main pulse" style={{ padding: '20px 40px', fontSize: '1.1rem' }} onClick={onStartGame}>
            ¡ Juega y Aprende ahora !
          </button>
        ) : (
          <button className="btn-main pulse" style={{ padding: '20px 40px', fontSize: '1.1rem' }} onClick={onLoginClick}>
            ¡ Juega y Aprende ahora !
          </button>
        )}
      </header>

      {/* TARJETAS DE IMPACTO */}
      {user && (
        <section style={{ marginBottom: '60px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Tu Progreso: </h2>
          <div className="info-grid">
            <div className="info-card green" style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>CO2 Evitado</span>
              <span style={{ fontSize: '3rem', fontWeight: '800', display: 'block', color: 'var(--green-bin)' }}>
                {Number(co2Saved || 0).toFixed(2)}kg
              </span>
              <p>Has evitado que este carbono llegue a la atmósfera.</p>
            </div>
            <div className="info-card blue" style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Puntos Totales</span>
              <span style={{ fontSize: '3rem', fontWeight: '800', display: 'block', color: 'var(--blue-bin)' }}>
                {user.puntos || 0}
              </span>
              <p>Sigue clasificando para subir en el ranking.</p>
            </div>
          </div>
        </section>
      )}

      {/* GUÍA MAESTRA */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h2>¿En qué contenedor va cada residuo?</h2>
        </div>
        
        <div className="info-grid">
          {guideItems.map((item) => (
            <div key={item.id} className={`info-card ${item.type}`}>
              <h3>{item.icon} {item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ marginTop: '80px', padding: '40px 0', borderTop: '1px solid #1e293b', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>© 2026 EcoGuide - Educando para un futuro sostenible.</p>
      </footer>
    </div>
  );
};

export default LandingPage;