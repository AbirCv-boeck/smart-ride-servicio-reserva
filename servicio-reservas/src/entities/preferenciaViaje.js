const { EntitySchema } = require("typeorm");

const PreferenciaViaje = new EntitySchema({
  name: "PreferenciaViaje",
  tableName: "preferencias_viaje",
  columns: {
    id_preferencia: {
      primary: true,
      type: "int",
      generated: true
    },
    id_cliente: {
      type: "int"
    },
    tipo_vehiculo: {
      type: "varchar",
      nullable: true
    },
    metodo_pago_preferido: {
      type: "varchar",
      nullable: true
    }
  }
});

module.exports = { PreferenciaViaje };
