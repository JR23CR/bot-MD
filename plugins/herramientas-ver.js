// 📁 plugin/herramientas-ver.js - VERSIÓN OPTIMIZADA Y CON RESTRICCIÓN

import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import { canExecuteCommand } from '../lib/group-restriction.js' // Asegúrate de que esta ruta sea correcta

let handler = async (m, { conn, command }) => {
    try {
        // === DEBUG RESTRICCIÓN ===
        const puedeEjecutar = canExecuteCommand(m);
        
        console.log('=== DEBUG RESTRICCIÓN ===');
        console.log(`Chat ID: ${m.chat}`);
        console.log(`Sender: ${m.sender}`);
        console.log(`Es grupo?: ${m.isGroup}`);
        console.log(`Puede ejecutar?: ${puedeEjecutar}`);
        console.log('========================');

        // Verificar permisos - BLOQUEA AQUÍ SI EL PERMISO ES FALSO
        if (!puedeEjecutar) {
            console.log(`🚫 Comando .ver bloqueado para ${m.sender} en ${m.chat}`);
            return; 
        }

        console.log(`✅ Comando .ver permitido para ${m.sender}`);

        // --- LÓGICA DEL PLUGIN (.ver) ---

        if (!m.quoted) {
            return conn.reply(m.chat, '❌ Debes responder a un mensaje de "ver una vez" con este comando.\n\n📝 Uso: Responde a la imagen/video de ver una vez con *.ver*', m);
        }

        const quotedMsg = m.quoted.message || m.quoted;

        const isViewOnce = quotedMsg.viewOnceMessageV2 || quotedMsg.viewOnceMessage || 
                           quotedMsg.imageMessage?.viewOnce || 
                           quotedMsg.videoMessage?.viewOnce || 
                           quotedMsg.audioMessage?.viewOnce;

        if (!isViewOnce) {
            return conn.reply(m.chat, '❌ El mensaje citado no es de "ver una vez".\n\n💡 Asegúrate de responder a un mensaje que tenga la etiqueta "Ver una vez".', m);
        }

        let mediaMessage = quotedMsg.viewOnceMessageV2?.message || quotedMsg.viewOnceMessage?.message;
        
        if (mediaMessage) {
            mediaMessage = mediaMessage[Object.keys(mediaMessage)[0]];
        } else {
            mediaMessage = m.quoted.message || m.quoted;
        }

        let type = Object.keys(mediaMessage).find(key => 
            key.includes('Message') && !key.includes('viewOnce')
        );

        if (!type) {
            return conn.reply(m.chat, '❌ No se pudo obtener el contenido del mensaje de "ver una vez".', m);
        }

        const baseType = type.replace('Message', '');

        try {
            const stream = await downloadContentFromMessage(mediaMessage[type], baseType);
            let buffer = Buffer.from([]);
            
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            if (!buffer || buffer.length === 0) {
                return conn.reply(m.chat, '❌ No se pudo descargar el contenido.\n\n⚠️ El mensaje puede haber expirado o sido eliminado.', m);
            }

            const caption = `👁️ *Contenido de "Ver una vez" revelado*\n\n📦 Tamaño: ${(buffer.length / 1024).toFixed(2)} KB`;

            const messageOptions = {
                caption: caption,
                mentions: [m.sender]
            };

            if (baseType === 'image') {
                await conn.sendMessage(m.chat, { image: buffer, ...messageOptions }, { quoted: m });
            } else if (baseType === 'video') {
                await conn.sendMessage(m.chat, { video: buffer, ...messageOptions }, { quoted: m });
            } else if (baseType === 'audio') {
                await conn.sendMessage(m.chat, { 
                    audio: buffer, 
                    mimetype: 'audio/mp4', 
                    ptt: false 
                }, { quoted: m });
                await conn.reply(m.chat, caption, m, { mentions: [m.sender] });
            }

            console.log('✅ Contenido enviado exitosamente');

        } catch (downloadError) {
            console.error('❌ Error al descargar:', downloadError);
            return conn.reply(m.chat, '❌ Error al descargar el contenido.\n\n⚠️ El mensaje de "ver una vez" probablemente ya fue visto o eliminado del servidor.', m);
        }

    } catch (error) {
        console.error('❌ Error en comando .ver:', error);
        await conn.reply(m.chat, `❌ Ocurrió un error al procesar el comando.\n\n🔧 Error: ${error.message}`, m);
    }
}

handler.help = ['ver', 'viewonce', 'revelar']
handler.tags = ['tools']
handler.command = /^(ver|viewonce|revelar|antiviewonce)$/i
handler.group = true

export default handler
