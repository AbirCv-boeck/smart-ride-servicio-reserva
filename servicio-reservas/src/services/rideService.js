const { AppDataSource } = require("../config/db");
const { Viaje } = require("../entities/viaje");
const { ReservaHistorial } = require("../entities/reservaHistorial");
const preferenceService = require("./preferenceService");
const historyService = require("./historyService");
const { publishEvent } = require("./eventService");
const eventTypes = require("../events/eventTypes");

const viajeRepo = () => AppDataSource.getRepository(Viaje);

/**
 * Crear un nuevo viaje
 * @param {Object} payload - Datos del viaje
 * @param {number} id_cliente - ID del cliente que solicita el viaje
 * @returns {Promise<Object>} Viaje creado
 */
async function createRide(payload, id_cliente) {
  if (!payload || !payload.origen || !payload.destino) {
    const err = new Error("Faltan campos obligatorios: origen y destino");
    err.status = 400;
    throw err;
  }

  //  Evitar transacciones anidadas usando queryRunner directamente
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const viajeToSave = {
      id_cliente,
      origen: payload.origen.trim(),
      destino: payload.destino.trim(),
      estado: "PENDIENTE"
    };

    // Guardar viaje
    const saved = await queryRunner.manager.getRepository(Viaje).save(viajeToSave);

    // Registrar en historial dentro de la MISMA transacción
    const historialRepo = queryRunner.manager.getRepository(ReservaHistorial);
    const historialEntry = historialRepo.create({
      viaje: { id_viaje: saved.id_viaje },
      accion: "CREACION",
      detalle: `Reserva creada: ${saved.origen} → ${saved.destino}`,
      actor_id: id_cliente,
      actor_rol: "PASAJERO"
    });
    await historialRepo.save(historialEntry);

    console.log(`📝 Historial registrado para viaje ${saved.id_viaje}`);

    // Commit de la transacción
    await queryRunner.commitTransaction();

    // ✅ Obtener preferencias FUERA de la transacción
    const preferencias = await preferenceService.getPreferencesByCliente(id_cliente);

    // Publicar evento a RabbitMQ
    const eventPayload = {
      id_viaje: saved.id_viaje,
      id_cliente,
      origen: saved.origen,
      destino: saved.destino,
      preferencias: preferencias || null,
      fecha_solicitud: saved.fecha_solicitud
    };

    try {
      await publishEvent(eventTypes.NUEVA_RESERVA, eventPayload);
      console.log(`✅ Evento publicado: nueva_reserva para viaje ${saved.id_viaje}`);
    } catch (e) {
      console.warn("⚠️ No se pudo publicar evento nueva_reserva:", e.message);
    }

    return saved;

  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Error creando viaje:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

/**
 * Obtener todos los viajes según el rol del usuario
 * @param {Object} user - Usuario autenticado
 * @returns {Promise<Array>} Lista de viajes
 */
async function getAllRides(user, filters = {}) {
  const repo = viajeRepo();
  const role = String(user.rol).toUpperCase();

  let queryBuilder = repo.createQueryBuilder("viaje");

  // Aplicar filtros por rol
  if (role === "ADMIN") {
    // Admin ve todos los viajes
  } else if (role === "PASAJERO") {
    queryBuilder = queryBuilder.where("viaje.id_cliente = :userId", { userId: user.id_usuario });
  } else if (role === "CONDUCTOR") {
    queryBuilder = queryBuilder.where("viaje.id_conductor = :userId", { userId: user.id_usuario });
  } else {
    return [];
  }

  // Aplicar filtros adicionales
  if (filters.estado) {
    queryBuilder = queryBuilder.andWhere("viaje.estado = :estado", { estado: filters.estado });
  }

  // Paginación
  if (filters.limit) {
    queryBuilder = queryBuilder.take(filters.limit);
  }
  if (filters.offset) {
    queryBuilder = queryBuilder.skip(filters.offset);
  }

  // Ordenar por fecha descendente
  queryBuilder = queryBuilder.orderBy("viaje.fecha_solicitud", "DESC");

  return queryBuilder.getMany();
}

/**
 * Obtener un viaje por ID
 * @param {number} id_viaje - ID del viaje
 * @param {Object} user - Usuario autenticado
 * @returns {Promise<Object>} Viaje encontrado
 */
async function getRideById(id_viaje, user) {
  const repo = viajeRepo();
  const ride = await repo.findOne({ where: { id_viaje } });
  
  if (!ride) {
    return null;
  }

  const role = String(user.rol).toUpperCase();

  // Verificar permisos
  if (role === "ADMIN") {
    return ride;
  }
  
  if (role === "PASAJERO" && ride.id_cliente === user.id_usuario) {
    return ride;
  }
  
  if (role === "CONDUCTOR" && ride.id_conductor === user.id_usuario) {
    return ride;
  }

  const err = new Error("Permisos insuficientes para ver este viaje");
  err.status = 403;
  throw err;
}

/**
 * Actualizar un viaje (solo Admin o Conductor asignado)
 * @param {number} id_viaje - ID del viaje
 * @param {Object} updates - Campos a actualizar
 * @param {Object} user - Usuario autenticado
 * @returns {Promise<Object>} Viaje actualizado
 */
async function updateRide(id_viaje, updates, user) {
  const repo = viajeRepo();
  const ride = await repo.findOne({ where: { id_viaje } });
  
  if (!ride) {
    const err = new Error("Viaje no encontrado");
    err.status = 404;
    throw err;
  }

  const role = String(user.rol).toUpperCase();

  // Solo ADMIN o CONDUCTOR asignado pueden actualizar
  if (role === "CONDUCTOR" && ride.id_conductor && ride.id_conductor !== user.id_usuario) {
    const err = new Error("Conductor no autorizado para modificar este viaje");
    err.status = 403;
    throw err;
  }

  // Campos permitidos para actualización
  const allowed = ["id_conductor", "estado", "fecha_inicio", "fecha_fin"];
  allowed.forEach((k) => {
    if (typeof updates[k] !== "undefined") {
      ride[k] = updates[k];
    }
  });

  const saved = await repo.save(ride);

  // Registrar cambios en historial
  if (updates.id_conductor && updates.id_conductor !== ride.id_conductor) {
    await historyService.record({
      id_viaje: saved.id_viaje,
      accion: "ASIGNACION",
      detalle: `Conductor asignado: ${updates.id_conductor}`,
      actor_id: user.id_usuario,
      actor_rol: role
    });

    try {
      await publishEvent(eventTypes.RESERVA_ASIGNADA, { 
        id_viaje: saved.id_viaje, 
        id_conductor: updates.id_conductor 
      });
    } catch (e) {
      console.warn("⚠️ No se pudo publicar evento reserva_asignada:", e.message);
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
    
    await historyService.record({
      id_viaje: saved.id_viaje,
      accion,
      detalle: `Estado cambiado a ${updates.estado}`,
      actor_id: user.id_usuario,
      actor_rol: role
    });

    // Publicar eventos según el estado
    if (updates.estado === "EN_PROGRESO") {
      await publishEvent(eventTypes.VIAJE_EN_PROGRESO, { id_viaje: saved.id_viaje });
    } else if (updates.estado === "COMPLETADO") {
      await publishEvent(eventTypes.VIAJE_COMPLETADO, { 
        id_viaje: saved.id_viaje, 
        id_cliente: saved.id_cliente, 
        id_conductor: saved.id_conductor 
      });
    } else if (updates.estado === "CANCELADO") {
      await publishEvent(eventTypes.VIAJE_CANCELADO, { 
        id_viaje: saved.id_viaje, 
        motivo: updates.motivo_cancelacion || "Cancelado por usuario" 
      });
    }
  }

  // Validar que origen y destino no estén vacíos
  if (!saved.origen || !saved.destino) {
    const err = new Error("Origen y destino no pueden estar vacíos");
    err.status = 400;
    throw err;
  }

  return saved;
}

/**
 * Eliminar un viaje (solo Admin)
 * @param {number} id_viaje - ID del viaje
 * @param {Object} user - Usuario autenticado
 */
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

  //  Registrar ANTES de eliminar
  await historyService.record({
    id_viaje,
    accion: "ELIMINACION",
    detalle: `Viaje eliminado por admin`,
    actor_id: user.id_usuario,
    actor_rol: "ADMIN"
  });

  // Ahora sí eliminar (CASCADE borrará el historial automáticamente)
  await repo.remove(ride);
}

module.exports = {
  createRide,
  getAllRides,
  getRideById,
  updateRide,
  deleteRide
};
