const auth = firebase.auth();

const loginView = document.getElementById('loginView');
const adminView = document.getElementById('adminView');

const adminEmail = document.getElementById('adminEmail');
const adminPassword = document.getElementById('adminPassword');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

const adminMessagesList = document.getElementById('adminMessagesList');

loginBtn.addEventListener('click', () => {
  loginError.classList.add('hidden');

  auth.signInWithEmailAndPassword(adminEmail.value.trim(), adminPassword.value)
    .catch(() => {
      loginError.classList.remove('hidden');
    });
});

logoutBtn.addEventListener('click', () => {
  auth.signOut();
});

auth.onAuthStateChanged((user) => {
  if (user) {
    loginView.classList.add('hidden');
    adminView.classList.remove('hidden');
    loadAllMessages();
    loadBannedDevices();
  } else {
    loginView.classList.remove('hidden');
    adminView.classList.add('hidden');
  }
});

function loadAllMessages() {
  db.collection('messages')
    .orderBy('createdAt', 'desc')
    .onSnapshot((snapshot) => {
      adminMessagesList.innerHTML = '';

      if (snapshot.empty) {
        adminMessagesList.innerHTML = '<p class="empty-state">Сообщений пока нет.</p>';
        return;
      }

      snapshot.forEach((doc) => {
        addAdminMessageCard(doc.id, doc.data());
      });
    });
}

function addAdminMessageCard(messageId, message) {
  const item = document.createElement('div');
  item.className = 'message-item';

  const author = document.createElement('div');
  author.className = 'message-author';
  author.textContent = message.name || 'Аноним';
  item.appendChild(author);

  if (message.text) {
    const textEl = document.createElement('div');
    textEl.className = 'message-text';
    textEl.textContent = message.text;
    item.appendChild(textEl);
  }

  if (message.photoUrl) {
    const img = document.createElement('img');
    img.src = message.photoUrl;
    img.className = 'message-photo';
    item.appendChild(img);
  }

  const actions = document.createElement('div');
  actions.className = 'message-actions';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'message-action-btn';
  deleteBtn.textContent = 'Удалить';
  deleteBtn.addEventListener('click', () => deleteMessage(messageId));
  actions.appendChild(deleteBtn);

  const banBtn = document.createElement('button');
  banBtn.className = 'message-action-btn';
  banBtn.textContent = 'Забанить автора';
  banBtn.addEventListener('click', () => banDevice(message.deviceId));
  actions.appendChild(banBtn);

  item.appendChild(actions);
  adminMessagesList.appendChild(item);
}

function deleteMessage(messageId) {
  const confirmed = confirm('Удалить это сообщение? Действие нельзя отменить.');
  if (!confirmed) return;

  db.collection('messages').doc(messageId).delete()
    .catch((error) => {
      console.error('Не удалось удалить сообщение:', error);
      alert('Не получилось удалить сообщение, попробуй ещё раз');
    });
}

function banDevice(deviceId) {
  if (!deviceId) {
    alert('У этого сообщения нет deviceId — забанить не получится');
    return;
  }

  const confirmed = confirm('Забанить автора этого сообщения? Он больше не сможет писать с этого устройства.');
  if (!confirmed) return;

  db.collection('bannedDevices').doc(deviceId).set({
    bannedAt: new Date()
  }).catch((error) => {
    console.error('Не удалось забанить:', error);
    alert('Не получилось забанить, попробуй ещё раз');
  });
}
const bannedList = document.getElementById('bannedList');

function loadBannedDevices() {
  db.collection('bannedDevices')
    .onSnapshot((snapshot) => {
      bannedList.innerHTML = '';

      if (snapshot.empty) {
        bannedList.innerHTML = '<p class="empty-state">Забаненных устройств нет.</p>';
        return;
      }

      snapshot.forEach((doc) => {
        addBannedItem(doc.id);
      });
    });
}

function addBannedItem(deviceId) {
  const item = document.createElement('div');
  item.className = 'message-item';

  const idText = document.createElement('div');
  idText.className = 'message-text';
  idText.textContent = deviceId;
  item.appendChild(idText);

  const actions = document.createElement('div');
  actions.className = 'message-actions';

  const unbanBtn = document.createElement('button');
  unbanBtn.className = 'message-action-btn';
  unbanBtn.textContent = 'Разбанить';
  unbanBtn.addEventListener('click', () => unbanDevice(deviceId));
  actions.appendChild(unbanBtn);

  item.appendChild(actions);
  bannedList.appendChild(item);
}

function unbanDevice(deviceId) {
  db.collection('bannedDevices').doc(deviceId).delete()
    .catch((error) => {
      console.error('Не удалось разбанить:', error);
      alert('Не получилось разбанить, попробуй ещё раз');
    });
}