/**
 * Tipos de eventos publicados por el servicio de Reservas
 * 
 * Nomenclatura: <entidad>.<acción>
 */

const EVENT_TYPES = {
  // Eventos de viajes
  NUEVA_RESERVA: 'ride.nueva_reserva',
  RESERVA_ASIGNADA: 'ride.reserva_asignada',
  VIAJE_EN_PROGRESO: 'ride.viaje_en_progreso',
  VIAJE_COMPLETADO: 'ride.viaje_completado',
  VIAJE_CANCELADO: 'ride.viaje_cancelado',

  // Eventos de preferencias
  PREFERENCIAS_ACTUALIZADAS: 'ride.preferencias_actualizadas',

  // Eventos de errores
  ERROR_RESERVA: 'ride.error_reserva'
};

module.exports = EVENT_TYPES;
