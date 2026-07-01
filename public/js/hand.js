// Qo'l skaneri — MediaPipe Tasks (HandLandmarker) orqali, brauzerda ishlaydi
const Hand = {
  VISION_URL: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14',
  MODEL_URL: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  _landmarker: null,
  _stream: null,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Modelni yuklash (bir marta)
async function handLoadModels() {
  if (Hand._landmarker) return;
  const vision = await import(Hand.VISION_URL + '/vision_bundle.mjs');
  const fileset = await vision.FilesetResolver.forVisionTasks(Hand.VISION_URL + '/wasm');
  Hand._landmarker = await vision.HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: Hand.MODEL_URL },
    numHands: 1,
    runningMode: 'VIDEO',
  });
}

// Kamerani yoqish va video elementga ulash
async function handStartCamera(videoEl) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Kamera mavjud emas');
  }
  Hand._stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
  videoEl.srcObject = Hand._stream;
  await videoEl.play();
}

// Kamerani o'chirish
function handStopCamera() {
  if (Hand._stream) {
    Hand._stream.getTracks().forEach((t) => t.stop());
    Hand._stream = null;
  }
}

// 21 ta nuqtadan normallashtirilgan vektor (63 son) yasash.
// Bilakni (0-nuqta) markazga olib, qo'l o'lchamiga bo'lib normallashtiramiz,
// shunda qo'lning kameradan uzoq-yaqinligi natijaga ta'sir qilmaydi.
function buildHandVector(landmarks) {
  const wrist = landmarks[0];
  const mid = landmarks[9]; // o'rta barmoq asosi
  const scale = Math.hypot(mid.x - wrist.x, mid.y - wrist.y, mid.z - wrist.z) || 1;
  const v = [];
  for (const p of landmarks) {
    v.push((p.x - wrist.x) / scale, (p.y - wrist.y) / scale, (p.z - wrist.z) / scale);
  }
  return v;
}

// Joriy kadrdan qo'l vektorini olish (bir necha marta urinadi)
async function handCaptureDescriptor(videoEl) {
  await handLoadModels();
  for (let i = 0; i < 18; i++) {
    const res = Hand._landmarker.detectForVideo(videoEl, performance.now());
    if (res.landmarks && res.landmarks.length) {
      return buildHandVector(res.landmarks[0]);
    }
    await sleep(80);
  }
  throw new Error("Qo'l topilmadi — qo'lingizni doira ichiga ochiq holda tuting");
}
