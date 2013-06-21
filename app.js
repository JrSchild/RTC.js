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
io.of('/RTC').on('connection', function (client) {
	client.emit('connectOk', client.id);
	
	//-- Variables declarations--//
	var room = '';
	var RTCConnection = '';
	var connectionIDs = [];
	
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
    		var currRoom = currRoom.substring(1);
    		client.broadcast.to(currRoom).emit('Signaling', { type: 'bye', connectionId: currRoom });
    	}
  	});

  	/**
	 * When the user close the application
	 * broadcast close signal to all users in the room
	 */
  	client.on('exit', function(){
		client.broadcast.to(room).emit('close');
  	});
  	
  	client.on('getUserList', function(message) {
	  	var clients = io.of('/RTC').clients(room);
	  	var IDs = [];
	  	/*for( var i in clients ) {
	  		if( client.id !== clients[i].id ) {
				IDs.push(clients[i].id);
			}
	  	}*/
	  	// For now we'll just send the speaker (for demo purposes)
	  	IDs.push(speakers[room].id);
	  	client.emit('getUserList' + message.uuid, IDs);
  	});
  	
  	/** ======= NEW RTC stuff ======== **/
  	client.on('JoinRoom', function(message) {
  		room = message.roomId;
		client.join(room);
		
		// Rip this stuff out later, this is to make it work properly with the demo.
		// All this should be abstracted.
		if( io.of('/RTC').clients(message.roomId).length === 1 ) {
			speakers[message.roomId] = client;
		}
		client.emit('JoinRoom', {status: 'OK'});
  	});
  	
  	// Remove this junk
  	client.on('Call', function(message) {
  		var receiver = getClientById(message.client);
  		
  		if( receiver ) {
			client.join(message.connectionId);
			receiver.join(message.connectionId);
			
			client.emit('Call', { ok: true });
  		} else {
			client.emit('Call', { ok: false });
  		}
  	});
  	
  	/**
  	 * There always has to be a message.connectionId!
  	 */
  	client.on('Signaling', function(message) {
	  	client.broadcast.to(message.connectionId).emit('Signaling', message);
  	});
  	
  	/**
  	 * Ugly and not being used yet.
  	 */
  	client.on('getConnectionID', function(message) {
		// message should contain the receivers ID
		var ID = generateID();
		client.join(ID);
		speakers[room].join(ID);
		console.log('Connection ID:   ' + ID);
		client.emit('getConnectionID', ID);
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
		var clients = io.of('/RTC').clients(room);
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