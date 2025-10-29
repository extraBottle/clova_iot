const express = require('express');
const morgan = require('morgan');
const {SERVER_PORT} = require('./config.js');
// request 처리하는 파일
const routes = require('./routes/index.js');
// mqtt 접속하는 파일
const { connect: connectMqtt } = require('./routes/mqtt.js');

const app = express();

// parser. Express가 알아먹기 쉽게함
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// 디버깅 용도.
app.use(morgan('dev'));


// routes/index.js에 모든 request 처리를 위임한다
app.use('/', routes);

// mqtt 서버 연결
connectMqtt();


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
});
