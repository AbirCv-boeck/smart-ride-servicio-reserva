const { AppDataSource } = require('../config/db');
const { ReservaHistorial } = require('../entities/reservaHistorial');

const historialRepo = () => AppDataSource.getRepository(ReservaHistorial);

/**
 * Registrar acción en el historial (método legacy)
 * @deprecated Usar record() en su lugar
 */
async function addHistory(id_viaje, accion, detalle = '') {
  const repo = historialRepo();
  const entry = repo.create({
    viaje: { id_viaje },
    accion,
    detalle
  });
  return repo.save(entry);
}

/**
 * Registrar acción en el historial con información del actor
 * @param {Object} params
 * @param {number} params.id_viaje - ID del viaje
 * @param {string} params.accion - Tipo de acción
 * @param {string} params.detalle - Detalle de la acción
 * @param {number} params.actor_id - ID del usuario que realizó la acción
 * @param {string} params.actor_rol - Rol del usuario (PASAJERO, CONDUCTOR, ADMIN, SISTEMA)
 */
async function record({ id_viaje, accion, detalle, actor_id = null, actor_rol = null }) {
  const repo = historialRepo();
  const entry = repo.create({
    viaje: { id_viaje },
    accion,
    detalle,
    actor_id,
    actor_rol: actor_rol ? String(actor_rol).toUpperCase() : null
  });
  
  console.log(`📝 Registrando historial: ${accion} para viaje ${id_viaje} por ${actor_rol || 'SISTEMA'}`);
  
  return repo.save(entry);
}

/**
 * Obtener historial de un viaje
 * @param {number} id_viaje - ID del viaje
 * @returns {Promise<Array>} Historial ordenado por fecha descendente
 */
async function getByRideId(id_viaje) {
  const repo = historialRepo();
  return repo.find({
    where: { viaje: { id_viaje } },
    order: { fecha_accion: 'DESC' }
  });
}

module.exports = {
  addHistory, // Legacy
  record,
  getByRideId
};
