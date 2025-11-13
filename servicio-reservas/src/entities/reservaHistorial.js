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
    id_viaje: {
      type: "int"
    },
    accion: {
      type: "varchar"
    },
    detalle: {
      type: "varchar"
    },
    fecha_accion: {
      type: "datetime",
      default: () => "CURRENT_TIMESTAMP"
    }
  }
});

module.exports = { ReservaHistorial };
