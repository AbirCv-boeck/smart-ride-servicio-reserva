/**
 * Configuración de colas para el servicio de Reservas
 */

const QUEUE_NAMES = {
  
  // Solo consumir eventos de OTROS servicios
  DISPATCH_TO_RESERVAS: {
    name: 'dispatch_to_reservas',
    patterns: [
      'dispatch.asignacion_confirmada',
      'dispatch.conductor_disponible',
      'dispatch.asignacion_fallida'
    ],
    description: 'Eventos desde Despacho hacia Reservas'
  },

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
