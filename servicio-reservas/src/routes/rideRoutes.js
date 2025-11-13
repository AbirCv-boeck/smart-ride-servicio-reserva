const express = require("express");
const router = express.Router();
const {
  createRide,
  getAllRides,
  getRide,
  updateRide,
  deleteRide,
} = require("../controllers/rideController");

/**
 * @swagger
 * components:
 *   schemas:
 *     Viaje:
 *       type: object
 *       properties:
 *         id_viaje:
 *           type: integer
 *           description: ID del viaje
 *         id_cliente:
 *           type: integer
 *           description: ID del cliente
 *         id_conductor:
 *           type: integer
 *           description: ID del conductor asignado
 *         punto_origen:
 *           type: string
 *         punto_destino:
 *           type: string
 *         estado:
 *           type: string
 *           enum: [pendiente, asignado, en_progreso, finalizado, cancelado]
 *         fecha_solicitud:
 *           type: string
 *           format: date-time
 *         fecha_inicio:
 *           type: string
 *           format: date-time
 *         fecha_fin:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /rides/create:
 *   post:
 *     summary: Crear una nueva reserva de viaje
 *     tags: [Viajes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_cliente:
 *                 type: integer
 *               punto_origen:
 *                 type: string
 *               punto_destino:
 *                 type: string
 *     responses:
 *       201:
 *         description: Reserva creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Viaje'
 */
router.post("/", createRide);

/**
 * @swagger
 * /rides:
 *   get:
 *     summary: Obtener todos los viajes
 *     tags: [Viajes]
 *     responses:
 *       200:
 *         description: Lista de todos los viajes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Viaje'
 */
router.get("/", getAllRides);

/**
 * @swagger
 * /rides/{id}:
 *   get:
 *     summary: Obtener un viaje por ID
 *     tags: [Viajes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalle del viaje
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Viaje'
 *       404:
 *         description: Viaje no encontrado
 */
router.get("/:id", getRide);

/**
 * @swagger
 * /rides/{id}:
 *   patch:
 *     summary: Actualizar parcialmente un viaje
 *     description: Permite modificar uno o más campos de un viaje existente sin necesidad de enviar todos los datos.
 *     tags: [Viajes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del viaje a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_conductor:
 *                 type: integer
 *                 description: Nuevo ID del conductor
 *               estado:
 *                 type: string
 *                 enum: [pendiente, asignado, en_progreso, finalizado, cancelado]
 *                 description: Estado actual del viaje
 *               punto_origen:
 *                 type: string
 *                 description: Punto de origen actualizado
 *               punto_destino:
 *                 type: string
 *                 description: Punto de destino actualizado
 *               fecha_inicio:
 *                 type: string
 *                 format: date-time
 *                 description: Nueva fecha de inicio del viaje
 *               fecha_fin:
 *                 type: string
 *                 format: date-time
 *                 description: Nueva fecha de finalización del viaje
 *     responses:
 *       200:
 *         description: Viaje actualizado parcialmente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Viaje'
 *       404:
 *         description: Viaje no encontrado
 */
router.patch("/:id", updateRide);

/**
 * @swagger
 * /rides/{id}:
 *   delete:
 *     summary: Eliminar un viaje
 *     tags: [Viajes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Viaje eliminado exitosamente
 *       404:
 *         description: Viaje no encontrado
 */
router.delete("/:id", deleteRide);

module.exports = router;
