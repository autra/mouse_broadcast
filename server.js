var os = require('os');
var static = require('node-static');
var http = require('http');
var socketIO = require('socket.io');

var fileServer = new(static.Server)();
var app = http.createServer(function (req, res) {
  fileServer.serve(req, res);
}).listen(2013);

// convenience function to log server messages on the client
var log = console.log.bind(console);

var numberClients = {};
var io = socketIO.listen(app);
io.sockets.on('connection', function (socket){


	socket.on('message', function (message, room) {
		log('Client said:',  message);
		socket.in(room).emit('message', message); // should be room only
	});

	socket.on('create or join', function (room) {
        log('Request to create or join room ' + room);

		//var numClients = io.sockets.clients(room).length;
        var numClients = numberClients[room];
        if (!numClients) {
          numClients = 0;
        }
		log('Room ' + room + ' has ' + numClients + ' client(s)');

		if (numClients === 0){
			socket.join(room);
			socket.emit('created', room, socket.id);
            numberClients[room] = 1;

		} else if (numClients === 1) {
			socket.join(room);
            socket.emit('joined', room, socket.id);
            io.sockets.in(room).emit('ready');
            numberClients[room] = numberClients[room] + 1;

		} else { // max two clients
			socket.emit('full', room);
		}
	});

    socket.on('ipaddr', function () {
        var ifaces = os.networkInterfaces();
        for (var dev in ifaces) {
            ifaces[dev].forEach(function (details) {
                if (details.family=='IPv4' && details.address != '127.0.0.1') {
                    socket.emit('ipaddr', details.address);
                }
          });
        }
    });

    socket.on('bye', function(room) {
      numberClients[room] = numberClients[room] - 1;

    });

});


