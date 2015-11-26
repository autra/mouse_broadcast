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

		} else if (numClients < 4) {
			socket.join(room);
            socket.emit('joined', room, socket.id);
            console.log('clientid: ', socket.id);
            socket.broadcast.to(room).emit('join', room, socket.id);
            numberClients[room] = numberClients[room] + 1;

		} else { // max two clients
			socket.emit('full', room);
		}
	});

    socket.on('bye', function(room, myId) {
      log('%s has said bye to %s', socket.id, room);
      // we check that the socket is really in this room.
      if (socket.rooms.indexOf(room) !== -1) {
        var newNb = numberClients[room] - 1;
        numberClients[room] = newNb >=0 ? newNb : 0;
        socket.broadcast.to(room).emit('left', socket.id);
        socket.disconnect();
      }
    });

    socket.on('iceCandidate', function(clientId, candidate) {
      console.log('icecandidate to', clientId);
      socket.to(clientId).emit('iceCandidate', candidate, socket.id);
    })

    socket.on('offer', function(clientId, offer) {
      console.log('offer to', clientId);
      // emit offer to newly connected client
      socket.to(clientId).emit('offer', offer, socket.id);
    });

    socket.on('answer', function(clientId, sessionDesc) {
      console.log('answer to', clientId);
      socket.to(clientId).emit('answer', sessionDesc, socket.id);
    });

    socket.on('error', function(err) {
      log(err);
    });
});


