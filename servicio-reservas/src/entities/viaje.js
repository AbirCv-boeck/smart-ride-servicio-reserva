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
      nullable: true
    },
    id_conductor: {
      type: "int",
      nullable: true
    },
    punto_origen: {
      type: "varchar"
    },
    punto_destino: {
      type: "varchar"
    },
    estado: {
      type: "varchar",
      default: "pendiente"
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
  }
});

module.exports = { Viaje };
