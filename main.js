var VELOCITY = 10;
var isInitiator;

room = prompt("Enter room name:");

var socket = io.connect();

if (room !== "") {
  console.log('Joining room ' + room);
  socket.emit('create or join', room);
}

socket.on('full', function (room){
  console.log('Room ' + room + ' is full');
});

socket.on('empty', function (room){
  isInitiator = true;
  console.log('Room ' + room + ' is empty');
});

socket.on('join', function (room){
  console.log('Making request to join room ' + room);
  console.log('You are the initiator!');
});

socket.on('joined', function(room) {
  console.log('You\'ve joined room', room);
});

socket.on('message', function(message) {
  console.log('BROADCAST >>>> ', message);
})

socket.on('log', function (array){
  console.log.apply(console, array);
});


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
    mouseX = e.clientX;
    mouseY = e.clientY;
    myRect = new Rect('#FF0000', mouseX, mouseY);
    refresh();
  });


})();
