// =============================
// IMPORTS
// =============================
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// =============================
// APP CONFIG
// =============================
const app = express();
app.use(cors());
app.use(express.json());

// =============================
// POSTGRESQL CONNECTION
// =============================
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.query('SELECT NOW()', (err) => {
  if (err) console.error("❌ Error conectando a PostgreSQL:", err.stack);
  else console.log("✅ PostgreSQL conectado");
});

// =============================
// MONGODB CONNECTION
// =============================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("🍃 MongoDB Atlas conectado"))
  .catch(err => console.error("❌ Error MongoDB:", err));

// =============================
// MONGOOSE MODEL
// =============================
const LogPartida = mongoose.model('LogPartida', new mongoose.Schema({
  usuario_id: Number,
  residuo_id: Number,
  es_correcto: Boolean,
  puntos_obtenidos: Number,
  fecha: { type: Date, default: Date.now }
}));

// =============================
// 🔐 MIDDLEWARE JWT
// =============================
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido' });
  }
}

// =============================
// RUTAS
// =============================

// RUTA 1: Obtener residuos
app.get('/api/residuos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM residuos ORDER BY RANDOM() LIMIT 10');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al cargar residuos" });
  }
});

// RUTA 2: Registro
app.post('/api/auth/register', async (req, res) => {
  const { nombre, email, password } = req.body;

  try {
    // Encriptar contraseña con bcrypt (10 rondas)
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email, password, puntos, co2_evitado) VALUES ($1,$2,$3,0,0) RETURNING id, nombre, email',
      [nombre, email, hashedPassword]
    );

    res.status(201).json(result.rows[0]);

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

// RUTA 3: Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);

    if (user.rows.length === 0)
      return res.status(404).json({ error: "Usuario no encontrado" });

    // Validar contraseña con bcrypt
    const validPassword = await bcrypt.compare(password, user.rows[0].password);

    if (!validPassword)
      return res.status(401).json({ error: "Credenciales inválidas" });

    const token = jwt.sign(
      { id: user.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
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

// RUTA 4: Stats hoy
app.get('/api/usuarios/:id/stats-hoy', verificarToken, async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
});

// RUTA 5: Actualizar perfil
app.put('/api/usuarios/:id/perfil', verificarToken, async (req, res) => {
  const { id } = req.params;
  const { nombre, email } = req.body;

  if (!nombre || !email)
    return res.status(400).json({ error: 'Nombre y email son obligatorios' });

  try {
    const usuario = await pool.query(
      'UPDATE usuarios SET nombre=$1, email=$2 WHERE id=$3 RETURNING id, nombre, email',
      [nombre, email, id]
    );

    if (usuario.rows.length === 0)
      return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json(usuario.rows[0]);

  } catch (error) {
    res.status(500).json({ error: 'Error actualizando perfil' });
  }
});

// RUTA 6: Eliminar usuario
app.delete('/api/usuarios/:id', verificarToken, async (req, res) => {
  const { id } = req.params;

  try {
    const usuario = await pool.query(
      'DELETE FROM usuarios WHERE id=$1 RETURNING *',
      [id]
    );

    if (usuario.rows.length === 0)
      return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json({ mensaje: 'Usuario eliminado correctamente' });

  } catch (error) {
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
});

// RUTA 7: Progreso
app.put('/api/usuarios/:id/progreso', verificarToken, async (req, res) => {
  const { id } = req.params;
  const { puntos, co2_evitado, residuo_id, fue_acierto } = req.body;

  try {
    await pool.query(
      'INSERT INTO historial (usuario_id, residuo_id, acierto, fecha) VALUES ($1,$2,$3,NOW())',
      [id, residuo_id, fue_acierto]
    );

    // 2. Actualizar puntos y CO2 del usuario
    await pool.query(
      'UPDATE usuarios SET puntos=$1, co2_evitado=$2 WHERE id=$3',
      [puntos, co2_evitado, id]
    );

    new LogPartida({
      usuario_id: id,
      residuo_id,
      es_correcto: fue_acierto,
      puntos_obtenidos: fue_acierto ? 10 : 0
    }).save().catch(err => console.error(err));

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: "Error al guardar progreso" });
  }
});

// RUTA 8: Ranking
app.get('/api/ranking', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT nombre, puntos, co2_evitado FROM usuarios ORDER BY puntos DESC LIMIT 10'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error cargando ranking" });
  }
});

// =============================
// SERVER
// =============================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
