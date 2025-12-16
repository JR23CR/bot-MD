import yts from 'yt-search'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

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

    // Convertir duración a segundos
    const durationParts = video.timestamp.split(':').map(Number)
    let durationInSeconds = 0
    if (durationParts.length === 3) {
        durationInSeconds = durationParts[0] * 3600 + durationParts[1] * 60 + durationParts[2]
    } else if (durationParts.length === 2) {
        durationInSeconds = durationParts[0] * 60 + durationParts[1]
    }

    let caption = `╭━━━━━━━━━⬣
┃ 🎬 *YOUTUBE*
┃┈┈┈┈┈┈┈┈┈┈┈┈┈
┃▢ 📌 *Título:*
┃ ${video.title}
┃┈┈┈┈┈┈┈┈┈┈┈┈┈
┃▢ 📺 *Canal:*
┃ ${video.author.name}
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
        author: video.author.name,
        thumbnail: video.thumbnail,
        duration: durationInSeconds,
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
        
        const isAudio = text === 'audio'
        
        // Verificar duración
        if (isAudio && userQueue.duration > 600) {
            await m.react('❌')
            return m.reply('❌ El audio es muy largo. Máximo: 10 minutos.')
        }
        
        if (!isAudio && userQueue.duration > 300) {
            await m.react('❌')
            return m.reply('❌ El video es muy largo. Máximo: 5 minutos.')
        }
        
        await m.reply('⏳ Descargando... Por favor espera...')
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('🎵 DESCARGA CON YT-DLP')
        console.log(`📝 Título: ${userQueue.title}`)
        console.log(`🔗 URL: ${userQueue.url}`)
        console.log(`📦 Tipo: ${isAudio ? 'Audio' : 'Video'}`)
        console.log(`⏱️ Duración: ${userQueue.duration}s`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

        // Verificar si yt-dlp está instalado
        try {
            await execPromise('yt-dlp --version')
            console.log('✅ yt-dlp encontrado')
        } catch (error) {
            console.log('❌ yt-dlp no está instalado')
            await m.react('❌')
            return m.reply(`❌ *yt-dlp no está instalado*

Para instalar yt-dlp:

*En Termux:*
\`\`\`
pkg install python
pip install yt-dlp
\`\`\`

*En Ubuntu/Linux:*
\`\`\`
sudo apt install python3-pip
pip3 install yt-dlp
\`\`\`

*En Windows:*
Descarga desde: https://github.com/yt-dlp/yt-dlp/releases`)
        }

        const tmpDir = './tmp'
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true })
        }

        const cleanTitle = userQueue.title
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 50)
        
        const timestamp = Date.now()

        if (isAudio) {
            console.log('🎵 Descargando audio con yt-dlp...')
            
            const outputTemplate = `${tmpDir}/${cleanTitle}_${timestamp}.%(ext)s`
            const command = `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outputTemplate}" "${userQueue.url}"`
            
            console.log(`🔧 Comando: ${command}`)
            
            const { stdout, stderr } = await execPromise(command, { 
                maxBuffer: 1024 * 1024 * 50 // 50MB buffer
            })
            
            if (stderr && !stderr.includes('Deleting original file')) {
                console.log('⚠️ Stderr:', stderr)
            }
            
            // Buscar el archivo descargado
            const files = fs.readdirSync(tmpDir).filter(file => 
                file.startsWith(`${cleanTitle}_${timestamp}`) && file.endsWith('.mp3')
            )
            
            if (files.length === 0) {
                throw new Error('No se encontró el archivo descargado')
            }
            
            filePath = path.join(tmpDir, files[0])
            console.log('✅ Audio descargado:', filePath)
            
            // Verificar tamaño
            const stats = fs.statSync(filePath)
            const fileSizeMB = stats.size / (1024 * 1024)
            console.log(`📦 Tamaño: ${fileSizeMB.toFixed(2)} MB`)
            
            if (fileSizeMB > 15) {
                fs.unlinkSync(filePath)
                await m.react('❌')
                return m.reply('❌ El archivo es muy grande (>15MB). Intenta con un video más corto.')
            }
            
            console.log('📤 Enviando audio...')
            
            await conn.sendMessage(m.chat, {
                audio: fs.readFileSync(filePath),
                mimetype: 'audio/mpeg',
                fileName: `${userQueue.title}.mp3`,
                ptt: false
            }, { quoted: m })

        } else {
            console.log('🎥 Descargando video con yt-dlp...')
            
            const outputTemplate = `${tmpDir}/${cleanTitle}_${timestamp}.%(ext)s`
            // Descargar en formato 360p o menor
            const command = `yt-dlp -f "best[height<=360]" --merge-output-format mp4 -o "${outputTemplate}" "${userQueue.url}"`
            
            console.log(`🔧 Comando: ${command}`)
            
            const { stdout, stderr } = await execPromise(command, { 
                maxBuffer: 1024 * 1024 * 50
            })
            
            if (stderr && !stderr.includes('Deleting original file')) {
                console.log('⚠️ Stderr:', stderr)
            }
            
            // Buscar el archivo descargado
            const files = fs.readdirSync(tmpDir).filter(file => 
                file.startsWith(`${cleanTitle}_${timestamp}`) && file.endsWith('.mp4')
            )
            
            if (files.length === 0) {
                throw new Error('No se encontró el archivo descargado')
            }
            
            filePath = path.join(tmpDir, files[0])
            console.log('✅ Video descargado:', filePath)
            
            // Verificar tamaño
            const stats = fs.statSync(filePath)
            const fileSizeMB = stats.size / (1024 * 1024)
            console.log(`📦 Tamaño: ${fileSizeMB.toFixed(2)} MB`)
            
            if (fileSizeMB > 15) {
                fs.unlinkSync(filePath)
                await m.react('❌')
                return m.reply('❌ El archivo es muy grande (>15MB). Intenta con un video más corto.')
            }
            
            console.log('📤 Enviando video...')
            
            await conn.sendMessage(m.chat, {
                video: fs.readFileSync(filePath),
                mimetype: 'video/mp4',
                fileName: `${userQueue.title}.mp4`,
                caption: `🎬 *${userQueue.title}*\n📺 ${userQueue.author}`
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
                    console.log('⚠️ No se pudo eliminar:', e.message)
                }
            }, 60000)
        }

        delete global.ytPlayQueue[m.sender]

    } catch (error) {
        console.error('\n❌❌ ERROR EN DESCARGA ❌❌')
        console.error(error)
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
        
        await m.react('❌')
        
        let errorMsg = '❌ *Error en la descarga*\n\n'
        
        if (error.message.includes('yt-dlp')) {
            errorMsg += 'yt-dlp no está instalado o no funciona correctamente.'
        } else if (error.message.includes('Video unavailable')) {
            errorMsg += 'El video no está disponible.'
        } else if (error.message.includes('Private video')) {
            errorMsg += 'El video es privado.'
        } else if (error.message.includes('not found')) {
            errorMsg += 'No se encontró el archivo descargado.'
        } else {
            errorMsg += `Error: ${error.message}\n\nIntenta con otro video.`
        }
        
        await m.reply(errorMsg)
        
        if (filePath && fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath)
            } catch (e) {
                console.log('⚠️ Error al eliminar:', e.message)
            }
        }
        
        delete global.ytPlayQueue[m.sender]
    }
}

handler.command = /^(play|play2|yt)$/i
handler.register = true
export default handler
