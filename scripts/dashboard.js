
// TODO: Only expose if in the '/admins' or '/presenters' table
function Dashboard() {
  // this.loginButton = document.getElementById('login-button');
  this.dateSelect = document.getElementById('date-select');
  this.teachers = document.querySelector('teachers');

  this.runButton = document.getElementById('run-button');

  // Listen for the loading call and return the appropriate function
  this.runButton.addEventListener('click', function() {
    var runType = document.getElementById('run-button-type');
    if(runType.options[runType.selectedIndex].value == 'admin') {
      this.findAdminCourses();
    } else {
      this.findTrainerCourses();
    }
  }.bind(this))

  // this.loginButton.addEventListener('click', this.signIn.bind(this));

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
}

// Listen for the login click
Dashboard.prototype.signIn = function() {
  let provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({
    'hd': 'elkhart.k12.in.us'
  })
  this.auth.signInWithPopup(provider);
};

// List all participants for a course if you're a trainer
Dashboard.prototype.findTrainerCourses = function() {
  let parent = document.getElementById('placeholder')
  var trainerId = this.auth.currentUser.uid;
  var dateInput = document.getElementById('date-select').value;

  if(!dateInput) {
    M.toast({html: "Please enter a start date in the sidebar.", classes: 'red'})
  } else {
    var startDate = new Date(dateInput).toISOString();

    parent.innerHTML = ''

    // Get all the courses listed
    return this.database.ref('courses/').orderByChild('start').startAt(startDate).once('value').then(function(snap) {
      var courses = [];

      // Get sessions with teachers signed up
      snap.forEach(function(c) {
        if(c.val().members) { courses.push({'start': c.val().start, 'title': c.val().title, 'users': c.val().members }) }
      })

      // Return an array of promises to process in the browser
      return Promise.all(courses)
    }).then(function(courses) {

      console.log(courses)

      // For each course...
      courses.forEach(function(course) {

        // Destructure the course object for easier handling
        let { title, users } = course;

        // Map the teachers in the course into an array for looping
        let usrArray = Object.values(users).map(function(key) {
          return key
        });

        var emailString = "mailto:"

        usrArray.forEach(function(user) {
          emailString += user.email + ";"
        });

        console.log(emailString);

        // Create a container to hold the results
        // No need to check for empty arrays at this point
        let container = document.createElement('div');
        container.classList.add('course');

        // Set a template literal loop inside the forEach to make variable assignment simple
        // See more at https://gist.github.com/wiledal/3c5b63887cc8a010a330b89aacff2f2e
        container.innerHTML =
        `
            <span class="wkshp-title"><h5>${ course.title }</h5></span>
            <span class="wkshp-date"><h6>${ smallFormat(course.start) }</h6></span>
            <a class="email" href="${emailString}">Send Email</a>
            <div class="teachers">
              <ul class="teachers-list">
              ${usrArray.map((item) =>
                `<li>${item.name}</li>`
              ).join('')}
              </ul>
            </div>
        `
        // Append the child array to the parent
        parent.appendChild(container);
      })
    });
  }
}



Dashboard.prototype.findAdminCourses = function() {
  const parent = document.getElementById('placeholder');
  let userDb = this.database.ref('users/')
  let courseDb = this.database.ref('courses/')
  let adminId = this.auth.currentUser.uid;
  let adminLocation;
  var dateInput = document.getElementById('date-select').value;

  if(!dateInput) {
    M.toast({html: "Please enter a start date in the sidebar.", classes: 'red'})
  } else {
      var startDate = new Date(dateInput).toISOString()

    // Empty anything in the parent div
    parent.innerHTML = '';

    // get all the data
    Promise.all([
      userDb.once('value'),
      courseDb.orderByChild('start').startAt(startDate).once('value')
    ]).then(function(snaps) {
      // snaps is an array of promise arrays that can be iterated
      // All the data is now stored in objects
      var users = snaps[0].val();
      var courses = snaps[1].val()

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
          let container = document.createElement('div') // make a div to hold the course;
          let teachers = [];
          let regsArr = Object.keys(regs).map(function(r) {
            return r;
          })

          // Now, loop this array and find the user and location in the users object.
          // Compare the user building with the admin building. If it exists, push the teacher.
          regsArr.forEach(function(u) {
            if(users.hasOwnProperty(u)) {
              if(users[u]['building'] == adminLocation) {
                teachers.push({'name': users[u]['name'], 'email': users[u]['email']})
              }
            }
          })

          // If the registrations length is > 0, write a new child to the doc.
          if(teachers.length > 0) {

              container.innerHTML =
              `
                <h4>${ course.title }</h4>
                <div class="teachers">
                  <ul class="teachers-list">
                  ${teachers.map((item) =>
                    `<li><a href="mailto:${item.email}">${item.name}</a></li>`
                  ).join('')}
                  </ul>
                </div>
              `
              parent.appendChild(container);
          }
        }
      })
    })
  }
}

Dashboard.prototype.getCurrentUserLocation = function(user) {
  let currentUid = this.auth.uid;
  let ref = this.database.ref('users/' + currentUid).on('value').then(function(snap) {
    let building = snap.val().building;
  });
  return building;
};

window.onload = function() {
  window.dashboard = new Dashboard();
}
