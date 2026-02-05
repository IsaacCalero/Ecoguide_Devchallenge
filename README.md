# EcoGuide - Plataforma Educativa de Reciclaje

EcoGuide es una aplicación web interactiva que enseña a los usuarios a clasificar correctamente los residuos mediante un sistema gamificado. Los usuarios compiten en un ranking y acumulan puntos mientras aprenden sobre sostenibilidad ambiental.

## Descripción General

La aplicación se divide en dos partes:
- **Frontend**: React con drag&drop interactivo y UI moderna
- **Backend**: Express + PostgreSQL para gestión de usuarios y datos

El sistema permite a los usuarios:
- Registrarse e iniciar sesión con autenticación JWT
- Clasificar 10 residuos diarios en contenedores correctos
- Acumular puntos y CO2 ahorrado
- Competir en un ranking global
- Recibir retroalimentación inmediata y consejos educativos

---

## Guía de Instalación

### Requisitos Previos

- **Node.js** (v14 o superior)
- **PostgreSQL** (v12 o superior)
- **npm** o **yarn**

### Paso 1: Clonar o Descargar el Proyecto

```bash
cd c:\Users\Usuario\ecoguide
```

### Paso 2: Configurar la Base de Datos

1. **Crear la base de datos en PostgreSQL:**

```sql
CREATE DATABASE Ecoguide;
```

2. **Conectarse a la base de datos y crear las tablas:**

```sql
-- Tabla de usuarios
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  puntos INTEGER DEFAULT 0,
  co2_evitado DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de residuos disponibles
CREATE TABLE residuos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) NOT NULL, -- 'yellow', 'blue', 'green', 'grey', 'special'
  icono VARCHAR(10),
  imagen_url VARCHAR(255),
  consejo TEXT,
  pista TEXT
);

-- Tabla de historial de clasificaciones
CREATE TABLE historial (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  residuo_id INTEGER NOT NULL REFERENCES residuos(id),
  acierto BOOLEAN DEFAULT FALSE,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indices para mejor rendimiento
CREATE INDEX idx_historial_usuario_fecha ON historial(usuario_id, fecha);
CREATE INDEX idx_usuarios_email ON usuarios(email);
```

3. **Insertar datos de ejemplo:**

```sql
-- Insertar residuos de ejemplo
INSERT INTO residuos (nombre, tipo, pista, consejo, icono, imagen_url) VALUES 
-- AMARILLO (Plasticos y Metales) - 5 items
('Botella de Agua', 'yellow', 'Plastico transparente PET.', 'Aplastala para que ocupe menos espacio.', '🍼', '/assets/residuos/botella.png'),
('Lata de Refresco', 'yellow', 'Metal ligero de aluminio.', 'El aluminio se recicla infinitas veces.', '🥤', '/assets/residuos/lata.png'),
('Envase de Champu', 'yellow', 'Plastico HDPE denso.', 'Enjuagalo un poco antes de reciclar.', '🧴', '/assets/residuos/shampoo.png'),
('Papel de Aluminio', 'yellow', 'Lamina metalica fina.', 'Si esta muy sucio de grasa, mejor al gris.', '🌯', '/assets/residuos/aluminio.png'),
('Bolsa de Plastico', 'yellow', 'Plastico film flexible.', 'Tarda siglos en degradarse, usa de tela!', '🛍️', '/assets/residuos/bolsa.png'),

-- AZUL (Papel y Carton) - 5 items
('Caja de Pizza', 'blue', 'Carton corrugado.', 'Si tiene mucha grasa, va al contenedor gris.', '🍕', '/assets/residuos/pizza.png'),
('Periodico Viejo', 'blue', 'Papel de prensa.', 'Se puede convertir en papel nuevo facilmente.', '📰', '/assets/residuos/diario.png'),
('Revista', 'blue', 'Papel satinado con color.', 'No hace falta quitar las grapas.', '📖', '/assets/residuos/revista.png'),
('Caja de Cereal', 'blue', 'Carton fino.', 'Quita la bolsa de plastico de adentro.', '📦', '/assets/residuos/cereal.png'),
('Sobre de Carta', 'blue', 'Papel de oficina.', 'Incluso con la ventanita de plastico es reciclable.', '✉️', '/assets/residuos/sobre.png'),

-- VERDE (Vidrio) - 5 items
('Botella de Vino', 'green', 'Vidrio de color.', 'Quita el corcho antes de lanzarlo.', '🍷', '/assets/residuos/vino.png'),
('Tarro de Conservas', 'green', 'Vidrio transparente.', 'La tapa metalica va al amarillo.', '🫙', '/assets/residuos/tarro.png'),
('Frasco de Perfume', 'green', 'Vidrio decorativo.', 'Quita el atomizador si es de plastico.', '🧴', '/assets/residuos/perfume.png'),
('Botella de Cerveza', 'green', 'Vidrio retornable o reciclable.', 'El vidrio es 100% reciclable.', '🍺', '/assets/residuos/cerveza.png'),
('Bote de Mermelada', 'green', 'Vidrio resistente.', 'Lavalo para evitar hormigas.', '🍯', '/assets/residuos/mermelada.png'),

-- GRIS (Organico / Restos) - 5 items
('Cascara de Banana', 'grey', 'Residuo frutal.', 'Excelente para hacer compost organico.', '🍌', '/assets/residuos/banana.png'),
('Restos de Cafe', 'grey', 'Materia organica humeda.', 'Aporta nitrogeno a la tierra.', '☕', '/assets/residuos/cafe.png'),
('Huesos de Pollo', 'grey', 'Residuo carnico.', 'Biodegradable, pero tarda mas tiempo.', '🍗', '/assets/residuos/huesos.png'),
('Servilleta Usada', 'grey', 'Papel manchado de comida.', 'No se puede reciclar como papel si tiene grasa.', '🧻', '/assets/residuos/servilleta.png'),
('Cascara de Huevo', 'grey', 'Residuo mineral organico.', 'Muy bueno para el calcio de las plantas.', '🥚', '/assets/residuos/huevo.png'),

-- ESPECIAL (Punto Limpio / Peligrosos) - 5 items
('Pilas Usadas', 'special', 'Contiene metales pesados.', 'Altamente contaminante para el agua.', '🔋', '/assets/residuos/pilas.png'),
('Bombilla LED', 'special', 'Componentes electronicos.', 'Llevala a un centro de reciclaje especial.', '💡', '/assets/residuos/bombilla.png'),
('Medicinas Caducadas', 'special', 'Residuo quimico farmaceutico.', 'Depositalo en el punto SIGRE de la farmacia.', '💊', '/assets/residuos/medicina.png'),
('Bateria de Movil', 'special', 'Contiene litio.', 'Nunca la tires a la basura normal.', '📱', '/assets/residuos/bateria.png'),
('Bote de Pintura', 'special', 'Quimicos inflamables.', 'Llevalo al punto limpio de tu ciudad.', '🎨', '/assets/residuos/pintura.png');
```

### Paso 3: Configurar Variables de Entorno

#### 3.1 Frontend (.env en raiz del proyecto)

La aplicación frontend ya está configurada para conectarse a `http://localhost:5000`. No necesita archivo `.env`.

#### 3.2 Backend (server/.env)

Crear archivo `c:\Users\Usuario\ecoguide\server\.env` con la siguiente configuración:

```dotenv
# Puerto del servidor
PORT=5000

# Configuracion de PostgreSQL
DB_USER=postgres
DB_PASSWORD=123
DB_HOST=localhost
DB_PORT=5433
DB_NAME=Ecoguide

# JWT Secret para autenticacion
JWT_SECRET=EGUIDE_2620!
```

**IMPORTANTE:** Estos valores corresponden a la instalacion local. En otra máquina debe cambiarse

### Paso 4: Instalar Dependencias

#### 4.1 Dependencias del Frontend

```bash
# En c:\Users\Usuario\ecoguide
npm install
```

#### 4.2 Dependencias del Backend

```bash
# En c:\Users\Usuario\ecoguide\server
npm install
```

### Paso 5: Iniciar la Aplicacion

#### 5.1 Iniciar el Backend (Terminal 1)

```bash
cd c:\Users\Usuario\ecoguide\server
npm start
```

Deberia verse:
```
Base de datos conectada
Servidor en puerto 5000
```

#### 5.2 Iniciar el Frontend (Terminal 2)

```bash
cd c:\Users\Usuario\ecoguide
npm start
```

La aplicacion se abrira automaticamente en `http://localhost:3000`

---

## Estructura del Proyecto

```
ecoguide/
├── public/                      # Archivos estaticos
│   ├── index.html              # HTML principal
│   ├── logo.png                # Logo de la app
│   └── assets/bins/            # Imagenes de contenedores
│
├── src/                         # Codigo fuente del frontend
│   ├── App.js                  # Componente principal (logica del juego)
│   ├── App.css                 # Estilos globales
│   ├── index.js                # Punto de entrada
│   │
│   └── components/             # Componentes React reutilizables
│       ├── Auth.js             # Autenticacion (login/registro)
│       ├── LandingPage.js      # Pagina principal
│       ├── GameHistory.js      # Historial de clasificaciones
│       ├── Ranking.js          # Tabla de lideres
│       ├── WasteItem.js        # Objeto residual arrastrable
│       └── Bin.js              # Contenedor de reciclaje
│
├── server/                      # Codigo del backend (Express)
│   ├── index.js                # Servidor principal con rutas API
│   ├── .env                    # Variables de entorno
│   └── package.json            # Dependencias del servidor
│
├── package.json                # Dependencias del frontend
└── README.md                   # Este archivo
```

---

## Rutas API

### Autenticacion

**POST** `/api/auth/register`
```json
{
  "nombre": "Juan Perez",
  "email": "juan@example.com",
  "password": "segura123"
}
```
Respuesta: Usuario creado

**POST** `/api/auth/login`
```json
{
  "email": "juan@example.com",
  "password": "segura123"
}
```
Respuesta: Token JWT + datos del usuario

### Residuos

**GET** `/api/residuos`
- Devuelve 10 residuos aleatorios para el juego

### Estadisticas

**GET** `/api/usuarios/:id/stats-hoy`
- Puntos totales, CO2 ahorrado y clasificaciones de hoy

**PUT** `/api/usuarios/:id/progreso`
- Registra una clasificacion y actualiza puntos

### Ranking

**GET** `/api/ranking`
- Top 10 usuarios ordenados por puntos

---

## Flujo del Juego

1. **Registro/Login**: Usuario crea cuenta o inicia sesion
2. **Landing**: Ve su perfil y guia de clasificacion
3. **Juego**: Arrastra cada objeto al contenedor correcto
   - Acierto a la primera: +10 puntos, +0.05kg CO2
   - Fallo: Recibe pista, puede reintentar con 0 puntos
4. **Limite diario**: Maximo 10 clasificaciones por dia
5. **Ranking**: Compite globalmente con otros usuarios

---

## Tecnologias Utilizadas

### Frontend
- **React 19** - Interfaz de usuario
- **CSS3** - Estilos con variables CSS y gradientes
- **Drag & Drop API** - Interaccion intuitiva

### Backend
- **Express.js** - Framework web
- **PostgreSQL** - Base de datos relacional
- **bcrypt** - Encriptacion de contraseñas
- **JWT** - Autenticacion segura
- **CORS** - Control de acceso entre dominios

---

## Autenticacion

La aplicacion utiliza **JSON Web Tokens (JWT)** para autenticacion:

1. Usuario inicia sesion con email y contraseña
2. Servidor genera token JWT valido por 24 horas
3. Token se almacena en localStorage del navegador
4. Cada solicitud posterior incluye el token para validacion
5. Las contraseñas se encriptan con bcrypt (10 saltos)

---

## Estructura de Datos

### Tabla usuarios
```
id (PK)    | nombre       | email              | password (hashed)
1          | Juan Perez   | juan@example.com   | $2b$10$...
2          | Maria Garcia | maria@example.com  | $2b$10$...
```

### Tabla residuos
```
id (PK) | nombre              | tipo      | icono   | imagen_url
1       | Botella de plastico | yellow    | [bottle]| /assets/plastic.png
2       | Periodico           | blue      | [paper] | /assets/paper.png
```

### Tabla historial
```
id (PK) | usuario_id | residuo_id | acierto | fecha
1       | 1          | 1          | true    | 2024-01-15 10:30:00
2       | 1          | 2          | false   | 2024-01-15 10:35:00
```

---

## Solucion de Problemas

### Error: "Cannot connect to database"
- Verificar que PostgreSQL esta corriendo en puerto 5433
- Confirmar credenciales en `server/.env`
- Verificar que la BD "Ecoguide" existe

### Error: "Port 5000 already in use"
- Cambiar PORT en `server/.env`
- O matar proceso: `taskkill /PID <pid> /F`

### Error: "CORS policy error"
- Verificar que el backend esta corriendo en `http://localhost:5000`
- Confirmar que CORS esta habilitado en `index.js`

### Las imagenes no cargan
- Verificar rutas en `imagen_url` de la BD
- Imagenes deben estar en `/public/assets/`
- El fallback emoji siempre funciona

---

## Notas de Desarrollo

- La aplicacion resetea el contador diario a las 00:00 UTC
- Solo se guardan clasificaciones dentro del horario de juego
- El ranking se actualiza en tiempo real
- Las sesiones duran 24 horas (renovar login despues)

---


## Autores

Desarrollado por Isaac Calero, Juan León y Carlos Pazmiño
