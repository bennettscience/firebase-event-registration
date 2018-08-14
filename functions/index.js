'use strict'
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const nodemailer = require('nodemailer')
const mailTransport = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'pd@elkhart.k12.in.us',
    pass: 'T3chnology@3c5'
  }
})

const ref = admin.database().ref();

exports.countRegistrations = functions.database.ref('/courses/{courseId}/members/{uid}').onWrite(
  (change) => {
      const collectionRef = change.after.ref.parent;
      const countRef = collectionRef.parent.child('seats');

      let increment;
      if (change.after.exists() && !change.before.exists()) {
        increment = -1;
      } else if (!change.after.exists() && change.before.exists()) {
        increment = 1;
      } else {
        return null;
      }

      // Return the promise from countRef.transaction() so our function
      // waits for this async event to complete before it exits.
      return countRef.transaction((current) => {
        return (current || 0) + increment;
      }).then(() => {
        return console.log('Counter updated.');
      });
    });

// If the number of likes gets deleted, recount the number of likes
exports.recountlikes = functions.database.ref('/courses/{courseId}/members/{uid}').onDelete((snap) => {
  const counterRef = snap.ref;
  const collectionRef = counterRef.parent.child('seats');

  // Return the promise from counterRef.set() so our function
  // waits for this async event to complete before it exits.
  return collectionRef.once('value')
      .then((messagesData) => counterRef.set(messagesData.numChildren()));
});

exports.reminderEmail = functions.https.onRequest((req, res) => {
  const currentTime = new Date().getTime();
  const future = currentTime + 172800000;

  return ref.child('courses/').orderByChild('start').startAt(future).once('value')
  .then(snap => {
    const promises = [];

    snap.forEach(child => {
      var el = child.val();

      if(el.hasOwnProperty('members')) {
        promises.push(admin.database().ref('courses/' + child.key + '/members/').once('value'))
      }
    })

    return Promise.all(promises)
  })
  .then(results => {
    console.log(results)
    const emails = [];
    results.forEach(delta => {
      console.log(delta.val());
      delta.forEach(member => {
        var email = member.val().email;
        emails.push(email);
      })
    })

    console.log('Line 79: Sending to: ' + emails.join());

    const mailOpts = {
      from: '"Elkhart PD" <pd@elkhart.k12.in.us>',
      bcc: emails.join(),
      subject: 'Upcoming Registration',
      text: 'Something about registering here.'
    }

    console.log(mailOpts)
    return mailTransport.sendMail(mailOpts)
  })
  .then(() => {
    res.send('Email sent')
  })
  .catch(error => {
    res.send(error)
  })
})
