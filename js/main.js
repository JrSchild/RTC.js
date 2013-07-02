$(function() {
	var chatWindowTmpl = tmpl('chat_window_tmpl');
	
	RTC.socket = io.connect( APP.host + '/' + APP.namespace );
	RTC.onLocalStreamAdded = onLocalStreamAdded;
	
	RTC.join(1, function() {
		var connections = [];
		
		loadClients();
		RTC.onIncoming(function( data ) {
			var chatWindow = openChat( data.sender );
			connections[data.connectionId] = new RTC({ video: true, audio: true }, data)
				.onReady(function( stream ) {
					addVideo( stream, chatWindow.find('.videocall') );
				})
				.onRemoteHangup( onRemoteHangup );
		});
	});
	
	// Apply call handler
	$('.container').on('click', '.call-btn', function( e ) {
		var clientID = $(this).data('clientid');
		var chatWindow = $('#chat-' + clientID);
		
		new RTC({ video: true, audio: true },{ client: clientID })
			.onReady(function( stream ) {
				addVideo( stream, chatWindow.find('.videocall') );
			})
			.onRemoteHangup( onRemoteHangup );
	});
	
	// Make the user list dynamic
	$('ul.users').on('click', 'li', function( e ) {
		openChat($(this).data('clientID'));
	});
	
	function onLocalStreamAdded( streamUrl, stream ) {
		var localStream = $('.local-stream');
		addVideo( streamUrl, localStream );
		localStream.find('video')[0].muted = true;
	}
	
	function onRemoteHangup(args) {
		closeChat( args.sender );
	}
	
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
	
	function closeChat( clientID ) {
		$('#chat-' + clientID).remove();
		
		// Are there other windows?
		var otherID = $('[id^="chat-"]:first').data('clientid');
		
		if( otherID ) {
			openChat( otherID );
		}
	}
	
	function addVideo( stream, parent ) {
		$('<video/>')
			.attr({
				autoplay: "autoplay",
				src: stream
			})
			.appendTo(parent);
	}
	
	// Let's just use long-polling for now to update the user list.
	function loadClients() {
		RTC.getUserList(function( clients ) {
			var users = $('ul.users');
			var currActive = users.find('.active').first().data('clientid');
			
			users.html('');
			if( clients[0] ) {
				for( var i = 0, y = clients.length; i < y; i++ ) {
					$('<li/>')
						.text(clients[i])
						.data('clientID', clients[i])
						.attr({
							'data-clientid': clients[i]
						})
						.appendTo(users);
				}
				if( currActive )
					users
						.find('[data-clientid="' + currActive + '"]')
						.addClass('active');
			}
			setTimeout(loadClients, 2000)
		});
	}

});

// Because it's so awesome!
// Simple JavaScript Templating
// John Resig - http://ejohn.org/ - MIT Licensed
(function(){var b={};this.tmpl=function e(a,c){var d=!/\W/.test(a)?b[a]=b[a]||e(document.getElementById(a).innerHTML):new Function("obj","var p=[],print=function(){p.push.apply(p,arguments);};with(obj){p.push('"+a.replace(/[\r\t\n]/g," ").split("<%").join("\t").replace(/((^|%>)[^\t]*)'/g,"$1\r").replace(/\t=(.*?)%>/g,"',$1,'").split("\t").join("');").split("%>").join("p.push('").split("\r").join("\\'")+"');}return p.join('');");return c?d(c):d}})();