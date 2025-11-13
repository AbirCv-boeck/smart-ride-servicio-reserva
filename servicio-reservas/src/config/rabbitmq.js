require("dotenv").config();
const amqp = require("amqplib");

let channel;

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectRabbitMQ(retries = 15, retryDelay = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const connection = await amqp.connect(process.env.RABBITMQ_URL);
      channel = await connection.createChannel();

      // Crear exchange
      await channel.assertExchange(process.env.RABBITMQ_EXCHANGE, "fanout", { durable: true });

      // Crear cola de prueba y enlazarla al exchange
      const q = await channel.assertQueue("cola_test", { durable: false });
      await channel.bindQueue(q.queue, process.env.RABBITMQ_EXCHANGE, "");

      // Consumir mensajes de la cola
      channel.consume(q.queue, (msg) => {
        if (msg) {
          console.log("📩 Mensaje recibido en cola_test:", msg.content.toString());
          channel.ack(msg);
        }
      });

      console.log("🐇 Conectado a RabbitMQ y cola 'cola_test' lista");
      return true;
    } catch (error) {
      console.error(`❌ Intento ${attempt} fallido al conectar RabbitMQ:`, error.message);
      if (attempt < retries) {
        console.log(`⏳ Reintentando en ${retryDelay / 1000} segundos...`);
        await delay(retryDelay);
      } else {
        console.error("❌ No se pudo conectar a RabbitMQ después de 15 intentos");
        return false;
      }
    }
  }
}

function publishEvent(event, data) {
  if (!channel) {
    console.error("❌ Canal RabbitMQ no disponible");
    return;
  }
  channel.publish(
    process.env.RABBITMQ_EXCHANGE,
    "",
    Buffer.from(JSON.stringify({ event, data }))
  );
  console.log(`📨 Evento publicado: ${event}`);
}

function isRabbitConnected() {
  return !!channel;
}

module.exports = { connectRabbitMQ, publishEvent, isRabbitConnected };
