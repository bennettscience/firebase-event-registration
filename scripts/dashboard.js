function Dashboard() {
	this.teachers = document.querySelector('teachers');
	this.runButton = document.getElementById('run-button');
	this.course = document.querySelectorAll('.wkshp-title');

	// Listen for the loading call and return the appropriate function
	this.runButton.addEventListener('click', function() {
		var runType = document.getElementById('run-button-type');
		var filter = document.getElementById('range-select').value;
		let filterDate = document.getElementById('date-select').value;

		if(runType.options[runType.selectedIndex].value == 'admin') {
			this.findAdminCourses(filter, filterDate);
		} else {
			this.findTrainerCourses(filter, filterDate);
		}
	}.bind(this));

	this.initFirebase();
}

// The user should still be logged in, but if they aren't,
// they can log in here.
Dashboard.prototype.initFirebase = function() {
	this.auth = firebase.auth();
	this.database = firebase.database();

	this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
};

Dashboard.prototype.onAuthStateChanged = function(user) {
	if(!user) {
		this.signIn().bind(this);
	}
};

// List all participants for a course if you're a trainer
Dashboard.prototype.findTrainerCourses = function(filter, filterDate) {
	let courseDb = this.database.ref('courses/');
	const parent = document.getElementById('placeholder');
	let dateInput = document.getElementById('date-select').value;
	let promise;
	let html;
	let currentUser;

	let today = new Date().toISOString();

	if(!filterDate) {
		if (filter === 'past') {
			promise = courseDb.orderByChild('start').endAt(today).once('value');
		} else if (filter === 'future') {
			promise = courseDb.orderByChild('start').startAt(today).once('value');
		} else {
			M.toast({ html: 'Something strange happened.', classes: 'red' });
		}
	} else {
		promise = courseDb.orderByKey().startAt(dateInput).once('value');
	}

	parent.innerHTML = '';

	// Get all the courses listed
	return promise.then(function(snap) {
		var courses = [];

		// Get sessions with teachers signed up
		snap.forEach(function(c){

			if(c.val().pocEmail.split('@')[0] == firebase.auth().currentUser.email.split('@')[0]) {
				let course = {};
				course.id = c.key;
				course.start = c.val().start;
				course.title = c.val().title;

				if(c.val().members !== undefined) {
					course.users = c.val().members;
				} else {
					course.users = [];
				}
				courses.push(course);
			}
      
		});

		if(courses.length === 0) {
			if(filter === 'past') {
				html = 'No past courses found under your name. Try searching upcoming courses.';
			} else if(filter === 'future') {
				html = 'No upcoming courses found under your name. Try searching past courses.';
			}
			M.toast({html: html, classes: 'red'});
			return;
		}

		// Return an array of promises to process in the browser
		return Promise.all(courses);
	}).then(async function(courses) {
    
		if(!courses) return;
		let course;
    
		currentUser = firebase.auth().currentUser.email;
    
		// For each course...
		for(course of courses) {

			// Destructure the course object for easier handling
			var { id, title, users } = course;

			// Map the teachers in the course into an array for looping
			if(Object.values(users)) {
        
				var userArray = Object.values(users).map(function(key) {
					return key;
				});
        
				// sort the users by last name
				let compare = function (a, b) {
					let nameA = a.name.split(' ')[1].toLowerCase();
					let nameB = b.name.split(' ')[1].toLowerCase();

					let diff = 0;
					if (nameA > nameB) {
						diff = 1;
					} else if (nameA < nameB) {
						diff = -1;
					} else {
						diff = 0;
					}
					return diff;
				};
        
				userArray.sort(compare);
        
			}


			// Concat a string of user emails for bulk actions
			var emailString = 'mailto:' + currentUser + '?bcc=';

			userArray.forEach(function(user) {
				emailString += user.email + ';';
			});

			// Look up the user building
			// see https://stackoverflow.com/questions/53159448/appending-div-with-async-promises
			await Promise.all(userArray.map(async function(user) {
				await firebase.database().ref('users/').orderByChild('email').equalTo(user.email).once('value', snapshot => {
					snapshot.forEach(async function(child) {
						return user.building = child.val().building;
					});
				});
			}));

			// Store the results in Session for CSV download.
			sessionStorage.setItem(`users-${course.id}`, JSON.stringify(userArray));

			// Create a container to hold the results
			// No need to check for empty arrays at this point
			var container = document.createElement('div');
			container.classList.add('course');
			container.setAttribute('data-id', course.id);

			// Set a template literal loop inside the forEach to make variable assignment simple
			// See more at https://gist.github.com/wiledal/3c5b63887cc8a010a330b89aacff2f2e
			container.innerHTML =
        `
            <span class="wkshp-title" onclick="Dashboard.prototype.updateSession('${ course.id}')" data-id="${course.id}"><h5><i class="material-icons">edit</i>${ course.title } - (${userArray.length})</h5></span>
            <span class="wkshp-date"><h6>${ smallFormat(course.start) }</h6></span>
            <a data-name="Send email" class="email" href="${emailString}" title="Send email"><i class="small material-icons">email</i></a>
            <i data-name="Download registrations" onclick="download_csv('users-${course.id}')" class="download small material-icons">cloud_download</i>
            <div class="teachers">
              <div class="list">
              ${ userArray.map((item) =>
		`<div class="list-item"><span class="teacher--name">${ item.name }</span><span class="teacher--building">${ item.building }</span></div>`
	).join('') }
              </div>
            </div>
        `;
			// Append the child array to the parent
			parent.appendChild(container);

		}
	});
};

Dashboard.prototype.findAdminCourses = function(filter) {
	const parent = document.getElementById('placeholder');
	let userDb = this.database.ref('users/');
	let courseDb = this.database.ref('courses/');
	let adminId = this.auth.currentUser.uid;
	let adminLocation;
	let today;
	let promise;

	today = new Date().toISOString();

	if(filter === 'past') {
		promise = Promise.all([userDb.once('value'), courseDb.orderByChild('start').endAt(today).once('value')]);
	} else if (filter === 'future') {
		promise = Promise.all([userDb.once('value'), courseDb.orderByChild('start').startAt(today).once('value')]);
	} else {
		M.toast({html: 'Something strange happened.', classes: 'red'});
	}
	// Empty anything in the parent div
	parent.innerHTML = '';

	// get all the data
	promise.then(function(snaps) {
		// snaps is an array of promise arrays that can be iterated
		// All the data is now stored in objects
		var users = snaps[0].val();
		var courses = snaps[1].val();

		// check for the admin location and set a variable
		if(users.hasOwnProperty(adminId)) {
			adminLocation = users[adminId]['building'];
		}

		// Loop through all of the courses.
		snaps[1].forEach(function(c) {
			var course = c.val();
			var regs = course.members;

			// If there are registrations, we need to extract those IDs and cross-reference locations
			// Create a new array of registration UIDs to pull from users
			if(regs) {
				var container = document.createElement('div'); // make a div to hold the course;
				container.classList.add('course');
				var teachers = [];
				var regsArr = Object.keys(regs).map(function(r) {
					return r;
				});

				// Now, loop this array and find the user and location in the users object.
				// Compare the user building with the admin building. If it exists, push the teacher.
				regsArr.forEach(function(u) {
					if(users.hasOwnProperty(u)) {
						if(users[u]['building'] == adminLocation || adminLocation === 'all') {
							teachers.push({'name': users[u]['name'], 'email': users[u]['email']});
						}
					}
				});

				// Now that there's an array of teachers for the building, sort them by last name
				teachers.sort(compare);

				// If the registrations length is > 0, write a new child to the doc.
				if(teachers.length > 0) {

					container.innerHTML =`
                <span class="wkshp-title"><h5>${ course.title } - (${teachers.length})</h5></span>
                <span class="wkshp-date"><h6>${ smallFormat(course.start) }</h6></span>
                <span class="email"></span>
                <div class="teachers">
                  <div class="list">
                  ${teachers.map((item) =>
		`<li><a href="mailto:${item.email}">${item.name}</a></li>`
	).join('')}
                  </div>
                </div>
              `;
					parent.appendChild(container);
				}
			}
		});
	});
};

Dashboard.prototype.getCurrentUserLocation = function(user) {
	var currentUid = this.auth.uid;
	this.database.ref('users/' + currentUid).on('value').then(function(snap) {
		var building = snap.val().building;
		return building;
	});
};

// Update the select course on click
Dashboard.prototype.updateSession = function(id) {
	currentUser = firebase.auth().currentUser.email;
	// start a form
	let form = document.createElement('form');
	form.setAttribute('class', 'course-update');
	form.setAttribute('data-courseid', `${id}`);
	let fields = ['title', 'desc', 'seats', 'start', 'end', 'loc', 'poc', 'pocEmail'];
	let container = document.querySelector(`[data-id="${id}"]`);

	// get the course from Firebase.
	course = firebase.database().ref('courses/' + id).once('value' , snap => {

		for(el in fields) {

			var d = document.createElement('div');

			if(fields[el] !== 'start' && fields[el] !== 'end') {
				d.setAttribute('class', 'input-field');

				var i = document.createElement('input');
				i.setAttribute('id', fields[el]);

				var l = document.createElement('label');
				l.setAttribute('for', fields[el]);
				l.setAttribute('class', 'active');
				l.innerText = fields[el];

				if(fields[el] === 'seats') {
					l.innerText = `Remaining ${fields[el]}`;
					i.setAttribute('type', 'number');
				} else {
					i.setAttribute('type', 'text');
				}

				i.value = snap.val()[fields[el]];
				d.appendChild(i);
				d.appendChild(l);
				form.appendChild(d);

			} else {
				// Ad-hoc create an input to update the start/stop times
				var rawDate = new Date(snap.val()[fields[el]]);

				var formattedDate = moment(rawDate).format('YYYY-MM-DD');
				var formattedTime = moment(rawDate).format('HH:mm', 'A');

				var label = document.createElement('label');
				label.setAttribute('for', fields[el]);
				label.setAttribute('class', 'active');

				label.innerText = fields[el];
        
				var i = document.createElement('input');
				i.setAttribute('type', 'date');
				i.setAttribute('id', fields[el]);
				i.value = formattedDate;
				d.setAttribute('class', 'input-field date');
				d.appendChild(label);
				d.appendChild(i);

				var timeDiv = document.createElement('div');
				timeDiv.setAttribute('class', 'input-field time');

				var t = document.createElement('input');
				t.setAttribute('type', 'time');
				t.setAttribute('id', `${ fields[el] }-time`);
				t.value = formattedTime;
        
				var tl = document.createElement('label');
				tl.setAttribute('for', `${ fields[el] }-time`);
				tl.innerText = `${ fields[el] } time`;
       
				timeDiv.appendChild(t);
				timeDiv.appendChild(tl);
				form.appendChild(d);
				form.appendChild(timeDiv);
			}
		}
		var s = document.createElement('button');
		s.setAttribute('class', 'btn');
		s.setAttribute('id', 'update-submit');
		s.setAttribute('type', 'submit');
		s.innerText = 'Submit';
		form.appendChild(s);

		var c = document.createElement('button');
		c.innerText = 'Cancel';
		c.setAttribute('class', 'btn red');
		c.setAttribute('value', 'cancel');
		c.setAttribute('onclick','return this.parentNode.remove()');
		form.appendChild(c);

	});
	document.querySelector('#placeholder').appendChild(form);
	// container.setAttribute('height', '100%')
	form.addEventListener('submit', postSessionUpdate);
}.bind(this);

const postSessionUpdate = function(event) {
	event.preventDefault();
	const form = document.querySelector('.course-update');

	// Call the function to get the form data.
	let data = formToJSON(form.elements);
  
	// Define the course ID
	data.id = form.dataset.courseid;

	// console.log(JSON.stringify(data, null, "  "));

	// Modify the start/stop into timestamps that firebase understands
	var startDate = moment(new Date(data['start'] + ' ' + data['start-time']));
	var endDate = moment(new Date(data['end'] + ' ' + data['end-time']));

	data['start'] = startDate.toISOString();
	data['end'] = endDate.toISOString();

	delete data['start-time'];
	delete data['end-time'];

	// console.log(JSON.stringify(data, null, "  "));


	// send it to Firebase
	firebase.database().ref('courses/' + data.id).update(data, function(error) {
		if(error) {
			alert('Something went wrong!' + error);
		} else {
			alert('The course updated!');
			return $('.course-update').remove();
		}
	});
}.bind(this);

const isValidInput = element => {
	return element.id && element.value;
};

const formToJSON = elements => {

	const reducerFunction = (data, element) => {
		if(isValidInput(element)) {
			data[element.id] = element.value;
		}
		return data;
	};

	const reduceInitialVal = {};

	console.log('Initial `data` value:', JSON.stringify(reduceInitialVal));

	const formData = [].reduce.call(elements, reducerFunction, reduceInitialVal);

	return formData;

};

const download_csv = function(obj) {
	console.log(obj);
	var data = JSON.parse(sessionStorage.getItem(obj));

	var headers = {
		name: 'Name'.replace(/,/g, ''), // remove commas to avoid errors
		email: 'Email',
		building: 'Building',
	};

	var itemsFormatted = [];

	data.forEach((item) => {
		console.log(item);
		itemsFormatted.push({
			name: item.name.replace(/,/g, ''), // remove commas to avoid errors,
			email: item.email,
			building: item.building,
		});
	});

	exportCSVFile(headers, itemsFormatted, 'Download');

  
}.bind(this);

function convertToCSV(objArray) {
	var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
	var str = '';

	for (var i = 0; i < array.length; i++) {
		var line = '';
		for (var index in array[i]) {
			if (line != '') line += ',';

			line += array[i][index];
		}

		str += line + '\r\n';
	}

	return str;
}

function exportCSVFile(headers, items, fileTitle) {
  
	if (headers) {
		items.unshift(headers);
	}

	// Convert Object to JSON
	var jsonObject = JSON.stringify(items);

	var csv = this.convertToCSV(jsonObject);

	var exportedFilenmae = fileTitle + '.csv' || 'export.csv';

	var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
	if (navigator.msSaveBlob) { // IE 10+
		navigator.msSaveBlob(blob, exportedFilenmae);
	} else {
		var link = document.createElement('a');
		if (link.download !== undefined) { // feature detection
			// Browsers that support HTML5 download attribute
			var url = URL.createObjectURL(blob);
			link.setAttribute('href', url);
			link.setAttribute('download', exportedFilenmae);
			link.style.visibility = 'hidden';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	}
}

window.onload = function() {
	window.dashboard = new Dashboard();
};
