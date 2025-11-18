
const { AppDataSource } = require("../config/db");
const { PreferenciaViaje } = require("../entities/preferenciaViaje");

const prefRepo = () => AppDataSource.getRepository(PreferenciaViaje);


async function getPreferencesByCliente(id_cliente) {
  if (!id_cliente) return null;
  const repo = prefRepo();
  const pref = await repo.findOne({ where: { id_cliente } });
  if (!pref) return null;
  return {
    id_preferencia: pref.id_preferencia,
    tipo_vehiculo: pref.tipo_vehiculo,
    metodo_pago_preferido: pref.metodo_pago_preferido
  };
}

async function saveOrUpdatePreferences(id_cliente, data) {
  const repo = prefRepo();
  let pref = await repo.findOne({ where: { id_cliente } });
  if (!pref) {
    pref = repo.create({ id_cliente, ...data });
  } else {
    Object.assign(pref, data);
  }
  return repo.save(pref);
}

module.exports = {
  getPreferencesByCliente,
  saveOrUpdatePreferences
};

