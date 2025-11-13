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

const PORT = process.env.PORT || 3001;
const SWAGGER_URL = `http://localhost:${PORT}/api-docs`;

// Rutas
app.use("/rides", rideRoutes);

app.use("/", (req, res) => {
  res.send("🚗 Servicio de Reservas y Viajes (Ride Service) está funcionando");
});

AppDataSource.initialize()
  .then(async () => {
    console.log("📦 Conectado a MySQL");

    // Conectar a RabbitMQ con reintentos
    const rabbitConnected = await connectRabbitMQ();
    if (rabbitConnected && isRabbitConnected()) {
      console.log("✅ RabbitMQ listo para publicar eventos");
    } else {
      console.warn("⚠️ RabbitMQ NO está disponible, los eventos no se enviarán");
    }

    // Levantar servidor
    app.listen(PORT, () => {
      console.log(`🚗 Ride Service corriendo en puerto ${PORT}`);
      console.log(`📘 Documentación Swagger disponible en: \x1b[36m${SWAGGER_URL}\x1b[0m`);
      console.log(`✅ API/Servicio funcionando correctamente. Puedes probar los endpoints en http://localhost:${PORT}`);
    });
  })
  .catch((err) => console.error("❌ Error en la BD:", err));
