import { downloadContentFromMessage } from '@whiskeysockets/baileys'

let handler = async (m, { conn, command }) => {
    try {
        // Verificar si hay un mensaje citado
        if (!m.quoted) {
            return conn.reply(m.chat, '❌ Debes responder a un mensaje de "ver una vez" con este comando.\n\n📝 Uso: Responde a la imagen/video de ver una vez con *.ver*', m)
        }

        const quotedMsg = m.quoted
        
        // Log completo para debug
        console.log('=== DEBUG VIEW ONCE ===')
        console.log('quotedMsg keys:', Object.keys(quotedMsg))
        console.log('quotedMsg.mtype:', quotedMsg.mtype)
        console.log('quotedMsg.msg:', quotedMsg.msg ? Object.keys(quotedMsg.msg) : 'no msg')
        console.log('quotedMsg.message:', quotedMsg.message ? JSON.stringify(quotedMsg.message, null, 2) : 'no message')
        console.log('Full quotedMsg:', JSON.stringify(quotedMsg, null, 2))
        console.log('======================')

        // Intentar obtener el mensaje de diferentes maneras
        let viewOnceMsg = null
        let mediaMessage = null
        let type = null

        // Método 1: Verificar en quotedMsg.msg
        if (quotedMsg.msg) {
            if (quotedMsg.msg.viewOnce || quotedMsg.mtype?.includes('viewOnce')) {
                if (quotedMsg.msg.imageMessage) {
                    type = 'image'
                    mediaMessage = quotedMsg.msg.imageMessage
                } else if (quotedMsg.msg.videoMessage) {
                    type = 'video'
                    mediaMessage = quotedMsg.msg.videoMessage
                } else if (quotedMsg.msg.audioMessage) {
                    type = 'audio'
                    mediaMessage = quotedMsg.msg.audioMessage
                }
            }
        }

        // Método 2: Verificar en quotedMsg.message
        if (!mediaMessage && quotedMsg.message) {
            const msg = quotedMsg.message
            
            if (msg.viewOnceMessage?.message) {
                viewOnceMsg = msg.viewOnceMessage.message
            } else if (msg.viewOnceMessageV2?.message) {
                viewOnceMsg = msg.viewOnceMessageV2.message
            } else if (msg.viewOnceMessageV2Extension?.message) {
                viewOnceMsg = msg.viewOnceMessageV2Extension.message
            }

            if (viewOnceMsg) {
                if (viewOnceMsg.imageMessage) {
                    type = 'image'
                    mediaMessage = viewOnceMsg.imageMessage
                } else if (viewOnceMsg.videoMessage) {
                    type = 'video'
                    mediaMessage = viewOnceMsg.videoMessage
                } else if (viewOnceMsg.audioMessage) {
                    type = 'audio'
                    mediaMessage = viewOnceMsg.audioMessage
                }
            }
        }

        // Método 3: Verificar directamente en el mensaje citado
        if (!mediaMessage) {
            if (quotedMsg.imageMessage?.viewOnce) {
                type = 'image'
                mediaMessage = quotedMsg.imageMessage
            } else if (quotedMsg.videoMessage?.viewOnce) {
                type = 'video'
                mediaMessage = quotedMsg.videoMessage
            } else if (quotedMsg.audioMessage?.viewOnce) {
                type = 'audio'
                mediaMessage = quotedMsg.audioMessage
            }
        }

        // Método 4: Usar el mtype
        if (!mediaMessage && quotedMsg.mtype) {
            if (quotedMsg.mtype.includes('image')) {
                type = 'image'
                mediaMessage = quotedMsg.msg
            } else if (quotedMsg.mtype.includes('video')) {
                type = 'video'
                mediaMessage = quotedMsg.msg
            } else if (quotedMsg.mtype.includes('audio')) {
                type = 'audio'
                mediaMessage = quotedMsg.msg
            }
        }

        if (!mediaMessage) {
            return conn.reply(m.chat, '❌ El mensaje citado no es de "ver una vez".\n\n💡 Asegúrate de responder a un mensaje que tenga la etiqueta "Ver una vez".\n\n🔍 Revisa la consola para más detalles de debug.', m)
        }

        // Intentar descargar el contenido
        try {
            await conn.reply(m.chat, '⏳ Descargando contenido de "ver una vez"...', m)
            
            console.log('Intentando descargar tipo:', type)
            console.log('mediaMessage keys:', Object.keys(mediaMessage))
            
            const stream = await downloadContentFromMessage(mediaMessage, type)
            let buffer = Buffer.from([])
            
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk])
            }

            if (!buffer || buffer.length === 0) {
                return conn.reply(m.chat, '❌ No se pudo descargar el contenido.\n\n⚠️ El mensaje puede haber expirado o sido eliminado.', m)
            }

            // Enviar el contenido capturado
            const caption = `👁️ *Contenido de "Ver una vez" revelado*\n\n📤 Solicitado por: @${m.sender.split('@')[0]}\n📦 Tamaño: ${(buffer.length / 1024).toFixed(2)} KB`

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

            console.log('✅ Contenido enviado exitosamente')

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
