///////////////////////////////////
// Server Node.js with socket.IO //
///////////////////////////////////

/**
 * Import socket.io module
 * on the server HTTP
 */
var io = require('socket.io').listen(8889);

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
	
	//-- Variables declarations--//
	var room = '';

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
				
				// rework this connectionID stuff, store connections in a local array
				if( match && match[0] && match[0] !== namespace && match[0] !== room ) {
					client.broadcast.to(match[0]).emit('Signaling', { type: 'bye', connectionID: match[0], sender: client.id });
				}
			}
		}
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
		client.emit('getUserList' + (message && message.uuid || ''), IDs);
	});
	
	client.on('JoinRoom', function(message) {
		room = message.roomID + "";
		client.join(room);
		
		client.emit('JoinRoom' + (message && message.uuid || ''), {status: 'OK'});
	});
	
	client.on('Connect', function(message) {
		var receiver = getClientById(message.client);
		var data = {};
		
		if( receiver ) {
			var connectionID = data.connectionID = generateID();
			
			client.join(connectionID);
			receiver.join(connectionID);
		}
		client.emit('Connect' + (message && message.uuid || ''), data);
	});

	/**
	 * There always has to be a message.connectionID!
	 */
	client.on('Signaling', function(message) {
		if( message && message.connectionID ) {
			// attaching sender's data, add anything you like.
			message.sender = client.id;
			
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