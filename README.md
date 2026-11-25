# clova_iot
클로바 프렌즈 스피커에 iot 기능을!


## MQTT 인증서 및 배포 설정

모든 서비스 환경변수를 같은 이름의 GitHub Actions Secrets에서 Cloudtype 실행 환경으로 전달합니다. Cloudtype 시크릿 참조는 사용하지 않습니다. 문자열은 `toJSON`으로 직렬화해 따옴표·줄바꿈·특수문자가 배포 YAML을 깨뜨리지 않도록 합니다. GitHub Secret 변경 후 재배포해야 적용됩니다.

필요한 서비스 Secrets: `KEY_B64`, `CERT_B64`, `CA_B64`, `CLIENT_ID`, `CLOVA_ID`, `CLOVA_SECRET`, `FINISH_MSG`, `ERROR_MSG`, `MQTT_HOST`, `SUB_INBOX`, `SUB_PUSH`, `SERVER_PORT`, `DOMAIN`, `CLEANER_MSG`, `CONDITIONER_MSG`, `GEMINI_API_KEY`, `LG_THINQ_PAT`, `AIR_CON_DEVICE_ID`. 배포 인증용 `CLOUDTYPE_TOKEN`도 필요합니다. 이미 교체한 Deploy Key를 사용하므로 connect 액션은 실행하지 않습니다.

PEM 파일 전체를 한 번만 Base64로 인코딩한 한 줄 값을 저장하세요. 개인키와 클라이언트 인증서는 같은 쌍이어야 합니다. `npm start`는 메모리에서 복원한 뒤 형식, 키 일치 및 인증서 유효기간을 검사하고 서버를 시작합니다. 실제 TLS 서버 검증은 MQTT 연결 시 수행하며 비활성화하지 않습니다. 개인키를 작업 폴더에 다시 쓰거나 로그로 출력하지 않습니다.

원본 및 발급 응답은 Git에서 제외된 `private/lg-thinq/renewal/`에 보관합니다. 이 폴더와 `.env`를 배포 산출물에 포함하지 마세요. 새 인증서를 배포한 후 MQTT 연결, 두 토픽 구독, 실제 이벤트 수신을 확인하고 이전 인증 설정을 정리하세요. 새 발급만으로 기존 인증서가 폐기되었다고 간주하지 않습니다.

검증: `npm test` (합성 인증서, 외부 API 호출 없음). `npm run dev`도 같은 시작 검증을 수행합니다.
