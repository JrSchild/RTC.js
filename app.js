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
 * Global namespace to be used
 */
var namespace = 'RTC';

/**
* When a user connects
*/
io.of('/' + namespace).on('connection', function (client) {
	"use strict";
	
	client.emit('connectOk', client.id);
	
	//-- Variables declarations--//
	var room = '';
	
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
	client.on('disconnect', function() {
		var rooms = io.sockets.manager.roomClients[client.id];
		
		for( var currRoom in rooms ) {
			if( rooms.hasOwnProperty(currRoom) ) {
				// get string after the last slash.
				var match = /([^/]+$)/g.exec(currRoom);
				
				if( match && match[0] && match[0] !== namespace && match[0] !== room ) {
					client.broadcast.to(match[0]).emit('Signaling', { type: 'bye', connectionID: match[0] });
				}
			}
		}
	});

	/**
	 * When the user close the application
	 * broadcast close signal to all users in the room
	 */
	client.on('exit', function(){
		client.broadcast.to(room).emit('close');
	});
	
	/**
	 * Send a list back to the client of all clients in the room
	 * excluding the current client.
	 */
	client.on('getUserList', function(message) {
		var clients = io.of('/' + namespace).clients(room);
		var IDs = [];
		
		for( var i in clients ) {
			if( client.id !== clients[i].id ) {
				IDs.push(clients[i].id);
			}
		}
		
		// uuid is to make sure the right callback is called and removed after.
		client.emit('getUserList' + (message && message.uuid ? message.uuid : ''), IDs);
	});
	
	client.on('JoinRoom', function(message) {
		room = message.roomID + "";
		client.join(room);
		
		client.emit('JoinRoom' + (message && message.uuid ? message.uuid : ''), {status: 'OK'});
	});
	
	client.on('Call', function(message) {
		var receiver = getClientById(message.client);
		var data = {};
		
		if( receiver ) {
			var connectionID = data.connectionID = generateID();
			
			client.join(connectionID);
			receiver.join(connectionID);
		}
		client.emit('Call' + (message && message.uuid ? message.uuid : ''), data);
	});

	/**
	 * There always has to be a message.connectionID!
	 */
	client.on('Signaling', function(message) {
		if( message && message.connectionID ) {
			client.broadcast.to(message.connectionID).emit('Signaling', message);
		}
	});
	
	/**
	 * Generate random -unique- connection ID
	 */
	function generateID() {
		var ID = ( "" + Math.random() ).replace( ".", "" );			
		if( io.sockets.clients(ID).length > 0 ) {
			return generateID();
		}
		return ID;
	}
	
	function getClientById(id) {
		var clients = io.of('/' + namespace).clients(room);
		for( var i in clients ) {
			if( clients[i].id === id ) {
				return clients[i];
			}
		}
		return false;
	}
});

/**
 * Handle incoming connections,
 * other than websockets
 */
function handler(request, response) {
	"use strict";

	var filePath = '.' + request.url;
	
	if (filePath === './') {
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