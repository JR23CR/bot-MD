import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import { canExecuteCommand } from '../lib/group-restriction.js'

let handler = async (m, { conn, command }) => {
    try {
        // Verificar permisos
        if (!canExecuteCommand(m)) {
            return // Ignorar silenciosamente
        }

        // ... resto del código del plugin ver.js
    } catch (error) {
        console.error('Error en comando .ver:', error)
    }
}

handler.help = ['ver', 'viewonce', 'revelar']
handler.tags = ['tools']
handler.command = /^(ver|viewonce|revelar|antiviewonce)$/i
handler.group = true

export default handler
