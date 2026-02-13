const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

/**
 * Configuración de la conexión a PostgreSQL
 * Las credenciales se cargan desde las variables de entorno (.env)
 */
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

/**
 * Prueba inicial de conexión a la base de datos PostgreSQL
 */
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error("❌ Error conectando a la DB Postgres:", err.stack);
  else console.log("✅ Base de datos PostgreSQL conectada");
});

/**
 * Configuración de la conexión a MongoDB
 * Las credenciales se cargan desde las variables de entorno (.env)
 */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("🍃 MongoDB Atlas conectado con éxito"))
  .catch(err => console.error("❌ Error conectando a MongoDB:", err));

/**
 * Definición del Esquema de Analíticas (MongoDB)
 * Registra cada movimiento para análisis posterior de comportamiento
 */
const LogPartida = mongoose.model('LogPartida', new mongoose.Schema({
  usuario_id: Number,
  residuo_id: Number,
  es_correcto: Boolean,
  puntos_obtenidos: Number,
  fecha: { type: Date, default: Date.now }
}));

// ENDPOINTS DE AUTENTICACIÓN

/**
 * REGISTRO de nuevo usuario
 * POST /api/auth/register
 */
app.post('/api/auth/register', async (req, res) => {
  const { nombre, email, password } = req.body;
  
  try {
    // Encriptar contraseña con bcrypt (10 rondas)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email, password, puntos, co2_evitado) VALUES ($1, $2, $3, 0, 0) RETURNING id, nombre, email',
      [nombre, email, hashedPassword]
    );
    
    res.status(201).json({
      success: true,
      mensaje: 'Usuario registrado exitosamente',
      usuario: result.rows[0]
    });
  } catch (err) {
    console.error('Error en registro:', err);
    
    // Error de email duplicado (constraint UNIQUE)
    if (err.code === '23505') {
      return res.status(400).json({ 
        success: false,
        error: "El email ya está registrado" 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: "Error al registrar usuario" 
    });
  }
});

/**
 * LOGIN de usuario
 * POST /api/auth/login
 */
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Buscar usuario por email
    const user = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1', 
      [email]
    );
    
    if (user.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Usuario no encontrado" 
      });
    }

    // Validar contraseña con bcrypt
    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    
    if (!validPassword) {
      return res.status(401).json({ 
        success: false,
        error: "Credenciales inválidas" 
      });
    }

    // Generar JWT con expiración de 24 horas
    const token = jwt.sign(
      { id: user.rows[0].id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    res.json({ 
      success: true,
      token, 
      user: { 
        id: user.rows[0].id, 
        nombre: user.rows[0].nombre, 
        puntos: user.rows[0].puntos, 
        co2_evitado: user.rows[0].co2_evitado 
      } 
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ 
      success: false,
      error: "Error en el servidor" 
    });
  }
});

// ENDPOINTS DE RESIDUOS

/**
 * OBTENER residuos aleatorios
 * GET /api/residuos
 */
app.get('/api/residuos', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM residuos ORDER BY RANDOM() LIMIT 10'
    );
    
    res.json({
      success: true,
      total: result.rows.length,
      residuos: result.rows
    });
  } catch (err) {
    console.error('Error al obtener residuos:', err);
    res.status(500).json({ 
      success: false,
      error: "Error al cargar residuos" 
    });
  }
});

// ENDPOINTS DE USUARIOS

/**
 * ESTADÍSTICAS del usuario para HOY
 * GET /api/usuarios/:id/stats-hoy
 * Retorna: puntos totales, CO2 total, clasificaciones hoy
 */
app.get('/api/usuarios/:id/stats-hoy', async (req, res) => {
  const { id } = req.params;
  
  try {
    const stats = await pool.query(
      `SELECT 
        (SELECT puntos FROM usuarios WHERE id = $1) as puntos_totales,
        (SELECT co2_evitado FROM usuarios WHERE id = $1) as co2_total,
        (SELECT COUNT(*) FROM historial WHERE usuario_id = $1 AND fecha::date = CURRENT_DATE) as count_hoy`, 
      [id]
    );
    
    res.json({
      success: true,
      puntos_totales: parseInt(stats.rows[0].puntos_totales) || 0,
      co2_total: parseFloat(stats.rows[0].co2_total) || 0,
      count_hoy: parseInt(stats.rows[0].count_hoy) || 0
    });
  } catch (err) { 
    console.error('Error al obtener stats:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    }); 
  }
});

/**
 * REGISTRAR progreso del usuario
 * PUT /api/usuarios/:id/progreso
 * Body: { puntos, co2_evitado, residuo_id, fue_acierto }
 */
app.put('/api/usuarios/:id/progreso', async (req, res) => {
  const { id } = req.params;
  const { puntos, co2_evitado, residuo_id, fue_acierto } = req.body; 
  
  try {
    // 1. Guardar en historial (PostgreSQL)
    await pool.query(
      'INSERT INTO historial (usuario_id, residuo_id, acierto, fecha) VALUES ($1, $2, $3, NOW())', 
      [id, residuo_id, fue_acierto]
    );

    // 2. Actualizar puntos y CO2 del usuario
    await pool.query(
      'UPDATE usuarios SET puntos = $1, co2_evitado = $2 WHERE id = $3', 
      [puntos, co2_evitado, id]
    );

    // 3. Guardar log en MongoDB (Analytics) - sin await para respuesta rápida
    new LogPartida({
      usuario_id: parseInt(id),
      residuo_id: residuo_id,
      es_correcto: fue_acierto,
      puntos_obtenidos: fue_acierto ? 10 : 0
    }).save().catch(err => console.error("Error guardando log en MongoDB:", err));

    res.json({ success: true });
  } catch (err) { 
    console.error('Error al guardar progreso:', err);
    res.status(500).json({ 
      success: false,
      error: "Error al guardar progreso" 
    }); 
  }
});

// ENDPOINT DE RANKING

/**
 * RANKING global TOP 10
 * GET /api/ranking
 * Retorna: Top 10 usuarios ordenados por puntos
 */
app.get('/api/ranking', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT nombre, puntos, co2_evitado FROM usuarios ORDER BY puntos DESC LIMIT 10'
    );
    
    res.json({
      success: true,
      total: result.rows.length,
      ranking: result.rows
    });
  } catch (err) { 
    console.error('Error al obtener ranking:', err);
    res.status(500).json({ 
      success: false,
      error: "Error cargando ranking" 
    }); 
  }
});

// ENDPOINTS DE REPORTES Y VISTAS COMPLEJAS

/**
 * REPORTE: Ranking Detallado
 * GET /api/reportes/ranking-detallado
 * Usa: Vista vw_ranking_detallado
 */
app.get('/api/reportes/ranking-detallado', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vw_ranking_detallado LIMIT 10');
    
    res.json({
      success: true,
      total: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error('Error al obtener ranking detallado:', err);
    res.status(500).json({ 
      success: false,
      error: 'Error al generar reporte de ranking' 
    });
  }
});

/**
 * REPORTE: Análisis de Residuos
 * GET /api/reportes/analisis-residuos
 * Query params: ?nivel_dificultad=DIFÍCIL (opcional)
 * Usa: Vista vw_analisis_residuos
 */
app.get('/api/reportes/analisis-residuos', async (req, res) => {
  try {
    const { nivel_dificultad } = req.query;
    
    let query = 'SELECT * FROM vw_analisis_residuos';
    
    // Filtrar por nivel de dificultad si se proporciona
    if (nivel_dificultad) {
      query += ` WHERE nivel_dificultad = $1`;
      const result = await pool.query(query, [nivel_dificultad.toUpperCase()]);
      return res.json({
        success: true,
        filtro: nivel_dificultad,
        total: result.rows.length,
        data: result.rows
      });
    }
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      total: result.rows.length,
      data: result.rows,
      resumen: {
        muy_dificiles: result.rows.filter(r => r.nivel_dificultad === 'MUY DIFÍCIL').length,
        dificiles: result.rows.filter(r => r.nivel_dificultad === 'DIFÍCIL').length,
        moderados: result.rows.filter(r => r.nivel_dificultad === 'MODERADO').length,
        faciles: result.rows.filter(r => r.nivel_dificultad === 'FÁCIL').length
      }
    });
  } catch (err) {
    console.error('Error al obtener análisis de residuos:', err);
    res.status(500).json({ 
      success: false,
      error: 'Error al generar reporte de residuos' 
    });
  }
});

/**
 * REPORTE: Tendencias por Tipo de Contenedor
 * GET /api/reportes/tendencias-tipo
 * Usa: Vista vw_tendencias_por_tipo
 */
app.get('/api/reportes/tendencias-tipo', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vw_tendencias_por_tipo');
    
    res.json({
      success: true,
      total_tipos: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error('Error al obtener tendencias por tipo:', err);
    res.status(500).json({ 
      success: false,
      error: 'Error al generar reporte de tendencias' 
    });
  }
});

/**
 * REPORTE: Actividad Diaria
 * GET /api/reportes/actividad-diaria
 * Query params: ?dias=7 (default)
 * Usa: Vista vw_actividad_diaria
 */
app.get('/api/reportes/actividad-diaria', async (req, res) => {
  try {
    const { dias = 7 } = req.query;
    
    const result = await pool.query(
      'SELECT * FROM vw_actividad_diaria LIMIT $1',
      [parseInt(dias)]
    );
    
    // Calcular totales
    const totales = result.rows.reduce((acc, dia) => ({
      total_clasificaciones: acc.total_clasificaciones + parseInt(dia.total_clasificaciones),
      total_aciertos: acc.total_aciertos + parseInt(dia.total_aciertos),
      total_puntos: acc.total_puntos + parseFloat(dia.puntos_generados_dia),
      total_co2: acc.total_co2 + parseFloat(dia.co2_evitado_dia)
    }), {
      total_clasificaciones: 0,
      total_aciertos: 0,
      total_puntos: 0,
      total_co2: 0
    });
    
    res.json({
      success: true,
      periodo: `Últimos ${dias} días`,
      data: result.rows,
      totales: totales
    });
  } catch (err) {
    console.error('Error al obtener actividad diaria:', err);
    res.status(500).json({ 
      success: false,
      error: 'Error al generar reporte de actividad' 
    });
  }
});

/**
 * REPORTE: Dashboard General
 * GET /api/reportes/dashboard
 * Combina múltiples vistas para un overview completo
 */
app.get('/api/reportes/dashboard', async (req, res) => {
  try {
    // Obtener datos de múltiples vistas en paralelo
    const [ranking, analisis, tendencias, actividad] = await Promise.all([
      pool.query('SELECT * FROM vw_ranking_detallado LIMIT 5'),
      pool.query('SELECT * FROM vw_analisis_residuos WHERE nivel_dificultad IN (\'MUY DIFÍCIL\', \'DIFÍCIL\') LIMIT 5'),
      pool.query('SELECT * FROM vw_tendencias_por_tipo'),
      pool.query('SELECT * FROM vw_actividad_diaria LIMIT 7')
    ]);
    
    // Estadísticas generales del sistema
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM usuarios) as total_usuarios,
        (SELECT COUNT(*) FROM residuos) as total_residuos,
        (SELECT COUNT(*) FROM historial) as total_clasificaciones,
        (SELECT SUM(puntos) FROM usuarios) as puntos_totales_sistema,
        (SELECT SUM(co2_evitado) FROM usuarios) as co2_total_evitado,
        (SELECT COUNT(*) FROM historial WHERE fecha::date = CURRENT_DATE) as clasificaciones_hoy
    `);
    
    res.json({
      success: true,
      timestamp: new Date(),
      estadisticas_generales: stats.rows[0],
      top_5_usuarios: ranking.rows,
      residuos_dificiles: analisis.rows,
      tendencias_por_tipo: tendencias.rows,
      actividad_ultimos_7_dias: actividad.rows
    });
  } catch (err) {
    console.error('Error al generar dashboard:', err);
    res.status(500).json({ 
      success: false,
      error: 'Error al generar dashboard' 
    });
  }
});

// ENDPOINTS DE STORED PROCEDURES

/**
 * REGISTRAR clasificación usando Stored Procedure
 * POST /api/clasificacion/registrar
 * Body: { usuario_id, residuo_id, fue_acierto }
 * Usa: sp_registrar_clasificacion()
 */
app.post('/api/clasificacion/registrar', async (req, res) => {
  const { usuario_id, residuo_id, fue_acierto } = req.body;
  
  // Validaciones básicas
  if (!usuario_id || !residuo_id || fue_acierto === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Faltan parámetros: usuario_id, residuo_id, fue_acierto'
    });
  }
  
  try {
    const result = await pool.query(
      'SELECT * FROM sp_registrar_clasificacion($1, $2, $3)',
      [usuario_id, residuo_id, fue_acierto]
    );
    
    const response = result.rows[0];
    
    if (response.exito) {
      // Guardar también en MongoDB para analytics
      new LogPartida({
        usuario_id: parseInt(usuario_id),
        residuo_id: residuo_id,
        es_correcto: fue_acierto,
        puntos_obtenidos: fue_acierto ? 10 : 0
      }).save().catch(err => console.error("Error guardando log en MongoDB:", err));
      
      res.json({
        success: true,
        mensaje: response.mensaje,
        datos: {
          puntos: response.nuevos_puntos,
          co2_evitado: response.nuevo_co2,
          clasificaciones_hoy: response.clasificaciones_hoy
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: response.mensaje
      });
    }
    
  } catch (err) {
    console.error('Error al registrar clasificación:', err);
    res.status(500).json({ 
      success: false,
      error: 'Error al registrar clasificación' 
    });
  }
});

/**
 * RANKING actualizado usando Stored Procedure
 * GET /api/ranking/actualizado
 * Usa: sp_actualizar_ranking()
 */
app.get('/api/ranking/actualizado', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sp_actualizar_ranking()');
    
    res.json({
      success: true,
      timestamp: new Date(),
      total: result.rows.length,
      ranking: result.rows
    });
  } catch (err) {
    console.error('Error al actualizar ranking:', err);
    res.status(500).json({ 
      success: false,
      error: 'Error al actualizar ranking' 
    });
  }
});

// ENDPOINTS DE AUDITORÍA

/**
 * AUDITORÍA de un usuario específico
 * GET /api/auditoria/usuario/:id
 * Query params: ?limit=50&tipo_operacion=UPDATE
 */
app.get('/api/auditoria/usuario/:id', async (req, res) => {
  const { id } = req.params;
  const { limit = 50, tipo_operacion } = req.query;
  
  try {
    let query = `
      SELECT 
        id,
        usuario_id,
        fecha,
        tipo_operacion,
        tabla_afectada,
        detalles,
        ip_address
      FROM audit_log 
      WHERE usuario_id = $1
    `;
    
    const params = [id];
    
    // Filtrar por tipo de operación si se proporciona
    if (tipo_operacion) {
      query += ` AND tipo_operacion = $2`;
      params.push(tipo_operacion.toUpperCase());
    }
    
    query += ` ORDER BY fecha DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      usuario_id: id,
      total_registros: result.rows.length,
      limite: parseInt(limit),
      data: result.rows
    });
  } catch (err) {
    console.error('Error al obtener auditoría:', err);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener auditoría del usuario' 
    });
  }
});

/**
 * AUDITORÍA general del sistema (con paginación y filtros)
 * GET /api/auditoria/general
 * Query params: ?page=1&limit=50&tipo_operacion=UPDATE&tabla_afectada=usuarios
 */
app.get('/api/auditoria/general', async (req, res) => {
  const { 
    page = 1, 
    limit = 50, 
    tipo_operacion,
    tabla_afectada,
    fecha_desde,
    fecha_hasta
  } = req.query;
  
  try {
    let query = `
      SELECT 
        id,
        usuario_id,
        fecha,
        tipo_operacion,
        tabla_afectada,
        detalles,
        ip_address
      FROM audit_log 
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    // Aplicar filtros opcionales
    if (tipo_operacion) {
      query += ` AND tipo_operacion = $${paramIndex}`;
      params.push(tipo_operacion.toUpperCase());
      paramIndex++;
    }
    
    if (tabla_afectada) {
      query += ` AND tabla_afectada = $${paramIndex}`;
      params.push(tabla_afectada);
      paramIndex++;
    }
    
    if (fecha_desde) {
      query += ` AND fecha >= $${paramIndex}`;
      params.push(fecha_desde);
      paramIndex++;
    }
    
    if (fecha_hasta) {
      query += ` AND fecha <= $${paramIndex}`;
      params.push(fecha_hasta);
      paramIndex++;
    }
    
    // Contar total de registros (antes de aplicar paginación)
    let countQuery = 'SELECT COUNT(*) as total FROM audit_log WHERE 1=1';
    const countParams = [...params];
    
    let countIndex = 1;
    if (tipo_operacion) {
      countQuery += ` AND tipo_operacion = $${countIndex}`;
      countIndex++;
    }
    if (tabla_afectada) {
      countQuery += ` AND tabla_afectada = $${countIndex}`;
      countIndex++;
    }
    if (fecha_desde) {
      countQuery += ` AND fecha >= $${countIndex}`;
      countIndex++;
    }
    if (fecha_hasta) {
      countQuery += ` AND fecha <= $${countIndex}`;
      countIndex++;
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const totalRegistros = parseInt(countResult.rows[0].total);
    const totalPaginas = Math.ceil(totalRegistros / parseInt(limit));
    
    // Aplicar paginación
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` ORDER BY fecha DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      paginacion: {
        pagina_actual: parseInt(page),
        limite: parseInt(limit),
        total_registros: totalRegistros,
        total_paginas: totalPaginas
      },
      filtros_aplicados: {
        tipo_operacion: tipo_operacion || 'todos',
        tabla_afectada: tabla_afectada || 'todas',
        fecha_desde: fecha_desde || 'sin límite',
        fecha_hasta: fecha_hasta || 'sin límite'
      },
      data: result.rows
    });
  } catch (err) {
    console.error('Error al obtener auditoría general:', err);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener auditoría general' 
    });
  }
});

/**
 * ESTADÍSTICAS de auditoría
 * GET /api/auditoria/estadisticas
 */
app.get('/api/auditoria/estadisticas', async (req, res) => {
  try {
    const estadisticas = await pool.query(`
      SELECT 
        tipo_operacion,
        tabla_afectada,
        COUNT(*) as total,
        MAX(fecha) as ultima_operacion
      FROM audit_log
      GROUP BY tipo_operacion, tabla_afectada
      ORDER BY total DESC
    `);
    
    const totales = await pool.query(`
      SELECT 
        COUNT(*) as total_operaciones,
        COUNT(DISTINCT usuario_id) as usuarios_auditados,
        MIN(fecha) as primera_operacion,
        MAX(fecha) as ultima_operacion
      FROM audit_log
    `);
    
    const ultimas24h = await pool.query(`
      SELECT 
        tipo_operacion,
        COUNT(*) as total
      FROM audit_log
      WHERE fecha >= NOW() - INTERVAL '24 hours'
      GROUP BY tipo_operacion
    `);
    
    res.json({
      success: true,
      totales: totales.rows[0],
      por_operacion_y_tabla: estadisticas.rows,
      ultimas_24_horas: ultimas24h.rows
    });
  } catch (err) {
    console.error('Error al obtener estadísticas de auditoría:', err);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener estadísticas' 
    });
  }
});

// ENDPOINT DE SALUD DEL SERVIDOR

/**
 * HEALTH CHECK
 * GET /api/health
 */
app.get('/api/health', async (req, res) => {
  try {
    // Verificar PostgreSQL
    const pgResult = await pool.query('SELECT NOW()');
    
    // Verificar MongoDB
    const mongoStatus = mongoose.connection.readyState === 1 ? 'conectado' : 'desconectado';
    
    res.json({
      success: true,
      status: 'ok',
      timestamp: new Date(),
      databases: {
        postgresql: {
          status: 'conectado',
          timestamp: pgResult.rows[0].now
        },
        mongodb: {
          status: mongoStatus
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      status: 'error',
      error: err.message
    });
  }
});

// MANEJO DE RUTAS NO ENCONTRADAS

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    ruta_solicitada: req.originalUrl,
    metodo: req.method
  });
});

// INICIAR SERVIDOR

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 SERVIDOR ECOGUIDE INICIADO');
  console.log('='.repeat(60));
  console.log(`📍 Puerto: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
  console.log('='.repeat(60) + '\n');
});