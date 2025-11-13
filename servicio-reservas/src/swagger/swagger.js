const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const path = require("path");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Ride Service API",
      version: "1.0.0",
      description: "API para la gestión de reservas y viajes (Ride Service)",
    },
    servers: [
      {
        url: "http://localhost:3001",
        description: "Servidor local de desarrollo",
      },
    ],
  },
  apis: [path.join(__dirname, "../routes/*.js")],
};

const swaggerSpec = swaggerJsDoc(options);

function setupSwagger(app) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log("📘 Swagger disponible en http://localhost:3001/api-docs");
}

module.exports = { setupSwagger };
