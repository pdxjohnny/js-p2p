/* See also:
    http://www.html5rocks.com/en/tutorials/webrtc/basics/
    https://code.google.com/p/webrtc-samples/source/browse/trunk/apprtc/index.html

    https://webrtc-demos.appspot.com/html/pc1.html
*/

var cfg = {"iceServers":[{"url":"stun:23.21.150.121"}]},
    con = { 'optional': [{'DtlsSrtpKeyAgreement': true}] };

/* THIS IS ALICE, THE CALLER/SENDER */

var pc1 = new RTCPeerConnection(cfg, con),
    dc1 = null, tn1 = null;

// Since the same JS file contains code for both sides of the connection,
// activedc tracks which of the two possible datachannel variables we're using.
var activedc;

var pc1icedone = false;

var PeerCaller = function () {
  return this;
};

PeerCaller.prototype.createLocalOffer = function (offerReadyCallback) {
  console.log('called createLocalOffer');
    pc1.offerReadyCallback = offerReadyCallback;
    setupDC1();
    pc1.createOffer(function (desc) {
        pc1.setLocalDescription(desc, function () {}, function () {});
        console.log("created local offer", desc);
    }, function () {console.warn("Couldn't create offer");});
};

PeerCaller.prototype.answerRecieved = function (answer) {
  var answerDesc = new RTCSessionDescription(JSON.parse(answer));
  handleAnswerFromPC2(answerDesc);
};

// TESTING
var t = document.getElementById('data');
var test_caller = new PeerCaller();
test_caller.createLocalOffer(function (offer) {
  t.value = JSON.stringify(offer);
  handleOfferFromPC1(JSON.stringify(offer), function (answer) {
    test_caller.answerRecieved(JSON.stringify(answer));
  });
});

// $('#offerRecdBtn').click(function() {
//     var offer = $('#remoteOffer').val();
//     var offerDesc = new RTCSessionDescription(JSON.parse(offer));
//     console.log("Received remote offer", offerDesc);
//     writeToChatLog("Received remote offer", "text-success");
//     handleOfferFromPC1(offerDesc);
//     $('#showLocalAnswer').modal('show');
// });
//
// $('#answerSentBtn').click(function() {
//     $('#waitForConnection').modal('show');
// });

function fileSent(file) {
  console.log('called fileSent');
    console.log(file + " sent");
}

function fileProgress(file) {
  console.log('called fileProgress');
    console.log(file + " progress");
}

function sendFile(data) {
  console.log('called sendFile');
    if (data.size) {
        FileSender.send({
          file: data,
          onFileSent: fileSent,
          onFileProgress: fileProgress,
        });
    }
}

function sendMessage() {
  console.log('called sendMessage');
    if ($('#messageTextBox').val()) {
        var channel = new RTCMultiSession();
        writeToChatLog($('#messageTextBox').val(), "text-success");
        channel.send({message: $('#messageTextBox').val()});
        $('#messageTextBox').val("");

        // Scroll chat text area to the bottom on new input.
        $('#chatlog').scrollTop($('#chatlog')[0].scrollHeight);
    }

    return false;
};

function setupDC1() {
  console.log('called setupDC1');
    try {
        var fileReceiver1 = new FileReceiver();
        dc1 = pc1.createDataChannel('test', {reliable:true});
        activedc = dc1;
        console.log("Created datachannel (pc1)");
        dc1.onopen = function (e) {
            console.log('data channel connect');
            $('#waitForConnection').modal('hide');
            $('#waitForConnection').remove();
        }
        dc1.onmessage = function (e) {
            console.log("Got message (pc1)", e.data);
            if (e.data.size) {
                fileReceiver1.receive(e.data, {});
            }
            else {
                if (e.data.charCodeAt(0) == 2) {
                   // The first message we get from Firefox (but not Chrome)
                   // is literal ASCII 2 and I don't understand why -- if we
                   // leave it in, JSON.parse() will barf.
                   return;
                }
                console.log(e);
                var data = JSON.parse(e.data);
                if (data.type === 'file') {
                    fileReceiver1.receive(e.data, {});
                }
                else {
                    writeToChatLog(data.message, "text-info");
                    // Scroll chat text area to the bottom on new input.
                    $('#chatlog').scrollTop($('#chatlog')[0].scrollHeight);
                }
            }
        };
    } catch (e) { console.warn("No data channel (pc1)", e); }
}

pc1.onicecandidate = function (e) {
  console.log("ICE candidate (pc1)", e);
  if (e.candidate == null) {
    console.log('Offer');
    console.log(JSON.stringify(pc1.localDescription));
    if (typeof pc1.offerReadyCallback === 'function') {
      pc1.offerReadyCallback(pc1.localDescription);
    }
  }
};

function handleOnconnection() {
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
}

pc1.onconnection = handleOnconnection;

function onsignalingstatechange(state) {
  console.log('called onsignalingstatechange');
    console.info('signaling state change:', state);
}

function oniceconnectionstatechange(state) {
  console.log('called oniceconnectionstatechange');
    console.info('ice connection state change:', state);
}

function onicegatheringstatechange(state) {
  console.log('called onicegatheringstatechange');
    console.info('ice gathering state change:', state);
}

pc1.onsignalingstatechange = onsignalingstatechange;
pc1.oniceconnectionstatechange = oniceconnectionstatechange;
pc1.onicegatheringstatechange = onicegatheringstatechange;

function handleAnswerFromPC2(answerDesc) {
  console.log('called handleAnswerFromPC2');
    console.log("Received remote answer: ", answerDesc);
    writeToChatLog("Received remote answer", "text-success");
    pc1.setRemoteDescription(answerDesc);
}

function handleCandidateFromPC2(iceCandidate) {
  console.log('called handleCandidateFromPC2');
    pc1.addIceCandidate(iceCandidate);
}


/* THIS IS BOB, THE ANSWERER/RECEIVER */

var pc2 = new RTCPeerConnection(cfg, con),
    dc2 = null;

var pc2icedone = false;

pc2.ondatachannel = function (e) {
    var fileReceiver2 = new FileReceiver();
    var datachannel = e.channel || e; // Chrome sends event, FF sends raw channel
    console.log("Received datachannel (pc2)", arguments);
    dc2 = datachannel;
    activedc = dc2;
    dc2.onopen = function (e) {
        console.log('data channel connect');
        $('#waitForConnection').modal('hide');
        $('#waitForConnection').remove();
    }
    dc2.onmessage = function (e) {
        console.log("Got message (pc2)", e.data);
        if (e.data.size) {
            fileReceiver2.receive(e.data, {});
        }
        else {
            var data = JSON.parse(e.data);
            if (data.type === 'file') {
                fileReceiver2.receive(e.data, {});
            }
            else {
                writeToChatLog(data.message, "text-info");
                // Scroll chat text area to the bottom on new input.
                $('#chatlog').scrollTop($('#chatlog')[0].scrollHeight);
            }
        }
    };
};

function handleOfferFromPC1(offer, answerReadyCallback) {
  console.log('called handleOfferFromPC1');
    pc2.answerReadyCallback = answerReadyCallback;
    var offerDesc = new RTCSessionDescription(JSON.parse(offer));
    pc2.setRemoteDescription(offerDesc);
    pc2.createAnswer(function (answerDesc) {
        writeToChatLog("Created local answer", "text-success");
        console.log("Created local answer: ", answerDesc);
        pc2.setLocalDescription(answerDesc);
    }, function () { console.warn("No create answer"); });
}

pc2.onicecandidate = function (e) {
    console.log("ICE candidate (pc2)", e);
    if (e.candidate == null){
      $('#localAnswer').html(JSON.stringify(pc2.localDescription));
      if (typeof pc2.answerReadyCallback === 'function') {
        pc2.answerReadyCallback(pc2.localDescription);
      }
    }
};

pc2.onsignalingstatechange = onsignalingstatechange;
pc2.oniceconnectionstatechange = oniceconnectionstatechange;
pc2.onicegatheringstatechange = onicegatheringstatechange;

function handleCandidateFromPC1(iceCandidate) {
  console.log('called handleCandidateFromPC1');
    pc2.addIceCandidate(iceCandidate);
}

pc2.onaddstream = function (e) {
    console.log("Got remote stream", e);
    var el = new Audio();
    el.autoplay = true;
    attachMediaStream(el, e.stream);
};

pc2.onconnection = handleOnconnection;

function getTimestamp() {
  console.log('called getTimestamp');
    var totalSec = new Date().getTime() / 1000;
    var hours = parseInt(totalSec / 3600) % 24;
    var minutes = parseInt(totalSec / 60) % 60;
    var seconds = parseInt(totalSec % 60);

    var result = (hours < 10 ? "0" + hours : hours) + ":" +
                 (minutes < 10 ? "0" + minutes : minutes) + ":" +
                 (seconds  < 10 ? "0" + seconds : seconds);

    return result;
}

function writeToChatLog(message, message_type) {
  console.log('called writeToChatLog');
    document.getElementById('chatlog').innerHTML += '<p class=\"' + message_type + '\">' + "[" + getTimestamp() + "] " + message + '</p>';
}
