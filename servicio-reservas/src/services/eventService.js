// src/services/eventService.js
const publisher = require("../events/publisher");
const EventTypes = require("../events/eventTypes");

// Inicializa publisher al levantar el servicio
async function initEventPublisher() {
  const ok = await publisher.connect();
  if (!ok) {
    console.warn("⚠️ No se pudo inicializar el Event Publisher");
  }
  return ok;
}

// Wrapper para publicar eventos desde cualquier módulo
async function publishEvent(eventType, payload = {}) {
  if (!publisher.isConnected()) {
    console.warn("⚠️ Publisher no conectado. Evento NO enviado:", eventType);
    return false;
  }

  return publisher.publish(eventType, payload);
}

module.exports = {
  initEventPublisher,
  publishEvent,
  EventTypes
};
