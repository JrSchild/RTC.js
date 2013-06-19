var RTC = (function( win, undefined ) {
	"use strict";
	
	var obj;
	
	win.URL = win.URL || win.webkitURL || win.msURL || win.oURL;
	
	navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
	
	/**
	 * The constructor function
	 */
	obj = function( options, data ) {
	var
		_this = this,
		onReady = function() {},
		onRemoteHangup = function() {},
		remoteStream,
		mediaConstraints = {
			'has_video': options.video || false,
			'has_audio': options.audio || false
		},
		peerConnection = createPeerConnection();
		
		/**
		 * onRemoteHangup fires when the connection is stopped
		 */
		this.onRemoteHangup = function( callback ) {
			onRemoteHangup = callback;
			return _this;
		};
		
		/**
		 * onReady fires when the connection is established
		 */
		this.onReady = function( callback ) {
			onReady = callback;
			return _this;
		};
		
		this.toggleSound = function( force ) {
			var audioTrack = remoteStream.audioTracks[0];
								
			audioTrack.enabled = ( force !== undefined ) ? force :
								( ( audioTrack.enabled === true ) ? false : true );
			return _this;
		};
		
		if( data.type !== 'offer' ) {
			// generate unique connection ID
			_this.connectionId = data.connectionId = ( "" + Math.random() ).replace( ".", "" );
			
			obj.socket.on( "RTCSignaling", function( data ) {
				processSignalingMessage( data );
			});
			
			getUserMedia(function() {
				console.log("Adding local stream.");
				peerConnection.addStream( obj.localStream );
				
				obj.socket.emit( "RTCOpen", data );
				obj.socket.on( "RTCOpen", function( d ) {
					if( d.ok === true ) {
						// Create offer
						peerConnection.createOffer( setLocalAndSendMessage /*, null, mediaConstraints */ );
					} else if( d.ok === false ) {
						// try again every 5 seconds.	
						console.log("Connection not yet established, trying again in 5 seconds...");				
						setTimeout(function() {
							obj.socket.emit( "RTCOpen", data );
						}, 5000);
					}
				});
			});
		} else {
			console.log("Adding local stream.");
			peerConnection.addStream( obj.localStream );
			
			_this.connectionId = data.connectionId;
			
			obj.socket.on( "RTCSignaling", function( data ) {
				processSignalingMessage( data );			
			});
			// Answer offer
			processSignalingMessage( data );
		}
	
		/**
		 * Set parameter for creating a peer connection and add a callback function for messagin by peer connection
		 * @return {void}
		 */
		function createPeerConnection() {
			var pc_config = { "iceServers": [{ "url": "stun:" + RTC.STUN }] },
				peerConnection;
			
			try {
				peerConnection = new win.webkitRTCPeerConnection( pc_config );
				peerConnection.onicecandidate = onIceCandidate;
				console.log("Created webkitRTCPeerConnnection with config \"" + JSON.stringify(pc_config) + "\".");
			} catch( e ) {
				peerConnection = false;
				alert("Cannot create PeerConnection object; Is the 'PeerConnection' flag enabled in about:flags?");
				console.log("Failed to create PeerConnection, exception: " + e.message);
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
			if( _this.connectionId !== message.connectionId ) {
				return;
			}
			
			if( message.type === 'offer' ) {
				peerConnection.setRemoteDescription( new win.RTCSessionDescription( message ) );
				
				// Answer back
				console.log("Sending answer to peer.");
				peerConnection.createAnswer(setLocalAndSendMessage /*, null, mediaConstraints */);
			} else if( message.type === 'answer' ) {
				
				peerConnection.setRemoteDescription( new win.RTCSessionDescription( message ) );
			} else if( message.type === 'candidate' ) {
				var candidate = new win.RTCIceCandidate({
					sdpMLineIndex: message.label,
					candidate: message.candidate
				});
				peerConnection.addIceCandidate( candidate );
			} else if( message.type === 'bye' ) {
				onRemoteHangup.call( _this );
			}
		}
		
		/**
		 * @return {void}
		 */
		function setLocalAndSendMessage( sessionDescription ) {
			peerConnection.setLocalDescription( sessionDescription );
			
			console.log( 'C->S: ', JSON.stringify( sessionDescription ) );
			
			var data = sessionDescription;
			data.connectionId = _this.connectionId;
			
			// send offer
			obj.socket.emit( "RTCSignaling", data );
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
					type: 'candidate',
					connectionId: _this.connectionId,
					label: event.candidate.sdpMLineIndex,
					id: event.candidate.sdpMid,
					candidate: event.candidate.candidate
				};
				
				obj.socket.emit( "RTCSignaling", data );
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
			console.log( 'Remote stream added.', event );
			
			remoteStream = event.stream;
			var remoteUrlStream = win.URL.createObjectURL( remoteStream );
			
			onReady.call( _this, remoteUrlStream, remoteStream );
		}
	
		/**
		 * Called when the peer connection is connecting
		 * @param  {message} message
		 * @return {void}
		 */
		function onSessionConnecting( message ) {      
			console.log( 'Session connecting.', message );
		}
		
		/**
		 * Called when the session between clients is established
		 * @param  {message} message
		 * @return {void}
		 */
		function onSessionOpened( message ) {      
			console.log( 'Session opened.', message );
		}
		
		/**
		 * Called when the remote stream has been removed
		 * @param  {event} event : event given by the browser
		 * @return {void}
		 */
		function onRemoteStreamRemoved( event ) {
			console.log( 'Remote stream removed.', event );
		}
	};
	
	/**
	 * Set the used STUN server
	 */
	obj.STUN = 'stun.l.google.com:19302';
	
	/**
	 * The socket.io connection that will be used for messaging
	 */
	obj.socket = undefined;
	
	/**
	 * Once the local stream is established it will be
	 * stored in here, as well as in connection1.localStream
	 */
	obj.localStream = undefined;
	
	/**
	 * Once the local stream is established it's URL will be
	 * accesible through this variable.
	 */
	obj.localUrlStream = undefined;
	
	/**
	 * The unique connectionId used to identify connection
	 * between two peers
	 */
	obj.prototype.connectionId = undefined;
	
	/**
	 * Called when the remote stream has been added
	 * @param  {event} event : event given by the browser
	 * @return {void}
	 */
	obj.onLocalStreamAdded = function() {};
	
	/**
	 * This function listens for incoming offers
	 */
	obj.listen = function( data, callback ) {
		getUserMedia(function() {
			obj.socket.emit( "RTCOpenRoom", data );
			obj.socket.on( "RTCSignaling", function( data ) {
				if( data.type === 'offer' ) {
					callback( data );
				}
			});
		});
	};
	
	/**
	 * get the media (audio or video) of the user
	 * @return {void}
	 */
	function getUserMedia( callback ) {
		if( navigator.getUserMedia ) {
			navigator.getUserMedia({ audio: true, video: true }, onUserMediaSuccess( callback ), onUserMediaError );
			console.log("Requested access to local media.");
		}
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
			
			obj.localStream = stream;
			obj.localUrlStream = win.URL.createObjectURL( stream );
			
			obj.onLocalStreamAdded( obj.localUrlStream, obj.localStream );
			callback();
		};
	}
	
	/**
	 * Callback function for getUserMedia() on fail getting the media
	 * @param  {error} error : informations about the error
	 * @return {void}
	 */
	function onUserMediaError( error ) {
		console.log( 'Failed to get access to local media. Error code was: ' + error.code );
		alert( 'Failed to get access to local media. Error code was: ' + error.code);    
	}
	
	return obj;
	
})( window );

