/* eslint-disable no-prototype-builtins */
/* eslint-disable no-console */
/* eslint-disable no-undef */
'use strict';

/**
 * PDReg - Main function Class
 *
 */
function PDReg() {
	this.checkSetup();

	// Interact with the document
	this.signInButton = document.getElementById('sign-in-button');
	this.signOutButton = document.getElementById('sign-out-button');
	this.userPic = document.getElementById('user-pic');
	this.stringName = document.getElementById('string-name');
	this.userName = document.getElementById('user-name');
	this.userEmail = document.getElementById('user-email');
	this.courseForm = document.getElementById('course-form');
	this.submitButton = document.getElementById('submit');
	this.userCoursesButton = document.getElementById('collection');
	this.hideUserCoursesButton = document.getElementById('hide-user-courses');
	this.userCoursesBadge = document.getElementById('user-courses-badge');
	this.userCourses = document.getElementById('user-courses-list');
	this.courseContainer = document.querySelector('#course-container');
	this.courses = document.querySelector('#courses');
	this.userInput = document.getElementById('user-input');
	this.subscribeButton = document.getElementById('push-button');
	this.sorting = document.getElementById('sorting');
	this.userBuildingSplash = document.querySelector('#user-building-splash');
	this.userBuildingSelect = document.querySelector('#user-building-select');
	this.userBuildingSubmit = document.querySelector('#user-building-splash-submit');
	this.changeSchoolButton = document.getElementById('change-school-button');
	this.adminButton = document.getElementById('admin-button');

	// navigation
	this.navbar = document.querySelector('.navbar-fixed');

	// parent row elements
	this.loggedIn = document.querySelector('#logged-in');
	this.loggedOut = document.querySelector('#logged-out');

	// Do stuff when buttons are clicked
	this.signOutButton.addEventListener('click', this.signOut.bind(this));
	this.signInButton.addEventListener('click', this.signIn.bind(this));
	this.userCoursesButton.addEventListener('click', this.showUserClasses.bind(this));
	this.hideUserCoursesButton.addEventListener('click', this.hideUserClasses.bind(this));
	this.userBuildingSubmit.addEventListener('click', this.registerUserBuilding.bind(this));
	this.changeSchoolButton.addEventListener('click', this.changeSchool.bind(this));

	// listen for the registration button
	this.submitButton.dataset.tooltip = 'No courses selected.';
	this.courseForm.addEventListener('submit', this.register.bind(this));

	this.initFirebase();
}

/**
 * PDReg.prototype.initFirebase - Connect to firebase
 *
 */
PDReg.prototype.initFirebase = function() {
	this.auth = firebase.auth();
	this.database = firebase.database();

	this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
};

/**
 * PDReg.prototype.signOut - Sign out of the current user
 */
PDReg.prototype.signOut = function() {
	// hide logged in elements
	this.loggedIn.classList.add('hidden');
	this.navbar.classList.add('hidden');
	
	this.auth.signOut().then(() => {
		this.loggedOut.classList.remove('hidden');
	});
};

/**
 * PDReg.prototype.signIn - Sign into a Google account with Firebase OAuth2 API
 *
 */
PDReg.prototype.signIn = function() {
	var provider = new firebase.auth.GoogleAuthProvider();
	provider.setCustomParameters({
		hd: 'elkhart.k12.in.us',
	});
	this.auth.signInWithPopup(provider).then(() => {
		M.toast({
			html: 'Signed in successfully',
			classes: 'green'
		});
	}).catch((err) => {
		let code = err.code;
		M.toast({
			html: `Error ${code}: ${err.message}`,
			classes: 'red'
		});
	});
};

/**
 * PDReg.prototype.checkSignedInWithMessage - Check that a user is signed in.
 *
 * @return {Boolean}
 */
PDReg.prototype.checkSignedInWithMessage = function() {
	if (this.auth.currentUser) {
		return true;
	}
};

PDReg.prototype.registerUserBuilding = function() {
	var building = document.getElementById('user-building-select').value;
	var user = firebase.auth().currentUser;

	this.database
		.ref('users/' + user.uid)
		.update({ building: building, email: user.email, name: user.displayName })
		.then(() => {
			this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
		});
};

/**
 * PDReg.prototype.onAuthStateChanged - Listen for sign in/out events
 *
 * @param  {Object} user authenticated user object from the firebase auth API
 */
PDReg.prototype.onAuthStateChanged = function(user) {

	if (!user) {

		// Show the login splash page
		this.loggedOut.classList.remove('hidden'); // parent
		this.loggedOut.querySelector('#login-splash').classList.remove('hidden'); // login

	} else {
		return firebase
			.database()
			.ref('users/' + user.uid)
			.once('value')
			.then(
				function(snap) {

					// Deal with the parent containers first.
					this.loggedOut.classList.add('hidden');
					this.loggedIn.classList.remove('hidden');

					const userData = snap.val();
					if (user && !snap.hasChild('building')) {
						this.userBuildingSplash.classList.remove('hidden');
					} else if (user && snap.hasChild('building')) {
						this.navbar.classList.remove('hidden');
						this.loggedIn.classList.remove('hidden');
						this.courseContainer.classList.remove('hidden');

						Promise.all([
							this.database
								.ref('admins')
								.orderByKey()
								.equalTo(user.email.split('@')[0])
								.once('value'),
							this.database
								.ref('trainers')
								.orderByKey()
								.equalTo(user.email.split('@')[0])
								.once('value'),
						]).then(
							function(snaps) {
								var admins = snaps[0];
								var trainers = snaps[1];
								if (admins.exists() | trainers.exists()) {
									this.adminButton.classList.remove('hidden');
								}
							}.bind(this)
						);

						// User is signed in and registered with a building
						// Get profile pic and user's name from the Firebase user object.
						var userName = user.email.split('@')[0];
						document.querySelector('#user-location').textContent = userData.building;
						
						// Set the user's profile picture and name.
						// this.userPic.setAttribute('src', profilePicUrl);
						// this.userEmail.innerHTML = `<i class="material-icons">email</i>${user.email}`;

						this.stringName.textContent = user.displayName;
						this.courseForm['name'].value = user.displayName;
						this.courseForm['email'].value = user.email;
						this.courseForm['userName'].value = userName;

						this.sorting.classList.remove('hidden');
						this.userBuildingSplash.classList.add('hidden');
						this.submitButton.classList.remove('hidden');

						// this.userClasses(userName);
						console.log('loading courses');
						this.getAllClasses();

						setTimeout(() => {
							this.handleScroll();
						}, 1000);
						// console.log('finished loading courses');
						// console.log('handling scroll');
						// this.handleScroll();
					}
				}.bind(this)
			);
	}
};

PDReg.prototype.changeSchool = function() {
	this.courseContainer.classList.add('hidden');
	this.sorting.classList.add('hidden');
	this.userBuildingSplash.classList.remove('hidden');
	var user = firebase.auth().currentUser;
	this.database.ref('users/' + user.uid).update({ building: null });
	this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
};

/**
 * PDReg.prototype.register - description
 *
 * Push checked inputs to /users and /courses tables in firebase
 * This is pushing plaintext usernames right now.
 *
 * @param  {Object} e form data
 */
PDReg.prototype.register = function(e) {
	e.preventDefault();
	var form = this.courseForm;
	var classes = [];
	var user = firebase.auth().currentUser;

	for (var i = 0; i < form.elements.length; i++) {
		if (form.elements[i].checked) {
			var title = form.elements[i].parentElement.querySelector('.card-title').innerHTML;
			var id = form.elements[i].value;
			classes.push({ title, id });
		} 
	}

	if(classes.length === 0) {
		M.toast({
			html:
				'Please select at least one course to register for!',
			classes: 'red',
		});
	}

	var buildNewRegCourse = function(snapshot) {
		var course = snapshot.val();
		course.key = snapshot.key;

		var parentDiv = document.querySelector('#user-courses-list');

		if (!parentDiv.querySelector('[id=\'user_' + course.key + '\']')) {
			var start = format(course.start);
			var end = formatEnd(course.end);
			var container = document.createElement('div');
			container.innerHTML = `
			<div class="info">
				<span class="title">${course.title}</span>
				<span class="date">${start} - ${end}</span>
				<span class="link"><a href="${course.redirect}">View session calendar details</a></span>
				<span class="location">${course.loc}</span>
				<span class="description">${course.desc}</span>
				<span class="contact"><a href='mailto:${course.pocEmail}?subject=${course.title}'>${course.poc}</a></span>
			</div>
			<a class="cancel secondary-content">cancel</a>`;

			container.setAttribute('id', 'user_' + course.key);
			container.setAttribute('class', 'collection-item');
			container.getElementsByTagName('a')[0].setAttribute('id', 'cancel_' + course.key);

			parentDiv.appendChild(container);

			container.querySelector('.cancel').addEventListener('click', this.cancel.bind(this));
		}
	}.bind(this);

	var postTheClass = function(classes) {
		// var promises = [];
		classes.forEach(function(item) {
			firebase
				.database()
				.ref('courses/' + item['id'] + '/members/' + user.uid)
				.set({ email: user.email, name: user.displayName })
				.then(function() {
					firebase
						.database()
						.ref('courses/' + item['id'])
						.once('value')
						.then(function(snap) {
							document.querySelector('#courses').removeChild(document.getElementById(snap.key));
							M.toast({ html: 'Successfully registered for ' + item['title'] });
							firebase
								.database()
								.ref('users/' + user.uid + '/regs/' + item['id'])
								.set({ title: item['title'] });
							buildNewRegCourse(snap);
						});
				})
				.catch(function(e) {
					console.log('error!', e);
					M.toast({
						html:
              'Registration failed for ' + item['title'] + '. Please check your registration code',
						classes: 'red',
					});
				});
		});
	};

	postTheClass(classes);

	// Update the UI with the number of user registrations
	this.database.ref('users/' + user.uid + '/regs').on(
		'child_changed',
		function(snapshot) {
			this.userCoursesBadge.textContent = snapshot.numChildren();
		}.bind(this)
	);
};

/**
 * PDReg.prototype.buildUserClasses - Create all classes the user is registered for to populate the sidebar
 *
 * @param  {Object} course Course object data as JSON to create DOM elements
 */
PDReg.prototype.buildUserCourse = function(course) {

	var parentDiv = document.getElementById('user-courses-list');

	if (!parentDiv.querySelector('[id=\'user_' + course.key + '\']')) {
		var start = format(course.start);
		var end = formatEnd(course.end);
		var container = document.createElement('div');
		container.innerHTML = `
			<div class="info">
				<span class="title">${course.title}</span>
				<span class="date">${start} - ${end}</span>
				<span class="link"><a href="${course.redirect}">Add the session to your calendar</a></span>
				<span class="location">${course.loc}</span>
				<span class="description">${course.desc}</span>
				<span class="contact"><a href='mailto:${course.pocEmail}?subject=${course.title}'>${course.poc}</a></span>
			</div>
			<a class="cancel secondary-content">cancel</a>`;

		container.setAttribute('id', 'user_' + course.key);
		container.setAttribute('class', 'collection-item');
		container.getElementsByTagName('a')[0].setAttribute('id', 'cancel_' + course.key);

		parentDiv.appendChild(container);

		container.querySelector('.cancel').addEventListener('click', this.cancel.bind(this));
	}
};

PDReg.prototype.showUserClasses = function() {
	document.getElementById('user-courses-head').innerHTML =
    `<p>${firebase.auth().currentUser.displayName} - My Registrations</p>`;
	document.getElementById('user-courses-wrap').classList.toggle('hidden');
};

PDReg.prototype.hideUserClasses = function() {
	document.getElementById('user-courses-wrap').classList.toggle('hidden');
};

/**
 * PDReg.prototype.buildCourse - Create DOM elements for all courses open for registration
 *
 * @param  {Object} course JSON object with course data to create a DOM element
 */
PDReg.prototype.buildCourse = function(course, userIsRegistered) {

	var parentDiv = document.querySelector('#courses');

	if (!parentDiv.querySelector('[id=\'' + course.key + '\']')) {
		var container = document.createElement('div');
		container.innerHTML = `
				<div class="card-content">
					<label for="card-${course.key}">
						<input name="course" class="filled-in course-checkbox" value="${course.key}" id="card-${course.key}" type="checkbox" />
						<span class="sort-title card-title grey-text text-darken-4">${course.title}</span>
					</label>
					<span class="date">
						<b>${format(course.start)} - ${formatEnd(course.end)}</b>
					</span>
						<span class="card-desc">${course.desc}</span>
					</div>
					<div class="card-action">
					<a class="btn btn-flat blue-text activator" data-title="${course.title}">Session Details</a>
					<a class="btn btn-flat blue-text course-share-link" data-target="link-${course.key}">
						Copy course link
					</a>
					<input name="share" id="link-${course.key}" type="text" value="https://elkhart-pd-signup.web.app?course=${course.key}" autofocus="autofocus" />
				</div>
				<div class="card-reveal">
				<span class="card-title grey-text- text-darken-4"><i class="material-icons right">close</i></span>
				<div class="details">
						<span class="seats">Seats: ${course.seats}</span>
						<span class="contact">Contact: <a href="mailto:${course.pocEmail}?subject=${course.title}">${course.poc}</a></span>
						<span class="type">PD type: ${course.type}</span>
						<span class="location">Location: ${(course.loc) ? course.loc : 'Virtual'}</span>
					</div>
				</div>
		`;

		container.setAttribute('id', course.key);
		container.setAttribute('class', 'card class-container');
		container.dataset.title = course.title;

		parentDiv.appendChild(container);
		// Add an event listener when the element is created
		container.querySelector(`#link-${course.key}`).style.display = 'none';
		container.querySelector('.course-share-link').addEventListener('click', getTargetUrl);

		
		if (course.seats <= 0) {
			container.querySelector(`#card-${course.key}`).setAttribute('disabled', true);
			container.querySelector('.card-title').innerHTML += ' - Session full';
		}

		if(userIsRegistered) {
			container.querySelector(`#card-${course.key}`).setAttribute('disabled', true);
			container.querySelector('.card-title').innerHTML += ' - Registered';
		}
	}
};

PDReg.prototype.handleScroll = function() {
	let urlParams = new URLSearchParams(window.location.search);
	if(urlParams.get('course')) {
		let target = urlParams.get('course');
		let el = document.getElementById(`${target}`);
		if(!el) {
			return;
		}
		window.scroll(0, el.offsetTop - 70);
	}
};

/**
 * PDReg.prototype.checkSetup - Display an error message if firebase is not configured correctly
 *
 * @returns {type}  description
 */
PDReg.prototype.checkSetup = function() {
	if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
		window.alert(
			'You have not configured and imported the Firebase SDK. ' +
        'Make sure you go through the codelab setup instructions and make ' +
        'sure you are running the codelab using `firebase serve`'
		);
	}
};

/**
 * PDReg.prototype.getAllClasses - Get the user's courses as an array of JSON objects from Firebase
 *
 * @param  {String} userName The current signed in user
 */
PDReg.prototype.getAllClasses = function() {
	return new Promise((resolve, reject) => {

		this.database = firebase.database();
		var uid = firebase.auth().currentUser.uid;
	
		var today = new Date().toISOString();
		document.querySelector('#courses').innerHTML = '';
	
		this.classesRef = this.database.ref('courses/');
	
		this.userRef = this.database.ref('users/' + uid + '/regs');
	
		var setClass = function(snapshot) {
			let userIsRegistered = false;
			var course = snapshot.val();
			course.key = snapshot.key;
			
			if (course.members && course.members.hasOwnProperty(uid)) {
				this.buildUserCourse(course);
				userIsRegistered = true;
			} 
			if(course.start > today) {
				this.buildCourse(course, userIsRegistered);
			}
	
		}.bind(this);
	
		this.userRef.on('value', function(snapshot) {
			document.getElementById('user-courses-badge').textContent = snapshot.numChildren();
		});
	
		// Listen to the ref and process any changes in the frontend
		this.classesRef.orderByChild('start').on('child_added', setClass);
		resolve('Done!');
		reject('Something went wrong');
	});
};

/**
 * PDReg.prototype.cancel - Remove a user's course from the databse
 *
 * @param  {Object} e Course data to remove from Firebase
 * @returns {type}   description
 */
PDReg.prototype.cancel = function(e) {
	var uid = firebase.auth().currentUser.uid;
	this.auth = firebase.auth().currentUser.email;

	let userCourse = e.target.parentNode;
	let id = userCourse.id.split('_')[1];

	// All classes database and user registration child
	this.classesRef = this.database.ref('courses/' + id + '/members/' + uid);

	// User registrations index and child
	this.userRef = this.database.ref('users/' + uid + '/regs/' + id);
	this.userChild = this.userRef.child('users/' + uid);

	this.classesRef.set(null);
	this.userRef.set(null);

	// Don't limit removal of the child element by the parent selector
	if(userCourse.parentNode) {
		userCourse.parentNode.removeChild(userCourse);
	}

	this.database.ref('users/' + uid + '/regs').on(
		'value',
		function(snapshot) {
			this.userCoursesBadge.textContent = snapshot.numChildren();
		}.bind(this)
	);

	// Listen to changes in the ref an update accordingly.
	this.database.ref('courses/' + id).on(
		'value', 
		function(snapshot) { 
			var course = snapshot.val();
			course.key = snapshot.key;
			this.buildCourse(course);
		}.bind(this)
	);
};

/**
 *  Load the PDReg Class and initialize Firebase.
 */
window.onload = function() {
	window.pdReg = new PDReg();
};

