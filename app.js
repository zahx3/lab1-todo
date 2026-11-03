// ===== Регулярні вирази для валідації =====
const textRegex = /^[^<>]{2,100}$/;
const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// ===== Клас задачі =====
class Task {
    constructor(text, date, priority) {
        this.id = crypto.randomUUID();
        this.text = text;
        this.date = date;
        this.priority = priority;
        this.done = false;
    }
}

// ===== Клас-менеджер колекції =====
class TaskManager {
    constructor() {
        // відновлення з localStorage
        this.tasks = JSON.parse(localStorage.getItem("my_tasks")) || [];
    }

    save() {
        localStorage.setItem("my_tasks", JSON.stringify(this.tasks));
    }

    add(task) {
        this.tasks.push(task);
        this.save();
    }

    remove(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.save();
    }

    toggle(id) {
        const task = this.tasks.find(t => t.id === id);
        task.done = !task.done;
        this.save();
    }

    edit(id, text, date) {
        const task = this.tasks.find(t => t.id === id);
        task.text = text;
        task.date = date;
        this.save();
    }

    // переставити задачу fromId на місце задачі toId
    move(fromId, toId) {
        const from = this.tasks.findIndex(t => t.id === fromId);
        const to = this.tasks.findIndex(t => t.id === toId);
        const task = this.tasks.splice(from, 1)[0];
        this.tasks.splice(to, 0, task);
        this.save();
    }

    // пошук за текстом + фільтр за статусом
    filter(status, query) {
        return this.tasks.filter(t => {
            const matchText = t.text.toLowerCase().includes(query.toLowerCase());
            const matchStatus =
                status === "all" ||
                (status === "done" && t.done) ||
                (status === "active" && !t.done);
            return matchText && matchStatus;
        });
    }
}

// ===== Елементи сторінки =====
const manager = new TaskManager();
let dragId = null;

const form = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const dateInput = document.getElementById("date-input");
const priorityInput = document.getElementById("priority-input");
const taskError = document.getElementById("task-error");
const dateError = document.getElementById("date-error");
const list = document.getElementById("task-list");
const searchInput = document.getElementById("search-input");
const filterSelect = document.getElementById("filter-select");

// мінімальна дата - сьогодні
dateInput.min = new Date().toISOString().slice(0, 10);

// ===== Валідація =====
function validateText(value) {
    return textRegex.test(value.trim()) ? "" : "Опис: від 2 до 100 символів, без < >";
}

function validateDate(value) {
    if (!dateRegex.test(value)) return "Введіть дату у форматі РРРР-ММ-ДД";
    if (value < dateInput.min) return "Дата не може бути в минулому";
    return "";
}

function showError(input, errorEl, message) {
    errorEl.textContent = message;
    if (message) {
        input.classList.add("invalid");
    } else {
        input.classList.remove("invalid");
    }
}

// ===== Відображення списку =====
function render() {
    const tasks = manager.filter(filterSelect.value, searchInput.value);
    list.innerHTML = "";

    tasks.forEach(task => {
        const li = document.createElement("li");
        li.className = "task";
        li.dataset.id = task.id;
        li.draggable = true;
        if (task.done) li.classList.add("done");
        if (task.priority === "Терміновий") li.classList.add("urgent");

        const text = document.createElement("span");
        text.className = "task-text";
        text.textContent = task.text + " (до " + task.date + ", " + task.priority + ")";

        const editBtn = document.createElement("button");
        editBtn.className = "btn small edit-btn";
        editBtn.textContent = "Редагувати";

        const delBtn = document.createElement("button");
        delBtn.className = "btn small danger delete-btn";
        delBtn.textContent = "Видалити";

        const actions = document.createElement("div");
        actions.className = "task-actions";
        actions.append(editBtn, delBtn);

        li.append(text, actions);
        list.append(li);
    });

    // лічильники
    const doneCount = manager.tasks.filter(t => t.done).length;
    document.getElementById("done-count").textContent = doneCount;
    document.getElementById("active-count").textContent = manager.tasks.length - doneCount;
    document.getElementById("empty-msg").hidden = tasks.length > 0;
}

// ===== Події =====

// submit - додавання
form.addEventListener("submit", event => {
    event.preventDefault();

    const textMsg = validateText(taskInput.value);
    const dateMsg = validateDate(dateInput.value);
    showError(taskInput, taskError, textMsg);
    showError(dateInput, dateError, dateMsg);
    if (textMsg || dateMsg) return;

    manager.add(new Task(taskInput.value.trim(), dateInput.value, priorityInput.value));
    form.reset();
    render();
});

// input - перевірка під час набору і пошук
taskInput.addEventListener("input", () => {
    showError(taskInput, taskError, validateText(taskInput.value));
});
searchInput.addEventListener("input", render);

// change - фільтр
filterSelect.addEventListener("change", render);

// click - делегування подій на списку
list.addEventListener("click", event => {
    const li = event.target.closest(".task");
    if (!li) return;
    const id = li.dataset.id;

    if (event.target.closest(".delete-btn")) {
        manager.remove(id);
    } else if (event.target.closest(".edit-btn")) {
        const task = manager.tasks.find(t => t.id === id);
        const newText = prompt("Новий опис:", task.text);
        if (newText === null) return;
        const newDate = prompt("Новий дедлайн (РРРР-ММ-ДД):", task.date);
        if (newDate === null) return;
        const error = validateText(newText) || validateDate(newDate);
        if (error) {
            alert(error);
            return;
        }
        manager.edit(id, newText.trim(), newDate);
    } else {
        manager.toggle(id);
    }
    render();
});

// Drag and Drop - теж через делегування
list.addEventListener("dragstart", event => {
    const li = event.target.closest(".task");
    dragId = li.dataset.id;
    li.classList.add("dragging");
});

list.addEventListener("dragover", event => {
    event.preventDefault(); // без цього drop не спрацює
});

list.addEventListener("drop", event => {
    event.preventDefault();
    const li = event.target.closest(".task");
    if (li && dragId) {
        manager.move(dragId, li.dataset.id);
    }
    dragId = null;
    render();
});

list.addEventListener("dragend", () => {
    dragId = null;
    render();
});

render();