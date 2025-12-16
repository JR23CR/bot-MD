import yts from 'yt-search'
import fetch from 'node-fetch'

let handler = async (m, {conn, command, args, text, usedPrefix}) => {
try {
    if (!text) {
        return m.reply(`❌ *Uso incorrecto*\n\n*Ejemplo:*\n${usedPrefix + command} Billie Eilish - Bellyache\n${usedPrefix + command} https://youtu.be/gBRi6aZJGj4`)
    }

    await m.react('🔍')
    let search = await yts(text)
    let video = search.videos[0]
    
    if (!video) {
        await m.react('❌')
        return m.reply('❌ No se encontraron resultados')
    }

    let caption = `╭━━━━━━━━━⬣
┃ 🎬 *YOUTUBE*
┃┈┈┈┈┈┈┈┈┈┈┈┈┈
┃▢ 📌 *Título:*
┃ ${video.title}
┃┈┈┈┈┈┈┈┈┈┈┈┈┈
┃▢ ⏱️ *Duración:*
┃ ${video.timestamp}
┃┈┈┈┈┈┈┈┈┈┈┈┈┈
┃▢ 👁️ *Vistas:*
┃ ${video.views.toLocaleString()}
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

    let sentMsg = await conn.sendMessage(m.chat, {
        image: { url: video.thumbnail },
        caption: caption
    }, { quoted: m })

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
    console.error('❌ Error en play:', error)
    await m.react('❌')
    return m.reply('❌ Ocurrió un error al buscar el video. Intenta de nuevo.')
}
}

handler.before = async (m, { conn }) => {
    if (!m.quoted) return
    if (!global.ytPlayQueue) global.ytPlayQueue = {}
    
    const userQueue = global.ytPlayQueue[m.sender]
    if (!userQueue) return
    
    if (Date.now() - userQueue.timestamp > 300000) {
        delete global.ytPlayQueue[m.sender]
        return
    }

    const text = m.text.toLowerCase().trim()
    const validOptions = ['audio', 'video', 'audiodoc', 'videodoc']
    
    if (!validOptions.includes(text)) return

    try {
        await m.react('⏳')
        
        const isAudio = text === 'audio' || text === 'audiodoc'
        const isDocument = text === 'audiodoc' || text === 'videodoc'
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('🎵 INICIANDO DESCARGA DE YOUTUBE')
        console.log(`📝 Título: ${userQueue.title}`)
        console.log(`🔗 URL: ${userQueue.url}`)
        console.log(`📦 Tipo: ${isAudio ? 'Audio' : 'Video'}`)
        console.log(`📄 Documento: ${isDocument ? 'Sí' : 'No'}`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

        // APIs organizadas por prioridad
        const apis = [
            // API 1: Cobalt (Muy confiable)
            {
                name: 'Cobalt',
                download: async (url, type) => {
                    const apiUrl = 'https://api.cobalt.tools/api/json'
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            url: url,
                            vCodec: 'h264',
                            vQuality: '720',
                            aFormat: 'mp3',
                            filenamePattern: 'basic',
                            isAudioOnly: type === 'audio'
                        })
                    })
                    const data = await response.json()
                    console.log(`📊 Cobalt response:`, JSON.stringify(data, null, 2))
                    
                    if (data.status === 'redirect' || data.status === 'stream') {
                        return { url: data.url, title: userQueue.title }
                    }
                    throw new Error(`Status: ${data.status}`)
                }
            },
            // API 2: Y2Mate
            {
                name: 'Y2Mate',
                download: async (url, type) => {
                    const videoId = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/)?.[1]
                    if (!videoId) throw new Error('Invalid video ID')
                    
                    const apiUrl = type === 'audio' 
                        ? `https://api-y2mate.vercel.app/api/ytmp3?url=${encodeURIComponent(url)}`
                        : `https://api-y2mate.vercel.app/api/ytmp4?url=${encodeURIComponent(url)}`
                    
                    const response = await fetch(apiUrl, { timeout: 30000 })
                    const data = await response.json()
                    console.log(`📊 Y2Mate response:`, JSON.stringify(data, null, 2))
                    
                    if (data.download) {
                        return { url: data.download, title: data.title || userQueue.title }
                    }
                    throw new Error('No download URL')
                }
            },
            // API 3: DownloadFrom
            {
                name: 'DownloadFrom',
                download: async (url, type) => {
                    const apiUrl = `https://api.downloadfrom.us/download?url=${encodeURIComponent(url)}`
                    const response = await fetch(apiUrl, { timeout: 30000 })
                    const data = await response.json()
                    console.log(`📊 DownloadFrom response:`, JSON.stringify(data, null, 2))
                    
                    if (data.status === 'success' && data.url) {
                        return { url: data.url, title: data.title || userQueue.title }
                    }
                    throw new Error('No download URL')
                }
            },
            // API 4: Alltubedownload
            {
                name: 'Alltubedownload',
                download: async (url, type) => {
                    const endpoint = type === 'audio' ? 'ytmp3' : 'ytmp4'
                    const apiUrl = `https://api.alltubedownload.com/api/${endpoint}?url=${encodeURIComponent(url)}`
                    const response = await fetch(apiUrl, { timeout: 30000 })
                    const data = await response.json()
                    console.log(`📊 Alltubedownload response:`, JSON.stringify(data, null, 2))
                    
                    if (data.result && data.result.url) {
                        return { url: data.result.url, title: data.result.title || userQueue.title }
                    }
                    throw new Error('No download URL')
                }
            },
            // API 5: SaveFrom
            {
                name: 'SaveFrom',
                download: async (url, type) => {
                    const apiUrl = `https://api.savefrom.net/api/?url=${encodeURIComponent(url)}`
                    const response = await fetch(apiUrl, { timeout: 30000 })
                    const data = await response.json()
                    console.log(`📊 SaveFrom response:`, JSON.stringify(data, null, 2))
                    
                    if (data.status === 'ok' && data.url) {
                        return { url: data.url, title: data.title || userQueue.title }
                    }
                    throw new Error('No download URL')
                }
            },
            // API 6: YTDL Simple
            {
                name: 'YTDL-Simple',
                download: async (url, type) => {
                    const format = type === 'audio' ? 'mp3' : 'mp4'
                    const apiUrl = `https://ytdl-simple.vercel.app/api/download?url=${encodeURIComponent(url)}&format=${format}`
                    const response = await fetch(apiUrl, { timeout: 30000 })
                    const data = await response.json()
                    console.log(`📊 YTDL-Simple response:`, JSON.stringify(data, null, 2))
                    
                    if (data.downloadUrl) {
                        return { url: data.downloadUrl, title: data.title || userQueue.title }
                    }
                    throw new Error('No download URL')
                }
            }
        ]
        
        let downloaded = false
        let lastError = null

        for (const api of apis) {
            if (downloaded) break
            
            try {
                console.log(`\n🔄 Intentando con: ${api.name}`)
                
                const result = await api.download(userQueue.url, isAudio ? 'audio' : 'video')

                if (!result || !result.url) {
                    console.log(`❌ ${api.name}: No retornó URL válida`)
                    continue
                }

                console.log(`✅ ${api.name}: URL obtenida - ${result.url.substring(0, 50)}...`)
                console.log(`📤 Enviando archivo...`)

                // Enviar el archivo
                if (isAudio) {
                    await conn.sendMessage(m.chat, {
                        [isDocument ? 'document' : 'audio']: { url: result.url },
                        mimetype: 'audio/mpeg',
                        fileName: `${result.title}.mp3`
                    }, { quoted: m })
                } else {
                    await conn.sendMessage(m.chat, {
                        [isDocument ? 'document' : 'video']: { url: result.url },
                        mimetype: 'video/mp4',
                        fileName: `${result.title}.mp4`,
                        caption: `🎬 *${result.title}*`
                    }, { quoted: m })
                }

                downloaded = true
                await m.react('✅')
                console.log(`\n✅✅ DESCARGA EXITOSA CON: ${api.name} ✅✅\n`)
                
            } catch (apiError) {
                lastError = apiError
                console.log(`❌ Error con ${api.name}:`)
                console.log(`   → Mensaje: ${apiError.message}`)
                console.log(`   → Stack: ${apiError.stack?.split('\n')[0]}`)
                continue
            }
        }

        if (!downloaded) {
            await m.react('❌')
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
            console.log('❌ TODAS LAS APIs FALLARON')
            console.log(`Último error: ${lastError?.message}`)
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
            
            await m.reply(`❌ *Error de descarga*\n\nNo se pudo descargar el archivo.\n\n*Último error:*\n${lastError?.message || 'Desconocido'}\n\n*Intenta:*\n• Usar otro video\n• Intentar más tarde\n• Reportar este error al desarrollador`)
        }

        delete global.ytPlayQueue[m.sender]

    } catch (error) {
        console.error('\n❌❌ ERROR CRÍTICO ❌❌')
        console.error(error)
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
        
        await m.react('❌')
        await m.reply(`❌ *Error crítico*\n\n${error.message}\n\nRevisa los logs del servidor.`)
        delete global.ytPlayQueue[m.sender]
    }
}

handler.command = /^(play|play2|yt)$/i
handler.register = true
export default handler
