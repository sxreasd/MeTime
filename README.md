<div align="center">

# Money App

**A personal money tracker for everyday spending, allowance, and saving.**

Dark, glassy, and fast. Track what you spend, see where it goes, and save into colorful jars.

![Version](https://img.shields.io/badge/version-1.2-C85C5C)
![Platform](https://img.shields.io/badge/platform-Android%20%7C%20Web-1A1A1A)
![Currency](https://img.shields.io/badge/currency-PHP%20%E2%82%B1-6EEFA2)

</div>

---

## Download

Every version of the app is available as an APK on the **[Releases](../../releases)** page.

1. Open the [Releases](../../releases) page.
2. Pick the version you want (for example `v1.2`).
3. Under **Assets**, download the `.apk` file.
4. Open it on your Android phone and allow **Install from unknown sources** if asked.

> Older versions stay on the Releases page, so you can always go back to a previous one.

---

## Features

### Home
- Current balance with quick **Spend** and **Add** buttons
- **Today's Spending** card (tap it to open Analytics)
- **Piggy Bank** card showing the total saved across all jars
- Draggable **Transactions** panel: drag it up to see the full list, drag it down to collapse it

### Spend and Add
- Bottom sheet that rises from the bottom and can be dragged down to close
- Sliding pill toggle between **Spend** and **Add**
- Custom number pad
- Category dropdown
  - Spend: Food, Transport, School Expenses, Entertainment, Others
  - Add: Allowance, Others
- Swipe right to confirm, followed by a green confirmation screen (for example "Spent on Food")

### Transactions
- Grouped by date
- Search by category, note, or jar (expanded view)
- Filter by type, category, and date (expanded view)
- Swipe a row sideways and tap **Delete** to remove it (no accidental trash can taps)
- Undo toast after deleting

### Piggy Bank
- Create jars with a name and color
- Add money into jars from your balance
- Edit or delete jars

### Analytics
- Total spending with comparison against the previous period
- Working graph of your expenses
- Totals for today, this week, and this month
- "Where Your Money Goes" category breakdown

### App experience
- Full-screen, edge-to-edge design
- Phone back button navigates between pages, and asks for confirmation before exiting from Home
- Animated mascot intro with a smooth Home screen entrance
- Custom background with subtle animated starbursts
- Settings page
- All data stored on your device

### Coming soon
- To-Do List
- Additional feature page

---

## Version History

| Version | Highlights |
| ------- | ---------- |
| **1.2** | Mascot intro animation, new app icon, refined winking animation |
| **1.1** | Full-screen mode, back-button handling, new background design, expandable Transactions panel, swipe-to-delete, Coming soon pages |
| **1.0** | Home, Spend/Add, swipe-to-confirm, Piggy Bank, Analytics, Settings |

> Update this table every time you release a new version.

---

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Local storage for data
- Android packaging (APK)

---

## Run It Locally

```bash
# 1. Clone the repository
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
cd YOUR-REPO

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev

# 4. Build for production
npm run build
```

---

## Build the APK

If you package the app with Capacitor:

```bash
npm run build
npx cap sync android
npx cap open android
```

Then in Android Studio: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

---

## Publishing a New Version

1. Update the version number in `package.json` and in the Version History above.
2. Build the new APK.
3. Commit and tag the release:
   ```bash
   git add .
   git commit -m "Release v1.3"
   git tag v1.3
   git push origin main --tags
   ```
4. On GitHub, open **Releases > Draft a new release**, choose the tag, upload the APK, and publish.

---

## Notes

- Your data is saved on your device only. Clearing the app's data or uninstalling it will erase your transactions and jars.
- This is a personal project, designed and built by me.

---

<div align="center">

Made with care by **YOUR NAME**

</div>
