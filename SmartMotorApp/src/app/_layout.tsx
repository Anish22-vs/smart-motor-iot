// src/app/_layout.tsx
// Replace the whole contents of the existing src/app/_layout.tsx with this file.
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
