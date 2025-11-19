const { body, param, query } = require("express-validator");

const createRideRules = [
  body("origen")
    .exists().withMessage("origen es requerido")
    .isString().withMessage("origen debe ser texto")
    .notEmpty().withMessage("origen no puede estar vacío")
    .trim()
    .isLength({ min: 3, max: 500 }).withMessage("origen debe tener entre 3 y 500 caracteres"),
  
  body("destino")
    .exists().withMessage("destino es requerido")
    .isString().withMessage("destino debe ser texto")
    .notEmpty().withMessage("destino no puede estar vacío")
    .trim()
    .isLength({ min: 3, max: 500 }).withMessage("destino debe tener entre 3 y 500 caracteres"),
];

const updateRideRules = [
  param("id")
    .exists().withMessage("id es requerido")
    .isInt({ min: 1 }).withMessage("id debe ser un entero positivo"),
  
  body("estado")
    .optional()
    .isIn(["PENDIENTE", "ASIGNADO", "EN_PROGRESO", "COMPLETADO", "CANCELADO"])
    .withMessage("estado no válido"),
  
  body("id_conductor")
    .optional()
    .isInt({ min: 1 }).withMessage("id_conductor debe ser un entero positivo"),
];

const idParamRule = [
  param("id")
    .exists().withMessage("id es requerido")
    .isInt({ min: 1 }).withMessage("id debe ser un entero positivo")
];

const listRidesRules = [
  query("estado")
    .optional()
    .isIn(["PENDIENTE", "ASIGNADO", "EN_PROGRESO", "COMPLETADO", "CANCELADO"])
    .withMessage("estado no válido"),
  
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage("limit debe estar entre 1 y 100")
    .toInt(),
  
  query("offset")
    .optional()
    .isInt({ min: 0 }).withMessage("offset debe ser mayor o igual a 0")
    .toInt(),
];

module.exports = { 
  createRideRules, 
  updateRideRules, 
  idParamRule,
  listRidesRules
};
