
// Storage keys removed; now using server API for data
const initialData = {
	theme: "cyan-magenta",
	updatedAt: 0,
	calendarEvents: [],
	todos: [],
	projects: [],
	countdowns: []
};

const themes = {
	"cyan-magenta": {
		label: "Cyan Magenta",
		vars: {
			"--bg": "#0a0f1f",
			"--panel": "#111935",
			"--panel-2": "#0e1430",
			"--text": "#ecf6ff",
			"--muted": "#9cb5cc",
			"--accent": "#00f5ff",
			"--accent-2": "#ff2ce6",
			"--line": "rgba(138, 188, 255, 0.25)"
		}
	},
	"matrix-green": {
		label: "Matrix Green",
		vars: {
			"--bg": "#040b08",
			"--panel": "#0a1914",
			"--panel-2": "#06120e",
			"--text": "#dbffe8",
			"--muted": "#82c9a3",
			"--accent": "#00ff99",
			"--accent-2": "#62ff00",
			"--line": "rgba(110, 230, 156, 0.25)"
		}
	},
	"sunset-grid": {
		label: "Sunset Grid",
		vars: {
			"--bg": "#1a0b1e",
			"--panel": "#2b1236",
			"--panel-2": "#1b0d2a",
			"--text": "#ffeef8",
			"--muted": "#d3a0c7",
			"--accent": "#ff7f11",
			"--accent-2": "#ff3d81",
			"--line": "rgba(255, 166, 201, 0.25)"
		}
	},
	"ice-blue": {
		label: "Ice Blue",
		vars: {
			"--bg": "#071521",
			"--panel": "#10273a",
			"--panel-2": "#0a1b2a",
			"--text": "#eff9ff",
			"--muted": "#9ac3dd",
			"--accent": "#52d6ff",
			"--accent-2": "#7b8bff",
			"--line": "rgba(132, 202, 255, 0.25)"
		}
	},
	"voltage-red": {
		label: "Voltage Red",
		vars: {
			"--bg": "#15080c",
			"--panel": "#2a1117",
			"--panel-2": "#1d0b11",
			"--text": "#ffeef2",
			"--muted": "#d29ca6",
			"--accent": "#ff335f",
			"--accent-2": "#ffb703",
			"--line": "rgba(255, 140, 154, 0.25)"
		}
	}
};

let data = structuredClone(initialData);
let currentViewDate = new Date();

async function saveDataToServer() {
	data.updatedAt = Date.now();
	await fetch('/api/data', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data)
	});
}

async function loadDataFromServer() {
	try {
		const resp = await fetch('/api/data');
		if (resp.ok) {
			data = { ...structuredClone(initialData), ...(await resp.json()) };
		} else {
			data = structuredClone(initialData);
		}
	} catch (e) {
		data = structuredClone(initialData);
	}
}

function rerenderAll() {
	renderCalendar();
	renderTodos();
	renderProjects();
	renderCountdowns();
}

function applyTheme(themeId) {
	const theme = themes[themeId] || themes["cyan-magenta"];
	const themeChanged = data.theme !== themeId;
	Object.entries(theme.vars).forEach(([key, value]) => {
		document.documentElement.style.setProperty(key, value);
	});
	data.theme = themeId;
	saveDataToServer();
	renderThemeButtons();
}

function renderThemeButtons() {
	const container = document.getElementById("themeControls");
	container.innerHTML = "";
	Object.entries(themes).forEach(([id, theme]) => {
		const btn = document.createElement("button");
		btn.className = "theme-btn";
		btn.type = "button";
		btn.textContent = theme.label;
		btn.dataset.active = String(data.theme === id);
		if (data.theme === id) {
			btn.style.borderColor = "var(--accent)";
			btn.style.boxShadow = "var(--glow)";
		}
		btn.addEventListener("click", () => applyTheme(id));
		container.appendChild(btn);
	});
}

function dateKey(date) {
	return date.toISOString().slice(0, 10);
}

function parseLocalDate(key) {
	const [y, m, d] = key.split("-").map(Number);
	return new Date(y, m - 1, d);
}

function getEventsForDate(key) {
	return data.calendarEvents.filter((evt) => evt.date === key);
}

function addCalendarEvent(evt) {
	data.calendarEvents.push({
		id: crypto.randomUUID(),
		title: evt.title.trim(),
		type: evt.type,
		date: evt.date
	});
	saveDataToServer();
	renderCalendar();
}

function removeCalendarEvent(id) {
	data.calendarEvents = data.calendarEvents.filter((evt) => evt.id !== id);
	saveDataToServer();
	renderCalendar();
}

function renderCalendar() {
	const monthName = document.getElementById("monthName");
	const grid = document.getElementById("calendarGrid");
	const eventsCount = document.getElementById("eventsCount");

	const year = currentViewDate.getFullYear();
	const month = currentViewDate.getMonth();
	monthName.textContent = new Intl.DateTimeFormat("en-US", {
		month: "long",
		year: "numeric"
	}).format(currentViewDate);

	grid.innerHTML = "";
	["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((day) => {
		const wd = document.createElement("div");
		wd.className = "weekday";
		wd.textContent = day;
		grid.appendChild(wd);
	});

	const firstDay = new Date(year, month, 1);
	const startOffset = firstDay.getDay();
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const prevMonthDays = new Date(year, month, 0).getDate();

	const totalCells = 42;
	for (let i = 0; i < totalCells; i += 1) {
		let dayNumber;
		let cellDate;
		let muted = false;

		if (i < startOffset) {
			dayNumber = prevMonthDays - (startOffset - i - 1);
			cellDate = new Date(year, month - 1, dayNumber);
			muted = true;
		} else if (i >= startOffset + daysInMonth) {
			dayNumber = i - (startOffset + daysInMonth) + 1;
			cellDate = new Date(year, month + 1, dayNumber);
			muted = true;
		} else {
			dayNumber = i - startOffset + 1;
			cellDate = new Date(year, month, dayNumber);
		}

		const key = dateKey(cellDate);
		const events = getEventsForDate(key);
		const dayCell = document.createElement("div");
		dayCell.className = "day-cell" + (muted ? " muted-day" : "");

		const now = new Date();
		if (
			cellDate.getFullYear() === now.getFullYear() &&
			cellDate.getMonth() === now.getMonth() &&
			cellDate.getDate() === now.getDate()
		) {
			dayCell.classList.add("today");
		}

		const top = document.createElement("div");
		top.className = "day-top";
		const num = document.createElement("span");
		num.textContent = String(dayNumber);
		top.appendChild(num);
		if (events.length > 0) {
			const badge = document.createElement("span");
			badge.textContent = String(events.length);
			badge.className = "chip";
			top.appendChild(badge);
		}
		dayCell.appendChild(top);

		const eventContainer = document.createElement("div");
		eventContainer.className = "day-events";
		events.slice(0, 3).forEach((evt) => {
			const e = document.createElement("button");
			e.className = "evt " + evt.type;
			e.type = "button";
			e.title = "Click to remove";
			e.textContent = evt.title;
			e.addEventListener("click", () => {
				removeCalendarEvent(evt.id);
			});
			eventContainer.appendChild(e);
		});
		if (events.length > 3) {
			const more = document.createElement("div");
			more.className = "small";
			more.textContent = "+" + (events.length - 3) + " more";
			eventContainer.appendChild(more);
		}

		dayCell.appendChild(eventContainer);
		grid.appendChild(dayCell);
	}

	const inThisMonth = data.calendarEvents.filter((evt) => {
		const d = parseLocalDate(evt.date);
		return d.getMonth() === month && d.getFullYear() === year;
	}).length;
	eventsCount.textContent = inThisMonth + " events this month";
}

function addTodo(todo) {
	data.todos.push({
		id: crypto.randomUUID(),
		text: todo.text.trim(),
		category: todo.category,
		done: false
	});
	saveDataToServer();
	renderTodos();
}

function toggleTodo(id) {
	data.todos = data.todos.map((todo) =>
		todo.id === id ? { ...todo, done: !todo.done } : todo
	);
	saveDataToServer();
	renderTodos();
}

function removeTodo(id) {
	data.todos = data.todos.filter((todo) => todo.id !== id);
	saveDataToServer();
	renderTodos();
}

function renderTodos() {
	const list = document.getElementById("todoList");
	const stats = document.getElementById("todoStats");
	list.innerHTML = "";
	const doneCount = data.todos.filter((t) => t.done).length;
	stats.textContent = doneCount + "/" + data.todos.length + " complete";

	if (data.todos.length === 0) {
		list.innerHTML = '<li class="empty">No tasks yet</li>';
		return;
	}

	data.todos.forEach((todo) => {
		const li = document.createElement("li");
		li.className = "list-item";

		const top = document.createElement("div");
		top.className = "todo-top";

		const left = document.createElement("div");
		left.className = "todo-left";
		const check = document.createElement("input");
		check.type = "checkbox";
		check.checked = todo.done;
		check.addEventListener("change", () => toggleTodo(todo.id));

		const text = document.createElement("span");
		text.className = "todo-text" + (todo.done ? " todo-done" : "");
		text.textContent = todo.text;
		left.append(check, text);

		const right = document.createElement("div");
		right.className = "row";
		const cat = document.createElement("span");
		cat.className = "chip";
		cat.textContent = todo.category;
		const del = document.createElement("button");
		del.className = "danger";
		del.type = "button";
		del.textContent = "Delete";
		del.addEventListener("click", () => removeTodo(todo.id));
		right.append(cat, del);

		top.append(left, right);
		li.appendChild(top);
		list.appendChild(li);
	});
}

function addProject(project) {
	data.projects.push({
		id: crypto.randomUUID(),
		name: project.name.trim(),
		progress: Number(project.progress),
		dueDate: project.dueDate || ""
	});
	saveDataToServer();
	renderProjects();
}

function updateProjectProgress(id, progress) {
	data.projects = data.projects.map((project) =>
		project.id === id ? { ...project, progress } : project
	);
	saveDataToServer();
	renderProjects();
}

function removeProject(id) {
	data.projects = data.projects.filter((project) => project.id !== id);
	saveDataToServer();
	renderProjects();
}

function renderProjects() {
	const list = document.getElementById("projectList");
	list.innerHTML = "";

	if (data.projects.length === 0) {
		list.innerHTML = '<li class="empty">No projects yet</li>';
		return;
	}

	data.projects.forEach((project) => {
		const li = document.createElement("li");
		li.className = "list-item";

		const top = document.createElement("div");
		top.className = "todo-top";
		const title = document.createElement("strong");
		title.textContent = project.name;
		top.appendChild(title);

		const actions = document.createElement("div");
		actions.className = "row";
		const slider = document.createElement("input");
		slider.type = "range";
		slider.min = "0";
		slider.max = "100";
		slider.value = String(project.progress);
		slider.title = "Adjust progress";
		slider.addEventListener("input", (e) => {
			const value = Number(e.target.value);
			updateProjectProgress(project.id, value);
		});
		const del = document.createElement("button");
		del.type = "button";
		del.className = "danger";
		del.textContent = "Delete";
		del.addEventListener("click", () => removeProject(project.id));
		actions.append(slider, del);
		top.appendChild(actions);

		const meta = document.createElement("div");
		meta.className = "small";
		meta.textContent = project.progress + "% complete" + (project.dueDate ? " • due " + project.dueDate : "");

		const bar = document.createElement("div");
		bar.className = "progress";
		const fill = document.createElement("span");
		fill.style.width = project.progress + "%";
		bar.appendChild(fill);

		li.append(top, meta, bar);
		list.appendChild(li);
	});
}

function addCountdown(item) {
	data.countdowns.push({
		id: crypto.randomUUID(),
		name: item.name.trim(),
		date: item.date,
		type: item.type
	});
	saveDataToServer();
	renderCountdowns();
}

function removeCountdown(id) {
	data.countdowns = data.countdowns.filter((item) => item.id !== id);
	saveDataToServer();
	renderCountdowns();
}

function daysDiff(targetDate) {
	const now = new Date();
	const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const b = parseLocalDate(targetDate);
	const ms = b.getTime() - a.getTime();
	return Math.round(ms / 86400000);
}

function nextAnniversaryDate(originalKey) {
	const [_, m, d] = originalKey.split("-").map(Number);
	const now = new Date();
	let candidate = new Date(now.getFullYear(), m - 1, d);
	if (candidate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
		candidate = new Date(now.getFullYear() + 1, m - 1, d);
	}
	return candidate;
}

function renderCountdowns() {
	const list = document.getElementById("countdownList");
	list.innerHTML = "";

	if (data.countdowns.length === 0) {
		list.innerHTML = '<li class="empty">No countdowns or anniversaries yet</li>';
		return;
	}

	const sorted = [...data.countdowns].sort((a, b) => a.date.localeCompare(b.date));

	sorted.forEach((item) => {
		const li = document.createElement("li");
		li.className = "list-item";
		const top = document.createElement("div");
		top.className = "todo-top";

		const left = document.createElement("div");
		left.className = "todo-left";
		const title = document.createElement("strong");
		title.textContent = item.name;
		left.appendChild(title);

		const chip = document.createElement("span");
		chip.className = "chip";
		chip.textContent = item.type;

		const del = document.createElement("button");
		del.type = "button";
		del.className = "danger";
		del.textContent = "Delete";
		del.addEventListener("click", () => removeCountdown(item.id));

		top.append(left, chip, del);

		const info = document.createElement("div");
		info.className = "small";

		if (item.type === "countdown") {
			const diff = daysDiff(item.date);
			if (diff > 0) info.textContent = diff + " days left (" + item.date + ")";
			else if (diff === 0) info.textContent = "Today! (" + item.date + ")";
			else info.textContent = Math.abs(diff) + " days ago (" + item.date + ")";
		} else {
			const next = nextAnniversaryDate(item.date);
			const nextKey = dateKey(next);
			const diff = daysDiff(nextKey);
			info.textContent = "Next in " + diff + " days (" + nextKey + ")";
		}

		li.append(top, info);
		list.appendChild(li);
	});
}

function wireForms() {
	document.getElementById("calendarForm").addEventListener("submit", (e) => {
		e.preventDefault();
		const date = document.getElementById("eventDate").value;
		const title = document.getElementById("eventTitle").value;
		const type = document.getElementById("eventType").value;
		if (!date || !title.trim()) return;
		addCalendarEvent({ date, title, type });
		e.target.reset();
	});

	document.getElementById("todoForm").addEventListener("submit", (e) => {
		e.preventDefault();
		const text = document.getElementById("todoInput").value;
		const category = document.getElementById("todoCategory").value;
		if (!text.trim()) return;
		addTodo({ text, category });
		e.target.reset();
	});

	document.getElementById("projectForm").addEventListener("submit", (e) => {
		e.preventDefault();
		const name = document.getElementById("projectName").value;
		const progress = document.getElementById("projectProgress").value;
		const dueDate = document.getElementById("projectDue").value;
		if (!name.trim()) return;
		const normalizedProgress = Math.max(0, Math.min(100, Number(progress)));
		addProject({ name, progress: normalizedProgress, dueDate });
		e.target.reset();
	});

	document.getElementById("countdownForm").addEventListener("submit", (e) => {
		e.preventDefault();
		const name = document.getElementById("countdownName").value;
		const date = document.getElementById("countdownDate").value;
		const type = document.getElementById("countdownType").value;
		if (!name.trim() || !date) return;
		addCountdown({ name, date, type });
		e.target.reset();
	});
}

function wireCalendarNav() {
	document.getElementById("prevMonth").addEventListener("click", () => {
		currentViewDate = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() - 1, 1);
		renderCalendar();
	});
	document.getElementById("nextMonth").addEventListener("click", () => {
		currentViewDate = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + 1, 1);
		renderCalendar();
	});
}

async function init() {
	await loadDataFromServer();
	applyTheme(data.theme);
	wireForms();
	wireCalendarNav();
	rerenderAll();
}

init();
