///////////////////////////////////
// Server Node.js with socket.IO //
///////////////////////////////////

/**
 * Declare the server HTTP
 * listen to the port 8888
 */
var http = require("http");
var server = http.createServer(handler);
var app = server.listen(8889);

/**
 * Import socket.io module
 * on the server HTTP
 */
var io = require('socket.io').listen(app);

/**
 * Import fileservice module
 * for handling files
 */
var fs = require('fs');

/**
 * Path module
 */
var path = require('path');

/**
 * Declare the variable messages for the chat
 */
var messages = new Array();

/**
 * Hold a list of all speakers
 */
var speakers = new Array();

/**
* When a user connects
*/
io.sockets.on('connection', function (client) {
	client.emit('connectOk', client.id);
	

	//-- Variables declarations--//
	var guest = false;
	var room = '';
	var RTCConnection = '';
	var connectionIDs = [];
	
	/**
	 * When a user is invited
	 * join the room
	 * @param {int} invitation : room number
	 */
/*	client.on("invite", function(invitation){
		room = invitation;
		guest = true;
		client.join(room);
		messages[room] = new Array();
	});

	/**
	 * When a user is invited
	 * join the room
	 * @param {int} invitation : room number
	 */
/*	client.on("call", function(invitation){
		client.broadcast.to(room).emit("call", invitation)
	});

	/**
	 * If you are the first user to connect 
	 * create room
	 */
/*	if(!guest){
		room = Math.floor(Math.random()*1000001).toString();
		client.emit('getRoom', {roomId : room});
		client.join(room);
		messages[room] = new Array();
	}

	/**
	 * Aks for the clients ID
	 */
/*	client.on("askId", function(client) {
		client.emit("askId", client.id);
	});

	/**
	 * When a user send a SDP message
	 * broadcast to all users in the room
	 */
/*  	client.on('message', function(message) {
        var broadcastMessage = message;
        client.broadcast.to(room).send(broadcastMessage);
    });

    /**
	 * List of messages (chat)
	 */
/*	client.emit('recupererMessages', messages[room]);
*/
	
	/**
	 * When we receive a new message (chat)
	 * add to the array
	 * broadcast to all users in the room
	 */
	client.on('newMessage', function( mess ) {
		client.emit('newMessage', mess);
		client.broadcast.to( room ).emit('newMessage', mess);
	});

	/**
	 * When the user hangs up
	 * broadcast bye signal to all users in the room
	 */
 	client.on('disconnect',function() {
 		var rooms = io.sockets.manager.roomClients[client.id];
 		
    	for( var currRoom in rooms ) {
    		var currRoom = currRoom.substring(1);
    		client.broadcast.to(currRoom).emit('RTCSignaling', { type: 'bye', connectionId: currRoom });
    	}
  	});

  	/**
	 * When the user close the application
	 * broadcast close signal to all users in the room
	 */
  	client.on('exit',function(){
    	client.broadcast.to(room).emit('close');
  	});
  	
  	
  	/** ======= NEW RTC SHIT ======== **/
  	client.on('RTCOpenRoom', function(message) {
  		room = message.roomId;
		client.join(room);
		speakers[message.roomId] = client;
  	});
  	
  	client.on('RTCOpen', function(message) {
		var speaker = speakers[message.roomId];
  		room = message.roomId;
		client.join(room);
		
	  	if( speaker !== undefined && io.sockets.clients(message.connectionId).length === 0 ) {
			client.join(message.connectionId);
			speaker.join(message.connectionId);
			
			client.emit('RTCOpen', { ok: true });
		} else {
			client.emit('RTCOpen', { ok: false });
		}
  	});
  	
  	/**
  	 * There always has to be a message.connectionId!
  	 */
  	client.on('RTCSignaling', function(message) {
  		//var firstCall = (io.sockets.clients(message.connectionId).length === 0) ? true : false;
  		
  		//  if connection is not full and client has not joined yet, join.
  		//if( io.sockets.clients(message.connectionId).length < 2 &&
  		//		!io.sockets.manager.roomClients[client.id]['/' + message.connectionId] ) {
	  	//	client.join(message.connectionId);
  		//}
	  	client.broadcast.to(message.connectionId).emit('RTCSignaling', message);
  	});
});

/*
io.socket.on('connection', function(client) {
	
	var room = "";
	var student = false;

	client.emit('connectionEstablished', client.id);
	
	client.on('joinRoom', function(invitation) {
		room = invitation;
		student = true;
		client.join(room);
		messages[room] = new Array();
	});
	
	client.on('call', function(data) {
		if( io.sockets.clients(data.connectionId).length < 2 ) {
			client.join(data.connectionId);
			
		}
	});
	
});*/

/**
 * Handle incoming connections,
 * other than websockets
 */
function handler(request, response) {
    var filePath = '.' + request.url;
    
    if (filePath == './') {
        filePath = './index.html';
    }
         
    var extname = path.extname(filePath);
    var contentType;
    
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.jpg':
            contentType = 'image/jpeg';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        default:
        	contentType = 'text/html';
    }
     
    path.exists(filePath, function(exists) {
    	
        if (exists) {
            fs.readFile(filePath, function(error, content) {
                if (error) {
                    response.writeHead(500);
                    response.end();
                }
                else {
                    response.writeHead(200, { 'Content-Type': contentType });
                    response.end(content, 'utf-8');
                }
            });
        }
        else {
        	fs.readFile(filePath, function (err, data) {
			    if (err) {
				    response.writeHead(500);
				    response.end('Error loading index.html');
				}
				response.writeHead(200);
				response.end(data);
		    });
        }
    });

}