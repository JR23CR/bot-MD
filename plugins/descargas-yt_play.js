import yts from 'yt-search'
import ytdl from 'ytdl-core'
import fs from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
const execPromise = promisify(exec)

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
    const validOptions = ['audio', 'video']
    
    if (!validOptions.includes(text)) return

    let filePath = null
    
    try {
        await m.react('⏳')
        await m.reply('⏳ Descargando... Por favor espera...')
        
        const isAudio = text === 'audio'
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('🎵 INICIANDO DESCARGA DE YOUTUBE')
        console.log(`📝 Título: ${userQueue.title}`)
        console.log(`🔗 URL: ${userQueue.url}`)
        console.log(`📦 Tipo: ${isAudio ? 'Audio' : 'Video'}`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

        // Verificar si el video existe y obtener información
        console.log('🔍 Verificando video...')
        const info = await ytdl.getInfo(userQueue.url)
        console.log(`✅ Video encontrado: ${info.videoDetails.title}`)
        console.log(`⏱️ Duración: ${info.videoDetails.lengthSeconds}s`)

        // Limpiar nombre de archivo
        const cleanTitle = userQueue.title
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 50)
        
        const timestamp = Date.now()
        const tmpDir = './tmp'
        
        // Crear directorio tmp si no existe
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true })
            console.log('📁 Directorio tmp creado')
        }

        if (isAudio) {
            console.log('🎵 Descargando audio...')
            
            // Archivo temporal
            const inputFile = `${tmpDir}/${cleanTitle}_${timestamp}_temp.mp4`
            const outputFile = `${tmpDir}/${cleanTitle}_${timestamp}.mp3`
            filePath = outputFile

            // Descargar audio de mejor calidad
            const audioStream = ytdl(userQueue.url, {
                quality: 'highestaudio',
                filter: 'audioonly'
            })

            const writeStream = fs.createWriteStream(inputFile)
            
            await new Promise((resolve, reject) => {
                audioStream.pipe(writeStream)
                audioStream.on('error', reject)
                writeStream.on('finish', resolve)
                writeStream.on('error', reject)
            })

            console.log('✅ Audio descargado')
            console.log('🔄 Convirtiendo a MP3...')

            // Convertir a MP3 con ffmpeg
            try {
                await execPromise(`ffmpeg -i "${inputFile}" -vn -ar 44100 -ac 2 -b:a 192k "${outputFile}"`)
                console.log('✅ Conversión completada')
                
                // Eliminar archivo temporal
                if (fs.existsSync(inputFile)) {
                    fs.unlinkSync(inputFile)
                }
            } catch (ffmpegError) {
                console.log('⚠️ FFmpeg no disponible, enviando audio original')
                // Si ffmpeg falla, usar el archivo original
                if (fs.existsSync(inputFile)) {
                    fs.renameSync(inputFile, outputFile)
                }
            }

            console.log('📤 Enviando audio...')
            
            // Enviar audio
            await conn.sendMessage(m.chat, {
                audio: fs.readFileSync(outputFile),
                mimetype: 'audio/mpeg',
                fileName: `${userQueue.title}.mp3`,
                ptt: false
            }, { quoted: m })

        } else {
            console.log('🎥 Descargando video...')
            
            const videoFile = `${tmpDir}/${cleanTitle}_${timestamp}.mp4`
            filePath = videoFile

            // Descargar video en calidad 360p (balance entre calidad y tamaño)
            const videoStream = ytdl(userQueue.url, {
                quality: '18', // 360p
                filter: format => format.container === 'mp4' && format.hasVideo && format.hasAudio
            })

            const writeStream = fs.createWriteStream(videoFile)
            
            await new Promise((resolve, reject) => {
                videoStream.pipe(writeStream)
                videoStream.on('error', reject)
                writeStream.on('finish', resolve)
                writeStream.on('error', reject)
            })

            console.log('✅ Video descargado')
            console.log('📤 Enviando video...')

            // Enviar video
            await conn.sendMessage(m.chat, {
                video: fs.readFileSync(videoFile),
                mimetype: 'video/mp4',
                fileName: `${userQueue.title}.mp4`,
                caption: `🎬 *${userQueue.title}*`
            }, { quoted: m })
        }

        await m.react('✅')
        console.log(`\n✅✅ DESCARGA EXITOSA ✅✅\n`)
        
        // Limpiar archivo temporal
        if (filePath && fs.existsSync(filePath)) {
            setTimeout(() => {
                try {
                    fs.unlinkSync(filePath)
                    console.log('🗑️ Archivo temporal eliminado')
                } catch (e) {
                    console.log('⚠️ No se pudo eliminar archivo temporal:', e.message)
                }
            }, 60000) // Eliminar después de 1 minuto
        }

        delete global.ytPlayQueue[m.sender]

    } catch (error) {
        console.error('\n❌❌ ERROR EN DESCARGA ❌❌')
        console.error(error)
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
        
        await m.react('❌')
        
        let errorMsg = '❌ *Error en la descarga*\n\n'
        
        if (error.message.includes('No video id found')) {
            errorMsg += 'El enlace del video no es válido.'
        } else if (error.message.includes('Video unavailable')) {
            errorMsg += 'El video no está disponible o es privado.'
        } else if (error.message.includes('429')) {
            errorMsg += 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.'
        } else if (error.message.includes('ENOSPC')) {
            errorMsg += 'No hay espacio suficiente en el servidor.'
        } else {
            errorMsg += `Error: ${error.message}\n\nIntenta con otro video o más tarde.`
        }
        
        await m.reply(errorMsg)
        
        // Limpiar archivos en caso de error
        if (filePath && fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath)
            } catch (e) {
                console.log('⚠️ No se pudo eliminar archivo:', e.message)
            }
        }
        
        delete global.ytPlayQueue[m.sender]
    }
}

handler.command = /^(play|play2|yt)$/i
handler.register = true
export default handler
