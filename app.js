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
console.log('morgan');
app.use(morgan('dev'));


// routes/index.js에 모든 request 처리를 위임한다
console.log('post /');
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

  // 포트가 완전히 열린 후(클라우드타입 헬스체크 통과 후) MQTT 접속 시작
  console.log('포트 개방 완료. 백그라운드에서 MQTT 연결을 진행합니다.');
  connectMqtt();
});
