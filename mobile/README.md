# NyayPath Mobile (React Native / Expo)

বাংলাদেশের আইনজীবী ও মামলা ব্যবস্থাপনা অ্যাপের মোবাইল ভার্সন — ওয়েব পোর্টালের সাথে একই ব্যাকএন্ড।

## Features
- Dark / Light + বাংলা / English
- Public: হোম, মামলা সার্চ, উকিল ডিরেক্টরি, সেটিংস
- **Lawyer**: ড্যাশবোর্ড, মামলা CRUD, শুনানি, জরুরি শুনানি, স্টাফ টিম (যোগ/ডিজেবল/ডিলিট), টাস্ক, ডকুমেন্ট, নোটিফিকেশন, প্রোফাইল, লগআউট
- **Staff**: ড্যাশবোর্ড, অ্যাসাইন মামলা, শুনানি, টাস্ক, ডকুমেন্ট, নোটিফিকেশন, প্রোফাইল, উকিল ছেড়ে যাওয়া; disabled হলে লক + প্রোফাইল/লগআউট
- Secure session (SecureStore)

## Run
```bash
# Terminal 1 — API
cd backend
npm run dev

# Terminal 2 — mobile
cd mobile
npm start
```
Then press `a` (Android) বা Expo Go QR।

## API URL
Android emulator default: `http://10.0.2.2:4000/api`  
Physical device: `EXPO_PUBLIC_API_URL=http://<PC-LAN-IP>:4000/api`

## Demo login
- Lawyer: `rafiqul@nyaypath.bd` / `lawyer123`
- Staff: `mahmud@nyaypath.bd` / `staff123`
