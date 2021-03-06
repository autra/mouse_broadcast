// some globals
// TODO we might only need dataChannels here.
var peers = {};
var dataChannels = {};
var myId;

(function() {
  'use strict';
  var room = prompt("Enter room name:");

  var socket = io.connect();

  var playground;

  if (room !== "") {
    console.log('Joining room ' + room);
    socket.emit('create or join', room);
  }

  socket.on('full', function (room){
    console.log('Room ' + room + ' is full');
  });

  socket.on('created', function (room, socketId){
    console.log('You are the initiator!');
    myId = socketId;
    console.log('Room ' + room + ' is empty');
    playground = startPlayground();
  });

  socket.on('joined', function (room, socketId) {
    console.log('You\'ve joined room', room);
    myId = socketId;
    playground = startPlayground();
  });

  socket.on('join', function(room, clientId) {
    console.log('Client %s has joined %s', clientId, room);
    // create a peer connexion
    var pc = connectToPeer(clientId);
    peers[clientId] = pc;
    // send offers
    pc.createOffer(function(offer){
      pc.setLocalDescription(offer, function() {
        socket.emit('offer', clientId, offer);
      }, failed)
    }, failed);

  });

  socket.on('left', function(clientId) {
    // clean this client
    console.log('Client %s has left us!', clientId);
    delete dataChannels[clientId];
    delete peers[clientId];
    playground.deletePeer(clientId);
  });

  socket.on('log', function (array){
    console.log.apply(console, array);
  });

  socket.on('offer', function(offer, peerId) {
    console.log('Incoming connexion offer', offer);
    var pc = new RTCPeerConnection();
    pc.onicecandidate = function(obj) {
      if (obj.candidate) {
        console.log("pc found ICE candidate: " + JSON.stringify(obj.candidate));
        socket.emit('iceCandidate', peerId, obj.candidate);
      } else {
        console.log("pc got end-of-candidates signal");
      }
    };
    peers[peerId] = pc;
    pc.ondatachannel = function(event) {
      var mychannel = event.channel;
      // In case peers opens a channel
      console.log("%s onDataChannel  = %s, stream=%s id=%s, ordered=%s, label='%s', protocol='%s'",
                  myId,
                  mychannel,
                  mychannel.stream,
                  mychannel.id,
                  mychannel.ordered,
                  mychannel.label,
                  mychannel.protocol);
      mychannel.onmessage = getOnmessage(peerId);

      mychannel.onopen = function() {
        console.log("onopen fired for %s by %s", mychannel, peerId);
        mychannel.send(JSON.stringify({type: "message", message: "Hello out there..."}));
      }
      mychannel.onclose = function() {
        console.log("onclose fired");
      };
      dataChannels[peerId] = mychannel;
    };

    pc.setRemoteDescription(new RTCSessionDescription(offer));
    pc.createAnswer(function(sessionDescription) {
      pc.setLocalDescription(sessionDescription);
      socket.emit('answer', peerId, sessionDescription);
    }, failed);
  });

  socket.on('answer', function(answer, peerId) {
    console.log('incoming answer', answer);
    var pc = peers[peerId];
    pc.setRemoteDescription(new RTCSessionDescription(answer));

  });

  socket.on('iceCandidate', function(candidate, peerId) {
    console.log('incoming iceCandidate', candidate);
    var pc = peers[peerId];
    pc.addIceCandidate(new RTCIceCandidate(candidate));
  });

  function getOnmessage(peerId) {
    return function(evt) {
      if (evt.data instanceof Blob) {
        console.log("*** %s sent Blob: %s, length=%s",
                    peerId, evt.data, evt.data.size);
      } else {
        var data = JSON.parse(evt.data);
        if (data.type === 'coordinate' && playground) {
          playground.updatePeerCoordinate(peerId, data.x, data.y);
        } else {
          console.log('%s said: %s', peerId, data.message);
        }
      }
    };
  }

  function connectToPeer(clientId) {
    console.log('Trying to connect with', clientId);
    var datachannels = {};
    var pc = new RTCPeerConnection();

    pc.onicecandidate = function(obj) {
      if (obj.candidate) {
        console.log("found ICE candidate: " + JSON.stringify(obj.candidate));
        socket.emit('iceCandidate', clientId, obj.candidate);
      } else {
        console.log("got end-of-candidates signal");
      }
    };

    var dc = pc.createDataChannel(clientId, {});
    dataChannels[clientId] = dc;
    dc.binaryType = "blob";
    console.log("dc label " + dc.label +
        ", stream=" + dc.stream + " id=" + dc.id);
    dc.onmessage = getOnmessage(clientId);
    dc.onopen = function() {
      console.log("onopen fired for %s", clientId);
      dc.send(JSON.stringify({type: "message", message: "Welcome!"}));
    }
    dc.onclose = function() {
      console.log("dc onclose fired");
    };
    return pc;
  }

  function failed(error) {
    console.log("Failure callback: ", error);
  }

  window.onbeforeunload = function(e){
    console.log('onbeforeunload');
    socket.emit('bye', room);
  }
})();

function startPlayground() {
  'use strict';
  var VELOCITY = 10;

  var playground = document.querySelector('.playground');
  var ctx = playground.getContext('2d');

  // playground size and width
  var rect = playground.getBoundingClientRect();
  var playgroundX = rect.x;
  var playgroundY = rect.y;
  var playgroundWidth = rect.width;
  var playgroundHeight = rect.height;
  // mouse
  var mouseX, mouseY;
  var myRect = new Rect('#FF0000', 0, 0);
  var otherRect = new Map();

  function clearPlayground(ctx) {
    ctx.clearRect(0, 0, playgroundWidth, playgroundHeight);
  }

  function drawPlayground(ctx) {
    myRect.draw(ctx);
    for (var rect of otherRect.values()) {
      rect.draw(ctx);
    }
  }

  function refresh() {
    clearPlayground(ctx);
    drawPlayground(ctx);
  }

  // constructor for player
  function Rect(color, x, y) {
    this.x = x || playgroundX + playgroundWidth / 2;
    this.y = y || playgroundY + playgroundHeight / 2;
    this.fill = color || '#FF0000';
  }

  Rect.prototype.draw = function(ctx) {
    ctx.fillStyle = this.fill;
    ctx.fillRect(this.x, this.y, 10, 10);
  }


  playground.addEventListener('mousemove', function(e) {
    if (e.clientX && e.clientY) {
      mouseX = e.clientX - playgroundX;
      mouseY = e.clientY - playgroundY;
      broadcastNewCoordinate(mouseX, mouseY);
      myRect.x = mouseX;
      myRect.y = mouseY;
      refresh();
    }
  });

  function broadcastNewCoordinate(posX, posY) {
    for (var peers in dataChannels) {
      if (dataChannels.hasOwnProperty(peers)) {
        dataChannels[peers].send(JSON.stringify({
          type: 'coordinate',
          x: posX,
          y: posY
        }));
      }
    }
  }

  var getNewColor = function() {
    var i = 0;
    var colors = ['blue', 'green', 'yellow', 'orange'];
    return function getNewColor() {
      var color = colors[i++];
      if (i === colors.length) {
        i = 0;
      }
      console.log('color is ', color);
      return color;
    }
  }();

  function deletePeer(peerId) {
    otherRect.delete(peerId);
    // XXX: we might be more efficient here:
    clearPlayground(ctx);
    drawPlayground(ctx);
  }

  function updatePeerCoordinate(peerId, mouseX, mouseY) {
    console.log('Got coordinate %s, %s from %s', mouseX, mouseY, peerId);
    var rect;
    if (otherRect.has(peerId)) {
      rect = otherRect.get(peerId);
      rect.x = mouseX;
      rect.y = mouseY;
    } else {
      var color = getNewColor();
      otherRect.set(peerId, new Rect(color, mouseX, mouseY));
    }
    // XXX: we might be able to be a bit more efficient here
    clearPlayground(ctx);
    drawPlayground(ctx);
  }

  return {
    updatePeerCoordinate: updatePeerCoordinate,
    deletePeer: deletePeer
  };
}

