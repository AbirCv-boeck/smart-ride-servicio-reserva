const { EntitySchema } = require("typeorm");

const Viaje = new EntitySchema({
  name: "Viaje",
  tableName: "viajes",
  columns: {
    id_viaje: {
      primary: true,
      type: "int",
      generated: true
    },
    id_cliente: {
      type: "int",
      nullable: false
    },
    id_conductor: {
      type: "int",
      nullable: true
    },
    origen: {
      type: "varchar",
    },
    destino: {
      type: "varchar",
    },
    estado: {
      type: "enum",
      enum: ["PENDIENTE", "ASIGNADO", "EN_PROGRESO", "COMPLETADO", "CANCELADO"],
      default: "PENDIENTE"
    },
    fecha_solicitud: {
      type: "datetime",
      default: () => "CURRENT_TIMESTAMP"
    },
    fecha_inicio: {
      type: "datetime",
      nullable: true
    },
    fecha_fin: {
      type: "datetime",
      nullable: true
    }
  },
  relations: {
    historial: {
      type: "one-to-many",
      target: "ReservaHistorial",
      inverseSide: "viaje",
    }
  }
});

module.exports = { Viaje };
