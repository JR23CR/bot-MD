import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import { canExecuteCommand } from '../lib/group-restriction.js'

let handler = async (m, { conn, command }) => {
    try {
        // Verificar permisos PRIMERO
        if (!canExecuteCommand(m)) {
            console.log(`🚫 Comando .ver bloqueado para ${m.sender}`)
            return // Ignorar silenciosamente
        }

        console.log(`✅ Comando .ver permitido para ${m.sender}`)

        // Verificar si hay un mensaje citado
        if (!m.quoted) {
            return conn.reply(m.chat, '❌ Debes responder a un mensaje de "ver una vez" con este comando.\n\n📝 Uso: Responde a la imagen/video de ver una vez con *.ver*', m)
        }

        const quotedMsg = m.quoted
        
        // Verificar si es un mensaje viewOnce
        const isViewOnce = quotedMsg.mtype === 'viewOnceMessageV2' || 
                          quotedMsg.mtype === 'viewOnceMessage' ||
                          quotedMsg.mediaMessage?.imageMessage?.viewOnce ||
                          quotedMsg.mediaMessage?.videoMessage?.viewOnce ||
                          quotedMsg.mediaMessage?.audioMessage?.viewOnce ||
                          quotedMsg.message?.imageMessage?.viewOnce ||
                          quotedMsg.message?.videoMessage?.viewOnce ||
                          quotedMsg.message?.audioMessage?.viewOnce

        if (!isViewOnce) {
            return conn.reply(m.chat, '❌ El mensaje citado no es de "ver una vez".\n\n💡 Asegúrate de responder a un mensaje que tenga la etiqueta "Ver una vez".', m)
        }

        let type = null
        let mediaMessage = null

        // Obtener el mediaMessage y tipo
        if (quotedMsg.mediaMessage) {
            if (quotedMsg.mediaMessage.imageMessage) {
                type = 'image'
                mediaMessage = quotedMsg.mediaMessage.imageMessage
            } else if (quotedMsg.mediaMessage.videoMessage) {
                type = 'video'
                mediaMessage = quotedMsg.mediaMessage.videoMessage
            } else if (quotedMsg.mediaMessage.audioMessage) {
                type = 'audio'
                mediaMessage = quotedMsg.mediaMessage.audioMessage
            }
        } else if (quotedMsg.message) {
            if (quotedMsg.message.imageMessage) {
                type = 'image'
                mediaMessage = quotedMsg.message.imageMessage
            } else if (quotedMsg.message.videoMessage) {
                type = 'video'
                mediaMessage = quotedMsg.message.videoMessage
            } else if (quotedMsg.message.audioMessage) {
                type = 'audio'
                mediaMessage = quotedMsg.message.audioMessage
            }
        }

        if (!mediaMessage || !type) {
            return conn.reply(m.chat, '❌ No se pudo obtener el contenido del mensaje de "ver una vez".', m)
        }

        // Intentar descargar el contenido
        try {
            console.log(`📥 Descargando ${type}...`)
            
            const stream = await downloadContentFromMessage(mediaMessage, type)
            let buffer = Buffer.from([])
            
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk])
            }

            if (!buffer || buffer.length === 0) {
                return conn.reply(m.chat, '❌ No se pudo descargar el contenido.\n\n⚠️ El mensaje puede haber expirado o sido eliminado.', m)
            }

            console.log(`✅ Contenido descargado: ${buffer.length} bytes`)

            // Enviar el contenido capturado
            const caption = `👁️ *Contenido de "Ver una vez" revelado*\n\n📦 Tamaño: ${(buffer.length / 1024).toFixed(2)} KB`

            if (type === 'image') {
                await conn.sendMessage(m.chat, {
                    image: buffer,
                    caption: caption,
                    mentions: [m.sender]
                }, { quoted: m })
            } else if (type === 'video') {
                await conn.sendMessage(m.chat, {
                    video: buffer,
                    caption: caption,
                    mentions: [m.sender]
                }, { quoted: m })
            } else if (type === 'audio') {
                await conn.sendMessage(m.chat, {
                    audio: buffer,
                    mimetype: 'audio/mp4',
                    ptt: false
                }, { quoted: m })
                await conn.reply(m.chat, caption, m, { mentions: [m.sender] })
            }

            console.log('✅ Contenido de "ver una vez" enviado exitosamente')

        } catch (downloadError) {
            console.error('❌ Error al descargar contenido viewOnce:', downloadError)
            return conn.reply(m.chat, '❌ Error al descargar el contenido.\n\n⚠️ El mensaje de "ver una vez" probablemente ya fue visto o eliminado del servidor.', m)
        }

    } catch (error) {
        console.error('❌ Error en comando .ver:', error)
        console.error('Stack:', error.stack)
        await conn.reply(m.chat, `❌ Ocurrió un error al procesar el comando.\n\n🔧 Error: ${error.message}`, m)
    }
}

handler.help = ['ver', 'viewonce', 'revelar']
handler.tags = ['tools']
handler.command = /^(ver|viewonce|revelar|antiviewonce)$/i
handler.group = true

export default handler
