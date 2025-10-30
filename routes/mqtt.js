const mqtt = require('mqtt');
const axios = require('axios');

require('dotenv').config();

// --- 1. 접속 정보 설정 ---

// ❗️ API 응답에서 받은 'endpointAddress'
const MQTT_HOST = process.env.MQTT_HOST;

// ❗️ API 응답에서 받은 'subscriptions'
const TOPIC_TO_PUSH = process.env.SUB_PUSH;
const TOPIC_TO_INBOX = process.env.SUB_INBOX;

// mqtt 접속
function connect() {
  // --- 2. MQTT 연결 옵션 설정 ---
  const options = {
    clientId: process.env.CLIENT_ID,
    host: MQTT_HOST,
    port: 8883,
    protocol: 'mqtts',
    
    // 3개의 인증 파일
    key: process.env.KEY,
    cert: process.env.CERT,
    ca: process.env.CA,
  };

  // --- 3. MQTT 서버 접속 ---
  console.log('MQTT 서버에 접속을 시도합니다...');
  const client = mqtt.connect(options);

  // --- 4. 이벤트 핸들러 설정 ---

  // 접속 성공 시
  client.on('connect', () => {
    console.log('✅ MQTT 서버에 성공적으로 접속되었습니다.');
    
    // ❗️ 'subscriptions' 토픽을 구독합니다. (push + inbox)
    client.subscribe(TOPIC_TO_PUSH, (err) => {
      if (!err) {
        console.log(`구독 시작: ${TOPIC_TO_PUSH}`);
      } else {
        console.error('구독 실패:', err);
      }
    });
    client.subscribe(TOPIC_TO_INBOX, (err) => {
      if (!err) {
        console.log(`구독 시작: ${TOPIC_TO_INBOX}`);
      } else {
        console.error('구독 실패:', err);
      }
    });
  });

  // ⭐️ 메시지(디바이스 알림) 수신 시
  client.on('message', async(topic, payload) => {
    const message = payload.toString();
    console.log(`\n📬 디바이스 알림 수신! [토픽: ${topic}]`);
    console.log('내용:', message);
    
    try {
      const data = JSON.parse(message);      
      const url = 'https://apis.naver.com/clovahome/clova-platform/sendNotification'
      let msgType = "";
      if(data.push.pushCode === "WASHING_IS_COMPLETE"){
        // 세탁기 완료
        msgType = process.env.LAUNDRY_MSG
      }
      else if(data.push.pushCode === "DRYING_IS_COMPLETE"){
        // 건조기 완료
        msgType = process.env.DRY_MSG
      }
      if(msgType.length > 0){
        // 클로바에게 메시지 전달
        const header = {
          headers: {
            'X-Clova-Extension-Id': process.env.CLOVA_ID,
            'X-Clova-Extension-Secret': process.env.CLOVA_SECRET,
          }
        }
        const body = {
          'applianceId': 'device-001',
          'messageId': msgType
        }
        await axios.post(url, body, header);
      }
    } catch (e) {
      console.warn('clova req error:', e.message);
    }
  });

  // 오류 발생 시
  client.on('error', (err) => {
    console.error('❌ MQTT 오류:', err);
  });

  // 연결 종료 시
  client.on('close', () => {
    console.log('🔌 MQTT 연결이 끊어졌습니다.');
  });  
  // return client;
}

module.exports = { connect };
