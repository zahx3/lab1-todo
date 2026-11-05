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

    edit(id, text, date, priority) {
        const task = this.tasks.find(t => t.id === id);
        task.text = text;
        task.date = date;
        task.priority = priority;
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
let editingId = null; // id завдання, яке зараз редагується

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

// ===== Форма редагування прямо в рядку завдання =====
function createEditForm(task) {
    const row = document.createElement("div");
    row.className = "edit-row";

    const textField = document.createElement("input");
    textField.type = "text";
    textField.value = task.text;
    textField.className = "edit-text";

    const dateField = document.createElement("input");
    dateField.type = "date";
    dateField.value = task.date;
    dateField.min = dateInput.min;
    dateField.className = "edit-date";

    // вибір пріоритету: ті самі значення, що й у формі додавання
    const prioritySelect = document.createElement("select");
    prioritySelect.className = "edit-priority";
    ["Низький", "Звичайний", "Терміновий"].forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        option.selected = name === task.priority;
        prioritySelect.append(option);
    });

    const saveBtn = document.createElement("button");
    saveBtn.className = "btn small primary save-btn";
    saveBtn.textContent = "Зберегти";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn small cancel-btn";
    cancelBtn.textContent = "Скасувати";

    const error = document.createElement("small");
    error.className = "error-text edit-error";

    row.append(textField, dateField, prioritySelect, saveBtn, cancelBtn, error);
    return row;
}

// ===== Відображення списку =====
function render() {
    const tasks = manager.filter(filterSelect.value, searchInput.value);
    list.innerHTML = "";

    tasks.forEach(task => {
        const li = document.createElement("li");
        li.className = "task";
        li.dataset.id = task.id;

        // режим редагування: замість тексту показуємо поля
        if (task.id === editingId) {
            li.append(createEditForm(task));
            list.append(li);
            return;
        }

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

    // клік по полях редагування (input, select) не повинен перемальовувати список
    if (event.target.closest(".edit-row") && !event.target.closest("button")) return;

    if (event.target.closest(".delete-btn")) {
        manager.remove(id);
    } else if (event.target.closest(".edit-btn")) {
        editingId = id;
    } else if (event.target.closest(".cancel-btn")) {
        editingId = null;
    } else if (event.target.closest(".save-btn")) {
        const textField = li.querySelector(".edit-text");
        const dateField = li.querySelector(".edit-date");
        const prioritySelect = li.querySelector(".edit-priority");
        const errorEl = li.querySelector(".edit-error");
        const textMsg = validateText(textField.value);
        const dateMsg = validateDate(dateField.value);
        if (textMsg || dateMsg) {
            errorEl.textContent = textMsg || dateMsg;
            textField.classList.toggle("invalid", textMsg !== "");
            dateField.classList.toggle("invalid", dateMsg !== "");
            return; // залишаємось у режимі редагування
        }
        manager.edit(id, textField.value.trim(), dateField.value, prioritySelect.value);
        editingId = null;
    } else if (id !== editingId) {
        manager.toggle(id);
    }
    render();
});

// keydown - Enter зберігає, Escape скасовує редагування
list.addEventListener("keydown", event => {
    const li = event.target.closest(".task");
    if (!li || !event.target.closest(".edit-row")) return;
    if (event.key === "Enter") li.querySelector(".save-btn").click();
    if (event.key === "Escape") li.querySelector(".cancel-btn").click();
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