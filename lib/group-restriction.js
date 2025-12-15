// lib/group-restriction.js
// Sistema de restricción para grupos

// ⚠️ CONFIGURACIÓN - CAMBIAR ESTOS VALORES ⚠️
const FAMILY_GROUP_ID = '120363424421388888@g.us' // ID del grupo FAMILY
const OWNER_NUMBER = '50241072311@s.whatsapp.net' // TU número

/**
 * Verifica si un comando puede ejecutarse en el chat actual
 * @param {Object} m - Objeto del mensaje
 * @returns {boolean} - true si puede ejecutarse, false si no
 */
export function canExecuteCommand(m) {
    // Si es el grupo FAMILY, todos pueden usar comandos
    if (m.chat === FAMILY_GROUP_ID) {
        return true
    }
    
    // En otros grupos, solo el owner puede usar comandos
    if (m.sender === OWNER_NUMBER) {
        return true
    }
    
    // En chats privados, solo el owner
    if (!m.isGroup) {
        return m.sender === OWNER_NUMBER
    }
    
    return false
}

/**
 * Verifica si el bot debe responder en un chat
 * @param {Object} m - Objeto del mensaje
 * @returns {boolean} - true si debe responder, false si no
 */
export function shouldBotRespond(m) {
    // En el grupo FAMILY, responder a todos
    if (m.chat === FAMILY_GROUP_ID) {
        return true
    }
    
    // En otros lugares, solo responder al owner
    return m.sender === OWNER_NUMBER
}

export default {
    FAMILY_GROUP_ID,
    OWNER_NUMBER,
    canExecuteCommand,
    shouldBotRespond
}
