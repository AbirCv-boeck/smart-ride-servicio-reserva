# 🚕 Servicio de Reservas - Smart Ride

Microservicio de gestión de reservas desarrollado con **Node.js + Express + RabbitMQ + MySQL** - Totalmente Dockerizado.

---

## 📋 Descripción

El **Servicio de Reservas** es responsable de:

* Gestionar todo el ciclo de un viaje: creación, actualización, asignación de conductor y finalización.
* Recibir solicitudes de viaje desde clientes (REST API).
* Emitir eventos asincrónicos vía RabbitMQ para coordinar con otros microservicios (Despacho, Pagos, Notificaciones).
* Manejar alta concurrencia de solicitudes mediante colas de mensajería.
* Persistir información de viajes, historial y preferencias en MySQL.
* Documentar los endpoints con Swagger para pruebas rápidas.

---

## 🛠️ Tecnologías

* **Lenguaje:** Javascript (Node.js 18+)
* **Framework:** Express
* **Base de Datos:** MySQL 8
* **Mensajería:** RabbitMQ
* **Documentación:** Swagger
* **Contenedores:** Docker + Docker Compose
* **ORM:** TypeORM
* **Validación:** Joi / Middleware personalizado

---

## 🏗️ Arquitectura y Estructura de Carpetas

```
servicio-reservas/
├─ src/
│  ├─ config/
│  │  ├─ db.js
│  │  └─ rabbitmq.js
│  ├─ controllers/
│  │  └─ rideController.js
│  ├─ entities/
│  │  ├─ viaje.js
│  │  ├─ reservaHistorial.js
│  │  └─ preferenciaViaje.js
│  ├─ routes/
│  │  └─ rideRoutes.js
│  ├─ service/
│  │  └─ rideService.js
│  ├─ swagger/
│  │  └─ swagger.js
│  └─ index.js
├─ .env
├─ .gitignore
├─ Dockerfile
└─ docker-compose.yml
```

> Cada carpeta tiene funciones específicas:
>
> * **config:** Configuración de base de datos y RabbitMQ.
> * **controllers:** Recibe las solicitudes HTTP.
> * **entities:** Modelos de datos para TypeORM.
> * **routes:** Define endpoints REST.
> * **service:** Lógica de negocio.
> * **swagger:** Documentación de API.
> * **index.js:** Punto de entrada del microservicio.

---

## 🚀 Ejecución con Docker

### Paso 1: Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/smart-ride-servicio-reservas.git
cd smart-ride-servicio-reservas
```

### Paso 2: Configurar variables de entorno

```bash
cp .env.example .env
# Edita .env si necesitas personalizar la configuración
```

### Paso 3: Construir y levantar contenedores

```bash
docker-compose up --build -d
```

> Esto levantará 3 servicios:
>
> 1. **app:** Servicio de reservas en Node.js en el puerto 3001.
> 2. **mysql:** Base de datos MySQL en el puerto 3307.
> 3. **rabbitmq:** Broker RabbitMQ en los puertos 5672 y 15672 (panel web).

### Paso 4: Verificar que todo funciona

```bash
# Health check de la aplicación
curl http://localhost:3001/health

# Ver logs de la aplicación
docker-compose logs -f app

# Ver contenedores activos
docker-compose ps
```

### Paso 5: Acceder a interfaces

* **API REST:** [http://localhost:3001](http://localhost:3001)
* **Swagger Documentation:** [http://localhost:3001/api-docs](http://localhost:3001/api-docs)
* **RabbitMQ Management:** [http://localhost:15672](http://localhost:15672) (guest/guest)
* **MySQL:** host `localhost:3307`, usuario `user`, contraseña `password`, base `rideservice_db`

### Paso 6: Parar y limpiar contenedores

```bash
# Detener servicios

docker-compose down

# Detener y limpiar todo (incluye volúmenes)
docker-compose down -v

# Reconstruir imagen sin cache
docker-compose build --no-cache

# Reiniciar un servicio específico
docker-compose restart app
```

---

## 📦 Endpoints API REST

**Viajes**

* `POST /rides/create` - Crear reserva
* `GET /rides` - Listar todas las reservas
* `GET /rides/:id` - Obtener detalles de una reserva
* `PUT /rides/:id` - Actualizar una reserva
* `DELETE /rides/:id` - Cancelar una reserva

**Ejemplo: Crear una reserva**

```bash
curl -X POST "http://localhost:3001/rides/create" \
  -H "Content-Type: application/json" \
  -d '{
    "pasajero_id": 10,
    "origen": "Av. América",
    "destino": "Universidad UMSS"
  }'
```

---

## 🔔 Eventos RabbitMQ

* `nueva_reserva` → Emitido al crear una reserva
* `reserva_asignada` → Emitido cuando Dispatch Service asigna un conductor
* `viaje_completado` → Emitido al finalizar un viaje y registrar el pago

> RabbitMQ permite procesar **alta concurrencia**, distribuyendo mensajes a múltiples consumidores simultáneamente.

---

## 🧪 Pruebas Rápidas

1. Levantar contenedores: `docker-compose up -d`
2. Acceder a Swagger: [http://localhost:3001/api-docs](http://localhost:3001/api-docs)
3. Crear una reserva usando Swagger o Postman
4. Verificar evento `nueva_reserva` en RabbitMQ
5. Simular asignación de conductor desde Dispatch Service
6. Confirmar eventos de pago si Payment Service está activo

---

## 📊 Arquitectura Docker

```
┌───────────────────────────────────┐
│  Docker Compose Network           │
│  (smart-ride-network)             │
│                                   │
│  ┌─────────────────────────────┐  │
│  │  rideservice-mysql          │  │
│  │  Port: 3307                 │  │
│  └─────────────────────────────┘  │
│                                   │
│  ┌─────────────────────────────┐  │
│  │  rideservice-rabbitmq       │  │
│  │  Ports: 5672, 15672         │  │
│  └─────────────────────────────┘  │
│                                   │
│  ┌─────────────────────────────┐  │
│  │  servicio-reservas (app)    │  │
│  │  Port: 3001                 │  │
│  │  (Express + RabbitMQ)       │  │
│  └─────────────────────────────┘  │
└───────────────────────────────────┘
```

---

## 🧠 Flujo de Operación

1. Pasajero solicita un viaje → POST `/rides/create`
2. Ride Service publica evento `nueva_reserva` en RabbitMQ
3. Dispatch Service asigna conductor y responde con evento `reserva_asignada`
4. Ride Service actualiza el estado del viaje a “Asignado”
5. Payment Service registra pago al completarse el viaje
6. Notification Service envía alertas en tiempo real (opcional)

> Todo el flujo es **asincrónico**, lo que permite manejar alta concurrencia sin bloqueos.

---

## 👥 Autor

Abir Zaid Contreras Von Boeck
