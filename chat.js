function getDeviceId() {
  let deviceId = localStorage.getItem('deviceId');

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('deviceId', deviceId);
  }

  return deviceId;
}

getDeviceId();

const composeBtn = document.getElementById('composeBtn');

const registerModal = document.getElementById('registerModal');
const registerModalClose = document.getElementById('registerModalClose');
const nameInput = document.getElementById('nameInput');
const continueWithNameBtn = document.getElementById('continueWithNameBtn');
const continueIncognitoBtn = document.getElementById('continueIncognitoBtn');

const composeModal = document.getElementById('composeModal');
const composeModalClose = document.getElementById('composeModalClose');

const changeNameBtn = document.getElementById('changeNameBtn');
let cameFromChangeName = false;

changeNameBtn.addEventListener('click', () => {
  cameFromChangeName = true;
  nameInput.value = getMyName() || '';
  registerModal.classList.remove('hidden');
});

const notifyBtn = document.getElementById('notifyBtn');

function getNotificationsEnabled() {
  return localStorage.getItem('notificationsEnabled') === 'true';
}

function setNotificationsEnabled(value) {
  localStorage.setItem('notificationsEnabled', value);
}

function updateNotifyBtnText() {
  const enabled = getNotificationsEnabled();
  notifyBtn.textContent = enabled ? 'Уведомления: вкл' : 'Уведомления: выкл';
  notifyBtn.classList.toggle('active', enabled);
}

updateNotifyBtnText();

// ---------- push-уведомления, когда приложение закрыто ----------
// Ключ получить в Firebase: Project settings → Cloud Messaging →
// Web configuration → Generate key pair.
const VAPID_KEY = 'ВСТАВЬ_СЮДА_ИЗ_FIREBASE';

let messaging = null;
try {
  if (firebase.messaging && firebase.messaging.isSupported && firebase.messaging.isSupported()) {
    messaging = firebase.messaging();
  }
} catch (error) {
  console.warn('Push-уведомления не поддерживаются в этом браузере:', error);
}

function tokenDocRef() {
  return db.collection('deviceTokens').doc(getDeviceId());
}

async function enablePush() {
  if (!messaging) return;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      alert('Чтобы получать уведомления, разреши их в настройках браузера или приложения.');
      setNotificationsEnabled(false);
      updateNotifyBtnText();
      return;
    }
    const token = await messaging.getToken({ vapidKey: VAPID_KEY });
    if (token) {
      await tokenDocRef().set({ token, updatedAt: new Date() });
    }
  } catch (error) {
    console.error('Не удалось включить push-уведомления:', error);
  }
}

function disablePush() {
  tokenDocRef().delete().catch(() => {});
}

notifyBtn.addEventListener('click', () => {
  const next = !getNotificationsEnabled();
  setNotificationsEnabled(next);
  updateNotifyBtnText();
  if (next) {
    enablePush();
  } else {
    disablePush();
  }
});

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 880;
    gainNode.gain.value = 0.15;

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.15);
  } catch (error) {
    console.error('Не удалось воспроизвести звук уведомления:', error);
  }
}

composeBtn.addEventListener('click', () => {
  cameFromChangeName = false;
  if (getMyName()) {
    composeModal.classList.remove('hidden');
  } else {
    registerModal.classList.remove('hidden');
  }
});

registerModalClose.addEventListener('click', () => {
  registerModal.classList.add('hidden');
});

continueWithNameBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();

  if (!name) {
    alert('Введи имя или зайди как Аноним');
    return;
  }

  setMyName(name);
  registerModal.classList.add('hidden');

  if (cameFromChangeName) {
    cameFromChangeName = false;
  } else {
    composeModal.classList.remove('hidden');
  }
});

continueIncognitoBtn.addEventListener('click', () => {
  setMyName('Аноним');
  registerModal.classList.add('hidden');

  if (cameFromChangeName) {
    cameFromChangeName = false;
  } else {
    composeModal.classList.remove('hidden');
  }
});

composeModalClose.addEventListener('click', () => {
  composeModal.classList.add('hidden');
});

function getMyName() {
  return localStorage.getItem('chatUserName');
}

function setMyName(name) {
  localStorage.setItem('chatUserName', name);
}
const messagesList = document.getElementById('messagesList');
const messageText = document.getElementById('messageText');
const sendMessageBtn = document.getElementById('sendMessageBtn');

let isFirstLoad = true;

db.collection('messages')
  .orderBy('createdAt', 'asc')
  .onSnapshot((snapshot) => {
    messagesList.innerHTML = '';

    if (snapshot.empty) {
      messagesList.innerHTML = '<p class="empty-state">Сообщений пока нет. Будь первым!</p>';
    } else {
      snapshot.forEach((doc) => {
        addMessageToList(doc.data());
      });
    }

    if (!isFirstLoad && getNotificationsEnabled()) {
      const hasNewMessage = snapshot.docChanges().some((change) => {
        return change.type === 'added' && change.doc.data().deviceId !== getDeviceId();
      });

      if (hasNewMessage) {
        playNotificationSound();
      }
    }

    isFirstLoad = false;
  });

function addMessageToList(message) {
  const row = document.createElement('div');
  row.className = 'msg-row';

  if (message.deviceId === getDeviceId()) {
    row.classList.add('own');
  }

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  const author = document.createElement('div');
  author.className = 'msg-author';
  author.textContent = message.name || 'Аноним';
  bubble.appendChild(author);

  if (message.text) {
    const textEl = document.createElement('div');
    textEl.className = 'msg-text';
    textEl.textContent = message.text;
    bubble.appendChild(textEl);
  }

  if (message.photoUrl) {
    const img = document.createElement('img');
    img.src = message.photoUrl;
    img.className = 'msg-photo';
    img.addEventListener('click', () => openLightbox(message.photoUrl));
    bubble.appendChild(img);
  }

  row.appendChild(bubble);
  messagesList.appendChild(row);
}

const CLOUDINARY_CLOUD_NAME = 'co78gklh';
const CLOUDINARY_UPLOAD_PRESET = 'gymnasium13';

const messagePhotoInput = document.getElementById('messagePhotoInput');

sendMessageBtn.addEventListener('click', () => {
  const text = messageText.value.trim();
  const photoFile = messagePhotoInput.files[0];

  if (!text && !photoFile) {
    alert('Напиши текст или прикрепи фото');
    return;
  }

  sendMessageBtn.disabled = true;
  sendMessageBtn.textContent = 'Отправка...';

  if (photoFile) {
    compressImage(photoFile, 1600, 0.7)
      .then((blob) => {
        const formData = new FormData();
        formData.append('file', blob);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        return fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData
        });
      })
      .then((response) => response.json())
      .then((data) => {
        sendMessage(text, data.secure_url);
      })
      .catch((error) => {
        console.error('Не удалось загрузить фото:', error);
        alert('Не получилось загрузить фото, попробуй ещё раз');
        resetSendButton();
      });
  } else {
    sendMessage(text, null);
  }
});

function sendMessage(text, photoUrl) {
  const messageData = {
    name: getMyName(),
    text: text,
    deviceId: getDeviceId(),
    createdAt: new Date()
  };

  if (photoUrl) {
    messageData.photoUrl = photoUrl;
  }

  db.collection('messages').add(messageData)
    .then(() => {
      messageText.value = '';
      messagePhotoInput.value = '';
      composeModal.classList.add('hidden');
    })
    .catch((error) => {
    console.error('Не удалось отправить сообщение:', error);

    if (error.code === 'permission-denied') {
        alert('Не получилось отправить: тебе запрещено писать в этот чат');
    } else {
        alert('Не получилось отправить сообщение, попробуй ещё раз');
    }
})
    .finally(() => {
      resetSendButton();
    });
}

function resetSendButton() {
  sendMessageBtn.disabled = false;
  sendMessageBtn.textContent = 'Отправить';
}

function compressImage(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (event) => {
      img.src = event.target.result;
    };

    img.onload = () => {
      let { width, height } = img;

      if (width > height && width > maxSize) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      } else if (height > maxSize) {
        width = Math.round((width * maxSize) / height);
        height = maxSize;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
    };

    img.onerror = reject;
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxClose = document.getElementById('lightboxClose');

lightboxClose.addEventListener('click', () => {
  lightbox.classList.add('hidden');
});

lightbox.addEventListener('click', (event) => {
  if (event.target === lightbox) {
    lightbox.classList.add('hidden');
  }
});

function openLightbox(url) {
  lightboxImg.src = url;
  lightbox.classList.remove('hidden');
}