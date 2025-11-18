
const jwt = require("jsonwebtoken");

const AUTH_HEADER_PREFIX = "Bearer ";

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    if (!authHeader || typeof authHeader !== "string") {
      return res.status(401).json({ error: "No se proporcionó token de autorización" });
    }

    if (!authHeader.startsWith(AUTH_HEADER_PREFIX)) {
      return res.status(401).json({ error: "Formato de token inválido. Use 'Bearer <token>'" });
    }

    const token = authHeader.slice(AUTH_HEADER_PREFIX.length).trim();
    if (!token) {
      return res.status(401).json({ error: "Token vacío" });
    }

    const secret = process.env.AUTH_JWT_SECRET;
    if (!secret) {
      console.error("AUTH_JWT_SECRET no definido en variables de entorno");
      return res.status(500).json({ error: "Configuración de autenticación inválida" });
    }

    
    jwt.verify(token, secret, (err, payload) => {
      if (err) {
        // puedes mapear errores más finos si lo deseas
        return res.status(401).json({ error: "Token inválido o expirado", details: err.message });
      }

    
      const { id_usuario, rol } = payload;
      if (!id_usuario || !rol) {
        return res.status(401).json({ error: "Token no contiene id_usuario o rol" });
      }

  
      req.user = {
        id_usuario,
        rol,
        rawPayload: payload
      };

      return next();
    });
  } catch (error) {
    console.error("authMiddleware error:", error);
    return res.status(500).json({ error: "Error en middleware de autenticación" });
  }
}

module.exports = authMiddleware;
