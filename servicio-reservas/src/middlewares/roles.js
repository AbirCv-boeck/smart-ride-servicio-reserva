
/**
 * roleMiddleware(allowedRoles)
 * allowedRoles: array de strings, p.ej. ['PASAJERO', 'ADMIN']
 */
function roleMiddleware(allowedRoles = []) {
  if (!Array.isArray(allowedRoles)) {
    throw new Error("roleMiddleware espera un arreglo de roles");
  }

  return function (req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Usuario no autenticado" });
      }

      const userRole = String(req.user.rol).toUpperCase();
      const normalizedAllowed = allowedRoles.map(r => String(r).toUpperCase());

      if (!normalizedAllowed.includes(userRole)) {
        return res.status(403).json({ error: "Permisos insuficientes" });
      }

      return next();
    } catch (err) {
      console.error("roleMiddleware error:", err);
      return res.status(500).json({ error: "Error en middleware de roles" });
    }
  };
}

module.exports = roleMiddleware;
