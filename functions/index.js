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

// exports.countRegistrations = functions.database.ref('/courses/{courseId}/members/{uid}').onWrite(
//   (change) => {
//       const collectionRef = change.after.ref.parent;
//       const countRef = collectionRef.parent.child('seats');
//
//       let increment;
//       if (change.after.exists() && !change.before.exists()) {
//         increment = -1;
//       } else if (!change.after.exists() && change.before.exists()) {
//         increment = 1;
//       } else {
//         return null;
//       }
//
//       // Return the promise from countRef.transaction() so our function
//       // waits for this async event to complete before it exits.
//       return countRef.transaction((current) => {
//         return (current || 0) + increment;
//       }).then(() => {
//         return console.log('Counter updated.');
//       });
//     });
//
// // If the number of likes gets deleted, recount the number of likes
// exports.recountlikes = functions.database.ref('/courses/{courseId}/members/{uid}').onDelete((snap) => {
//   const counterRef = snap.ref;
//   const collectionRef = counterRef.parent.child('seats');
//
//   // Return the promise from counterRef.set() so our function
//   // waits for this async event to complete before it exits.
//   return collectionRef.once('value')
//       .then((messagesData) => counterRef.set(messagesData.numChildren()));
// });

// TODO: Return promise if no emails are sent
exports.reminderEmail = functions.https.onRequest((req, res) => {
  const currentTime = new Date().getTime();
  const future = currentTime + 172800000;
  const mailOpts = {};
  const courseOpts = {}

  return ref.child('courses/').orderByChild('start').startAt(future).once('value')
  .then(snap => {
    const promises = [];
    snap.forEach(child => {
      var el = child.val();

      if(el.hasOwnProperty('members')) {
        promises.push(admin.database().ref('courses/' + child.key).once('value'))
      }
    })
    return Promise.all(promises)
  })
  .then(results => {
    const emails = [];
    results.forEach(delta => {
      var course = delta.val();
      courseOpts.title = course.title
      courseOpts.date = new Date(course.start).toLocaleDateString()
      mailOpts.subject = "Upcoming registration for " + course.title;
      if(course.members) {
        return admin.database().ref('courses/' + delta.key + '/members').once('value')
        .then(data => {
          data.forEach(member => {
            var email = member.val().email;
            emails.push(email)
          })
          return Promise.all(emails)
        })
        .then(emails => {

          console.log('Line 79: Sending to: ' + emails.join());
          mailOpts.from = '"Elkhart PD" <pd@elkhart.k12.in.us>',
          mailOpts.bcc = emails.join(),
          mailOpts.html = `<p>This is a reminder that you're currently scheduled to attend <b>${courseOpts.title}</b> on <b>${courseOpts.date}</b>. Please visit the <b><a href="//pd.elkhart.k12.in.us">Elkhart PD website</a></b> for details or to cancel your registration if you can no longer attend.</p><br /><b>Elkhart Professional Development</b>`

          console.log(mailOpts)
          return mailTransport.sendMail(mailOpts)
        })
        .then(() => {
          res.send('Email sent')
        })
        .catch(error => {
          res.send(error)
        })
      }
    })
  })
})

exports.sendPostNotification = functions.database.ref('/courses/{courseId}}').onCreate(snapshot => {
  var course = snapshot.val();
  const title  = course.title;
  const rawDate = new Date(course.start);
  var date = rawDate.getDate() + '/' + rawDate.getMonth() + '/' + rawDate.getYear();


    // // if data deleted => exit
    // if (!postTitle) return console.log('Post', postID, 'deleted')
    //
    // // Get Device tokens
  const getDeviceTokensPromise = admin.database().ref('device_ids').once('value').then(snapshots => {
    //
    //     // Check if tokens exist
        if (!snapshots) {
            return console.log('No device IDs to send notifications to.')
        }
    //
    //     // Notification details
        const payload = {
            notification: {
                body: `${title} is available on ${date}. Click to sign up.`,
            }
        }
        snapshots.forEach(childSnapshot => {
            const token = childSnapshot.val()


            // Send notification to all tokens
            admin.messaging().sendToDevice(token, payload).then(response => {

                response.results.forEach(result => {
                    const error = result.error

                    if (error) {
                        console.error('Failed delivery to', token, error)

                        // Prepare unused tokens for removal
                        if (error.code === 'messaging/invalid-registration-token' ||
                            error.code === 'messaging/registration-token-not-registered') {
                            childSnapshot.ref.remove()
                            console.info('Was removed:', token)
                        }
                    } else {
                        console.info('Notification sent to', token)
                    }

                })

            })

        })

    })

})
//
// exports.storeUserData = functions.auth.user().onCreate((user) => {
//
// })
