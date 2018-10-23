
// TODO: Only expose if in the '/admins' or '/presenters' table
function Dashboard() {
  this.teacherButton = document.getElementById('get-teachers');
  this.courseButton = document.getElementById('get-courses');
  this.loginButton = document.getElementById('login-button');
  this.dateSelect = document.getElementById('date-select');
  this.teachers = document.querySelector('teachers');

  this.teacherButton.addEventListener('click', this.findCoursesByUser.bind(this));
  this.courseButton.addEventListener('click', this.findUsersByCourse.bind(this));
  this.loginButton.addEventListener('click', this.signIn.bind(this));

  this.initFirebase();
}

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

Dashboard.prototype.signIn = function() {
  let provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({
    'hd': 'elkhart.k12.in.us'
  })
  this.auth.signInWithPopup(provider);
};

Dashboard.prototype.findCoursesByUser = function() {
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
        document.getElementById('teachers').appendChild(container);
      });
    })
  });
}

// TODO: Bind the current object to the map function
Dashboard.prototype.findUsersByCourse = function(dateSelect) {
  var adminLocation;
  var adminId = this.auth.currentUser.uid;
  let container = document.createElement('div');
  var startDate = new Date(this.dateSelect.value).toISOString();

  var readUsers = function(snapshot) {
    var courses = [];
    snapshot.forEach((el) => {
      let regs = el.child('/members');
      if(regs.val() != null) {
        console.log(regs.val())
        let users = Object.keys(regs.val()).map(function(m) {
          return this.database.ref('users/' + m + '/name');
        });
        // container.innerHTML = `
        //   <div class="teacher"><a href="mailto:${email}">${ name }</a></div>
        //   <div class="courses">
        //     <ul class="courses-list">
        //     ${courses.join(0).split(0).map((item) => `
        //         <li>${item}.</li>
        //       `).join('')}
        //     </ul>
        //   </div>
        // `
      }
    })
  }
      // console.log(snap.child('/members').val())
  return this.database.ref('courses/').orderByChild('start').startAt(startDate).on('value', readUsers);
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
