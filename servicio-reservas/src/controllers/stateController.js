// src/controllers/stateController.js
const { StateService } = require('../services/stateService');

/**
 * Controlador HTTP que aplica req.user (del middleware auth)
 * y llama a StateService. Lanza errores con status para el handler global.
 */

async function acceptRide(req, res, next) {
  try {
    const id_viaje = req.params.id;
    const conductorId = req.user.id_usuario;

    const updated = await StateService.acceptRide(id_viaje, conductorId);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function startRide(req, res, next) {
  try {
    const id_viaje = req.params.id;
    const conductorId = req.user.id_usuario;

    const updated = await StateService.startRide(id_viaje, conductorId);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function finishRide(req, res, next) {
  try {
    const id_viaje = req.params.id;
    const conductorId = req.user.id_usuario;

    const updated = await StateService.finishRide(id_viaje, conductorId);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function cancelRide(req, res, next) {
  try {
    const id_viaje = req.params.id;
    const pasajeroId = req.user.id_usuario;
    const { motivo } = req.body || {};

    const updated = await StateService.cancelRide(id_viaje, pasajeroId, motivo);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function getHistory(req, res, next) {
  try {
    const id_viaje = req.params.id;
    const history = await StateService.getHistory(id_viaje);
    res.status(200).json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
}

module.exports = { acceptRide, startRide, finishRide, cancelRide, getHistory };
