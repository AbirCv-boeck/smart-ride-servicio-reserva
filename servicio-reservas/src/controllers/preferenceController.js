// src/controllers/preferenceController.js
const { PreferenceService } = require("../services/preferenceService");

async function getMyPreferences(req, res, next) {
  try {
    const userId = req.user.id_usuario;

    const preferences = await PreferenceService.getPreferencesByClient(userId);

    res.status(200).json({
      success: true,
      data: preferences ?? {}
    });
  } catch (err) {
    next(err);
  }
}

async function updateMyPreferences(req, res, next) {
  try {
    const userId = req.user.id_usuario;

    const updated = await PreferenceService.saveOrUpdatePreferences(userId, req.body);

    res.status(200).json({
      success: true,
      message: "Preferencias actualizadas",
      data: updated
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyPreferences,
  updateMyPreferences
};
