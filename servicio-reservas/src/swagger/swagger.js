const swaggerJsDoc = require("swagger-jsdoc");
const path = require("path");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SmartRide - Reservas API",
      version: "1.0.0",
      description: "API para la gestión de reservas y viajes en SmartRide",
      contact: {
        name: "SmartRide Team",
        email: "dev@smartride.com"
      }
    },
    servers: [
      {
        url: "http://localhost:3002/api/v1",
        description: "Servidor local - Directo (Desarrollo)"
      },
      {
        url: "http://localhost/api/v1",
        description: "API Gateway (Nginx) - Producción"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT obtenido del endpoint /api/v1/auth/login del servicio de usuarios"
        }
      },
      schemas: {
        Viaje: {
          type: "object",
          properties: {
            id_viaje: {
              type: "integer",
              example: 1
            },
            id_cliente: {
              type: "integer",
              example: 10
            },
            id_conductor: {
              type: "integer",
              nullable: true,
              example: 5
            },
            origen: {
              type: "string",
              example: "Plaza 14 de Septiembre, Cochabamba"
            },
            destino: {
              type: "string",
              example: "Universidad Mayor de San Simón (UMSS)"
            },
            estado: {
              type: "string",
              enum: ["PENDIENTE", "ASIGNADO", "EN_PROGRESO", "COMPLETADO", "CANCELADO"],
              example: "PENDIENTE"
            },
            fecha_solicitud: {
              type: "string",
              format: "date-time"
            },
            fecha_asignacion: {
              type: "string",
              format: "date-time",
              nullable: true
            },
            fecha_inicio: {
              type: "string",
              format: "date-time",
              nullable: true
            },
            fecha_fin: {
              type: "string",
              format: "date-time",
              nullable: true
            },
            motivo_cancelacion: {
              type: "string",
              nullable: true
            }
          }
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false
            },
            error: {
              type: "string",
              example: "Mensaje de error"
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: "Health",
        description: "Health check endpoints"
      },
      {
        name: "Viajes",
        description: "Gestión de viajes y reservas"
      },
      {
        name: "Estados de Viaje",
        description: "Transiciones de estado de viajes"
      },
      {
        name: "Preferencias",
        description: "Preferencias de viaje del usuario"
      }
    ]
  },
  apis: [
    path.join(__dirname, "../routes/*.js"),
    path.join(__dirname, "../controllers/*.js")
  ]
};

const swaggerSpec = swaggerJsDoc(options);

module.exports = swaggerSpec;
