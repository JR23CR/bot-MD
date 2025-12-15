import { downloadContentFromMessage } from '@whiskeysockets/baileys'

let handler = async (m, { conn, command }) => {
    try {
        // Verificar si hay un mensaje citado
        if (!m.quoted) {
            return conn.reply(m.chat, '❌ Debes responder a un mensaje de "ver una vez" con este comando.\n\n📝 Uso: Responde a la imagen/video de ver una vez con *.ver*', m)
        }

        // Verificar si el mensaje citado es viewOnce
        const quotedMsg = m.quoted
        
        if (!quotedMsg.viewOnce && !quotedMsg.message?.viewOnceMessage && !quotedMsg.message?.viewOnceMessageV2) {
            return conn.reply(m.chat, '❌ El mensaje citado no es de "ver una vez".\n\n💡 Asegúrate de responder a un mensaje que tenga la etiqueta "Ver una vez".', m)
        }

        // Extraer el contenido del mensaje viewOnce
        let type
        let buffer
        let fileName = 'viewonce'

        // Intentar obtener el contenido del mensaje
        try {
            if (quotedMsg.message?.viewOnceMessage || quotedMsg.message?.viewOnceMessageV2) {
                const viewOnceMsg = quotedMsg.message.viewOnceMessage || quotedMsg.message.viewOnceMessageV2.message

                if (viewOnceMsg.imageMessage) {
                    type = 'image'
                    fileName = 'viewonce.jpg'
                    const stream = await downloadContentFromMessage(viewOnceMsg.imageMessage, 'image')
                    buffer = Buffer.from([])
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk])
                    }
                } else if (viewOnceMsg.videoMessage) {
                    type = 'video'
                    fileName = 'viewonce.mp4'
                    const stream = await downloadContentFromMessage(viewOnceMsg.videoMessage, 'video')
                    buffer = Buffer.from([])
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk])
                    }
                } else if (viewOnceMsg.audioMessage) {
                    type = 'audio'
                    fileName = 'viewonce.mp3'
                    const stream = await downloadContentFromMessage(viewOnceMsg.audioMessage, 'audio')
                    buffer = Buffer.from([])
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk])
                    }
                }
            }

            if (!buffer) {
                return conn.reply(m.chat, '❌ No se pudo obtener el contenido del mensaje de "ver una vez".\n\n⚠️ Es posible que el mensaje ya haya sido visualizado o eliminado.', m)
            }

            // Enviar el contenido capturado
            const caption = `👁️ *Contenido de "Ver una vez" capturado*\n\n📤 Solicitado por: @${m.sender.split('@')[0]}`

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
        await conn.reply(m.chat, `❌ Ocurrió un error al procesar el comando.\n\n🔧 Error: ${error.message}`, m)
    }
}

handler.help = ['ver', 'viewonce', 'revelar']
handler.tags = ['tools']
handler.command = /^(ver|viewonce|revelar|antiviewonce)$/i
handler.group = true

export default handler
