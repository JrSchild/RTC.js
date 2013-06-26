## RTC.js
This is my implementation for the Real Time Communication protocol. It's goal is to have as much flexibility to the developer as possible while keeping the API simple. Resulting in a low level abstraction. I hope it's useful to you in any way. When I needed to use Web RTC there was no useful implementation to my needs. This plugin makes it easy for you to manage as many connections with whomever you like.

It uses socket.io for websockets. The code on the server is more like "boilerplate" code. Feel free to add additional data and logic as you like. Maybe in the future I'll create an API for you to use.

### API
I tried to make the API as simple as possible. It's not final but it's definitely getting there.

Start by initializing socket.io like you're used to. We're giving the socket object to the RTC plugin.
    
    RTC.socket = io.connect( socketHost );

#### RTC( mediaconstraints, data )

*mediaconstraints* object  
*data* object

This is used to either initialize a call or accept one. Mediaconstraints is a simple object where you define what to send to the other client, defined as follows:

    { video: true, audio: true }

data will be the object from onIncoming to accept a call, or an object to start a call with a client. Example:

    { client: 'VzuMwqeNN_Cn7QoG76wk' }

#### RTC.join( roomID, handler() )

*roomID* int, string  
*handler()* function()

Use this function to join a room on the server. The callback will be fired as soon as joining the room on the server was succesful.

#### RTC.onIncoming( handler( data) )

*handler(data)* function()

This function is used to listen for incoming calls. Example:

    RTC.onIncoming(function( data ) {
        // use the data to accept a call if you please.
    });

#### RTC.once( action, [data,] handler( data ) )

*action* string  
Name of the action to be called on the server, this is the same name that once() will register for the callback.  
*data*  object, string, int, boolean  
optional data to send to the server  
*handler(data)* function()  
callback method

Method to call a listener on the server with a callback, makes sure the event is only executed once by assigning a unique id internally and calling that unique listener. This function is being used internally, but because of it's usefulness exposed. To make a function compatible with .once() on the server use the following method to emit:

    client.emit('actionName' + (message && message.uuid || ''), data);

#### .onReady( handler() )

*handler()* function()

#### .onRemoteHangup( handler() )

*handler()* function()

#### RTC.getUserList( handler( clients) )

*handler()* function()

Additionaly you can generate a list of clientIDs currently in your room by calling:

    RTC.getUserList(function( clients ) {
        // do something with the list of clients
    });
For now this can only be done through long-polling. Feel free te create a pull-request to listen for changes.

### Examples

Listening for incoming calls and accepting them:

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
Again we'll use the mediacontraints as well as a clientID.

### Demo
The demo has been rewritten and will slowly gain additional features. While doing this RTC.js will be tested and developped further.

To get the demo working start app.js in your node server. Change the IP-address and port of the server in index.html. Hit your browser and load up index.html.

[I have put this demo online on my VPS.](http://178.21.20.114/RTC/) This demo will stay up to date with the git repo.

### Support
Chrome and Firefox 22+.