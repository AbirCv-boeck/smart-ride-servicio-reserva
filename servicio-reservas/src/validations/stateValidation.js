const { param, body } = require("express-validator");

const idParamRule = [
  param("id")
    .exists().withMessage("id es requerido")
    .isInt({ min: 1 }).withMessage("id debe ser un entero positivo")
];

const cancelRules = [
  ...idParamRule,
  body("motivo")
    .optional()
    .isString().withMessage("motivo debe ser texto")
    .trim()
    .isLength({ max: 500 }).withMessage("motivo muy largo (máximo 500 caracteres)")
];

module.exports = { idParamRule, cancelRules };
