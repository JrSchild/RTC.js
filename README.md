## RTC.js
This is my implementation for the Real Time Communication protocol. It's goal is to have as much flexibility to the developer with as possible while keeping the API simple. Resulting in a low level abstraction. I hope it's useful to you in any way.

I am currently rewriting the codebase to be more consistent as well as reworking a couple of other things.

### API
The API is simple to follow. You can listen for incoming calls or you can call someone else.

Start by initializing everything like you're used to. But this time we're giving the socket object to the RTC plugin.
    
    RTC.socket = io.connect(APP.socketHost);

If you'd want to listen for incoming calls you can use the .listen() function as follows:

        RTC.listen({ roomId: APP.roomId }, function( data ) {
            connections[data.connectionId] = new RTC({ video: 'true', audio: 'true' }, data)
                .onReady(onRemoteStreamAdded)
                .onRemoteHangup(onRemoteHangup);
        });
Note that roomId will be the room on the server this client is going to join.

Calling someone else is just as easy:

        connection1 = new RTC({ video: 'true', audio: 'true' }, { roomId: APP.roomId })
            .onReady(onRemoteStreamAdded)
            .onRemoteHangup(onRemoteHangup);

When the function onRemoteStreamAdded is fired the parameters passed are 1) streamUrl and 2) localStream. Now you can use them however you want to.

### Demo
The current demo will be rewritten as soon as the RTC.js codebase has been rewritten. For now you can test it by first starting up app.js on your node server. Then go localhost:8889 and give your browser camera-access permissions.
After that go to localhost:8889/#join, after accepting the camera you will have a one on one connection. Now you can also let multiple people join with the latter URL. The first person is able to see everyone else.