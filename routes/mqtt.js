import mqtt from 'mqtt';
import crypto from 'crypto';
import axios from 'axios';
import fs from 'fs';

// --- 1. 접속 정보 설정 ---

// ❗️ API 응답에서 받은 'endpointAddress'
const MQTT_HOST = process.env.MQTT_HOST;

// ❗️ API 응답에서 받은 'subscriptions'
const TOPIC_TO_PUSH = process.env.SUB_PUSH;
const TOPIC_TO_INBOX = process.env.SUB_INBOX;

// 가전 목록 탐색 응답 (스마트홈 규격상 기기가 최소 1개 등록되어 있어야 서비스가 활성화됨)
function DiscoverAppliancesResponse(req, res) {
	let messageId = req.body.header.messageId;
	let resultObject = {
    header: {
        messageId: messageId,
        name: "DiscoverAppliancesResponse",
        namespace: "ClovaHome",
        payloadVersion: "1.0"
    },
    payload: {
      discoveredAppliances: [
          {
              applianceId: "dry-001",
              manufacturerName: "제조사",
              modelName: "dry",
              friendlyName: "의류건조기",
              version: "1.0.0",
              isIr: false,
              actions: ["HealthCheck"],
              applianceTypes: ["CLOTHESDRYER"]
          },
          {
              applianceId: "laundry-001",
              manufacturerName: "제조사",
              modelName: "laundry",
              friendlyName: "세탁기",
              version: "1.0.0",
              isIr: false,
              actions: ["HealthCheck"],
              applianceTypes: ["CLOTHESWASHER"]
          },
          {
              applianceId: "aircon-001",
              manufacturerName: "제조사",
              modelName: "aircon",
              friendlyName: "에어컨",
              version: "1.0.0",
              isIr: false,
              actions: ["TurnOn"],
              applianceTypes: ["AIRCONDITIONER"]
          }
      ]
    }
  };

	res.send(resultObject);
}

// 에어컨 켜기
async function TurnOnResponse(req, res) {
	let messageId = req.body.header.messageId;
	let resultObject = {
    header: {
        messageId: messageId,
        name: "TurnOnConfirmation",
        namespace: "ClovaHome",
        payloadVersion: "1.0"
    },
    payload: {}
  };
  const url = `https://api-kic.lgthinq.com/devices/${process.env.AIR_CON_DEVICE_ID}/control`;
  const body = {
    "operation": {
      "airConOperationMode": "POWER_ON"
    }
  };
  const header = {
    headers: {
      'Authorization': `Bearer ${process.env.LG_THINQ_PAT}`,
      'x-message-id': crypto.randomUUID(),
      'x-country': 'KR',
      'x-client-id': process.env.CLIENT_ID,
      'x-api-key': "v6GFvkweNo7DK7yD3ylIZ9w52aKBU0eJ7wLXkSR3",
      'x-conditional-control': "false"
    }
  };

  const response = await axios.post(url, body, header);
	res.send(resultObject);
}

// mqtt 접속
function connect() {
  // --- 2. MQTT 연결 옵션 설정 ---
  const options = {
    clientId: process.env.CLIENT_ID,
    host: MQTT_HOST,
    port: 8883,
    protocol: 'mqtts',
    
    // 3개의 인증 파일
    key: fs.readFileSync('./my-client.key'),
    cert: fs.readFileSync('./lg-client.crt'),
    ca: fs.readFileSync('./AmazonRootCA1.pem')    
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
      let applianceId = "dry-001";
      switch(data.pushCode){
        case "WASHING_IS_COMPLETE":
          // 세탁기 완료
          applianceId = "laundry-001";
          msgType = process.env.FINISH_MSG;
          break;
        case "ERROR_DURING_WASHING":
          // 세탁기 오류
          applianceId = "laundry-001";
          msgType = process.env.ERROR_MSG;
          break;     
        case "DRYING_IS_COMPLETE":
          // 건조기 완료
          applianceId = "dry-001";
          msgType = process.env.FINISH_MSG;
          break;         
        case "DRYING_FAILED":
          // 건조기 오류
          applianceId = "dry-001";
          msgType = process.env.ERROR_MSG;
          break;   
        case "TIME_TO_CLEAN_FILTER":
          // 스틱청소기 필터 교체
          msgType = process.env.CLEANER_MSG;
          break;
        case "WATER_IS_FULL":
          // 에어컨 물이 가득 찼음
          msgType = process.env.CONDITIONER_MSG;
          break;     
        default:
          console.warn('알 수 없는 pushCode:', data.pushCode);    
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
          'applianceId': applianceId,
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

export { DiscoverAppliancesResponse, TurnOnResponse, connect };
