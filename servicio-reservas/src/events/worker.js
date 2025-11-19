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

    // Declarar colas para el servicio de reservas
    for (const queueConfig of Object.values(QUEUE_NAMES)) {
      await channel.assertQueue(queueConfig.name, {
        durable: true,
        arguments: {
          'x-message-ttl': 86400000, // 24 horas
          'x-max-length': 10000
        }
      });

      // Bind queue al exchange con routing keys
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

        // Procesar según routing key
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

        // ACK del mensaje
        channel.ack(msg);

      } catch (error) {
        console.error('❌ Error procesando mensaje:', error);
        
        // NACK y requeue si es un error temporal
        if (error.temporary) {
          channel.nack(msg, false, true);
        } else {
          // No requeue errores permanentes
          channel.nack(msg, false, false);
        }
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

    const viajeRepo = AppDataSource.getRepository(Viaje);
    const viaje = await viajeRepo.findOne({ where: { id_viaje } });

    if (!viaje) {
      console.warn(`⚠️ Viaje ${id_viaje} no encontrado`);
      return;
    }

    if (viaje.estado !== 'PENDIENTE') {
      console.warn(`⚠️ Viaje ${id_viaje} no está pendiente (estado: ${viaje.estado})`);
      return;
    }

    // Actualizar viaje
    viaje.id_conductor = id_conductor;
    viaje.estado = 'ASIGNADO';
    viaje.fecha_asignacion = new Date();

    await viajeRepo.save(viaje);

    // Registrar en historial
    await record({
      id_viaje,
      accion: 'ASIGNADO_POR_DESPACHO',
      detalle: `Conductor ${id_conductor} asignado automáticamente por el servicio de despacho`,
      actor_id: null,
      actor_rol: 'SISTEMA'
    });

    console.log(`✅ Viaje ${id_viaje} asignado a conductor ${id_conductor} vía Despacho`);

  } catch (error) {
    console.error('❌ Error en handleAsignacionConfirmada:', error);
    throw error;
  }
}

/**
 * Handler: Conductor disponible (para futura lógica)
 */
async function handleConductorDisponible(data) {
  console.log('ℹ️ Conductor disponible:', data);
  // TODO: Implementar lógica si es necesario
}

module.exports = {
  startWorker
};