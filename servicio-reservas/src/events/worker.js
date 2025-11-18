// src/events/worker.js
const { eventQueue } = require("./queue");
const EventTypes = require("./eventTypes");

console.log("⚙️ Event Worker iniciado...");

const handlers = {
  [EventTypes.RESERVATION_CREATED]: async (event) => {
    console.log("📌 [Worker] Reserva creada:", event.payload);
  },

  [EventTypes.RESERVATION_CANCELLED]: async (event) => {
    console.log("📌 [Worker] Reserva cancelada:", event.payload);
  },

  [EventTypes.DRIVER_ASSIGNED]: async (event) => {
    console.log("🚗 [Worker] Conductor asignado:", event.payload);
    // Aquí se notifica al servicio de conductores
  },

  [EventTypes.RIDE_STARTED]: async (event) => {
    console.log("▶️ [Worker] Viaje iniciado:", event.payload);
  },

  [EventTypes.RIDE_COMPLETED]: async (event) => {
    console.log("🏁 [Worker] Viaje completado:", event.payload);

    // EJEMPLO: notificar al servicio de pagos
    console.log("💰 [Worker] Solicitando pago...");
  },

  [EventTypes.PAYMENT_REQUESTED]: async (event) => {
    console.log("💸 [Worker] Procesando solicitud de pago:", event.payload);
  }
};


async function processQueue() {
  if (eventQueue.size() === 0) return;

  const event = eventQueue.pop();
  if (!event) return;

  try {
    const handler = handlers[event.type];
    if (handler) {
      await handler(event);
    } else {
      console.warn("⚠️ [Worker] No hay handler para:", event.type);
    }
  } catch (err) {
    console.error("❌ Error procesando evento:", err);
  }
}

setInterval(processQueue, 200);

module.exports = {};
