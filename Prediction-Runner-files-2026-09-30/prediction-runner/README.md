# Prediction Runner

Небольшая игра на **Solana Devnet** и официальном **pm-AMM**. Исходный Next.js-фронтенд протокола послужил основой подключения кошелька и SDK; новый игровой интерфейс использует те же ConnectionProvider, WalletProvider и AnchorProvider.

## Запуск на этом компьютере

Приложение уже запущено: **http://127.0.0.1:3000**.

Для следующего запуска дважды щёлкните `START.cmd`. Или в PowerShell:

```powershell
cd "C:\Users\19ani\Documents\Codex\2026-09-30\hackathon-docs-use-x-package-devnet\outputs\prediction-runner"
.\START.cmd
```

Откройте **http://127.0.0.1:3000** в браузере, где установлен Phantom. Окно запуска оставьте открытым. Если игра уже работает, повторный запуск не нужен.

Обычные команды для разработчика (с Node.js и pnpm):

```powershell
pnpm install --frozen-lockfile
pnpm dev
pnpm type-check
pnpm build
pnpm start
```

**Переменные окружения не требуются.** Ключи кошельков, seed phrase и RPC API key не нужны. Приложение подключается только к `https://api.devnet.solana.com`; сеть и mUSDC mint зафиксированы в `src/lib/constants.ts`.

## Phantom и тестовые средства

1. В Phantom откройте **Settings → Developer settings → Testnet mode → Solana Devnet**.
2. В игре нажмите **Select Wallet → Phantom → Connect** и разрешите подключение. Это подключение кошелька, покупку вы подтверждаете отдельно.
3. Адрес автора: `HCXuCHR7ZKeGeP4bKSHyMNMS1hNqBr8K6tXnAbt84LaY`. При проверке 30 сентября 2026 года он имел около 11,64 devnet SOL. На него уже получены **1 000 mUSDC** из официального faucet.
4. Для другого кошелька после подключения нажмите **Get test mUSDC**. Faucet выдаёт 1 000 mUSDC и при необходимости devnet SOL; лимит — одна выдача на кошелёк в час. При отказе не повторяйте запрос циклически.

Уже выполненная выдача: [Solscan Devnet](https://solscan.io/tx/9ZCXt1GEnms2EinNrXghRDrEaNzj8p3t62HeTZWQ7uP55vHZk3yMAAgtF38VCNBvYLpT6VRBcxfVH7bw1SFALeC?cluster=devnet).

Если Phantom не открывается во встроенной вкладке Codex, откройте тот же локальный адрес в своём браузере с расширением Phantom. Не вводите seed phrase в приложение.

## Демо за 30 секунд

Подключите Phantom заранее. Затем:

- **0–5 с:** нажмите Start run. Покажите реальный вопрос и вероятность YES/NO.
- **5–15 с:** выберите YES/NO стрелками или кнопками. Нажимайте Enter gate, чтобы сразу перейти дальше. Сделайте три выбора.
- **15–20 с:** на Run Complete покажите три прогноза и число contrarian picks. Выберите один прогноз в Make a pick on-chain и нажмите Preview purchase.
- **20–30 с:** нажмите Approve in Phantom · 1 mUSDC и подтвердите транзакцию в Phantom. После подтверждения откройте View transaction. Время подтверждения зависит от Devnet; не обещайте аудитории фиксированные 30 секунд.

На блокчейн отправляется **одна выбранная покупка за 1 mUSDC**, а не весь забег. Приложение показывает это перед подтверждением.

## Что настоящее, что демонстрационное

**Настоящее:** подключение Phantom, публичный адрес и балансы, три существующих devnet-рынка, вопросы и вероятности из их аккаунтов, котировка из официального helper, покупка YES/NO через `client.send.swap`, создание необходимых token accounts силами SDK, подтверждение транзакции и ссылка Solscan Devnet. Комиссия протокола — 2%; допустимое проскальзывание — 1%.

**Локальное:** движение персонажа, выбор полосы, список из трёх игровых решений и количество контрарных выборов. Это игровые данные в памяти браузера, а не прогноз правильности или заработка.

**Резервные примеры:** `src/data/mockMarkets.ts` содержит три вопроса и вымышленные вероятности только на случай, если сеть недоступна или нельзя найти три действующих рынка. Экран явно помечает их SAMPLE QUESTION. У этих вопросов отсутствует адрес рынка, покупка по ним запрещена. Во время успешной проверки использовались реальные рынки, не резервные примеры.

Рынки являются тестовыми. Их создатели вручную решают исход после завершения; прототип не создаёт оракул, не разрешает рынки и не гарантирует погашение токенов.

## Документированные константы

- SDK: `@pm-amm/sdk` 0.2.0.
- Программа: `GV1FMGHRYBjQLaghE5fnGuYCuCcpdt3GD5xEX3TwN16y`.
- mUSDC (6 знаков): `3WQ8hCqTNwjrh8WzE2XyoZoUrd1miPcwWfMkmFPUMEWZ`.
- Faucet: `POST https://pm-amm-devnet.vercel.app/api/faucet`, JSON `{ "wallet": "<public key>" }`.
- Подписант Phantom: wallet adapter → `AnchorProvider` → `PmAmmClient.fromProvider`.
- Чтение: `fetchMarkets` по трём проверенным адресам, при необходимости `client.fetchAllMarkets(443)` с фильтрацией времени, разрешения, mUSDC и ликвидности.
- Котировка: `quoteSwap(market, direction, 1_000_000)` → `minOutput(quote)` → `client.send.swap(address, direction, 1_000_000, minimum)`.
- Оба пользовательских outcome token accounts создаёт `send.swap`. Ручные структуры инструкций отсутствуют.

Документы: [hackathon kit](https://predict-pm-amm.dev/hackathon.md), [официальный репозиторий](https://github.com/sparkfun-labs/pm-amm), [официальный helper](https://predict-pm-amm.dev/helpers/pm-amm-helpers.ts). Helper скопирован без изменения формул. Сохранена MIT-лицензия исходного проекта в `LICENSE-pm-amm`.

## Проверка

`pnpm type-check` и production build прошли успешно. Реальный отдельный devnet-кошелёк выполнил покупку YES и покупку NO по 1 mUSDC; обе транзакции подтверждены, outcome-токены получены. Публичные результаты находятся в `DEVNET-VERIFICATION.json`. Тесты не подписывали за кошелёк пользователя.

В браузере проверены полный и повторный забеги, выбор кнопками и стрелками, Enter gate, экран Run Complete, корректный счётчик контрарных выборов и реальная котировка до подключения кошелька. Проверены ширины 390 и 1366 px; горизонтального переполнения нет. После исправления фокуса игровая карточка не прокручивается внутри себя. В финальной проверке ошибок JavaScript не было; SDK и приложение используют один экземпляр web3.js. Подключение и подпись именно пользовательского Phantom требуют его подтверждения и пока не проверены агентом.

- [Покупка YES](https://solscan.io/tx/2UyZ6Na65874CSrfZCqqwrtgrHUujgPEmRURJECkSSrjAa2P1fa74MndJUX21LjFVdH3qq4a3LkBXZbGh2dYZcQy?cluster=devnet)
- [Покупка NO](https://solscan.io/tx/4TVgbUQoMRAoCVBXtfFsmXzmMEbX9vvrdeq7DpKHqHM4wY8sgdnXC6vbnHe3rUxE9AAWHFHV54hMnktBNvxQPpLY?cluster=devnet)

Вашу покупку подписывает только Phantom. Сам по себе публичный адрес не позволяет агенту подписывать транзакции. Размещённого публичного URL пока нет; это работающий локальный прототип.
