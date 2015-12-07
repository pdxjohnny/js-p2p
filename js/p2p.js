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
  this.conn.ondatachannel = this.setupDC1.bind(this);
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
  this.dc1 = this.conn.createDataChannel('test', {
    reliable: true
  });
  this.setupDC1();
  this.conn.offerReadyCallback = offerReadyCallback;
  this.conn.createOffer(function (desc) {
    this.conn.setLocalDescription(desc, function () {});
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

P2PClient.prototype.setupDC1 = function (event) {
  if (typeof event === 'object') {
    this.dc1 = event.channel || event;
  }
  try {
    console.log("Created datachannel");
    this.dc1.onopen = function (e) {
      console.log('data channel connect', e);
      if (typeof this.onconnect === 'function') {
        this.onconnect(data);
      }
    }.bind(this);
    this.dc1.onmessage = function (e) {
      console.log(e.data);
      if (typeof e.data === 'string' && e.data.charCodeAt(0) == 2) {
        // The first message we get from Firefox (but not Chrome)
        // is literal ASCII 2 and I don't understand why -- if we
        // leave it in, JSON.parse() will barf.
        return;
      }
      console.log(this);
      try {
        var data = JSON.parse(e.data);
        if (typeof this.onmessage === 'function') {
          this.onmessage(data);
        }
      } catch (err) {
        if (typeof this.onmessage === 'function') {
          this.onmessage(e.data);
        }
      }
    }.bind(this);
  } catch (err) {
    console.warn("No data channel", err);
  }
}

P2PClient.prototype.onicecandidate = function (e) {
  console.log("ICE candidate", e);
  if (e.candidate == null) {
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
  writeToChatLog("Datachannel connected", "text-success");
};

P2PClient.prototype.send = function (message) {
  message = JSON.stringify(message);
  return this.dc1.send(message);
};

P2PClient.prototype.onsignalingstatechange = function (state) {}

P2PClient.prototype.oniceconnectionstatechange = function (state) {}

P2PClient.prototype.onicegatheringstatechange = function (state) {}

P2PClient.prototype.handleAnswer = function (answerDesc) {
  writeToChatLog("Received remote answer", "text-success");
  this.conn.setRemoteDescription(answerDesc);
}

P2PClient.prototype.handleOffer = function (offer, answerReadyCallback) {
  this.conn.answerReadyCallback = answerReadyCallback;
  if (typeof offer === 'string') {
    offer = JSON.parse(offer);
  }
  var offerDesc = new RTCSessionDescription(offer);
  this.conn.setRemoteDescription(offerDesc, function () {
    this.conn.createAnswer(function (answerDesc) {
      writeToChatLog("Created local answer", "text-success");
      this.conn.setLocalDescription(answerDesc);
    }.bind(this), function (err) {
      console.warn("No create answer", err);
    }.bind(this));
  }.bind(this));
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


var printMessage = function (data) {
  writeToChatLog(data.message, "text-info");
};

test_caller.onmessage = printMessage;
test_receiver.onmessage = printMessage;

test_caller.offer(function (offer) {
  t.value = offer;
  test_receiver.handleOffer(offer, function (answer) {
    t.value = answer;
    test_caller.answerRecieved(answer);
    test_caller.onconnect = function () {
      console.log('caller connected');
      test_caller.send({
        'message': 'hello from caller'
      });
    };
    test_receiver.onconnect = function () {
      console.log('receiver connected');
      test_receiver.send({
        'message': 'hello from receiver'
      });
    };
  });
});
