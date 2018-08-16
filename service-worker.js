importScripts('https://www.gstatic.com/firebasejs/5.3.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/5.3.1/firebase-database.js');
importScripts('https://www.gstatic.com/firebasejs/5.3.1/firebase-messaging.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCXmPVmNY1VyPM7uliVzsC5YoyttSTQcuk',
  authDoma: 'AIzaSyCXmPVmNY1VyPM7uliVzsC5YoyttSTQcuk',
  databaseURL: 'https://elkhart-pd-signup.firebaseio.com',
  projectId: 'elkhart-pd-signup',
  storageBucket: 'elkhart-pd-signup.appspot.com',
  messagingSenderId: '697421799429'
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close()
    event.waitUntil(
        self.clients.openWindow('http://pd.elkhart.k12.in.us')
    )
})

const messaging = firebase.messaging();

self.addEventListener('push', function(event) {
  console.log('Received push', event.data.text());
  if(event.data) {
    var title = event.title;
    var opts = {
      body: event.data.text(),
      icon: 'img/ecslogo.png',
      actions: [{
        action: "get",
        title: "Register"
      }],
      data: {
        url: 'http://pd.elkhart.k12.in.us'
      }
    };
  }

  event.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('sync', function(event) {
  console.log('Syncing...', event)
})

self.addEventListener('install', function(event) {
  console.log('Service Worker installing.');
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker activating.');
});
