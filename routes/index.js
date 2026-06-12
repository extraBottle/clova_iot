import express from 'express';
import axios from 'axios';
import { DiscoverAppliancesResponse, TurnOnResponse } from './mqtt.js';
import geminiReq from './gemini.js';

const router = express.Router();

// 클로바 스마트홈 Extension 표준 인텐트 처리
router.post('/', async (req, res, next) => {
    try {
        const namespace = req.body.header ? req.body.header.namespace : null;
        const requestType = req.body.request ? req.body.request.type : null;

        // 분기 1: 기존 클로바 홈(IoT 스마트홈) 요청인 경우
        if (namespace === 'ClovaHome') {
            if (req.body && req.body.header) {
               console.log(`📡 [CLOVA INCOMING] Namespace: ${req.body.header.namespace}, Name: ${req.body.header.name}`);
            }
            const cmd = req.body.header.name;
            switch(cmd){
                case 'DiscoverAppliancesRequest':
                    // 서비스 첫 가동
                    DiscoverAppliancesResponse(req, res);
                    break;
                case 'TurnOnRequest':
                    // 에어컨 켜기
                    TurnOnResponse(req, res);
                    break;
                default:
                    res.sendStatus(403);
                    break;
            }
        } 
        // 분기 2: 일반 대화형 Custom Extension 요청인 경우 (LaunchRequest, IntentRequest 등)
        else if (requestType || (namespace && namespace !== 'ClovaHome')) {
            // 💡 gemini.js에서 구현한 익스포트 함수를 실행해 응답 처리를 위임합니다.            
            await geminiReq(req, res, next);
        } 
        else {
            res.sendStatus(400);
        }
    } catch (error) {
        console.error("통합 라우터 에러:", error.message);
        next(error);
    }
});

// 클로바 계정 연동(Account Linking) 유지용 더미 라우트들
router.get('/login', function (req, res) {
	// console.log(req.query);
	let url = decodeURIComponent(req.query.redirect_uri)+"?state="+req.query.state+"&code="+"FakeToken"+"&token_type=Bearer";
	res.redirect(url);
});
router.post('/token',function(req,res){
    res.send(`
  {
	"access_token":"testToken",
	"refresh_token":"testRefresh"
  }
  `);
});

export default router;
