$(function() {
	var chatWindowTmpl = tmpl('chat_window_tmpl');
	var popupTmpl = tmpl('popup_tmpl');
	var offers = {};
	var connections = {};
	
	RTC.socket = io.connect( APP.host + '/' + APP.namespace );
	
	/**
	 * RTC init setup.
	 */
	RTC
		.onLocalStreamAdded( onLocalStreamAdded )
	
		// Ask media permissions and join the main room on the server.
		.join(1, function() {
		
			// Make the clientlist dynamic.
			loadClients();
		})
		
		// Bind handler on incoming connections.
		.onIncoming(function( data ) {
			offers[ data.connectionID ] = data;
			
			$(popupTmpl(data)).appendTo('.container');
		});
	
	/**
	 * Call the other client.
	 * @return {void}
	 */
	function initiateCall( clientID ) {
		var chatWindow = $('#chat-' + clientID);
		
		// call the client by creating a new RTC object.
		new RTC({ client: clientID })
			.call()
			.onReady( onReady( chatWindow ) )
			.onRemoteHangup( onRemoteHangup );
	}
	
	/**
	 * Answer a call with the received data
	 * @return {void}
	 */
	function answerCall( data ) {
		var chatWindow = openChat( data.sender );
		
		// answer the client and create a new RTC object.
		new RTC( data )
			.call()
			.onReady( onReady( chatWindow ) )
			.onRemoteHangup( onRemoteHangup );
	}
	
	// Apply call, answer and hangup handlers.
	$('.container')
		.on('click', '.btn-call', function( e ) {
			var clientID = $(this).data('clientid');
			
			initiateCall( clientID );
		})
		.on('click', '.popup .btn-success', function( e ) {
			var connectionid = $(this).data('connectionid');
			
			// Has the offer been made? If yes, answer the call.
			var data = offers[ connectionid ];
			
			if( data ) {
				answerCall( data );
			}
				
			// Remove popup from the DOM.
			$('#popup-' + connectionid).remove();
		}).on('click', '.popup .btn-danger', function( e ) {
			var connectionid = $(this).data('connectionid');
			
			// API for declining calls hasn't been written yet.
			// For now we'll just remove the popup.
			if( connectionid ) {
				offers[ connectionid ] = null;
				$('#popup-' + connectionid).remove();
			}
		});
	
	// Make the user list dynamic
	$('ul.users').on('click', 'li', function( e ) {
		var clientID = $(this).data('clientID');
		
		openChat( clientID );
	});
	
	/**
	 * When the local stream has been added.
	 * @return {void}
	 */
	function onLocalStreamAdded( data ) {
		console.log("onLocalStreamAdded", data);
		
		var localStream = $('.local-stream');
		
		// Add the local videostream to the DOM
		addVideo( data.streamUrl, localStream );
		
		// Mute local audio stream.
		localStream.find('video')[0].muted = true;
	}
	
	/**
	 * Return a function to execute when the connection has been established.
	 * Store an element to append the video to.
	 * @return {function}
	 */
	function onReady( $el ) {
		return function( data ) {
			// Store the RTC object after the connection has been established.
			connections[ this.connectionID ] = this;
			
			// Add video to the DOM
			addVideo( data.streamUrl, $el.find('.videocall') );
		}
	}
	
	/**
	 * When the remote streams has been terminated, close the chat.
	 * @return {void}
	 */
	function onRemoteHangup( args ) {
		closeChat( args.sender );
	}
	
	/**
	 * Open a chat window based on the clientID.
	 * @return {$-Object}
	 */
	function openChat( clientID ) {
		// is the chat with this person already in the DOM?
		var chatwindow = $('#chat-' + clientID);
		
		if( chatwindow.length === 0 ) {
			chatwindow = $(chatWindowTmpl({ clientID: clientID })).insertAfter($('.left.col'));
		}
		
		$('ul.users li')
			.removeClass('active')
			.filter('[data-clientid="' + clientID + '"]')
			.addClass('active');
		
		$('[id^="chat-"]')
			.removeClass('active')
			.filter('#chat-' + clientID)
			.addClass('active');
		
		return chatwindow;
	}
	
	/**
	 * Close a chat window based on the clientID.
	 * @return {void}
	 */
	function closeChat( clientID ) {
		$('#chat-' + clientID).remove();
		
		// Are there other windows?
		var otherID = $('[id^="chat-"]:first').data('clientid');
		
		if( otherID ) {
			openChat( otherID );
		}
	}
	
	/**
	 * Add a videostream to the DOM.
	 * @return {void}
	 */
	function addVideo( stream, parent ) {
		$('<video/>')
			.attr({
				autoplay: "autoplay",
				src: stream
			})
			.appendTo(parent);
	}
	
	/**
	 * Keeps updating the user list.
	 * For now it uses long-polling.
	 * @return {void}
	 */
	function loadClients() {
		RTC.getUserList(function( clients ) {
			var users = $('ul.users');
			var currActive = users.find('.active').first().data('clientid');
			
			// clear the user list before re-loading it.
			users.html('');
			if( clients[0] ) {
			
				// refresh the list.
				for( var i = 0, y = clients.length; i < y; i++ ) {
					$('<li/>')
						.text(clients[i])
						.data('clientID', clients[i])
						.attr({
							'data-clientid': clients[i]
						})
						.appendTo(users);
				}
				
				// restore the currently active user.
				if( currActive ) {
					users
						.find('[data-clientid="' + currActive + '"]')
						.addClass('active');
				}
			}
			setTimeout(loadClients, 2000)
		});
	}

});

// Because it's so awesome!
// Simple JavaScript Templating
// John Resig - http://ejohn.org/ - MIT Licensed
(function(){var b={};this.tmpl=function e(a,c){var d=!/\W/.test(a)?b[a]=b[a]||e(document.getElementById(a).innerHTML):new Function("obj","var p=[],print=function(){p.push.apply(p,arguments);};with(obj){p.push('"+a.replace(/[\r\t\n]/g," ").split("<%").join("\t").replace(/((^|%>)[^\t]*)'/g,"$1\r").replace(/\t=(.*?)%>/g,"',$1,'").split("\t").join("');").split("%>").join("p.push('").split("\r").join("\\'")+"');}return p.join('');");return c?d(c):d}})();