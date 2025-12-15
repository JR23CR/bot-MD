import { downloadContentFromMessage } from '@whiskeysockets/baileys'

let handler = async (m, { conn, command }) => {
    try {
        // Verificar si hay un mensaje citado
        if (!m.quoted) {
            return conn.reply(m.chat, '❌ Debes responder a un mensaje de "ver una vez" con este comando.\n\n📝 Uso: Responde a la imagen/video de ver una vez con *.ver*', m)
        }

        const quotedMsg = m.quoted
        
        // Función para extraer el mensaje viewOnce de diferentes estructuras
        const getViewOnceMessage = (msg) => {
            // Verificar en diferentes ubicaciones posibles
            if (msg.viewOnce) return msg
            if (msg.message?.viewOnceMessage) return msg.message.viewOnceMessage.message
            if (msg.message?.viewOnceMessageV2) return msg.message.viewOnceMessageV2.message
            if (msg.message?.viewOnceMessageV2Extension) return msg.message.viewOnceMessageV2Extension.message
            
            // Verificar en el mensaje directo
            if (msg.imageMessage?.viewOnce) return msg
            if (msg.videoMessage?.viewOnce) return msg
            if (msg.audioMessage?.viewOnce) return msg
            
            return null
        }

        const viewOnceContent = getViewOnceMessage(quotedMsg)
        
        if (!viewOnceContent) {
            console.log('Estructura del mensaje:', JSON.stringify(quotedMsg, null, 2))
            return conn.reply(m.chat, '❌ El mensaje citado no es de "ver una vez".\n\n💡 Asegúrate de responder a un mensaje que tenga la etiqueta "Ver una vez".', m)
        }

        let type
        let buffer
        let fileName = 'viewonce'
        let mediaMessage

        // Detectar el tipo de contenido
        if (viewOnceContent.imageMessage) {
            type = 'image'
            fileName = 'viewonce.jpg'
            mediaMessage = viewOnceContent.imageMessage
        } else if (viewOnceContent.videoMessage) {
            type = 'video'
            fileName = 'viewonce.mp4'
            mediaMessage = viewOnceContent.videoMessage
        } else if (viewOnceContent.audioMessage) {
            type = 'audio'
            fileName = 'viewonce.mp3'
            mediaMessage = viewOnceContent.audioMessage
        } else {
            return conn.reply(m.chat, '❌ No se pudo identificar el tipo de contenido del mensaje de "ver una vez".', m)
        }

        // Intentar descargar el contenido
        try {
            await conn.reply(m.chat, '⏳ Descargando contenido de "ver una vez"...', m)
            
            const stream = await downloadContentFromMessage(mediaMessage, type)
            buffer = Buffer.from([])
            
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk])
            }

            if (!buffer || buffer.length === 0) {
                return conn.reply(m.chat, '❌ No se pudo descargar el contenido.\n\n⚠️ El mensaje puede haber expirado o sido eliminado.', m)
            }

            // Enviar el contenido capturado
            const caption = `👁️ *Contenido de "Ver una vez" revelado*\n\n📤 Solicitado por: @${m.sender.split('@')[0]}`

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

        } catch (downloadError) {
            console.error('Error al descargar contenido viewOnce:', downloadError)
            return conn.reply(m.chat, '❌ Error al descargar el contenido.\n\n⚠️ El mensaje de "ver una vez" probablemente ya fue visto o eliminado del servidor.', m)
        }

    } catch (error) {
        console.error('Error en comando .ver:', error)
        console.error('Stack:', error.stack)
        await conn.reply(m.chat, `❌ Ocurrió un error al procesar el comando.\n\n🔧 Error: ${error.message}`, m)
    }
}

handler.help = ['ver', 'viewonce', 'revelar']
handler.tags = ['tools']
handler.command = /^(ver|viewonce|revelar|antiviewonce)$/i
handler.group = true

export default handler
