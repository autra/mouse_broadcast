var VELOCITY = 10;
var isInitiator;

room = prompt("Enter room name:");
var peers = {};
var dataChannels = {};

var socket = io.connect();

if (room !== "") {
  console.log('Joining room ' + room);
  socket.emit('create or join', room);
}

socket.on('full', function (room){
  console.log('Room ' + room + ' is full');
});

socket.on('created', function (room){
  console.log('You are the initiator!');
  isInitiator = true;
  console.log('Room ' + room + ' is empty');
});

socket.on('joined', function(room, clientId) {
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

socket.on('message', function(message) {
  console.log('BROADCAST >>>> ', message);
})

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
      // In case pc2 opens a channel
      console.log("pc2 onDataChannel  = " + mychannel +
          ", stream=" + mychannel.stream + " id=" + mychannel.id +
          ", ordered=" + mychannel.ordered +
          ", label='" + mychannel.label + "'" +
          ", protocol='" + mychannel.protocol + "'");
      mychannel.onmessage = function(evt) {
        if (evt.data instanceof Blob) {
          console.log("*** pc sent Blob: " + evt.data + ", length=" + evt.data.size);
        } else {
          console.log('pc said: ' + evt.data);
        }
      }
      mychannel.onopen = function() {
        console.log("pc2 onopen fired for " + mychannel);
        mychannel.send("pc says Hello out there...");
        console.log("pc2 state: " + mychannel.state);
      }
      mychannel.onclose = function() {
        console.log("dc2 onclose fired");
      };
      dataChannels[peerId] = mychannel;
    };
  pc.setRemoteDescription(new RTCSessionDescription(offer));
  pc.didSetRemote = true;
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

function connectToPeer(clientId) {
  console.log('Trying to connect with', clientId);
  var datachannels = {};
  var pc = new RTCPeerConnection();

  pc.onicecandidate = function(obj) {
    if (obj.candidate) {
      console.log("pc found ICE candidate: " + JSON.stringify(obj.candidate));
      socket.emit('iceCandidate', clientId, obj.candidate);
    } else {
      console.log("pc got end-of-candidates signal");
    }
  }

  dc = pc.createDataChannel("This is pc", {});
  dataChannels[clientId] = dc;
  dc.binaryType = "blob";
  console.log("pc label " + dc.label +
      ", stream=" + dc.stream + " id=" + dc.id);
  dc.onmessage = function(evt) {
    if (evt.data instanceof Blob) {
      console.log("*** pc2 sent Blob: " + evt.data + ", length=" + evt.data.size);
    } else {
      console.log('pc2 said: ' + evt.data);
    }
  }
  dc.onopen = function() {
    console.log("pc onopen fired for " + dc);
    dc.send("pc says this will likely be queued...");
  }
  dc.onclose = function() {
    console.log("dc onclose fired");
  };
  return pc;
}

function failed(error) {
  console.log("Failure callback: ", error);
}

(() => {
  'use strict';

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
  var myRect;
  var otherRect = [];

  function clearPlayground(ctx) {
    ctx.clearRect(0, 0, playgroundWidth, playgroundHeight);
  }

  function drawPlayground(ctx) {
    myRect.draw(ctx);
    for (var rect of otherRect) {
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


  playground.addEventListener('mousemove', (e) => {
    if (e.clientX && e.clientY) {
      mouseX = e.clientX - playgroundX;
      mouseY = e.clientY - playgroundY;
      myRect = new Rect('#FF0000', mouseX, mouseY);
      refresh();
    }
  });


})();

window.onbeforeunload = function(e){
  console.log('onbeforeunload');
	socket.emit('bye', room);
}
