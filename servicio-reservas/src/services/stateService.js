
const { AppDataSource } = require('../config/db');
const { Viaje } = require('../entities/viaje.js');
const { HistoryService } = require('./historyService');
const { publishEvent } = require('../services/eventService');

/**
 * Lógica para manejar transiciones de estado del viaje:
 * - acceptRide (PENDIENTE -> ASIGNADO)
 * - startRide  (ASIGNADO -> EN_PROGRESO)
 * - finishRide (EN_PROGRESO -> FINALIZADO)
 * - cancelRide (dependiendo del estado)
 */
class StateService {
  /**
   * Conductor acepta un viaje.
   * @param {number} id_viaje
   * @param {number} conductorId
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

      if (viaje.estado !== 'pendiente') {
        throw { status: 409, message: `Viaje no está en estado 'pendiente' (actual: ${viaje.estado})` };
      }

      // Asignar conductor y actualizar estado
      viaje.id_conductor = conductorId;
      viaje.estado = 'ASIGNADO';
      viaje.fecha_solicitud = viaje.fecha_solicitud || viaje.fecha_solicitud; // mantener
      await queryRunner.manager.save(viaje);

      await HistoryService.record({
        id_viaje: viaje.id_viaje,
        accion: 'ASIGNADO',
        detalle: `Viaje asignado al conductor ${conductorId}`,
        actor_id: conductorId,
        actor_rol: 'CONDUCTOR'
      });

      await queryRunner.commitTransaction();

      publishEvent('reserva_asignada', {
        id_viaje: viaje.id_viaje,
        id_conductor: viaje.id_conductor,
        estado: viaje.estado
      });

      return viaje;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (err && err.status) throw err;
      console.error('Error en acceptRide:', err);
      throw { status: 500, message: 'Error interno al aceptar viaje' };
    } finally {
      await queryRunner.release();
    }
  }

  
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

      if (!viaje) throw { status: 404, message: 'Viaje no encontrado' };

      if (viaje.id_conductor !== conductorId) {
        throw { status: 403, message: 'Conductor no autorizado para iniciar este viaje' };
      }

      if (viaje.estado !== 'asignado') {
        throw { status: 409, message: `No se puede iniciar el viaje desde el estado '${viaje.estado}'` };
      }

      viaje.estado = 'EN_PROGRESO';
      viaje.fecha_inicio = new Date();
      await queryRunner.manager.save(viaje);

      await HistoryService.record({
        id_viaje: viaje.id_viaje,
        accion: 'INICIADO',
        detalle: `Viaje iniciado por conductor ${conductorId}`,
        actor_id: conductorId,
        actor_rol: 'CONDUCTOR'
      });

      await queryRunner.commitTransaction();

      publishEvent('viaje_en_progreso', {
        id_viaje: viaje.id_viaje,
        id_conductor: viaje.id_conductor,
        fecha_inicio: viaje.fecha_inicio
      });

      return viaje;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (err && err.status) throw err;
      console.error('Error en startRide:', err);
      throw { status: 500, message: 'Error interno al iniciar viaje' };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Conductor finaliza el viaje. Debe ser el conductor asignado.
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

      if (!viaje) throw { status: 404, message: 'Viaje no encontrado' };

      if (viaje.id_conductor !== conductorId) {
        throw { status: 403, message: 'Conductor no autorizado para finalizar este viaje' };
      }

      if (viaje.estado !== 'en_progreso') {
        throw { status: 409, message: `No se puede finalizar el viaje desde el estado '${viaje.estado}'` };
      }

      viaje.estado = 'COMPLETADO';
      viaje.fecha_fin = new Date();
      await queryRunner.manager.save(viaje);

      await HistoryService.record({
        id_viaje: viaje.id_viaje,
        accion: 'FINALIZADO',
        detalle: `Viaje finalizado por conductor ${conductorId}`,
        actor_id: conductorId,
        actor_rol: 'CONDUCTOR'
      });

      await queryRunner.commitTransaction();

      publishEvent('viaje_finalizado', {
        id_viaje: viaje.id_viaje,
        id_conductor: viaje.id_conductor,
        fecha_fin: viaje.fecha_fin
      });

      return viaje;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (err && err.status) throw err;
      console.error('Error en finishRide:', err);
      throw { status: 500, message: 'Error interno al finalizar viaje' };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Pasajero cancela un viaje. Pueden existir reglas (si está asignado o en progreso).
   * @param {number} id_viaje
   * @param {number} pasajeroId
   * @param {string} motivo
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

      if (!viaje) throw { status: 404, message: 'Viaje no encontrado' };

      if (viaje.id_cliente !== pasajeroId) {
        throw { status: 403, message: 'Solo el pasajero que creó la reserva puede cancelarla' };
      }

      if (['finalizado', 'cancelado'].includes(viaje.estado)) {
        throw { status: 409, message: `No se puede cancelar un viaje en estado '${viaje.estado}'` };
      }

    
      if (viaje.estado === 'en_progreso') {
        throw { status: 409, message: 'No se puede cancelar un viaje que ya está en progreso' };
      }

      viaje.estado = 'CANCELADO';
      await queryRunner.manager.save(viaje);

      await HistoryService.record({
        id_viaje: viaje.id_viaje,
        accion: 'CANCELADO',
        detalle: `Reserva cancelada por pasajero ${pasajeroId}. Motivo: ${motivo}`,
        actor_id: pasajeroId,
        actor_rol: 'PASAJERO'
      });

      await queryRunner.commitTransaction();

      publishEvent('viaje_cancelado', {
        id_viaje: viaje.id_viaje,
        id_cliente: viaje.id_cliente,
        motivo
      });

      return viaje;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (err && err.status) throw err;
      console.error('Error en cancelRide:', err);
      throw { status: 500, message: 'Error interno al cancelar viaje' };
    } finally {
      await queryRunner.release();
    }
  }

 
  static async getHistory(id_viaje) {
    return HistoryService.getByRideId(id_viaje);
  }
}

module.exports = { StateService };
