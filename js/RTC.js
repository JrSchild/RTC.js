/*!
 * RTC.js - Low level abstraction for Real Time Communication 
 * ---
 * @author Joram Ruitenschild
 * @version 0.0.1-beta
 * @updated 21-JUNE-2013
 * ---
 * @license Dual licensed under the MIT and GPL licenses
 * @info https://github.com/JrSchild/RTC.js
 */
(function( win, undefined ) {
	"use strict";
	
	var RTC;
	
	navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
	
	win.RTCPeerConnection = win.RTCPeerConnection || win.webkitRTCPeerConnection;
	
	if( navigator.mozGetUserMedia ) {
		win.RTCSessionDescription = win.mozRTCSessionDescription;
		win.RTCIceCandidate = win.mozRTCIceCandidate;
		win.RTCPeerConnection = win.mozRTCPeerConnection;
	}
	
	/**
	 * The constructor function
	 */
	RTC = function( options, data ) {
	var
		_this = this,
		mediaConstraints = {
			"mandatory": {
				"OfferToReceiveAudio": options.video || false, 
				"OfferToReceiveVideo": options.audio || false
			}
		},
		peerConnection = createPeerConnection();
		
		data = data || {};
		
		console.log("Adding local stream.");
		peerConnection.addStream( RTC.localStream );
		
		RTC.socket.on("Signaling", function( data ) {
			processSignalingMessage( data );
		});
		
		if( data.client ) {
			RTC.once("Connect", data, function( data ) {
				if( data.connectionID ) {
					// set connection ID generated by the server
					_this.connectionID = data.connectionID;
					
					// Create offer
					peerConnection.createOffer( setLocalAndSendMessage , null, mediaConstraints );
				}
			});
		} else {
			this.connectionID = data.connectionID;
			
			// Answer offer
			processSignalingMessage( data );
		}
		
		/**
		 * Set parameter for creating a peer connection and add a callback function for messagin by peer connection
		 * @return {void}
		 */
		function createPeerConnection() {
			var pc_config = { "iceServers": [{ "url": "stun:" + RTC.STUN }] },
				pcConstraints = { "optional": [{ "DtlsSrtpKeyAgreement": true }] },
				peerConnection;
			
			try {
				peerConnection = new win.RTCPeerConnection( pc_config, pcConstraints );
				peerConnection.onicecandidate = onIceCandidate;
				console.log("Created webkitRTCPeerConnnection with config:", pc_config);
			} catch( e ) {
				console.log("Failed to create PeerConnection, exception: " + e.message);
				return;
			}
			
			peerConnection.onconnecting = onSessionConnecting;
			peerConnection.onopen = onSessionOpened;
			peerConnection.onaddstream = onRemoteStreamAdded;
			peerConnection.onremovestream = onRemoteStreamRemoved;
			
			return peerConnection;
		}
		
		/**
		 * Process signaling messages
		 * @param  {object} message : incoming object
		 * @return {void}
		 */
		function processSignalingMessage( message ) {
			if( _this.connectionID !== message.connectionID ) {
				return;
			}
			
			if( message.type === "offer" ) {
				peerConnection.setRemoteDescription( new win.RTCSessionDescription( message ) );
				
				// Answer back
				console.log("Sending answer to peer.");
				peerConnection.createAnswer( setLocalAndSendMessage, null, mediaConstraints );
			} else if( message.type === "answer" ) {
				peerConnection.setRemoteDescription( new win.RTCSessionDescription( message ) );
			} else if( message.type === "candidate" ) {
				var candidate = new win.RTCIceCandidate({
					sdpMLineIndex: message.label,
					candidate: message.candidate
				});
				peerConnection.addIceCandidate( candidate );
			} else if( message.type === "bye" ) {
				_this.callbacks.onRemoteHangup.call( _this, message );
			}
		}
		
		/**
		 * @return {void}
		 */
		function setLocalAndSendMessage( sessionDescription ) {
			peerConnection.setLocalDescription( sessionDescription );
			
			var data = {
				connectionID: _this.connectionID,
				type: sessionDescription.type,
				sdp: sessionDescription.sdp
			};
			
			console.log( "C->S: ", data );
			
			// send offer
			RTC.socket.emit( "Signaling", data );
		}
		
		/**
		 * Function called by the peerConnection method for the signaling process between clients
		 * @param  {message} message : generated by the peerConnection API to send SDP message
		 * @return {void}
		 */
		function onIceCandidate( event ) {
			if( event.candidate ) {
				console.log( "Sending RTCCandidate" );
				
				var data = {
					type: "candidate",
					connectionID: _this.connectionID,
					label: event.candidate.sdpMLineIndex,
					id: event.candidate.sdpMid,
					candidate: event.candidate.candidate
				};
				
				RTC.socket.emit( "Signaling", data );
			} else {
				console.log("End of candidates. Event: ", event);
			}
		}
		
		/**
		 * Get the remote stream and add it to the page with a url
		 * @param  {event} event : event given by the browser
		 * @return {void}
		 */
		function onRemoteStreamAdded( event ) {
			console.log( "Remote stream added.", event );
			
			_this.remoteStream = event.stream;
			var remoteUrlStream = win.URL.createObjectURL( _this.remoteStream );
			
			_this.callbacks.onReady.call( _this, remoteUrlStream, _this.remoteStream );
		}
		
		/**
		 * Called when the peer connection is connecting
		 * @param  {message} message
		 * @return {void}
		 */
		function onSessionConnecting( message ) {      
			console.log( "Session connecting.", message );
		}
		
		/**
		 * Called when the session between clients is established
		 * @param  {message} message
		 * @return {void}
		 */
		function onSessionOpened( message ) {      
			console.log( "Session opened.", message );
		}
		
		/**
		 * Called when the remote stream has been removed
		 * @param  {event} event : event given by the browser
		 * @return {void}
		 */
		function onRemoteStreamRemoved( event ) {
			console.log( "Remote stream removed.", event );
		}
	};
	
	RTC.prototype.callbacks = {
		onRemoteHangup: function(){},
		onReady: function() {}
	};
		
	/**
	 * onRemoteHangup fires when the connection is stopped
	 */
	RTC.prototype.onRemoteHangup = function( callback ) {
		this.callbacks.onRemoteHangup = callback;
		return this;
	};
		
	/**
	 * onReady fires when the connection is established
	 */
	RTC.prototype.onReady = function( callback ) {
		this.callbacks.onReady = callback;
		return this;
	};
	
	/**
	 * The unique connectionID used to identify connection
	 * between two peers
	 */
	RTC.prototype.connectionID = undefined;
	
	/**
	 * Incoming stream from other client.
	 */
	RTC.prototype.remoteStream = undefined;
	
	/**
	 * Toggle the sound of the remote stream or turn it off or on
	 * by passing true or false.
	 */
	RTC.prototype.toggleSound = function( force ) {
		var audioTrack = this.remoteStream.getAudioTracks()[0];
		
		if( audioTrack ) {
			audioTrack.enabled = ( force !== undefined ) ? force :
								( ( audioTrack.enabled === true ) ? false : true );
		}
		return this;
	};
	
	/** =====================================================
	 *  PUBLIC METHODS AND VARIABLES ON THE GLOBAL RTC OBJECT
	 ** ===================================================== */
	
	/**
	 * Set the used STUN server
	 */
	RTC.STUN = "stun.l.google.com:19302";
	
	/**
	 * The socket.io connection that will be used for messaging
	 */
	RTC.socket = undefined;
	
	/**
	 * Once the local stream is established it will be
	 * stored in here, as well as in connection1.localStream
	 */
	RTC.localStream = undefined;
	
	/**
	 * Once the local stream is established it's URL will be
	 * accesible through this variable.
	 */
	RTC.localUrlStream = undefined;
	
	/**
	 * room of the client, will be set after connection has been made
	 * and the server says it's okay to join the room.
	 */
	RTC.roomID = undefined;
	
	var callbacks = {
		onLocalStreamAdded: function() {},
		onIncoming: function() {}
	};
	
	/**
	 * Called when the remote stream has been added
	 * @param  {event} event : event given by the browser
	 * @return {void}
	 */
	RTC.onLocalStreamAdded = function( callback ) {
		callbacks.onLocalStreamAdded = callback;
		return this;
	};
	
	RTC.onIncoming = function( callback ) {
		callbacks.onIncoming = callback;
		return this;
	};
	
	/**
	 * Join the room on the server, after server says it's okay
	 * set global roomID
	 */
	RTC.join = function( roomID, callback ) {
		doGetUserMedia(function() {
			// listen for incoming offers and send the offers to the onIncoming callback
			RTC.socket.on( "Signaling", function( data ) {
				if( data.type === "offer" ) {
					callbacks.onIncoming( data );
				}
			});
			RTC.once( "JoinRoom", { roomID: roomID }, function( data ) {
				if( data.status === "OK" ) {
					RTC.roomID = roomID;
					callback();
				}
			});		
		});
	};
	
	/**
	 * Get a list of users from the server, this has been constructed in such a way
	 * that it won't collide when called multiple times.
	 */
	RTC.getUserList = function( callback ) {
		RTC.once( "getUserList", callback );
		return this;
	};
	
	/**
	 * Method to call a listener on the server with a callback,
	 * makes sure the event is only executed once by assigning a unique id
	 */
	RTC.once = function( action, data, callback ) {
		if( typeof data === "function" ) {
			callback = data;
			data = {};
		}
		
		// uuid is used to identify a unique listener and remove this after it's called
		var uuid = data.uuid = +( "" + Math.random() ).replace( ".", "" );
		
		RTC.socket.emit( action, data );
		RTC.socket.on( action + uuid, function( data ) {
			RTC.socket.removeAllListeners( action + uuid );
			delete data.uuid;
			callback( data );
		});
		return this;
	};
	
	/** ========================
	 *  PRIVATE HELPER FUNCTIONS
	 ** ======================== */
	
	/**
	 * get the media (audio or video) of the user
	 * @return {void}
	 */
	function doGetUserMedia( callback ) {
		try {
			navigator.getUserMedia({
				"audio": true,
				"video": {
					"mandatory": {},
					"optional": []
				}
			}, onUserMediaSuccess( callback ), onUserMediaError);
			console.log("Requested access to local media.");
		} catch( e ) { }
	}
	
	/**
	 * Callback function for getUserMedia() on success getting the media
	 * create an url for the current stream
	 * @param  {stream} stream : contains the video and/or audio streams
	 * @return {void}
	 */
	function onUserMediaSuccess( callback ) {
		return function( stream ) {
			console.log("User has granted access to local media.");
			
			RTC.localStream = stream;
			RTC.localUrlStream = win.URL.createObjectURL( stream );
			
			callbacks.onLocalStreamAdded( RTC.localUrlStream, RTC.localStream );
			callback();
		};
	}
	
	/**
	 * Callback function for getUserMedia() on fail getting the media
	 * @param  {error} error : informations about the error
	 * @return {void}
	 */
	function onUserMediaError( error ) {
		console.log("Failed to get access to local media. Error code was: " + error.code );
		alert("Failed to get access to local media. Error code was: " + error.code);    
	}
	
	window.RTC = RTC;
	
})( window );

