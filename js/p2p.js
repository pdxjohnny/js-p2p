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
  this.conn.ondatachannel = this.setupdatachannel.bind(this);
  this.conn.onicecandidate = this.onicecandidate.bind(this);
  this.conn.onconnection = this.onconnection.bind(this);
  this.conn.onsignalingstatechange = this.onsignalingstatechange.bind(this);
  this.conn.oniceconnectionstatechange = this.oniceconnectionstatechange.bind(this);
  this.conn.onicegatheringstatechange = this.onicegatheringstatechange.bind(this);
  this.onmessage = null;
  this.datachannel = null
  this.tn1 = null;
  return this;
};

P2PClient.prototype.offer = function (offerReadyCallback) {
  this.datachannel = this.conn.createDataChannel('main', {
    reliable: true
  });
  this.setupdatachannel();
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

P2PClient.prototype.setupdatachannel = function (event) {
  if (typeof event === 'object') {
    this.datachannel = event.channel || event;
  }
  try {
    this.datachannel.onopen = function (e) {
      if (typeof this.onconnect === 'function') {
        this.onconnect(data);
      }
    }.bind(this);
    this.datachannel.onmessage = function (e) {
      if (typeof e.data === 'string' && e.data.charCodeAt(0) == 2) {
        // The first message we get from Firefox (but not Chrome)
        // is start of text (ascii 2) the user does not want this
        return;
      }
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
};

P2PClient.prototype.onicecandidate = function (e) {
  if (e.candidate == null) {
    if (typeof this.conn.offerReadyCallback === 'function') {
      this.conn.offerReadyCallback(JSON.stringify(this.conn.localDescription));
      this.conn.offerReadyCallback = null;
    }
    if (typeof this.conn.answerReadyCallback === 'function') {
      this.conn.answerReadyCallback(JSON.stringify(this.conn.localDescription));
      this.conn.answerReadyCallback = null;
    }
  }
};

P2PClient.prototype.onconnection = function () {};

P2PClient.prototype.send = function (message) {
  message = JSON.stringify(message);
  return this.datachannel.send(message);
};

P2PClient.prototype.onsignalingstatechange = function (state) {};

P2PClient.prototype.oniceconnectionstatechange = function (state) {};

P2PClient.prototype.onicegatheringstatechange = function (state) {};

P2PClient.prototype.handleAnswer = function (answerDesc) {
  this.conn.setRemoteDescription(answerDesc);
};

P2PClient.prototype.handleOffer = function (offer, answerReadyCallback) {
  this.conn.answerReadyCallback = answerReadyCallback;
  if (typeof offer === 'string') {
    offer = JSON.parse(offer);
  }
  var offerDesc = new RTCSessionDescription(offer);
  this.conn.setRemoteDescription(offerDesc, function () {
    this.conn.createAnswer(function (answerDesc) {
      this.conn.setLocalDescription(answerDesc);
    }.bind(this), function (err) {
      console.warn("No create answer", err);
    }.bind(this));
  }.bind(this));
};
