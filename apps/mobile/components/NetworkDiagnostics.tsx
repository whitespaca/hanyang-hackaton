import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { apiConfiguration } from "@/lib/api";
import { runNetworkDiagnostic, type NetworkDiagnostic } from "@/lib/apiConfig";
import { theme } from "@/lib/theme";
import { ActionButton } from "./ui";

export function NetworkDiagnostics() {
  const [diagnostic, setDiagnostic] = useState<NetworkDiagnostic>();
  const [running, setRunning] = useState(false);

  async function check() {
    setRunning(true);
    setDiagnostic(await runNetworkDiagnostic(apiConfiguration.baseUrl));
    setRunning(false);
  }

  return (
    <View accessibilityLabel="개발용 API 진단" style={styles.container}>
      <Text style={styles.title}>개발용 API 진단</Text>
      <Text selectable style={styles.value}>{apiConfiguration.baseUrl}</Text>
      {apiConfiguration.warning && <Text style={styles.warning}>{apiConfiguration.warning}</Text>}
      <ActionButton
        label={running ? "진단 중…" : "API 연결 진단"}
        variant="secondary"
        disabled={running}
        onPress={() => void check()}
      />
      {diagnostic && (
        <View accessibilityLiveRegion="polite" style={styles.result}>
          <Text>HTTP: {diagnostic.httpStatus ?? "연결 실패"}</Text>
          {diagnostic.health && (
            <>
              <Text>추론: {diagnostic.health.inferenceMode}</Text>
              <Text>모델 로드: {diagnostic.health.modelLoaded ? "예" : "아니요"}</Text>
              <Text>버전: {diagnostic.health.modelVersion}</Text>
              <Text>fallback: {diagnostic.health.fallbackReason ?? "없음"}</Text>
            </>
          )}
          {diagnostic.error && <Text style={styles.warning}>{diagnostic.error}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.color.surface,
    gap: 8,
  },
  title: { color: theme.color.text, fontWeight: "900" },
  value: { color: theme.color.primaryDark, fontSize: 13 },
  warning: { color: theme.color.warning, lineHeight: 20 },
  result: { gap: 4 },
});
