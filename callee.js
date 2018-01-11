'use strict';

function trace(arg) {
    var now = (window.performance.now() / 1000).toFixed(3);
    console.log(now + ': ', arg);
}

// UI Element Value
var vid1 = document.querySelector('#vid1');
var vid2 = document.querySelector('#vid2');
var btn_start = document.querySelector('#btn_start');
var roomId = document.querySelector('#room_id');

// nickname 수정 기능 추가
var btn_change_nickname = document.querySelector('#btn_change_nickname'); 
var nickname = document.querySelector('#nickname');
var caller_nickname = document.querySelector('#caller_nickname');

btn_change_nickname.addEventListener('click',changeNewNickname);

btn_start.addEventListener('click', onStart);
// ---------------------------------------------------------------------------------
// Value
var local_peer = null;
var localstream = null;
var SIGNAL_SERVER_HTTP_URL = 'http://localhost:3001';
var SIGNAL_SERVER_WS_URL = 'ws://localhost:3001';
// ---------------------------------------------------------------------------------
function cbGotStream(stream) {
    trace('Received local stream');
    vid1.srcObject = stream;
    localstream = stream;
}

navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true
    })
    .then(cbGotStream)
    .catch(function (e) {
        alert('getUserMedia() error: ' + e);
    });

function cbGotRemoteStream(evt) {
    trace('## Received remote stream try');
    if (vid2.srcObject !== evt.streams[0]) {
        vid2.srcObject = evt.streams[0];
        trace('## Received remote stream success');
    }
}

// tgt.send(JSON.stringify({ code: code, msg: message}));  // 객체 -> string 전송
// send(JSON.stringify(code : '88' ,)
function onWsMessage(messageEvt) {
    console.info(messageEvt);

    var obj = JSON.parse(messageEvt.data);  // string-> 객체 obj code msg
    if (obj.code == '99') {
        alert(obj.msg);
    }
    else if (obj.code == '01') {
        // start
        console.info('start in onWsMessage');
        //onOffer();
    }
    else if (obj.code == '00') {   // room name

        console.info("obj.code ==00");
        try {
            // 새로운 nickname 데이터를 받았을 때
            // 전송타입
            // JSON.stringify({code:'00', msg : {type:'88', data : nickname.value} }
            var obj2 = JSON.parse(obj.msg); // string -> 객체

            if (obj2.type == '88') {
                // start버튼 누른거인데도 여기에 들어와 !! 여기에 들어오면 안되는데
                //console.info({ room: room_name }, "new room created");
                console.log('obj.code가 88인지 확인');
                console.log(obj2.type);
                alert('88');
                caller_nickname.value = obj2.data; // 상대방 닉네임 변경
            }
            else{
                receiveOffer(obj.msg);
                console.log('obj.code가 88인지 확인 - receiveOffer실행됨');
            }
        } catch (error) {
        }
    }    
    else {
        alert('unknown error in onWsMessage');
    }    
}

function onStart() {
    var url = SIGNAL_SERVER_WS_URL + '/room/' + roomId.valuee;
    g_mc_ws_component.connect(url, onWsMessage);

    var cfg = {
        iceTransportPolicy: "all", // set to "relay" to force TURN.
        iceServers: [
        ]
    };
    // cfg.iceServers.push({urls: "stun:stun.l.google.com:19302"});

    local_peer = new RTCPeerConnection(cfg);    
    local_peer.onicecandidate = function (evt) {
        cbIceCandidate(local_peer, evt);
    };
    local_peer.ontrack = cbGotRemoteStream;

    localstream.getTracks().forEach(function (track) {
            local_peer.addTrack(
                track,
                localstream
            );
        }
    );

    trace('## start success = create RTCPeerConnection and set callback ');
}

function onAnswer() {
    createAnswer();
    trace('## createAnswer success');
}

function cbCreateAnswerError(error) {
    trace('Failed to set createAnswer: ' + error.toString());
    stop();
}

function cbSetLocalDescriptionSuccess() {
    trace('localDescription success.');
}

function cbSetLocalDescriptionError(error) {
    trace('Failed to set setLocalDescription: ' + error.toString());
    stop();
}

function cbCreateProvisionalAnswerDescription(desc) {
    console.log('cbCreateProvisionalAnswerDescription');
    // Provisional answer, set a=inactive & set sdp type to pranswer.
    desc.sdp = desc.sdp.replace(/a=recvonly/g, 'a=inactive');
    desc.type = 'answer';
    local_peer.setLocalDescription(desc).then(
        cbSetLocalDescriptionSuccess,
        cbSetLocalDescriptionError
    );
}

function cbSetRemoteDescriptionSuccess() {
    trace('cbSetRemoteDescriptionSuccess success.');
    onAnswer();
}

function cbSetRemoteDescriptionError() {
    trace('cbSetRemoteDescriptionError.');
}

function receiveOffer(sdpString) {
    console.info(sdpString);

    var descObject = {
        type: 'offer',
        sdp: sdpString
    };
    local_peer.setRemoteDescription(descObject).then(
        cbSetRemoteDescriptionSuccess,
        cbSetRemoteDescriptionError,
    );    
}

function createAnswer() {
    local_peer.createAnswer().then(
        cbCreateProvisionalAnswerDescription,
        cbCreateAnswerError
    );
}

function stop() {
    trace('Ending Call' + '\n\n');
    local_peer.close();
    local_peer = null;
}

function cbIceCandidate(pc, event) {
    if (event.candidate)
        onCheckIceCandidateAdded(event.candidate);
    else
        onCheckIceCandidateCompleted(pc.localDescription);
}
function onCheckIceCandidateAdded(candidateObject) {
    trace('cbCheckIceCandidateAdded');
    // ICE candidate 가 추가되면 바로바로 연결 시도를 해 볼 수 있다. 
    // 이 예제는 추가가 완료되면 sdp 를 출력하기 때문에 여기서 아무것도 하지 않는다.
}

function onCheckIceCandidateCompleted(descObject) {
    trace('onCheckIceCandidateCompleted');
    g_mc_ws_component.sendMessage(descObject.sdp);
}

// 내 닉네임 바꿈 -> 상대방에게 전송
function changeNewNickname(){
    console.info(nickname.value);
    
    //g_mc_ws_component.sendMessage(JSON.stringify({code:'00', msg : {type:'88', data : nickname.value} }) );
    g_mc_ws_component.sendMessage(JSON.stringify({code:'88', msg : nickname.value} ));
}

// 상대방이 닉네임 바꿈 ->데이터 받음-> 내 화면에서 수정해주기
// onWsMessage함수에서 데이터 받자마자 화면에 수정 바로 해줘서 필요없는 것 같음
function getNewNickname(){

}

var app = new Vue({
    el: '#app',
    data: {
        rooms : [
        ]
    },
    methods: {
      onClickRoom : function (id) {
        window.roomId.value = id;
      },
      onUpdateRoomList : function(event) {
          this.$http.get(SIGNAL_SERVER_HTTP_URL + '/roomlist').then(response => {
            this.rooms = response.body;
          }, response => {
            alert(response);
          });          
        }
    }
  })
