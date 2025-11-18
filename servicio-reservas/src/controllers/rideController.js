
const rideService = require("../services/rideService");

async function createRide(req, res, next) {
  try {
    const payload = req.body;
    const id_usuario = req.user.id_usuario;

    const created = await rideService.createRide(payload, id_usuario);
    return res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

async function getAllRides(req, res, next) {
  try {
    const user = req.user;
    const rides = await rideService.getAllRides(user);
    return res.json(rides);
  } catch (err) {
    next(err);
  }
}

async function getRide(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const user = req.user;
    const ride = await rideService.getRideById(id, user);
    if (!ride) return res.status(404).json({ error: "Viaje no encontrado" });
    return res.json(ride);
  } catch (err) {
    next(err);
  }
}

async function updateRide(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const updates = req.body;
    const user = req.user;
    const updated = await rideService.updateRide(id, updates, user);
    return res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function deleteRide(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const user = req.user;
    await rideService.deleteRide(id, user);
    return res.json({ ok: true, message: "Viaje eliminado" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createRide,
  getAllRides,
  getRide,
  updateRide,
  deleteRide
};
