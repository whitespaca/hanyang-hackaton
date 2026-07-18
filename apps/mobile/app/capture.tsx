import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PermissionDenied } from "@/components/ui";
import { useFlow } from "@/features/classification/FlowContext";

export default function CaptureScreen() {
  const [permission, requestPermission] = useCameraPermissions(); const camera = useRef<CameraView>(null); const [ready, setReady] = useState(false); const { dispatch } = useFlow();
  async function galleryAlternative() { const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"] }); const asset = result.canceled ? undefined : result.assets[0]; if (asset?.uri) { dispatch({ type: "image", image: { uri: asset.uri, width: asset.width, height: asset.height, ...(asset.fileName ? { fileName: asset.fileName } : {}) } }); router.replace("/preview"); } }
  if (!permission) return <View style={styles.center}><Text>카메라 권한을 확인하는 중입니다…</Text></View>;
  if (!permission.granted) return <PermissionDenied canAskAgain={permission.canAskAgain} onRequest={() => requestPermission()} onGallery={galleryAlternative} />;
  async function takePhoto() { if (!ready) return; const photo = await camera.current?.takePictureAsync({ quality: .9 }); if (photo?.uri) { dispatch({ type: "image", image: { uri: photo.uri, width: photo.width, height: photo.height, fileName: "camera.jpg" } }); router.replace("/preview"); } }
  return <View style={styles.container}><CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" onCameraReady={() => setReady(true)} /><View style={styles.overlay}><Text style={styles.tip}>물건 하나만 가운데 놓아주세요</Text><View style={styles.frame} /><Pressable disabled={!ready} accessibilityRole="button" accessibilityLabel="사진 촬영" onPress={takePhoto} style={[styles.capture, !ready && { opacity: .5 }]}><View style={styles.captureInner} /></Pressable></View></View>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: "black" }, center: { flex: 1, alignItems: "center", justifyContent: "center" }, overlay: { flex: 1, alignItems: "center", justifyContent: "space-between", paddingVertical: 42 }, tip: { color: "white", backgroundColor: "rgba(0,0,0,.65)", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 99, fontWeight: "800" }, frame: { width: "78%", aspectRatio: 1, borderWidth: 3, borderColor: "white", borderRadius: 24 }, capture: { width: 76, height: 76, borderRadius: 38, backgroundColor: "white", alignItems: "center", justifyContent: "center" }, captureInner: { width: 62, height: 62, borderRadius: 31, borderWidth: 3, borderColor: "#222" } });
