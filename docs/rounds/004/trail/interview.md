# Interview: round 004

Opening request (Owner): "I would like to shift development to be app-first (Iphone-based). This means developing the app and using an emulator to test on the Mac (we are on mac)"

The four questions were asked together in one prompt; the answer time was not captured.

### Q1 (unknown): Which iPhone app approach should we build on? The current React client is small (about 460 lines), so a rewrite costs little now.
- **Options offered:** "Expo / React Native (Recommended)": native iPhone UI in JS; Zustand store and API module carry over almost unchanged; expo-speech uses iOS voices; runs in the Simulator with `npx expo start --ios`; a web build stays possible via react-native-web. "Capacitor wrapper": wrap the existing React/Vite client in a native iOS shell (WKWebView); least work, website stays the same codebase, but feels like a web page. "Native SwiftUI": full native rewrite in Swift; nothing carries over and the web version is dropped.
- **Answer:** Expo / React Native (Recommended)

### Q2 (unknown): What should happen to the open round 003 (Italian as the default target language)?
- **Options offered:** "Park it, app is round 004": leave round 003's records as they are, marked parked, and open round 004. "Finish Italian first": close round 003 before starting the app. "Fold Italian into the app round": one round doing both.
- **Answer:** "another agent is doing it, so don't worry about it"

### Q3 (unknown): What should happen to the browser client in client/?
- **Options offered:** "Keep it working, frozen (Recommended)": stays runnable and tested, new features go to the app only. "Retire it": remove client/ once the app matches it.
- **Answer:** Keep it working, frozen (Recommended)

### Q4 (unknown): Is the Simulator on this Mac enough for now, or should the app also run on your real iPhone?
- **Options offered:** "Simulator only (Recommended)": Simulator reaches 127.0.0.1:3001 directly, CLI providers stay local-only, no Apple developer account. "Simulator + my iPhone on Wi-Fi": server listens on the LAN, loosening round 002's 127.0.0.1 rule; needs Expo Go or a development build on the phone.
- **Answer:** Simulator only (Recommended)

