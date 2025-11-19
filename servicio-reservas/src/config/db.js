require("dotenv").config();
const { DataSource } = require("typeorm");
const { Viaje } = require("../entities/viaje.js");
const { ReservaHistorial } = require("../entities/reservaHistorial.js");
const { PreferenciaViaje } = require("../entities/preferenciaViaje.js");

const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false, //  CAMBIAR A FALSE
  logging: process.env.NODE_ENV !== 'production',
  entities: [Viaje, ReservaHistorial, PreferenciaViaje],
});

module.exports = { AppDataSource };
