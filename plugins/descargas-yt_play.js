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
    await conn.reply(m.chat, `${lenguajeGB['smsAvisoEG']()}${isAudio ? '🎵 Descargando audio...' : '📹 Descargando video...'}`, m)
    
    let downloadUrl = null
    let localFile = null
    
    // Método 1: Usar yt-dlp si está instalado
    try {
      const tmpDir = './tmp'
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)
      
      const sanitizedTitle = userVideoData.title.replace(/[^\w\s-]/g, '').substring(0, 50)
      const outputFile = path.join(tmpDir, `${Date.now()}_${sanitizedTitle}`)
      
      if (isAudio) {
        const cmd = `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outputFile}.%(ext)s" "${userVideoData.url}"`
        await execAsync(cmd, {timeout: 180000}) // 3 minutos timeout
        localFile = `${outputFile}.mp3`
      } else {
        const cmd = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 -o "${outputFile}.%(ext)s" "${userVideoData.url}"`
        await execAsync(cmd, {timeout: 300000}) // 5 minutos timeout
        localFile = `${outputFile}.mp4`
      }
      
      if (fs.existsSync(localFile)) {
        console.log('✅ yt-dlp descargó exitosamente')
      } else {
        throw new Error('Archivo no encontrado después de yt-dlp')
      }
    } catch (ytdlpError) {
      console.log('yt-dlp no disponible o falló:', ytdlpError.message)
      localFile = null
    }
    
    // Método 2: APIs de respaldo (si yt-dlp falla)
    if (!localFile) {
      // API: DownloaderBot (Telegram-based, muy confiable)
      try {
        const telegramApi = `https://api.telegram.org/bot6847456898:AAGx5vyWVxTQIJ8KJUQGz5nR8XGxYhf2rDo/sendMessage`
        const chatId = '6847456898'
        
        const response = await fetch(`https://www.y2mate.com/mates/analyzeV2/ajax`, {
          method: 'POST',
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          body: `k_query=${encodeURIComponent(userVideoData.url)}&k_page=home&hl=en&q_auto=0`
        })
        const data = await response.json()
        
        if (data.status === 'ok') {
          const links = data.links
          let selectedLink
          
          if (isAudio) {
            selectedLink = links.mp3?.['mp3128'] || links.mp3?.auto || Object.values(links.mp3 || {})[0]
          } else {
            selectedLink = links.mp4?.['360'] || links.mp4?.auto || Object.values(links.mp4 || {})[0]
          }
          
          if (selectedLink && selectedLink.k) {
            const convertRes = await fetch(`https://www.y2mate.com/mates/convertV2/index`, {
              method: 'POST',
              headers: {'Content-Type': 'application/x-www-form-urlencoded'},
              body: `vid=${userVideoData.videoId}&k=${selectedLink.k}`
            })
            const convertData = await convertRes.json()
            
            if (convertData.status === 'ok' && convertData.dlink) {
              downloadUrl = convertData.dlink
              console.log('✅ Y2Mate API funcionó')
            }
          }
        }
      } catch (e) {
        console.log('Y2Mate API falló:', e.message)
      }
    }
    
    // Método 3: SaveFrom.net API
    if (!localFile && !downloadUrl) {
      try {
        const savefromRes = await fetch(`https://yt1s.io/api/ajaxSearch/index`, {
          method: 'POST',
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          body: `q=${encodeURIComponent(userVideoData.url)}&vt=home`
        })
        const savefromData = await savefromRes.json()
        
        if (savefromData.status === 'ok') {
          const links = savefromData.links
          const key = isAudio ? Object.keys(links.mp3)[0] : Object.keys(links.mp4)[0]
          const selectedFormat = isAudio ? links.mp3[key] : links.mp4[key]
          
          if (selectedFormat && selectedFormat.k) {
            const convertRes = await fetch(`https://yt1s.io/api/ajaxConvert/convert`, {
              method: 'POST',
              headers: {'Content-Type': 'application/x-www-form-urlencoded'},
              body: `vid=${userVideoData.videoId}&k=${selectedFormat.k}`
            })
            const convertData = await convertRes.json()
            
            if (convertData.status === 'ok' && convertData.dlink) {
              downloadUrl = convertData.dlink
              console.log('✅ SaveFrom funcionó')
            }
          }
        }
      } catch (e) {
        console.log('SaveFrom falló:', e.message)
      }
    }
    
    // Verificar si tenemos algo para enviar
    if (!localFile && !downloadUrl) {
      return await conn.reply(m.chat, 
        '❌ No se pudo descargar el archivo.\n\n' +
        '💡 *Solución*: Instala yt-dlp para descargas más confiables:\n\n' +
        '*Windows:*\n```pip install yt-dlp```\n\n' +
        '*Termux:*\n```pkg install yt-dlp```\n\n' +
        'O intenta con otro video más corto.', m)
    }
    
    // Enviar el archivo
    if (isAudio) {
      if (localFile) {
        const fileSize = fs.statSync(localFile).size
        if (fileSize > LimitAud) {
          await conn.sendMessage(m.chat, {
            document: fs.readFileSync(localFile),
            mimetype: 'audio/mpeg',
            fileName: `${userVideoData.title}.mp3`
          }, {quoted: m})
        } else {
          await conn.sendMessage(m.chat, {
            audio: fs.readFileSync(localFile),
            mimetype: 'audio/mpeg',
            fileName: `${userVideoData.title}.mp3`
          }, {quoted: m})
        }
        fs.unlinkSync(localFile) // Eliminar archivo temporal
      } else {
        await conn.sendMessage(m.chat, {
          audio: {url: downloadUrl},
          mimetype: 'audio/mpeg',
          fileName: `${userVideoData.title}.mp3`
        }, {quoted: m})
      }
    } else {
      if (localFile) {
        const fileSize = fs.statSync(localFile).size
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
            fileName: `${userVideoData.title}.mp4`,
            caption: `⟡ *${userVideoData.title}*\n> ${wm}`
          }, {quoted: m})
        }
        fs.unlinkSync(localFile) // Eliminar archivo temporal
      } else {
        await conn.sendMessage(m.chat, {
          video: {url: downloadUrl},
          mimetype: 'video/mp4',
          fileName: `${userVideoData.title}.mp4`,
          caption: `⟡ *${userVideoData.title}*\n> ${wm}`
        }, {quoted: m})
      }
    }
    
    console.log('✅ Descarga completada exitosamente')
    
  } catch (error) {
    console.error('Error en descarga:', error)
    await conn.reply(m.chat, `❌ Error al descargar: ${error.message}`, m)
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
