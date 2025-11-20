const { AppDataSource } = require('../config/db');
const { Viaje } = require('../entities/viaje.js');
const { ReservaHistorial } = require('../entities/reservaHistorial.js');
const { record: recordHistory, getByRideId } = require('./historyService');
const { publishEvent } = require('../services/eventService');
const { UsersClient } = require('../clients/usersClient'); // ✅ IMPORTAR CLIENTE HTTP

/**
 *  HELPER: Obtener id_conductor desde id_usuario (vía HTTP a Users Service)
 * @param {number} id_usuario - ID del usuario
 * @returns {Promise<number|null>} ID del conductor o null
 */
async function getConductorIdByUserId(id_usuario) {
  try {
    console.log(`🔍 [GET_CONDUCTOR] Consultando Users Service para usuario ${id_usuario}`);
    
    const conductorData = await UsersClient.getConductorByUserId(id_usuario);
    
    if (!conductorData) {
      console.warn(`⚠️ [GET_CONDUCTOR] No se encontró conductor para usuario ${id_usuario}`);
      return null;
    }

    console.log(`✅ [GET_CONDUCTOR] Usuario ${id_usuario} → Conductor ${conductorData.id_conductor}`);
    return conductorData.id_conductor;
  } catch (error) {
    console.error(`❌ [GET_CONDUCTOR] Error obteniendo id_conductor para usuario ${id_usuario}:`, error.message);
    return null;
  }
}

/**
 * Lógica para manejar transiciones de estado del viaje:
 * - acceptRide (PENDIENTE -> ASIGNADO)
 * - startRide  (ASIGNADO -> EN_PROGRESO)
 * - finishRide (EN_PROGRESO -> COMPLETADO)
 * - cancelRide (dependiendo del estado)
 */
class StateService {
  /**
   * Conductor acepta un viaje
   * @param {number} id_viaje - ID del viaje
   * @param {number} id_usuario_conductor - ID del USUARIO conductor (del JWT)
   * @returns {Promise<Object>} Viaje actualizado
   */
  static async acceptRide(id_viaje, id_usuario_conductor) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      // Obtener id_conductor vía HTTP
      const id_conductor = await getConductorIdByUserId(id_usuario_conductor);
      
      if (!id_conductor) {
        throw { 
          status: 404, 
          message: `No se encontró perfil de conductor para usuario ${id_usuario_conductor}` 
        };
      }

      console.log(`🔍 [ACCEPT_RIDE] Usuario ${id_usuario_conductor} → Conductor ${id_conductor}`);

      const viaje = await queryRunner.manager
        .createQueryBuilder(Viaje, 'v')
        .setLock('pessimistic_write')
        .where('v.id_viaje = :id', { id: parseInt(id_viaje) })
        .getOne();

      if (!viaje) {
        throw { status: 404, message: 'Viaje no encontrado' };
      }

      if (viaje.estado !== 'PENDIENTE') {
        throw { 
          status: 409, 
          message: `Viaje no está en estado PENDIENTE (actual: ${viaje.estado})` 
        };
      }

      // Asignar conductor
      viaje.id_conductor = id_conductor;
      viaje.estado = 'ASIGNADO';
      viaje.fecha_asignacion = new Date();
      
      await queryRunner.manager.save(Viaje, viaje);

      // Registrar en historial
      const historialRepo = queryRunner.manager.getRepository(ReservaHistorial);
      const historialEntry = historialRepo.create({
        viaje: { id_viaje: viaje.id_viaje },
        accion: 'ASIGNADO',
        detalle: `Viaje asignado al conductor ${id_conductor} (usuario ${id_usuario_conductor})`,
        actor_id: id_usuario_conductor,
        actor_rol: 'CONDUCTOR'
      });
      await historialRepo.save(historialEntry);

      await queryRunner.commitTransaction();

      publishEvent('ride.reserva_asignada', {
        id_viaje: viaje.id_viaje,
        id_conductor: viaje.id_conductor,
        estado: viaje.estado,
        fecha_asignacion: viaje.fecha_asignacion
      });

      console.log(`✅ Viaje ${id_viaje} asignado a conductor ${id_conductor}`);

      return viaje;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (err && err.status) throw err;
      console.error('❌ Error en acceptRide:', err);
      throw { status: 500, message: 'Error interno al aceptar viaje' };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Conductor inicia un viaje
   * @param {number} id_viaje - ID del viaje
   * @param {number} id_usuario_conductor - ID del USUARIO conductor (del JWT)
   * @returns {Promise<Object>} Viaje actualizado
   */
  static async startRide(id_viaje, id_usuario_conductor) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      // : Obtener id_conductor vía HTTP
      const id_conductor = await getConductorIdByUserId(id_usuario_conductor);
      
      if (!id_conductor) {
        throw { 
          status: 404, 
          message: `No se encontró perfil de conductor para usuario ${id_usuario_conductor}` 
        };
      }

      console.log(`🔍 [START_RIDE] Usuario ${id_usuario_conductor} → Conductor ${id_conductor}`);

      const viaje = await queryRunner.manager
        .createQueryBuilder(Viaje, 'v')
        .setLock('pessimistic_write')
        .where('v.id_viaje = :id', { id: parseInt(id_viaje) })
        .getOne();

      if (!viaje) {
        throw { status: 404, message: 'Viaje no encontrado' };
      }

      //  VALIDAR con id_conductor (NO con id_usuario)
      if (viaje.id_conductor !== id_conductor) {
        throw { 
          status: 403, 
          message: `Conductor no autorizado. Viaje asignado a conductor ${viaje.id_conductor}, recibido ${id_conductor}` 
        };
      }

      if (viaje.estado !== 'ASIGNADO') {
        throw { 
          status: 409, 
          message: `No se puede iniciar el viaje desde el estado '${viaje.estado}'` 
        };
      }

      viaje.estado = 'EN_PROGRESO';
      viaje.fecha_inicio = new Date();
      
      await queryRunner.manager.save(Viaje, viaje);

      // Registrar en historial
      const historialRepo = queryRunner.manager.getRepository(ReservaHistorial);
      const historialEntry = historialRepo.create({
        viaje: { id_viaje: viaje.id_viaje },
        accion: 'INICIADO',
        detalle: `Viaje iniciado por conductor ${id_conductor} (usuario ${id_usuario_conductor})`,
        actor_id: id_usuario_conductor,
        actor_rol: 'CONDUCTOR'
      });
      await historialRepo.save(historialEntry);

      await queryRunner.commitTransaction();

      publishEvent('ride.viaje_en_progreso', {
        id_viaje: viaje.id_viaje,
        id_conductor: viaje.id_conductor,
        fecha_inicio: viaje.fecha_inicio
      });

      console.log(`✅ Viaje ${id_viaje} iniciado`);

      return viaje;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (err && err.status) throw err;
      console.error('❌ Error en startRide:', err);
      throw { status: 500, message: 'Error interno al iniciar viaje' };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Conductor finaliza el viaje
   * @param {number} id_viaje - ID del viaje
   * @param {number} id_usuario_conductor - ID del USUARIO conductor (del JWT)
   * @returns {Promise<Object>} Viaje actualizado
   */
  static async finishRide(id_viaje, id_usuario_conductor) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      //: Obtener id_conductor vía HTTP
      const id_conductor = await getConductorIdByUserId(id_usuario_conductor);
      
      if (!id_conductor) {
        throw { 
          status: 404, 
          message: `No se encontró perfil de conductor para usuario ${id_usuario_conductor}` 
        };
      }

      console.log(`🔍 [FINISH_RIDE] Usuario ${id_usuario_conductor} → Conductor ${id_conductor}`);

      const viaje = await queryRunner.manager
        .createQueryBuilder(Viaje, 'v')
        .setLock('pessimistic_write')
        .where('v.id_viaje = :id', { id: parseInt(id_viaje) })
        .getOne();

      if (!viaje) {
        throw { status: 404, message: 'Viaje no encontrado' };
      }

      // VALIDAR con id_conductor (NO con id_usuario)
      if (viaje.id_conductor !== id_conductor) {
        throw { 
          status: 403, 
          message: `Conductor no autorizado. Viaje asignado a conductor ${viaje.id_conductor}, recibido ${id_conductor}` 
        };
      }

      if (viaje.estado !== 'EN_PROGRESO') {
        throw { 
          status: 409, 
          message: `No se puede finalizar el viaje desde el estado '${viaje.estado}'` 
        };
      }

      viaje.estado = 'COMPLETADO';
      viaje.fecha_fin = new Date();
      
      await queryRunner.manager.save(Viaje, viaje);

      // Registrar en historial
      const historialRepo = queryRunner.manager.getRepository(ReservaHistorial);
      const historialEntry = historialRepo.create({
        viaje: { id_viaje: viaje.id_viaje },
        accion: 'FINALIZADO',
        detalle: `Viaje finalizado por conductor ${id_conductor} (usuario ${id_usuario_conductor})`,
        actor_id: id_usuario_conductor,
        actor_rol: 'CONDUCTOR'
      });
      await historialRepo.save(historialEntry);

      await queryRunner.commitTransaction();

      publishEvent('ride.viaje_completado', {
        id_viaje: viaje.id_viaje,
        id_conductor: viaje.id_conductor,
        id_cliente: viaje.id_cliente,
        fecha_fin: viaje.fecha_fin
      });

      console.log(`✅ Viaje ${id_viaje} completado`);

      return viaje;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (err && err.status) throw err;
      console.error('❌ Error en finishRide:', err);
      throw { status: 500, message: 'Error interno al finalizar viaje' };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Pasajero cancela un viaje
   * @param {number} id_viaje - ID del viaje
   * @param {number} pasajeroId - ID del pasajero
   * @param {string} motivo - Motivo de cancelación
   * @returns {Promise<Object>} Viaje actualizado
   */
  static async cancelRide(id_viaje, pasajeroId, motivo = '') {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      const viaje = await queryRunner.manager
        .createQueryBuilder(Viaje, 'v')
        .setLock('pessimistic_write')
        .where('v.id_viaje = :id', { id: parseInt(id_viaje) })
        .getOne();

      if (!viaje) {
        throw { status: 404, message: 'Viaje no encontrado' };
      }

      if (viaje.id_cliente !== pasajeroId) {
        throw { status: 403, message: 'Solo el pasajero puede cancelar este viaje' };
      }

      if (['EN_PROGRESO', 'COMPLETADO'].includes(viaje.estado)) {
        throw { 
          status: 409, 
          message: `No se puede cancelar un viaje en estado '${viaje.estado}'` 
        };
      }

      viaje.estado = 'CANCELADO';
      viaje.motivo_cancelacion = motivo;
      
      await queryRunner.manager.save(Viaje, viaje);

      const historialRepo = queryRunner.manager.getRepository(ReservaHistorial);
      const historialEntry = historialRepo.create({
        viaje: { id_viaje: viaje.id_viaje },
        accion: 'CANCELADO',
        detalle: `Viaje cancelado por pasajero: ${motivo}`,
        actor_id: pasajeroId,
        actor_rol: 'PASAJERO'
      });
      await historialRepo.save(historialEntry);

      await queryRunner.commitTransaction();

      publishEvent('ride.viaje_cancelado', {
        id_viaje: viaje.id_viaje,
        id_cliente: viaje.id_cliente,
        motivo: motivo,
        timestamp: new Date()
      });

      console.log(`✅ Viaje ${id_viaje} cancelado`);

      return viaje;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (err && err.status) throw err;
      console.error('❌ Error en cancelRide:', err);
      throw { status: 500, message: 'Error interno al cancelar viaje' };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Obtener historial de un viaje
   * @param {number} id_viaje - ID del viaje
   * @returns {Promise<Array>} Historial del viaje
   */
  static async getHistory(id_viaje) {
    return getByRideId(id_viaje);
  }
}

module.exports = { StateService };
