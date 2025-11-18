
const { AppDataSource } = require("../config/db");
const { Viaje } = require("../entities/viaje");
const { ReservaHistorial } = require("../entities/reservaHistorial");
const preferenceService = require("./preferenceService");
const historyService = require("./historyService");
const { publishEvent } = require("./eventService");
const eventTypes = require("../events/eventTypes");

const viajeRepo = () => AppDataSource.getRepository(Viaje);
const historialRepo = () => AppDataSource.getRepository(ReservaHistorial);

async function createRide(payload, id_cliente) {
  
  if (!payload || !payload.origen || !payload.destino) {
    const err = new Error("Faltan campos obligatorios: origen y destino");
    err.status = 400;
    throw err;
  }


  return AppDataSource.manager.transaction(async (manager) => {
    const viajeToSave = {
      id_cliente,
      origen: payload.origen,
      destino: payload.destino,
      estado: "PENDIENTE"
    };

    const saved = await manager.getRepository(Viaje).save(viajeToSave);

    await manager.getRepository(ReservaHistorial).save({
      viaje: saved, 
      accion: "CREACION",
      detalle: `Reserva creada por usuario ${id_cliente}`
    });

    
    const preferencias = await preferenceService.getPreferencesByCliente(id_cliente);

    
    const eventPayload = {
      id_viaje: saved.id_viaje,
      id_cliente,
      origen: saved.origen,
      destino: saved.destino,
      preferencias: preferencias || null
    };

    try {
      await publishEvent(eventTypes.NUEVA_RESERVA, eventPayload);
    } catch (e) {
      console.warn("No se pudo publicar evento nueva_reserva:", e.message);
    }
    return saved;
  });
}

async function getAllRides(user) {
  const repo = viajeRepo();
  const role = String(user.rol).toUpperCase();

  if (role === "ADMIN") {
    return repo.find();
  }

  if (role === "PASAJERO") {
    return repo.find({ where: { id_cliente: user.id_usuario } });
  }

  if (role === "CONDUCTOR") {
    return repo.find({ where: { id_conductor: user.id_usuario } });
  }

  return [];
}

async function getRideById(id_viaje, user) {
  const repo = viajeRepo();
  const ride = await repo.findOne({ where: { id_viaje } });
  if (!ride) return null;

  const role = String(user.rol).toUpperCase();
  if (role === "ADMIN") return ride;
  if (role === "PASAJERO" && ride.id_cliente === user.id_usuario) return ride;
  if (role === "CONDUCTOR" && ride.id_conductor === user.id_usuario) return ride;

  const err = new Error("Permisos insuficientes para ver este viaje");
  err.status = 403;
  throw err;
}

async function updateRide(id_viaje, updates, user) {
  const repo = viajeRepo();
  const ride = await repo.findOne({ where: { id_viaje } });
  if (!ride) {
    const err = new Error("Viaje no encontrado");
    err.status = 404;
    throw err;
  }

  const role = String(user.rol).toUpperCase();

  if (role === "CONDUCTOR" && ride.id_conductor && ride.id_conductor !== user.id_usuario) {
    const err = new Error("Conductor no autorizado para modificar este viaje");
    err.status = 403;
    throw err;
  }

  
  const allowed = ["id_conductor", "estado", "fecha_inicio", "fecha_fin", "origen", "destino"];
  allowed.forEach((k) => {
    if (typeof updates[k] !== "undefined") {
      ride[k] = updates[k];
    }
  });

  const saved = await repo.save(ride);

  if (updates.id_conductor) {
    await historyService.addHistory(saved.id_viaje, "ASIGNACION", `Conductor asignado: ${updates.id_conductor}`);
    try {
      await publishEvent(eventTypes.RESERVA_ASIGNADA, { id_viaje: saved.id_viaje, id_conductor: updates.id_conductor });
    } catch (e) {
      console.warn("No se pudo publicar evento reserva_asignada:", e.message);
    }
  }

  if (updates.estado) {
    const accionMap = {
      PENDIENTE: "CREACION",
      ASIGNADO: "ASIGNACION",
      EN_PROGRESO: "INICIO",
      COMPLETADO: "FINALIZACION",
      CANCELADO: "CANCELACION"
    };
    const accion = accionMap[updates.estado] || "ACTUALIZACION";
    await historyService.addHistory(saved.id_viaje, accion, `Estado cambiado a ${updates.estado} por usuario ${user.id_usuario}`);


    if (updates.estado === "EN_PROGRESO") {
      await publishEvent(eventTypes.VIAJE_EN_PROGRESO, { id_viaje: saved.id_viaje });
    } else if (updates.estado === "COMPLETADO") {
      await publishEvent(eventTypes.VIAJE_COMPLETADO, { id_viaje: saved.id_viaje, id_cliente: saved.id_cliente, id_conductor: saved.id_conductor });
    } else if (updates.estado === "CANCELADO") {
      await publishEvent(eventTypes.VIAJE_CANCELADO, { id_viaje: saved.id_viaje, motivo: updates.motivo || "Cancelado por usuario" });
    }
  }

  if (!ride.origen || !ride.destino) {
  const err = new Error("Origen y destino no pueden estar vacíos");
  err.status = 400;
  throw err;
}

  return saved;
}

async function deleteRide(id_viaje, user) {
  const role = String(user.rol).toUpperCase();
  if (role !== "ADMIN") {
    const err = new Error("Permisos insuficientes para eliminar viajes");
    err.status = 403;
    throw err;
  }
  const repo = viajeRepo();
  const ride = await repo.findOne({ where: { id_viaje } });
  if (!ride) {
    const err = new Error("Viaje no encontrado");
    err.status = 404;
    throw err;
  }
  await repo.remove(ride);
  await historyService.addHistory(id_viaje, "ELIMINACION", `Viaje eliminado por admin ${user.id_usuario}`);
  
}

module.exports = {
  createRide,
  getAllRides,
  getRideById,
  updateRide,
  deleteRide
};
