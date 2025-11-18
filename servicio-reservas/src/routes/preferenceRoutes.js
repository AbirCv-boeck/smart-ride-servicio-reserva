// src/routes/preferenceRoutes.js
const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth");
const role = require("../middlewares/roles");
const preferenceController = require("../controllers/preferenceController");

/**
 * @swagger
 * /rides/preferences/me:
 *   get:
 *     summary: Obtener preferencias del pasajero actual
 *     tags: [Preferencias]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferencias del pasajero
 *       401:
 *         description: No autorizado
 */

router.get(
  "/me",
  auth,
  role(["PASAJERO"]),
  preferenceController.getMyPreferences
);

/**
 * @swagger
 * /rides/preferences:
 *   put:
 *     summary: Actualizar o crear preferencias del usuario
 *     tags: [Preferencias]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               musica:
 *                 type: string
 *               charla:
 *                 type: string
 *               temperatura:
 *                 type: string
 *           example:
 *             musica: "suave"
 *             charla: "silencio"
 *             temperatura: "fresca"
 *     responses:
 *       200:
 *         description: Preferencias actualizadas
 */



router.put(
  "/me",
  auth,
  role(["PASAJERO"]),
  preferenceController.updateMyPreferences
);

module.exports = router;
