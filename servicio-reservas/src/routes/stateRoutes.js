// src/routes/stateRoutes.js
const express = require('express');
const router = express.Router();
const stateController = require('../controllers/stateController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/roles');
const { idParamRule, cancelRules } = require('../validations/stateValidation');
const validateRequest = require('../middlewares/validateRequest');

/**
 * @swagger
 * /rides/state/{id}/accept:
 *   patch:
 *     summary: Aceptar un viaje (Conductor)
 *     description: El conductor acepta un viaje pendiente
 *     tags: [Estados de Viaje]
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
 *         description: Viaje asignado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Viaje'
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos (no es conductor)
 *       409:
 *         description: Conflicto de estado
 */
router.patch(
  '/:id/accept',
  auth,
  role(['CONDUCTOR']),
  idParamRule,
  validateRequest,
  stateController.acceptRide
);

/**
 * @swagger
 * /rides/state/{id}/start:
 *   patch:
 *     summary: Iniciar un viaje (Conductor)
 *     description: El conductor inicia un viaje asignado
 *     tags: [Estados de Viaje]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Viaje iniciado
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es el conductor asignado
 *       409:
 *         description: El viaje no está en estado ASIGNADO
 */
router.patch(
  '/:id/start',
  auth,
  role(['CONDUCTOR']),
  idParamRule,
  validateRequest,
  stateController.startRide
);

/**
 * @swagger
 * /rides/state/{id}/finish:
 *   patch:
 *     summary: Finalizar un viaje (Conductor)
 *     description: El conductor marca el viaje como completado
 *     tags: [Estados de Viaje]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Viaje finalizado correctamente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es el conductor asignado
 *       409:
 *         description: El viaje no está EN_PROGRESO
 */
router.patch(
  '/:id/finish',
  auth,
  role(['CONDUCTOR']),
  idParamRule,
  validateRequest,
  stateController.finishRide
);

/**
 * @swagger
 * /rides/state/{id}/cancel:
 *   patch:
 *     summary: Cancelar un viaje (Pasajero/Conductor)
 *     description: Cancela un viaje que aún no ha iniciado
 *     tags: [Estados de Viaje]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Cambio de planes"
 *     responses:
 *       200:
 *         description: Viaje cancelado exitosamente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Solo el pasajero puede cancelar
 *       409:
 *         description: No se puede cancelar en este estado
 */
router.patch(
  '/:id/cancel',
  auth,
  role(['PASAJERO', 'CONDUCTOR']),
  cancelRules,
  validateRequest,
  stateController.cancelRide
);

/**
 * @swagger
 * /rides/state/{id}/history:
 *   get:
 *     summary: Ver historial de un viaje
 *     description: Obtiene el historial completo de cambios de estado
 *     tags: [Estados de Viaje]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Historial obtenido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_historial:
 *                         type: integer
 *                       accion:
 *                         type: string
 *                       detalle:
 *                         type: string
 *                       actor_id:
 *                         type: integer
 *                       actor_rol:
 *                         type: string
 *                       fecha_accion:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: No autenticado
 */
router.get(
  '/:id/history',
  auth,
  role(['ADMIN', 'PASAJERO', 'CONDUCTOR']),
  idParamRule,
  validateRequest,
  stateController.getHistory
);

module.exports = router;




