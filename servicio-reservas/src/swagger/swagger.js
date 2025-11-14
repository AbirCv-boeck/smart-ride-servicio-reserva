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
        url: "http://localhost:3002", 
        description: "Servidor local de desarrollo",
      },
      {
        url: "http://localhost/rides", 
        description: "API Gateway (Nginx)",
      },
    ],
  },
  apis: [path.join(__dirname, "../routes/*.js")],
};

const swaggerSpec = swaggerJsDoc(options);

function setupSwagger(app) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log("Swagger disponible en:");
  console.log("   - Directo: http://localhost:3002/api-docs");
  console.log("   - Nginx:   http://localhost/api-docs");
}

module.exports = { setupSwagger };
