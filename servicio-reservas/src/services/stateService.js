const { AppDataSource } = require('../config/db');
const { Viaje } = require('../entities/viaje.js');
const { ReservaHistorial } = require('../entities/reservaHistorial.js');
const { record: recordHistory, getByRideId } = require('./historyService');
const { publishEvent } = require('../services/eventService');

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
   * @param {number} conductorId - ID del conductor
   * @returns {Promise<Object>} Viaje actualizado
   */
  static async acceptRide(id_viaje, conductorId) {
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

      if (viaje.estado !== 'PENDIENTE') {
        throw { 
          status: 409, 
          message: `Viaje no está en estado PENDIENTE (actual: ${viaje.estado})` 
        };
      }

      // Asignar conductor y actualizar estado
      viaje.id_conductor = conductorId;
      viaje.estado = 'ASIGNADO';
      viaje.fecha_asignacion = new Date();
      
      //  Especificar entidad al guardar
      await queryRunner.manager.save(Viaje, viaje);

      // Registrar en historial
      const historialRepo = queryRunner.manager.getRepository(ReservaHistorial);
      const historialEntry = historialRepo.create({
        viaje: { id_viaje: viaje.id_viaje },
        accion: 'ASIGNADO',
        detalle: `Viaje asignado al conductor ${conductorId}`,
        actor_id: conductorId,
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

      console.log(`✅ Viaje ${id_viaje} asignado a conductor ${conductorId}`);

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
   * @param {number} conductorId - ID del conductor
   * @returns {Promise<Object>} Viaje actualizado
   */
  static async startRide(id_viaje, conductorId) {
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

      if (viaje.id_conductor !== conductorId) {
        throw { 
          status: 403, 
          message: 'Conductor no autorizado para iniciar este viaje' 
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
      
      //  Especificar entidad
      await queryRunner.manager.save(Viaje, viaje);

      // Registrar en historial
      const historialRepo = queryRunner.manager.getRepository(ReservaHistorial);
      const historialEntry = historialRepo.create({
        viaje: { id_viaje: viaje.id_viaje },
        accion: 'INICIADO',
        detalle: `Viaje iniciado por conductor ${conductorId}`,
        actor_id: conductorId,
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
   * @param {number} conductorId - ID del conductor
   * @returns {Promise<Object>} Viaje actualizado
   */
  static async finishRide(id_viaje, conductorId) {
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

      if (viaje.id_conductor !== conductorId) {
        throw { 
          status: 403, 
          message: 'Conductor no autorizado para finalizar este viaje' 
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
      
      //  Especificar entidad
      await queryRunner.manager.save(Viaje, viaje);

      // Registrar en historial
      const historialRepo = queryRunner.manager.getRepository(ReservaHistorial);
      const historialEntry = historialRepo.create({
        viaje: { id_viaje: viaje.id_viaje },
        accion: 'FINALIZADO',
        detalle: `Viaje finalizado por conductor ${conductorId}`,
        actor_id: conductorId,
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
        throw { 
          status: 403, 
          message: 'Solo el pasajero que creó la reserva puede cancelarla' 
        };
      }

      if (['COMPLETADO', 'CANCELADO'].includes(viaje.estado)) {
        throw { 
          status: 409, 
          message: `No se puede cancelar un viaje en estado '${viaje.estado}'` 
        };
      }

      if (viaje.estado === 'EN_PROGRESO') {
        throw { 
          status: 409, 
          message: 'No se puede cancelar un viaje que ya está en progreso' 
        };
      }

      viaje.estado = 'CANCELADO';
      viaje.motivo_cancelacion = motivo || 'Cancelado por pasajero';
      
      //  Especificar entidad
      await queryRunner.manager.save(Viaje, viaje);

      // Registrar en historial
      const historialRepo = queryRunner.manager.getRepository(ReservaHistorial);
      const historialEntry = historialRepo.create({
        viaje: { id_viaje: viaje.id_viaje },
        accion: 'CANCELADO',
        detalle: `Reserva cancelada. Motivo: ${viaje.motivo_cancelacion}`,
        actor_id: pasajeroId,
        actor_rol: 'PASAJERO'
      });
      await historialRepo.save(historialEntry);

      await queryRunner.commitTransaction();

      publishEvent('ride.viaje_cancelado', {
        id_viaje: viaje.id_viaje,
        id_cliente: viaje.id_cliente,
        motivo: viaje.motivo_cancelacion
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
