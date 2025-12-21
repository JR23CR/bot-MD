import fetch from 'node-fetch'
import yts from 'yt-search'
import {exec} from 'child_process'
import {promisify} from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)
const LimitAud = 725 * 1024 * 1024 // 725MB
const LimitVid = 425 * 1024 * 1024 // 425MB
let tempStorage = {}

const handler = async (m, {conn, command, args, text, usedPrefix}) => {
  if (!text) return conn.reply(m.chat, `${lenguajeGB['smsAvisoMG']()}${lenguajeGB.smsMalused4}\n*${usedPrefix + command} Billie Eilish - Bellyache*`, m)
  
  const yt_play = await search(args.join(' '))
  
  if (!yt_play || yt_play.length === 0) {
    return conn.reply(m.chat, '❌ No se encontraron resultados', m)
  }
  
  const video = yt_play[0]
  
  const texto1 = `⌘━─━─≪ *YOUTUBE* ≫─━─━⌘
★ TÍTULO
★ ${video.title}
╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴
★ PUBLICADO
★ ${video.ago}
╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴
★ DURACIÓN
★ ${secondString(video.duration.seconds)}
╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴
★ VISTAS
★ ${MilesNumber(video.views)}
╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴
★ AUTOR
★ ${video.author.name}
╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴ ╴
★ ENLACE
★ ${video.url.replace(/^https?:\/\//, '')}
⌘━━─≪ ${gt} ≫─━━⌘

> Para descargas en audio reacciona con "🎶"
> Para descargar en video reacciona con "📽"`.trim()

  tempStorage[m.sender] = {url: video.url, title: video.title, videoId: video.videoId}

  await conn.sendFile(m.chat, video.thumbnail, 'thumbnail.jpg', texto1, m)
}

handler.before = async (m, {conn}) => {
  const text = m.text?.trim().toLowerCase()
  if (!text || !['🎶', 'audio', '📽', 'video'].includes(text)) return
  
  const userVideoData = tempStorage[m.sender]
  if (!userVideoData || !userVideoData.url) return
  
  const isAudio = text === '🎶' || text === 'audio'
  
  try {
    await conn.reply(m.chat, `${lenguajeGB['smsAvisoEG']()}${isAudio ? '🎵 Descargando audio, esto puede tardar un momento...' : '📹 Descargando video, esto puede tardar un momento...'}`, m)
    
    const tmpDir = './tmp'
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, {recursive: true})
    
    const sanitizedTitle = userVideoData.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').substring(0, 50)
    const timestamp = Date.now()
    const outputPath = path.join(tmpDir, `${timestamp}_${sanitizedTitle}`)
    
    let localFile = null
    
    try {
      if (isAudio) {
        // Descargar audio y convertir a M4A (mejor compatibilidad con WhatsApp)
        const cmd = `python -m yt_dlp -f "bestaudio" -x --audio-format m4a -o "${outputPath}.%(ext)s" "${userVideoData.url}"`
        console.log('Ejecutando:', cmd)
        
        const {stdout, stderr} = await execAsync(cmd, {
          timeout: 180000,
          maxBuffer: 1024 * 1024 * 100
        })
        
        console.log('yt-dlp completado')
        if (stderr && stderr.includes('ERROR')) {
          throw new Error(stderr)
        }
        
        // Buscar el archivo descargado (.m4a)
        const files = fs.readdirSync(tmpDir).filter(f => 
          f.startsWith(`${timestamp}_${sanitizedTitle}`) && f.endsWith('.m4a')
        )
        
        if (files.length === 0) {
          throw new Error('Archivo de audio no encontrado después de la conversión')
        }
        
        localFile = path.join(tmpDir, files[0])
        console.log('✅ Archivo descargado:', localFile)
        
      } else {
        // Descargar video en MP4
        const cmd = `python -m yt_dlp -f "bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4][height<=720]/best" --merge-output-format mp4 -o "${outputPath}.%(ext)s" "${userVideoData.url}"`
        console.log('Ejecutando:', cmd)
        
        const {stdout, stderr} = await execAsync(cmd, {
          timeout: 300000,
          maxBuffer: 1024 * 1024 * 200
        })
        
        console.log('yt-dlp completado')
        if (stderr && stderr.includes('ERROR')) {
          throw new Error(stderr)
        }
        
        // Buscar el archivo descargado
        const files = fs.readdirSync(tmpDir).filter(f => 
          f.startsWith(`${timestamp}_${sanitizedTitle}`)
        )
        
        if (files.length === 0) {
          throw new Error('Archivo de video no encontrado después de la descarga')
        }
        
        localFile = path.join(tmpDir, files[0])
        console.log('✅ Archivo descargado:', localFile)
      }
      
    } catch (error) {
      console.error('Error en yt-dlp:', error)
      throw new Error(`No se pudo descargar: ${error.message}`)
    }
    
    // Verificar que el archivo existe
    if (!fs.existsSync(localFile)) {
      throw new Error('El archivo no existe en la ruta especificada')
    }
    
    // Verificar tamaño del archivo
    const stats = fs.statSync(localFile)
    const fileSize = stats.size
    const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2)
    console.log(`Tamaño del archivo: ${fileSizeMB} MB`)
    
    // Enviar el archivo
    if (isAudio) {
      if (fileSize > LimitAud) {
        // Enviar como documento si es muy grande
        await conn.sendMessage(m.chat, {
          document: fs.readFileSync(localFile),
          mimetype: 'audio/mp4',
          fileName: `${userVideoData.title}.m4a`
        }, {quoted: m})
      } else {
        // Enviar como audio
        await conn.sendMessage(m.chat, {
          audio: fs.readFileSync(localFile),
          mimetype: 'audio/mp4',
          fileName: `${userVideoData.title}.m4a`
        }, {quoted: m})
      }
    } else {
      if (fileSize > LimitVid) {
        await conn.sendMessage(m.chat, {
          document: fs.readFileSync(localFile),
          mimetype: 'video/mp4',
          fileName: `${userVideoData.title}.mp4`,
          caption: `⟡ *${userVideoData.title}*\n> ${wm}`
        }, {quoted: m})
      } else {
        await conn.sendMessage(m.chat, {
          video: fs.readFileSync(localFile),
          mimetype: 'video/mp4',
          caption: `⟡ *${userVideoData.title}*\n> ${wm}`
        }, {quoted: m})
      }
    }
    
    // Limpiar archivo temporal
    try {
      fs.unlinkSync(localFile)
      console.log('✅ Archivo temporal eliminado')
    } catch (e) {
      console.log('No se pudo eliminar archivo temporal:', e.message)
    }
    
    console.log('✅ Envío completado exitosamente')
    
  } catch (error) {
    console.error('Error en descarga:', error)
    await conn.reply(m.chat, `❌ Error al descargar: ${error.message}\n\n💡 *Tip*: Asegúrate de tener FFmpeg instalado para conversión de audio.`, m)
  } finally {
    delete tempStorage[m.sender]
  }
}

handler.command = /^(play|play2)$/i
handler.register = true
export default handler

// Funciones auxiliares
async function search(query, options = {}) {
  const search = await yts.search({query, hl: 'es', gl: 'ES', ...options})
  return search.videos
}

function MilesNumber(number) {
  const exp = /(\d)(?=(\d{3})+(?!\d))/g
  const rep = '$1.'
  const arr = number.toString().split('.')
  arr[0] = arr[0].replace(exp, rep)
  return arr[1] ? arr.join('.') : arr[0]
}

function secondString(seconds) {
  seconds = Number(seconds)
  const d = Math.floor(seconds / (3600 * 24))
  const h = Math.floor((seconds % (3600 * 24)) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const dDisplay = d > 0 ? d + (d == 1 ? ' día, ' : ' días, ') : ''
  const hDisplay = h > 0 ? h + (h == 1 ? ' hora, ' : ' horas, ') : ''
  const mDisplay = m > 0 ? m + (m == 1 ? ' minuto, ' : ' minutos, ') : ''
  const sDisplay = s > 0 ? s + (s == 1 ? ' segundo' : ' segundos') : ''
  return dDisplay + hDisplay + mDisplay + sDisplay
}
