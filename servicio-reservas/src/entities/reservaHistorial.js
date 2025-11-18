const { EntitySchema } = require("typeorm");

const ReservaHistorial = new EntitySchema({
  name: "ReservaHistorial",
  tableName: "reserva_historial",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true
    },
    accion: {
      type: "varchar"
    },
    detalle: {
      type: "varchar",
      nullable: true
    },
    fecha_accion: {
      type: "datetime",
      default: () => "CURRENT_TIMESTAMP"
    }
  },
  relations: {
    viaje: {
      type: "many-to-one",
      target: "Viaje",
      joinColumn: { name: "id_viaje" },
      nullable: false
    }
  }
});

module.exports = { ReservaHistorial };
