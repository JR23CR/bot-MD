import fetch from 'node-fetch'
import yts from 'yt-search'
import ytdl from 'ytdl-core'

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

  tempStorage[m.sender] = {url: video.url, title: video.title}

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
    
    // Intentar con diferentes APIs
    let downloadUrl = null
    let mediaType = isAudio ? 'audio' : 'video'
    
    // API 1: try-ytdl-core
    try {
      const info = await ytdl.getInfo(userVideoData.url)
      if (isAudio) {
        const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' })
        downloadUrl = audioFormat.url
      } else {
        const videoFormat = ytdl.chooseFormat(info.formats, { quality: 'highest', filter: format => format.hasVideo && format.hasAudio })
        downloadUrl = videoFormat.url
      }
    } catch (e) {
      console.log('ytdl-core falló:', e.message)
    }
    
    // API 2: Cobalt API
    if (!downloadUrl) {
      try {
        const cobaltRes = await fetch('https://api.cobalt.tools/api/json', {
          method: 'POST',
          headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
          body: JSON.stringify({
            url: userVideoData.url,
            vQuality: '720',
            aFormat: 'mp3',
            isAudioOnly: isAudio
          })
        })
        const cobaltData = await cobaltRes.json()
        if (cobaltData.status === 'stream' || cobaltData.status === 'redirect') {
          downloadUrl = cobaltData.url
        }
      } catch (e) {
        console.log('Cobalt API falló:', e.message)
      }
    }
    
    // API 3: Invidious
    if (!downloadUrl) {
      try {
        const invidiousRes = await fetch(`https://vid.puffyan.us/api/v1/videos/${getVideoId(userVideoData.url)}`)
        const invidiousData = await invidiousRes.json()
        if (isAudio) {
          const audioUrl = invidiousData.adaptiveFormats?.find(f => f.type?.includes('audio'))?.url
          if (audioUrl) downloadUrl = audioUrl
        } else {
          const videoUrl = invidiousData.formatStreams?.[0]?.url
          if (videoUrl) downloadUrl = videoUrl
        }
      } catch (e) {
        console.log('Invidious falló:', e.message)
      }
    }
    
    // API 4: Y2mate alternative
    if (!downloadUrl) {
      try {
        const y2mateRes = await fetch(`https://api-cdn.saveservall.xyz/?url=${encodeURIComponent(userVideoData.url)}`)
        const y2mateData = await y2mateRes.json()
        if (isAudio && y2mateData.audio) {
          downloadUrl = y2mateData.audio
        } else if (!isAudio && y2mateData.video) {
          downloadUrl = y2mateData.video
        }
      } catch (e) {
        console.log('Y2mate alternative falló:', e.message)
      }
    }
    
    if (!downloadUrl) {
      return await conn.reply(m.chat, '❌ No se pudo descargar el archivo. Todas las APIs están caídas. Intenta más tarde.', m)
    }
    
    // Enviar el archivo
    const fileSize = await getFileSize(downloadUrl)
    
    if (isAudio) {
      if (fileSize > LimitAud) {
        await conn.sendMessage(m.chat, {
          document: {url: downloadUrl},
          mimetype: 'audio/mpeg',
          fileName: `${userVideoData.title}.mp3`
        }, {quoted: m})
      } else {
        await conn.sendMessage(m.chat, {
          audio: {url: downloadUrl},
          mimetype: 'audio/mpeg',
          fileName: `${userVideoData.title}.mp3`
        }, {quoted: m})
      }
    } else {
      if (fileSize > LimitVid) {
        await conn.sendMessage(m.chat, {
          document: {url: downloadUrl},
          mimetype: 'video/mp4',
          fileName: `${userVideoData.title}.mp4`,
          caption: `⟡ *${userVideoData.title}*\n> ${wm}`
        }, {quoted: m})
      } else {
        await conn.sendMessage(m.chat, {
          video: {url: downloadUrl},
          mimetype: 'video/mp4',
          fileName: `${userVideoData.title}.mp4`,
          caption: `⟡ *${userVideoData.title}*\n> ${wm}`
        }, {quoted: m})
      }
    }
    
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

async function getFileSize(url) {
  try {
    const response = await fetch(url, {method: 'HEAD'})
    return parseInt(response.headers.get('content-length') || 0)
  } catch {
    return 0
  }
}

function getVideoId(url) {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  const match = url.match(regex)
  return match ? match[1] : null
}
