/**
 * Middleware de verificación de roles
 * @param {string[]} allowedRoles - Array de roles permitidos
 * @returns {Function} Middleware function
 */
function roleMiddleware(allowedRoles = []) {
  if (!Array.isArray(allowedRoles)) {
    throw new Error("roleMiddleware espera un arreglo de roles");
  }

  return function (req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: "Usuario no autenticado" 
        });
      }

      const userRole = String(req.user.rol).toUpperCase();
      const normalizedAllowed = allowedRoles.map(r => String(r).toUpperCase());

      // ADMIN siempre tiene acceso
      if (userRole === "ADMIN") {
        return next();
      }

      if (!normalizedAllowed.includes(userRole)) {
        console.warn(`⚠️ Acceso denegado: Usuario ${req.user.email} (${userRole}) intentó acceder a recurso que requiere: ${normalizedAllowed.join(", ")}`);
        return res.status(403).json({ 
          success: false,
          error: "Permisos insuficientes",
          required_roles: normalizedAllowed,
          user_role: userRole
        });
      }

      return next();
    } catch (err) {
      console.error("❌ Error en roleMiddleware:", err);
      return res.status(500).json({ 
        success: false,
        error: "Error en middleware de roles" 
      });
    }
  };
}

module.exports = roleMiddleware;
