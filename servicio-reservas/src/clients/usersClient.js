const axios = require('axios');

const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL || 'http://users-service:3001';

/**
 * CLIENTE HTTP PARA USERS SERVICE
 * Obtener id_conductor desde id_usuario
 */
class UsersClient {
  /**
   * Obtener conductor por ID de usuario
   * @param {number} id_usuario - ID del usuario
   * @returns {Promise<{id_conductor: number, estado_conductor: string} | null>}
   */
  static async getConductorByUserId(id_usuario) {
    try {
      console.log(`🔍 [USERS_CLIENT] Consultando conductor para usuario ${id_usuario}`);
      
      const response = await axios.get(
        `${USERS_SERVICE_URL}/api/v1/users/conductores/by-user/${id_usuario}`,
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200 && response.data) {
        //: Navegar correctamente la respuesta anidada
        // Estructura actual: { success: true, data: { success: true, data: {...} } }
        
        let conductor;
        
        // Si tiene doble anidamiento (success.data.success.data)
        if (response.data.success && response.data.data?.success && response.data.data?.data) {
          conductor = response.data.data.data;
          console.log('⚠️ [USERS_CLIENT] Respuesta doblemente anidada detectada');
        }
        // Si tiene un solo nivel (success.data)
        else if (response.data.success && response.data.data) {
          conductor = response.data.data;
        }
        // Fallback: usar directamente response.data
        else {
          conductor = response.data;
        }
        
        //  Validar que id_conductor exista
        if (!conductor || !conductor.id_conductor) {
          console.error(`❌ [USERS_CLIENT] Respuesta inválida - no contiene id_conductor:`, JSON.stringify(response.data));
          return null;
        }
        
        console.log(`✅ [USERS_CLIENT] Conductor encontrado: ID=${conductor.id_conductor} para usuario ${id_usuario}`);
        
        return {
          id_conductor: conductor.id_conductor,
          numero_licencia: conductor.numero_licencia,
          estado_conductor: conductor.estado_conductor,
          calificacion_promedio: conductor.calificacion_promedio,
          total_viajes: conductor.total_viajes
        };
      }

      console.warn(`⚠️ [USERS_CLIENT] No se encontró conductor para usuario ${id_usuario}`);
      return null;

    } catch (error) {
      if (error.response?.status === 404) {
        console.warn(`⚠️ [USERS_CLIENT] Usuario ${id_usuario} no tiene perfil de conductor (404)`);
        return null;
      }

      console.error(`❌ [USERS_CLIENT] Error consultando conductor:`, error.message);
      throw new Error(`Error comunicándose con Users Service: ${error.message}`);
    }
  }
}

module.exports = { UsersClient };