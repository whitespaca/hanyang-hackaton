import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { FlowProvider } from "@/features/classification/FlowContext";
import { theme } from "@/lib/theme";

export default function RootLayout() {
  return <SafeAreaProvider><FlowProvider><StatusBar style="dark" /><Stack screenOptions={{ headerStyle: { backgroundColor: theme.color.surface }, headerTintColor: theme.color.primaryDark, headerTitleStyle: { fontWeight: "800" }, contentStyle: { backgroundColor: theme.color.background } }}><Stack.Screen name="index" options={{ title: "분리샷" }} /><Stack.Screen name="search" options={{ title: "품목 검색" }} /><Stack.Screen name="item/[itemId]" options={{ title: "품목 배출 가이드" }} /><Stack.Screen name="capture" options={{ title: "사진 촬영" }} /><Stack.Screen name="preview" options={{ title: "사진 확인" }} /><Stack.Screen name="result" options={{ title: "AI 분석 결과" }} /><Stack.Screen name="refine" options={{ title: "품목 확인" }} /><Stack.Screen name="guide" options={{ title: "배출 가이드" }} /><Stack.Screen name="history" options={{ title: "최근 기록" }} /></Stack></FlowProvider></SafeAreaProvider>;
}
