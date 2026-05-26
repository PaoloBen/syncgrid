# SyncGrid
**AI-Powered Group Scheduling & Free-Time Mapping**

SyncGrid is a collaborative scheduling application designed to automate and streamline the process of finding mutual availability among groups. It eliminates the friction of messy planning chats and manual schedule comparisons by calculating and highlighting overlapping free time, all while maintaining strict user privacy over personal calendar specifics.

**Lead Developer:** Paul Benedict C. Divinagracia  
**Program:** BS - Computer Science, University of San Carlos  

---

## Core Architecture & APIs

SyncGrid is built on a decoupled, cross-platform mobile stack utilizing React Native (Expo). The application relies on the following backend services and APIs to handle real-time synchronization, identity management, asset hosting, and AI optical character recognition.

### 1. Backend & Database: Firebase (Google Cloud)
* **Firestore (NoSQL Real-time Database):** Acts as the central nervous system of the app. It utilizes `onSnapshot` listeners to instantly push state changes (e.g., new schedules, circle chat messages, dynamic read/unread notifications, and RBAC permission updates) to all connected clients with zero latency.
* **Firebase Authentication:** Handles secure user identity management and session state across the application.

### 2. Artificial Intelligence: Google Gemini API
* **Gemini 3.5 Flash (REST API):** Bypassing standard SDK wrappers, the app directly interfaces with the Gemini 3.5 Flash REST endpoint. It utilizes Vision AI / Optical Character Recognition (OCR) to parse user-uploaded screenshots of class or work schedules. The model extracts course names, days, and times, formats them into a strict JSON payload, and silently auto-populates the user's SyncGrid.

### 3. Asset Management: ImgBB API
* **ImgBB REST API:** Used to offload media storage. When users upload custom Circle icons or profile avatars, the image payload is compressed via Expo ImagePicker, converted to base64, and POSTed to ImgBB. The API returns a lightweight, globally accessible CDN URL that is subsequently saved to Firestore, optimizing the app's database read/write limits.

---

## How to Run Locally

1. Clone the repository:
   ```bash
   git clone [https://github.com/PaoloBen/syncgrid.git](https://github.com/PaoloBen/syncgrid.git)

2. Install dependencies:
    ```bash
    npm install

3. Start the Expo server:
    ```bash
    npx expo start

4. Scan the QR code using the Expo Go app on iOS or Android.


## Environment Variables

To run the AI Scanner locally, you need a valid Google Gemini API key.

Navigate through Google AI Studio to generate an API key https://aistudio.google.com/api-keys

1. Create a `.env` file in the root directory of the project.
2. Add your API key using the following format:
   ```env
   EXPO_PUBLIC_GEMINI_API_KEY=your_api_key_here
   ```