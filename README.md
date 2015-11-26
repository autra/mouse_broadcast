# WebRTC DataChannel showcase: mouse coordinate

This application showcases the DataChannel feature of webRTC: clients connect to
a room, and then broadcast their mouse coordinate to every other client of the
room. Every client displays little square for mouse coordinates it receives.

To make the connection, a signaling server is needed. Here we have a simple
signaling server implemented in nodeJS.

To install dependencies:
`npm install`

To run the server
`npm start`

When a new client connect to a room, the nodejs server broadcast an icecandidate
to other already connected client. Then ALL the datas (mouse coordinate) are
transmitted through webRTC’s DataChannels and are NOT transmitted to the server. 

It means that you can shut down the server and client would still receive other
clients’ data (but new clients won’t be able to join though).


