import fetch from 'node-fetch'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        // Coordenadas para las ciudades
        const cities = {
            williamsport: {
                name: 'Williamsport, Pensilvania',
                lat: 41.2412,
                lon: -77.0011
            },
            santaana: {
                name: 'Santa Ana, Petén',
                lat: 16.7667,
                lon: -89.5833
            }
        }

        let weatherData = []

        // Obtener clima para ambas ciudades
        for (let cityKey in cities) {
            const city = cities[cityKey]
            
            // Usar Open-Meteo API (no requiere API key)
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&temperature_unit=fahrenheit&timezone=auto`
            
            const response = await fetch(url)
            const data = await response.json()
            
            if (data.current) {
                const tempF = Math.round(data.current.temperature_2m)
                const tempC = Math.round((tempF - 32) * 5 / 9)
                const feelsLike = Math.round(data.current.apparent_temperature)
                const humidity = data.current.relative_humidity_2m
                const windSpeed = Math.round(data.current.wind_speed_10m)
                const precipitation = data.current.precipitation
                
                // Códigos de clima WMO
                const weatherCodes = {
                    0: '☀️ Despejado',
                    1: '🌤️ Mayormente despejado',
                    2: '⛅ Parcialmente nublado',
                    3: '☁️ Nublado',
                    45: '🌫️ Neblina',
                    48: '🌫️ Neblina con escarcha',
                    51: '🌦️ Llovizna ligera',
                    53: '🌦️ Llovizna moderada',
                    55: '🌧️ Llovizna densa',
                    61: '🌧️ Lluvia ligera',
                    63: '🌧️ Lluvia moderada',
                    65: '🌧️ Lluvia fuerte',
                    71: '🌨️ Nevada ligera',
                    73: '🌨️ Nevada moderada',
                    75: '❄️ Nevada fuerte',
                    77: '🌨️ Granizo',
                    80: '🌦️ Chubascos ligeros',
                    81: '⛈️ Chubascos moderados',
                    82: '⛈️ Chubascos fuertes',
                    85: '🌨️ Chubascos de nieve ligeros',
                    86: '🌨️ Chubascos de nieve fuertes',
                    95: '⛈️ Tormenta eléctrica',
                    96: '⛈️ Tormenta con granizo ligero',
                    99: '⛈️ Tormenta con granizo fuerte'
                }
                
                const weatherDesc = weatherCodes[data.current.weather_code] || '🌡️ Clima desconocido'
                
                weatherData.push({
                    city: city.name,
                    tempC: tempC,
                    tempF: tempF,
                    feelsLike: feelsLike,
                    humidity: humidity,
                    windSpeed: windSpeed,
                    precipitation: precipitation,
                    weather: weatherDesc
                })
            }
        }

        // Formatear mensaje
        let mensaje = `╔══════════════════╗\n`
        mensaje += `     🌍 *CLIMA ACTUAL* 🌍\n`
        mensaje += `╚══════════════════╝\n\n`

        for (let data of weatherData) {
            mensaje += `📍 *${data.city}*\n`
            mensaje += `${data.weather}\n`
            mensaje += `🌡️ ${data.tempC}°C - ${data.tempF}°F\n`
            mensaje += `🤚 Sensación: ${data.feelsLike}°F\n`
            mensaje += `💧 Humedad: ${data.humidity}%\n`
            mensaje += `💨 Viento: ${data.windSpeed} mph\n`
            if (data.precipitation > 0) {
                mensaje += `🌧️ Precipitación: ${data.precipitation} mm\n`
            }
            mensaje += `\n`
        }

        mensaje += `⏰ Actualizado: ${new Date().toLocaleString('es-GT', { timeZone: 'America/Guatemala' })}`

        await conn.sendMessage(m.chat, { 
            text: mensaje 
        }, { 
            quoted: m 
        })

    } catch (error) {
        console.error('Error en comando clima:', error)
        await conn.sendMessage(m.chat, { 
            text: '❌ Error al obtener el clima. Intenta de nuevo más tarde.' 
        }, { 
            quoted: m 
        })
    }
}

handler.help = ['clima']
handler.tags = ['tools']
handler.command = /^(clima|weather|tiempo)$/i

export default handler
