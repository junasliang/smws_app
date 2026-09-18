import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "SMWS 酒款查詢",
        }}
      />
      <Stack.Screen
        name="camera"
        options={{
          title: "掃描酒款",
          presentation: "fullScreenModal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="whisky/[caskNo]"
        options={{
          title: "酒款資料",
        }}
      />
    </Stack>
  );
}
