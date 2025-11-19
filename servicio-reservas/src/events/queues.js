/**
 * Configuración de colas para el servicio de Reservas
 * 
 * Topología:
 * - Un solo Exchange tipo 'topic': smart_ride_exchange
 * - Routing keys con patrón: <servicio>.<acción>
 * - Cada servicio tiene sus propias colas
 */

const QUEUE_NAMES = {
  // Cola para eventos que van DESDE Reservas hacia otros servicios
  RESERVAS_EVENTS: {
    name: 'reservas_events',
    patterns: [
      'ride.nueva_reserva',
      'ride.reserva_asignada',
      'ride.viaje_en_progreso',
      'ride.viaje_completado',
      'ride.viaje_cancelado'
    ],
    description: 'Eventos emitidos por el servicio de reservas'
  },

  // Cola para eventos que vienen DESDE Despacho hacia Reservas
  DISPATCH_TO_RESERVAS: {
    name: 'dispatch_to_reservas',
    patterns: [
      'dispatch.asignacion_confirmada',
      'dispatch.conductor_disponible',
      'dispatch.asignacion_fallida'
    ],
    description: 'Eventos desde Despacho hacia Reservas'
  },

  // Cola para eventos que vienen DESDE Pagos hacia Reservas (futuro)
  PAGOS_TO_RESERVAS: {
    name: 'pagos_to_reservas',
    patterns: [
      'payment.pago_completado',
      'payment.pago_fallido',
      'payment.pago_reembolsado'
    ],
    description: 'Eventos desde Pagos hacia Reservas'
  }
};

module.exports = {
  QUEUE_NAMES
};
