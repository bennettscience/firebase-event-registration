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
exports.twoDayReminder = functions.https.onRequest(async (req, res) => {
	let today = Date.now();
	let future = today + (36 * 60 * 60 * 1000);
	let ffuture = today + (72 * 60 * 60 * 1000);
	let mailOpts = {};
	let promises = [];

	mailOpts.from = '"Elkhart PD" <pd@elkhart.k12.in.us>';

	try {
		const courses = await ref.child('courses/').orderByChild('start').startAt(new Date(future).toISOString()).endAt(new Date(ffuture).toISOString()).once('value');
		courses.forEach(course => {
			const item = ref.child(`courses/${course.key}`).once('value');
			promises.push(item);
		});
		const allCourses = await Promise.all(promises);

		allCourses.forEach(async function(el) {
			// Init the item values
			let item = el.val();
			let users = [];

			// Get the users in an async function
			let members = await ref.child(`courses/${el.key}/members`).once('value');
			
			// get each user's email and push to an array
			members.forEach(user => {
				users.push(user.val().email);
			});

			users.push(item.submittedBy, item.pocEmail)
			
			mailOpts.subject = `Upcoming registration for ${item.title}`;
			mailOpts.to = 'pd@elkhart.k12.in.us';
			mailOpts.bcc = users.join(',');

			mailOpts.html = `
				<p>This is a reminder that you're currently scheduled to attend <b>${item.title}</b> on <b>${new Date(item.start).toDateString()}</b>.</p>
				<ul>
					<li>Workshop: ${item.title}</li>
					<li>Location: ${item.loc}</li>
					<li>Start time: ${new Date(item.start).toLocaleTimeString()}</li>
				</ul>
				<p>Please visit the <b><a href="https//pd.elkhart.k12.in.us">Elkhart PD website</a></b> for more details or to cancel your registration if you can no longer attend.</p>
				<br />
				<b>Elkhart Professional Development</b>
			`;
			mailTransport.sendMail(mailOpts);
		});
		res.send('Email sent');
	} catch(err) {
		res.send(err);
	}
});

exports.oneWeekReminder = functions.https.onRequest(async (req, res) => {
	let today = Date.now();
	let future = today + (144 * 60 * 60 * 1000);
	let ffuture = today + (192 * 60 * 60 * 1000);
	let mailOpts = {};
	let responses = [];
	let promises = [];

	mailOpts.from = '"Elkhart PD" <pd@elkhart.k12.in.us>';

	try {
		const courses = await ref.child('courses/').orderByChild('start').startAt(new Date(future).toISOString()).endAt(new Date(ffuture).toISOString()).once('value');
		courses.forEach(course => {
			const item = ref.child(`courses/${course.key}`).once('value');
			promises.push(item);
		});
		const allCourses = await Promise.all(promises);

		allCourses.forEach(async function (el) {
			// Init the item values
			let item = el.val();
			let users = [];

			// Get the users in an async function
			let members = await ref.child(`courses/${el.key}/members`).once('value');

			// get each user's email and push to an array
			members.forEach(user => {
				users.push(user.val().email);
			});

			users.push(item.submittedBy, item.pocEmail)

			mailOpts.subject = `Upcoming registration for ${item.title}`;
			mailOpts.to = 'pd@elkhart.k12.in.us';
			mailOpts.bcc = users.join(',');

			mailOpts.html = `
				<p>This is a reminder that you're currently scheduled to attend <b>${item.title}</b> on <b>${new Date(item.start).toDateString()}</b>.</p>
				<ul>
					<li>Workshop: ${item.title}</li>
					<li>Location: ${item.loc}</li>
					<li>Start time: ${new Date(item.start).toLocaleTimeString()}</li>
				</ul>
				<p>Please visit the <b><a href="https//pd.elkhart.k12.in.us">Elkhart PD website</a></b> for more details or to cancel your registration if you can no longer attend.</p>
				<br />
				<b>Elkhart Professional Development</b>
			`;
			// console.log(users.join(','));
			mailTransport.sendMail(mailOpts);
		});
		res.send(`Email sent`);
	} catch (err) {
		res.send(err);
	}
});
