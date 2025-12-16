import yts from 'yt-search'
import fetch from 'node-fetch'

let handler = async (m, {conn, command, args, text, usedPrefix}) => {
try {
    // Validar que se proporcione texto
    if (!text) {
        return m.reply(`❌ *Uso incorrecto*\n\n*Ejemplo:*\n${usedPrefix + command} Billie Eilish - Bellyache\n${usedPrefix + command} https://youtu.be/gBRi6aZJGj4`)
    }

    // Buscar el video en YouTube
    await m.react('🔍')
    let search = await yts(text)
    let video = search.videos[0]
    
    if (!video) {
        await m.react('❌')
        return m.reply('❌ No se encontraron resultados')
    }

    // Preparar el mensaje con la información del video
    let caption = `╭━━━━━━━━━⬣
┃ 🎬 *YOUTUBE*
┃┈┈┈┈┈┈┈┈┈┈┈┈┈
┃▢ 📌 *Título:*
┃ ${video.title}
┃┈┈┈┈┈┈┈┈┈┈┈┈┈
┃▢ 📝 *Descripción:*
┃ ${video.description ? video.description.substring(0, 150) + '...' : 'Sin descripción'}
┃┈┈┈┈┈┈┈┈┈┈┈┈┈
┃▢ ⏱️ *Duración:*
┃ ${video.timestamp}
┃┈┈┈┈┈┈┈┈┈┈┈┈┈
┃▢ 👁️ *Vistas:*
┃ ${video.views.toLocaleString()}
┃┈┈┈┈┈┈┈┈┈┈┈┈┈
┃▢ 📆 *Publicado:*
┃ ${video.ago}
┃┈┈┈┈┈┈┈┈┈┈┈┈┈
┃▢ 🔗 *Link:*
┃ ${video.url}
╰━━━━━━━━━⬣

*Selecciona una opción:*
╭┄┄┄┄┄┄┄┄┄┄┄┄┄
┊ 🎵 Escribe: *audio*
┊ 🎥 Escribe: *video*
┊ 📄 Escribe: *audiodoc*
┊ 📹 Escribe: *videodoc*
╰┄┄┄┄┄┄┄┄┄┄┄┄┄

_Responde a este mensaje con la opción que desees_`

    // Enviar el mensaje con la información
    let sentMsg = await conn.sendMessage(m.chat, {
        image: { url: video.thumbnail },
        caption: caption
    }, { quoted: m })

    // Guardar la información del video para cuando el usuario responda
    if (!global.ytPlayQueue) global.ytPlayQueue = {}
    global.ytPlayQueue[m.sender] = {
        url: video.url,
        title: video.title,
        thumbnail: video.thumbnail,
        timestamp: Date.now(),
        messageId: sentMsg.key.id
    }

    await m.react('✅')

} catch (error) {
    console.error('Error en play:', error)
    await m.react('❌')
    return m.reply('❌ Ocurrió un error al buscar el video. Intenta de nuevo.')
}
}

// Handler para procesar las respuestas (audio, video, etc.)
handler.before = async (m, { conn }) => {
    if (!m.quoted) return
    if (!global.ytPlayQueue) global.ytPlayQueue = {}
    
    const userQueue = global.ytPlayQueue[m.sender]
    if (!userQueue) return
    
    // Verificar que la respuesta sea al mensaje correcto (dentro de 5 minutos)
    if (Date.now() - userQueue.timestamp > 300000) {
        delete global.ytPlayQueue[m.sender]
        return
    }

    const text = m.text.toLowerCase().trim()
    const validOptions = ['audio', 'video', 'audiodoc', 'videodoc']
    
    if (!validOptions.includes(text)) return

    try {
        await m.react('⏳')

        // APIs para descargar
        const apis = [
            // API 1: BK9 (Confiable)
            {
                name: 'BK9',
                audio: async (url) => {
                    const res = await fetch(`https://api.bk9.site/api/ytmp3?url=${url}`)
                    const data = await res.json()
                    return { url: data.BK9, title: userQueue.title }
                },
                video: async (url) => {
                    const res = await fetch(`https://api.bk9.site/api/ytmp4?url=${url}`)
                    const data = await res.json()
                    return { url: data.BK9, title: userQueue.title }
                }
            },
            // API 2: Ryzendesu
            {
                name: 'Ryzendesu',
                audio: async (url) => {
                    const res = await fetch(`https://api.ryzendesu.vip/api/downloader/ytmp3?url=${url}`)
                    const data = await res.json()
                    return { url: data.url, title: data.metadata?.title || userQueue.title }
                },
                video: async (url) => {
                    const res = await fetch(`https://api.ryzendesu.vip/api/downloader/ytmp4?url=${url}`)
                    const data = await res.json()
                    return { url: data.url, title: data.metadata?.title || userQueue.title }
                }
            },
            // API 3: Widipe
            {
                name: 'Widipe',
                audio: async (url) => {
                    const res = await fetch(`https://widipe.com/download/ytdl?url=${url}`)
                    const data = await res.json()
                    return { url: data.result.mp3, title: data.result.title || userQueue.title }
                },
                video: async (url) => {
                    const res = await fetch(`https://widipe.com/download/ytdl?url=${url}`)
                    const data = await res.json()
                    return { url: data.result.mp4, title: data.result.title || userQueue.title }
                }
            }
        ]

        const isAudio = text === 'audio' || text === 'audiodoc'
        const isDocument = text === 'audiodoc' || text === 'videodoc'
        
        let downloaded = false

        // Intentar con cada API
        for (const api of apis) {
            if (downloaded) break
            
            try {
                console.log(`Intentando con API: ${api.name}`)
                
                const result = isAudio 
                    ? await api.audio(userQueue.url)
                    : await api.video(userQueue.url)

                if (!result || !result.url) continue

                // Descargar y enviar
                if (isAudio) {
                    await conn.sendMessage(m.chat, {
                        [isDocument ? 'document' : 'audio']: { url: result.url },
                        mimetype: 'audio/mpeg',
                        fileName: `${result.title}.mp3`,
                        ...(isDocument && { 
                            fileName: `${result.title}.mp3`,
                            mimetype: 'audio/mpeg'
                        })
                    }, { quoted: m })
                } else {
                    await conn.sendMessage(m.chat, {
                        [isDocument ? 'document' : 'video']: { url: result.url },
                        mimetype: 'video/mp4',
                        fileName: `${result.title}.mp4`,
                        caption: `🎬 *${result.title}*`,
                        ...(isDocument && {
                            fileName: `${result.title}.mp4`,
                            mimetype: 'video/mp4'
                        })
                    }, { quoted: m })
                }

                downloaded = true
                await m.react('✅')
                console.log(`Descargado exitosamente con: ${api.name}`)
                
            } catch (apiError) {
                console.log(`Error con ${api.name}:`, apiError.message)
                continue
            }
        }

        if (!downloaded) {
            await m.react('❌')
            await m.reply('❌ No se pudo descargar el archivo. Todas las APIs fallaron. Intenta de nuevo más tarde.')
        }

        // Limpiar la cola
        delete global.ytPlayQueue[m.sender]

    } catch (error) {
        console.error('Error al descargar:', error)
        await m.react('❌')
        await m.reply('❌ Ocurrió un error al descargar. Intenta de nuevo.')
        delete global.ytPlayQueue[m.sender]
    }
}

handler.command = /^(play|play2|yt)$/i
handler.register = true
export default handler
