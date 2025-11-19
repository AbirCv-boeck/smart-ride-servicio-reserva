// src/services/eventService.js
const publisher = require("../events/publisher");
const EventTypes = require("../events/eventTypes");

async function initEventPublisher() {
  const ok = await publisher.initializeRabbitMQ();
  if (!ok) {
    console.warn("⚠️ No se pudo inicializar el Event Publisher");
  }
  return ok;
}

async function publishEvent(eventType, payload = {}) {
  const channel = publisher.getChannel();

  if (!channel) {
    console.warn("⚠️ Canal RabbitMQ no disponible. Evento NO enviado:", eventType);
    return false;
  }

  return publisher.publishEvent(eventType, payload);
}

module.exports = {
  initEventPublisher,
  publishEvent,
  EventTypes
};
