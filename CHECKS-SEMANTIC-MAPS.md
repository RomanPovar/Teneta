# Semantic maps — перевірки

Дата: 10 жовтня 2026. Патч підготовлено для наявних головної сторінки та
двомовного каталогу. Перевірені через GitHub актуальні App.jsx, CataloguePage.jsx,
маршрути та дерево main `c88fc5017347ee3e12ced87d944de1841ce7a856` (це SHA дерева,
не SHA коміту); робоча копія зібрана з наданого проєкту та останніх оновлень.

## Результат

- `node --test`: **140/140**, включно з 98 попередніми перевірками.
- ESLint: **0 помилок, 0 попереджень**.
- Chromium, офлайн-інтерфейс: **73 перевірки пройдено**, необроблених
  JS-помилок: 0.
- Справжній модуль `layout.worker.js` окремо виконано у Node worker_threads
  з тонким адаптером `self.postMessage`. Перевірено передачу Float32Array і
  збіг із результатом компонування. Це не перевірка Vite Worker URL у production.

## Як перевірявся браузер

Застосунок перетворений із JSX через встановлений TypeScript; використані
React/ReactDOM 19.3.0 з переданих node_modules. Увесь JavaScript і CSS завантажені
в пам’ять Chromium. Запити даних замінені контрольованими JSON-відповідями.
Це інтеграційні перевірки React UI, а не production-збірки Vite чи реального API.

Оточення браузера блокує URL-навігацію та завантаження Worker. Тому саме у
браузері перевірено запасний шлях без Worker: початкове компонування, рух,
вибір, фільтри й навігація. Скриншоти відображають цей реальний тестовий режим;
його статус видно у верхній частині полотна. Основний алгоритм і протокол Worker
перевірені окремо, як зазначено вище. Захисні налаштування браузера не змінювались.

Перевірено: 1440 px, 768 px, 390 px, 320 px; немає горизонтального переповнення
сторінки, усі три посилання шапки доступні. На мобільному перевірені компонування
та кнопки; multitouch-жест не перевірявся на фізичному телефоні.

## Мережі для навантаження

Тестові записи не збережено до `public/data`.

| Сценарій | Результат |
|---|---|
| Поточний JSON | 1 організація, 11 вузлів, 10 ребер, 1 кластер |
| Browser, незалежні групи | 160 організацій, 500 вузлів, 20 кластерів |
| Browser, великий пов’язаний граф | 1500 організацій, 9001 вузол, 9000 ребер; вибір останньої організації працює |
| Node, той самий масштаб алгоритму | 9001 вузол, 9000 ребер, 1 зв’язна компонента |
| Одноразове вимірювання Node | Побудова графа 156 мс; компонування 380 мс |

Час виміряний у цьому контейнері; це не гарантія FPS чи часу на іншому пристрої.
У браузерному навантажувальному сценарії працювало запасне початкове компонування.
Окремо тестується, що DOM-порції списку не обрізають саме полотно/набір вузлів.

## Production build — не підтверджений

Запуск `vite build` зупинився до компіляції застосунку через відсутні Linux
native bindings Rolldown у наданому Windows-наборі node_modules.
Спроба доступу до npm registry також не вдалася. Залежності, package-lock,
конфіг Vite та Actions не підмінялись. Повідомлення помилки з бібліотеки не є
інструкцією користувачу видаляти lockfile.

Обов’язково перевірте `npm run build` у своєму Windows-проєкті та deployment
job після merge. Особливо перевірте завантаження скомпільованого Worker під
`/Teneta/` у вкладці Network. Спосіб імпорту Worker — стандартний Vite
`new Worker(new URL('./layout.worker.js', import.meta.url), { type: 'module' })`.

## Незмінні файли

Побайтово незмінні щодо початкової копії: `package.json`, `package-lock.json`,
`vite.config.js`, `.github/workflows/deploy.yml`, `public/data/organizations.json`,
`src/services/organizationService.js`, `src/pages/LandingPage.jsx`,
`src/pages/LandingPage.css`. Логотипи й аватарки також не змінені.

SHA-256 наявного JSON: `1cfbd374f949d200a86299488e2c0969bc8e76090dce9abf3f86437c6a1ff29e`.

## Браузерні сценарії

1. root is landing
2. no catalogue fetch on landing
3. three header links
4. skip link initially offscreen
5. skip link visible on keyboard focus
6. skip link preserves hash route
7. skip link focuses main
8. catalogue still one organization
9. catalogue fetch exactly once
10. profile dialog opens
11. profile graph link is real route
12. profile graph link closes dialog
13. local graph route reached
14. local graph selects company
15. shared data: no duplicate fetch
16. canvas created
17. local depth two includes 11 nodes
18. worker fallback leaves graph usable
19. document language updated
20. graph nav localized
21. query survives language switch route
22. one-hop graph has seven nodes
23. depth restored eleven nodes
24. type filter removes skills
25. type filter removes incident edges
26. search matches only contact
27. search selection opens inspector
28. inspector exposes relationship label
29. edge evidence shows actual JSON field
30. empty search state shown
31. search clearing restores node list
32. zoom button changes scale
33. wheel changes scale
34. keyboard zoom works
35. fit keyboard restores finite percent
36. escape deselects node
37. return global clears scope
38. global scoped label present
39. catalogue query retained across maps
40. navigation still one data fetch
41. catalogue export preserved one record
42. no graph objects injected into exported schema
43. direct local deep link initializes correctly
44. browser back restores local map
45. unknown ID shows error not unrelated data
46. recovery from unknown ID works
47. 320px no horizontal page overflow
48. 320px all header routes visible
49. 320px canvas meaningful height
50. 390px no horizontal page overflow
51. 390px all header routes visible
52. 390px canvas meaningful height
53. 768px no horizontal page overflow
54. 768px all header routes visible
55. 768px canvas meaningful height
56. network error shown
57. retry restores graph
58. empty dataset has explicit state
59. 160-company fixture has all companies
60. independent fixture forms 20 clusters
61. all 500 nodes retained
62. node list paginated separately from canvas
63. all nodes accessible via show more
64. last company local route accessible
65. local graph excludes unrelated clusters
66. large browser fixture retains all 9001 nodes
67. large browser fixture retains all 9000 edges
68. large browser fixture can find last organization
69. large browser fixture selection remains interactive
70. canvas click selects actual company node
71. dragged node remains selectable at new coordinates
72. canvas double click opens local organization route
73. no uncaught browser exceptions
