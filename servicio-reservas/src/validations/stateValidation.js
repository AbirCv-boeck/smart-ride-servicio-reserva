// src/validations/stateValidation.js
const { param, body } = require("express-validator");

const idParamRule = [
  param("id")
    .exists().withMessage("id es requerido")
    .isInt().withMessage("id debe ser un entero")
];

const cancelRules = [
  ...idParamRule,
  body("motivo")
    .optional()
    .isString().withMessage("motivo debe ser texto")
    .isLength({ max: 255 }).withMessage("motivo muy largo")
];

module.exports = { idParamRule, cancelRules };
