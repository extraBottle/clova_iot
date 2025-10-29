const express = require('express');
const axios = require('axios');
const router = express.Router();

require('dotenv').config();

router.post('/', (req, res) => {
    const cmd = req.body.header.name;
    switch(cmd){
        case 'DiscoverAppliancesRequest':
            DiscoverAppliancesRequest(req, res);
            break;
        default:
            res.sendStatus(403);
            break;
    }
})

router.get('/login', function (req, res) {
	console.log(req.query);
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

// btc 거래량 알림
router.post('/vol', async(req, res) => {
    const url = 'https://apis.naver.com/clovahome/clova-platform/sendNotification'
    try {
        const header = {
            headers: {
                'X-Clova-Extension-Id': process.env.CLOVA_ID,
                'X-Clova-Extension-Secret': process.env.CLOVA_SECRET,
            }
        }
        const body = {
            'applianceId': 'device-001',
            'messageId': process.env.BTC_MSG
        }
        await axios.post(url, body, header);        
        res.sendStatus(200);
    }
    catch(e) {
        console.log('err: ', e.message);
    }
});

function DiscoverAppliancesRequest(req, res) {
	let messageId = req.body.header.messageId;
	let resultObject = new Object();
	resultObject.header = new Object();
	resultObject.header.messageId = messageId;
	resultObject.header.name = "DiscoverAppliancesResponse ";
	resultObject.header.namespace = "ClovaHome";
	resultObject.header.payloadVersion = "1.0";
	resultObject.payload = new Object();
	resultObject.payload.discoveredAppliances = new Array();

    let laundary = new Object();
	laundary.applianceId = "device-001";
	laundary.manufacturerName = "manu전등";
	laundary.modelName = "light-123";
	laundary.friendlyName = "전등";
	laundary.version = "9.5.0"
	laundary.isIr = false;
	laundary.actions = ["TurnOn", "TurnOff"];
	laundary.applianceTypes = ["LIGHT"];
	resultObject.payload.discoveredAppliances.push(laundary);

	res.send(resultObject);
}

module.exports = router;
