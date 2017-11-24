/*global jQuery, Handlebars, Router */
jQuery(function ($) {
	//execute some code when DOM is ready.
	// It makes $ the local variable and thus gracefully avoids the conflicts with any other variables which possibly use $ symbol.

	// Strict mode helps out in a couple ways:
	// It catches some common coding bloopers, throwing exceptions.
	// It prevents, or throws errors, when relatively "unsafe" actions are taken (such as gaining access to the global object).
	// It disables features that are confusing or poorly thought out.
	'use strict';

	Handlebars.registerHelper('eq', function (a, b, options) {
		//sets up handlebars 'helper' which is used in the HTML footer template by comparing filter 'a' with filter 'b'. If ===
		//it returns the default template of <a {{#eq filter 'all'}}class="selected"{{/eq}} href="#/:filter">All</a>
		//options.inverse() in this case returns no template
		return a === b ? options.fn(this) : options.inverse(this);
	});

	var ENTER_KEY = 13;
	var ESCAPE_KEY = 27;
	//explicitly stores important keycodes for more readable javascript
  
	var util = {
		uuid: function () { //generates random hash for unique todo identifier
			/*jshint bitwise:false */
				//bitwise is low level computer binary math that won't be obvious in the debugger
			var i, random;
			//initialise variables
			var uuid = '';
			//initialise empty string

			for (i = 0; i < 32; i++) {
				//sets up for loop with 32 iterations to create a 32-character hash code
				random = Math.random() * 16 | 0;
				//generates and stores a pseudo-random between 0 and, multiples by 16 to create integer between 0-15.99. '|' is a bitwise operator that doesn't require understanding
				if (i === 8 || i === 12 || i === 16 || i === 20) {
					uuid += '-';
					//if i = 8 OR 12 OR 16 OR 20 then set uuid to '-'
				}
				uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);

			}

			return uuid;
			//return uuid string
		},
		pluralize: function (count, word) {
			return count === 1 ? word : word + 's';
			//if value of count (passed in: activeTodoCount) is one return word (passed in: 'Item'). if value is NOT 1, (including 0) return words+'s', effectively pluralising this word
		},
		store: function (namespace, data) { //namespace is the localStorage name ('todos-jquery'), data is this.todos
			if (arguments.length > 1) { //if arguments include data then
				return localStorage.setItem(namespace, JSON.stringify(data)); //set the localStorage to JSON.stringify(params)
			} else { //if arguments don't include data
				var store = localStorage.getItem(namespace); //retrieve data from previously stored data
				return (store && JSON.parse(store)) || []; //if store is truthy && JSON.parse(store) is truthy, return parsed data, OR return empty array
			}
		}
	};

	var App = {
		init: function () {
			//at app start, initialise todos from localStorage
			this.todos = util.store('todos-jquery');
			
			this.todoTemplate = Handlebars.compile($('#todo-template').html()); //compile #todo-template and set to variable within app.object scope 'this.todoTemplate'. This is used in app.render().
			this.footerTemplate = Handlebars.compile($('#footer-template').html()); //compile #footer-template and set to variable within app.object scope 'this.footerTemplate'. This is used in app.renderFooter().
			this.bindEvents();

			new Router({ //Router is a part of directorjs
				'/:filter': function (filter) { //where URL is /':filter'
					this.filter = filter; //app.filter = the value of the URL
					this.render(); //call app.filter with updated app.filter value
				}.bind(this) //third Router parameter that sets 'this' to app.Object
			}).init('/all'); //chained method to set initial Router:filter value to '/all'
		},
		bindEvents: function () {
			$('#new-todo').on('keyup', this.create.bind(this));
			//toggleAll.bind sets the value of the callback to app.Object as otherwise jQuery will set this to the DOM element selected
			$('#toggle-all').on('change', this.toggleAll.bind(this));
			//on change of the (checkbox) value, call app.toggleApp. Chaining .bind(this) sets this to app.object and not $(selected)
			$('#footer').on('click', '#clear-completed', this.destroyCompleted.bind(this));
			//on click of the #clear-completed descendent button of the #footer parent element, call app.destroyCompleted. Chaining .bind(this) sets this to app.object and not $(selected)
			$('#todo-list') //select #todo-list and chain the following methods:
				.on('change', '.toggle', this.toggle.bind(this))
				//on change of the descendent .toggle class element (checkbox) value, call app.toggle
				.on('dblclick', 'label', this.switchToEditMode.bind(this))
				//on dblclick of the descendent label element value, call app.switchToEditMode
				.on('keyup', '.edit', this.editKeyup.bind(this))
				//on keyup of the descendent .edit class element (input), call app.editKeyup
				.on('focusout', '.edit', this.update.bind(this))
				//on focus out of the descendent .edit class element, call app.update
				.on('click', '.destroy', this.destroy.bind(this));
				//on click of the descendent .destroy class element (button), call app.destroy
		},
		render: function () {
			var todos = this.getFilteredTodos();
			//on rendering, set local var todos by filter
			$('#todo-list').html(this.todoTemplate(todos));
			//select #todo-list and set the HTML value to the todoTemplate (handlebars template), passing in todos for the handlebars 'for' loop and 'if' statement
			$('#main').toggle(todos.length > 0);
			//on 
			//the app.todo.completed property is !switched in the previous function, and then this line toggles the display of this data
			$('#toggle-all').prop('checked', this.getActiveTodos().length === 0);
			//if(this.getActiveTodos().length === 0) = true then call app.getActiveTodos
			this.renderFooter();
			$('#new-todo').focus();
		},
		renderFooter: function () {
			var todoCount = this.todos.length;
			//set todoCount to the length of the app.todos data object array
			var activeTodoCount = this.getActiveTodos().length;
			//call app.getActiveTodos (filters out completed Todos), run .length method and assign result to var activeTodoCount
			var template = this.footerTemplate({ //pass in following object to handlebars template
				activeTodoCount: activeTodoCount,
				//set activeTodoCount
				activeTodoWord: util.pluralize(activeTodoCount, 'item'),
				//call util.pluralize and set activeTodoWord
				completedTodos: todoCount - activeTodoCount,
				//set completedTodos with arithmetic
				filter: this.filter
				//set filter (app.filter previously set by filtering functions e.g. app.toggleAll)
			});

			$('#footer').toggle(todoCount > 0).html(template);
			//if todoCount > 0 then toggle display of the template
		},
		save: function () {
			util.store('todos-jquery', this.todos); //we pass in this.todos as, regardless of UI filter, we store ALL data before each render
		},
		toggleAll: function (e) { //e = jQuery event
			debugger;
			var isChecked = $(e.target).prop('checked'); //.prop sets property of selected element
			//forEach todo item change global todo object property to 'isChecked'
			this.todos.forEach(function (todo) {
				todo.completed = isChecked;
			});
			this.save();
			//render then handles this based on 'isChecked'.
			this.render();
		},
		getActiveTodos: function () {
			//return a filtered list of todo data
			return this.todos.filter(function (todo) { //where todo is current array object, filter out all array items if completed
				return !todo.completed; //if not completed, then they are active => return
			});
		},
		getCompletedTodos: function () {
			//return a filtered list of todo data
			return this.todos.filter(function (todo) { //where to do is current array object
				return todo.completed; //if completed, then they not active => return
			});
		},
		getFilteredTodos: function () {
			
			if (this.filter === 'active') {
		
				return this.getActiveTodos();
			} //if app.filter has previously been set to 'active' then call app.getActiveTodos. Parent function deals with the rendering

			if (this.filter === 'completed') {
				return this.getCompletedTodos();
			} //if app.filter has previously been set to 'completed' then call app.getCompletedTodos. Parent function deals with the rendering

			return this.todos;
			//if app.filter has previously been set to 'all', simply return an unchanged app.todos (ie do nothing)
		},
		destroyCompleted: function () {
			//
			this.todos = this.getActiveTodos(); //filters out completed todos, updates todos
			this.filter = 'all'; //sets filter to 'all' (template/router knowledge required)
			this.save();
			this.render(); //renders app page without completed todos (pseudo-delete)
		},
		// accepts an element from inside the `.item` div and
		// returns the corresponding index in the `todos` array
		indexFromEl: function (el) { //takes the selected element and return the corresponding data object position (app.todos[i])
			var id = $(el).closest('li').data('id');
			//select closest 'li' element to the passed in el value, retrieve the data 'id' attribute and store in var id
			var todos = this.todos;
			//replicate app.todos --> why???
			var i = todos.length;

			while (i--) { //equivalent to 'whilst i > 0' (if you can --, then i is still greater than 0, and this statement is )
				if (todos[i].id === id) {
					return i; //return value of i (todo array 'position') if it matches the stored id
				}
			}
		},
		create: function (e) {
			var $input = $(e.target); //store the selected element in a jQuery wrapped object
			var val = $input.val().trim(); //trim off outer spaces

			if (e.which !== ENTER_KEY || !val) {
				return; //if selected item is not empty OR the enter key was not pressed, do nothing
			}
			//else create new todo object, push into todo array
			this.todos.push({
				id: util.uuid(),
				title: val,
				completed: false
			});

			$input.val(''); //reset display to blank to reflect the removal of input data to the todo UI
			this.save();
			this.render(); //call app.render
		},
		toggle: function (e) {
			var i = this.indexFromEl(e.target);
			//get index value from the jQuery target element and assign it to var i
			this.todos[i].completed = !this.todos[i].completed;
			//change this todo index/position to completed if not completed, and not completed if completed (ie reverse boolean)
			this.save();
			this.render();
			//call app.render
		},
		switchToEditMode: function (e) { //--> better named as switchToEditMode or something, as this nmethod does not edit per se
			var $input = $(e.target).closest('li').addClass('editing').find('.edit');
			var inputVal = $input.val();
			$input.val(inputVal).focus();
		},
		editKeyup: function (e) { //-->
			if (e.which === ENTER_KEY) {
				e.target.blur(); //takes focus off the edit input element
			}

			if (e.which === ESCAPE_KEY) {
				$(e.target).data('abort', true).blur(); //look through docs/debugger on 'abort'
				//nb- why are we storing the data abort on the element itself and not an todos object property (ie associated by ID)
				//nb => answer to question, probably because this is a temporary UI event flag, not strictly a todos property that needs to persist. It would also clutter the todos object and make it harder to understand.
			}
		},
		update: function (e) {
			var el = e.target; //select and store event target
			var $el = $(el); //wrap target element in jQuery
			var val = $el.val().trim(); //trim out white space

			if (!val) { //if !val app assumes that the update is really a user attempt to delete
				this.destroy(e); //and so calls destroy
				return;
			}

			if ($el.data('abort')) { //if abort = true, make it false and this.render(); js:196 NB: if abort = true then don't make changes, basically
				$el.data('abort', false);
			} else {
				this.todos[this.indexFromEl(el)].title = val; //else update val of input, with the title only as the todo object already exists
			}

			this.save();
			this.render(); //re-render todo UI
		},
		destroy: function (e) {
			this.todos.splice(this.indexFromEl(e.target), 1); //start at position from indexFromEl and remove one element
			this.save();
			this.render(); //re-render todo UI
		}
	};

	App.init(); //initialise UI/data at page load
});