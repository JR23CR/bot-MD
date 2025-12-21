import fetch from 'node-fetch'
import yts from 'yt-search'

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
    let apiSuccess = false
    
    // API 1: AllVideoDownloader (muy confiable)
    if (!apiSuccess) {
      try {
        const apiUrl = `https://allvideodownloader.cc/wp-json/aio-dl/video-data/`
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          body: `url=${encodeURIComponent(userVideoData.url)}`
        })
        const data = await response.json()
        
        if (data && data.medias) {
          if (isAudio) {
            const audioMedia = data.medias.find(m => m.audioAvailable && m.extension === 'mp3')
            if (audioMedia) {
              downloadUrl = audioMedia.url
              apiSuccess = true
              console.log('✅ AllVideoDownloader funcionó')
            }
          } else {
            const videoMedia = data.medias.find(m => m.videoAvailable && m.quality)
            if (videoMedia) {
              downloadUrl = videoMedia.url
              apiSuccess = true
              console.log('✅ AllVideoDownloader funcionó')
            }
          }
        }
      } catch (e) {
        console.log('AllVideoDownloader falló:', e.message)
      }
    }
    
    // API 2: YT5S (muy popular y estable)
    if (!apiSuccess) {
      try {
        const analyzeRes = await fetch('https://yt5s.io/api/ajaxSearch', {
          method: 'POST',
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          body: `q=${encodeURIComponent(userVideoData.url)}&vt=home`
        })
        const analyzeData = await analyzeRes.json()
        
        if (analyzeData.status === 'ok') {
          const kValue = analyzeData.kc || analyzeData.k_query
          const format = isAudio ? 'mp3' : 'mp4'
          
          const convertRes = await fetch('https://yt5s.io/api/ajaxConvert', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: `vid=${userVideoData.videoId}&k=${kValue}`
          })
          const convertData = await convertRes.json()
          
          if (convertData.status === 'ok' && convertData.dlink) {
            downloadUrl = convertData.dlink
            apiSuccess = true
            console.log('✅ YT5S funcionó')
          }
        }
      } catch (e) {
        console.log('YT5S falló:', e.message)
      }
    }
    
    // API 3: Loader.to (alternativa confiable)
    if (!apiSuccess) {
      try {
        const format = isAudio ? 'mp3' : 'mp4'
        const loaderRes = await fetch(`https://loader.to/ajax/download.php?format=${format}&url=${encodeURIComponent(userVideoData.url)}`)
        const loaderData = await loaderRes.json()
        
        if (loaderData.success && loaderData.download_url) {
          downloadUrl = loaderData.download_url
          apiSuccess = true
          console.log('✅ Loader.to funcionó')
        }
      } catch (e) {
        console.log('Loader.to falló:', e.message)
      }
    }
    
    // API 4: Y2Mate.nu (respaldo confiable)
    if (!apiSuccess) {
      try {
        const y2mateRes = await fetch(`https://www.y2mate.nu/api/v1/getDownloadURL?url=${encodeURIComponent(userVideoData.url)}&type=${isAudio ? 'audio' : 'video'}`)
        const y2mateData = await y2mateRes.json()
        
        if (y2mateData.downloadURL) {
          downloadUrl = y2mateData.downloadURL
          apiSuccess = true
          console.log('✅ Y2Mate.nu funcionó')
        }
      } catch (e) {
        console.log('Y2Mate.nu falló:', e.message)
      }
    }
    
    // API 5: YTMP34 (muy rápida)
    if (!apiSuccess) {
      try {
        const ytmp34Res = await fetch(`https://ytmp34.cc/api/convert`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            url: userVideoData.url,
            type: isAudio ? 'audio' : 'video'
          })
        })
        const ytmp34Data = await ytmp34Res.json()
        
        if (ytmp34Data.download) {
          downloadUrl = ytmp34Data.download
          apiSuccess = true
          console.log('✅ YTMP34 funcionó')
        }
      } catch (e) {
        console.log('YTMP34 falló:', e.message)
      }
    }
    
    if (!downloadUrl || !apiSuccess) {
      return await conn.reply(m.chat, '❌ Lo siento, todas las APIs de descarga están temporalmente caídas. Por favor intenta:\n\n1. En unos minutos\n2. Con otro video\n3. Usando el enlace directo: ' + userVideoData.url, m)
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
    
    console.log('✅ Descarga completada exitosamente')
    
  } catch (error) {
    console.error('Error en descarga:', error)
    await conn.reply(m.chat, `❌ Error al descargar: ${error.message}\n\nIntenta con otro video o más tarde.`, m)
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
