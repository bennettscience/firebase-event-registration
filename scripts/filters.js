
/**
 * Load sideNav script from materialize.js
 */

$(document).ready(function() {
  $(".sidenav").sidenav({
    draggable: true,
    edge: 'left',
    preventScrolling: true,
    isFixed: true
  });
})

$(document).ready(function() {
  var el = $("#user-building-select")
	var schools = ["Beardsley", "Beck", "Bristol", "Cleveland", "Daly", "Eastwood", "Feeser", "Hawthorne", "Monger", "Osolo", "Pinewood", "Riverview", "Roosevelt", "Woodland", "North Side", "Pierre Moran", "West Side", "Elkhart Academy",
			"Central", "Memorial", "EACC", "Community Education", "PACE", "Administration", "Services", "Transportation", "School Without Walls"
	];
	var sorted = schools.sort();

	for (var i = 0; i < sorted.length; i++) {
    var opt = document.createElement('option')
    opt.text = sorted[i];
    opt.value = sorted[i];
		opt = '<option value="' + sorted[i] + '">' + sorted[i] + '</option>'
    el.append(opt)
	}

	// el.appendChild(opt);

  $('#user-building-select').formSelect();
})

$(document).keydown(function(e) {
  if(e.keyCode == 27) {
      if($("#user-courses-list").hasClass('hidden')){
      return false;
    } else {
      $("#user-courses-wrap").addClass('hidden');
    }
  }
});


/**
 * getBg - Get a random header background
 *
 * @returns {String}  relative path to an image
 */
function getBg() {
  let sub = 'img/';
  let ext = '.png';

  let rand = Math.ceil(Math.random() * 7);

  return sub + rand + ext;
}


/**
 * Filter by title
 *
 * @event  keyup
 *
 * Searches for sessions by title
 */
$(".input-field input").on('keyup',function() {
  /**
   * @event Hide
   * @param {String} String input by the user.
   */

  $(".class-container").hide();
  var input = $(this).val().toUpperCase();
  $(".card-title").each(function() {
    var title = $(this).text().toUpperCase();
    if(title.indexOf(input) > -1) {
      $(this).parents(".class-container").show();
    }
  });
});

// Filter by Danielson category
$("input[name='filterStatus']").change(function() {
  var classes = [];

  $("input[name='filterStatus']").each(function() {
    if ($(this).is(':checked')) {
      classes.push($(this).val())
    }
  })

  if (classes == "") {
    $("#allCourses .card").show();
  } else {
    $("#allCourses .card").hide()

    $("#allCourses .card").each(function() {
      var filter = [];
      var show = false;
      var card = $(this);

      filter = card.data('dan').split(",");

      var who = [];

      for(var n=0; n<classes.length;n++) {
        if(filter.includes(classes[n])){
          show = true;
        }
      }
      if (show) {
        card.show()
      }
    })
  }
})


/**
 * Clear the search form
 *
 * @listens Click
 *
 * Clears the search input
 */
$("#search-clear").on('click', function() {
  /**
   *  @param {Object} parent DOM object
   */
  $(this).parent().find('input').val('');
  $("#search-form").toggleClass('hidden').blur()
  $(".class-container").show();
})

$("#search-button").on('click', function() {
  $(this).next().toggleClass('hidden')
  $("#search").focus()
})

$("#slide-out-button").on('click', function() {
  console.log('clicked')
  $('#slide-out').sidenav('open');
})

// Format dates for sessions displayed in main container
function format(date) {
  var d = new Date(date);
  var m = moment(d).format('dddd, MMM D, YYYY - h:mm A');
  return m;
}

// Format dates for user list
function smallFormat(date) {
  var d = new Date(date);
  var m = moment(d).format('MM/D/YY - h:00 A');
  return m;
}


// Frontend validation for session code
// Turns code field green if the key is correct, case sensitive
$("body").on("keyup",".code :input", function() {
  var row = $(this).closest('.card').prop('id');
  var key = $(this).val();

  for(var key in codes) {
    if(codes[key].id === row) {

      // validates the length of the user-input code. If >0, require the checkbox.
      if($(this).val().length > 0) {
        $(this).closest('.card-content').find('input:checkbox').prop('required', true);
      } else {
        $(this).closest('.card-content').find('input:checkbox').prop('required', false);
      }

      // Validate the code
      if(codes[key].code === $(this).val()) {
        $(this).css('background-color','rgba(0,255,0,0.4)');
      } else {
        $(this).css('background-color', 'white');
      }
    }
  }
});

// Sort options - date, alphabetical
$("#title").on('click', function() {
  $("#date").removeClass('active');
  $(this).addClass('active');

  var divs = $("div.class-container");

  var alphabeticalDivs = divs.sort(function(a, b) {
    return String.prototype.localeCompare.call($(a).data('title').toLowerCase(), $(b).data('title').toLowerCase());
  })

  var container = $("#allCourses");
  container.detach().empty().append(alphabeticalDivs)
  $("#course-form").append(container)
})

$("#date").on('click', function() {
  $("#title").removeClass('active');
  $(this).addClass('active');

  var divs = $("div.class-container");

  var dateDivs = divs.sort(function(a,b) {
    return new Date($(a).data('date')) - new Date($(b).data('date'));
  });

  var container = $("#allCourses")
  container.detach().empty().append(dateDivs)
  $("#course-form").append(container);
})
