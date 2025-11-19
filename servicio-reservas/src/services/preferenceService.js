const { AppDataSource } = require("../config/db");
const { PreferenciaViaje } = require("../entities/preferenciaViaje");

const prefRepo = () => AppDataSource.getRepository(PreferenciaViaje);

class PreferenceService {
  static async getPreferencesByClient(id_cliente) {
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

  static async saveOrUpdatePreferences(id_cliente, data) {
    const repo = prefRepo();
    let pref = await repo.findOne({ where: { id_cliente } });
    if (!pref) {
      pref = repo.create({ id_cliente, ...data });
    } else {
      Object.assign(pref, data);
    }
    return repo.save(pref);
  }
}

// Mantener compatibilidad con exports antiguos
async function getPreferencesByCliente(id_cliente) {
  return PreferenceService.getPreferencesByClient(id_cliente);
}

async function saveOrUpdatePreferences(id_cliente, data) {
  return PreferenceService.saveOrUpdatePreferences(id_cliente, data);
}

module.exports = {
  PreferenceService,
  getPreferencesByCliente,
  saveOrUpdatePreferences
};

