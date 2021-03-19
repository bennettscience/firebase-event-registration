document.addEventListener('DOMContentLoaded', function() {
	loadSchools();
	
	// Load dropdown menu settings
	const dropOptions = {
		constrainWidth: false,
		coverTrigger: false,
	};
	var dropdowns = document.querySelectorAll('.dropdown-trigger');
	M.Dropdown.init(dropdowns, dropOptions);

	// // Load form selects
	const selectOpts = {};
	var selects = document.querySelectorAll('select');
	M.FormSelect.init(selects, selectOpts);
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


document.addEventListener('keydown', function(e) {
	if (e.key === 'Escape') {
		if (document.querySelector('#user-courses-list').classList.contains('hidden')) {
			return false;
		} else {
			document.querySelector('#user-courses-wrap').classList.add('hidden');
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

// Listen for course click and update the submit tooltop
let courseForm = document.querySelector('#course-form');
let submitButton = document.querySelector('#submit');

if(courseForm) {
	courseForm.addEventListener('click', updateSubmitTooltip);
}

function updateSubmitTooltip(e) {
	let plural;

	// Watch for clicks on the input box only.
	if(e.target.classList.contains('filled-in')) {
		var els = courseForm.querySelectorAll('input[type=\'checkbox\']:checked');
    
		if(els.length > 0) {
			(els.length === 1) ? plural = 'course' : plural = 'courses';
			submitButton.dataset.tooltip = `Register for ${els.length} ${plural}`;
		} else {
			submitButton.dataset.tooltip = 'No courses selected.';
		}
    
	}
  
}

async function getTargetUrl(e) {
	e.preventDefault();
	let el = e.target;

	let url = document.querySelector(`#${el.dataset.target}`).value;

	copyToClipboard(url, el);
}

function copyToClipboard(url, el) {

	// This is async!
	try {
		navigator.clipboard.writeText(url).then(
			function() {
				alert('Workshop URL copied to clipboard.');
			}
		);
	} catch(err) {
		document.querySelector(`#${el.dataset.target}`).style.display = 'block';
	}
			
}