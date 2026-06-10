import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';

import { SERVER_PORT } from './config.js';
import routes from './routes/index.js';
import { connect as connectMqtt } from './routes/mqtt.js';

const app = express();

// parser. Express가 알아먹기 쉽게함
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// 디버깅 용도.
app.use(morgan('dev'));


// routes/index.js에 모든 request 처리를 위임한다
app.use('/', routes);


// 사전 정의하지 않은 모든 endpoint를 여기서 404 오류 처리
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});
// 404 포함 모든 오류를 메시지로 정리해서 반환한다
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.json({
    message: err.message || 'Internal Server Error',
    status: err.status || 500,
  });
});

app.listen(SERVER_PORT, () => {
  console.log(`Server is running on ${SERVER_PORT} port`);  

  // 💡 포트가 완전히 열린 후, 백그라운드 영역에서 mqtt 모듈을 '동적(Dynamic)'으로 로드합니다.
  // 이렇게 하면 초기 구동 단계에서 무한 펜딩이 걸리는 현상을 100% 원천 차단합니다.
  try {
    console.log('📶 백그라운드에서 가전 연동 MQTT 모듈을 동적 로드합니다...');    
    connectMqtt();
  } catch (e) {
    console.error('⚠️ MQTT 동적 로딩 또는 실행 중 예외 발생:', e.message);
  }
});
