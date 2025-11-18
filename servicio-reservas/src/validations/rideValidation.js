
const { body, param } = require("express-validator");

const createRideRules = [
  body("punto_origen")
    .exists().withMessage("punto_origen es requerido")
    .isString().withMessage("punto_origen debe ser texto")
    .notEmpty().withMessage("punto_origen no puede estar vacío"),
  body("punto_destino")
    .exists().withMessage("punto_destino es requerido")
    .isString().withMessage("punto_destino debe ser texto"),
];

const idParamRule = [
  param("id")
    .exists().withMessage("id es requerido")
    .isInt().withMessage("id debe ser un entero")
];

module.exports = { createRideRules, idParamRule };
