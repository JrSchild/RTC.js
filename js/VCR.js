////////////////////////////
// Global Javascript file //
////////////////////////////

$(function() {
var
	localVideo,
	remoteVideo,
	mainVideo = false;
	
	RTC.socket = socket = io.connect(APP.socketHost);
	
	RTC.onLocalStreamAdded = onLocalStreamAdded;
	
	var connections = [];
	
	RTC.join(APP.roomId, function() {
	
		if( APP.speaker ) {
			// If we're the speaker, we'll only listen for incoming calls.
			RTC.listen(function( data ) {
				connections[data.connectionId] = new RTC({ video: 'true', audio: 'true' }, data)
					.onReady(onRemoteStreamAdded)
					.onRemoteHangup(onRemoteHangup);
			});
		} else {
			connection1 = new RTC({ video: 'true', audio: 'true' })
				.onReady(onRemoteStreamAdded)
				.onRemoteHangup(onRemoteHangup);
		}
		
	});
	
	/**
	 * Get the remote stream and add it to the page with a url
	 * @param  {event} event : event given by the browser
	 * @return {void}
	 */
	function onRemoteStreamAdded( streamUrl, localStream ) {
		remoteVideo = $('<video autoplay="autoplay" src="' + streamUrl + '" id="stream-' + this.connectionId + '" />')
						.data('connectionId', this.connectionId);
		enableChat();
		
		console.log('onRemoteStreamAdded', this);
		if( !mainVideo ) {
			remoteVideo.prependTo("#VCR-videos .VCR-mainVideo");
			mainVideo = this.connectionId;
			this.toggleSound( true );
		} else {
			remoteVideo.addClass( "VCR-remoteVideo" );
			remoteVideo.prependTo("#VCR-videos .VCR-remoteVideos");
			if( $("#VCR-videos .VCR-remoteVideos video").length > 3 ) {
				$("#VCR-videos .VCR-remoteVideosContainer").css({'overflow-x': 'scroll'});
			}
			this.toggleSound( false );
		}
	}
	
	/**
	 * Get the local stream and add it to the page with a url
	 * @param  {event} event : event given by the browser
	 * @return {void}
	 */
	function onLocalStreamAdded( streamUrl ) {
		localVideo = $('<video autoplay="autoplay" src="' + streamUrl + '"/>')
			.appendTo("#VCR-videos .VCR-localVideo");
	}
	
	/**
	 * Fires when the remote stream hangs up.
	 * @param  {event} event : event given by the browser
	 * @return {void}
	 */
	function onRemoteHangup() {
		if( mainVideo === this.connectionId ) {
			// get the next remote video and place its src in the maincontainer, remove it.
			var nextVideo = $('.VCR-remoteVideos video').first();
			if( nextVideo.length > 0 ) {
				mainVideo = nextVideo.data('connectionId');
				swapVideos( this.connectionId, mainVideo );
				connections[this.connectionId].toggleSound( true );
				
				nextVideo.remove();
			} else {
				mainVideo = false;
				$('#stream-' + this.connectionId).remove();
			}
		} else {
			$('#stream-' + this.connectionId).remove();
		}
		console.log('Opgehangen! :(', this);
	}
	
	function setMainVideo() {
		//console.log(this);
		//console.log($(this).data('connectionId'));
		if( mainVideo ) {
			var connectionId = $(this).data('connectionId');
			console.log( connectionId );
			
			connections[connectionId].toggleSound( true );
			connections[mainVideo].toggleSound( false );
			
			swapVideos( mainVideo, connectionId );
			mainVideo = connectionId;
		}
	}
	
	$('.VCR-remoteVideos').delegate('video', 'click', setMainVideo);
	
	///////////////////////////////////
	// Code to make the chat-client //
	//////////////////////////////////
	socket.on("newMessage", onNewMessage);
	$('#send').on("click", sendForm);
	$('#chatForm').on("submit", sendForm);

	/**
	 * If somebody send a new message, the server send message 
	 * @param {array} messages : array containing all messages that were written on the server
	 * @return {void}
	 */	
	 function onNewMessage( message ) {
	 	console.log("NIEUW BERICHT", message);
		var tchat = $('#tchat').append( '<div class="line"><b>' + message.nickname + '</b> : ' + message.message + '</div>' );
		setHeight( tchat );
	}

	/**
	 * Calculate the height of the line's chat
	 * @param {object} elt : $('#tchat')
	 * @return {void}
	 */	
	function setHeight( elt ) {
		var height = elt.children().length * elt.children().first().height();
		elt.scrollTop( height );
	}
	
	function enableChat() {
		$("#mess").attr("disabled", false)
		$("#send").removeClass('disabled');
	}
	
	function swapVideos( id1, id2 ) {
		var video1 = $('#stream-' + id1);
		var video2 = $('#stream-' + id2);
		var video1Clone = video1.clone( true );
		
		console.log(video2.data('connectionId'));
		video1.attr('src', video2.attr('src'))
			.attr('id', 'stream-' + video2.data('connectionId'))
			.data('connectionId', video2.data('connectionId'));
			
		console.log(video1Clone.data('connectionId'));
		video2.attr('src', video1Clone.attr('src'))
			.attr('id', 'stream-' + video1Clone.data('connectionId'))
			.data('connectionId', video1Clone.data('connectionId'));
	}
		
	/**
	 * When we want to send a message 
	 * Send it to the server, it will be caught back by onNewMessage.
	 * Display the message into the chatbox
	 * Clean the input
	 * @return {false} to not not refresh the page
	 */
	function sendForm( e ) {
		e.preventDefault();
		
		if( $( this ).hasClass('disabled') )
			return;
		
		var mess = $('#mess');
		var value = jQuery.trim( mess.val() );
		
		if( value.length > 0 ) {
			socket.emit('newMessage', { 'nickname' : APP.name, 'message' : mess.val() });
		}
		
		mess.val('');
		
		return false;
	}
	
});