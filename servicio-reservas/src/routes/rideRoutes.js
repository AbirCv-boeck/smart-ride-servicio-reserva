const express = require("express");
const router = express.Router();
const rideController = require("../controllers/rideController");

const auth = require('../middlewares/auth');
const role = require('../middlewares/roles');
const { createRideRules, updateRideRules, idParamRule, listRidesRules } = require("../validations/rideValidation");
const validateRequest = require("../middlewares/validateRequest");

/**
 * @swagger
 * /rides/health:
 *   get:
 *     summary: Health check del servicio de reservas
 *     description: Verifica que el servicio esté funcionando correctamente
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servicio saludable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 service:
 *                   type: string
 *                   example: reservas
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   example: 123.456
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "reservas",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * @swagger
 * /rides:
 *   post:
 *     summary: Solicitar un nuevo viaje
 *     description: Crea una nueva solicitud de viaje (solo pasajeros autenticados)
 *     tags: [Viajes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - origen
 *               - destino
 *             properties:
 *               origen:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 500
 *                 example: "Plaza 14 de Septiembre, Cochabamba"
 *               destino:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 500
 *                 example: "Universidad Mayor de San Simón (UMSS)"
 *     responses:
 *       201:
 *         description: Viaje creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Viaje'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos (no es pasajero)
 */
router.post(
  "/",
  auth,
  role(['PASAJERO']),
  createRideRules,
  validateRequest,
  rideController.createRide
);

/**
 * @swagger
 * /rides:
 *   get:
 *     summary: Listar viajes
 *     description: Obtiene la lista de viajes según el rol del usuario
 *     tags: [Viajes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [PENDIENTE, ASIGNADO, EN_PROGRESO, COMPLETADO, CANCELADO]
 *         description: Filtrar por estado
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Cantidad de resultados
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Saltar registros
 *     responses:
 *       200:
 *         description: Lista de viajes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Viaje'
 *       401:
 *         description: No autenticado
 */
router.get(
  "/",
  auth,
  role(['ADMIN', 'CONDUCTOR', 'PASAJERO']),
  listRidesRules,
  validateRequest,
  rideController.getAllRides
);

/**
 * @swagger
 * /rides/{id}:
 *   get:
 *     summary: Obtener detalles de un viaje
 *     description: Retorna información detallada de un viaje específico
 *     tags: [Viajes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del viaje
 *     responses:
 *       200:
 *         description: Viaje encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Viaje'
 *       404:
 *         description: Viaje no encontrado
 *       403:
 *         description: Sin permisos para ver este viaje
 *       401:
 *         description: No autenticado
 */
router.get(
  "/:id",
  auth,
  role(['ADMIN', 'PASAJERO', 'CONDUCTOR']),
  idParamRule,
  validateRequest,
  rideController.getRide
);

/**
 * @swagger
 * /rides/{id}:
 *   patch:
 *     summary: Actualizar un viaje
 *     description: Actualiza información del viaje (solo Admin o Conductor asignado)
 *     tags: [Viajes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del viaje
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [PENDIENTE, ASIGNADO, EN_PROGRESO, COMPLETADO, CANCELADO]
 *               id_conductor:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       200:
 *         description: Viaje actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Viaje'
 *       404:
 *         description: Viaje no encontrado
 *       403:
 *         description: Sin permisos para actualizar
 *       401:
 *         description: No autenticado
 */
router.patch(
  "/:id",
  auth,
  role(['ADMIN', 'CONDUCTOR']),
  updateRideRules,
  validateRequest,
  rideController.updateRide
);

/**
 * @swagger
 * /rides/{id}:
 *   delete:
 *     summary: Eliminar un viaje
 *     description: Elimina un viaje del sistema (solo Admin)
 *     tags: [Viajes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del viaje
 *     responses:
 *       200:
 *         description: Viaje eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Viaje eliminado"
 *       404:
 *         description: Viaje no encontrado
 *       403:
 *         description: Sin permisos (no es admin)
 *       401:
 *         description: No autenticado
 */
router.delete(
  "/:id",
  auth,
  role(['ADMIN']),
  idParamRule,
  validateRequest,
  rideController.deleteRide
);

module.exports = router;
