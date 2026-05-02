<div align="center">
  <img src="Reloom/assets/icon.png" alt="Reloom Logo" width="120" style="border-radius: 28px; overflow: hidden;" />
  <h1>Reloom</h1>
  <p>A private social registry and personal CRM, built for the long term.</p>
</div>

<br />

Reloom is more than a contact book—it’s a personal registry built to capture the context often lost in a generic list. It is designed for those who want to remember the details: a quick thought after a meeting, a shared memory from a trip, or a specific gift idea. 

The core of Reloom is a frictionless workflow that lets you log information on the go and find it exactly when you need it. Every interaction and note is stored in a secure, local vault on your device, keeping your data private and your network organized.

---

## Features

### 🛡️ Privacy & Data Ownership
- **Local-First Architecture:** Reloom uses a local SQLite database. No data is ever sent to a server.
- **Hardware-Level Security:** Sensitive access is protected by your device's native biometrics and a PIN stored in a hardware-encrypted secure enclave.
- **Portable Backups:** Export your entire registry into a `.reloom` vault. This format embeds your profile images as Base64 strings, making it easy to move your data between devices without losing anything.

### 👥 Intentional Connections
- **The Social Web:** View relationships as a high-density list. Connections are bi-directional—linking a mentor to a student automatically creates the reciprocal link on both profiles.
- **Communication Hub:** Store social handles and contact info. Reloom uses deep-linking to open WhatsApp, Instagram, LinkedIn, and native phone/email apps directly.
- **Spatial Context:** A dedicated "Cities Hub" groups your network by location. The system normalizes city names and supports specific address labels (Home, Work, Other) that open directly in your native maps app.
- **Group Categorization:** Organize people into custom groups with unique icons and colors for quick filtering.

### 📓 Notes & Memories
- **Quick Action Notes:** Capture thoughts instantly. The system is designed for speed, allowing you to add entries to a profile with minimal friction.
- **Semantic Journaling:** Log interactions using specific categories like "Memory", "Goal", or "Food & Drink". 
- **Active Tagging:** Tag people in your journal entries. The picker automatically prioritizes the people you interact with most frequently.

### 📅 Calendar & Reminders
- **Event Aggregation:** Automatically pulls birthdays and anniversaries into a unified view.
- **Integrated Reminders:** Set reminders that are natively linked to your contacts. Tapping a reminder takes you directly to that person's profile.

## Technical Foundation

- **Core:** Built with React Native and Expo for a native experience.
- **Database:** Type-safe relational queries via Drizzle ORM and SQLite.
- **Routing:** File-based navigation using Expo Router.
- **Motion:** Physics-based animations powered by React Native Reanimated.

## Getting Started

To run Reloom locally for development:

```bash
cd Reloom
npm install
npx expo start
```

## License & Privacy
Reloom is open-source under the [GPL-3.0 License](./LICENSE). 
Your data remains on your device. [Privacy Policy](./PRIVACY.md).
