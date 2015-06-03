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
            //socket.emit('joined', room, socket.id);
            console.log('clientid: ', socket.id);
            socket.broadcast.to(room).emit('joined', room, socket.id);
            numberClients[room] = numberClients[room] + 1;

		} else { // max two clients
			socket.emit('full', room);
		}
	});

    // TODO fix : decrease the number only if socket.id is in the room
    //socket.on('bye', function(room) {
      //log('%s has said bye to %s', socket.id, room);
      //var newNb = numberClients[room] - 1;
      //numberClients[room] = newNb >=0 ? newNb : 0;
    //});

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


