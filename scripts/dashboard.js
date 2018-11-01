
// TODO: Only expose if in the '/admins' or '/presenters' table
function Dashboard() {
  this.loginButton = document.getElementById('login-button');
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

  this.loginButton.addEventListener('click', this.signIn.bind(this));

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
// Remap results based on the leader of a course, not by location
Dashboard.prototype.findTrainerCourses = function() {
  let parent = document.getElementById('placeholder')
  var trainerId = this.auth.currentUser.uid;

  parent.innerHTML = ''

    return this.database.ref('courses/').once('value').then(function(snap) {
      var teachers = [];

      snap.forEach(function(c) {
        if(c.val().members) { teachers.push({'title': c.val().title, 'users': c.val().members }) }
      })

      return Promise.all(teachers)
    }).then(function(teachers) {
      teachers.forEach(function(course) {

        let { title, users } = course;

        let usrArray = Object.values(users).map(function(key) {
          return key
        });

        let container = document.createElement('div');

        // Set a template literal loop inside the forEach to make variable assignment simple
        // See more at https://gist.github.com/wiledal/3c5b63887cc8a010a330b89aacff2f2e
        container.innerHTML =
        `
          <div class="courses">${ course.title }</div>
          <div class="teachers">
            <ul class="teachers-list">
            ${usrArray.map((item) =>
              `<li><a href="mailto:${item.email}">${item.name}</a></li>`
            ).join('')}
            </ul>
          </div>
        `
        parent.appendChild(container);
    })
  });
  //   return this.database.ref('users/').once('value').then(function(users) {
  //     var teachers = [];
  //     users.forEach(function(child) {
  //       var user = child.val();
  //       if(user.building == adminLocation) {
  //         teachers.push(user)
  //       }
  //     })
  //     return Promise.all(teachers)
  //   }).then(function(teachers) {
  //     let result = teachers.filter(child => child.regs != undefined);
  //     result.forEach(function(el) {
  //
  //       let { name, email, building } = el;
  //
  //       let courses = Object.values(el.regs).map(function(key) {
  //         return key.title
  //       });
  //
  //       let container = document.createElement('div');
  //
  //       // Set a template literal loop inside the forEach to make variable assignment simple
  //       // See more at https://gist.github.com/wiledal/3c5b63887cc8a010a330b89aacff2f2e
  //       container.innerHTML = `
  //         <div class="teacher"><a href="mailto:${email}">${ name }</a></div>
  //         <div class="courses">
  //           <ul class="courses-list">
  //           ${courses.join(0).split(0).map((item) => `
  //               <li>${item}.</li>
  //             `).join('')}
  //           </ul>
  //         </div>
  //       `
  //       document.getElementById('placeholder').appendChild(container);
  //     });
  //   })
  // });
}

Dashboard.prototype.findAdminCourses = function() {
  const parent = document.getElementById('placeholder');
  let userDb = this.database.ref('users/')
  let courseDb = this.database.ref('courses/')
  let adminId = this.auth.currentUser.uid;
  let adminLocation;

  // Empty anything in the parent div
  parent.innerHTML = '';

  // get all the data
  Promise.all([
    userDb.once('value'),
    courseDb.once('value')
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
              <div class="courses">${ course.title }</div>
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
