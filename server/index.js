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

/**
 * Prueba inicial de conexión a la base de datos PostgreSQL
 */
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error("❌ Error conectando a la DB Postgres:", err.stack);
  else console.log("✅ Base de datos PostgreSQL conectada");
});

/**
 * RUTA 1: Obtener residuos aleatorios
 * Cada solicitud devuelve 10 residuos diferentes (ORDER BY RANDOM())
 */
app.get('/api/residuos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM residuos ORDER BY RANDOM() LIMIT 10');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al cargar residuos" });
  }
});

/**
 * RUTA 2: AUTENTICACIÓN - Registro de nuevo usuario
 */
app.post('/api/auth/register', async (req, res) => {
  const { nombre, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email, password, puntos, co2_evitado) VALUES ($1, $2, $3, 0, 0) RETURNING id, nombre, email',
      [nombre, email, hashedPassword]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: "El email ya existe." });
  }
});

/**
 * RUTA 3: AUTENTICACIÓN - Inicio de sesión
 */
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (user.rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });

    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) return res.status(401).json({ error: "Credenciales inválidas" });

    const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '24h' });
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
    res.status(500).json({ error: "Error en el servidor" });
  }
});

/**
 * RUTA 4: Obtener estadísticas del usuario para hoy
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
      puntos_totales: parseInt(stats.rows[0].puntos_totales) || 0,
      co2_total: parseFloat(stats.rows[0].co2_total) || 0,
      count_hoy: parseInt(stats.rows[0].count_hoy) || 0
    });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

/**
 * RUTA 5: Registrar progreso del usuario (Persistencia Híbrida)
 * Guarda el intento en PostgreSQL (Historial oficial)
 * Y genera un log detallado en MongoDB Atlas para analíticas de Big Data
 */
app.put('/api/usuarios/:id/progreso', async (req, res) => {
  const { id } = req.params;
  const { puntos, co2_evitado, residuo_id, fue_acierto } = req.body; 
  
  try {
    // 1. Persistencia Relacional (PostgreSQL)s
    await pool.query(
      'INSERT INTO historial (usuario_id, residuo_id, acierto, fecha) VALUES ($1, $2, $3, NOW())', 
      [id, residuo_id, fue_acierto]
    );

    await pool.query(
      'UPDATE usuarios SET puntos = $1, co2_evitado = $2 WHERE id = $3', 
      [puntos, co2_evitado, id]
    );

    // 2. Persistencia NoSQL (MongoDB)
    // No usamos 'await' aquí para que la respuesta al usuario sea más rápida
    new LogPartida({
      usuario_id: id,
      residuo_id: residuo_id,
      es_correcto: fue_acierto,
      puntos_obtenidos: fue_acierto ? 10 : 0
    }).save().catch(err => console.error("Error guardando log en Mongo:", err));

    res.json({ success: true });
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: "Error al guardar progreso" }); 
  }
});

/**
 * RUTA 6: Obtener ranking global
 */
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));