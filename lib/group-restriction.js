// 📁 lib/group-restriction.js - VERSIÓN CORREGIDA

// ⚠️ CONFIGURACIÓN - CAMBIAR ESTOS VALORES ⚠️
const FAMILY_GROUP_ID = '120363424421388888@g.us' // ID del grupo FAMILY
const OWNER_NUMBER = '50241072311@s.whatsapp.net' // TU número (Owner)

/**
 * Verifica si un comando puede ejecutarse en el chat actual (Función principal)
 * @param {Object} m - Objeto del mensaje
 * @returns {boolean} - true si puede ejecutarse, false si no
 */
export function canExecuteCommand(m) {
    const isOwner = m.sender === OWNER_NUMBER;
    const isFamilyGroup = m.chat === FAMILY_GROUP_ID;

    // 1. Prioridad: Si es el Owner, siempre permitir la ejecución.
    if (isOwner) {
        return true;
    }
    
    // 2. Si NO es el Owner, solo permitir si está en el grupo FAMILY.
    if (isFamilyGroup) {
        return true;
    }

    // 3. En cualquier otro caso (Grupos externos para no-Owners), bloquear.
    return false;
}

/**
 * Verifica si el bot debe responder en un chat (Lógica de respuesta)
 * @param {Object} m - Objeto del mensaje
 * @returns {boolean} - true si debe responder, false si no
 */
export function shouldBotRespond(m) {
    // 1. En el grupo FAMILY, responder a todos
    if (m.chat === FAMILY_GROUP_ID) {
        return true;
    }
    
    // 2. En otros lugares, solo responder al owner
    return m.sender === OWNER_NUMBER;
}

export default {
    FAMILY_GROUP_ID,
    OWNER_NUMBER,
    canExecuteCommand,
    shouldBotRespond
}
