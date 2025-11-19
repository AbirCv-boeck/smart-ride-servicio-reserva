-- ================================================
-- SMART RIDE - SERVICIO DE RESERVAS
-- ================================================

-- Tabla de viajes
CREATE TABLE IF NOT EXISTS viajes (
    id_viaje INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_conductor INT NULL,
    origen VARCHAR(500) NOT NULL,
    destino VARCHAR(500) NOT NULL,
    estado ENUM('PENDIENTE', 'ASIGNADO', 'EN_PROGRESO', 'COMPLETADO', 'CANCELADO') 
        NOT NULL DEFAULT 'PENDIENTE',
    fecha_solicitud TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_asignacion TIMESTAMP NULL,
    fecha_inicio TIMESTAMP NULL,
    fecha_fin TIMESTAMP NULL,
    motivo_cancelacion TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_cliente (id_cliente),
    INDEX idx_conductor (id_conductor),
    INDEX idx_estado (estado),
    INDEX idx_fecha_solicitud (fecha_solicitud)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de historial de reservas
CREATE TABLE IF NOT EXISTS reserva_historial (
    id_historial INT AUTO_INCREMENT PRIMARY KEY,
    id_viaje INT NOT NULL,
    accion VARCHAR(50) NOT NULL,
    detalle TEXT NULL,
    actor_id INT NULL,
    actor_rol ENUM('PASAJERO', 'CONDUCTOR', 'ADMIN', 'SISTEMA') NULL,
    fecha_accion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (id_viaje) REFERENCES viajes(id_viaje) ON DELETE CASCADE,
    INDEX idx_viaje (id_viaje),
    INDEX idx_actor (actor_id),
    INDEX idx_fecha (fecha_accion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de preferencias de viaje
CREATE TABLE IF NOT EXISTS preferencias_viaje (
    id_preferencia INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL UNIQUE,
    tipo_vehiculo VARCHAR(30) DEFAULT 'cualquiera',
    metodo_pago_preferido VARCHAR(20) DEFAULT 'tarjeta',
    notificaciones_push BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_cliente (id_cliente)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;