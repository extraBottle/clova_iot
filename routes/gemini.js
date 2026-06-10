import crypto from 'crypto';
import { GoogleGenAI } from "@google/genai"; // 구글 최신 SDK import

class Directive {
  constructor({namespace, name, payload}) {
    this.header = {
      messageId: crypto.randomUUID(),
      namespace: namespace,
      name: name,
    }
    this.payload = payload
  }
}

async function callGeminiAPI(input) {  
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); 

  try {
    const response = await ai.interactions.create({
      model: 'gemini-3.5-flash',
      input: `[역할 및 미션]
            너는 인공지능 음성 비서야. 아래 제공되는 사용자의 질문에 대해 제약 조건을 반드시 지켜서 상냥하게 답변해줘.

            [출력 제약 조건 - 필수]
            1. 텍스트 구성: 반드시 사람이 입으로 말할 수 있는 순수한 한글 문장과 띄어쓰기로만 구성해줘.
            2. 기호 사용 금지: 특수문자(~, !, ? 등), 온점(.)을 제외한 모든 문장부호는 절대 사용하지 마. 쉼표(,)도 가급적 제외하고 문장 간의 호흡은 온점(.)으로만 구분해줘.
            3. 영어 및 숫자 처리: 영어 단어나 숫자가 있다면 반드시 한글 발음 그대로 적어줘. (예: 'AI' -> '에이아이', '3개' -> '세 개' 또는 '삼 개' 문맥에 맞게)
            4. 분량 제한: 답변은 반드시 세 문장 이하로만 작성해줘.

            [말투]
            - 언제나 '해요체'나 '하십시오체'를 사용하며, 목소리 톤이 상냥하고 따뜻하게 느껴지도록 부드러운 어조로 말해줘.
            ---

            [사용자 질문]
            ${input}`,
    });

    return response.output_text;
  } catch (error) {
    console.error("Gemini SDK Error:", error.message);
    return "제미나이 서버 응답을 가져오지 못했습니다.";
  }
}

class CEKRequest {
  constructor (httpReq) {
    this.request = httpReq.body.request
    this.context = httpReq.body.context
    this.session = httpReq.body.session
    console.log(`CEK Request: ${JSON.stringify(this.context)}, ${JSON.stringify(this.session)}`)
  }

  async do(cekResponse) {
    switch (this.request.type) {
      case 'LaunchRequest':
        return this.launchRequest(cekResponse)
      case 'IntentRequest':
        return await this.intentRequest(cekResponse)
      case 'SessionEndedRequest':
        return this.sessionEndedRequest(cekResponse)
    }
  }

  launchRequest(cekResponse) {
    console.log('launchRequest')
    cekResponse.setSimpleSpeechText('안녕하세요 제미나이에요. 무엇을 도와드릴까요?')
    cekResponse.setMultiturn({
      intent: 'AskGeminiIntent',
    })
  }

  async intentRequest(cekResponse) {
    console.log('intentRequest')
    console.dir(this.request)
    const intent = this.request.intent.name
    const slots = this.request.intent.slots

    switch (intent) {
      case 'AskGeminiIntent':
        let userSpeechText = '';
        if (slots && slots.userSpeech) {
          userSpeechText = slots.userSpeech.value;
        }

        if (!userSpeechText) {
          cekResponse.setSimpleSpeechText("질문을 이해하지 못했어요. 다시 말씀해주시겠어요?");
          break;
        }

        // Gemini API 동기 호출 대기 및 결과 주입
        const geminiReply = await callGeminiAPI(userSpeechText);
        cekResponse.setSimpleSpeechText(geminiReply);
        break;

      default:
        cekResponse.setSimpleSpeechText("질문을 이해하지 못했어요.");
    }

    // if (this.session.new == false) {
    //   cekResponse.setMultiturn()
    // }
  }

  sessionEndedRequest(cekResponse) {
    console.log('sessionEndedRequest')
    cekResponse.setSimpleSpeechText('제미나이를 종료합니다.')
    cekResponse.clearMultiturn()
  }
}

class CEKResponse {
  constructor () {
    console.log('CEKResponse constructor')
    this.response = {
      directives: [],
      shouldEndSession: true,
      outputSpeech: {},
      card: {},
    }
    this.version = '1.0.0'
    this.sessionAttributes = {}
  }

  setMultiturn(sessionAttributes) {
    this.response.shouldEndSession = false
    this.sessionAttributes = Object.assign(this.sessionAttributes, sessionAttributes);
  }

  clearMultiturn() {
    this.response.shouldEndSession = true
    this.sessionAttributes = {}
  }

  setSimpleSpeechText(outputText) {
    this.response.outputSpeech = {
      type: 'SimpleSpeech',
      values: {
          type: 'PlainText',
          lang: 'ko',
          value: outputText,
      },
    }
  }
}

const geminiReq = async function (httpReq, httpRes, next) {
  const cekResponse = new CEKResponse()
  const cekRequest = new CEKRequest(httpReq)
  await cekRequest.do(cekResponse)
  console.log(`CEKResponse: ${JSON.stringify(cekResponse)}`)
  return httpRes.send(cekResponse)
};

export default geminiReq;