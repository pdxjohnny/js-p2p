var p2p = require('wrtc-p2p');

var have = 0;
var needed = 2;
var test_caller = new p2p.Client();
var test_receiver = new p2p.Client();

var checkNeeded = function () {
  have++;
  console.log(have, 'responses recived');
  if (have >= needed) {
    console.log('Got all responses, test complete');
    process.exit(0);
  }
};

test_caller.onmessage = function (data) {
  console.log('test_caller:    ', data);
  checkNeeded();
};
test_receiver.onmessage = function (data) {
  console.log('test_receiver:  ', data);
  checkNeeded();
};

console.log('Creating offer');
test_caller.offer(function (offer) {
  console.log('Offer created');
  // Offer is sent to the receiver
  console.log(offer);
  console.log('Creating answer');
  // The receiver creates an answer for the offerer
  test_receiver.handleOffer(offer, function (answer) {
    console.log('Created answer');
    console.log(answer);
    // The offerer gets the receivers answer
    test_caller.answerRecieved(answer);
    test_caller.onconnect = function () {
      console.log('Caller connected');
      test_caller.send({
        'message': 'hello from caller'
      });
    };
    test_receiver.onconnect = function () {
      console.log('Receiver connected');
      test_receiver.send({
        'message': 'hello from receiver'
      });
    };
  });
});
