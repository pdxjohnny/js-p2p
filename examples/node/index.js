var util = require('util');
var p2p = require('wrtc-p2p');
var readlineSync = require('readline-sync');

var main = function () {
  var action = '';
  if (process.argv.length > 2) {
    var action = process.argv[2];
  }

  switch (action) {
    case 'join':
      joinChat();
      break;
    case 'create':
      createChat();
      break;
    default:
      console.log('Usage: %s (create or join)', process.argv[1]);
      process.exit();
  }
};

var createClient = function () {
  var client = new p2p.Client();

  client.onmessage = function (data) {
    console.log('them:  '+ data.message);
  };

  return client;
};

var stdinChat = function (client) {
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', function (text) {
    // Remove the newline
    text = text.slice(0, -1);
    if (text === 'exit') {
      process.exit();
    }
    client.send({
      'message': text
    });
  });
};

var joinChat = function () {
  var client = createClient();

  // The receiver get an offer for the offerer
  // Here the receiver is inputing the offer
  var offer = readlineSync.question('Input offer: ', {
    hideEchoBack: false // The typed text on screen is hidden by `*` (default).
  });
  console.log('');
  console.log('Creating answer...');
  client.handleOffer(offer, function (answer) {
    console.log('Created answer, send this back to the offerer');
    console.log(answer);
    console.log('');
    console.log('Connecting...');
    client.onconnect = function () {
      console.log('Connected');
      console.log('');
      stdinChat(client);
    };
  });
};

var createChat = function () {
  var client = createClient();

  console.log('Creating offer...');
  client.offer(function (offer) {
    console.log('Offer created, send it to who you want to chat with');
    // Offer is sent to the receiver
    console.log(offer);
    console.log('');
    // The receiver creates an answer for the offerer
    // Here the offerer is inputing the awnser
    var answer = readlineSync.question('Input answer: ');
    console.log('');
    // The offerer gets the receivers answer
    console.log('Connecting...');
    client.answerRecieved(answer);
    client.onconnect = function () {
      console.log('Connected');
      console.log('');
      stdinChat(client);
    };
  });
};

main();
