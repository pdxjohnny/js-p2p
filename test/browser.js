var getTimestamp = function () {
  var totalSec = new Date().getTime() / 1000;
  var hours = parseInt(totalSec / 3600) % 24;
  var minutes = parseInt(totalSec / 60) % 60;
  var seconds = parseInt(totalSec % 60);

  var result = (hours < 10 ? '0' + hours : hours) + ':' +
    (minutes < 10 ? '0' + minutes : minutes) + ':' +
    (seconds < 10 ? '0' + seconds : seconds);

  return result;
}

var writeToChatLog = function (message, message_type) {
  document.getElementById('chatlog').innerHTML += '<p class=\'' + message_type + '\'>' + '[' + getTimestamp() + '] ' + message + '</p>';
}

var printMessage = function (data) {
  writeToChatLog(data.message, 'text-info');
};

var t = document.getElementById('data');
var test_caller = new P2PClient();
var test_receiver = new P2PClient();

test_caller.onmessage = printMessage;
test_receiver.onmessage = printMessage;

writeToChatLog('Creating offer', 'text-info');
test_caller.offer(function (offer) {
  writeToChatLog('Offer created', 'text-info');
  // Offer is sent to the receiver
  t.value = offer;
  writeToChatLog('Creating answer', 'text-info');
  // The receiver creates an answer for the offerer
  test_receiver.handleOffer(offer, function (answer) {
    writeToChatLog('Created answer', 'text-info');
    t.value = answer;
    // The offerer gets the receivers answer
    test_caller.answerRecieved(answer);
    test_caller.onconnect = function () {
      writeToChatLog('Caller connected', 'text-info');
      test_caller.send({
        'message': 'hello from caller'
      });
    };
    test_receiver.onconnect = function () {
      writeToChatLog('Receiver connected', 'text-info');
      test_receiver.send({
        'message': 'hello from receiver'
      });
    };
  });
});
