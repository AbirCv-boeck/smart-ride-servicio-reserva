
async function record({ id_viaje, accion, detalle, actor_id = null, actor_rol = null }) {
  const repo = historialRepo();
  const entry = repo.create({
    viaje: { id_viaje },
    accion,
    detalle,
    actor_id,
    actor_rol
  });
  return repo.save(entry);
}

module.exports = {
  addHistory,
  record
};
