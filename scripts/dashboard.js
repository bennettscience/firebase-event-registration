
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
  var adminLocation;
  var adminId = this.auth.currentUser.uid;

  return this.database.ref('users/' + adminId + '/building').once('value').then((snap) => {
    adminLocation = snap.val();
    return this.database.ref('users/').once('value').then(function(users) {
      var teachers = [];
      users.forEach(function(child) {
        var user = child.val();
        if(user.building == adminLocation) {
          teachers.push(user)
        }
      })
      return Promise.all(teachers)
    }).then(function(teachers) {
      let result = teachers.filter(child => child.regs != undefined);
      result.forEach(function(el) {

        let { name, email, building } = el;

        let courses = Object.values(el.regs).map(function(key) {
          return key.title
        });

        let container = document.createElement('div');

        // Set a template literal loop inside the forEach to make variable assignment simple
        // See more at https://gist.github.com/wiledal/3c5b63887cc8a010a330b89aacff2f2e
        container.innerHTML = `
          <div class="teacher"><a href="mailto:${email}">${ name }</a></div>
          <div class="courses">
            <ul class="courses-list">
            ${courses.join(0).split(0).map((item) => `
                <li>${item}.</li>
              `).join('')}
            </ul>
          </div>
        `
        document.getElementById('placeholder').appendChild(container);
      });
    })
  });
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


  // let adminBuilding, names, title, teachers;

  // let courses = [];
  // let users = [];
  //
  // Promise.all([
  //   userDb.once('value'),
  //   courseDb.once('value')
  // ])
  // // start with the admin building
  // return this.database.ref('users/' + adminId + '/building').once('value').then((admin) => {
  //   adminLocation = admin.val();
  //
  //   // get the courses with members, return an array of promises
  //   return courseDb.once('value').then(function(data) {
  //     data.forEach(function(e) {
  //       let course = e.val();
  //       if(course.hasOwnProperty('members')) {
  //         title = course.title;
  //         users = Object.keys(course.members).map(function(key) {
  //           return key;
  //         })
  //
  //         Promise.all(userDb.child())
  //         teachers = users.filter(function(u) {
  //           return userDb.child(u).once('value').then((snap) => {
  //             var userLocation = snap.val().building;
  //             console.log(userLocation)
  //           })
  //           userLocation == adminLocation
  //         })
  //         courses.push({'title': title, 'teachers': teachers})
  //       }
  //     })
  //     console.log(courses);
  //
  //

      // return the courses object for processing in the browser.
      //return Promise.all(courses)
    // }).then(function(courses) {
    //   courses.forEach(function(course) {
    //     // console.log(course)
    //     course.users.forEach(function(u) {
    //       // console.log(u)
    //       console.log(this.database)
    //       return this.database.ref('users/' + u).once('value').then((snap) => {
    //         console.log(snap.val())
    //     //     if(snap.val().building == adminLocation) {
    //     //       teachers.push(snap.val().name);
    //     //     }
    //       })
    //     })
    //   })
    //   return Promise.all(teachers);
    // }).then(function(teachers) {
    //   console.log(teachers);
    // });

  // });
}

// TODO: Bind the current object to the map function
// Dashboard.prototype.findAdminCourses = function(dateSelect) {
//   var adminLocation;
//   var adminId = this.auth.currentUser.uid;
//   let container = document.createElement('div');
//   var startDate = new Date(this.dateSelect.value).toISOString();
//
//   return this.database.ref('courses/').orderByChild('start').startAt(startDate).once('value').then((snap) => {
//     snap.forEach((el) => {
//       if(el.val().members) {
//         let usernames = [];
//         let users = Object.keys(el.val().members).map(function(m) {
//           return m;
//         });
//         users.forEach(function(n) {
//           this.database.ref('users/' + n).once('value').then((user) => {
//             teachers.push(user.name)
//           })
//           return Promise.all(usernames)
//         });
//       }
//       console.log(usernames);
//     });
    // console.log(users);
    //   let regs = el.child('/members');
    //   if(regs.val() != null) {
    //     let users = Object.keys(regs.val()).map(function(m) {
    //       return this.database.ref('users/' + m + '/name');
    //     });
    //     return Promise.all(users);
    //   }
    // })
    // console.log(users);
    // container.innerHTML = `
    //   <div class="teacher"><a href="mailto:${email}">${ name }</a></div>
    //   <div class="courses">
    //     <ul class="courses-list">
    //     ${courses.join(0).split(0).map((item) => `
    //         <li>${item}.</li>
    //       `).join('')}
    //     </ul>
    //   </div>
    //
//   })
// }

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
