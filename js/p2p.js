var P2Pconfig = {
  'iceServers': [{
    'url': 'stun:23.21.150.121'
  }]
};
var P2Pconfig2 = {
  'optional': [{
    'DtlsSrtpKeyAgreement': true
  }]
};

var P2PClient = function () {
  this.conn = new RTCPeerConnection(P2Pconfig, P2Pconfig2);
  this.conn.onicecandidate = this.onicecandidate.bind(this);
  this.conn.onconnection = this.onconnection.bind(this);
  this.conn.onsignalingstatechange = this.onsignalingstatechange.bind(this);
  this.conn.oniceconnectionstatechange = this.oniceconnectionstatechange.bind(this);
  this.conn.onicegatheringstatechange = this.onicegatheringstatechange.bind(this);
  this.onmessage = null;
  this.dc1 = null
  this.tn1 = null;
  return this;
};

P2PClient.prototype.offer = function (offerReadyCallback) {
  console.log('called offer');
  this.conn.offerReadyCallback = offerReadyCallback;
  this.setupDC1();
  this.conn.createOffer(function (desc) {
    this.conn.setLocalDescription(desc, function () {}, function () {});
    console.log("created local offer", desc);
  }.bind(this), function () {
    console.warn("Couldn't create offer");
  }.bind(this));
};

P2PClient.prototype.answerRecieved = function (answer) {
  if (typeof answer === 'string') {
    answer = JSON.parse(answer);
  }
  var answerDesc = new RTCSessionDescription(answer);
  this.handleAnswer(answerDesc);
};

P2PClient.prototype.setupDC1 = function () {
  console.log('called setupDC1');
  try {
    this.dc1 = this.conn.createDataChannel('test', {
      reliable: true
    });
    console.log("Created datachannel");
    this.dc1.onopen = function (e) {
      console.log('data channel connect');
      $('#waitForConnection').modal('hide');
      $('#waitForConnection').remove();
    }
    this.dc1.onmessage = function (e) {
      if (typeof e.data === 'string' && e.data.charCodeAt(0) == 2) {
        // The first message we get from Firefox (but not Chrome)
        // is literal ASCII 2 and I don't understand why -- if we
        // leave it in, JSON.parse() will barf.
        return;
      }
      try {
        var data = JSON.parse(e.data);
        console.log(data);
        if (typeof this.onmessage === 'function') {
          this.onmessage(data);
        }
        writeToChatLog(data.message, "text-info");
        // Scroll chat text area to the bottom on new input.
        $('#chatlog').scrollTop($('#chatlog')[0].scrollHeight);
      } catch (err) {
        console.log(err);
      }
    };
  } catch (e) {
    console.warn("No data channel", e);
  }
}

P2PClient.prototype.onicecandidate = function (e) {
  console.log("ICE candidate", e);
  if (e.candidate == null) {
    console.log(JSON.stringify(this.conn.localDescription));
    if (typeof this.conn.offerReadyCallback === 'function') {
      console.log('Offer');
      this.conn.offerReadyCallback(JSON.stringify(this.conn.localDescription));
      this.conn.offerReadyCallback = null;
    }
    if (typeof this.conn.answerReadyCallback === 'function') {
      console.log('Answer');
      this.conn.answerReadyCallback(JSON.stringify(this.conn.localDescription));
      this.conn.answerReadyCallback = null;
    }
  }
};

P2PClient.prototype.onconnection = function () {
  console.log('called handleOnconnection');
  console.log("Datachannel connected");
  writeToChatLog("Datachannel connected", "text-success");
  $('#waitForConnection').modal('hide');
  // If we didn't call remove() here, there would be a race on pc2:
  //   - first onconnection() hides the dialog, then someone clicks
  //     on answerSentBtn which shows it, and it stays shown forever.
  $('#waitForConnection').remove();
  $('#showLocalAnswer').modal('hide');
  $('#messageTextBox').focus();
};

P2PClient.prototype.sendMessage = function () {
  console.log('called sendMessage');
  if ($('#messageTextBox').val()) {
    var channel = new RTCMultiSession();
    writeToChatLog($('#messageTextBox').val(), "text-success");
    channel.send({
      message: $('#messageTextBox').val()
    });
    $('#messageTextBox').val("");

    // Scroll chat text area to the bottom on new input.
    $('#chatlog').scrollTop($('#chatlog')[0].scrollHeight);
  }

  return false;
};

P2PClient.prototype.onsignalingstatechange = function (state) {
  console.log('called onsignalingstatechange');
  console.info('signaling state change:', state);
}

P2PClient.prototype.oniceconnectionstatechange = function (state) {
  console.log('called oniceconnectionstatechange');
  console.info('ice connection state change:', state);
}

P2PClient.prototype.onicegatheringstatechange = function (state) {
  console.log('called onicegatheringstatechange');
  console.info('ice gathering state change:', state);
}

P2PClient.prototype.handleAnswer = function (answerDesc) {
  console.log('called handleAnswerFromPC2');
  console.log("Received remote answer: ", answerDesc);
  writeToChatLog("Received remote answer", "text-success");
  this.conn.setRemoteDescription(answerDesc);
}

P2PClient.prototype.handleOffer = function (offer) {
  console.log('called handleOffer');
  if (typeof offer === 'string') {
    offer = JSON.parse(offer);
  }
  var offerDesc = new RTCSessionDescription(offer);
  this.conn.setRemoteDescription(offerDesc);
  console.log(offerDesc);
  this.conn.createAnswer(function (answerDesc) {
    writeToChatLog("Created local answer", "text-success");
    console.log("Created local answer: ", answerDesc);
    this.conn.setLocalDescription(answerDesc);
  }.bind(this), function (err) {
    console.warn("No create answer", err);
  }.bind(this));
}

function handleCandidateFromPC2(iceCandidate) {
  console.log('called handleCandidateFromPC2');
  this.conn.addIceCandidate(iceCandidate);
}

function getTimestamp() {
  var totalSec = new Date().getTime() / 1000;
  var hours = parseInt(totalSec / 3600) % 24;
  var minutes = parseInt(totalSec / 60) % 60;
  var seconds = parseInt(totalSec % 60);

  var result = (hours < 10 ? "0" + hours : hours) + ":" +
    (minutes < 10 ? "0" + minutes : minutes) + ":" +
    (seconds < 10 ? "0" + seconds : seconds);

  return result;
}

function writeToChatLog(message, message_type) {
  document.getElementById('chatlog').innerHTML += '<p class=\"' + message_type + '\">' + "[" + getTimestamp() + "] " + message + '</p>';
}

// TESTING
var t = document.getElementById('data');
var test_caller = new P2PClient();
var test_receiver = new P2PClient();
test_caller.offer(function (offer) {
  t.value = offer;
  test_receiver.handleOffer(offer, function (answer) {
    t.value = answer;
    test_caller.answerRecieved(answer);
  });
});
