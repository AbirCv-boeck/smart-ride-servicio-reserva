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
      length: 500,
      nullable: false
    },
    destino: {
      type: "varchar",
      length: 500,
      nullable: false
    },
    estado: {
      type: "enum",
      enum: ["PENDIENTE", "ASIGNADO", "EN_PROGRESO", "COMPLETADO", "CANCELADO"],
      default: "PENDIENTE"
    },
    fecha_solicitud: {
      type: "timestamp",
      default: () => "CURRENT_TIMESTAMP"
    },
    fecha_asignacion: {
      type: "timestamp",
      nullable: true
    },
    fecha_inicio: {
      type: "timestamp",
      nullable: true
    },
    fecha_fin: {
      type: "timestamp",
      nullable: true
    },
    motivo_cancelacion: {
      type: "text",
      nullable: true
    },
    created_at: {
      type: "timestamp",
      default: () => "CURRENT_TIMESTAMP"
    },
    updated_at: {
      type: "timestamp",
      default: () => "CURRENT_TIMESTAMP",
      onUpdate: "CURRENT_TIMESTAMP"
    }
  },
  relations: {
    historial: {
      type: "one-to-many",
      target: "ReservaHistorial",
      inverseSide: "viaje"
    }
  }
});

module.exports = { Viaje };
