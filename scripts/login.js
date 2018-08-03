function PDRegLogin() {
  this.checkSetup();

  this.signInButton = document.getElementById('sign-in-button')

  this.signInButton.addEventListener('click', this.signIn.bind(this));

  this.initFirebase();
}

PDRegLogin.prototype.checkSetup = function() {
  if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
    window.alert(`
      You have not configured and imported the Firebase SDK.
        Make sure you go through the codelab setup instructions and make
        sure you are running the codelab using firebase serve)`;
  }
}

PDRegLogin.prototype.initFirebase = function() {
  this.auth = firebase.auth();

  this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this))
}

PDRegLogin.prototype.signIn = function() {
  console.log('sign in clicked...')
  var provider = new firebase.auth.GoogleAuthProvider;
  this.auth.signInWithPopup(provider);
}

PDRegLogin.prototype.onAuthStateChanged = function(user) {
  console.log(user)
  if(user) {
    console.log('navigating to main');
    router.navigate('/main');
  }
}

document.onload = new PDRegLogin();
