const jwt = require("jsonwebtoken");

const AUTH_HEADER_PREFIX = "Bearer ";

/**
 * Middleware de autenticación JWT
 * Valida el token y extrae la información del usuario
 */
function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    
    if (!authHeader || typeof authHeader !== "string") {
      return res.status(401).json({ 
        success: false,
        error: "No se proporcionó token de autorización" 
      });
    }

    if (!authHeader.startsWith(AUTH_HEADER_PREFIX)) {
      return res.status(401).json({ 
        success: false,
        error: "Formato de token inválido. Use 'Bearer <token>'" 
      });
    }

    const token = authHeader.slice(AUTH_HEADER_PREFIX.length).trim();
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: "Token vacío" 
      });
    }

    const secret = process.env.AUTH_JWT_SECRET;
    
    if (!secret) {
      console.error("❌ AUTH_JWT_SECRET no definido en variables de entorno");
      return res.status(500).json({ 
        success: false,
        error: "Configuración de autenticación inválida" 
      });
    }

    jwt.verify(token, secret, (err, payload) => {
      if (err) {
        console.error("❌ Error verificando token:", err.message);
        return res.status(401).json({ 
          success: false,
          error: "Token inválido o expirado",
          details: err.message 
        });
      }

      // Extraer información del payload
      // El servicio de usuarios usa 'sub' para id_usuario
      const id_usuario = payload.sub || payload.id_usuario;
      const rol = payload.rol;
      const email = payload.email;

      if (!id_usuario || !rol) {
        return res.status(401).json({ 
          success: false,
          error: "Token no contiene información válida de usuario" 
        });
      }

      // Adjuntar usuario al request
      req.user = {
        id_usuario,
        rol: String(rol).toUpperCase(),
        email,
        rawPayload: payload
      };

      console.log(`✅ Usuario autenticado: ${email} (ID: ${id_usuario}, Rol: ${rol})`);

      return next();
    });
  } catch (error) {
    console.error("❌ Error en authMiddleware:", error);
    return res.status(500).json({ 
      success: false,
      error: "Error en middleware de autenticación" 
    });
  }
}

module.exports = authMiddleware;
