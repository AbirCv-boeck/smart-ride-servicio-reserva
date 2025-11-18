
require("dotenv").config();
require("reflect-metadata");
require("./src/events/worker");

const express = require("express");
const { AppDataSource } = require("./config/db");
const { initEventPublisher } = require('./services/eventService');

const rideRoutes = require("./routes/rideRoutes");
const stateRoutes = require('./routes/stateRoutes');
const preferenceRoutes = require("./routes/preferenceRoutes");
const { setupSwagger } = require("./swagger/swagger");
const errorHandler = require('./middlewares/errorHandler');

const app = express();
app.use(express.json());


setupSwagger(app);

const PORT = process.env.PORT || 3002;
const SWAGGER_URL = `http://localhost:${PORT}/api-docs`;

/*
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    service: 'reservas',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
*/

// Rutas
app.use("/rides", rideRoutes);
app.use('/rides/state', stateRoutes);
app.use("/rides/preferences", preferenceRoutes);

app.use(errorHandler);

app.use("/", (req, res) => {
  res.send("Servicio de Reservas y Viajes (Ride Service) está funcionando");
});



async function connectWithRetry(maxRetries = 10, delay = 5000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Intento ${attempt} de ${maxRetries} - Conectando a MySQL...`);
      await AppDataSource.initialize();
      console.log("Conectado a MySQL exitosamente");
      return true;
    } catch (error) {
      console.error(`Error conectando a MySQL (intento ${attempt}):`, error.message);
      
      if (attempt < maxRetries) {
        console.log(`Reintentando en ${delay / 1000} segundos...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error("No se pudo conectar a MySQL después de múltiples intentos");
        throw error;
      }
    }
  }
}


(async () => {
  try {
    await connectWithRetry();
    console.log("🔄 Inicializando Event Publisher...");
    const pubReady = await initEventPublisher();

    if (!pubReady) {
      console.warn("⚠️ Event Publisher NO está disponible, los eventos NO se enviarán.");
    } else {
      console.log("📨 Event Publisher listo para enviar eventos.");
    }


    app.listen(PORT, () => {
      console.log(`Ride Service corriendo en puerto ${PORT}`);
      console.log(`Documentación Swagger: \x1b[36m${SWAGGER_URL}\x1b[0m`);
      console.log(`Servicio listo para recibir solicitudes`);
    });

  } catch (error) {
    console.error("Error fatal al iniciar el servicio:", error);
    process.exit(1);
  }
})();
