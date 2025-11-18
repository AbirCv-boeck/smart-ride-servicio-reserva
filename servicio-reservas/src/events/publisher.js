const amqp = require("amqplib");
const { EXCHANGE, QUEUES } = require("./queues");
const EventTypes = require("./eventTypes");

let connection = null;
let channel = null;

async function connect(retries = 15, retryDelay = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672");
      channel = await connection.createChannel();

      // Exchange general del ecosistema
      await channel.assertExchange(EXCHANGE, "topic", { durable: true });

      /**
       * Por ahora el Ride Service creará solo sus colas base,
       * pero NO consumirá nada.
       *
       * Los otros microservicios NO deben crear sus exchanges,
       * solo usar este y sus routing keys.
       */
      await channel.assertQueue(QUEUES.DISPATCH_NEW_RESERVAS, { durable: true });
      await channel.assertQueue(QUEUES.PAYMENT_VIAJES, { durable: true });
      await channel.assertQueue(QUEUES.NOTIFICATION_ALL, { durable: true });

      /**
       * Enlaces de routing:
       * Estas reglas definen qué eventos van a cada microservicio.
       * NO TOCAR. Los demás microservicios dependerán de esto.
       */
      await channel.bindQueue(QUEUES.DISPATCH_NEW_RESERVAS, EXCHANGE, "ride.nueva_reserva");
      await channel.bindQueue(QUEUES.PAYMENT_VIAJES, EXCHANGE, "ride.viaje_completado");

      // Notificaciones recibirá TODO
      await channel.bindQueue(QUEUES.NOTIFICATION_ALL, EXCHANGE, "ride.*");

      console.log("🐇 Publisher conectado a RabbitMQ (topic exchange).");
      return true;

    } catch (err) {
      console.error(`RabbitMQ connect attempt ${attempt} failed:`, err.message);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, retryDelay));
      } else {
        return false;
      }
    }
  }
}

function isConnected() {
  return !!channel;
}

function publish(eventType, payload = {}) {
  if (!channel) {
    console.error("❌ RabbitMQ no disponible. Evento no enviado:", eventType);
    return false;
  }

  const body = Buffer.from(JSON.stringify({
    event: eventType,
    data: payload,
    timestamp: new Date().toISOString(),
  }));

  try {
    channel.publish(EXCHANGE, eventType, body, { persistent: true });
    console.log(`📨 Evento publicado: ${eventType}`);
    return true;

  } catch (err) {
    console.error("Error publicando evento:", err);
    return false;
  }
}

module.exports = { connect, publish, isConnected, EventTypes };
