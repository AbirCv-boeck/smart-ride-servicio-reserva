const { AppDataSource } = require("../config/db");
const { Viaje } = require("../entities/viaje.js");
const { ReservaHistorial } = require("../entities/reservaHistorial.js");
const { publishEvent } = require("../config/rabbitmq");

class RideService {
  static async createRide(data) {
    const viajeRepo = AppDataSource.getRepository(Viaje);
    const historialRepo = AppDataSource.getRepository(ReservaHistorial);

    const nuevoViaje = {
      id_cliente: data.id_cliente,
      punto_origen: data.punto_origen,
      punto_destino: data.punto_destino,
      estado: "pendiente",
      fecha_solicitud: new Date(),
    };

    const saved = await viajeRepo.save(nuevoViaje);

    // Historial
    const historial = historialRepo.create({
      id_viaje: saved.id_viaje,
      accion: "CREADO",
      detalle: "Reserva creada",
      fecha_accion: new Date(),
    });
    await historialRepo.save(historial);

    // Publicar evento
    publishEvent("nueva_reserva", saved);

    return saved;
  }

  static async getAllRides() {
    const viajeRepo = AppDataSource.getRepository(Viaje);
    return viajeRepo.find();
  }

  static async getRideById(id) {
    const viajeRepo = AppDataSource.getRepository(Viaje);
    return viajeRepo.findOneBy({ id_viaje: parseInt(id) });
  }

  // 🔧 Actualización compatible con PATCH
  static async updateRide(id, data) {
    const viajeRepo = AppDataSource.getRepository(Viaje);
    const historialRepo = AppDataSource.getRepository(ReservaHistorial);

    const ride = await viajeRepo.findOneBy({ id_viaje: parseInt(id) });
    if (!ride) throw new Error("Viaje no encontrado");

    // Solo actualiza los campos enviados en el cuerpo
    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined) {
        ride[key] = data[key];
      }
    });

    // Guarda los cambios parciales
    const updatedRide = await viajeRepo.save(ride);

    // Historial de actualización
    await historialRepo.save({
      id_viaje: updatedRide.id_viaje,
      accion: "ACTUALIZADO",
      detalle: "Reserva actualizada parcialmente",
      fecha_accion: new Date(),
    });

    // Publicar evento de actualización
    publishEvent("reserva_actualizada", updatedRide);

    return updatedRide;
  }

  static async deleteRide(id) {
    const viajeRepo = AppDataSource.getRepository(Viaje);
    const ride = await viajeRepo.findOneBy({ id_viaje: parseInt(id) });

    if (ride) {
      await viajeRepo.delete({ id_viaje: parseInt(id) });

      const historialRepo = AppDataSource.getRepository(ReservaHistorial);
      await historialRepo.save({
        id_viaje: ride.id_viaje,
        accion: "ELIMINADO",
        detalle: "Reserva eliminada",
        fecha_accion: new Date(),
      });
    }

    return ride;
  }
}

module.exports = { RideService };
