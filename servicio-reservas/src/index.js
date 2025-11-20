require('dotenv').config();
require('reflect-metadata');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger/swagger');

const { AppDataSource } = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');

const rideRoutes = require('./routes/rideRoutes');
const stateRoutes = require('./routes/stateRoutes');
const preferenceRoutes = require('./routes/preferenceRoutes');

const { initializeRabbitMQ, closeRabbitMQ } = require('./events/publisher');
const { startWorker } = require('./events/worker');
const { startGrpcServer } = require('./grpc/server');

const app = express();
const PORT = process.env.PORT || 3002;
const GRPC_PORT = process.env.GRPC_PORT || 50051;

//  Definir RABBITMQ_URL desde variables de entorno
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';

// ==========================================
// MIDDLEWARES GLOBALES
// ==========================================
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==========================================
// RUTAS DE LA API v1
// ==========================================
const apiV1Router = express.Router();

apiV1Router.use('/rides', rideRoutes);
apiV1Router.use('/rides/state', stateRoutes);
apiV1Router.use('/preferences', preferenceRoutes);

apiV1Router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'reservas',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use('/api/v1', apiV1Router);

// ==========================================
// SWAGGER DOCUMENTATION
// ==========================================
app.use('/api/v1/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'SmartRide Reservas API',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    syntaxHighlight: {
      activate: true,
      theme: "monokai"
    }
  }
}));

// ==========================================
// RUTA ROOT
// ==========================================
app.get('/', (req, res) => {
  res.json({
    message: 'SmartRide - Servicio de Reservas',
    version: '1.0.0',
    documentation: '/api/v1/api-docs',
    health: '/api/v1/health',
    endpoints: {
      rides: '/api/v1/rides',
      preferences: '/api/v1/preferences',
      state: '/api/v1/rides/state'
    }
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'reservas',
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// MANEJO DE RUTAS NO ENCONTRADAS
// ==========================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method,
    suggestion: 'Todos los endpoints deben empezar con /api/v1/'
  });
});

// ==========================================
// MIDDLEWARE DE MANEJO DE ERRORES
// ==========================================
app.use(errorHandler);

// ==========================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ==========================================
let server = null;

async function startServer() {
  try {
    console.log('🚀 Iniciando Servicio de Reservas...');

    // 1. Conectar a la base de datos
    console.log('📊 Conectando a MySQL...');
    await AppDataSource.initialize();
    console.log('✅ Conexión a MySQL exitosa');

    // 2. Inicializar RabbitMQ
    console.log('🐰 Conectando a RabbitMQ compartido...');
    await initializeRabbitMQ();
    console.log('✅ Conexión a RabbitMQ exitosa');

    // 3. Iniciar worker de eventos
    console.log('⚙️ Iniciando worker de eventos...');
    await startWorker();
    console.log('✅ Worker de eventos activo');

    // 4. Iniciar servidor gRPC
    console.log('🔧 Iniciando servidor gRPC...');
    startGrpcServer(GRPC_PORT);
    console.log(`✅ Servidor gRPC activo en puerto ${GRPC_PORT}`);

    // 5. Iniciar servidor HTTP
    server = app.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log('✅ SERVICIO DE RESERVAS INICIADO CORRECTAMENTE');
      console.log('='.repeat(60));
      console.log(`🌐 Servidor HTTP: http://localhost:${PORT}`);
      console.log(`📚 Documentación:  http://localhost:${PORT}/api/v1/api-docs`);
      console.log(`❤️  Health Check:  http://localhost:${PORT}/api/v1/health`);
      console.log(`🔗 API Base URL:  http://localhost:${PORT}/api/v1`);
      console.log(`🐰 RabbitMQ:      ${RABBITMQ_URL}`);
      console.log(`🔧 gRPC Server:   0.0.0.0:${GRPC_PORT}`);
      console.log('='.repeat(60) + '\n');
    });

  } catch (error) {
    console.error('❌ Error fatal al iniciar el servidor:', error);
    process.exit(1);
  }
}

// ==========================================
// MANEJO DE SEÑALES DE TERMINACIÓN
// ==========================================
process.on('SIGINT', async () => {
  console.log('\n⚠️ Señal SIGINT recibida. Cerrando servidor...');
  await gracefulShutdown();
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️ Señal SIGTERM recibida. Cerrando servidor...');
  await gracefulShutdown();
});

async function gracefulShutdown() {
  try {
    console.log('🔄 Iniciando cierre graceful...');

    if (server) {
      await new Promise((resolve) => {
        server.close(() => {
          console.log('✅ Servidor HTTP cerrado');
          resolve();
        });
      });
    }

    await closeRabbitMQ();

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ Conexión a MySQL cerrada');
    }

    console.log('✅ Cierre graceful completado');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante el cierre:', error);
    process.exit(1);
  }
}

// ==========================================
// INICIAR APLICACIÓN
// ==========================================
startServer();
