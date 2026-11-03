# Лабораторна робота № 1 — Менеджер завдань (варіант 2)

Веб-застосунок на HTML5, CSS3 та нативному JavaScript (ES6+): додавання, редагування,
видалення завдань, Drag and Drop, пошук, фільтрація, збереження в localStorage.

## Запуск без Docker
Відкрийте `index.html` через розширення Live Server у VS Code.

## Запуск у Docker
```bash
docker build -t lab1-todo .
docker run -d -p 8080:80 --name lab1-todo lab1-todo
```
Застосунок буде доступний за адресою http://localhost:8080

Зупинити: `docker stop lab1-todo && docker rm lab1-todo`
