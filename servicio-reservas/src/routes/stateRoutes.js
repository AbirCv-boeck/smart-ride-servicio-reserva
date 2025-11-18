// src/routes/stateRoutes.js
const express = require('express');
const router = express.Router();
const stateController = require('../controllers/stateController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/roles');


/**
 * @swagger
 * /rides/state/{id}/accept:
 *   patch:
 *     summary: Aceptar un viaje (conductor)
 *     tags: [Viajes - Estados]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del viaje a aceptar
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Viaje asignado exitosamente
 *       401:
 *         description: No autorizado
 *       409:
 *         description: Conflicto de estado
 */

router.patch('/:id/accept', auth, role(['CONDUCTOR']), stateController.acceptRide);

/**
 * @swagger
 * /rides/state/{id}/start:
 *   patch:
 *     summary: Iniciar un viaje aceptado
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
 *       400:
 *         description: El viaje no está en estado asignado
 */


router.patch('/:id/start', auth, role(['CONDUCTOR']), stateController.startRide);

/**
 * @swagger
 * /rides/state/{id}/finish:
 *   patch:
 *     summary: Finalizar un viaje en progreso
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
 */



router.patch('/:id/finish', auth, role(['CONDUCTOR']), stateController.finishRide);

/**
 * @swagger
 * /rides/state/{id}/cancel:
 *   patch:
 *     summary: Cancelar un viaje (solo pasajero)
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
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo:
 *                 type: string
 *           example:
 *             motivo: "Cambio de planes"
 *     responses:
 *       200:
 *         description: Viaje cancelado exitosamente
 */



router.patch('/:id/cancel', auth, role(['PASAJERO','CONDUCTOR']), stateController.cancelRide);

/**
 * @swagger
 * /rides/state/{id}/history:
 *   get:
 *     summary: Ver historial de cambios de estado para un viaje
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
 */


router.get('/:id/history', auth, role(['ADMIN','PASAJERO','CONDUCTOR']), stateController.getHistory);

module.exports = router;




