const { getChannel } = require('./publisher');
const { QUEUE_NAMES } = require('./queues');

const EXCHANGE_NAME = process.env.RABBITMQ_EXCHANGE;

/**
 * Iniciar worker para consumir eventos
 */
async function startWorker() {
  try {
    const channel = getChannel();
    
    if (!channel) {
      throw new Error('Canal RabbitMQ no disponible');
    }

    //  SOLO declarar colas para RECIBIR eventos de otros servicios
    for (const queueConfig of Object.values(QUEUE_NAMES)) {
      await channel.assertQueue(queueConfig.name, {
        durable: true,
        arguments: {
          'x-message-ttl': 86400000,
          'x-max-length': 10000
        }
      });

      for (const pattern of queueConfig.patterns) {
        await channel.bindQueue(queueConfig.name, EXCHANGE_NAME, pattern);
        console.log(`🔗 Queue '${queueConfig.name}' enlazada con pattern '${pattern}'`);
      }
    }

    // Consumir eventos desde la cola de despacho
    await consumeDispatchEvents(channel);

    console.log('✅ Worker de eventos iniciado');

  } catch (error) {
    console.error('❌ Error iniciando worker:', error);
    throw error;
  }
}

/**
 * Consumir eventos del servicio de despacho
 */
async function consumeDispatchEvents(channel) {
  const queueName = QUEUE_NAMES.DISPATCH_TO_RESERVAS.name;

  await channel.consume(
    queueName,
    async (msg) => {
      if (!msg) return;

      try {
        const routingKey = msg.fields.routingKey;
        const content = JSON.parse(msg.content.toString());

        console.log(`📥 Evento recibido: ${routingKey}`, content);

        switch (routingKey) {
          case 'dispatch.asignacion_confirmada':
            await handleAsignacionConfirmada(content);
            break;
          
          case 'dispatch.conductor_disponible':
            await handleConductorDisponible(content);
            break;

          default:
            console.warn(`⚠️ Evento no manejado: ${routingKey}`);
        }

        channel.ack(msg);

      } catch (error) {
        console.error('❌ Error procesando mensaje:', error);
        channel.nack(msg, false, false);
      }
    },
    {
      noAck: false,
      prefetch: 10
    }
  );

  console.log(`👂 Escuchando eventos en cola: ${queueName}`);
}

/**
 * Handler: Asignación confirmada desde Despacho
 */
async function handleAsignacionConfirmada(data) {
  const { AppDataSource } = require('../config/db');
  const { Viaje } = require('../entities/viaje');
  const { record } = require('../services/historyService');

  try {
    const { id_viaje, id_conductor } = data;

    if (!id_viaje || !id_conductor) {
      throw new Error('Datos incompletos en asignacion_confirmada');
    }

    // : Solo registrar en historial (el gRPC YA asignó)
    await record({
      id_viaje,
      accion: 'CONFIRMACION_DESPACHO',
      detalle: `Despacho confirmó asignación de conductor ${id_conductor}`,
      actor_id: null,
      actor_rol: 'SISTEMA'
    });

    console.log(`✅ Confirmación de Despacho registrada para viaje ${id_viaje}`);

  } catch (error) {
    console.error('❌ Error en handleAsignacionConfirmada:', error);
    throw error;
  }
}

/**
 * Handler: Conductor disponible
 */
async function handleConductorDisponible(data) {
  console.log('ℹ️ Conductor disponible:', data);
}

module.exports = {
  startWorker
};