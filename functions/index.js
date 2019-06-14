/* eslint-disable no-undef */
'use strict';
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const config = functions.config();

admin.initializeApp();

const mailTransport = nodemailer.createTransport({
	host: 'smtp.gmail.com',
	port: 465,
	secure: true,
	auth: {
		user: config.gmail.email,
		pass: config.gmail.password,
	},
});

const ref = admin.database().ref();

exports.onlineRegConfirmation = functions.database
	.ref('/courses/{courseId}/members/{uid}')
	.onCreate(snap => {
		let mailOpts = {};
		const user = snap.val();
		mailOpts.to = user.email;
		// console.log('The user is ', user);

		const course = snap.ref.parent.parent;

		return course
			.once('value')
			.then(snap => {
				var el = snap.val();
				if (el.type === 'Online') {
					mailOpts.from = '<pd@elkhart.k12.in.us> Elkhart PD';
					mailOpts.subject = `Your registration for ${el.title}`;
					mailOpts.html = `<p>Thank you for registering for ${
						el.title
					}. This is an online course, so please visit the <a href='${
						el.redirect
					}' target='_blank'>Canvas login page</a> to begin.</p><p>If you have trouble, please <a href='mailto:${
						el.pocEmail
					}'>contact the course facilitator</a> for more help.</p><p>---</p><p>Elkhart Professional Development</p>`;

					// console.log(mailOpts);
					return mailTransport.sendMail(mailOpts);
				} else {
					return null;
				}
			})
			.catch(e => {
				return e.message;
			});
	});

exports.countRegistrations = functions.database
	.ref('/courses/{courseId}/members/{uid}')
	.onWrite(change => {
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
		return countRef
			.transaction(current => {
				return (current || 0) + increment;
			})
			.then(() => {
				return;
			});
	});

// If the number of likes gets deleted, recount the number of likes
// exports.recountlikes = functions.database.ref('/courses/{courseId}').onDelete((snap) => {
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
	const today = Date.now();
	const future = today + (48 * 60 * 60 * 1000);
	const ffuture = today + (72 * 60 * 60 * 1000);
	const mailOpts = {};
	const courseOpts = {};
	let responses = [];

	return ref.child('courses/').orderByChild('start').once('value')
		.then(snap => {
			const promises = [];
			snap.forEach(child => {
				// TODO: Only send emails to events exactly two days in the future
				var el = child.val();
				let timestamp = new Date(el.start).getTime();
				if(timestamp >= future && timestamp <= ffuture && el.hasOwnProperty('members')) {
					promises.push(admin.database().ref('courses/' + child.key).once('value'));
				}
			});
			return Promise.all(promises);
		})
		.then(results => {
			const emails = [];
			results.forEach(delta => {
				var course = delta.val();
				responses.push(course.title);
				courseOpts.title = course.title;
				courseOpts.date = new Date(course.start).toLocaleDateString();
				mailOpts.subject = 'Upcoming registration for ' + course.title;
				if(course.members) {
					return admin.database().ref('courses/' + delta.key + '/members').once('value')
						.then(data => {
							data.forEach(member => {
								var email = member.val().email;
								emails.push(email);
							});
							return Promise.all(emails);
						})
						.then(emails => {

							//console.log('Line 79: Sending to: ' + emails.join());
							mailOpts.from = '"Elkhart PD" <pd@elkhart.k12.in.us>',
							mailOpts.bcc = emails.join(),
							mailOpts.html = `<p>This is a reminder that you're currently scheduled to attend <b>${courseOpts.title}</b> on <b>${courseOpts.date}</b>. Please visit the <b><a href="//pd.elkhart.k12.in.us">Elkhart PD website</a></b> for details or to cancel your registration if you can no longer attend.</p><br /><b>Elkhart Professional Development</b>`;

							return JSON.stringify(mailOpts);
							// return mailTransport.sendMail(mailOpts);
						})
						.then((mailOpts) => {
							res.send(`Emails sent to ${responses}`);
						})
						.catch(error => {
							res.send(error);
						});
				}
			});
		});
});

// exports.sendPostNotification = functions.database.ref('/courses/{courseId}}').onCreate(snapshot => {
// 	var course = snapshot.val();
// 	const title = course.title;
// 	const rawDate = new Date(course.start);
// 	var date = rawDate.getDate() + '/' + rawDate.getMonth() + '/' + rawDate.getYear();

// 	// // if data deleted => exit
// 	// if (!postTitle) return console.log('Post', postID, 'deleted')
// 	//
// 	// // Get Device tokens
// 	const getDeviceTokensPromise = admin
// 		.database()
// 		.ref('device_ids')
// 		.once('value')
// 		.then(snapshots => {
// 			//
// 			//     // Check if tokens exist
// 			if (!snapshots) {
// 				return console.log('No device IDs to send notifications to.');
// 			}
// 			//
// 			//     // Notification details
// 			const payload = {
// 				notification: {
// 					body: `${title} is available on ${date}. Click to sign up.`,
// 				},
// 			};
// 			snapshots.forEach(childSnapshot => {
// 				const token = childSnapshot.val();

// 				// Send notification to all tokens
// 				admin
// 					.messaging()
// 					.sendToDevice(token, payload)
// 					.then(response => {
// 						response.results.forEach(result => {
// 							const error = result.error;

// 							if (error) {
// 								console.error('Failed delivery to', token, error);

// 								// Prepare unused tokens for removal
// 								if (
// 									error.code === 'messaging/invalid-registration-token' ||
// 									error.code === 'messaging/registration-token-not-registered'
// 								) {
// 									childSnapshot.ref.remove();
// 									console.info('Was removed:', token);
// 								}
// 							} else {
// 								console.info('Notification sent to', token);
// 							}
// 						});
// 					});
// 			});
// 		});
// });
