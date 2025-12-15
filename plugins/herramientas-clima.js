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
                
                // Códigos de clima WMO (Bilingüe)
                const weatherCodes = {
                    0: '☀️ Despejado / Clear',
                    1: '🌤️ Mayormente despejado / Mostly Clear',
                    2: '⛅ Parcialmente nublado / Partly Cloudy',
                    3: '☁️ Nublado / Cloudy',
                    45: '🌫️ Neblina / Fog',
                    48: '🌫️ Neblina con escarcha / Freezing Fog',
                    51: '🌦️ Llovizna ligera / Light Drizzle',
                    53: '🌦️ Llovizna moderada / Moderate Drizzle',
                    55: '🌧️ Llovizna densa / Dense Drizzle',
                    61: '🌧️ Lluvia ligera / Light Rain',
                    63: '🌧️ Lluvia moderada / Moderate Rain',
                    65: '🌧️ Lluvia fuerte / Heavy Rain',
                    71: '🌨️ Nevada ligera / Light Snow',
                    73: '🌨️ Nevada moderada / Moderate Snow',
                    75: '❄️ Nevada fuerte / Heavy Snow',
                    77: '🌨️ Granizo / Hail',
                    80: '🌦️ Chubascos ligeros / Light Showers',
                    81: '⛈️ Chubascos moderados / Moderate Showers',
                    82: '⛈️ Chubascos fuertes / Heavy Showers',
                    85: '🌨️ Chubascos de nieve ligeros / Light Snow Showers',
                    86: '🌨️ Chubascos de nieve fuertes / Heavy Snow Showers',
                    95: '⛈️ Tormenta eléctrica / Thunderstorm',
                    96: '⛈️ Tormenta con granizo ligero / Thunderstorm with Light Hail',
                    99: '⛈️ Tormenta con granizo fuerte / Thunderstorm with Heavy Hail'
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

        // Formatear mensaje compacto y bilingüe
        let mensaje = `🌍 *CLIMA / WEATHER*\n\n`

        for (let data of weatherData) {
            mensaje += `📍 *${data.city}*\n`
            mensaje += `${data.weather}\n`
            mensaje += `🌡️ Temperatura / Temperature: ${data.tempC}°C / ${data.tempF}°F\n`
            mensaje += `🤚 Sensación / Feels Like: ${data.feelsLike}°F\n`
            mensaje += `💧 Humedad / Humidity: ${data.humidity}%\n`
            mensaje += `💨 Viento / Wind: ${data.windSpeed} mph\n`
            
            if (data.precipitation > 0) {
                mensaje += `🌧️ Precipitación / Precipitation: ${data.precipitation}mm\n`
            }
            mensaje += `\n`
        }

        const now = new Date()
        const timeGT = now.toLocaleString('es-GT', { 
            timeZone: 'America/Guatemala',
            hour: '2-digit',
            minute: '2-digit'
        })
        
        mensaje += `⏰ Actualizado / Updated: ${timeGT}`

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
