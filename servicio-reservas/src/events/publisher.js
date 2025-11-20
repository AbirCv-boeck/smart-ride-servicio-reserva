const amqp = require('amqplib');

let channel = null;
let connection = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const EXCHANGE_NAME = process.env.RABBITMQ_EXCHANGE;
const EXCHANGE_TYPE = 'topic';

/**
 * Inicializar conexión con RabbitMQ
 */
async function initializeRabbitMQ() {
  try {
    console.log(`🐰 Conectando a RabbitMQ: ${RABBITMQ_URL}`);
    
    connection = await amqp.connect(RABBITMQ_URL, {
      heartbeat: 60,
      timeout: 30000
    });

    connection.on('error', (err) => {
      console.error('❌ Error en conexión RabbitMQ:', err);
    });

    connection.on('close', () => {
      console.warn('⚠️ Conexión RabbitMQ cerrada. Reintentando...');
      setTimeout(initializeRabbitMQ, 5000);
    });

    channel = await connection.createChannel();
    
    // Declarar exchange tipo 'topic' para routing flexible
    await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, {
      durable: true,
      autoDelete: false
    });

    console.log(`✅ RabbitMQ inicializado - Exchange: ${EXCHANGE_NAME} (${EXCHANGE_TYPE})`);
    
    return { connection, channel };
  } catch (error) {
    console.error('❌ Error al inicializar RabbitMQ:', error.message);
    console.log('🔄 Reintentando conexión en 5 segundos...');
    setTimeout(initializeRabbitMQ, 5000);
    throw error;
  }
}

/**
 * Publicar evento a RabbitMQ
 * @param {string} routingKey - Clave de routing (ej: 'ride.nueva_reserva')
 * @param {object} message - Mensaje a publicar
 */
async function publishEvent(routingKey, message) {
  if (!channel) {
    console.warn('⚠️ Canal RabbitMQ no disponible. Inicializando...');
    await initializeRabbitMQ();
  }

  try {
    //  Crear mensaje compatible con Python
    const payload = {
      ...message,
      timestamp: new Date().toISOString(), 
      service: 'reservas',
      routing_key: routingKey
    };

    const messageBuffer = Buffer.from(JSON.stringify(payload));
    
    const published = channel.publish(
      EXCHANGE_NAME,
      routingKey,
      messageBuffer,
      {
        persistent: true,
        contentType: 'application/json',
        deliveryMode: 2, 
        headers: {
          'x-source': 'reservas-service',
          'x-routing-key': routingKey
        }
      }
    );

    if (published) {
      console.log(`📤 Evento publicado: ${routingKey}`, {
        exchange: EXCHANGE_NAME,
        messageId: message.id_viaje || 'N/A',
        payload: JSON.stringify(payload).substring(0, 100) + '...'
      });
    } else {
      console.warn('⚠️ Buffer lleno. Evento en cola:', routingKey);
    }

    return published;
  } catch (error) {
    console.error(`❌ Error publicando evento ${routingKey}:`, error.message);
    throw error;
  }
}

/**
 * Cerrar conexión con RabbitMQ (graceful shutdown)
 */
async function closeRabbitMQ() {
  try {
    if (channel) {
      await channel.close();
      console.log('✅ Canal RabbitMQ cerrado');
    }
    if (connection) {
      await connection.close();
      console.log('✅ Conexión RabbitMQ cerrada');
    }
  } catch (error) {
    console.error('❌ Error cerrando RabbitMQ:', error);
  }
}

module.exports = {
  initializeRabbitMQ,
  publishEvent,
  closeRabbitMQ,
  getChannel: () => channel,
  getConnection: () => connection
};