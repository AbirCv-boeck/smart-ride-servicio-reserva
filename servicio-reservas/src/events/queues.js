module.exports = {
  EXCHANGE: process.env.RABBITMQ_EXCHANGE || "smart_ride_exchange",

  /**
   * Estas colas existen solo para pruebas internas del Ride Service.
   * Los microservicios externos (dispatch, payment, notification)
   * podrán usar estas MISMAS colas o crear las suyas.
   *
   * IMPORTANTE:
   * - No cambies estos nombres luego.
   * - Los otros equipos solo deben hacer "consume" desde aquí.
   */
  QUEUES: {
    // Será consumida por Dispatch Service para asignar conductores
    DISPATCH_NEW_RESERVAS: "queue.dispatch.nueva_reserva",

    // Será consumida por Payment Service para pagos
    PAYMENT_VIAJES: "queue.payment.viaje_completado",

    // Será consumida por Notification Service
    NOTIFICATION_ALL: "queue.notification.all",
  }
};
