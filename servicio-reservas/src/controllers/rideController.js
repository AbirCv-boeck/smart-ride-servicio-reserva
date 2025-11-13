const { RideService } = require("../services/rideService");
const { publishEvent, isRabbitConnected } = require("../config/rabbitmq");


async function createRide(req, res) {
  try {
    const ride = await RideService.createRide(req.body);

    // Publicar evento de reserva creada
    if (isRabbitConnected()) {
      publishEvent("reserva_creada", {
        rideId: ride.id,
        cliente: ride.id_cliente,
        origen: ride.punto_origen,
        destino: ride.punto_destino,
        estado: ride.estado,
        fecha: ride.fecha_solicitud
      });
    }

    res.status(201).json(ride);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getAllRides(req, res) {
  try {
    const rides = await RideService.getAllRides();
    res.json(rides);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getRide(req, res) {
  try {
    const ride = await RideService.getRideById(req.params.id);
    if (!ride) return res.status(404).json({ error: "Viaje no encontrado" });
    res.json(ride);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateRide(req, res) {
  try {
    const { id } = req.params;
    const dataToUpdate = req.body;

    // 🔹 Obtener el viaje existente
    const existingRide = await RideService.getRideById(id);
    if (!existingRide) {
      return res.status(404).json({ error: "Viaje no encontrado" });
    }

    // 🔹 Actualizar solo los campos enviados (actualización parcial)
    Object.assign(existingRide, dataToUpdate);

    // 🔹 Guardar cambios en la BD
    const ride = await RideService.updateRide(id, existingRide);

    // 🔹 Publicar evento de viaje actualizado
    if (ride && isRabbitConnected()) {
      publishEvent("viaje_actualizado", {
        rideId: ride.id,
        estado: ride.estado,
        cliente: ride.id_cliente,
        origen: ride.punto_origen,
        destino: ride.punto_destino
      });
    }

    res.json({
      message: "✅ Viaje actualizado parcialmente",
      data: ride
    });
  } catch (err) {
    console.error("❌ Error actualizando viaje:", err);
    res.status(500).json({ error: err.message });
  }
}


async function deleteRide(req, res) {
  try {
    const ride = await RideService.deleteRide(req.params.id);
    if (!ride) return res.status(404).json({ error: "Viaje no encontrado" });

    // Publicar evento de viaje eliminado
    if (isRabbitConnected()) {
      publishEvent("viaje_eliminado", {
        rideId: req.params.id
      });
    }

    res.json({ message: "Viaje eliminado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createRide, getAllRides, getRide, updateRide, deleteRide };
