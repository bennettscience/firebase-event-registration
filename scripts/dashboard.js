
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

// List all participants for a course if you're a trainer
Dashboard.prototype.findTrainerCourses = function() {
  var parent = document.getElementById('placeholder');
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
      snap.forEach(function(c){
        if(c.val().members && c.val().pocEmail.split('@')[0] == firebase.auth().currentUser.email.split('@')[0]) {
          courses.push({'start': c.val().start, 'title': c.val().title, 'users': c.val().members })
        }
      })

      if(courses.length === 0) {
        M.toast({html: 'No courses found under your name.', classes: 'red'});
        return;
      }

      // Return an array of promises to process in the browser
      return Promise.all(courses)
    }).then(async function(courses) {

      // For each course...
      for(course of courses) {

        // Destructure the course object for easier handling
        var { title, users } = course;

        // Map the teachers in the course into an array for looping
        var userArray = Object.values(users).map(function(key) {
          return key
        });

        // Concat a string of user emails for bulk actions
        var emailString = "mailto:"

        userArray.forEach(function(user) {
          emailString += user.email + ";"
        });

        // Look up the user building
        // see https://stackoverflow.com/questions/53159448/appending-div-with-async-promises
        await Promise.all(userArray.map(async function(user) {
          var building = await firebase.database().ref('users/').orderByChild('email').equalTo(user.email).once('value', snapshot => {
              snapshot.forEach(async function(child) {
                return user.building = child.val().building;
              })
          });
        }))

        console.log(userArray)
        // Create a container to hold the results
        // No need to check for empty arrays at this point
        var container = document.createElement('div');
        container.classList.add('course');

        // Set a template literal loop inside the forEach to make variable assignment simple
        // See more at https://gist.github.com/wiledal/3c5b63887cc8a010a330b89aacff2f2e
        container.innerHTML =
        `
            <span class="wkshp-title"><h5>${ course.title } - (${userArray.length})</h5></span>
            <span class="wkshp-date"><h6>${ smallFormat(course.start) }</h6></span>
            <a class="email" href="${emailString}">Send Email</a>
            <div class="teachers">
              <div class="list">
              ${ userArray.map((item) =>
                 `<div class="list-item"><span class="teacher--name">${ item.name }</span><span class="teacher--building">${ item.building }</span></div>`
              ).join('') }
              </div>
            </div>
        `
        // Append the child array to the parent
        parent.appendChild(container);

      }
    })
  }
}

Dashboard.prototype.findAdminCourses = function() {
  const parent = document.getElementById('placeholder');
  var userDb = this.database.ref('users/')
  var courseDb = this.database.ref('courses/')
  var adminId = this.auth.currentUser.uid;
  var adminLocation;
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
          var container = document.createElement('div') // make a div to hold the course;
          container.classList.add('course');
          var teachers = [];
          var regsArr = Object.keys(regs).map(function(r) {
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

              container.innerHTML =`
                <span class="wkshp-title"><h5>${ course.title }</h5></span>
                <span class="wkshp-date"><h6>${ smallFormat(course.start) }</h6></span>
                <span class="email"></span>
                <div class="teachers">
                  <div class="list">
                  ${teachers.map((item) =>
                    `<li><a href="mailto:${item.email}">${item.name}</a></li>`
                  ).join('')}
                  </div>
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
  var currentUid = this.auth.uid;
  var ref = this.database.ref('users/' + currentUid).on('value').then(function(snap) {
    var building = snap.val().building;
  });
  return building;
};

window.onload = function() {
  window.dashboard = new Dashboard();
}
