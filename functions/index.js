/* eslint-disable no-undef */
'use strict';
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {google} = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const calendar = google.calendar('v3');
const credentials = require('./credentials.json');
const nodemailer = require('nodemailer');
const config = functions.config();

admin.initializeApp();

process.on('unhandledRejection', (err) => {
	console.error(err);
	process.exit(1)
})

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

function inviteUser(eventId, auth, user) {
	const calId = "elkhart.k12.in.us_j2gh78bk5e5bje6n6k19ijr2j8@group.calendar.google.com"
	let event = new Promise(async function(resolve, reject) {
		let eventData = await calendar.events.get({
							auth: auth,
							calendarId: calId,
							eventId: eventId
						})
			resolve({
				event: eventData,
				user: user,
				auth: auth
			})
		});

	event.then(result => {
		let attendees = result.event.data.attendees;
		attendees.push({"email": result.user, "responseStatus": "needsAction"});
		calendar.events.patch({
			auth: result.auth,
			calendarId: calId,
			eventId: result.event.data.id,
			resource: {
				attendees: attendees
			},
			sendUpdates: 'all',
		}).catch(err => { console.log(err)})
	})
}

exports.inviteUserToEvent = functions.database
	.ref(`/courses/{courseId}/members/{uid}`)
	.onCreate(snap => {
		const user = snap.val();
		const course = snap.ref.parent.parent;

		return course.once('value').then(snapshot => {
			let event = snapshot.val();
			const calendarEventId = event.eventId;
			const oAuth2Client = new OAuth2(
				credentials.web.client_id,
				credentials.web.client_secret,
				credentials.web.redirect_uris[0]
			);
	
			oAuth2Client.setCredentials({
				refresh_token: credentials.refresh_token
			})
	
			inviteUser(calendarEventId, oAuth2Client, user.email)
			return;
		})
	})

exports.onlineRegConfirmation = functions.database
	.ref('/courses/{courseId}/members/{uid}')
	.onCreate(snap => {
		let mailOpts = {};
		const user = snap.val();
		mailOpts.to = user.email;

		const course = snap.ref.parent.parent;

		return course
			.once('value')
			.then(snap => {
				var el = snap.val();
				let start = new Date(el.start);
				// The redirect key is only present on online courses. Send a welcome email.
				mailOpts.from = '<pd@elkhart.k12.in.us> Elkhart PD';
				mailOpts.subject = `Your registration for ${el.title}`;

				if (el.hasOwnProperty('redirect')) {
					mailOpts.html = `<p>Thank you for registering for ${
						el.title
					} on ${start.toLocaleDateString()} at ${start.toLocaleTimeString("en-US", {timeZone: "America/Indiana/Indianapolis"})}. You will receive a calendar invite with more details in a moment.</p><p>If you have trouble, please <a href='mailto:${
						el.pocEmail
					}'>contact the course facilitator</a> for more help.</p><p>---</p><p>Elkhart Professional Development</p>`;

				} else {
					mailOpts.html = `<p>Thank you for registering for ${
						el.title
						}. Here are your registration details: 
						<ul>
						<li><b>Start</b>: ${start.toLocaleDateString()} at ${start.toLocaleTimeString("en-US", {timeZone: "America/Indiana/Indianapolis"})}</li>
						<li><b>Location</b>: ${el.loc}</li>
						</ul> 
						<p>You will receive reminders one week ahead and two days ahead of the workshop. If you have questions, please <a href='mailto:${
						el.pocEmail
						}'>contact the course facilitator</a> for more help.</p> 
						<p>You can cancel your registration on <a href="https://pd.elkhart.k12.in.us" target="blank">the PD website</a> by clicking your name, going to <b>My Sessions</b> and clicking <b>cancel</b> on the registration.</p><p>---</p><p>Elkhart Professional Development</p>`;
				}
				return mailTransport.sendMail(mailOpts);
			})
			.catch(e => {
				return e.message;
			});
	});

exports.countRegistrations = functions.database
	.ref('/courses/{courseId}/members/{uid}')
	.onWrite( async (change) => {
		const collectionRef = change.after.ref.parent;
		const countRef = collectionRef.parent.child('seats');

		let increment;
		if (change.after.exists() && !change.before.exists()) {
			increment = Number(-1);
		} else if (!change.after.exists() && change.before.exists()) {
			increment = Number(1);
		} else {
			return null;
		}
		// force the seats value to an integer just to be safe
		await countRef.transaction((current) => {
			if(typeof current !== "number") {
				current = parseInt(current, 10);
			}
			
			return (current || 0) + increment;
		});
		console.log('Counter updated.');
		return null;
		// return countRef
		// 	.transaction(current => {
		// 		return (current || 0) + increment;
		// 	})
		// 	.then(() => {
		// 		return;
		// 	});
	});

exports.destroyCourse = functions.database.ref('/courses/{courseId}/active').onUpdate(async (change, context) => {
	// get the course ID and check that it is set to false
	const before = change.before.val();
	const active = change.after.val();

	// Store the course data for use in the email to be sent
	const course = await change.after.ref.parent.once('value');

	// There is no change to the key
	if(before === active) {
		return null;
	}

	if(!active) {
		let emails = [];
		let uids = [];
		// get the emails for the users in the course
		let members = await change.after.ref.parent.child(`members`).once('value');

		members.forEach(member => {
			emails.push(member.val().email)
		})

		// Wait for all emails to be sent
		await sendCancellationEmail(emails, course.val().title, course.val().pocEmail);

		// Get all user keys for registered users
		let userKeys = Object.keys(members.val());

		// Remove the course from user profiles
		userKeys.forEach((el) => {
			removeUserCourse(el, course.key);
		})

		// Finish the function and update the cancelled time
		return change.after.ref.parent.update({'timeCancelled': Date.now() });
	}

});

async function sendCancellationEmail(emails, title, contact) {
	let mailOpts = {};

	emails.push(contact);

	mailOpts.from = '"Elkhart PD" <pd@elkhart.k12.in.us>';
	mailOpts.subject = 'Notice: PD Cancelled';
	mailOpts.to = "pd@elkhart.k12.in.us";
	mailOpts.bcc = emails.join(',');

	mailOpts.html = `
		<p>This is an automated notice that <b>${title}</b> has been cancelled by the organizer.</p>
		<p>There is no need for action on your part - the course has been removed from your account automatically. Communication about rescheduling will come from the organizer.</p>
		<p>If you have questions, you can email <a href="mailto:${contact}">${contact}</a> directly.
		<br />
		<br />
		<b>Elkhart Professional Development</b>
	`;

	return mailTransport.sendMail(mailOpts);
}

function removeUserCourse(userId, courseId) {
	return ref.child(`users/${userId}/regs/${courseId}`).remove();
}

// restore a course that has been deleted
function restoreUserCourse(userId, courseId, data) {
	return ref.child(`users/${userId}/regs/${courseId}`).update(data);
}

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
					<li>Start time: ${new Date(item.start).toLocaleString('en-US', { timeZone: 'America/New_York', 'timeStyle': 'short' })}</li>
				</ul>
				<p>Please visit the <b><a href="https://pd.elkhart.k12.in.us">Elkhart PD website</a></b> for more details or to cancel your registration if you can no longer attend.</p>
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
					<li>Start time: ${new Date(item.start).toLocaleString('en-US', { timeZone: 'America/New_York', 'timeStyle': 'short' })}</li>
				</ul>
				<p>Please visit the <b><a href="https://pd.elkhart.k12.in.us">Elkhart PD website</a></b> for more details or to cancel your registration if you can no longer attend.</p>
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