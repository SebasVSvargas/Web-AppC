require('dotenv').config();
const express = require('express');
const { Client, Pool } = require('pg');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Funciones de encriptación PBKDF2 nativa (SHA-512) para evitar dependencias C++
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPasswordHash) {
  try {
    const [salt, originalHash] = storedPasswordHash.split(':');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === originalHash;
  } catch (e) {
    return false;
  }
}

// 1. Configuración de parámetros de conexión
const dbConfig = {
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
};

const dbName = process.env.PGDATABASE || 'catadb';

// 2. Función para asegurar que la base de datos "catadb" exista en el PostgreSQL local
async function ensureDatabaseExists() {
  const client = new Client({
    ...dbConfig,
    database: 'postgres' // Conectarse a la db por defecto para crear catadb si es necesario
  });

  try {
    await client.connect();
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    
    if (res.rowCount === 0) {
      console.log(`La base de datos "${dbName}" no existe. Creándola de forma automática...`);
      // Evitar SQL injection forzando nombre literal
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`¡Base de datos "${dbName}" creada con éxito!`);
    } else {
      console.log(`Base de datos "${dbName}" encontrada en PostgreSQL.`);
    }
  } catch (err) {
    console.error('Error al verificar/crear la base de datos local:', err.message);
  } finally {
    await client.end();
  }
}

// 3. Crear Pool de conexión a "catadb"
const pool = new Pool({
  ...dbConfig,
  database: dbName
});

// 4. Inicialización del esquema y datos semilla
async function initializeDatabase() {
  try {
    // Asegurar que la DB exista primero
    await ensureDatabaseExists();

    // Habilitar extensión pgcrypto para UUIDs
    try {
      await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    } catch (e) {
      console.warn('Aviso con pgcrypto:', e.message);
    }

    // A. Crear Tabla EPS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS eps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre VARCHAR(100) UNIQUE NOT NULL,
        cobertura_porcentaje INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // B. Crear Tabla Tratamientos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tratamientos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre VARCHAR(150) UNIQUE NOT NULL,
        precio_base NUMERIC(12, 2) NOT NULL,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // C. Crear Tabla Clientes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombres VARCHAR(100) NOT NULL,
        apellidos VARCHAR(100) NOT NULL,
        documento VARCHAR(30) UNIQUE NOT NULL,
        celular VARCHAR(20) NOT NULL,
        fecha_nacimiento DATE NOT NULL,
        eps_id UUID REFERENCES eps(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Asegurar columna email en clientes (migración para DB existente)
    await pool.query(`
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email VARCHAR(150) UNIQUE
    `);

    // D. Crear Tabla Medicos (Médicos autorizados)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS medicos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombres VARCHAR(100) NOT NULL,
        apellidos VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // E. Crear Tabla Consultas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS consultas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
        fecha DATE DEFAULT CURRENT_DATE,
        tratamiento_id UUID NOT NULL REFERENCES tratamientos(id),
        descripcion TEXT,
        costo_aplicado NUMERIC(12, 2) NOT NULL,
        eps_id UUID REFERENCES eps(id) ON DELETE SET NULL,
        porcentaje_cobertura INTEGER NOT NULL,
        monto_cubierto NUMERIC(12, 2) NOT NULL,
        monto_pagado_paciente NUMERIC(12, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('¡Esquema de tablas relacionales verificado/inicializado!');

    // E. Sembrar datos semilla (Seed Data) si la base de datos está vacía
    await seedData();

  } catch (err) {
    console.error('Error crítico al inicializar el esquema de base de datos:', err);
  }
}

// 5. Sembrado de datos de prueba
async function seedData() {
  const epsCount = await pool.query('SELECT COUNT(*) FROM eps');
  
  if (parseInt(epsCount.rows[0].count) === 0) {
    console.log('Detectadas tablas vacías. Sembrando datos semilla iniciales...');

    // A. Sembrar EPS
    const suraRes = await pool.query('INSERT INTO eps (nombre, cobertura_porcentaje) VALUES ($1, $2) RETURNING id', ['Sura', 80]);
    const sanitasRes = await pool.query('INSERT INTO eps (nombre, cobertura_porcentaje) VALUES ($1, $2) RETURNING id', ['Sanitas', 70]);
    const compensarRes = await pool.query('INSERT INTO eps (nombre, cobertura_porcentaje) VALUES ($1, $2) RETURNING id', ['Compensar', 60]);
    const particularRes = await pool.query('INSERT INTO eps (nombre, cobertura_porcentaje) VALUES ($1, $2) RETURNING id', ['Particular (Sin Convenio)', 0]);

    const suraId = suraRes.rows[0].id;
    const sanitasId = sanitasRes.rows[0].id;

    // B. Sembrar Tratamientos
    const consultaRes = await pool.query('INSERT INTO tratamientos (nombre, precio_base) VALUES ($1, $2) RETURNING id', ['Consulta Dermatológica de Control', 180000]);
    const crioterapiaRes = await pool.query('INSERT INTO tratamientos (nombre, precio_base) VALUES ($1, $2) RETURNING id', ['Crioterapia por Nitrógeno Líquido', 150000]);
    const biopsiaRes = await pool.query('INSERT INTO tratamientos (nombre, precio_base) VALUES ($1, $2) RETURNING id', ['Biopsia Punch de Piel', 260000]);
    const peelingRes = await pool.query('INSERT INTO tratamientos (nombre, precio_base) VALUES ($1, $2) RETURNING id', ['Peeling Clínico Regenerativo', 300000]);

    const consultaId = consultaRes.rows[0].id;
    const biopsiaId = biopsiaRes.rows[0].id;
    const peelingId = peelingRes.rows[0].id;

    // C. Sembrar Clientes
    const cliente1 = await pool.query(
      'INSERT INTO clientes (nombres, apellidos, documento, celular, fecha_nacimiento, eps_id, email) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      ['Camila', 'Restrepo Gómez', '1020304050', '3104567890', '1995-04-18', suraId, 'camila.restrepo@mail.com']
    );

    const cliente2 = await pool.query(
      'INSERT INTO clientes (nombres, apellidos, documento, celular, fecha_nacimiento, eps_id, email) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      ['Juan Carlos', 'Giraldo Ospina', '80203040', '3157654321', '1989-11-23', sanitasId, 'juan.giraldo@mail.com']
    );

    const c1Id = cliente1.rows[0].id;
    const c2Id = cliente2.rows[0].id;

    // D. Sembrar Consultas Históricas
    // Camila Restrepo: Cita 1 (Consulta de Control en 2024-05-10, pagando con convenio Sura)
    await pool.query(
      `INSERT INTO consultas (cliente_id, fecha, tratamiento_id, descripcion, costo_aplicado, eps_id, porcentaje_cobertura, monto_cubierto, monto_pagado_paciente)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [c1Id, '2024-05-10', consultaId, 'Consulta por acné vulgar moderado en zona T. Se formula tratamiento tópico y rutina de cuidado.', 180000, suraId, 80, 144000, 36000]
    );

    // Camila Restrepo: Cita 2 (Peeling Regenerativo en 2025-02-14)
    await pool.query(
      `INSERT INTO consultas (cliente_id, fecha, tratamiento_id, descripcion, costo_aplicado, eps_id, porcentaje_cobertura, monto_cubierto, monto_pagado_paciente)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [c1Id, '2025-02-14', peelingId, 'Primera sesión de Peeling Químico Clínico para secuelas hipercrómicas de acné.', 300000, suraId, 80, 240000, 60000]
    );

    // Juan Carlos Giraldo: Cita 1 (Consulta de Control en 2023-11-20, pagando con convenio Sanitas)
    await pool.query(
      `INSERT INTO consultas (cliente_id, fecha, tratamiento_id, descripcion, costo_aplicado, eps_id, porcentaje_cobertura, monto_cubierto, monto_pagado_paciente)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [c2Id, '2023-11-20', consultaId, 'Revisión preventiva de nevos (lunares) en espalda. Paciente expuesto a radiación solar ocupacional.', 180000, sanitasId, 70, 126000, 54000]
    );

    // Juan Carlos Giraldo: Cita 2 (Biopsia Punch en 2024-01-15)
    await pool.query(
      `INSERT INTO consultas (cliente_id, fecha, tratamiento_id, descripcion, costo_aplicado, eps_id, porcentaje_cobertura, monto_cubierto, monto_pagado_paciente)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [c2Id, '2024-01-15', biopsiaId, 'Extracción por punch de lesión exofítica sospechosa en cara lateral de hombro izquierdo.', 260000, sanitasId, 70, 182000, 78000]
    );

    console.log('¡Siembre de datos de prueba inicializado con éxito!');
  }

  // --- NUEVO SEMBRADO ADICIONAL PARA REPORTES 2026 ---
  const clientesCount = await pool.query('SELECT COUNT(*) FROM clientes');
  // Si solo existen Camila y Juan (2 clientes), sembramos los 8 adicionales y las 21 citas de 2026
  if (parseInt(clientesCount.rows[0].count) <= 2) {
    console.log('Detectados solo 2 pacientes semilla. Sembrando 21 consultas adicionales variadas (Ene-May 2026) para pruebas de reportes...');
    
    // Obtener los IDs de EPS y Tratamientos existentes
    const epsSura = await pool.query("SELECT id FROM eps WHERE nombre = 'Sura'");
    const epsSanitas = await pool.query("SELECT id FROM eps WHERE nombre = 'Sanitas'");
    const epsCompensar = await pool.query("SELECT id FROM eps WHERE nombre = 'Compensar'");
    const epsParticular = await pool.query("SELECT id FROM eps WHERE nombre = 'Particular (Sin Convenio)'");

    const suraId = epsSura.rows[0].id;
    const sanitasId = epsSanitas.rows[0].id;
    const compensarId = epsCompensar.rows[0].id;
    const particularId = epsParticular.rows[0].id;

    const tConsulta = await pool.query("SELECT id FROM tratamientos WHERE nombre = 'Consulta Dermatológica de Control'");
    const tCrio = await pool.query("SELECT id FROM tratamientos WHERE nombre = 'Crioterapia por Nitrógeno Líquido'");
    const tBiopsia = await pool.query("SELECT id FROM tratamientos WHERE nombre = 'Biopsia Punch de Piel'");
    const tPeeling = await pool.query("SELECT id FROM tratamientos WHERE nombre = 'Peeling Clínico Regenerativo'");

    const tConsultaId = tConsulta.rows[0].id;
    const tCrioId = tCrio.rows[0].id;
    const tBiopsiaId = tBiopsia.rows[0].id;
    const tPeelingId = tPeeling.rows[0].id;

    // Obtener los clientes existentes para añadirles citas de 2026
    const cCamila = await pool.query("SELECT id FROM clientes WHERE documento = '1020304050'");
    const cJuan = await pool.query("SELECT id FROM clientes WHERE documento = '80203040'");
    const c1Id = cCamila.rows[0].id;
    const c2Id = cJuan.rows[0].id;

    // Sementar los 8 nuevos clientes
    const p1 = await pool.query("INSERT INTO clientes (nombres, apellidos, documento, celular, fecha_nacimiento, eps_id, email) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id", ['Sofía', 'Restrepo Osorio', '1040506070', '3001234567', '1997-08-12', suraId, 'sofia.restrepo@mail.com']);
    const p2 = await pool.query("INSERT INTO clientes (nombres, apellidos, documento, celular, fecha_nacimiento, eps_id, email) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id", ['Mateo', 'Salazar Ríos', '1050607080', '3119876543', '1992-03-25', sanitasId, 'mateo.salazar@mail.com']);
    const p3 = await pool.query("INSERT INTO clientes (nombres, apellidos, documento, celular, fecha_nacimiento, eps_id, email) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id", ['Valeria', 'Muñoz Velez', '1060708090', '3205556677', '2000-11-05', compensarId, 'valeria.munoz@mail.com']);
    const p4 = await pool.query("INSERT INTO clientes (nombres, apellidos, documento, celular, fecha_nacimiento, eps_id, email) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id", ['Alejandro', 'Toro Patiño', '1070809000', '3154443322', '1985-05-30', particularId, 'alejandro.toro@mail.com']);
    const p5 = await pool.query("INSERT INTO clientes (nombres, apellidos, documento, celular, fecha_nacimiento, eps_id, email) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id", ['Isabella', 'Ortiz Londoño', '1080901020', '3182221100', '1994-01-14', suraId, 'isabella.ortiz@mail.com']);
    const p6 = await pool.query("INSERT INTO clientes (nombres, apellidos, documento, celular, fecha_nacimiento, eps_id, email) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id", ['Daniel', 'Castro Bermúdez', '1090102030', '3126667788', '1990-12-01', sanitasId, 'daniel.castro@mail.com']);
    const p7 = await pool.query("INSERT INTO clientes (nombres, apellidos, documento, celular, fecha_nacimiento, eps_id, email) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id", ['Gabriela', 'Peña Alzate', '1101203040', '3019998877', '2002-06-18', compensarId, 'gabriela.pena@mail.com']);
    const p8 = await pool.query("INSERT INTO clientes (nombres, apellidos, documento, celular, fecha_nacimiento, eps_id, email) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id", ['Nicolás', 'Henao Villegas', '1112223330', '3047778899', '1988-09-09', particularId, 'nicolas.henao@mail.com']);

    const p1Id = p1.rows[0].id;
    const p2Id = p2.rows[0].id;
    const p3Id = p3.rows[0].id;
    const p4Id = p4.rows[0].id;
    const p5Id = p5.rows[0].id;
    const p6Id = p6.rows[0].id;
    const p7Id = p7.rows[0].id;
    const p8Id = p8.rows[0].id;

    // Sementar las 21 consultas
    const insertConsulta = async (cid, fecha, tid, desc, costo, epsid, pct, cub, pag) => {
      await pool.query(
        `INSERT INTO consultas (cliente_id, fecha, tratamiento_id, descripcion, costo_aplicado, eps_id, porcentaje_cobertura, monto_cubierto, monto_pagado_paciente)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [cid, fecha, tid, desc, costo, epsid, pct, cub, pag]
      );
    };

    // Enero 2026 (4 consultas)
    await insertConsulta(p1Id, '2026-01-10', tConsultaId, 'Consulta de control por lesiones eritematosas.', 180000, suraId, 80, 144000, 36000);
    await insertConsulta(p2Id, '2026-01-18', tConsultaId, 'Consulta inicial de control por dermatitis seborreica.', 180000, sanitasId, 70, 126000, 54000);
    await insertConsulta(p4Id, '2026-01-25', tConsultaId, 'Consulta dermatológica particular. Nevo sospechoso en abdomen.', 180000, particularId, 0, 0, 180000);
    await insertConsulta(c1Id, '2026-01-28', tCrioId, 'Aplicación de nitrógeno en verruga vulgar periungueal.', 150000, suraId, 80, 120000, 30000);

    // Febrero 2026 (4 consultas)
    await insertConsulta(p3Id, '2026-02-12', tConsultaId, 'Consulta de control por dermatitis de contacto en manos.', 180000, compensarId, 60, 108000, 72000);
    await insertConsulta(p5Id, '2026-02-22', tConsultaId, 'Control por xerosis cutánea severa. Se indican cremas hidratantes.', 180000, suraId, 80, 144000, 36000);
    await insertConsulta(p7Id, '2026-02-05', tConsultaId, 'Control de acné inflamatorio. Se prescribe antibiótico tópico.', 180000, compensarId, 60, 108000, 72000);
    await insertConsulta(c1Id, '2026-02-18', tPeelingId, 'Segunda sesión de peeling clínico para mejorar cicatrices.', 300000, suraId, 80, 240000, 60000);

    // Marzo 2026 (4 consultas)
    await insertConsulta(p1Id, '2026-03-15', tPeelingId, 'Peeling químico regenerativo para hiperpigmentación facial.', 300000, suraId, 80, 240000, 60000);
    await insertConsulta(p4Id, '2026-03-08', tCrioId, 'Crioterapia en queratosis actínica en frente. Particular.', 150000, particularId, 0, 0, 150000);
    await insertConsulta(p6Id, '2026-03-04', tConsultaId, 'Consulta de control dermatológico por caída excesiva de cabello.', 180000, sanitasId, 70, 126000, 54000);
    await insertConsulta(c2Id, '2026-03-22', tCrioId, 'Sesión de crioterapia en lesión sobreelevada de espalda.', 150000, sanitasId, 70, 105000, 45000);

    // Abril 2026 (4 consultas)
    await insertConsulta(p2Id, '2026-04-20', tBiopsiaId, 'Biopsia por punch en lesión escamosa persistente en pierna derecha.', 260000, sanitasId, 70, 182000, 78000);
    await insertConsulta(p3Id, '2026-04-14', tPeelingId, 'Sesión de peeling clínico facial para rejuvenecimiento y luminosidad.', 300000, compensarId, 60, 180000, 120000);
    await insertConsulta(p8Id, '2026-04-05', tConsultaId, 'Consulta de control general y revisión corporal total.', 180000, particularId, 0, 0, 180000);
    await insertConsulta(c2Id, '2026-04-25', tBiopsiaId, 'Toma de muestra histopatológica por sospecha de CBC basal.', 260000, sanitasId, 70, 182000, 78000);

    // Mayo 2026 (5 consultas)
    await insertConsulta(p1Id, '2026-05-05', tCrioId, 'Tercera sesión de crioterapia local en lesión plantar.', 150000, suraId, 80, 120000, 30000);
    await insertConsulta(p5Id, '2026-05-18', tBiopsiaId, 'Extracción por punch de lesión sospechosa en brazo izquierdo.', 260000, suraId, 80, 208000, 52000);
    await insertConsulta(p6Id, '2026-05-12', tCrioId, 'Tratamiento localizado por nitrógeno líquido en mano.', 150000, sanitasId, 70, 105000, 45000);
    await insertConsulta(p7Id, '2026-05-20', tPeelingId, 'Peeling regenerativo de mantenimiento. Excelente evolución.', 300000, compensarId, 60, 180000, 120000);
    await insertConsulta(p8Id, '2026-05-24', tBiopsiaId, 'Biopsia punch de nevo displásico extirpado parcialmente.', 260000, particularId, 0, 0, 260000);

    console.log('¡Siembre de 21 registros variados de 2026 completada con éxito!');
  }
}

// ==================== ENDPOINTS DE LA API ====================

// --- EPS ---
app.get('/api/eps', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM eps ORDER BY nombre ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/eps', async (req, res) => {
  const { nombre, cobertura_porcentaje } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO eps (nombre, cobertura_porcentaje) VALUES ($1, $2) RETURNING *',
      [nombre, parseInt(cobertura_porcentaje)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TRATAMIENTOS ---
app.get('/api/tratamientos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tratamientos WHERE activo = true ORDER BY nombre ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tratamientos', async (req, res) => {
  const { nombre, precio_base } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO tratamientos (nombre, precio_base) VALUES ($1, $2) RETURNING *',
      [nombre, parseFloat(precio_base)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tratamientos/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, precio_base, activo } = req.body;
  try {
    const result = await pool.query(
      'UPDATE tratamientos SET nombre = $1, precio_base = $2, activo = $3 WHERE id = $4 RETURNING *',
      [nombre, parseFloat(precio_base), activo, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CLIENTES (Pacientes) ---
app.get('/api/clientes', async (req, res) => {
  try {
    // Traer clientes con el nombre de su EPS unida
    const result = await pool.query(`
      SELECT c.*, e.nombre as eps_nombre, e.cobertura_porcentaje as eps_cobertura
      FROM clientes c
      LEFT JOIN eps e ON c.eps_id = e.id
      ORDER BY c.apellidos ASC, c.nombres ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clientes', async (req, res) => {
  const { nombres, apellidos, documento, celular, fecha_nacimiento, eps_id, email } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO clientes (nombres, apellidos, documento, celular, fecha_nacimiento, eps_id, email) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [nombres, apellidos, documento, celular, fecha_nacimiento, eps_id || null, email || null]
    );
    
    // Obtener los datos unidos para retornar la respuesta completa
    const fullPatient = await pool.query(`
      SELECT c.*, e.nombre as eps_nombre, e.cobertura_porcentaje as eps_cobertura
      FROM clientes c
      LEFT JOIN eps e ON c.eps_id = e.id
      WHERE c.id = $1
    `, [result.rows[0].id]);
    
    res.status(201).json(fullPatient.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CONSULTAS ---
app.get('/api/consultas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT con.*, 
             cli.nombres as cliente_nombres, cli.apellidos as cliente_apellidos, cli.documento as cliente_documento,
             t.nombre as tratamiento_nombre,
             e.nombre as eps_nombre
      FROM consultas con
      JOIN clientes cli ON con.cliente_id = cli.id
      JOIN tratamientos t ON con.tratamiento_id = t.id
      LEFT JOIN eps e ON con.eps_id = e.id
      ORDER BY con.fecha DESC, con.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/consultas/cliente/:clienteId', async (req, res) => {
  const { clienteId } = req.params;
  try {
    const result = await pool.query(`
      SELECT con.*, 
             t.nombre as tratamiento_nombre,
             e.nombre as eps_nombre
      FROM consultas con
      JOIN tratamientos t ON con.tratamiento_id = t.id
      LEFT JOIN eps e ON con.eps_id = e.id
      WHERE con.cliente_id = $1
      ORDER BY con.fecha DESC, con.created_at DESC
    `, [clienteId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/consultas', async (req, res) => {
  const { 
    cliente_id, 
    fecha, 
    tratamiento_id, 
    descripcion, 
    costo_aplicado, 
    eps_id, 
    porcentaje_cobertura, 
    monto_cubierto, 
    monto_pagado_paciente 
  } = req.body;

  try {
    const result = await pool.query(`
      INSERT INTO consultas 
      (cliente_id, fecha, tratamiento_id, descripcion, costo_aplicado, eps_id, porcentaje_cobertura, monto_cubierto, monto_pagado_paciente)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      cliente_id, 
      fecha || new Date(), 
      tratamiento_id, 
      descripcion || '', 
      parseFloat(costo_aplicado), 
      eps_id || null, 
      parseInt(porcentaje_cobertura), 
      parseFloat(monto_cubierto), 
      parseFloat(monto_pagado_paciente)
    ]);
    
    // Obtener la fila completa con uniones
    const fullConsultation = await pool.query(`
      SELECT con.*, 
             cli.nombres as cliente_nombres, cli.apellidos as cliente_apellidos, cli.documento as cliente_documento,
             t.nombre as tratamiento_nombre,
             e.nombre as eps_nombre
      FROM consultas con
      JOIN clientes cli ON con.cliente_id = cli.id
      JOIN tratamientos t ON con.tratamiento_id = t.id
      LEFT JOIN eps e ON con.eps_id = e.id
      WHERE con.id = $1
    `, [result.rows[0].id]);

    res.status(201).json(fullConsultation.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- MÉDICOS (Autenticación) ---
app.post('/api/medicos/signup', async (req, res) => {
  const { nombres, apellidos, email, password } = req.body;
  if (!nombres || !apellidos || !email || !password) {
    return res.status(400).json({ error: 'Por favor, completa todos los campos del formulario.' });
  }

  try {
    const exists = await pool.query('SELECT 1 FROM medicos WHERE email = $1', [email]);
    if (exists.rowCount > 0) {
      return res.status(400).json({ error: 'Este correo electrónico ya se encuentra registrado.' });
    }

    const passwordHash = hashPassword(password);
    const result = await pool.query(
      'INSERT INTO medicos (nombres, apellidos, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, nombres, apellidos, email',
      [nombres, apellidos, email, passwordHash]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al registrar médico:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/medicos/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Por favor, ingresa tu correo y contraseña.' });
  }

  try {
    const result = await pool.query('SELECT * FROM medicos WHERE email = $1', [email]);
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    const doctor = result.rows[0];
    const isValid = verifyPassword(password, doctor.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    res.json({
      email: doctor.email,
      nombres: doctor.nombres,
      apellidos: doctor.apellidos
    });
  } catch (err) {
    console.error('Error al iniciar sesión:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Inicializar la base de datos al encender
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor local de CATAPP corriendo en http://localhost:${PORT}`);
  });
});
