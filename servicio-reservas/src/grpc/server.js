const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { AppDataSource } = require('../config/db');
const { Viaje } = require('../entities/viaje');
const { ReservaHistorial } = require('../entities/reservaHistorial');

const PROTO_PATH = path.join(__dirname, '../../proto/reservas.proto');

console.log(`📋 Cargando proto desde: ${PROTO_PATH}`);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

//  Usar el package name correcto
const reservasProto = grpc.loadPackageDefinition(packageDefinition).reservas;

// Verificar que se cargó correctamente
if (!reservasProto || !reservasProto.ReservasService) {
  console.error('❌ Error: No se pudo cargar el servicio gRPC desde el proto');
  console.error('Paquetes disponibles:', Object.keys(grpc.loadPackageDefinition(packageDefinition)));
  process.exit(1);
}

console.log('✅ Proto cargado correctamente');

/**
 * 🔧 Handler: ConfirmarAsignacion
 */
async function ConfirmarAsignacion(call, callback) {
  const { id_viaje, id_conductor, metodo_asignacion, tiempo_asignacion_ms, algoritmo_usado } = call.request;

  console.log(`📥 [gRPC] ConfirmarAsignacion - Viaje ${id_viaje}, Conductor ${id_conductor}`);

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    await queryRunner.startTransaction();

    const viaje = await queryRunner.manager
      .createQueryBuilder(Viaje, 'v')
      .setLock('pessimistic_write')
      .where('v.id_viaje = :id', { id: parseInt(id_viaje) })
      .getOne();

    if (!viaje) {
      await queryRunner.rollbackTransaction();
      console.error(`❌ [gRPC] Viaje ${id_viaje} no encontrado`);
      
      callback({
        code: grpc.status.NOT_FOUND,
        message: `Viaje ${id_viaje} no encontrado`
      });
      return;
    }

    if (viaje.estado !== 'PENDIENTE') {
      await queryRunner.rollbackTransaction();
      console.error(`❌ [gRPC] Viaje ${id_viaje} no está PENDIENTE (estado: ${viaje.estado})`);
      
      callback({
        code: grpc.status.FAILED_PRECONDITION,
        message: `Viaje no está PENDIENTE (estado actual: ${viaje.estado})`
      });
      return;
    }

    // Asignar conductor
    viaje.id_conductor = id_conductor;
    viaje.estado = 'ASIGNADO';
    viaje.fecha_asignacion = new Date();

    await queryRunner.manager.save(Viaje, viaje);

    // Registrar en historial
    const historialRepo = queryRunner.manager.getRepository(ReservaHistorial);
    const historialEntry = historialRepo.create({
      viaje: { id_viaje: viaje.id_viaje },
      accion: 'ASIGNADO_VIA_GRPC',
      detalle: JSON.stringify({
        metodo: metodo_asignacion,
        algoritmo: algoritmo_usado,
        tiempo_ms: tiempo_asignacion_ms,
        id_conductor
      }),
      actor_id: null,
      actor_rol: 'SISTEMA'
    });
    await historialRepo.save(historialEntry);

    await queryRunner.commitTransaction();

    console.log(`✅ [gRPC] Viaje ${id_viaje} asignado a conductor ${id_conductor}`);

    callback(null, {
      success: true,
      message: 'Asignación confirmada exitosamente',
      viaje: {
        id_viaje: viaje.id_viaje,
        id_cliente: viaje.id_cliente,
        id_conductor: viaje.id_conductor,
        origen: viaje.origen,
        destino: viaje.destino,
        estado: viaje.estado,
        fecha_solicitud: viaje.fecha_solicitud.toISOString(),
        fecha_asignacion: viaje.fecha_asignacion.toISOString(),
        fecha_inicio: viaje.fecha_inicio ? viaje.fecha_inicio.toISOString() : '',
        fecha_fin: viaje.fecha_fin ? viaje.fecha_fin.toISOString() : '',
        motivo_cancelacion: viaje.motivo_cancelacion || ''
      }
    });

  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('❌ [gRPC] Error en ConfirmarAsignacion:', error);
    
    callback({
      code: grpc.status.INTERNAL,
      message: `Error interno: ${error.message}`
    });
  } finally {
    await queryRunner.release();
  }
}

/**
 * 🚀 Iniciar servidor gRPC
 */
function startGrpcServer(port = 50051) {
  const server = new grpc.Server();

  server.addService(reservasProto.ReservasService.service, {
    ConfirmarAsignacion
  });

  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (error, boundPort) => {
      if (error) {
        console.error('❌ Error iniciando servidor gRPC:', error);
        return;
      }
      console.log(`🚀 Servidor gRPC escuchando en puerto ${boundPort}`);
      server.start();
    }
  );

  return server;
}

module.exports = { startGrpcServer };