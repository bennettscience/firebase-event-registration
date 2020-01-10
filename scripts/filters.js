document.addEventListener('DOMContentLoaded', function() {
	loadSchools();
	
	// Load dropdown menu settings
	const dropOptions = {
		constrainWidth: false,
		coverTrigger: false,
	};
	var dropdowns = document.querySelectorAll('.dropdown-trigger');
	M.Dropdown.init(dropdowns, dropOptions);

	// Load form selects
	const selectOpts = {};
	var selects = document.querySelectorAll('select');
	M.FormSelect.init(selects, selectOpts);

	loadSubmitBadge();
});

function loadSchools() {
	var el = document.querySelector('#user-building-select');
	var schools = [
		'Beardsley',
		'Beck',
		'Bristol',
		'Cleveland',
		'Daly',
		'Eastwood',
		'Feeser',
		'Hawthorne',
		'Monger',
		'Osolo',
		'Pinewood',
		'Riverview',
		'Roosevelt',
		'Woodland',
		'North Side',
		'Pierre Moran',
		'West Side',
		'Elkhart Academy',
		'Central',
		'Memorial',
		'EACC',
		'Community Education',
		'PACE',
		'Administration',
		'Tech Services',
		'Building Services',
		'Transportation',
		'School Without Walls',
	];
	var sorted = schools.sort();

	for (var i = 0; i < sorted.length; i++) {
		var opt = document.createElement('option');
		opt.text = sorted[i];
		opt.value = sorted[i];
		// opt = `<option value="${sorted[i]}">${sorted[i]}</option>`;
		el.append(opt);
	}
}


$(document).keydown(function(e) {
	if (e.keyCode == 27) {
		if ($('#user-courses-list').hasClass('hidden')) {
			return false;
		} else {
			$('#user-courses-wrap').addClass('hidden');
		}
	}
});

/**
 * Filter by title
 *
 * @event  keyup
 *
 * Searches for sessions by title
 */
$('.input-field input').on('keyup', function() {
	/**
   * @event Hide
   * @param {String} String input by the user.
   */
	// var dataLayer = [];
	$('.class-container').hide();
	var input = $(this)
		.val()
		.toUpperCase();
	$('.card-title').each(function() {
		var title = $(this)
			.text()
			.toUpperCase();
		if (title.indexOf(input) > -1) {
			$(this)
				.parents('.class-container')
				.show();
		}
	});

	this.onblur = function() {
		window.dataLayer.push({ event: 'search', searchTerm: this.value });
	};
});

// Filter by Danielson category
$('input[name=\'filterStatus\']').change(function() {
	var classes = [];

	$('input[name=\'filterStatus\']').each(function() {
		if ($(this).is(':checked')) {
			classes.push($(this).val());
		}
	});

	if (classes == '') {
		$('#allCourses .card').show();
	} else {
		$('#allCourses .card').hide();

		$('#allCourses .card').each(function() {
			var filter = [];
			var show = false;
			var card = $(this);

			filter = card.data('dan').split(',');

			var who = [];

			for (var n = 0; n < classes.length; n++) {
				if (filter.includes(classes[n])) {
					show = true;
				}
			}
			if (show) {
				card.show();
			}
		});
	}
});

/**
 * Clear the search form
 *
 * @listens Click
 *
 * Clears the search input
 */
$('#search-clear').on('click', function() {
	/**
   *  @param {Object} parent DOM object
   */
	$(this)
		.parent()
		.find('input')
		.val('');
	$('#search-form')
		.blur();
	$('.class-container').show();
});

$('#search-button').on('click', function() {
	$(this)
		.next();
	$('#search').focus();
});

// Format dates for sessions displayed in main container
function format(date) {
	var d = new Date(date);
	var m = moment(d).format('dddd, MMM D, YYYY, h:mm A');
	return m;
}

// Format dates for user list
function smallFormat(date) {
	var d = new Date(date);
	var m = moment(d).format('MM/D/YY - h:mm A');
	return m;
}

function formatEnd(date) {
	var d = new Date(date);
	var m = moment(d).format('h:mm A');
	return m;
}

// Frontend validation for session code
// Turns code field green if the key is correct, case sensitive
$('body').on('keyup', '.code :input', function() {
	var row = $(this)
		.closest('.card')
		.prop('id');
	var key = $(this).val();

	for (var key in codes) {
		if (codes[key].id === row) {
			// validates the length of the user-input code. If >0, require the checkbox.
			if ($(this).val().length > 0) {
				$(this)
					.closest('.card-content')
					.find('input:checkbox')
					.prop('required', true);
			} else {
				$(this)
					.closest('.card-content')
					.find('input:checkbox')
					.prop('required', false);
			}

			// Validate the code
			if (codes[key].code === $(this).val()) {
				$(this).css('background-color', '#32C192');
			} else {
				$(this).css('background-color', 'white');
			}
		}
	}
});

// Sort options - date, alphabetical
$('#title').on('click', function() {
	var divs = $('div.class-container');

	var alphabeticalDivs = divs.sort(function(a, b) {
		return String.prototype.localeCompare.call(
			$(a)
				.data('title')
				.toLowerCase(),
			$(b)
				.data('title')
				.toLowerCase(),
		);
	});

	var container = $('#allCourses');
	container
		.detach()
		.empty()
		.append(alphabeticalDivs);
	$('#course-form').append(container);
});

$('#date').on('click', function() {
	var divs = $('div.class-container');

	var dateDivs = divs.sort(function(a, b) {
		return new Date($(a).data('date')) - new Date($(b).data('date'));
	});

	var container = $('#allCourses');
	container
		.detach()
		.empty()
		.append(dateDivs);
	$('#course-form').append(container);
});

// Listen for course click and update the submit badge
let courseForm = document.querySelector('#course-form');
let submitBadge = document.querySelector('#submit-badge');

courseForm.addEventListener('click', updateSubmitBadge);

function updateSubmitBadge(e) {

	// Watch for clicks on the input box only.
	if(e.target.classList.contains('filled-in')) {

		var els = courseForm.querySelectorAll('input[type=\'checkbox\']:checked');
    
		// (els.length > 0) ? submitBadge.style.display = 'inline' : submitBadge.style.display = 'none';
    
		submitBadge.innerText = els.length;
    
	}
  
}

function loadSubmitBadge() {
	var els = courseForm.querySelectorAll('input[type=\'checkbox\']:checked');
  
	(els.length > 0) ? submitBadge.innerText = els.length : submitBadge.innerText = 0;

}

async function copyToClipboard(e) {
	e.preventDefault();
	let el = e.target;

	try {
		await navigator.clipboard.writeText(e.target.parentNode.getAttribute('href'));
		alert('Workshop URL copied to clipboard');
	} catch (err) {
		// alert('Failed to copy: ', err);
		console.log(`#link-${el.dataset.target}`);
		document.querySelector(`#${el.dataset.target}`).style.display = 'block';
		
	}
}