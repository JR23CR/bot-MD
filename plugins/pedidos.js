import fs from 'fs';

const pedidosFilePath = './tmp/pedidos.json';

// Función para leer los pedidos desde el archivo
const readPedidos = () => {
    try {
        const data = fs.readFileSync(pedidosFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Si el archivo no existe o hay un error, devolvemos un array vacío
        return [];
    }
};

// Función para escribir los pedidos en el archivo
const writePedidos = (pedidos) => {
    fs.writeFileSync(pedidosFilePath, JSON.stringify(pedidos, null, 2), 'utf8');
};

let handler = async (m, { conn, text, command, usedPrefix, isAdmin, isOwner }) => {
    let pedidos = readPedidos();

    // El comando 'listapedidos' puede ser usado por todos
    if (command === 'listapedidos') {
        const pedidosPendientes = pedidos.filter(p => p.estado === 'pendiente');

        if (pedidosPendientes.length === 0) {
            return m.reply('🎉 ¡No hay pedidos pendientes por el momento! 🎉');
        }

        let lista = '*📋 LISTA DE PEDIDOS PENDIENTES 📋*\n\n';
        pedidosPendientes.forEach(p => {
            lista += `*ID:* ${p.id}\n`;
            lista += `*Descripción:* ${p.descripcion}\n`;
            lista += `--------------------------------------\n`;
        });

        return m.reply(lista);
    }

    // Los siguientes comandos requieren permisos de administrador
    if (!isAdmin && !isOwner) {
        return m.reply('Este comando solo puede ser usado por administradores del grupo.');
    }

    switch (command) {
        case 'crearpedido':
            if (!text) {
                return m.reply(`Por favor, proporciona la descripción del pedido.\n\nEjemplo: ${usedPrefix}crearpedido 2 tazas personalizadas con logo de empresa`);
            }

            const nuevoPedido = {
                id: Date.now(), // ID único basado en el timestamp
                descripcion: text,
                estado: 'pendiente',
                creadoEn: new Date().toISOString()
            };

            pedidos.push(nuevoPedido);
            writePedidos(pedidos);

            m.reply(`✅ *¡Pedido creado con éxito!* ✅\n\n*ID:* ${nuevoPedido.id}\n*Descripción:* ${nuevoPedido.descripcion}\n*Estado:* ${nuevoPedido.estado}`);
            break;

        case 'pedidocompletado':
            if (!text) {
                return m.reply(`Por favor, proporciona el ID del pedido que deseas marcar como completado.\n\nEjemplo: ${usedPrefix}pedidocompletado 1678886400000`);
            }

            const idCompletado = parseInt(text);
            const pedidoCompletado = pedidos.find(p => p.id === idCompletado);

            if (!pedidoCompletado) {
                return m.reply(`No se encontró ningún pedido con el ID: ${idCompletado}`);
            }

            if (pedidoCompletado.estado === 'completado') {
                return m.reply(`El pedido con ID ${idCompletado} ya estaba completado.`);
            }

            pedidoCompletado.estado = 'completado';
            writePedidos(pedidos);

            m.reply(`✅ *¡Pedido #${idCompletado} marcado como completado!*`);
            break;

        case 'borrarpedido':
            if (!text) {
                return m.reply(`Por favor, proporciona el ID del pedido que deseas borrar.\n\nEjemplo: ${usedPrefix}borrarpedido 1678886400000`);
            }

            const idBorrar = parseInt(text);
            const indexBorrar = pedidos.findIndex(p => p.id === idBorrar);

            if (indexBorrar === -1) {
                return m.reply(`No se encontró ningún pedido con el ID: ${idBorrar}`);
            }

            const pedidoBorrado = pedidos.splice(indexBorrar, 1);
            writePedidos(pedidos);

            m.reply(`🗑️ *¡Pedido #${idBorrar} ha sido eliminado!*`);
            break;
    }
};

handler.command = ['crearpedido', 'listapedidos', 'pedidocompletado', 'borrarpedido'];
handler.help = [
    'crearpedido <descripción>',
    'listapedidos',
    'pedidocompletado <ID>',
    'borrarpedido <ID>'
];
handler.tags = ['pedidos'];
handler.group = true; // El comando solo funciona en grupos

export default handler;
