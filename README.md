## RTC.js
This is my implementation for the Real Time Communication protocol. It's goal is to have as much flexibility to the developer as possible while keeping the API simple. Resulting in a low level abstraction. I hope it's useful to you in any way.

I am currently rewriting the codebase to be more consistent as well as reworking a couple of other things.

### API
The API is simple to follow. You can listen for incoming calls or you can call someone else.

Start by initializing socket.io like you're used to. We're giving the socket object to the RTC plugin.
    
    RTC.socket = io.connect( socketHost );

After that you join a room of choise on the server by:

    RTC.join( roomID, callback )

The callback will be fired as soon as joining the room on the server is succesful.

If you'd want to listen for incoming calls you can use the .onIncoming() function as follows:

    RTC.onIncoming(function( data ) {
        connections[data.connectionId] = new RTC({ video: 'true', audio: 'true' }, data)
            .onReady(onRemoteStreamAdded)
            .onRemoteHangup(onRemoteHangup);
    });

In RTC() we pass the media constraints that you will allow the other client access to, and the data object we received. RTC will use this data to confirm the connection.

Calling someone else is just as easy:

    connection1 = new RTC({ video: true, audio: true }, {client: clientID})
        .onReady(onRemoteStreamAdded)
        .onRemoteHangup(onRemoteHangup);

When the function onRemoteStreamAdded is fired the parameters passed are 1) streamUrl and 2) localStream. Now you can use them however you want to.
Again we'll use the mediacontraints as well as a clientID. Additionaly you can generate a list of clientIDs currently in your room by calling:

    getUserList(function( clients ) {});

### Demo
The current demo will be rewritten as soon as the RTC.js codebase has been rewritten. For now you can test it by first starting up app.js on your node server. Then go localhost:8889 and give your browser camera-access permissions.
After that go to localhost:8889/#join in another window, after accepting the camera you will have a one on one connection. Now you can also let multiple people join with the latter URL. The first person is able to see everyone else.

You probably need to change the IP address and port of your node-server in index.html. 

### Support
Chrome only. Firefox Beta coming soon.