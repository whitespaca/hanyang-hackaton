import { GARBAGE_CLASSES, GARBAGE_LABELS, formatConfidence, type ClassificationPrediction, type GarbageClass, type GuideItem } from "@bunrishot/shared";
import { useState, type ReactNode } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, type PressableProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const content = <View style={styles.content}>{children}</View>;
  return <SafeAreaView edges={["bottom"]} style={styles.safe}>{scroll ? <ScrollView contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}</SafeAreaView>;
}

interface ButtonProps extends PressableProps { label: string; variant?: "primary" | "secondary" | "danger" }
export function ActionButton({ label, variant = "primary", disabled, style, ...props }: ButtonProps) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} style={(state) => [styles.button, styles[`${variant}Button`], state.pressed && styles.pressed, disabled && styles.disabled, typeof style === "function" ? style(state) : style]} {...props}><Text style={[styles.buttonText, variant !== "primary" && styles.secondaryText]}>{label}</Text></Pressable>;
}

export function PredictionList({ predictions, threshold }: { predictions: ClassificationPrediction[]; threshold: number }) {
  return <View accessibilityLabel="AI 예측 Top 3" style={styles.list}>{predictions.map((item, index) => <View key={item.className} style={styles.prediction}><View style={styles.row}><Text style={styles.predictionTitle}>{index + 1}. {item.labelKo}</Text><Text style={[styles.confidence, index === 0 && item.confidence < threshold && styles.warningText]}>{formatConfidence(item.confidence)}{index === 0 && item.confidence < threshold ? " · 확인 필요" : ""}</Text></View><View style={styles.barTrack}><View style={[styles.bar, { width: `${Math.round(item.confidence * 100)}%` }]} /></View></View>)}</View>;
}

export function ClassPicker({ onSelect }: { onSelect: (value: GarbageClass) => void }) {
  return <View style={styles.grid}>{GARBAGE_CLASSES.map((value) => <Pressable accessibilityRole="button" key={value} onPress={() => onSelect(value)} style={styles.choice}><Text style={styles.choiceText}>{GARBAGE_LABELS[value]}</Text></Pressable>)}</View>;
}

const statusLabel = { yes: "재활용 가능", conditional: "조건부 가능", no: "일반·별도 폐기", special: "전용 수거 필요" } as const;
export function GuideChecklist({ guide }: { guide: GuideItem }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  return <View><Text style={styles.eyebrow}>{statusLabel[guide.recyclability]}</Text><Text style={styles.title}>{guide.title}</Text>{guide.steps.map((step, index) => <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: checked.has(index) }} accessibilityLabel={`${index + 1}단계 완료`} key={step} style={styles.checkRow} onPress={() => setChecked((current) => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next; })}><View style={[styles.checkbox, checked.has(index) && styles.checkboxChecked]}><Text style={styles.checkmark}>{checked.has(index) ? "✓" : ""}</Text></View><Text style={styles.checkText}>{index + 1}. {step}</Text></Pressable>)}{guide.warnings.length > 0 && <View style={styles.warningBox}><Text style={styles.warningTitle}>주의</Text>{guide.warnings.map((warning) => <Text key={warning} style={styles.warningBody}>• {warning}</Text>)}</View>}<Text style={styles.disclaimer}>{guide.disclaimer}</Text></View>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <View accessibilityRole="alert" style={styles.errorBox}><Text style={styles.errorTitle}>진행할 수 없습니다</Text><Text style={styles.body}>{message}</Text>{onRetry && <ActionButton label="다시 시도" onPress={onRetry} />}</View>;
}

export function PermissionDenied({ canAskAgain, onRequest, onGallery }: { canAskAgain: boolean; onRequest: () => void; onGallery: () => void }) {
  return <View style={styles.center}><Text style={styles.title}>카메라 권한이 필요합니다</Text><Text style={styles.body}>{canAskAgain ? "물건을 촬영하려면 카메라 접근을 허용해주세요." : "설정에서 카메라 권한을 허용하거나 갤러리에서 사진을 선택해주세요."}</Text>{canAskAgain ? <ActionButton label="카메라 권한 요청" onPress={onRequest} /> : <ActionButton label="설정 열기" onPress={() => Linking.openSettings()} />}<ActionButton label="갤러리에서 선택" variant="secondary" onPress={onGallery} /></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.background }, scroll: { flexGrow: 1 }, content: { flex: 1, padding: theme.spacing.lg, gap: theme.spacing.md }, center: { flex: 1, justifyContent: "center", gap: theme.spacing.md, padding: theme.spacing.lg },
  title: { fontSize: 30, lineHeight: 38, fontWeight: "900", color: theme.color.text }, body: { color: theme.color.muted, fontSize: 16, lineHeight: 24 }, eyebrow: { color: theme.color.primary, textTransform: "uppercase", fontWeight: "800", letterSpacing: 1 },
  button: { minHeight: 50, borderRadius: theme.radius.md, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, marginVertical: 4 }, primaryButton: { backgroundColor: theme.color.primary }, secondaryButton: { backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border }, dangerButton: { backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.danger }, pressed: { opacity: .8 }, disabled: { opacity: .45 }, buttonText: { color: "white", fontSize: 16, fontWeight: "800" }, secondaryText: { color: theme.color.primaryDark },
  list: { gap: 16 }, prediction: { gap: 7 }, row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, predictionTitle: { fontSize: 17, fontWeight: "800", color: theme.color.text }, confidence: { color: theme.color.primaryDark, fontWeight: "800" }, warningText: { color: theme.color.warning }, barTrack: { height: 9, borderRadius: 9, overflow: "hidden", backgroundColor: "#E3E9E6" }, bar: { height: "100%", backgroundColor: theme.color.primary },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, choice: { width: "47%", minHeight: 54, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.color.border, backgroundColor: theme.color.surface, alignItems: "center", justifyContent: "center", padding: 10 }, choiceText: { color: theme.color.text, fontWeight: "700" },
  checkRow: { flexDirection: "row", gap: 12, alignItems: "flex-start", padding: 14, borderRadius: 12, backgroundColor: theme.color.surface, marginBottom: 10 }, checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: theme.color.primary, alignItems: "center", justifyContent: "center" }, checkboxChecked: { backgroundColor: theme.color.primary }, checkmark: { color: "white", fontWeight: "900" }, checkText: { flex: 1, color: theme.color.text, fontSize: 16, lineHeight: 23 },
  warningBox: { padding: 16, borderRadius: 12, backgroundColor: theme.color.warningBackground, marginTop: 8 }, warningTitle: { color: theme.color.warning, fontWeight: "900", marginBottom: 5 }, warningBody: { color: theme.color.text, lineHeight: 22 }, disclaimer: { color: theme.color.muted, fontSize: 13, lineHeight: 19, marginTop: 16 }, errorBox: { borderRadius: 16, borderWidth: 1, borderColor: "#E2B6B6", padding: 18, backgroundColor: theme.color.surface, gap: 10 }, errorTitle: { color: theme.color.danger, fontWeight: "900", fontSize: 18 },
});
