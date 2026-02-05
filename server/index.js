const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
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
 * Prueba inicial de conexión a la base de datos
 */
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error("❌ Error conectando a la DB:", err.stack);
  else console.log("✅ Base de datos conectada");
});

/**
 * RUTA 1: Obtener residuos aleatorios
 * Cada solicitud devuelve 10 residuos diferentes (ORDER BY RANDOM())
 * Esto asegura variedad en cada partida del usuario
 * 
 * GET /api/residuos
 * @returns {Array} Array de 10 objetos residuales con id, nombre, tipo, icono, etc.
 */
app.get('/api/residuos', async (req, res) => {
  try {
    // RANDOM() asegura que cada vez que el usuario juegue, 
    // reciba 10 objetos distintos de tu pool de 30 o más.
    const result = await pool.query('SELECT * FROM residuos ORDER BY RANDOM() LIMIT 10');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al cargar residuos" });
  }
});

/**
 * RUTA 2: AUTENTICACIÓN - Registro de nuevo usuario
 * 
 * POST /api/auth/register
 * @param {string} nombre - Nombre completo del usuario
 * @param {string} email - Email único del usuario
 * @param {string} password - Contraseña (se encripta con bcrypt)
 * @returns {Object} Usuario creado sin la contraseña
 */
app.post('/api/auth/register', async (req, res) => {
  const { nombre, email, password } = req.body;
  try {
    // Encriptamos la contraseña con bcrypt (10 saltos de seguridad)
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
 * Valida credenciales y devuelve un JWT token válido por 24 horas
 * 
 * POST /api/auth/login
 * @param {string} email - Email registrado
 * @param {string} password - Contraseña sin encriptar
 * @returns {Object} { token, user: { id, nombre, puntos, co2_evitado } }
 */
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Buscamos el usuario por email
    const user = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (user.rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });

    // Verificamos que la contraseña coincida (desencriptada)
    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) return res.status(401).json({ error: "Credenciales inválidas" });

    // Generamos JWT token válido por 24 horas
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
 * Calcula puntos totales, CO2 ahorrado y cantidad clasificada hoy
 * 
 * GET /api/usuarios/:id/stats-hoy
 * @param {number} id - ID del usuario
 * @returns {Object} { puntos_totales, co2_total, count_hoy }
 */
app.get('/api/usuarios/:id/stats-hoy', async (req, res) => {
  const { id } = req.params;
  try {
    // Query que obtiene puntos actuales, CO2 total y clasificaciones de hoy
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
 * RUTA 5: Registrar progreso del usuario
 * Guarda el intento en historial y actualiza puntos/CO2 totales
 * Nota: Cada intento cuenta para el límite de 10 clasificaciones diarias
 * 
 * PUT /api/usuarios/:id/progreso
 * @param {number} id - ID del usuario
 * @param {number} puntos - Puntos acumulados a guardar
 * @param {number} co2_evitado - CO2 ahorrado acumulado
 * @param {number} residuo_id - ID del residuo clasificado
 * @param {boolean} fue_acierto - True si fue correcto a la primera, false si falló
 * @returns {Object} { success: true }
 */
app.put('/api/usuarios/:id/progreso', async (req, res) => {
  const { id } = req.params;
  const { puntos, co2_evitado, residuo_id, fue_acierto } = req.body; 
  
  try {
    // Registramos el intento en el historial (siempre cuenta para el límite de 10)
    // fue_acierto debe venir del frontend para diferenciar aciertos de errores
    await pool.query(
      'INSERT INTO historial (usuario_id, residuo_id, acierto, fecha) VALUES ($1, $2, $3, NOW())', 
      [id, residuo_id, fue_acierto]
    );

    // Actualizamos los puntos totales y CO2 ahorrado del usuario
    await pool.query(
      'UPDATE usuarios SET puntos = $1, co2_evitado = $2 WHERE id = $3', 
      [puntos, co2_evitado, id]
    );

    res.json({ success: true });
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: "Error al guardar progreso" }); 
  }
});

/**
 * RUTA 6: Obtener ranking global
 * Devuelve los 10 usuarios con más puntos ordenados descendentemente
 * 
 * GET /api/ranking
 * @returns {Array} Array de usuarios ordenados por puntos (DESC) - máx 10
 */
app.get('/api/ranking', async (req, res) => {
  try {
    // SELECT de usuarios ordenados por puntos en orden descendente
    const result = await pool.query(
      'SELECT nombre, puntos, co2_evitado FROM usuarios ORDER BY puntos DESC LIMIT 10'
    );
    res.json(result.rows);
  } catch (err) { 
    res.status(500).json({ error: "Error cargando ranking" }); 
  }
});

/**
 * Iniciamos el servidor en el puerto especificado por .env o puerto 5000 por defecto
 */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));