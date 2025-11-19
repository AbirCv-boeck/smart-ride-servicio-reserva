const { EntitySchema } = require("typeorm");

const ReservaHistorial = new EntitySchema({
  name: "ReservaHistorial",
  tableName: "reserva_historial",
  columns: {
    id_historial: {
      primary: true,
      type: "int",
      generated: true
    },
    accion: {
      type: "varchar",
      length: 50,
      nullable: false
    },
    detalle: {
      type: "text",
      nullable: true
    },
    actor_id: {
      type: "int",
      nullable: true
    },
    actor_rol: {
      type: "enum",
      enum: ["PASAJERO", "CONDUCTOR", "ADMIN", "SISTEMA"],
      nullable: true
    },
    fecha_accion: {
      type: "timestamp",
      default: () => "CURRENT_TIMESTAMP"
    }
  },
  relations: {
    viaje: {
      type: "many-to-one",
      target: "Viaje",
      joinColumn: { name: "id_viaje" },
      nullable: false,
      onDelete: "CASCADE"
    }
  }
});

module.exports = { ReservaHistorial };
