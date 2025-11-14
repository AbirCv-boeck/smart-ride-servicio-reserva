require("dotenv").config();
require("reflect-metadata");
const express = require("express");
const { AppDataSource } = require("./config/db");
const { connectRabbitMQ, isRabbitConnected } = require("./config/rabbitmq");
const rideRoutes = require("./routes/rideRoutes");
const { setupSwagger } = require("./swagger/swagger");

const app = express();
app.use(express.json());

// Swagger
setupSwagger(app);

const PORT = process.env.PORT || 3002;
const SWAGGER_URL = `http://localhost:${PORT}/api-docs`;

// Rutas
app.use("/rides", rideRoutes);

app.use("/", (req, res) => {
  res.send("🚗 Servicio de Reservas y Viajes (Ride Service) está funcionando");
});

// Health check endpoint - DEBE IR ANTES de otras rutas
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    service: 'reservas',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Función para reintentar conexión a MySQL
async function connectWithRetry(maxRetries = 10, delay = 5000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Intento ${attempt} de ${maxRetries} - Conectando a MySQL...`);
      await AppDataSource.initialize();
      console.log("Conectado a MySQL exitosamente");
      return true;
    } catch (error) {
      console.error(`❌ Error conectando a MySQL (intento ${attempt}):`, error.message);
      
      if (attempt < maxRetries) {
        console.log(`⏳ Reintentando en ${delay / 1000} segundos...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error("❌ No se pudo conectar a MySQL después de múltiples intentos");
        throw error;
      }
    }
  }
}

// Inicializar servicios
(async () => {
  try {
    // Conectar a MySQL con reintentos
    await connectWithRetry();

    // Conectar a RabbitMQ con reintentos
    const rabbitConnected = await connectRabbitMQ();
    if (rabbitConnected && isRabbitConnected()) {
      console.log("RabbitMQ listo para publicar eventos");
    } else {
      console.warn("RabbitMQ NO está disponible, los eventos no se enviarán");
    }

    // Levantar servidor
    app.listen(PORT, () => {
      console.log(`🚗 Ride Service corriendo en puerto ${PORT}`);
      console.log(`📘 Documentación Swagger: \x1b[36m${SWAGGER_URL}\x1b[0m`);
      console.log(`✅ Servicio listo para recibir solicitudes`);
    });
  } catch (error) {
    console.error("❌ Error fatal al iniciar el servicio:", error);
    process.exit(1);
  }
})();