const aedes = require('aedes')()
const server = require('net').createServer(aedes.handle)
const httpServer = require('http').createServer()
const ws = require('websocket-stream')
const port = 1883
const wsPort = 8083

server.listen(port, function () {
    console.log('MQTT Broker (TCP) running on port', port)
})

ws.createServer({ server: httpServer, path: '/mqtt' }, aedes.handle)

httpServer.listen(wsPort, function () {
    console.log('MQTT Broker (WebSocket) running on port', wsPort)
})

aedes.on('client', function (client) {
    console.log('Client Connected: \x1b[33m' + (client ? client.id : client) + '\x1b[0m', 'to broker', aedes.id)
})

aedes.on('clientDisconnect', function (client) {
    console.log('Client Disconnected: \x1b[31m' + (client ? client.id : client) + '\x1b[0m', 'to broker', aedes.id)
})

aedes.on('publish', function (packet, client) {
    if (client) {
        console.log('Client \x1b[31m' + (client ? client.id : 'BROKER_') + '\x1b[0m has published', packet.payload.toString(), 'on', packet.topic)
    }
})
